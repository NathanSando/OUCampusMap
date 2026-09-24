"""Python twin of packages/shared-types/src/hours.ts — keep the two in sync."""

from __future__ import annotations

import re
from datetime import datetime

DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]  # datetime.weekday() order
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
_CLOCK = re.compile(r"^(\d{1,2}):(\d{2})$")


def _minutes(hhmm: str) -> int | None:
    m = _CLOCK.match(hhmm.strip())
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def open_state(hours: dict | None, at: datetime) -> str:
    """Returns 'open', 'closed' or 'unknown'. A missing day means unknown, not closed."""
    if not hours:
        return "unknown"
    day = hours.get(DAY_KEYS[at.weekday()])
    if not day or not day.strip():
        return "unknown"
    day = day.strip().lower()
    if day == "closed":
        return "closed"
    if day == "24h":
        return "open"
    now = at.hour * 60 + at.minute
    parsed_any = False
    for rng in day.split(","):
        parts = [_minutes(p) for p in rng.split("-")]
        if len(parts) != 2 or None in parts:
            continue
        parsed_any = True
        start, end = parts
        inside = (now >= start or now < end) if end <= start else (start <= now < end)
        if inside:
            return "open"
    return "closed" if parsed_any else "unknown"


def describe_week(hours: dict | None) -> str:
    if not hours:
        return "hours not recorded"
    return "; ".join(f"{DAY_NAMES[i]} {hours[k]}" for i, k in enumerate(DAY_KEYS) if hours.get(k))
