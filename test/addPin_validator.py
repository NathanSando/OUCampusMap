"""Validation rules for dropping and deleting maintenance pins on the campus map."""

MAP_MIN = 0
MAP_MAX = 100  # the map is a 0-100 grid on both the X and Y axes

# (x, y) -> pin id. Stands in for the pin store until pins are persisted in the database.
_pins: dict[tuple[float, float], int] = {}
_next_id = 1


def _is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _in_bounds(value) -> bool:
    return _is_number(value) and MAP_MIN <= value <= MAP_MAX


def validate_addPin(x, y, complaint) -> bool:
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


def validate_deletePin(pin_id) -> bool:
    """True (and the pin is removed) when pin_id is a valid ID of an existing pin."""
    if not isinstance(pin_id, int) or isinstance(pin_id, bool) or pin_id < 1:
        return False
    for location, existing_id in _pins.items():
        if existing_id == pin_id:
            del _pins[location]
            return True
    return False
