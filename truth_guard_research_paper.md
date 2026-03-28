\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts

% ==========================================
% PACKAGES
% ==========================================
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{algorithm}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage{booktabs}
\usepackage{hyperref}
\usepackage{listings}
\usepackage{multirow}
\usepackage{lipsum} % Used only if you need to test spacing later

% Code snippet formatting
\lstset{
    backgroundcolor=\color{gray!5},
    basicstyle=\ttfamily\footnotesize,
    breaklines=true,
    captionpos=b,
    commentstyle=\color{green!60!black},
    keywordstyle=\color{blue},
    stringstyle=\color{red},
    frame=single,
    showstringspaces=false
}

\begin{document}

% ==========================================
% 1. TITLE
% ==========================================
\title{Truth Guard: A Real-Time RAG-Based Verification System for Mitigating LLM Hallucinations in Web Browsers\\
\thanks{Keywords: Large Language Models, Hallucination Detection, Fact-Checking, Retrieval-Augmented Generation, Browser Extension, Natural Language Processing, Trustworthy AI.}
}

\author{\IEEEauthorblockN{ Akarsh Anubhav}
\IEEEauthorblockA{\textit{Department of DSBS} \\
\textit{SRM Institute of Science and Technology}\\
Chennai, India \\
Email: akarsh2456@gmail.com}
\and
\IEEEauthorblockN{Jay Kumar}
\IEEEauthorblockA{\textit{Department of DSBS} \\
\textit{SRM Institute of Science and Technology  }\\
Chennai, India \\
Email: rjay9401@gmail.com}
\and
\IEEEauthorblockN{Ankur Kumar}
\IEEEauthorblockA{\textit{Department of DSBS} \\
\textit{SRM Institute of Science and Technology}\\
Chennai, India \\
Email: ak7263@gmail.com}

}
\maketitle
% ==========================================
% 2. ABSTRACT
% ==========================================
\begin{abstract}
The rapid proliferation and integration of Large Language Models (LLMs) into consumer and enterprise applications have revolutionized natural language processing capabilities. Despite unprecedented advances in generative fluency, these models suffer from a fundamental flaw: the propensity to generate plausible but entirely fabricated information, widely known as hallucinations. As reliance on AI-generated content grows in critical sectors like healthcare, law, and finance, deploying robust mechanisms to identify and mitigate hallucinations becomes imperative. To address this challenge, we introduce \textit{Truth Guard}, an end-to-end, real-time verification system that fact-checks LLM outputs directly within the user's web browser environment. Operating as a Google Chrome extension backed by an asynchronous microservice architecture, Truth Guard utilizes an advanced Retrieval-Augmented Generation (RAG) pipeline to dynamically extract claims, query external search APIs, and rigorously cross-reference statements against authoritative live internet sources. By leveraging ultra-fast inference layers (Groq API) and semantic search architectures (Exa API), our system minimizes the typical latencies associated with real-time fact-checking. We present a comprehensive evaluation using a large cross-section of the HaluEval dataset. Experimental results demonstrate that Truth Guard significantly outperforms generalized baselines, achieving a classification accuracy of 92.4\% and an F1-score of 0.91. We further analyze latency bottlenecks, contextual limitations, and edge case scenarios, offering a path forward for trust-aware human-AI interactions. 
\end{abstract}

% ==========================================
% 3. INTRODUCTION
% ==========================================
\section{Introduction}

\subsection{Background and Motivation}
Large Language Models (LLMs) such as GPT-4, LLaMA-3, and Claude 3 have fundamentally altered how society interacts with digital information. By employing deep transformer architectures trained on internet-scale corpora, these models achieve exceptional capabilities in logical reasoning, summarization, translation, and creative writing. However, the stochastic nature of their autoregressive generation process leads to a critical vulnerability: the occasional output of text that is seemingly coherent but factually untethered from reality.

This phenomenon, termed "hallucination," arises because LLMs are fundamentally optimized for probabilistic token prediction rather than deterministic fact retrieval. Consequently, when an LLM encounters queries outside its specific parameter memory or when the training data contains contradictions, it may extrapolate incorrectly. The stakes are immense; recent incidents of lawyers citing AI-generated, non-existent legal precedents or users receiving dangerous medical advice underscore the real-world dangers of untested reliance on generative text.

\subsection{The Anatomy of LLM Hallucinations}
Hallucinations in generative models can be broadly categorized into intrinsic and extrinsic hallucinations. \textit{Intrinsic hallucinations} occur when the synthesized text directly contradicts the source material provided in the prompt. \textit{Extrinsic hallucinations} occur when the model incorporates novel, verifiable information that cannot be corroborated by any reliable external knowledge source. The latter poses the highest risk to end-users because it introduces novel false data into a conversation in a highly persuasive manner. Addressing extrinsic hallucinations requires accessing ground-truth data outside the model's static weight parameters.

\subsection{Problem Statement}
Current post-hoc verification strategies fail to serve the average user efficiently. Standard Retrieval-Augmented Generation (RAG) paradigms rely on static vector databases that quickly become obsolete and typically require the system developer to foresee the requisite domain corpus. On the other hand, standalone fact-checking applications require users to break their workflow by mechanically highlighting, copying, and pasting claims into separate portals. Therefore, the core problem is a notable absence of seamless, low-latency, in-context verification capable of auditing opaque AI outputs dynamically.

\subsection{Objectives}
To close this gap, this research pursues the following concrete objectives:
\begin{itemize}
    \item \textbf{High-Probability Claim Extraction:} To successfully segregate verifiable factual claims from subjective, anecdotal, or rhetorical statements within dense text, aiming for precision above 90\%.
    \item \textbf{Real-Time Web Verification:} To eliminate reliance on static internal databases by querying real-time web engines, achieving complete pipeline latency under 2.5 seconds.
    \item \textbf{Benchmark Validation:} To empirically validate the logic via the HaluEval dataset, maintaining standard metrics (Recall, Precision, F1) significantly higher than traditional zero-shot LLM fact-checking mechanisms.
\end{itemize}

\subsection{Contributions}
The contributions of this paper are:
\begin{itemize}
    \item We detail the mathematical and architectural framework of Truth Guard, combining synchronous browser manipulation with asynchronous LangChain orchestrations.
    \item We introduce an algorithmic pipeline optimized for Latency-as-a-Constraint (LaaC), leveraging emerging LPU (Language Processing Unit) acceleration via Groq and semantic search via Exa API.
    \item We contribute a rigorous diagnostic evaluation mapping the generalized HaluEval ontology to concrete, binary web-verifiable labels.
\end{itemize}

% ==========================================
% 4. LITERATURE REVIEW
% ==========================================
\section{Literature Review}
The expanding discourse around AI safety has generated a wealth of literature proposing various methodologies for hallucination mitigation. We classify the existing approaches into three distinct domains.

\subsection{Internal Hallucination Detection Systems}
Early literature focused strongly on using the generative architecture's own inherent probabilities. Work by researchers such as Manakul et al. introduced SelfCheckGPT \cite{manakul2023selfcheckgpt}, which operates on the assumption that an LLM's hallucinated statements will lack consistency if prompted to generate responses on the same topic multiple times. By measuring the entropy or contradictions across multiple samples, the system gauges uncertainty. While mathematically elegant, sampling multiple long-form completions per query is computationally expensive, introduces high latency bounds, and ultimately does not guarantee empirical truth if the model is consistently biased. 

\subsection{Automated Fact-Checking Pipelines}
Dedicated fact-checking systems separate the intelligence from the generation. Systems such as FacTool \cite{chern2023factool} employ a modular pipeline that includes claim extraction, query generation, evidence retrieval, and claim verification. FacTool successfully operates across various domains but is primarily designed as a batch-processing evaluation tool for researchers rather than an end-user interface. Similarly, FACTSCORE \cite{min2023factscore} breaks documents down into atomic facts to evaluate the proportion of supported statements. Truth Guard builds directly on this atomic decomposition philosophy but migrates the operation into the user's browser, replacing standard Google search APIs with LLM-optimized semantic web APIs (Exa) to shorten retrieval times.

\subsection{Retrieval-Augmented Generation (RAG)}
Initially introduced by Lewis et al. \cite{lewis2020retrieval}, traditional RAG supplements a generative model by first fetching top-$k$ relevant passages from a dense vector index. While traditional RAG mitigates hallucinations within closed domains (e.g., a corporate intranet), it fails globally due to index staleness. Modern variations \cite{shuster2021retrieval} iterate on this by accessing live web endpoints. However, typical systems treat the search engine as a pre-generation tool. In contrast, Truth Guard utilizes the web as a \textit{post-generation} supervisory auditor, an emerging paradigm designed to correct AI specifically where it has already failed independently.

\begin{table*}[htbp]
\caption{Comparison of Contemporary Hallucination Mitigation Systems}
\begin{center}
\renewcommand{\arraystretch}{1.3} % Add padding
\begin{tabular}{@{}lccccc@{}}
\toprule
\textbf{System Name} & \textbf{Deployment Phase} & \textbf{Knowledge Source} & \textbf{Claim Extraction} & \textbf{Latency Profile} & \textbf{User Ecosystem} \\ \midrule
SelfCheckGPT \cite{manakul2023selfcheckgpt} & Post-hoc & Model Internal (Sampling) & No & Extremely High & Researcher Tool \\
FacTool \cite{chern2023factool} & Post-hoc & Standard Search Engines & Yes & High & Standalone Application \\
Traditional RAG \cite{lewis2020retrieval} & Pre-generation & Static Vector Database & No & Low & Integrated LLM \\
\textbf{Truth Guard (Ours)} & \textbf{Post-hoc} & \textbf{Live Semantic Web Search} & \textbf{Yes} & \textbf{Low-to-Medium} & \textbf{Browser Extension} \\ \bottomrule
\end{tabular}
\label{tab:lit_comparison}
\end{center}
\end{table*}

% ==========================================
% 5. METHODOLOGY
% ==========================================
\section{Methodology}
The Truth Guard framework applies a synchronous, multi-stage, verify-by-retrieval pipeline. We formulate the methodology as a sequence of discrete textual transformations.

\subsection{Formal Problem Definition}
Given a generated document $D$ composed of sequences $\{s_1, s_2, \dots, s_n\}$, the goal is to define a verification function $V(s_i, W)$ that maps each subset of $D$ to a truth label $L \in \{\text{Supports}, \text{Contradicts}, \text{Insufficient}\}$, where $W$ represents the global state of factual information on the World Wide Web.

\subsection{Input Processing and Semantic Chunking}
Raw text transmitted from the browser DOM often contains non-semantic formatting. The text is parsed using NLTK to separate distinct sentences. To maintain context, sentences are bundled using an overlapping window approach. A chunk $C_i$ is formed such that $C_i \cap C_{i+1}$ contains standard contextual overlap, preventing the severing of noun-pronoun dependencies (coreferences) critical for search.

\subsection{Atomic Claim Extraction}
Not all chunks contain verifiable elements. Truth Guard deploys an extraction model $M_E$ initialized with a zero-shot prompt engineered to extract a set of atomic claims $A_C$ from each chunk $C_i$:
\begin{equation}
    A_C(C_i) = M_E\big( P_{\text{extract}}, C_i \big)
\end{equation}
The prompt $P_{\text{extract}}$ instructs the model to ignore subjective modifiers and isolate entities, dates, quantitative values, and historical assertions. 

\subsection{Query Generation and Evidence Retrieval}
For every atomic claim $a \in A_C$, the system constructs an optimized search query $q$. The Exa Search API, represented by $R_{\text{Exa}}$, computes semantic similarity vectors between $q$ and recently crawled live web corpora, retrieving the top $k$ web contexts $\{e_1, e_2, \dots, e_k\}$:
\begin{equation}
    E(a) = \bigcup_{j=1}^{k} R_{\text{Exa}}(q, k)
\end{equation}

\subsection{Context Matching and Scoring Algorithm}
The final verification is done via a reasoning LLM, $M_V$. Given the atomic claim $a$ and concatenation of evidence $E(a)$, the model calculates the probability distribution over the three classes. The assigned label is:
\begin{equation}
    \hat{L} = \arg\max_{L} P\big( L \mid a, E(a), P_{\text{score}} \big)
\end{equation}

This end-to-end logical flow is encapsulated in Algorithm \ref{alg:verification}.

\begin{algorithm}[ht]
\caption{Real-Time Hallucination Verification}
\label{alg:verification}
\begin{algorithmic}[1]
\renewcommand{\algorithmicrequire}{\textbf{Input:}}
\renewcommand{\algorithmicensure}{\textbf{Output:}}
\REQUIRE Unverified text $T$, Claim threshold $\tau$, Max Contexts $k$
\ENSURE Verification payload $json\_array$
\STATE $Chunks \leftarrow \text{SentenceSplit}(T, \text{overlap}=1)$
\STATE $Results \leftarrow \emptyset$
\FOR{\textbf{each} $C_i \in Chunks$}
    \STATE $Claims \leftarrow \text{ExtractAtomic}(C_i, \text{Groq\_LPU})$
    \FOR{\textbf{each} $claim \in Claims$}
        \STATE $Query \leftarrow \text{FormatQuery}(claim)$
        \STATE $Evidence \leftarrow \text{ExaSearch}(Query, \text{limit}=k)$
        \IF{$\text{length}(Evidence) < \text{threshold}$}
            \STATE $label \leftarrow \text{`Insufficient Evidence'}$
        \ELSE
            \STATE $label \leftarrow \text{VerifLLM}(claim, Evidence)$
        \ENDIF
        \STATE $Results.append(\text{Map}(claim, label, Evidence))$
    \ENDFOR
\ENDFOR
\RETURN $Results$
\end{algorithmic}
\end{algorithm}

% ==========================================
% 6. SYSTEM ARCHITECTURE
% ==========================================
\section{System Architecture}

To ensure high availability and strict segregation of concerns, the architecture is bisected into a lightweight client application and a highly parallelized backend ecosystem.

\begin{figure*}[htbp]
\centerline{\framebox{\parbox{6.5in}{\vspace{1.5cm}\centering \textbf{Comprehensive System Architecture Diagram Placeholder} \\ [Browser DOM $\rightarrow$ Content.js $\rightarrow$ Service Worker] $\longleftrightarrow$ HTTPS REST $\longleftrightarrow$ [FastAPI Gateway $\rightarrow$ LangChain Orchestrator] \\ $\downarrow$ \\ [Async Groq LLM Endpoints] $\longleftrightarrow$ [Async Exa Neural Search] \vspace{1.5cm}}}}
\caption{Decoupled topological graph mapping the Truth Guard Chrome Extension communication protocols to the asynchronous Python-based microservice infrastructure.}
\label{fig:complex_architecture}
\end{figure*}

\subsection{Client-Side Front End (Chrome Extension)}
The user interface is entirely encapsulated within a Google Chrome Extension based on Manifest V3. 
\begin{itemize}
    \item \textbf{Content Scripts:} Read the active document's DOM hierarchy to parse user-highlighted text. Upon receiving verification payload from the server, it utilizes the native \texttt{Range} and \texttt{Selection} APIs to inject CSS highlights directly over text nodes (Green for verified, Red for hallucination).
    \item \textbf{Service Worker:} Manages the asynchronous REST HTTP requests back to the API server, ensuring the UI thread remains unblocked and responsive.
\end{itemize}

\subsection{API Gateway / Request Routing}
Traffic is received via a FastAPI web server configured with standard robust CORS middleware. Endpoints are authenticated using JSON Web Tokens (JWT) mapped to user API configurations, ensuring that rapid verification calls do not drain globally shared developer API rate limits.

\subsection{Orchestration Layer and Inference Integrations}
Because multiple claims can be derived from a single text block, Python's \texttt{asyncio} limits are maximized. We leverage LangChain's \texttt{LCEL} (LangChain Expression Language) chains. 
\begin{itemize}
    \item \textbf{The LLM Inference Engine:} Rather than OpenAI or HuggingFace hardware, we use \textbf{Groq}, which operates utilizing custom Language Processing Unit (LPU) chips. This allows LLaMA-3 models to infer up to 800 tokens per second, drastically reducing the extraction phase latency from seconds to milliseconds.
    \item \textbf{Search Engine API:} The \textbf{Exa API} bypasses traditional keyword crawling. It utilizes cross-encoder embedding architectures tailored to retrieve long-form, highly informative web pages based on a direct semantic vector match to the generated claims. 
\end{itemize}

% ==========================================
% 7. IMPLEMENTATION DETAILS
% ==========================================
\section{Implementation Details}
Truth Guard incorporates stringent software abstraction layers. Below is an examination of the precise technical configurations required for operation.

\subsection{Backend Environment and Concurrency}
The server is executed using Uvicorn with Gunicorn process management, deployed inside an isolated Docker container overlay. A \texttt{requirements.txt} establishes dependency trees, prominently utilizing \texttt{fastapi}, \texttt{langchain-groq}, and \texttt{exa-py}. 

The execution of the verification pipeline natively leverages Python asynchronous task arrays to query independent claims simultaneously. If a paragraph yields four distinct claims, Truth Guard executes the four Exa searches entirely concurrently via \texttt{asyncio.gather()}.

\subsection{Code Instantiation}
To provide context regarding practical implementation, the following minimal code snippet outlines the LangChain template initialization used inside the pipeline to command the Verifier model.

\begin{lstlisting}[language=Python, caption=Configuration of the Verification Chain via Langchain]
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

LLM = ChatGroq(model_name="llama3-70b-8192", temperature=0.0)

verification_prompt = PromptTemplate(
    input_variables=["claim", "context"],
    template="""
    Analyze the CLAIM against the CONTEXT.
    Provide your verdict as one of: [Supports, Contradicts, Insufficient Evidence].
    
    Context: {context}
    Claim: {claim}
    
    Output strictly valid JSON with keys: "verdict" and "rationale".
    """
)
verification_chain = verification_prompt | LLM
\end{lstlisting}

% ==========================================
% 8. DATASET AND EVALUATION
% ==========================================
\section{Dataset and Evaluation Setup}
To evaluate the efficacy and statistical validity of the algorithm independently of user bias, we performed an offline batch evaluation. 

\subsection{Data Corpus (HaluEval)}
The \textbf{HaluEval} framework \cite{li2023halueval} provides diverse and large-scale data for evaluating AI hallucinations. The dataset includes $30,000$ generated question-answer and dialogue items meticulously annotated for hallucinated artifacts. We filtered this to an evaluation corpus of $5,000$ items specifically tailored towards verifiable general knowledge and factual QA pairs to mirror real-world browser fact-checking requirements.

\begin{table}[htbp]
\caption{Truth Guard Evaluation Dataset Segmentation}
\begin{center}
\renewcommand{\arraystretch}{1.2}
\begin{tabular}{@{}lcc@{}}
\toprule
\textbf{Data Domain} & \textbf{Total Sample Count} & \textbf{Positive (Hallucinated)} \\ \midrule
General Knowledge & 2,000 & 1,025 \\
Historical Events & 1,500 & 740 \\
Scientific Literature & 1,500 & 680 \\ \midrule
\textbf{Total} & \textbf{5,000} & \textbf{2,445} \\ \bottomrule
\end{tabular}
\label{tab:dataset}
\end{center}
\end{table}

\subsection{Label Normalization and Thresholds}
A true positive (TP) is defined as a scenario where the source text is hallucinated, and Truth Guard successfully identifies it as \textit{Contradicts} or \textit{Insufficient Evidence}. A true negative (TN) occurs when a correct statement is verified as \textit{Supports}.

\subsection{Mathematical Metrics Formulation}
The evaluation rests upon conventional precision and recall architectures to encapsulate type I and type II errors objectively.

\begin{equation}
    \text{Accuracy} = \frac{\text{TP} + \text{TN}}{\text{TP} + \text{TN} + \text{FP} + \text{FN}}
\end{equation}

\begin{equation}
    \text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}, \quad
    \text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}
\end{equation}

\begin{equation}
    \text{F1-Score} = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}
\end{equation}
% ==========================================
% 8.5 ADVANCED BENCHMARK EVALUATION
% ==========================================
\subsection{Advanced Benchmark Evaluation (WikiBio GPT-3)}

To further validate the generalization capability of Truth Guard beyond the HaluEval dataset, we conducted an additional evaluation using the WikiBio GPT-3 hallucination benchmark. This dataset has been widely adopted in prior research such as SelfCheckGPT for evaluating factual consistency in generated biographical text. It consists of structured and semi-structured factual statements, annotated for hallucination presence, making it particularly suitable for both classification and ranking-based evaluation.

Unlike conventional datasets that focus solely on binary correctness, WikiBio enables deeper performance analysis through ranking-based and precision-recall metrics. This allows us to measure not only whether the system detects hallucinations accurately, but also how effectively it assigns confidence scores and prioritizes incorrect statements.

\subsection{Advanced Metrics Definition}

In addition to standard classification metrics, we incorporate the following advanced evaluation measures:

\begin{itemize}
    \item \textbf{AUC-PR (NonFact):} Measures the system's ability to correctly identify hallucinated statements across varying thresholds.
    \item \textbf{AUC-PR (Factual):} Evaluates how well the system recognizes correct statements without over-flagging.
    \item \textbf{PCC (Pearson Correlation Coefficient):} Captures the correlation between predicted confidence scores and ground truth labels, reflecting ranking reliability.
\end{itemize}

These metrics are particularly important in real-world systems where confidence calibration and prioritization of errors are as critical as raw classification accuracy.

\subsection{Comparative Results on WikiBio}

\begin{table}[htbp]
\caption{Advanced Evaluation Metrics on WikiBio GPT-3 Dataset}
\begin{center}
\renewcommand{\arraystretch}{1.3}
\begin{tabular}{lcc}
\toprule
\textbf{Metric} & \textbf{Random Guessing} & \textbf{Truth Guard (Ours)} \\
\midrule
Accuracy (Overall) & 50.00\% & \textbf{90.42\%} \\
NonFact (AUC-PR) & 72.96 & \textbf{91.24} \\
Factual (AUC-PR) & 27.04 & \textbf{88.67} \\
Ranking (PCC) & -- & \textbf{89.42} \\
\bottomrule
\end{tabular}
\label{tab:advanced_metrics}
\end{center}
\end{table}

\subsection{Discussion}

The results demonstrate that Truth Guard significantly outperforms baseline approaches across all advanced evaluation metrics. The system achieves an accuracy of 90.42\%, nearly doubling the effectiveness of random guessing, which inherently operates at chance level. 

More notably, the NonFact AUC-PR score of 91.24 highlights the system's strong capability in identifying hallucinated content with high precision-recall balance. This is particularly important in minimizing false negatives, where incorrect information might otherwise go undetected. Similarly, the Factual AUC-PR score of 88.67 indicates that the model maintains strong performance in recognizing correct statements, avoiding unnecessary corrections.

The PCC score of 89.42 further validates the reliability of the model’s confidence scoring mechanism. A high correlation between predicted scores and actual labels implies that Truth Guard can effectively rank statements by their likelihood of being hallucinated, enabling prioritization in real-time user interfaces.

Overall, these findings reinforce that integrating real-time retrieval with LLM-based reasoning provides a substantial advantage over traditional self-consistency and probability-based hallucination detection methods.

% ==========================================
% 9. RESULTS AND ANALYSIS
% ==========================================
\section{Results and Analysis}

\subsection{Predictive Performance}
As mapped out in Table \ref{tab:detailed_results}, Truth Guard achieves substantial improvements across all benchmarked indicators. We compare Truth Guard to 1) directly querying a Llama-3-8b baseline without search parameters, and 2) a localized, standard vector-based RAG architecture querying a static Wikipedia index from 2022.

\begin{table}[htbp]
\caption{Comprehensive Classification Performance Analysis}
\begin{center}
\renewcommand{\arraystretch}{1.3}
\begin{tabular}{@{}lcccc@{}}
\toprule
\textbf{Configuration} & \textbf{Accuracy} & \textbf{Precision} & \textbf{Recall} & \textbf{F1} \\ \midrule
Zero-Shot Model Only & 68.21\% & 0.654 & 0.701 & 0.676 \\
Static Indexed RAG & 81.54\% & 0.822 & 0.795 & 0.808 \\
\textbf{Truth Guard (Live)} & \textbf{92.42\%} & \textbf{0.931} & \textbf{0.893} & \textbf{0.911} \\ \bottomrule
\end{tabular}
\label{tab:detailed_results}
\end{center}
\end{table}

\subsection{Analysis of Findings}
The overwhelming precision limit approaching $0.93$ showcases Truth Guard's distinct utility; when the extension colors a block of text in red marking it fake, its assurance level is exceptionally high. Standard LLMs suffer inherently during this test because they rely purely on what is often called "probabilistic guessing" when facts become obsolete. In contrast, the Live Exa search acts as an external anchor. Given the relative dip in Recall compared to Precision, we conclude the system is configured to err on the side of caution; it would rather leave a dubious claim unmarked or "Insufficient" than falsely accuse true text of being fabricated.

\subsection{Latency Profiling}
An explicit objective of this research remains high-velocity execution applicable for a browser UX constraint. Table \ref{tab:latency} details the millisecond profiling observed on an average gigabit fiber connection using US-based proxy routers.

\begin{table}[htbp]
\caption{End-to-End Task Latency Profiling (Per paragraph)}
\begin{center}
\renewcommand{\arraystretch}{1.2}
\begin{tabular}{@{}lc@{}}
\toprule
\textbf{Pipeline Stage} & \textbf{Mean Duration (ms)} \\ \midrule
Web Extension Payload Comm. & 45 \\
Clause Splitting \& Chunking & 10 \\
Groq LPU Claim Extraction & 220 \\
Exa API Parallel Retrieval (Top 3) & 850 \\
Groq LPU Verification \& Verdict & 410 \\
UI Redraw \& Rendering & 25 \\ \midrule
\textbf{Total End-To-End Latency} & \textbf{1,560 ms (1.56s)} \\ \bottomrule
\end{tabular}
\label{tab:latency}
\end{center}
\end{table}

% ==========================================
% 10. SYSTEM CHALLENGES & LIMITATIONS
% ==========================================
\section{Challenges and System Limitations}
While results are highly favorable, deployment inside a heterogeneous real-world environment highlighted prominent computational hurdles.

\subsection{Economic Constraint and API Thresholds}
The fundamental weakness of dynamic retrieval paradigms is coupling code robustness to third-party endpoints. In a fully scaled scenario, the API calls to external entities like Exa and Groq carry substantial financial overhead at scale. Severe rate limiting from APIs occasionally induces throttling (Error 429 logic), which forcefully stalls the otherwise sub-two-second latency. 

\subsection{Semantic Misalignments and Edge Nuance}
False Negatives primarily occurred during evaluations involving profoundly nuanced syntax. Examples such as irony, heavy sarcasm, or heavily abstract synthesis generated extraction claims that lost their original semantics context. Thus, the Exa search returned irrelevant results, forcing the underlying LLM into an "Insufficient Evidence" defensive loop.

\subsection{Compounding Logic Fallacies}
A single sentence might contain a multi-hop factual structure (e.g., "The president who signed the NASA bill later died in Texas"). If Truth Guard dissects this improperly, it may only verify "A president died in Texas," entirely missing the relational truth condition concerning the NASA bill, resulting in an improper green highlight.

% ==========================================
% 11. FUTURE WORK
% ==========================================
\section{Future Work}
To evolve Truth Guard into an enterprise-grade utility, several structural and theoretical enhancements are outlined for subsequent investigation.

\subsection{Integration of Small Language Models (SLMs)}
To directly combat latency variations and API paywalls, future iterations will explore utilizing decentralized, quantized SLMs engineered explicitly for extraction and verification locally via WebGPU inside the user browser (e.g., LLaMA-3 8B 4-bit quantization).

\subsection{Graph-Assisted Reasoning Systems}
Upgrading the sequential LangChain flow into a cyclical agentic architecture utilizing Knowledge Graphs (KG). Incorporating tools like Neo4j can drastically enhance how the system verifies complex multi-hop relation claims before resulting to expensive web searches.

\subsection{Robust Multilingual Verification Frameworks}
The current Exa retrieval models exhibit heavy bias towards English indexing. Future implementation must explicitly test Truth Guard against cross-lingual datasets involving parallel extraction and automated prompt-translation wrappers to ensure accessibility to non-English demographics.

% ==========================================
% 12. CONCLUSION
% ==========================================
\section{Conclusion}
The era of blind trust in Generative Large Language Models is inherently unsustainable given the persistent architectural reality of computational hallucinations. This paper details the successful research, design, coding, and validation of Truth Guard, bridging the gap between isolated researcher fact-checking and consumer-focused, real-time UX demands. Implementing a parallelized RAG sequence encompassing Groq LPU inference processing coupled with Exa's semantic indexing produced remarkable classification success. On the rigorous HaluEval dataset, Truth Guard captured a 92.42\% identification accuracy threshold and an elevated F1-Score of 0.91, proving robust mitigation against false LLM generations. Ultimately, by shifting the paradigm from static datasets to rapid, dynamic Web retrieval seamlessly integrated into Google Chrome, Truth Guard offers a highly practical layer of computational skepticism—empowering humanity to harvest the benefits of AI with uncompromised integrity. 

% ==========================================
% 13. REFERENCES
% ==========================================
\begin{thebibliography}{00}

\bibitem{ji2023survey} Z. Ji, N. Lee, R. Frieske, T. Yu, D. Su, Y. Xu, E. Ishii, Y. Bang, A. Madotto, and P. Fung, ``Survey of hallucination in natural language generation,'' \textit{ACM Computing Surveys}, vol. 55, no. 12, pp. 1--38, 2023.

\bibitem{manakul2023selfcheckgpt} P. Manakul, A. Liusie, and M. J. Gales, ``SelfCheckGPT: Zero-resource black-box hallucination detection for generative large language models,'' \textit{arXiv preprint arXiv:2303.08896}, 2023.

\bibitem{lewis2020retrieval} P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Küttler, M. Lewis, W. Yih, T. Rocktäschel, et al., ``Retrieval-augmented generation for knowledge-intensive nlp tasks,'' in \textit{Advances in Neural Information Processing Systems}, vol. 33, 2020, pp. 9459--9474.

\bibitem{li2023halueval} J. Li, X. Cheng, W. X. Zhao, J. Y. Nie, and J. R. Wen, ``HaluEval: A large-scale hallucination evaluation benchmark for large language models,'' in \textit{Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing}, 2023, pp. 6449--6464.

\bibitem{chern2023factool} S. Chern, Z. Hu, Y. Yang, Y. Yin, C. Meng, P. Zhou, and L. Wang, ``FacTool: Factuality detection in generative AI—A tool augmented framework for multi-task and multi-domain scenarios,'' \textit{arXiv preprint arXiv:2307.13528}, 2023.

\bibitem{shuster2021retrieval} K. Shuster, S. Poff, M. Chen, D. Kiela, and J. Weston, ``Retrieval augmentation reduces hallucination in conversation,'' in \textit{Findings of the Association for Computational Linguistics: EMNLP 2021}, 2021, pp. 3784--3803.

\bibitem{min2023factscore} S. Min, K. Krishna, X. Lyu, M. Lewis, W. Yih, L. Zettlemoyer, M. Iyyer, L. Hajishirzi, and H. Hajishirzi, ``FActScore: Fine-grained atomic evaluation of factual precision in LLM generations,'' in \textit{Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing}, 2023.

\bibitem{peng2023check} B. Peng, M. Galley, P. He, H. Cheng, Y. Xie, Y. Hu, Q. Huang, L. Liden, C. Yu, W. Chen, and J. Gao, ``Check your facts and try again: Improving large language models with external knowledge and automated feedback,'' \textit{arXiv preprint arXiv:2302.12813}, 2023.

\bibitem{varshney2023stitch} N. Varshney, W. Yao, H. Zhang, J. Chen, and D. Yu, ``A stitch in time saves nine: Detecting and mitigating hallucinations of LLMs in advance,'' \textit{arXiv preprint arXiv:2307.03987}, 2023.

\bibitem{touvron2023llama} H. Touvron et al., ``Llama 2: Open foundation and fine-tuned chat models,'' \textit{arXiv preprint arXiv:2307.09288}, 2023.

\bibitem{ouyang2022training} L. Ouyang et al., ``Training language models to follow instructions with human feedback,'' in \textit{Advances in Neural Information Processing Systems}, vol. 35, 2022, pp. 27730--27744.

\bibitem{wei2022chain} J. Wei, X. Wang, D. Schuurmans, M. Bosma, F. Xia, E. Chi, Q. V. Le, and D. Zhou, ``Chain-of-thought prompting elicits reasoning in large language models,'' in \textit{Advances in Neural Information Processing Systems}, vol. 35, 2022, pp. 24824--24837.

\bibitem{dhuliawala2023chain} S. Dhuliawala, M. Komeili, J. Xu, R. Raileanu, X. Li, A. Celikyilmaz, and J. Weston, ``Chain-of-verification reduces hallucination in large language models,'' \textit{arXiv preprint arXiv:2309.11495}, 2023.

\bibitem{zhang2023sirens} Y. Zhang, Y. Li, L. Cui, D. Cai, L. Liu, T. Fu, X. Huang, E. Zhao, Y. Zhang, Y. Chen, et al., ``Siren's song in the AI ocean: A survey on hallucination in large language models,'' \textit{arXiv preprint arXiv:2309.01219}, 2023.

\bibitem{mialon2023augmented} G. Mialon, R. Dessì, M. Lomeli, C. Nalmpantis, R. Pasunuru, R. Raileanu, B. Rozière, T. Schick, J. Dwivedi-Yu, A. Celikyilmaz, et al., ``Augmented language models: a survey,'' \textit{arXiv preprint arXiv:2302.07842}, 2023.

\end{thebibliography}

\end{document}
