import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app, get_data, get_llm

from .conftest import FakeData, FakeLLM

SECRET = "test-secret"


@pytest.fixture
def client():
    llm = FakeLLM("The nearest WEPA kiosk to Gaylord Hall is in Copeland Hall.")
    app.dependency_overrides[get_settings] = lambda: Settings(ai_service_shared_secret=SECRET)
    app.dependency_overrides[get_data] = lambda: FakeData()
    app.dependency_overrides[get_llm] = lambda: llm
    yield TestClient(app), llm
    app.dependency_overrides.clear()


def test_health_needs_no_secret(client):
    c, _ = client
    assert c.get("/health").json() == {"status": "ok"}


def test_rejects_missing_or_wrong_secret(client):
    c, _ = client
    assert c.post("/chat", json={"message": "hi"}).status_code == 401
    assert (
        c.post("/chat", json={"message": "hi"}, headers={"X-Service-Secret": "nope"}).status_code
        == 401
    )


def test_chat_returns_reply_and_places(client):
    c, llm = client
    res = c.post(
        "/chat",
        json={"message": "closest printer to Gaylord?", "history": []},
        headers={"X-Service-Secret": SECRET},
    )
    assert res.status_code == 200
    body = res.json()
    assert "Copeland Hall" in body["reply"]
    names = [p["name"] for p in body["referencedPlaces"]]
    assert "Gaylord Hall" in names and "Copeland Hall" in names
    system_prompt = llm.calls[0]["messages"][0]["content"]
    assert "Answer using only the campus data provided below" in system_prompt
    assert llm.calls[0]["max_tokens"] == 400


def test_chat_truncates_history(client):
    c, llm = client
    history = [{"role": "user", "content": f"m{i}"} for i in range(10)]
    c.post(
        "/chat", json={"message": "hi", "history": history}, headers={"X-Service-Secret": SECRET}
    )
    sent = llm.calls[0]["messages"]
    # system + 6 history + current message
    assert len(sent) == 8
