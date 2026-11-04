"""
Unit tests for the locationTracker feature (Campus Map).

Run from the repository root:
    pip install pytest
    pytest test/test_location_tracker.py -v

ASSUMED INTERFACE -- adjust the import and method names below to match
the real locationTracker code if they differ:

    from locationTracker import LocationTracker

    tracker = LocationTracker()
    tracker.get_current_location()      -> (lat, lon) tuple, or None if not set
    tracker.update_location(lat, lon)   -> stores the new location;
                                           raises ValueError for invalid input
"""

import os
import sys

import pytest

# Make the repository root importable when running `pytest` from the root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from locationTracker import LocationTracker  # noqa: E402


# Sample coordinates near the University of Oklahoma campus
OU_LAT = 35.2059
OU_LON = -97.4457


@pytest.fixture
def tracker():
    """A fresh LocationTracker for each test."""
    return LocationTracker()


# ---------- Normal behavior ----------

def test_no_location_before_first_update(tracker):
    """A new tracker has no location until one is set."""
    assert tracker.get_current_location() is None


def test_update_location_stores_coordinates(tracker):
    """After an update, the tracker returns the same coordinates."""
    tracker.update_location(OU_LAT, OU_LON)
    assert tracker.get_current_location() == (OU_LAT, OU_LON)


def test_latest_update_replaces_previous(tracker):
    """The most recent update is the current location (user is moving)."""
    tracker.update_location(OU_LAT, OU_LON)
    tracker.update_location(35.2100, -97.4400)
    assert tracker.get_current_location() == (35.2100, -97.4400)


def test_accepts_integer_coordinates(tracker):
    """Whole-number coordinates are valid input."""
    tracker.update_location(35, -97)
    assert tracker.get_current_location() == (35, -97)


# ---------- Boundary values ----------

@pytest.mark.parametrize(
    "lat, lon",
    [
        (90, 180),     # max latitude / longitude
        (-90, -180),   # min latitude / longitude
        (0, 0),        # equator / prime meridian
    ],
)
def test_accepts_boundary_coordinates(tracker, lat, lon):
    """Coordinates exactly on the valid limits are accepted."""
    tracker.update_location(lat, lon)
    assert tracker.get_current_location() == (lat, lon)


# ---------- Invalid input ----------

@pytest.mark.parametrize(
    "lat, lon",
    [
        (90.0001, OU_LON),    # latitude too high
        (-90.0001, OU_LON),   # latitude too low
        (OU_LAT, 180.0001),   # longitude too high
        (OU_LAT, -180.0001),  # longitude too low
    ],
)
def test_rejects_out_of_range_coordinates(tracker, lat, lon):
    """Coordinates outside the valid range raise ValueError."""
    with pytest.raises(ValueError):
        tracker.update_location(lat, lon)


@pytest.mark.parametrize(
    "lat, lon",
    [
        (None, OU_LON),
        (OU_LAT, None),
        ("abc", OU_LON),
        (OU_LAT, "xyz"),
    ],
)
def test_rejects_missing_or_non_numeric_coordinates(tracker, lat, lon):
    """Missing (e.g., GPS permission denied) or non-numeric input raises ValueError."""
    with pytest.raises(ValueError):
        tracker.update_location(lat, lon)


def test_invalid_update_keeps_previous_location(tracker):
    """A bad reading does not erase the last good location."""
    tracker.update_location(OU_LAT, OU_LON)
    with pytest.raises(ValueError):
        tracker.update_location(999, 999)
    assert tracker.get_current_location() == (OU_LAT, OU_LON)
