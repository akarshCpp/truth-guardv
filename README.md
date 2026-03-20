🛡️ Truth Guard

Truth Guard is an AI-powered hallucination detection and correction system designed to verify and improve AI-generated content in real time.

It consists of:

A Chrome Extension (Frontend) built with vanilla JavaScript

A FastAPI Backend for verification, reasoning, and correction

🚀 Features

🔍 Detects hallucinations in AI-generated responses

🧠 Uses LLM + retrieval-based verification (RAG-style)

⚡ Real-time validation via browser extension

🛠️ One-click correction for inaccurate content

🌐 Works on any webpage with AI-generated text

🏗️ Project Structure
Truth-Guard/
│── backend/        # FastAPI server (core logic & APIs)
│── extension/      # Chrome Extension (Manifest V3)
│── test_env/       # Local testing environment
│   └── mock_chatgpt.html
│── README.md
⚙️ Backend Setup
1️⃣ Navigate to Backend
cd backend
2️⃣ Activate Virtual Environment

Windows

.\venv\Scripts\activate

Mac/Linux

source venv/bin/activate
3️⃣ Install Dependencies
pip install -r requirements.txt
4️⃣ Configure Environment Variables

Create a .env file from .env.example and add:

GROQ_API_KEY=your_api_key_here
EXA_API_KEY=your_api_key_here

GROQ_API_KEY → LLM inference (free at https://console.groq.com
)

EXA_API_KEY → Neural search for fact verification

5️⃣ Run the Server
uvicorn main:app --reload

📍 Backend runs at:
👉 http://localhost:8000

🧩 Extension Setup

Open Google Chrome

Go to: chrome://extensions/

Enable Developer Mode (top right)

Click Load unpacked

Select the extension/ folder

✅ The extension is now installed and active.

🧪 Usage

Open any webpage containing AI-generated content
(or use test_env/mock_chatgpt.html for testing)

A 🛡️ Verify Truth button will appear next to detected AI responses

Click Verify Truth:

The text is sent to the backend for validation

Hallucinated content is flagged

If issues are found:

🔴 Incorrect text is highlighted

🛠️ A Fix It button appears

Click Fix It to apply corrections instantly

🧠 How It Works (High-Level)

Extraction Layer → Chrome extension captures AI responses

Verification Layer → Backend performs:

Retrieval-based fact checking (RAG)

LLM-based reasoning

Correction Layer → Generates improved, factual responses

UI Layer → Displays results interactively in the browser

🔮 Future Improvements

✅ Claim-level verification (fine-grained fact checking)

✅ NLI-based contradiction detection

✅ Hallucination confidence scoring

🎯 Better UI/UX for inline explanations

⚡ Faster inference & caching

🤝 Contributing

Contributions are welcome! Feel free to:

Open issues

Suggest improvements

Submit pull requests

📄 License

This project is licensed under the MIT License.
