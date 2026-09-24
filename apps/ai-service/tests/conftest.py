import pytest

GAYLORD = {
    "id": "b-gaylord", "name": "Gaylord Hall", "abbreviation": None,
    "aliases": ["Gaylord College"], "description": None, "address": None,
    "lat": 35.204511, "lng": -97.444872, "hours": None,
}  # fmt: skip
BIZZELL = {
    "id": "b-bizzell", "name": "Bizzell Memorial Library", "abbreviation": None,
    "aliases": ["Bizzell", "the library"], "description": None, "address": None,
    "lat": 35.208047, "lng": -97.445894, "hours": None,
}  # fmt: skip
DEVON = {
    "id": "b-devon", "name": "Devon Energy Hall", "abbreviation": "DEH",
    "aliases": ["Devon"], "description": None, "address": None,
    "lat": 35.210760, "lng": -97.441796, "hours": None,
}  # fmt: skip
DALE = {
    "id": "b-dale", "name": "Dale Hall", "abbreviation": None, "aliases": [],
    "description": None, "address": None, "lat": 35.204289, "lng": -97.446638, "hours": None,
}  # fmt: skip
DALE_TOWER = {
    "id": "b-dale-tower", "name": "Dale Hall Tower", "abbreviation": None, "aliases": ["DHT"],
    "description": None, "address": None, "lat": 35.204281, "lng": -97.447218, "hours": None,
}  # fmt: skip
COPELAND = {
    "id": "b-copeland", "name": "Copeland Hall", "abbreviation": None, "aliases": [],
    "description": None, "address": None, "lat": 35.204759, "lng": -97.446587, "hours": None,
}  # fmt: skip


class FakeData:
    def __init__(self):
        self._buildings = [GAYLORD, BIZZELL, DEVON, DALE, DALE_TOWER, COPELAND]
        self._printers = [
            {"id": "p-copeland", "label": "Copeland Hall", "building_id": "b-copeland",
             "floor_note": None, "lat": 35.204759, "lng": -97.446587, "notes": None},
            {"id": "p-devon", "label": "Devon Energy Hall", "building_id": "b-devon",
             "floor_note": None, "lat": 35.210760, "lng": -97.441796, "notes": None},
        ]  # fmt: skip
        self._dining = [
            {"id": "d-bookmark", "name": "The Bookmark", "building_id": "b-bizzell",
             "lat": 35.208035, "lng": -97.446250, "hours": {"mon": "07:00-14:00"},
             "cuisine_type": "Coffee", "accepts_meal_plan": None, "menu_url": None},
        ]  # fmt: skip
        self._access = [
            {"id": "a-1", "building_id": "b-bizzell", "feature_type": "accessible_entrance",
             "description": "North entrance, ramp", "floor": None, "lat": None, "lng": None,
             "verified_at": "2026-09-20"},
        ]  # fmt: skip
        self._reports = []

    def buildings(self):
        return self._buildings

    def dining(self):
        return self._dining

    def printers(self):
        return self._printers

    def accessibility(self):
        return self._access

    def active_reports(self):
        return self._reports

    def nearest(self, kind, lat, lng, limit):
        rows = {"buildings": self._buildings, "dining": self._dining, "printers": self._printers}[
            kind
        ]
        return [{"id": r["id"], "lat": r["lat"], "lng": r["lng"]} for r in rows[:limit]]


class FakeLLM:
    def __init__(self, reply="ok"):
        self.reply = reply
        self.calls = []

    def complete(self, messages, max_tokens, json_mode=False):
        self.calls.append({"messages": messages, "max_tokens": max_tokens, "json_mode": json_mode})
        return self.reply


@pytest.fixture
def data():
    return FakeData()
