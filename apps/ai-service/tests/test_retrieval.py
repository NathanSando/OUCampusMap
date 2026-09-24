from datetime import datetime

from app.models import LatLng
from app.retrieval import assemble_context, extract_referenced_places, retrieve


def test_matches_building_by_stem_and_selects_printers(data):
    r = retrieve("where's the closest printer to Gaylord?", data)
    types = [(rec.type, rec.id) for rec in r.records]
    assert ("building", "b-gaylord") in types
    printers = [rec for rec in r.records if rec.type == "printer"]
    # Sorted by distance from Gaylord Hall: Copeland is much closer than Devon.
    assert [p.id for p in printers] == ["p-copeland", "p-devon"]
    assert printers[0].details["distance"][0] == "Gaylord Hall"


def test_matches_alias_and_abbreviation(data):
    assert any(rec.id == "b-bizzell" for rec in retrieve("is the library open?", data).records)
    assert any(rec.id == "b-devon" for rec in retrieve("how do I get to DEH", data).records)


def test_dining_keywords_pull_dining(data):
    r = retrieve("I'm hungry, where can I eat?", data)
    assert any(rec.type == "dining" for rec in r.records)


def test_no_printers_without_printer_words(data):
    r = retrieve("tell me about Bizzell", data)
    assert not any(rec.type == "printer" for rec in r.records)


def test_accessibility_notes_missing_data(data):
    r = retrieve("accessible entrance to Devon Energy Hall?", data)
    assert any(
        "No accessibility information is recorded yet for Devon Energy Hall" in n for n in r.notes
    )
    r = retrieve("accessible entrance to Bizzell?", data)
    assert any(rec.type == "accessibility" for rec in r.records)


def test_user_location_adds_nearest(data):
    r = retrieve("what's around me", data, LatLng(lat=35.205, lng=-97.445))
    assert sum(1 for rec in r.records if rec.type == "building") >= 3


def test_cap_is_respected(data):
    r = retrieve("printer food Bizzell Devon Dale", data, LatLng(lat=35.205, lng=-97.445), cap=4)
    assert len(r.records) == 4


def test_context_marks_open_state_and_verification(data):
    r = retrieve("coffee near the library, is it accessible?", data)
    monday_9am = datetime(2026, 9, 21, 9, 0)
    ctx = assemble_context(r, monday_9am)
    assert "Open right now: open" in ctx
    assert "verified in person 2026-09-20" in ctx


def test_context_when_nothing_matches(data):
    r = retrieve("what's the meaning of life", data)
    assert assemble_context(r, datetime(2026, 9, 21, 9, 0)) == "(no matching campus records)"


def test_extract_prefers_longest_name(data):
    r = retrieve("Dale Hall and DHT", data)
    places = extract_referenced_places("Head to Dale Hall Tower, room 200.", r.records)
    assert [p["id"] for p in places] == ["b-dale-tower"]


def test_extract_ignores_unretrieved_names(data):
    r = retrieve("printer near Gaylord", data)
    places = extract_referenced_places("Try the kiosk in Copeland Hall or Hester Hall.", r.records)
    names = {p["name"] for p in places}
    assert "Copeland Hall" in names
    assert "Hester Hall" not in names
