"""Thin wrapper around the OpenAI client so tests can swap in a fake (never hit the real API in tests)."""

from __future__ import annotations

import logging
from typing import Protocol

from openai import OpenAI

log = logging.getLogger("ai-service.llm")


class LLM(Protocol):
    def complete(self, messages: list[dict], max_tokens: int, json_mode: bool = False) -> str: ...


class OpenAILLM:
    def __init__(self, api_key: str, model: str):
        self._client = OpenAI(api_key=api_key, timeout=15.0, max_retries=1)
        self._model = model

    def complete(self, messages: list[dict], max_tokens: int, json_mode: bool = False) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.2,
            **({"response_format": {"type": "json_object"}} if json_mode else {}),
        )
        usage = response.usage
        if usage:
            # Logged per request so we can watch the bill (design doc §8.4).
            log.info(
                "openai usage model=%s prompt=%d completion=%d total=%d",
                self._model,
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens,
            )
        return response.choices[0].message.content or ""
