import json
import re
import unittest

# ---------- Campus agent under test (self-contained) ----------
# Mirrors the behavior of apps/ai-service: auth, request validation, retrieval, grounded
# prompt assembly, history truncation, place extraction and report classification.
MAX_MESSAGE_CHARS = 1000
MAX_HISTORY = 6
CHAT_MAX_TOKENS = 400
CLASSIFY_MAX_TOKENS = 100
CATEGORIES = {"elevator_outage", "construction", "event", "hazard", "closure", "other"}
PRINTER_WORDS = ("printer", "print", "printing", "wepa", "kiosk")

CHAT_SYSTEM_PROMPT = (
    "You are a campus assistant for the University of Oklahoma's Norman campus. "
    "Answer using only the campus data provided below. If the data doesn't contain the answer, "
    "say so plainly. Campus data:\n{context}"
)


class CampusAgent:
    def __init__(self, buildings, printers, llm, secret):
        self.buildings = buildings
        self.printers = printers
        self.llm = llm
        self.secret = secret

    def _authorize(self, secret):
        if not self.secret or secret != self.secret:
            raise PermissionError("Invalid service secret.")

    def _retrieve(self, message):
        text = message.lower()
        records = [
            b for b in self.buildings
            if any(re.search(rf"(?<!\w){re.escape(t.lower())}(?!\w)", text) for t in self._terms(b))
        ]
        if any(re.search(rf"(?<!\w){w}(?!\w)", text) for w in PRINTER_WORDS):
            records += [{"name": p["label"], "kind": "printer"} for p in self.printers]
        return records

    @staticmethod
    def _terms(building):
        stem = building["name"].lower().replace(" hall", "")
        return [building["name"], *building.get("aliases", []), stem]

    def chat(self, message, history=None, secret=None):
        self._authorize(secret)
        if not isinstance(message, str) or not 1 <= len(message) <= MAX_MESSAGE_CHARS:
            raise ValueError("message must be 1-1000 characters")
        records = self._retrieve(message)
        context = "\n".join(f"- {r['name']}" for r in records) or "(no matching records)"
        system = CHAT_SYSTEM_PROMPT.format(context=context)
        recent = (history or [])[-MAX_HISTORY:]
        reply = self.llm.complete(
            [{"role": "system", "content": system}, *recent, {"role": "user", "content": message}],
            max_tokens=CHAT_MAX_TOKENS,
        ).strip()
        names = [r["name"] for r in records]
        # Also surface any known building the reply itself names.
        names += [b["name"] for b in self.buildings if b["name"] in reply and b["name"] not in names]
        return {"reply": reply, "referencedPlaces": [n for n in dict.fromkeys(names) if n in reply]}

    def classify_report(self, title, user_category, secret=None, description=None):
        self._authorize(secret)
        raw = self.llm.complete(
            [
                {"role": "system", "content": "Classify the campus report as JSON."},
                {"role": "user", "content": f"{user_category}\n{title}\n{description or '(none)'}"},
            ],
            max_tokens=CLASSIFY_MAX_TOKENS,
            json_mode=True,
        )
        return parse_classification(raw, user_category)


def parse_classification(raw, fallback_category):
    try:
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`").removeprefix("json").strip()
        data = json.loads(text)
        if data["suggestedCategory"] not in CATEGORIES:
            raise ValueError("unknown category")
        data["confidence"] = min(1.0, max(0.0, float(data.get("confidence", 0))))
        return {k: data[k] for k in ("suggestedCategory", "isSpam", "confidence", "reason")}
    except (ValueError, TypeError, KeyError, AttributeError):
        return {
            "suggestedCategory": fallback_category,
            "isSpam": False,
            "confidence": 0.0,
            "reason": "Classifier response could not be parsed.",
        }


class FakeLLM:
    """Records every prompt it receives and returns a canned reply (no network calls)."""

    def __init__(self, reply):
        self.reply = reply
        self.calls = []

    def complete(self, messages, max_tokens, json_mode=False):
        self.calls.append({"messages": messages, "max_tokens": max_tokens, "json_mode": json_mode})
        return self.reply


SECRET = "test-secret"
BUILDINGS = [
    {"name": "Gaylord Hall", "aliases": ["Gaylord College"]},
    {"name": "Copeland Hall", "aliases": []},
    {"name": "Bizzell Memorial Library", "aliases": ["Bizzell", "the library"]},
]
PRINTERS = [{"label": "Copeland Hall"}]


class TestAICampusAgent(unittest.TestCase):

    def setUp(self):
        self.llm = FakeLLM("The nearest WEPA kiosk to Gaylord Hall is in Copeland Hall.")
        self.agent = CampusAgent(BUILDINGS, PRINTERS, self.llm, SECRET)

    # ---------- Correct ----------
    def test_chat_returns_reply_and_referenced_places(self):
        """A valid question returns the model's reply plus the places it names."""
        res = self.agent.chat("closest printer to Gaylord?", secret=SECRET)
        self.assertIn("Copeland Hall", res["reply"])
        self.assertIn("Gaylord Hall", res["referencedPlaces"])
        self.assertIn("Copeland Hall", res["referencedPlaces"])

    def test_chat_prompt_is_grounded_in_campus_data(self):
        """The model is told to use only campus data, and that data is in the prompt."""
        self.agent.chat("closest printer to Gaylord?", secret=SECRET)
        messages = self.llm.calls[0]["messages"]
        self.assertEqual(messages[0]["role"], "system")
        self.assertIn("Answer using only the campus data provided below", messages[0]["content"])
        self.assertIn("Gaylord Hall", messages[0]["content"])
        self.assertEqual(messages[-1], {"role": "user", "content": "closest printer to Gaylord?"})
        self.assertEqual(self.llm.calls[0]["max_tokens"], 400)

    def test_reply_naming_no_place_references_nothing(self):
        """A reply that names no campus place should not reference any pins."""
        self.llm.reply = "I don't have that information."
        res = self.agent.chat("what is the meaning of life?", secret=SECRET)
        self.assertEqual(res["referencedPlaces"], [])

    def test_classify_report_flags_spam(self):
        """The report classifier returns the model's spam verdict."""
        self.llm.reply = (
            '{"suggestedCategory": "other", "isSpam": true, "confidence": 0.9, "reason": "ad"}'
        )
        out = self.agent.classify_report("BUY CHEAP TICKETS", "event", secret=SECRET)
        self.assertTrue(out["isSpam"])
        self.assertTrue(self.llm.calls[0]["json_mode"])
        self.assertEqual(self.llm.calls[0]["max_tokens"], 100)

    # ---------- Incorrect ----------
    def test_missing_secret_is_rejected(self):
        """Requests without the service secret are unauthorized."""
        with self.assertRaises(PermissionError):
            self.agent.chat("hi")
        self.assertEqual(self.llm.calls, [])

    def test_wrong_secret_is_rejected(self):
        """Requests with the wrong service secret are unauthorized."""
        with self.assertRaises(PermissionError):
            self.agent.chat("hi", secret="nope")

    def test_empty_message_is_rejected(self):
        """An empty question fails validation and never reaches the model."""
        with self.assertRaises(ValueError):
            self.agent.chat("", secret=SECRET)
        self.assertEqual(self.llm.calls, [])

    def test_garbage_classification_falls_back_to_user_category(self):
        """Unparseable model output keeps the user's category with zero confidence."""
        self.llm.reply = "not json at all"
        out = self.agent.classify_report("Door stuck", "closure", secret=SECRET)
        self.assertEqual(out["suggestedCategory"], "closure")
        self.assertFalse(out["isSpam"])
        self.assertEqual(out["confidence"], 0.0)

    # ---------- Boundary ----------
    def test_message_length_boundary(self):
        """1000 characters is the maximum accepted message; 1001 is rejected."""
        self.agent.chat("a" * 1000, secret=SECRET)
        with self.assertRaises(ValueError):
            self.agent.chat("a" * 1001, secret=SECRET)

    def test_confidence_is_clamped_to_one(self):
        """A confidence above 1 is clamped to 1."""
        raw = '```json\n{"suggestedCategory": "hazard", "isSpam": false, "confidence": 1.7, "reason": "x"}\n```'
        self.assertEqual(parse_classification(raw, "other")["confidence"], 1.0)

    # ---------- Edge Case ----------
    def test_history_is_truncated_to_six_messages(self):
        """Only the six most recent history messages are sent to the model."""
        history = [{"role": "user", "content": f"m{i}"} for i in range(10)]
        self.agent.chat("hi", history=history, secret=SECRET)
        sent = self.llm.calls[0]["messages"]
        # system prompt + 6 history messages + current message
        self.assertEqual(len(sent), 8)
        self.assertEqual(sent[1]["content"], "m4")


if __name__ == "__main__":
    unittest.main()
