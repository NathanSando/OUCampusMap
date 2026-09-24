from app.classify import classify_report, parse_classification
from app.models import ClassifyRequest

from .conftest import FakeLLM


def test_parses_valid_json():
    raw = '{"suggestedCategory": "elevator_outage", "isSpam": false, "confidence": 0.93, "reason": "x"}'
    out = parse_classification(raw, "other")
    assert out.suggestedCategory == "elevator_outage"
    assert out.confidence == 0.93


def test_parses_fenced_json_and_clamps_confidence():
    raw = '```json\n{"suggestedCategory": "hazard", "isSpam": false, "confidence": 1.7, "reason": "x"}\n```'
    assert parse_classification(raw, "other").confidence == 1.0


def test_garbage_falls_back_to_user_category():
    out = parse_classification("not json at all", "closure")
    assert out.suggestedCategory == "closure"
    assert out.isSpam is False
    assert out.confidence == 0.0


def test_unknown_category_falls_back():
    raw = '{"suggestedCategory": "ufo", "isSpam": false, "confidence": 0.9, "reason": "x"}'
    assert parse_classification(raw, "event").suggestedCategory == "event"


def test_classify_uses_json_mode_and_token_cap():
    llm = FakeLLM(
        '{"suggestedCategory": "other", "isSpam": true, "confidence": 0.9, "reason": "ad"}'
    )
    req = ClassifyRequest(title="BUY CHEAP TICKETS", userCategory="event")
    out = classify_report(req, llm, max_tokens=100)
    assert out.isSpam is True
    assert llm.calls[0]["json_mode"] is True
    assert llm.calls[0]["max_tokens"] == 100
