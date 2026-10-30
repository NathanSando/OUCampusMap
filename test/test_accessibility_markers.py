import unittest

# ---------- Marker definitions under test (self-contained) ----------
# Copied from packages/shared-types/src/enums.ts and apps/mobile/src/constants/categories.ts.
ACCESSIBILITY_FEATURE_TYPES = [
    "accessible_entrance",
    "ramp",
    "elevator",
    "accessible_restroom",
    "automatic_door",
    "braille_signage",
]

ACCESSIBILITY_FEATURE_META = {
    "accessible_entrance": {"label": "Accessible entrance", "icon": "door-open"},
    "ramp": {"label": "Ramp", "icon": "slope-uphill"},
    "elevator": {"label": "Elevator", "icon": "elevator-passenger-outline"},
    "accessible_restroom": {"label": "Accessible restroom", "icon": "human-wheelchair"},
    "automatic_door": {"label": "Automatic door", "icon": "door-sliding"},
    "braille_signage": {"label": "Braille signage", "icon": "braille"},
}

LAYER_META = {
    "buildings": {"label": "Buildings", "color": "#8FA3B0", "icon": "office-building-outline"},
    "dining": {"label": "Dining", "color": "#FF9F5A", "icon": "silverware-fork-knife"},
    "printers": {"label": "Printers", "color": "#5AA9E6", "icon": "printer-outline"},
    "accessibility": {"label": "Accessibility", "color": "#4ECB71", "icon": "wheelchair-accessibility"},
    "reports": {"label": "Reports", "color": "#D6293C", "icon": "alert-outline"},
}


class TestAccessibilityMarkers(unittest.TestCase):

    # ---------- Correct ----------
    def test_every_feature_type_has_label_and_icon(self):
        """Every accessibility feature type has a non-empty label and icon."""
        self.assertTrue(ACCESSIBILITY_FEATURE_TYPES)
        for feature_type in ACCESSIBILITY_FEATURE_TYPES:
            self.assertIn(feature_type, ACCESSIBILITY_FEATURE_META)
            self.assertTrue(ACCESSIBILITY_FEATURE_META[feature_type]["label"].strip())
            self.assertTrue(ACCESSIBILITY_FEATURE_META[feature_type]["icon"].strip())

    def test_expected_labels_and_icons(self):
        """Key features use the expected label and icon."""
        self.assertEqual(
            ACCESSIBILITY_FEATURE_META["accessible_entrance"],
            {"label": "Accessible entrance", "icon": "door-open"},
        )
        self.assertEqual(ACCESSIBILITY_FEATURE_META["elevator"]["label"], "Elevator")
        self.assertEqual(ACCESSIBILITY_FEATURE_META["ramp"]["label"], "Ramp")

    def test_accessibility_layer_is_registered(self):
        """Accessibility is a map layer with its own label, icon and hex color."""
        layer = LAYER_META["accessibility"]
        self.assertEqual(layer["label"], "Accessibility")
        self.assertEqual(layer["icon"], "wheelchair-accessibility")
        self.assertRegex(layer["color"], r"^#[0-9A-Fa-f]{6}$")

    # ---------- Incorrect ----------
    def test_no_markers_for_unknown_feature_types(self):
        """Marker metadata exists only for real feature types."""
        self.assertEqual(sorted(ACCESSIBILITY_FEATURE_META), sorted(ACCESSIBILITY_FEATURE_TYPES))

    # ---------- Edge Case ----------
    def test_markers_are_distinguishable(self):
        """Each feature type has a unique label and icon, so markers can be told apart."""
        labels = [m["label"] for m in ACCESSIBILITY_FEATURE_META.values()]
        icons = [m["icon"] for m in ACCESSIBILITY_FEATURE_META.values()]
        self.assertEqual(len(set(labels)), len(labels))
        self.assertEqual(len(set(icons)), len(icons))

    def test_accessibility_layer_color_is_unique(self):
        """No other map layer shares the accessibility layer's color."""
        others = [v["color"] for k, v in LAYER_META.items() if k != "accessibility"]
        self.assertNotIn(LAYER_META["accessibility"]["color"], others)


if __name__ == "__main__":
    unittest.main()
