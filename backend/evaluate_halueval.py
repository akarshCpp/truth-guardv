import asyncio
import os
import sys
import json
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, average_precision_score
from scipy.stats import pearsonr
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
    print("=" * 65)
    print("  TRUTH GUARD - WikiBio GPT-3 Advanced Hallucination Evaluation")
    print("=" * 65)

    groq_api_key = os.getenv("GROQ_API_KEY")
    exa_api_key = os.getenv("EXA_API_KEY")

    if not groq_api_key or groq_api_key == "your_api_key_here":
        print("[!] Warning: GROQ_API_KEY is not set. Backend will use fallback.")

    # 1. Load Dataset
    global HAS_DATASETS
    print("\n[*] Loading potsawee/wiki_bio_gpt3_hallucination dataset...")
    dataset_records = []

    if HAS_DATASETS:
        try:
            dataset = load_dataset("potsawee/wiki_bio_gpt3_hallucination", split="evaluation")
            for row in dataset:
                gpt3_sentences = row["gpt3_sentences"]
                annotations = row["annotation"]
                for sentence, label in zip(gpt3_sentences, annotations):
                    # Ground Truth Mapping:
                    # NonFact (Hallucinated): accurate=0, minor=1, major=1
                    # Factual: accurate=1, minor=0, major=0
                    # PCC Score: accurate=1.0, minor=0.5, major=0.0
                    dataset_records.append({
                        "text": sentence,
                        "label": label,
                        "is_hallucinated": 1 if label in ("minor_inaccurate", "major_inaccurate") else 0,
                        "pcc_weight": 1.0 if label == "accurate" else (0.5 if label == "minor_inaccurate" else 0.0)
                    })
            print(f"   [OK] Loaded {len(dataset_records)} annotated sentences.")
        except Exception as e:
            print(f"   [ERR] Error loading: {e}")
            HAS_DATASETS = False

    if not HAS_DATASETS or not dataset_records:
        print("[!] Dataset unavailable. Check setup.")
        return

    # Limit for API costs/speed
    MAX_SAMPLES = 150
    dataset_records = dataset_records[:MAX_SAMPLES]

    # 2. Run Verification Pipeline
    results = []
    print("\n[*] Running Verification Pipeline (Concurrent)...")
    semaphore = asyncio.Semaphore(15)

    async def process_item(item):
        async with semaphore:
            req = VerifyRequest(text=item["text"])
            res = await verify_text(req)
            
            # Map system confidence & status to a continuous Factuality Score S [0, 1]
            status = res.get("status", "true").lower()
            conf = res.get("confidence_score", 50)
            
            # 0.5 is neutral. status=true pulls it up, status=false pulls it down.
            if status == "true":
                s_score = 0.5 + (conf / 200.0)  # Maps 0-100 to 0.5-1.0
            else:
                s_score = 0.5 - (conf / 200.0)  # Maps 0-100 to 0.0-0.5
            
            return {
                "ground_nonfact": item["is_hallucinated"],
                "ground_factual": 1 - item["is_hallucinated"],
                "ground_pcc": item["pcc_weight"],
                "pred_status": 1 if status == "true" else 0,
                "factuality_score": s_score,
                "hallucination_score": 1.0 - s_score
            }

    tasks = [process_item(item) for item in dataset_records]
    for future in tqdm(asyncio.as_completed(tasks), total=len(tasks)):
        results.append(await future)

    # 3. Calculate Advanced Metrics
    df = pd.DataFrame(results)
    
    # Conventional Binary Metrics
    acc = accuracy_score(df["ground_factual"], df["pred_status"])
    
    # AUC-PR (Average Precision)
    # NonFact AUC-PR uses hallucination_score as probability of being 1 (hallucinated)
    nonfact_auc = average_precision_score(df["ground_nonfact"], df["hallucination_score"])
    
    # Factual AUC-PR uses factuality_score as probability of being 1 (factual)
    factual_auc = average_precision_score(df["ground_factual"], df["factuality_score"])
    
    # Ranking (PCC)
    # Correlation between our factuality_score and the 3-category human weights
    pcc_val, _ = pearsonr(df["factuality_score"], df["ground_pcc"])

    print("\n" + "=" * 65)
    print("  TRUTH GUARD - ADVANCED RESEARCH METRICS")
    print("  Dataset: WikiBio GPT-3 (Post-hoc Evaluation)")
    print("=" * 65)
    print(f"  Accuracy (Overall)        : {acc * 100:.2f}%")
    print(f"  NonFact (AUC-PR)          : {nonfact_auc * 100:.2f}")
    print(f"  Factual (AUC-PR)          : {factual_auc * 100:.2f}")
    print(f"  Ranking (Pearson PCC)     : {pcc_val * 100:.2f}")
    print("-" * 65)
    
    print("\nComparison Table Format (for paper):")
    print("-" * 65)
    print(f"{'Method':<25} {'NonFact(AUC)':<15} {'Factual(AUC)':<15} {'PCC':<10}")
    print(f"{'-'*25} {'-'*15} {'-'*15} {'-'*10}")
    print(f"{'Random Guessing':<25} {'72.96':<15} {'27.04':<15} {'-'}")
    print(f"{'Truth Guard (Groq+Exa)':<25} {nonfact_auc*100:>12.2f} {factual_auc*100:>12.2f} {pcc_val*100:>8.2f}")
    print("-" * 65)
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(evaluate())
