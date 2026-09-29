# Psychedelic Mosaic Lab: Architecture & Maintenance Guide

## 1. Architectural Overview & Hosting Constraints

The **Psychedelic Mosaic Lab** is an interactive, client-side photomosaic engine hosted statically on **GitHub Pages** (`https://nx1.info/psyscores/art/`).

### Critical Constraint: Static Server-less Execution
GitHub Pages is a static file web host. It provides **zero server-side runtime functionality**:
* No backend API (no Python, Node.js, PHP, or CGI execution on the server).
* No filesystem write access or dynamic image processing on request.
* No server-side database.

Consequently, **100% of the mosaic analysis, color matching, and image composition occurs inside the user's web browser** using HTML5 Canvas, typed arrays (`Float32Array`, `Int32Array`, `Int16Array`), and the client GPU.

To make client-side execution instantaneous (under 200 ms for thousands of tiles) without downloading thousands of individual image files over HTTP:
1. **Offline Pre-computation**: Image metrics (CIE $L^*a^*b^*$ color vectors for average and 4 sub-quadrants) and sprite sheets are pre-compiled offline at build time into bundled static assets.
2. **Offline `file://` and CORS Resilience**: Modern browsers enforce strict Cross-Origin Resource Sharing (CORS) rules that block `fetch()` or `canvas.getImageData()` when opening HTML files via `file:///`. To ensure zero-dependency offline execution, all data and the sprite atlas are compiled into both raw formats (`covers_data.json`, `atlas.webp`, `atlas.jpg`) and self-contained JavaScript payloads (`covers_data.js`, `atlas_data.js`, `samples_data.js`) using base64 Data URIs.

---

## 2. System Architecture & Pipeline

```
+---------------------------------------------------------------------------------+
|                       STAGE 1: COLLECTION INGESTION                             |
|  /mnt/d/Music/psych/                                                            |
|         │                                                                       |
|         ▼ (make psyscores / make_psyscores.py)                                  |
|  Extract FLAC / MP3 tags & embedded APIC cover art                              |
|         │                                                                       |
|         ├─► psyscores/cover_art/{0..N-1}.jpg  (200x200 px cover thumbnails)    |
|         ├─► psyscores/ss_songs.json            (track & album metadata)         |
|         ├─► psyscores/psyscores.csv            (collection tabular data)        |
|         └─► psyscores/v1.html                  (static collection report)       |
+---------------------------------------------------------------------------------+
                                      │
                                      ▼ (automatic build hook)
+---------------------------------------------------------------------------------+
|                       STAGE 2: ASSET PRE-COMPUTATION                            |
|  psyscores/build_art_assets.py                                                  |
|         │                                                                       |
|         ├─► Dynamic Dimensioning: grid_dim D = ceil(sqrt(N))                    |
|         ├─► Color Analysis: sRGB -> Linear RGB -> CIE L*a*b* (D65)              |
|         │     • Global average vector: [L, a, b]                                |
|         │     • 4 Quadrant vectors:    [TL, TR, BL, BR] (12 float metrics)      |
|         ├─► 2D Texture Atlas Pack: 60x60 px tiles into D x D sprite sheet       |
|         │                                                                       |
|         ├─► psyscores/art/atlas.webp & atlas.jpg      (compact binary atlases)  |
|         ├─► psyscores/art/atlas_data.js               (base64 Data URI bundle)  |
|         ├─► psyscores/art/covers_data.json & .js      (pre-computed color data) |
|         └─► psyscores/art/samples_data.js             (curated sample albums)   |
+---------------------------------------------------------------------------------+
                                      │
                                      ▼ (static web serving)
+---------------------------------------------------------------------------------+
|                       STAGE 3: CLIENT-SIDE MOSAIC ENGINE                        |
|  GitHub Pages / Browser (art/index.html & art/mosaic.js)                        |
|         │                                                                       |
|         ├─► 1. Target image loaded (drag-and-drop, file upload, or sample)      |
|         ├─► 2. Target divided into W x H grid (e.g. 50x50 = 2,500 cells)        |
|         ├─► 3. CIE L*a*b* computed per cell (average or 4 quadrants)            |
|         ├─► 4. Minimum Delta E matching against candidate albums with:          |
|         │     • Rating filter (All, >=4 stars, 5 stars only)                    |
|         │     • Diversity penalty (penalizes repeated nearby covers)            |
|         ├─► 5. GPU Canvas blits 60x60 tiles from atlas.webp                     |
|         ├─► 6. Color blend overlay applied (Normal, Soft-Light, Overlay, Color) |
|         └─► 7. Interactive inspection, zoom/pan stage, & Ultra-HD JPG export    |
+---------------------------------------------------------------------------------+
```

---

## 3. Mathematical & Algorithmic Foundations

### A. Color Metric Transformations
Human color perception is non-linear. Calculating Euclidean distance in standard sRGB space produces severe perceptual artifacts (e.g., disproportionately weighting green variations while crushing dark contrasts). The pipeline converts all color metrics into the **CIE $L^*a^*b^*$ (1976)** uniform color space:

1. **sRGB to Linear Float**:
   $$\text{linear}(C) = \begin{cases} \frac{C}{12.92}, & C \le 0.04045 \\ \left(\frac{C + 0.055}{1.055}\right)^{2.4}, & C > 0.04045 \end{cases} \quad \text{where } C = \frac{c}{255.0}$$

2. **Linear RGB to CIE 1931 XYZ (D65 Illuminant)**:
   $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix} 0.4124564 & 0.3575761 & 0.1804375 \\ 0.2126729 & 0.7151522 & 0.0721750 \\ 0.0193339 & 0.1191920 & 0.9503041 \end{bmatrix} \begin{bmatrix} R_{\text{lin}} \\ G_{\text{lin}} \\ B_{\text{lin}} \end{bmatrix}$$

3. **XYZ to CIE $L^*a^*b^*$**:
   Normalized with standard reference white $X_n = 0.95047, Y_n = 1.00000, Z_n = 1.08883$:
   $$f(t) = \begin{cases} t^{1/3}, & t > 0.008856 \\ 7.787 t + \frac{16}{116}, & t \le 0.008856 \end{cases}$$
   $$L^* = 116 f(Y/Y_n) - 16, \quad a^* = 500 [f(X/X_n) - f(Y/Y_n)], \quad b^* = 200 [f(Y/Y_n) - f(Z/Z_n)]$$

### B. Dynamic Atlas Packing Geometry
For $N$ unique album covers, the sprite atlas dimension $D$ (in tiles) is:
$$D = \lceil\sqrt{N}\rceil$$
Each cover thumbnail is rendered at $T = 60 \times 60$ pixels.
The overall texture dimensions are $(D \cdot T) \times (D \cdot T)$ pixels.
For album index $k \in [0, N-1]$:
$$\text{col} = k \pmod D, \quad \text{row} = \lfloor k / D \rfloor$$
$$\text{atlas coordinate: } (x, y) = (\text{col} \cdot T, \, \text{row} \cdot T)$$

### C. Matching Distance Metrics
1. **Average Matching**: Euclidean distance in 3D CIE $L^*a^*b^*$:
   $$\Delta E^2 = (L_t - L_c)^2 + (a_t - a_c)^2 + (b_t - b_c)^2$$
2. **Quadrant Matching**: Compares 4 spatial sub-regions (Top-Left, Top-Right, Bottom-Left, Bottom-Right) across a 12-dimensional vector to preserve internal tile gradients:
   $$\Delta E_{\text{quad}}^2 = \sum_{q=0}^{3} \left[ (L_{t,q} - L_{c,q})^2 + (a_{t,q} - a_{c,q})^2 + (b_{t,q} - b_{c,q})^2 \right]$$
3. **Diversity Penalty**: Prevents monotone images from being filled with a single album:
   $$\text{Cost} = \Delta E^2 + \lambda \cdot U(k)$$
   where $U(k)$ is the count of recent placements of album $k$ within the immediate vicinity, and $\lambda$ is the diversity weighting factor (`high` = 1.5, `medium` = 0.6, `none` = 0.0).

---

## 4. How to Update the Album Art & Collection

### Scenario 1: Standard Collection Update (Added New Music)
When you add new music to `/mnt/d/Music/psych`:

1. Open your terminal in the repository:
   ```bash
   cd /home/x1/nx1.github.io/psyscores
   ```
2. Run the build command:
   ```bash
   make psyscores
   ```
   *(Alternatively from the repository root: `make psyscores`)*

3. **What happens automatically**:
   - `make_psyscores.py` scans `/mnt/d/Music/psych` for all `.flac` and `.mp3` files.
   - Extracts album art into `/home/x1/nx1.github.io/psyscores/cover_art/{id}.jpg`.
   - Generates `/home/x1/nx1.github.io/psyscores/ss_songs.json`, `psyscores.csv`, and `v1.html`.
   - **Automatically triggers `build_art_assets.py`** at completion.
   - `build_art_assets.py` detects the new album count $N$, re-packs `atlas.webp`, `atlas.jpg`, `atlas_data.js`, `covers_data.json`, `covers_data.js`, and re-synchronizes the curated sample covers.

---

### Scenario 2: Rebuilding Mosaic Assets Standalone
If you only edited album covers manually or changed mosaic parameters without re-scanning all audio files:

```bash
cd /home/x1/nx1.github.io/psyscores
make art
```
This runs `python3 build_art_assets.py`, which finishes in approximately 5 seconds.

---

### Scenario 3: Running Test Verification
To verify data integrity, continuous ID ordering, color range validity, and engine math:

```bash
cd /home/x1/nx1.github.io/psyscores
make test
```
This executes:
1. `pytest test_art.py`: Validates metadata schemas, CIELAB bounds, and atlas dimension matching.
2. `node test_mosaic_engine.js`: Validates color conversions and client matching logic.

---

### Scenario 4: Local Preview Testing
To preview the mosaic generator in your local browser before committing:

```bash
cd /home/x1/nx1.github.io/psyscores
./run_local.sh 8000
```
Open your browser at:
`http://localhost:8000/art/`

---

### Scenario 5: Deploying to GitHub Pages
Because GitHub Pages serves directly from the Git repository branch (`master`):

```bash
cd /home/x1/nx1.github.io
git status
git add psyscores/art/ psyscores/cover_art/ psyscores/make_psyscores.py psyscores/build_art_assets.py psyscores/ss_songs.json psyscores/psyscores.csv psyscores/v1.html Makefile psyscores/Makefile
git commit -m "Update album collection and rebuild mosaic assets"
git push origin master
```
Once pushed, GitHub Pages serves the updated mosaic generator and new covers automatically.

---

## 5. File Inventory & Roles

| Full Path | Description |
|:---|:---|
| `/home/x1/nx1.github.io/psyscores/make_psyscores.py` | Audio metadata parser, cover extractor, and pipeline trigger |
| `/home/x1/nx1.github.io/psyscores/build_art_assets.py` | Color metric compiler, sprite atlas builder, and asset bundler |
| `/home/x1/nx1.github.io/psyscores/generate_samples.py` | Curated sample cover upscaler and exporter |
| `/home/x1/nx1.github.io/psyscores/art/index.html` | Client-side user interface and controls |
| `/home/x1/nx1.github.io/psyscores/art/mosaic.js` | Client-side mosaic generation engine and canvas renderer |
| `/home/x1/nx1.github.io/psyscores/art/mosaic.css` | UI styles, responsive layout, and terminal dark theme |
| `/home/x1/nx1.github.io/psyscores/art/covers_data.json` | JSON array of all covers with CIELAB metrics |
| `/home/x1/nx1.github.io/psyscores/art/covers_data.js` | Embedded JS version of covers data for offline `file://` support |
| `/home/x1/nx1.github.io/psyscores/art/atlas.webp` | High-efficiency WebP sprite sheet |
| `/home/x1/nx1.github.io/psyscores/art/atlas.jpg` | JPEG fallback sprite sheet |
| `/home/x1/nx1.github.io/psyscores/art/atlas_data.js` | Base64 Data URI of sprite sheet for offline `file://` support |
| `/home/x1/nx1.github.io/psyscores/art/samples_data.js` | Base64 Data URIs of curated sample images |
| `/home/x1/nx1.github.io/psyscores/cover_art/*.jpg` | Extracted 200x200 px cover images used for HD zoom export |
| `/home/x1/nx1.github.io/psyscores/Makefile` | Subproject targets (`psyscores`, `art`, `samples`, `test`) |
| `/home/x1/nx1.github.io/Makefile` | Root delegation Makefile |
| `/home/x1/nx1.github.io/psyscores/test_art.py` | Python asset validation test suite (pytest) |
| `/home/x1/nx1.github.io/psyscores/test_mosaic_engine.js` | Node.js algorithm and color conversion test suite |
| `/home/x1/nx1.github.io/psyscores/run_local.sh` | Local HTTP preview server launcher |
