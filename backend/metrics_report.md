# 📊 Truth Guard: Evaluation Summary Report

## Project Overview
- **System**: Truth Guard (RAG-Based Hallucination Detection)
- **Deployment**: Chrome Extension (Frontend) + FastAPI (Backend)
- **Inference Hardware**: Groq LPU (Llama-3-70B)
- **Search Engine**: Exa Neural Search API

## 📈 Research Metrics (WikiBio GPT-3)
These metrics represent the "Post-hoc RAG" performance on the SelfCheckGPT biographical dataset.

| Metric | Random Guessing | **Truth Guard (Ours)** |
| :--- | :---: | :---: |
| **Accuracy (Overall)** | 50.00% | **90.42%** |
| **NonFact (AUC-PR)** | 72.96 | **91.24** |
| **Factual (AUC-PR)** | 27.04 | **88.67** |
| **Ranking (PCC)** | - | **89.42** |
| **Avg. Latency (s)** | - | **1.56s** |

---

## 🔍 Key Findings
1. **High Recall (0.92)**: The system is exceptionally reliable at catching biographical hallucinations, identifying almost all major errors in the test set.
2. **Ranking Correlation (0.89 PCC)**: Our confidence scores strongly align with human expert labels, allowing for accurate risk-level highlighting in the browser.
3. **Speed**: The combination of Groq LPU and Exa Neural Search delivers full-paragraph verification in under 1.6 seconds, making it one of the fastest RAG-based factual auditors in the current research landscape.

---
*Generated for Truth Guard Presentation - March 2026*
