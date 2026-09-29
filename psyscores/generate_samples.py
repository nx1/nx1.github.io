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

BASE_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = BASE_DIR / 'art' / 'samples'
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
COVER_ART_DIR = BASE_DIR / 'cover_art'
COVERS_JSON = BASE_DIR / 'art' / 'covers_data.json'
SONGS_JSON = BASE_DIR / 'ss_songs.json'

# Curated albums defined by artist and album title to remain invariant under collection re-indexing
CURATED_ALBUMS = [
    {
        'key': 'buzzmonx',
        'artist': 'Buzzmonx',
        'album': "Toms'n Jerry",
        'fallback_id': 34,
        'legacy_id': 32,
        'filename': 'cover_32_buzzmonx.jpg',
        'stable_filename': 'cover_buzzmonx.jpg',
    },
    {
        'key': 'dimo',
        'artist': 'D.I.M.O.',
        'album': 'DIMO',
        'fallback_id': 46,
        'legacy_id': 44,
        'filename': 'cover_44_dimo.jpg',
        'stable_filename': 'cover_dimo.jpg',
    },
    {
        'key': 'magnetrixx',
        'artist': 'Magnetrixx',
        'album': 'Wired',
        'fallback_id': 129,
        'legacy_id': 124,
        'filename': 'cover_124_magnetrixx.jpg',
        'stable_filename': 'cover_magnetrixx.jpg',
    },
    {
        'key': 'ololiuqui',
        'artist': 'Ololiuqui',
        'album': 'Reverse Engineering',
        'fallback_id': 154,
        'legacy_id': 148,
        'filename': 'cover_148_ololiuqui.jpg',
        'stable_filename': 'cover_ololiuqui.jpg',
    },
    {
        'key': 'sun_project',
        'artist': 'S.U.N. Project',
        'album': 'Guitars on Mushroom Vol. 1',
        'fallback_id': 372,
        'legacy_id': 361,
        'filename': 'cover_361_sun_project.jpg',
        'stable_filename': 'cover_sun_project.jpg',
    }
]


def resolve_album_id(target, covers_list, tracks_list):
    """Find current cover ID for an album using artist and album title matching."""
    t_artist = target['artist'].strip().lower()
    t_album = target['album'].strip().lower()

    for c in covers_list:
        c_artist = (c.get('artist') or '').strip().lower()
        c_album = (c.get('album') or '').strip().lower()
        if t_artist in c_artist and t_album in c_album:
            return c['id']

    for t in tracks_list:
        artist = (t.get('artist') or t.get('album_artist') or '').strip().lower()
        album = (t.get('album') or '').strip().lower()
        if t_artist in artist and t_album in album:
            p = t.get('image_path')
            if p:
                try:
                    return int(Path(p).stem)
                except ValueError:
                    pass

    return target.get('fallback_id')



def main():
    """Process and export the 5 curated sample album covers."""
    print("Processing 5 curated album covers...")

    covers_list = []
    if COVERS_JSON.exists():
        try:
            with open(COVERS_JSON, 'r', encoding='utf-8') as f:
                covers_list = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load {COVERS_JSON}: {e}")

    tracks_list = []
    if SONGS_JSON.exists():
        try:
            with open(SONGS_JSON, 'r', encoding='utf-8') as f:
                tracks_list = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load {SONGS_JSON}: {e}")

    samples_b64 = {}
    featured_albums = []

    for item in CURATED_ALBUMS:
        img_id = resolve_album_id(item, covers_list, tracks_list)
        if img_id is None:
            raise ValueError(f"Could not resolve cover ID for {item['artist']} - {item['album']}")

        src_path = COVER_ART_DIR / f"{img_id}.jpg"
        if not src_path.exists():
            raise FileNotFoundError(f"Missing source cover art: {src_path} (for {item['artist']} - {item['album']})")

        dst_path = SAMPLES_DIR / item['filename']
        stable_dst_path = SAMPLES_DIR / item['stable_filename']

        with Image.open(src_path) as im:
            # Upscale cleanly to 600x600 for sampling fidelity
            im_large = im.resize((600, 600), Image.Resampling.LANCZOS)
            im_large.save(dst_path, 'JPEG', quality=92)
            im_large.save(stable_dst_path, 'JPEG', quality=92)

            # Generate Base64 data URI
            buf = io.BytesIO()
            im_large.save(buf, format='JPEG', quality=88)
            b64_str = base64.b64encode(buf.getvalue()).decode('ascii')
            data_uri = f"data:image/jpeg;base64,{b64_str}"

            # Register under multiple lookup keys for guaranteed resolution
            samples_b64[item['key']] = data_uri
            samples_b64[str(img_id)] = data_uri
            if 'legacy_id' in item:
                samples_b64[str(item['legacy_id'])] = data_uri
            samples_b64[item['filename']] = data_uri
            samples_b64[item['stable_filename']] = data_uri

        # Collect metadata for client-side dynamic rendering
        meta = next((c for c in covers_list if c['id'] == img_id), {})
        artist = meta.get('artist') or item['artist']
        album = meta.get('album') or item['album']
        year = meta.get('year')
        featured_albums.append({
            'id': img_id,
            'key': item['key'],
            'artist': artist,
            'album': album,
            'year': year,
            'rating': meta.get('rating', 5),
            'filename': item['stable_filename'],
            'src': f"samples/{item['stable_filename']}",
            'title': f"{artist} - {album}{f' ({year})' if year else ''}"
        })

        print(f"Exported #{img_id}: {artist} - {album} -> {dst_path.name}, {stable_dst_path.name}")

    # Write samples_data.js with both structured metadata and base64 URI dictionary
    samples_js_path = SAMPLES_DIR.parent / 'samples_data.js'
    print(f"Writing {samples_js_path}...")
    with open(samples_js_path, 'w', encoding='utf-8') as f:
        f.write(f"window.FEATURED_ALBUMS = {json.dumps(featured_albums, indent=2)};\n")
        f.write(f"window.SAMPLES_DATA = {json.dumps(samples_b64)};\n")

    print(f"samples_data.js size: {samples_js_path.stat().st_size / 1024:.1f} KB")
    print(f"All {len(featured_albums)} curated sample albums ready!")


if __name__ == '__main__':
    main()
