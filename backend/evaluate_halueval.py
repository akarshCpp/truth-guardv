import asyncio
import os
import sys
import json
from dotenv import load_dotenv
import pandas as pd
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from tqdm import tqdm

# Fix Windows encoding issues
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    from datasets import load_dataset
    HAS_DATASETS = True
except ImportError:
    HAS_DATASETS = False

# Import the verify function directly to bypass needing the HTTP server running
sys.path.append(os.path.dirname(__file__))
from main import verify_text, VerifyRequest

load_dotenv()

async def evaluate():
    print("=" * 55)
    print("  TRUTH GUARD - WikiBio GPT-3 Hallucination Evaluation")
    print("=" * 55)

    groq_api_key = os.getenv("GROQ_API_KEY")
    exa_api_key = os.getenv("EXA_API_KEY")

    if not groq_api_key or groq_api_key == "your_api_key_here":
        print("[!] Warning: GROQ_API_KEY is not set. The backend will use hardcoded fallback logic.")

    # ──────────────────────────────────────────────────────
    # 1. Load Dataset
    # ──────────────────────────────────────────────────────
    global HAS_DATASETS
    print("\n[*] Loading potsawee/wiki_bio_gpt3_hallucination dataset...")
    dataset_records = []

    if HAS_DATASETS:
        try:
            dataset = load_dataset(
                "potsawee/wiki_bio_gpt3_hallucination",
                split="evaluation"
            )

            for row in dataset:
                gpt3_sentences = row["gpt3_sentences"]
                annotations = row["annotation"]
                wiki_bio_text = row.get("wiki_bio_text", "")

                # Each sentence gets its own record
                for sentence, label in zip(gpt3_sentences, annotations):
                    # Map: 'accurate' -> true, 'minor_inaccurate'/'major_inaccurate' -> false
                    is_hallucinated = label in ("minor_inaccurate", "major_inaccurate")
                    dataset_records.append({
                        "text": sentence,
                        "ground_truth": "false" if is_hallucinated else "true",
                        "annotation_label": label,
                        "wiki_reference": wiki_bio_text[:200]
                    })

            print(f"   [OK] Loaded {len(dataset)} passages -> {len(dataset_records)} sentences total")

        except Exception as e:
            print(f"   [ERR] Error loading from HuggingFace: {e}")
            HAS_DATASETS = False

    if not HAS_DATASETS or not dataset_records:
        # Fallback: check for a local JSON export
        local_path = os.path.join(os.path.dirname(__file__), "wiki_bio_gpt3_sample.json")
        if os.path.exists(local_path):
            print(f"   Loading local fallback from {local_path}...")
            with open(local_path, "r", encoding="utf-8") as f:
                dataset_records = json.load(f)
        else:
            print("   [!] Using hardcoded sample (HuggingFace unavailable & no local file found)")
            dataset_records = [
                {"text": "The capital of France is Paris.", "ground_truth": "true", "annotation_label": "accurate"},
                {"text": "Water boils at 100 degrees Celsius at sea level.", "ground_truth": "true", "annotation_label": "accurate"},
                {"text": "The Eiffel Tower is located in Berlin, Germany.", "ground_truth": "false", "annotation_label": "major_inaccurate"},
                {"text": "Albert Einstein invented the light bulb.", "ground_truth": "false", "annotation_label": "major_inaccurate"},
                {"text": "The moon is made of green cheese.", "ground_truth": "false", "annotation_label": "major_inaccurate"},
            ]

    # Limit to prevent excessive API usage
    MAX_SAMPLES = 150
    if len(dataset_records) > MAX_SAMPLES:
        print(f"   [*] Limiting {len(dataset_records)} sentences -> {MAX_SAMPLES} to stay within API rate limits")
        dataset_records = dataset_records[:MAX_SAMPLES]

    # Show class distribution
    true_count = sum(1 for r in dataset_records if r["ground_truth"] == "true")
    false_count = sum(1 for r in dataset_records if r["ground_truth"] == "false")
    print(f"\n   Class Distribution: {true_count} accurate / {false_count} hallucinated")

    # ──────────────────────────────────────────────────────
    # 2. Run Verification Pipeline (Concurrently)
    # ──────────────────────────────────────────────────────
    results = []
    print("\n[*] Running Verification Pipeline (Concurrent)...")

    semaphore = asyncio.Semaphore(15)

    async def process_item(item):
        async with semaphore:
            req = VerifyRequest(text=item["text"])
            result_dict = await verify_text(req)
            return {
                "sentence": item["text"],
                "ground_truth": item["ground_truth"],
                "annotation_label": item.get("annotation_label", "unknown"),
                "predicted_status": result_dict.get("status", "error"),
                "confidence": result_dict.get("confidence_score", 0),
                "correction": result_dict.get("correction", ""),
                "source": result_dict.get("source", "None")
            }

    tasks = [process_item(item) for item in dataset_records]

    for future in tqdm(asyncio.as_completed(tasks), total=len(tasks)):
        result = await future
        results.append(result)

    # ──────────────────────────────────────────────────────
    # 3. Calculate Metrics
    # ──────────────────────────────────────────────────────
    df = pd.DataFrame(results)
    df['predicted_status'] = df['predicted_status'].str.lower()

    # Binary mapping: 'true' (accurate) = 1, 'false' (hallucinated) = 0
    y_true = df['ground_truth'].apply(lambda x: 1 if x == 'true' else 0)
    y_pred = df['predicted_status'].apply(lambda x: 1 if x == 'true' else 0)

    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average='weighted', zero_division=0
    )

    # Per-class metrics
    precision_cls, recall_cls, f1_cls, support_cls = precision_recall_fscore_support(
        y_true, y_pred, average=None, labels=[0, 1], zero_division=0
    )

    print("\n" + "=" * 55)
    print("  TRUTH GUARD - EVALUATION RESULTS")
    print("  Dataset: potsawee/wiki_bio_gpt3_hallucination")
    print("=" * 55)
    print(f"  Total Sentences Evaluated : {len(df)}")
    print(f"  Accuracy                  : {acc * 100:.2f}%")
    print(f"  Precision (weighted)      : {precision * 100:.2f}%")
    print(f"  Recall (weighted)         : {recall * 100:.2f}%")
    print(f"  F1-Score (weighted)       : {f1 * 100:.2f}%")

    print("\n  Per-Class Breakdown:")
    print(f"  {'Class':<20} {'Precision':>10} {'Recall':>10} {'F1':>10} {'Support':>10}")
    print(f"  {'-'*60}")
    print(f"  {'Hallucinated':<20} {precision_cls[0]*100:>9.2f}% {recall_cls[0]*100:>9.2f}% {f1_cls[0]*100:>9.2f}% {support_cls[0]:>10}")
    print(f"  {'Accurate':<20} {precision_cls[1]*100:>9.2f}% {recall_cls[1]*100:>9.2f}% {f1_cls[1]*100:>9.2f}% {support_cls[1]:>10}")

    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    print(f"\n  Confusion Matrix:")
    print(f"                     Pred Hallucinated   Pred Accurate")
    print(f"  True Hallucinated       {cm[0][0]:>5}              {cm[0][1]:>5}")
    print(f"  True Accurate           {cm[1][0]:>5}              {cm[1][1]:>5}")

    # Show examples
    hallucinations = df[df['ground_truth'] == 'false']
    if not hallucinations.empty:
        print("\n  Sample Corrections (Ground Truth: Hallucinated):")
        for i, row in hallucinations.head(3).iterrows():
            sent = row['sentence'][:70]
            print(f"  - Sentence: {sent}...")
            print(f"    Label: {row['annotation_label']} | Predicted: {row['predicted_status'].upper()} | Confidence: {row['confidence']}")
            if row['correction']:
                print(f"    Correction: {row['correction'][:80]}")
            print()

    # Save to CSV
    output_file = os.path.join(os.path.dirname(__file__), "evaluation_results.csv")
    df.to_csv(output_file, index=False)
    print(f"  Detailed results saved to {output_file}")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(evaluate())
