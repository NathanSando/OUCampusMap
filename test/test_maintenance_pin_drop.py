import unittest

# ---------- Pin validation rules under test (self-contained) ----------
MAP_MIN = 0
MAP_MAX = 100  # the map is a 0-100 grid on both the X and Y axes

_pins = {}  # (x, y) -> pin id; stands in for the pin store
_next_id = 1


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _in_bounds(value):
    return _is_number(value) and MAP_MIN <= value <= MAP_MAX


def validate_addPin(x, y, complaint):
    """True (and the pin is recorded) when the coordinates are on the map, the complaint is
    non-empty, and no pin already exists at that location."""
    global _next_id
    if not (_in_bounds(x) and _in_bounds(y)):
        return False
    if not isinstance(complaint, str) or not complaint.strip():
        return False
    if (x, y) in _pins:
        return False
    _pins[(x, y)] = _next_id
    _next_id += 1
    return True


def validate_deletePin(pin_id):
    """True (and the pin is removed) when pin_id is a valid ID of an existing pin."""
    if not isinstance(pin_id, int) or isinstance(pin_id, bool) or pin_id < 1:
        return False
    for location, existing_id in _pins.items():
        if existing_id == pin_id:
            del _pins[location]
            return True
    return False


class TestMaintenancePinDrop(unittest.TestCase):

    # ---------- Unit 1: Correct ----------
    def test_valid_pin_creation(self):
        """Valid X/Y coordinates and a valid complaint should create a pin."""
        result = validate_addPin(10, 20, "Pothole in road")
        self.assertTrue(result)

    # ---------- Unit 1: Incorrect ----------
    def test_invalid_coordinates(self):
        """Invalid coordinates should fail validation."""
        result = validate_addPin(-1, 5000, "Broken sign")
        self.assertFalse(result)

    def test_missing_complaint(self):
        """Missing complaint should fail validation."""
        result = validate_addPin(15, 30, "")
        self.assertFalse(result)

    def test_invalid_pin_id_delete(self):
        """Deleting a pin with an invalid ID should fail."""
        result = validate_deletePin(None)
        self.assertFalse(result)

    # ---------- Boundary ----------
    def test_boundary_coordinates(self):
        """Coordinates at the edge of the allowed map area should be valid."""
        # Assuming map boundaries: X: 0–100, Y: 0–100
        result = validate_addPin(0, 100, "Graffiti on wall")
        self.assertTrue(result)

    # ---------- Edge Case ----------
    def test_pin_already_exists(self):
        """Adding a pin at a location where one already exists should fail."""
        # Simulate existing pin
        validate_addPin(50, 50, "Trash overflow")
        result = validate_addPin(50, 50, "Another complaint")
        self.assertFalse(result)

    def test_delete_nonexistent_pin(self):
        """Deleting a pin that does not exist should fail."""
        result = validate_deletePin(9999)  # ID not in system
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
