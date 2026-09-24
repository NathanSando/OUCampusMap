"""Report spam/category classification (design doc §8.2)."""

from __future__ import annotations

import json
import logging

from pydantic import ValidationError

from .llm import LLM
from .models import ClassifyRequest, ClassifyResponse
from .prompts import CLASSIFY_SYSTEM_PROMPT, classify_user_message

log = logging.getLogger("ai-service.classify")


def parse_classification(raw: str, fallback_category: str) -> ClassifyResponse:
    """Parse the model's JSON. Anything unparseable becomes a zero-confidence pass-through,
    so the Node API keeps the user's category and accepts the report."""
    try:
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`").removeprefix("json").strip()
        data = json.loads(text)
        data["confidence"] = min(1.0, max(0.0, float(data.get("confidence", 0))))
        return ClassifyResponse.model_validate(data)
    except (ValueError, TypeError, ValidationError) as exc:
        log.warning("unparseable classification: %s", exc)
        return ClassifyResponse(
            suggestedCategory=fallback_category,
            isSpam=False,
            confidence=0.0,
            reason="Classifier response could not be parsed.",
        )


def classify_report(req: ClassifyRequest, llm: LLM, max_tokens: int) -> ClassifyResponse:
    raw = llm.complete(
        [
            {"role": "system", "content": CLASSIFY_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": classify_user_message(req.title, req.description, req.userCategory),
            },
        ],
        max_tokens=max_tokens,
        json_mode=True,
    )
    return parse_classification(raw, req.userCategory)
