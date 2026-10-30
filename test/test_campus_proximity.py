import math
import unittest

# ---------- Campus proximity logic under test (self-contained) ----------
# Mirrors apps/mobile/src/lib/geo.ts and packages/shared-types/src/campus.ts.
MAX_CAMPUS_NODE_DISTANCE_M = 100
WALK_METERS_PER_MIN = 80  # ~3 mph
CAMPUS_BOUNDS = {"north": 35.2175, "south": 35.1765, "east": -97.4255, "west": -97.4615}


def is_within_campus(location):
    return (
        CAMPUS_BOUNDS["south"] <= location["lat"] <= CAMPUS_BOUNDS["north"]
        and CAMPUS_BOUNDS["west"] <= location["lng"] <= CAMPUS_BOUNDS["east"]
    )


def distance_meters(a, b):
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


def estimate_walk_seconds(meters):
    return meters / WALK_METERS_PER_MIN * 60


def format_duration(seconds):
    mins = max(1, math.floor(seconds / 60 + 0.5))  # round half up, like JS Math.round
    if mins < 60:
        return f"{mins} min"
    return f"{mins // 60} h {mins % 60} min"


def get_campus_node_proximity(location, nodes, max_distance_meters=MAX_CAMPUS_NODE_DISTANCE_M):
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


class TestCampusProximity(unittest.TestCase):
    """Campus location, nearest-node distance, and walking time."""

    gaylord = {"name": "Gaylord Hall", "lat": 35.2045, "lng": -97.4449}
    bizzell = {"name": "Bizzell Memorial Library", "lat": 35.208, "lng": -97.4459}
    location = {"lat": 35.205, "lng": -97.4449}

    def test_within_100_meters_of_nearest_node_estimates_walking_time(self):
        """A user within 100 m of the nearest node is on campus, with a walking estimate."""
        # Put the farther node first to verify that the closest node is selected.
        result = get_campus_node_proximity(self.location, [self.bizzell, self.gaylord])

        self.assertEqual(MAX_CAMPUS_NODE_DISTANCE_M, 100)
        self.assertIs(result["nearestNode"], self.gaylord)
        self.assertTrue(result["isOnCampus"])
        # A latitude difference of 0.0005 degrees is about 55.6 meters.
        self.assertAlmostEqual(result["distanceMeters"], 55.6, places=1)
        self.assertLessEqual(result["distanceMeters"], 100)
        seconds = estimate_walk_seconds(result["distanceMeters"])
        # The estimator uses an 80 meters/minute walking pace.
        self.assertAlmostEqual(seconds, 41.7, places=1)
        self.assertEqual(format_duration(seconds), "1 min")

    def test_inside_campus_but_over_100_meters_from_nearest_node(self):
        """A user on campus but more than 100 m from any node is rejected."""
        result = get_campus_node_proximity({"lat": 35.206, "lng": -97.4449}, [self.gaylord])
        self.assertIs(result["nearestNode"], self.gaylord)
        self.assertGreater(result["distanceMeters"], 100)
        self.assertFalse(result["isOnCampus"])

    def test_outside_campus_even_when_node_is_nearby(self):
        """A user outside the campus bounds is rejected even at distance 0 from a node."""
        outside = {"lat": 35.22, "lng": -97.4449}
        result = get_campus_node_proximity(outside, [{"name": "Outside node", **outside}])
        self.assertEqual(result["distanceMeters"], 0)
        self.assertFalse(result["isOnCampus"])

    def test_distance_limit_boundary(self):
        """The distance limit itself is included; just beyond it is rejected."""
        distance = get_campus_node_proximity(self.location, [self.gaylord])["distanceMeters"]
        at_limit = get_campus_node_proximity(self.location, [self.gaylord], distance)
        past_limit = get_campus_node_proximity(self.location, [self.gaylord], distance - 0.01)
        self.assertTrue(at_limit["isOnCampus"])
        self.assertFalse(past_limit["isOnCampus"])

    def test_no_map_nodes_available(self):
        """With no map nodes there is nothing to be near, so the user is not on campus."""
        self.assertEqual(
            get_campus_node_proximity(self.location, []),
            {"nearestNode": None, "distanceMeters": None, "isOnCampus": False},
        )

    def test_format_duration_over_an_hour(self):
        """Durations of an hour or more are shown as hours and minutes."""
        self.assertEqual(format_duration(3900), "1 h 5 min")


if __name__ == "__main__":
    unittest.main()
