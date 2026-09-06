import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
import httpx
from app.core.config import settings

PROVIDERS_CONFIG = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "openai/gpt-oss-20b",
        "models": [
            {"id": "openai/gpt-oss-20b", "name": "GPT-OSS 20B (Active)", "provider": "Groq"},
            {"id": "qwen/qwen3.8-27b", "name": "Qwen 3.8 27B", "provider": "Groq"},
            {"id": "allam-2-7b", "name": "Allam 2 7B", "provider": "Groq"},
            {"id": "canopylabs/orpheus-v1-english", "name": "Orpheus v1", "provider": "Groq"}
        ]
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "meta-llama/llama-3.3-70b-instruct",
        "models": [
            {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B", "provider": "OpenRouter"},
            {"id": "deepseek/deepseek-r1", "name": "DeepSeek R1", "provider": "OpenRouter"},
            {"id": "google/gemini-2.0-flash-exp:free", "name": "Gemini 2.0 Flash (Free)", "provider": "OpenRouter"}
        ]
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
        "models": [
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI"},
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI"}
        ]
    }
}

async def stream_hosted_llm(
    messages: List[Dict[str, str]],
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    temperature: float = 0.7,
    top_p: float = 0.9,
    max_tokens: int = 1024
) -> AsyncGenerator[str, None]:
    """
    Streams tokens from a hosted LLM inference endpoint using SSE (Server-Sent Events).
    Falls back gracefully to high-speed simulation if no API key is provided yet.
    """
    target_provider = (provider or settings.DEFAULT_PROVIDER).lower()
    prov_cfg = PROVIDERS_CONFIG.get(target_provider, PROVIDERS_CONFIG["groq"])
    target_model = model or prov_cfg["default_model"]
    
    # Check for API key
    key = api_key
    if not key:
        if target_provider == "groq":
            key = settings.GROQ_API_KEY
        elif target_provider == "openrouter":
            key = settings.OPENROUTER_API_KEY
        elif target_provider == "openai":
            key = settings.OPENAI_API_KEY

    # If key is available, stream from real hosted endpoint
    if key and key.strip():
        url = f"{prov_cfg['base_url']}/chat/completions"
        headers = {
            "Authorization": f"Bearer {key.strip()}",
            "Content-Type": "application/json"
        }
        if target_provider == "openrouter":
            headers["HTTP-Referer"] = "https://cloudgpt.app"
            headers["X-Title"] = "CloudGPT"

        payload = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        err_body = await response.aread()
                        raw_err = err_body.decode(errors="ignore")
                        print(f"[HOSTED LLM ERROR {response.status_code}]:", raw_err)

                        available_models = []
                        try:
                            m_resp = await client.get(f"{prov_cfg['base_url']}/models", headers=headers, timeout=5.0)
                            if m_resp.status_code == 200:
                                m_data = m_resp.json().get("data", [])
                                available_models = [m.get("id") for m in m_data if "id" in m]
                                print(f"[{target_provider.upper()} PERMITTED MODELS]:", available_models)
                        except Exception as m_err:
                            print("[ERROR FETCHING MODELS]:", m_err)
                        
                        try:
                            err_json = json.loads(raw_err)
                            detail = err_json.get("error", {}).get("message", raw_err)
                        except Exception:
                            detail = raw_err

                        models_hint = ""
                        if available_models:
                            models_hint = f"\n\n**Available models on your account:**\n" + "\n".join([f"- `{m}`" for m in available_models[:6]])

                        err_display = (
                            f"⚠️ **{target_provider.upper()} API Error ({response.status_code}):**\n\n"
                            f"> {detail}\n\n"
                            f"{models_hint}\n\n"
                            f"*Please select one of the available models in **⚙️ Settings** (bottom-left).*"
                        )
                        yield f"data: {json.dumps({'token': err_display, 'error': detail})}\n\n"
                        yield "data: [DONE]\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                yield "data: [DONE]\n\n"
                                break
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                token = delta.get("content") or delta.get("reasoning_content") or ""
                                if token:
                                    yield f"data: {json.dumps({'token': token})}\n\n"
                            except Exception:
                                continue
            return
        except Exception as e:
            err_display = f"⚠️ **Connection to {target_provider.upper()} Failed:**\n\n> {str(e)}"
            print(f"[HOSTED LLM EXCEPTION]: {str(e)}")
            yield f"data: {json.dumps({'token': err_display, 'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
            return

    # Intelligent interactive simulated fallback when no key is set yet
    # Explains clearly how to add a key while providing a full functional simulation
    last_user_query = messages[-1]["content"] if messages else ""
    sample_text = (
        f"👋 **CloudGPT is connected and running!**\n\n"
        f"You asked: *\"{last_user_query}\"*\n\n"
        f"To connect directly to live high-speed hosted inference:\n"
        f"1. Click the **⚙️ Settings** icon in the sidebar.\n"
        f"2. Enter your free **Groq** API key (from [console.groq.com](https://console.groq.com)) or **OpenRouter** key.\n"
        f"3. CloudGPT will stream 500+ tokens/second from **{target_model}** over the internet!\n\n"
        f"Your multi-user database, sessions, document RAG, and UI controls are all 100% active."
    )
    
    words = sample_text.split(" ")
    for word in words:
        await asyncio.sleep(0.04)
        yield f"data: {json.dumps({'token': word + ' '})}\n\n"
    yield "data: [DONE]\n\n"
