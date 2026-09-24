"""Retrieve → assemble (design doc §8.1).

Given a user message, pick the campus records the model needs to answer it, then
serialise them into a compact text block. Grounding is the requirement that matters:
the model may only use what ends up in this context.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import datetime

from .data_source import CampusData
from .hours import describe_week, open_state
from .models import LatLng, Record

PRINTER_WORDS = ("printer", "print", "printing", "wepa", "kiosk")
DINING_WORDS = (
    "eat", "food", "hungry", "dining", "lunch", "dinner", "breakfast", "coffee",
    "cafe", "restaurant", "snack", "meal",
)  # fmt: skip
ACCESS_WORDS = (
    "ramp", "wheelchair", "accessible", "accessibility", "elevator", "ada",
    "disability", "automatic door", "restroom",
)  # fmt: skip

# Generic words stripped from building names to get a searchable stem ("Gaylord Hall" → "gaylord").
GENERIC_NAME_WORDS = {
    "hall", "center", "centre", "building", "complex", "tower", "college", "house",
    "facility", "laboratory", "annex", "the", "of", "and", "for", "&", "jr", "jr.",
}  # fmt: skip

WALK_SPEED_M_PER_MIN = 80  # ~3 mph


def _contains_phrase(text: str, phrase: str) -> bool:
    phrase = phrase.strip().lower()
    if len(phrase) < 2:
        return False
    return re.search(rf"(?<![\w]){re.escape(phrase)}(?![\w])", text) is not None


def _mentions_any(text: str, words: tuple[str, ...]) -> bool:
    return any(_contains_phrase(text, w) for w in words)


def building_terms(b: dict) -> list[str]:
    terms = [b["name"], *(b.get("aliases") or [])]
    if b.get("abbreviation"):
        terms.append(b["abbreviation"])
    stem = " ".join(w for w in re.split(r"\s+", b["name"].lower()) if w not in GENERIC_NAME_WORDS)
    if len(stem) >= 4 and stem != b["name"].lower():
        terms.append(stem)
    return terms


def match_buildings(message: str, buildings: list[dict]) -> list[dict]:
    text = message.lower()
    return [b for b in buildings if any(_contains_phrase(text, t) for t in building_terms(b))]


def haversine_m(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    r = 6_371_000
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


@dataclass
class Retrieved:
    records: list[Record] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    _ids: set[str] = field(default_factory=set)

    def add(self, record: Record) -> None:
        key = f"{record.type}:{record.id}"
        if key not in self._ids:
            self._ids.add(key)
            self.records.append(record)


def _building_record(b: dict) -> Record:
    return Record(
        type="building",
        id=b["id"],
        name=b["name"],
        lat=b["lat"],
        lng=b["lng"],
        details={
            "abbreviation": b.get("abbreviation"),
            "aliases": b.get("aliases") or [],
            "description": b.get("description"),
            "address": b.get("address"),
            "hours": b.get("hours"),
        },
    )


def _anchor_distance(rec_lat: float, rec_lng: float, anchor: tuple[str, float, float] | None):
    if not anchor:
        return None
    name, lat, lng = anchor
    return name, haversine_m(lat, lng, rec_lat, rec_lng)


def retrieve(
    message: str,
    data: CampusData,
    user_location: LatLng | None = None,
    cap: int = 40,
) -> Retrieved:
    text = message.lower()
    out = Retrieved()
    buildings = data.buildings()
    by_id = {b["id"]: b for b in buildings}

    matched = match_buildings(message, buildings)
    for b in matched:
        out.add(_building_record(b))

    # Distances are measured from the first building named, else from the user.
    anchor: tuple[str, float, float] | None = None
    if matched:
        anchor = (matched[0]["name"], matched[0]["lat"], matched[0]["lng"])
    elif user_location:
        anchor = ("your location", user_location.lat, user_location.lng)

    def with_distance(rows: list[dict], limit: int) -> list[tuple[dict, tuple[str, float] | None]]:
        pairs = [(r, _anchor_distance(r["lat"], r["lng"], anchor)) for r in rows]
        if anchor:
            pairs.sort(key=lambda p: p[1][1])
        return pairs[:limit]

    if _mentions_any(text, PRINTER_WORDS):
        for p, dist in with_distance(data.printers(), 8):
            out.add(_printer_record(p, by_id, dist))

    if _mentions_any(text, DINING_WORDS):
        for d, dist in with_distance(data.dining(), 10):
            out.add(_dining_record(d, by_id, dist))

    if _mentions_any(text, ACCESS_WORDS):
        features = data.accessibility()
        targets = {b["id"] for b in matched}
        relevant = [f for f in features if not targets or f["building_id"] in targets]
        for f in relevant[:15]:
            out.add(_access_record(f, by_id))
        for b in matched:
            if not any(f["building_id"] == b["id"] for f in features):
                out.notes.append(f"No accessibility information is recorded yet for {b['name']}.")
        if not matched and not relevant:
            out.notes.append("No accessibility information has been recorded for any building yet.")

    if user_location:
        for b in data.nearest("buildings", user_location.lat, user_location.lng, 5):
            if b["id"] in by_id:
                out.add(_building_record(by_id[b["id"]]))
        dining_by_id = {d["id"]: d for d in data.dining()}
        for d in data.nearest("dining", user_location.lat, user_location.lng, 3):
            if d["id"] in dining_by_id:
                dist = _anchor_distance(d["lat"], d["lng"], anchor)
                out.add(_dining_record(dining_by_id[d["id"]], by_id, dist))
        printers_by_id = {p["id"]: p for p in data.printers()}
        for p in data.nearest("printers", user_location.lat, user_location.lng, 3):
            if p["id"] in printers_by_id:
                dist = _anchor_distance(p["lat"], p["lng"], anchor)
                out.add(_printer_record(printers_by_id[p["id"]], by_id, dist))

    # Active reports are always included — there won't be many.
    for r in data.active_reports():
        out.add(_report_record(r, by_id))

    out.records = out.records[:cap]
    return out


def _printer_record(p: dict, by_id: dict, dist) -> Record:
    building = by_id.get(p.get("building_id") or "")
    return Record(
        type="printer",
        id=p["id"],
        name=p["label"],
        lat=p["lat"],
        lng=p["lng"],
        details={
            "building": building["name"] if building else None,
            "floor": p.get("floor_note"),
            "notes": p.get("notes"),
            "distance": dist,
        },
    )


def _dining_record(d: dict, by_id: dict, dist) -> Record:
    building = by_id.get(d.get("building_id") or "")
    return Record(
        type="dining",
        id=d["id"],
        name=d["name"],
        lat=d["lat"],
        lng=d["lng"],
        details={
            "building": building["name"] if building else None,
            "cuisine": d.get("cuisine_type"),
            "hours": d.get("hours"),
            "meal_plan": d.get("accepts_meal_plan"),
            "distance": dist,
        },
    )


def _access_record(f: dict, by_id: dict) -> Record:
    building = by_id.get(f["building_id"])
    return Record(
        type="accessibility",
        id=f["id"],
        name=f"{building['name'] if building else 'Unknown building'} — {f['feature_type']}",
        lat=f.get("lat") or (building or {}).get("lat"),
        lng=f.get("lng") or (building or {}).get("lng"),
        details={
            "building": building["name"] if building else None,
            "feature": f["feature_type"],
            "description": f.get("description"),
            "floor": f.get("floor"),
            "verified_at": f.get("verified_at"),
        },
    )


def _report_record(r: dict, by_id: dict) -> Record:
    building = by_id.get(r.get("building_id") or "")
    return Record(
        type="report",
        id=r["id"],
        name=r["title"],
        lat=r["lat"],
        lng=r["lng"],
        details={
            "category": r["category"],
            "description": r.get("description"),
            "building": building["name"] if building else None,
            "created_at": r["created_at"],
            "expires_at": r["expires_at"],
            "score": r.get("upvotes", 0) - r.get("downvotes", 0),
        },
    )


def _fmt_distance(dist) -> str:
    if not dist:
        return ""
    name, meters = dist
    minutes = max(1, round(meters / WALK_SPEED_M_PER_MIN))
    return f" About {round(meters)} m straight-line from {name} (~{minutes} min walk)."


def assemble_context(retrieved: Retrieved, now: datetime) -> str:
    """Serialise records into compact lines the model can cite by exact name."""
    lines: list[str] = []
    for r in retrieved.records:
        d = r.details
        if r.type == "building":
            extra = []
            if d.get("abbreviation"):
                extra.append(f"abbr {d['abbreviation']}")
            if d.get("aliases"):
                extra.append("aka " + ", ".join(d["aliases"]))
            line = f"[building] {r.name}" + (f" ({'; '.join(extra)})" if extra else "")
            if d.get("description"):
                line += f". {d['description']}"
            if d.get("address"):
                line += f" Address: {d['address']}."
            if d.get("hours"):
                line += f" Hours: {describe_week(d['hours'])}."
        elif r.type == "printer":
            line = f"[printer] {r.name} — WEPA kiosk"
            if d.get("building"):
                line += f" in {d['building']}"
            if d.get("floor"):
                line += f", {d['floor']}"
            line += "."
            if d.get("notes"):
                line += f" {d['notes']}"
            line += _fmt_distance(d.get("distance"))
        elif r.type == "dining":
            line = f"[dining] {r.name}"
            if d.get("building"):
                line += f" in {d['building']}"
            if d.get("cuisine"):
                line += f" ({d['cuisine']})"
            state = open_state(d.get("hours"), now)
            line += f". Hours: {describe_week(d.get('hours'))}. Open right now: {state}."
            meal = d.get("meal_plan")
            line += (
                " Meal plan: "
                + ("accepted" if meal else "not accepted" if meal is False else "unknown")
                + "."
            )
            line += _fmt_distance(d.get("distance"))
        elif r.type == "accessibility":
            verified = (
                f"verified in person {d['verified_at']}" if d.get("verified_at") else "UNVERIFIED"
            )
            line = f"[accessibility] {d.get('building')}: {d['feature'].replace('_', ' ')}"
            if d.get("description"):
                line += f" — {d['description']}"
            if d.get("floor"):
                line += f" (floor {d['floor']})"
            line += f" [{verified}]"
        else:  # report
            line = f"[live report: {d['category'].replace('_', ' ')}] {r.name}"
            if d.get("building"):
                line += f" at {d['building']}"
            if d.get("description"):
                line += f" — {d['description']}"
            line += f" (posted {d['created_at']}, expires {d['expires_at']}, community score {d['score']})"
        lines.append(line)

    lines.extend(f"[note] {n}" for n in retrieved.notes)
    return "\n".join(lines) if lines else "(no matching campus records)"


def extract_referenced_places(reply: str, records: list[Record]) -> list[dict]:
    """Match exact record names in the reply back to retrieved records (design doc §8.1 step 4).

    Longest names are matched first and their spans masked, so "Dale Hall Tower"
    doesn't also produce a chip for "Dale Hall".
    """
    text = reply.lower()
    found: list[dict] = []
    seen: set[str] = set()
    candidates = [r for r in records if r.type != "accessibility" and r.lat is not None]
    for r in sorted(candidates, key=lambda r: len(r.name), reverse=True):
        needle = r.name.lower()
        idx = text.find(needle)
        if idx == -1 or r.id in seen:
            continue
        text = text[:idx] + "\0" * len(needle) + text[idx + len(needle) :]
        seen.add(r.id)
        found.append({"type": r.type, "id": r.id, "name": r.name, "lat": r.lat, "lng": r.lng})
    # Preserve reading order of the reply.
    return sorted(found, key=lambda p: reply.lower().find(p["name"].lower()))
