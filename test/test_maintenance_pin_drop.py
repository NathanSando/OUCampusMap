import unittest
from addPin_validator import validate_addPin, validate_deletePin

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
