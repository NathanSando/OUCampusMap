"""Python mirror of the campus proximity helpers in apps/mobile/src/lib/geo.ts."""

import math

MAX_CAMPUS_NODE_DISTANCE_M = 100
WALK_METERS_PER_MIN = 80  # ~3 mph

# Bounds from packages/shared-types/src/campus.ts
CAMPUS_BOUNDS = {"north": 35.2175, "south": 35.1765, "east": -97.4255, "west": -97.4615}


def is_within_campus(location: dict) -> bool:
    return (
        CAMPUS_BOUNDS["south"] <= location["lat"] <= CAMPUS_BOUNDS["north"]
        and CAMPUS_BOUNDS["west"] <= location["lng"] <= CAMPUS_BOUNDS["east"]
    )


def distance_meters(a: dict, b: dict) -> float:
    """Great-circle distance in meters."""
    r = 6_371_000
    d_lat = math.radians(b["lat"] - a["lat"])
    d_lng = math.radians(b["lng"] - a["lng"])
    h = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(a["lat"]))
        * math.cos(math.radians(b["lat"]))
        * math.sin(d_lng / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(h))


def estimate_walk_seconds(meters: float) -> float:
    return meters / WALK_METERS_PER_MIN * 60


def format_duration(seconds: float) -> str:
    mins = max(1, math.floor(seconds / 60 + 0.5))  # round half up, like JS Math.round
    if mins < 60:
        return f"{mins} min"
    return f"{mins // 60} h {mins % 60} min"


def get_campus_node_proximity(
    location: dict, nodes: list, max_distance_meters: float = MAX_CAMPUS_NODE_DISTANCE_M
) -> dict:
    nearest_node = None
    nearest_distance = math.inf
    for node in nodes:
        distance = distance_meters(location, node)
        if distance < nearest_distance:
            nearest_node = node
            nearest_distance = distance

    distance = nearest_distance if nearest_node is not None else None
    return {
        "nearestNode": nearest_node,
        "distanceMeters": distance,
        "isOnCampus": is_within_campus(location)
        and distance is not None
        and distance <= max_distance_meters,
    }
