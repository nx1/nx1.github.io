"""Build assets for Psychedelic Album Art Mosaic Generator.

Computes color metrics (CIELAB & RGB for global average and 4 quadrants),
compiles album metadata, generates the 29x29 sprite atlas (WebP and JPEG),
and sets up curated psychedelic sample images.
"""

import json
import os
from pathlib import Path
from PIL import Image
import numpy as np

import math

BASE_DIR = Path(__file__).resolve().parent
ART_DIR = BASE_DIR / 'art'
COVER_ART_DIR = BASE_DIR / 'cover_art'
SONGS_JSON = BASE_DIR / 'ss_songs.json'

TILE_SIZE = 60  # 60x60 px per thumbnail in atlas



def srgb_to_linear(c):
    """Convert sRGB 0..255 channel to linear float."""
    val = c / 255.0
    return val / 12.92 if val <= 0.04045 else ((val + 0.055) / 1.055) ** 2.4


def rgb_to_lab(r, g, b):
    """Convert RGB (0..255) to CIE L*a*b* using standard D65 illuminant."""
    r_lin = srgb_to_linear(r)
    g_lin = srgb_to_linear(g)
    b_lin = srgb_to_linear(b)

    x_val = r_lin * 0.4124564 + g_lin * 0.3575761 + b_lin * 0.1804375
    y_val = r_lin * 0.2126729 + g_lin * 0.7151522 + b_lin * 0.0721750
    z_val = r_lin * 0.0193339 + g_lin * 0.1191920 + b_lin * 0.9503041

    xn, yn, zn = 0.95047, 1.00000, 1.08883
    x_n = x_val / xn
    y_n = y_val / yn
    z_n = z_val / zn

    def f(t):
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t + 16.0 / 116.0)

    fx = f(x_n)
    fy = f(y_n)
    fz = f(z_n)

    l_val = 116.0 * fy - 16.0
    a_val = 500.0 * (fx - fy)
    b_val = 200.0 * (fy - fz)
    return round(l_val, 2), round(a_val, 2), round(b_val, 2)


def main():
    print("Loading track metadata...")
    with open(SONGS_JSON, 'r', encoding='utf-8') as f:
        tracks = json.load(f)

    # Map each cover image ID to metadata
    album_metadata = {}
    for t in tracks:
        path = t.get('image_path')
        if not path:
            continue
        try:
            filename = os.path.basename(path)
            img_id = int(os.path.splitext(filename)[0])
        except ValueError:
            continue

        if img_id not in album_metadata:
            album_metadata[img_id] = {
                'id': img_id,
                'album': t.get('album', 'Unknown Album'),
                'artist': t.get('artist') or t.get('album_artist', 'Unknown Artist'),
                'year': t.get('date'),
                'label': t.get('label', ''),
                'catalog': t.get('catalog', ''),
                'rating': t.get('rating', 0),
                'tracks_count': 1
            }
        else:
            album_metadata[img_id]['tracks_count'] += 1
            if t.get('rating', 0) > album_metadata[img_id]['rating']:
                album_metadata[img_id]['rating'] = t.get('rating', 0)

    # Discover all available cover images
    cover_files = sorted([int(f.stem) for f in COVER_ART_DIR.glob('*.jpg') if f.stem.isdigit()])
    if not cover_files:
        print(f"No cover art found in {COVER_ART_DIR}")
        return

    max_id = max(cover_files)
    total_covers = max(len(cover_files), max_id + 1)
    grid_dim = math.ceil(math.sqrt(total_covers))
    atlas_size = grid_dim * TILE_SIZE

    print(f"Total unique albums indexed: {len(album_metadata)}")
    print(f"Total cover images found: {len(cover_files)} (max ID: {max_id})")
    print(f"Atlas grid dimension: {grid_dim}x{grid_dim} tiles ({atlas_size}x{atlas_size} px)")

    # Prepare atlas image
    atlas = Image.new('RGB', (atlas_size, atlas_size))

    covers_data = []

    print(f"Processing {total_covers} cover art images and building sprite atlas...")
    for img_id in range(total_covers):
        im_path = COVER_ART_DIR / f"{img_id}.jpg"
        if not im_path.exists():
            continue

        meta = album_metadata.get(img_id, {
            'id': img_id,
            'album': f'Album #{img_id}',
            'artist': 'Various Artists',
            'year': None,
            'label': '',
            'catalog': '',
            'rating': 3,
            'tracks_count': 1
        })

        with Image.open(im_path) as im:
            im_rgb = im.convert('RGB')
            arr = np.array(im_rgb)

            # Global average RGB and CIELAB
            avg_r, avg_g, avg_b = arr.mean(axis=(0, 1))
            avg_lab = rgb_to_lab(avg_r, avg_g, avg_b)

            # Quadrants: TL, TR, BL, BR
            h, w, _ = arr.shape
            mid_y, mid_x = h // 2, w // 2
            tl = arr[:mid_y, :mid_x].mean(axis=(0, 1))
            tr = arr[:mid_y, mid_x:].mean(axis=(0, 1))
            bl = arr[mid_y:, :mid_x].mean(axis=(0, 1))
            br = arr[mid_y:, mid_x:].mean(axis=(0, 1))

            quad_rgb = [
                [int(round(c)) for c in tl],
                [int(round(c)) for c in tr],
                [int(round(c)) for c in bl],
                [int(round(c)) for c in br]
            ]
            quad_lab = [
                list(rgb_to_lab(*tl)),
                list(rgb_to_lab(*tr)),
                list(rgb_to_lab(*bl)),
                list(rgb_to_lab(*br))
            ]

            # Paste into atlas
            thumb = im_rgb.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS)
            row = img_id // grid_dim
            col = img_id % grid_dim
            atlas.paste(thumb, (col * TILE_SIZE, row * TILE_SIZE))

            covers_data.append({
                'id': img_id,
                'album': meta['album'],
                'artist': meta['artist'],
                'year': meta['year'],
                'label': meta['label'],
                'catalog': meta['catalog'],
                'rating': meta['rating'],
                'tracks_count': meta['tracks_count'],
                'avg_rgb': [int(round(avg_r)), int(round(avg_g)), int(round(avg_b))],
                'avg_lab': list(avg_lab),
                'quad_rgb': quad_rgb,
                'quad_lab': quad_lab
            })

    # Save covers_data.json and covers_data.js (for offline/file:// support)
    output_json = ART_DIR / 'covers_data.json'
    output_js = ART_DIR / 'covers_data.js'
    print(f"Writing {output_json} and {output_js}...")
    json_str = json.dumps(covers_data, separators=(',', ':'))
    with open(output_json, 'w', encoding='utf-8') as f:
        f.write(json_str)
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(f"window.ATLAS_GRID_DIM = {grid_dim};\n")
        f.write(f"window.COVERS_COUNT = {len(covers_data)};\n")
        f.write(f"window.COVERS_DATA = {json_str};\n")

    print(f"covers_data.json size: {output_json.stat().st_size / 1024:.1f} KB")

    # Save atlas
    webp_path = ART_DIR / 'atlas.webp'
    jpg_path = ART_DIR / 'atlas.jpg'

    print(f"Saving atlas WebP to {webp_path}...")
    atlas.save(webp_path, 'WEBP', quality=82, method=6)
    print(f"WebP atlas size: {webp_path.stat().st_size / 1024:.1f} KB")

    # Save Base64 atlas for 100% offline file:// compatibility
    import base64
    with open(webp_path, 'rb') as f:
        atlas_b64 = base64.b64encode(f.read()).decode('ascii')
    atlas_js_path = ART_DIR / 'atlas_data.js'
    with open(atlas_js_path, 'w', encoding='utf-8') as f:
        f.write(f'window.ATLAS_GRID_DIM = {grid_dim};\n')
        f.write(f'window.ATLAS_DATA_URI = "data:image/webp;base64,{atlas_b64}";\n')
    print(f"atlas_data.js size: {atlas_js_path.stat().st_size / 1024:.1f} KB")

    print(f"Saving atlas JPEG to {jpg_path}...")
    atlas.save(jpg_path, 'JPEG', quality=82, optimize=True)
    print(f"JPEG atlas size: {jpg_path.stat().st_size / 1024:.1f} KB")

    # Synchronize curated sample images if available
    try:
        import generate_samples
        print("Synchronizing curated sample images...")
        generate_samples.main()
    except Exception as e:
        print(f"Curated sample synchronization skipped: {e}")

    print(f"Atlas and metadata generation complete ({len(covers_data)} covers, {grid_dim}x{grid_dim} grid)!")


if __name__ == '__main__':
    main()
