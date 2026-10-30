import sys
import unittest
from pathlib import Path

# The AI service lives in apps/ai-service; make its `app` package importable from here.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "ai-service"))

from fastapi.testclient import TestClient  # noqa: E402

from app.config import Settings, get_settings  # noqa: E402
from app.main import app, get_data, get_llm  # noqa: E402

SECRET = "test-secret"
HEADERS = {"X-Service-Secret": SECRET}

GAYLORD = {
    "id": "b-gaylord", "name": "Gaylord Hall", "abbreviation": None,
    "aliases": ["Gaylord College"], "description": None, "address": None,
    "lat": 35.204511, "lng": -97.444872, "hours": None,
}  # fmt: skip
COPELAND = {
    "id": "b-copeland", "name": "Copeland Hall", "abbreviation": None, "aliases": [],
    "description": None, "address": None, "lat": 35.204759, "lng": -97.446587, "hours": None,
}  # fmt: skip
BIZZELL = {
    "id": "b-bizzell", "name": "Bizzell Memorial Library", "abbreviation": None,
    "aliases": ["Bizzell", "the library"], "description": None, "address": None,
    "lat": 35.208047, "lng": -97.445894, "hours": None,
}  # fmt: skip


class FakeCampusData:
    """In-memory stand-in for the Supabase campus data source."""

    def __init__(self):
        self._buildings = [GAYLORD, COPELAND, BIZZELL]
        self._printers = [
            {"id": "p-copeland", "label": "Copeland Hall", "building_id": "b-copeland",
             "floor_note": None, "lat": 35.204759, "lng": -97.446587, "notes": None},
        ]  # fmt: skip

    def buildings(self):
        return self._buildings

    def dining(self):
        return []

    def printers(self):
        return self._printers

    def accessibility(self):
        return []

    def active_reports(self):
        return []

    def nearest(self, kind, lat, lng, limit):
        rows = {"buildings": self._buildings, "dining": [], "printers": self._printers}[kind]
        return [{"id": r["id"], "lat": r["lat"], "lng": r["lng"]} for r in rows[:limit]]


class FakeLLM:
    """Records every prompt it receives and returns a canned reply (no OpenAI calls)."""

    def __init__(self, reply):
        self.reply = reply
        self.calls = []

    def complete(self, messages, max_tokens, json_mode=False):
        self.calls.append({"messages": messages, "max_tokens": max_tokens, "json_mode": json_mode})
        return self.reply


class TestAICampusAgent(unittest.TestCase):

    def setUp(self):
        self.llm = FakeLLM("The nearest WEPA kiosk to Gaylord Hall is in Copeland Hall.")
        app.dependency_overrides[get_settings] = lambda: Settings(ai_service_shared_secret=SECRET)
        app.dependency_overrides[get_data] = lambda: FakeCampusData()
        app.dependency_overrides[get_llm] = lambda: self.llm
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def chat(self, payload, headers=HEADERS):
        return self.client.post("/chat", json=payload, headers=headers)

    # ---------- Correct ----------
    def test_chat_returns_reply_and_referenced_places(self):
        """A valid question returns the model's reply plus the places it names."""
        res = self.chat({"message": "closest printer to Gaylord?"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("Copeland Hall", body["reply"])
        names = [p["name"] for p in body["referencedPlaces"]]
        self.assertIn("Gaylord Hall", names)
        self.assertIn("Copeland Hall", names)

    def test_chat_prompt_is_grounded_in_campus_data(self):
        """The model is told to use only campus data, and that data is in the prompt."""
        self.chat({"message": "closest printer to Gaylord?"})
        messages = self.llm.calls[0]["messages"]
        self.assertEqual(messages[0]["role"], "system")
        self.assertIn("Answer using only the campus data provided below", messages[0]["content"])
        self.assertIn("Gaylord Hall", messages[0]["content"])
        self.assertEqual(messages[-1], {"role": "user", "content": "closest printer to Gaylord?"})
        self.assertEqual(self.llm.calls[0]["max_tokens"], 400)

    def test_reply_naming_no_place_references_nothing(self):
        """A reply that names no campus place should not reference any pins."""
        self.llm.reply = "I don't have that information."
        res = self.chat({"message": "what is the meaning of life?"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["referencedPlaces"], [])

    def test_classify_report_flags_spam(self):
        """The report classifier returns the model's spam verdict."""
        self.llm.reply = (
            '{"suggestedCategory": "other", "isSpam": true, "confidence": 0.9, "reason": "ad"}'
        )
        res = self.client.post(
            "/classify-report",
            json={"title": "BUY CHEAP TICKETS", "userCategory": "event"},
            headers=HEADERS,
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["isSpam"])
        self.assertTrue(self.llm.calls[0]["json_mode"])

    # ---------- Incorrect ----------
    def test_missing_secret_is_rejected(self):
        """Requests without the service secret are unauthorized."""
        self.assertEqual(self.chat({"message": "hi"}, headers={}).status_code, 401)
        self.assertEqual(self.llm.calls, [])

    def test_wrong_secret_is_rejected(self):
        """Requests with the wrong service secret are unauthorized."""
        res = self.chat({"message": "hi"}, headers={"X-Service-Secret": "nope"})
        self.assertEqual(res.status_code, 401)

    def test_empty_message_is_rejected(self):
        """An empty question fails validation and never reaches the model."""
        self.assertEqual(self.chat({"message": ""}).status_code, 422)
        self.assertEqual(self.llm.calls, [])

    # ---------- Boundary ----------
    def test_message_length_boundary(self):
        """1000 characters is the maximum accepted message; 1001 is rejected."""
        self.assertEqual(self.chat({"message": "a" * 1000}).status_code, 200)
        self.assertEqual(self.chat({"message": "a" * 1001}).status_code, 422)

    # ---------- Edge Case ----------
    def test_history_is_truncated_to_six_messages(self):
        """Only the six most recent history messages are sent to the model."""
        history = [{"role": "user", "content": f"m{i}"} for i in range(10)]
        self.chat({"message": "hi", "history": history})
        sent = self.llm.calls[0]["messages"]
        # system prompt + 6 history messages + current message
        self.assertEqual(len(sent), 8)
        self.assertEqual(sent[1]["content"], "m4")


if __name__ == "__main__":
    unittest.main()
