import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ENUMS = REPO / "packages" / "shared-types" / "src" / "enums.ts"
CATEGORIES = REPO / "apps" / "mobile" / "src" / "constants" / "categories.ts"


class TestAccessibilityMarkers(unittest.TestCase):
    """Checks the real marker definitions in the mobile app's TypeScript source."""

    @classmethod
    def setUpClass(cls):
        if not (ENUMS.exists() and CATEGORIES.exists()):
            raise unittest.SkipTest("Mobile app source not found; run from the OUCampusMap repo.")

        enums = ENUMS.read_text(encoding="utf-8")
        block = re.search(r"ACCESSIBILITY_FEATURE_TYPES = \[(.*?)\] as const", enums, re.S).group(1)
        cls.feature_types = re.findall(r"'([^']+)'", block)

        categories = CATEGORIES.read_text(encoding="utf-8")
        meta = re.search(r"ACCESSIBILITY_FEATURE_META:.*?= \{(.*?)\n\};", categories, re.S).group(1)
        cls.meta = {
            key: {"label": label, "icon": icon}
            for key, label, icon in re.findall(
                r"(\w+): \{ label: '([^']*)', icon: '([^']*)' \}", meta
            )
        }
        layers = re.search(r"LAYER_META:.*?= \{(.*?)\n\};", categories, re.S).group(1)
        cls.layers = {
            key: {"label": label, "color": color, "icon": icon}
            for key, label, color, icon in re.findall(
                r"(\w+): \{ label: '([^']*)', color: '([^']*)', icon: '([^']*)' \}", layers
            )
        }

    # ---------- Correct ----------
    def test_every_feature_type_has_label_and_icon(self):
        """Every accessibility feature type has a non-empty label and icon."""
        self.assertTrue(self.feature_types)
        for feature_type in self.feature_types:
            self.assertIn(feature_type, self.meta)
            self.assertTrue(self.meta[feature_type]["label"].strip())
            self.assertTrue(self.meta[feature_type]["icon"].strip())

    def test_expected_labels_and_icons(self):
        """Key features use the expected label and icon."""
        self.assertEqual(
            self.meta["accessible_entrance"], {"label": "Accessible entrance", "icon": "door-open"}
        )
        self.assertEqual(self.meta["elevator"]["label"], "Elevator")
        self.assertEqual(self.meta["ramp"]["label"], "Ramp")

    def test_accessibility_layer_is_registered(self):
        """Accessibility is a map layer with its own label, icon and hex color."""
        layer = self.layers["accessibility"]
        self.assertEqual(layer["label"], "Accessibility")
        self.assertEqual(layer["icon"], "wheelchair-accessibility")
        self.assertRegex(layer["color"], r"^#[0-9A-Fa-f]{6}$")

    # ---------- Incorrect ----------
    def test_no_markers_for_unknown_feature_types(self):
        """Marker metadata exists only for real feature types."""
        self.assertEqual(sorted(self.meta), sorted(self.feature_types))

    # ---------- Edge Case ----------
    def test_markers_are_distinguishable(self):
        """Each feature type has a unique label and icon, so markers can be told apart."""
        labels = [m["label"] for m in self.meta.values()]
        icons = [m["icon"] for m in self.meta.values()]
        self.assertEqual(len(set(labels)), len(labels))
        self.assertEqual(len(set(icons)), len(icons))

    def test_accessibility_layer_color_is_unique(self):
        """No other map layer shares the accessibility layer's color."""
        others = [v["color"] for k, v in self.layers.items() if k != "accessibility"]
        self.assertNotIn(self.layers["accessibility"]["color"], others)


if __name__ == "__main__":
    unittest.main()
