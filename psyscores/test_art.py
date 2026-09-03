"""Unit tests for Psychedelic Album Art Mosaic assets and color mathematics.
"""

import json
import unittest
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).parent
ART_DIR = BASE_DIR / 'art'
COVERS_JSON = ART_DIR / 'covers_data.json'
ATLAS_WEBP = ART_DIR / 'atlas.webp'
ATLAS_JPG = ART_DIR / 'atlas.jpg'
SAMPLES_DIR = ART_DIR / 'samples'


class TestMosaicAssets(unittest.TestCase):
    """Test verification suite for mosaic metadata, atlases, and color conversions."""

    def test_covers_metadata_structure(self):
        """Verify covers_data.json has 841 albums and all required schema fields."""
        self.assertTrue(COVERS_JSON.exists(), f"Missing {COVERS_JSON}")
        with open(COVERS_JSON, 'r', encoding='utf-8') as f:
            covers = json.load(f)

        self.assertEqual(len(covers), 841, "Must contain exactly 841 unique album covers")

        ids_seen = set()
        for c in covers:
            self.assertIn('id', c)
            self.assertIn('album', c)
            self.assertIn('artist', c)
            self.assertIn('avg_lab', c)
            self.assertIn('quad_lab', c)
            self.assertIn('rating', c)

            # Validate ID range
            cid = c['id']
            self.assertTrue(0 <= cid < 841)
            ids_seen.add(cid)

            # Validate LAB ranges
            l_val, a_val, b_val = c['avg_lab']
            self.assertTrue(0 <= l_val <= 100, f"L out of range: {l_val}")
            self.assertTrue(-128 <= a_val <= 128, f"a out of range: {a_val}")
            self.assertTrue(-128 <= b_val <= 128, f"b out of range: {b_val}")

            # Validate 4 quadrants
            self.assertEqual(len(c['quad_lab']), 4)

        self.assertEqual(len(ids_seen), 841, "All 841 IDs must be unique and continuous")

    def test_atlas_images(self):
        """Verify sprite atlases exist, have valid dimensions (1740x1740), and are non-empty."""
        self.assertTrue(ATLAS_WEBP.exists())
        self.assertTrue(ATLAS_JPG.exists())

        with Image.open(ATLAS_WEBP) as im:
            self.assertEqual(im.size, (1740, 1740))

        with Image.open(ATLAS_JPG) as im:
            self.assertEqual(im.size, (1740, 1740))

    def test_sample_images(self):
        """Verify all curated sample images exist and have non-zero dimensions."""
        expected_samples = [
            'cover_32_buzzmonx.jpg',
            'cover_44_dimo.jpg',
            'cover_124_magnetrixx.jpg',
            'cover_148_ololiuqui.jpg',
            'cover_361_sun_project.jpg'
        ]
        for name in expected_samples:
            p = SAMPLES_DIR / name
            self.assertTrue(p.exists(), f"Missing sample {name}")
            with Image.open(p) as im:
                self.assertGreater(im.width, 100)
                self.assertGreater(im.height, 100)


if __name__ == '__main__':
    unittest.main()
