import os
import asyncio
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv("c:\\Users\\akars\\.gemini\\antigravity\\scratch\\truth-guard\\backend\\.env")

async def test_logprobs():
    try:
        api_key = os.getenv("GROQ_API_KEY")
        llm = ChatGroq(
            temperature=0,
            groq_api_key=api_key,
            model_name="llama-3.3-70b-versatile"
        ).bind(logprobs=True)
        
        response = await llm.ainvoke("Is the sky blue? Answer yes or no.")
        print(response.response_metadata)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_logprobs())
