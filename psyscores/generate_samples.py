"""Generate psychedelic sample images for mosaic demonstration.

Extracts the 5 curated album covers from the collection (IDs: 32, 44, 124, 148, 361),
upscales them cleanly for mosaic generation, and compiles in-memory Base64 data
streams into samples_data.js.
"""

import base64
import io
import json
import os
from pathlib import Path
from PIL import Image

BASE_DIR = Path('/home/x1/nx1.github.io/psyscores')
SAMPLES_DIR = BASE_DIR / 'art' / 'samples'
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
COVER_ART_DIR = BASE_DIR / 'cover_art'

# Curated albums: 32, 44, 124, 148, 361
CURATED_ALBUMS = [
    {
        'id': 32,
        'filename': 'cover_32_buzzmonx.jpg',
        'artist': 'Buzzmonx',
        'album': "Toms'n Jerry",
        'year': 2004,
        'label': 'Plusquam Records',
        'rating': 5
    },
    {
        'id': 44,
        'filename': 'cover_44_dimo.jpg',
        'artist': 'D.I.M.O.',
        'album': 'DIMO',
        'year': 2000,
        'label': 'BTM - Bochumer Ton Manufaktur',
        'rating': 4
    },
    {
        'id': 124,
        'filename': 'cover_124_magnetrixx.jpg',
        'artist': 'Magnetrixx',
        'album': 'Wired',
        'year': 2005,
        'label': 'AP Records',
        'rating': 4
    },
    {
        'id': 148,
        'filename': 'cover_148_ololiuqui.jpg',
        'artist': 'Ololiuqui',
        'album': 'Reverse Engineering',
        'year': 2002,
        'label': 'Spirit Zone Recordings',
        'rating': 5
    },
    {
        'id': 361,
        'filename': 'cover_361_sun_project.jpg',
        'artist': 'S.U.N. Project',
        'album': 'Guitars on Mushroom Vol. 1',
        'year': 2000,
        'label': 'Psysolation',
        'rating': 5
    }
]


def main():
    """Process and export the 5 curated sample album covers."""
    print("Processing 5 curated album covers...")
    samples_b64 = {}

    for item in CURATED_ALBUMS:
        img_id = item['id']
        src_path = COVER_ART_DIR / f"{img_id}.jpg"
        dst_path = SAMPLES_DIR / item['filename']

        if not src_path.exists():
            raise FileNotFoundError(f"Missing source cover art: {src_path}")

        with Image.open(src_path) as im:
            # Upscale cleanly to 600x600 for sampling fidelity
            im_large = im.resize((600, 600), Image.Resampling.LANCZOS)
            im_large.save(dst_path, 'JPEG', quality=92)

            # Generate Base64 data URI
            buf = io.BytesIO()
            im_large.save(buf, format='JPEG', quality=88)
            b64_str = base64.b64encode(buf.getvalue()).decode('ascii')
            samples_b64[str(img_id)] = f"data:image/jpeg;base64,{b64_str}"

        print(f"Exported #{img_id}: {item['artist']} - {item['album']} -> {dst_path}")

    # Write samples_data.js
    samples_js_path = SAMPLES_DIR.parent / 'samples_data.js'
    print(f"Writing {samples_js_path}...")
    with open(samples_js_path, 'w', encoding='utf-8') as f:
        f.write(f"window.SAMPLES_DATA = {json.dumps(samples_b64)};\n")

    print(f"samples_data.js size: {samples_js_path.stat().st_size / 1024:.1f} KB")
    print("All curated sample albums ready!")


if __name__ == '__main__':
    main()
