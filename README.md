# Truth Guard

Truth Guard is an AI Hallucination detector and corrector system. It consists of a vanilla JavaScript Chrome Extension (frontend) and a Python FastAPI server (backend).

## Project Structure

- `/backend`: Python FastAPI server to process text.
- `/extension`: Manifest V3 Chrome Extension.
- `/test_env`: Contains `mock_chatgpt.html` for local testing.

## Backend Setup

1. Navigate to the `backend` directory.
2. Ensure you have activated the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and configure your API keys:
   - `GROQ_API_KEY` (Free at console.groq.com)
   - `EXA_API_KEY` (For neural web searches)
5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will run on `http://localhost:8000`.

## Extension Setup

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `extension` folder in this repository.
6. The extension is now loaded and will automatically run on all webpages.

## Usage

1. Open any webpage containing elements with the class `ai-message` (or use the provided `test_env/mock_chatgpt.html`).
2. You will see a "🛡️ Verify Truth" button appear next to AI messages.
3. Click the button. The extension will send the text to the backend.
4. If a hallucination is detected, the text will be highlighted in red with a "Fix it" button.
5. Click "Fix it" to automatically apply the correction.
