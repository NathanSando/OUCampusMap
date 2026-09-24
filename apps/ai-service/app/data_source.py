"""Read-only access to campus data in Supabase (design doc §4: the AI service reads, never writes)."""

from __future__ import annotations

import time
from typing import Protocol

import httpx

NearestKind = str  # "buildings" | "dining" | "printers"


class CampusData(Protocol):
    def buildings(self) -> list[dict]: ...
    def dining(self) -> list[dict]: ...
    def printers(self) -> list[dict]: ...
    def accessibility(self) -> list[dict]: ...
    def active_reports(self) -> list[dict]: ...
    def nearest(self, kind: NearestKind, lat: float, lng: float, limit: int) -> list[dict]: ...


class SupabaseCampusData:
    """PostgREST client over the v_* read views. Reference data is cached briefly; reports are not."""

    REFERENCE_TTL_S = 300

    def __init__(self, url: str, service_role_key: str, timeout: float = 5.0):
        self._client = httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1",
            headers={"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}"},
            timeout=timeout,
        )
        self._cache: dict[str, tuple[float, list[dict]]] = {}

    def _get(self, view: str, params: dict | None = None) -> list[dict]:
        res = self._client.get(f"/{view}", params={"select": "*", **(params or {})})
        res.raise_for_status()
        return res.json()

    def _cached(self, view: str) -> list[dict]:
        hit = self._cache.get(view)
        if hit and time.monotonic() - hit[0] < self.REFERENCE_TTL_S:
            return hit[1]
        rows = self._get(view)
        self._cache[view] = (time.monotonic(), rows)
        return rows

    def buildings(self) -> list[dict]:
        return self._cached("v_buildings")

    def dining(self) -> list[dict]:
        return self._cached("v_dining_locations")

    def printers(self) -> list[dict]:
        return self._cached("v_printers")

    def accessibility(self) -> list[dict]:
        return self._cached("v_accessibility_features")

    def active_reports(self) -> list[dict]:
        return self._get("v_active_reports", {"order": "created_at.desc", "limit": "25"})

    def nearest(self, kind: NearestKind, lat: float, lng: float, limit: int) -> list[dict]:
        res = self._client.post(
            f"/rpc/nearest_{kind}", json={"p_lat": lat, "p_lng": lng, "p_limit": limit}
        )
        res.raise_for_status()
        return res.json()
