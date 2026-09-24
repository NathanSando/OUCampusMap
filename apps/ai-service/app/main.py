"""AI service — never exposed to the public app; only the Node API calls it (design doc §8)."""

from __future__ import annotations

import hmac
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, Header, HTTPException

from .classify import classify_report
from .config import Settings, get_settings
from .data_source import CampusData, SupabaseCampusData
from .llm import LLM, OpenAILLM
from .models import ChatRequest, ChatResponse, ClassifyRequest, ClassifyResponse
from .prompts import CHAT_SYSTEM_PROMPT
from .retrieval import assemble_context, extract_referenced_places, retrieve

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

CAMPUS_TZ = ZoneInfo("America/Chicago")

app = FastAPI(title="OU Campus Map — AI service", version="0.1.0")


def require_secret(
    x_service_secret: str = Header(default=""),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.ai_service_shared_secret
    if not expected or not hmac.compare_digest(x_service_secret, expected):
        raise HTTPException(status_code=401, detail="Invalid service secret.")


_data: CampusData | None = None
_llm: LLM | None = None


def get_data(settings: Settings = Depends(get_settings)) -> CampusData:
    global _data
    if _data is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise HTTPException(status_code=503, detail="Supabase is not configured.")
        _data = SupabaseCampusData(settings.supabase_url, settings.supabase_service_role_key)
    return _data


def get_llm(settings: Settings = Depends(get_settings)) -> LLM:
    global _llm
    if _llm is None:
        if not settings.openai_api_key:
            raise HTTPException(status_code=503, detail="OpenAI is not configured.")
        _llm = OpenAILLM(settings.openai_api_key, settings.openai_model)
    return _llm


def campus_now() -> datetime:
    return datetime.now(CAMPUS_TZ)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(require_secret)])
def chat(
    req: ChatRequest,
    data: CampusData = Depends(get_data),
    llm: LLM = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    now = campus_now()
    retrieved = retrieve(req.message, data, req.userLocation, cap=settings.max_context_records)
    system = CHAT_SYSTEM_PROMPT.format(
        datetime=now.strftime("%A, %B %d, %Y, %I:%M %p Central"),
        context=assemble_context(retrieved, now),
    )
    history = [m.model_dump() for m in req.history[-settings.max_history :]]
    reply = llm.complete(
        [{"role": "system", "content": system}, *history, {"role": "user", "content": req.message}],
        max_tokens=settings.chat_max_tokens,
    ).strip()
    return ChatResponse(
        reply=reply,
        referencedPlaces=extract_referenced_places(reply, retrieved.records),
    )


@app.post(
    "/classify-report", response_model=ClassifyResponse, dependencies=[Depends(require_secret)]
)
def classify(
    req: ClassifyRequest,
    llm: LLM = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> ClassifyResponse:
    return classify_report(req, llm, settings.classify_max_tokens)
