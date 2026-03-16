import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Truth Guard API")

# Configure CORS for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VerifyRequest(BaseModel):
    text: str

class VerificationResult(BaseModel):
    status: str = Field(description="Must be 'false' if it contains a hallucination, 'true' if it is factually correct.")
    confidence_score: int = Field(description="A score from 0 to 100 representing confidence in this assessment. 100 means very confident.")
    original_text: str = Field(description="If hallucinated, the EXACT substring from the text that is false. If true, leave empty.")
    correction: str = Field(description="If hallucinated, the corrected truth. If true, leave empty.")
    source: str = Field(description="A source URL or explanation of why it is true or false.")

@app.post("/verify")
async def verify_text(request: VerifyRequest):
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    # Fallback to mock logic if the API key isn't provided yet
    if not groq_api_key or groq_api_key == "your_groq_api_key_here":
        if "Berlin" in request.text:
            return {
                "status": "false",
                "original_text": "The Eiffel Tower is in Berlin.",
                "correction": "The Eiffel Tower is in Paris, France.",
                "source": "https://en.wikipedia.org/wiki/Eiffel_Tower",
                "confidence_score": 98
            }
        return {
            "status": "true",
            "original_text": request.text,
            "confidence_score": 85
        }

    try:
        from langchain_groq import ChatGroq
        from langchain_core.prompts import ChatPromptTemplate
        from exa_py import Exa
        
        exa_api_key = os.getenv("EXA_API_KEY")
        
        # 1. Gather true facts from EXA (if a key is provided)
        search_context = "No internet context available."
        source_url = "None found"
        
        if exa_api_key and exa_api_key != "your_exa_api_key_here":
            try:
                exa = Exa(api_key=exa_api_key)
                # Let Exa figure out how to search based on the user's text
                search_response = exa.search_and_contents(
                    request.text,
                    type="neural",
                    use_autoprompt=True,
                    num_results=2,
                    text=True
                )
                
                if search_response.results:
                    # Combine context from top results
                    search_context = "\n\n".join([f"Source ({r.url}):\n{r.text[:1000]}" for r in search_response.results])
                    source_url = search_response.results[0].url
            except Exception as exa_err:
                print(f"Exa search failed: {exa_err}")
                search_context = f"Failed to retrieve internet facts: {exa_err}"

        # 2. Initialize Groq LLM
        llm = ChatGroq(
            temperature=0, 
            groq_api_key=groq_api_key, 
            model_name="llama-3.3-70b-versatile" 
        )
        
        structured_llm = llm.with_structured_output(VerificationResult)
        
        # 3. Prompt Groq using both the user's text and the actual internet facts from Exa
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a highly accurate fact-checking AI. You are provided with 'Internet Context' gathered from real-time searches. Analyze the user's text. If the user's text contradicts the Internet Context (a hallucination), set status to 'false', extract the EXACT false substring as 'original_text', and provide a 'correction' along with a 'confidence_score' (0-100). If it is generally true according to the context, set status to 'true' and give a high confidence_score. If you lack info, assume it's true but lower the score."),
            ("human", "Internet Context (Facts):\n{context}\n\n---\n\nUser Text to analyze:\n{text}")
        ])
        
        chain = prompt | structured_llm
        
        result = await chain.ainvoke({
            "context": search_context,
            "text": request.text
        })
        
        # Merge Exa source URL into result if the LLM didn't provide its own
        result_dict = result.model_dump()
        if not result_dict.get("source") or result_dict["source"] == "None found":
             result_dict["source"] = source_url
             
        return result_dict
        
    except Exception as e:
        print(f"Error calling Groq: {e}")
        return {"status": "error", "message": str(e)}
