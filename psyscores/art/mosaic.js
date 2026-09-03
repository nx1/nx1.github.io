/**
 * Psyscores Album Art Mosaic Generator
 * High-performance client-side photomosaic engine using 841 psychedelic covers.
 */

// ==========================================================================
// Constants & Configuration
// ==========================================================================
const ATLAS_GRID_DIM = 29;     // 29 x 29 = 841 tiles in atlas
const ATLAS_TILE_SIZE = 60;    // 60x60 px per thumbnail in atlas
const DEFAULT_GRID_WIDTH = 50; // default 50 tiles horizontally

// Promises for asset loading synchronization
let coversResolve, atlasResolve;
const coversPromise = new Promise(resolve => coversResolve = resolve);
const atlasPromise = new Promise(resolve => atlasResolve = resolve);

// ==========================================================================
// Global Application State
// ==========================================================================
const state = {
    covers: [],             // All 841 cover metadata objects
    atlasImg: null,         // HTMLImageElement for atlas.webp / atlas.jpg
    sourceImg: null,        // HTMLImageElement of user's target image
    sourceName: '',         // Name of loaded image
    
    // Active Settings
    gridWidth: DEFAULT_GRID_WIDTH,
    gridHeight: DEFAULT_GRID_WIDTH,
    matchMode: 'quad',      // 'avg' | 'quad'
    diversityMode: 'medium',// 'none' | 'medium' | 'high'
    minRating: 1,           // 1 (all), 4 (4+), 5 (5 only)
    blendOpacity: 0.15,     // 0.0 to 1.0
    blendMode: 'normal',    // 'normal' | 'soft-light' | 'overlay' | 'color'
    forceSquare: false,     // true: 1:1 aspect ratio, false: match source
    
    // Computed Mosaic Data
    mosaicGrid: null,       // Int32Array of cover IDs, length = gridWidth * gridHeight
    tilePixelSize: 40,      // Render size per tile on output canvas
    canvasWidth: 0,
    canvasHeight: 0,
    cachedTilesCanvas: null,// Offscreen canvas holding pure tiles
    
    // Viewport Navigation (Pan / Zoom)
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    activeViewMode: 'mosaic', // 'mosaic' | 'original'
    
    // Status
    isGenerating: false,
    generationStartTime: 0
};

// Expose state for inspection/debugging
window.mosaicState = state;
window.generateMosaic = generateMosaic;

// ==========================================================================
// DOM Elements Cache
// ==========================================================================
const DOM = {
    // Dropzone & Inputs
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    previewBar: document.getElementById('source-preview-bar'),
    previewThumb: document.getElementById('source-preview-thumb'),
    sourceNameText: document.getElementById('source-name'),
    sourceMetaText: document.getElementById('source-meta'),
    sampleThumbs: document.querySelectorAll('.sample-thumb'),

    // Parameters
    gridSlider: document.getElementById('grid-slider'),
    gridValText: document.getElementById('grid-val-text'),
    presetButtons: document.querySelectorAll('.btn-preset'),
    matchModeSelect: document.getElementById('match-mode-select'),
    diversitySelect: document.getElementById('diversity-select'),
    ratingSelect: document.getElementById('rating-select'),
    aspectSelect: document.getElementById('aspect-select'),
    blendSlider: document.getElementById('blend-slider'),
    blendValText: document.getElementById('blend-val-text'),
    blendModeSelect: document.getElementById('blend-mode-select'),

    // Buttons
    btnGenerate: document.getElementById('btn-generate'),
    btnResetView: document.getElementById('btn-reset-view'),
    btnDownloadPng: document.getElementById('btn-download-png'),
    btnDownloadJpg: document.getElementById('btn-download-jpg'),
    btnCopyClipboard: document.getElementById('btn-copy-clipboard'),
    btnExportHd: document.getElementById('btn-export-hd'),

    // Progress
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressStatus: document.getElementById('progress-status'),
    progressPercent: document.getElementById('progress-percent'),

    // Viewport & Canvas
    viewport: document.getElementById('canvas-viewport'),
    stage: document.getElementById('canvas-stage'),
    canvas: document.getElementById('mosaic-canvas'),
    emptyState: document.getElementById('empty-state'),
    viewModeButtons: document.querySelectorAll('.btn-view-mode'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomFit: document.getElementById('btn-zoom-fit'),
    zoomLevelText: document.getElementById('zoom-level-text'),

    // Inspector HUD
    tileHighlighter: document.getElementById('tile-highlighter'),
    inspectorHud: document.getElementById('tile-inspector-hud'),
    inspectorCoords: document.getElementById('inspector-coords'),
    inspectorCover: document.getElementById('inspector-cover'),
    inspectorTitle: document.getElementById('inspector-title'),
    inspectorArtist: document.getElementById('inspector-artist'),
    inspectorMeta: document.getElementById('inspector-meta'),
    inspectorRating: document.getElementById('inspector-rating'),
    inspectorDiscogsLink: document.getElementById('inspector-discogs-link'),

    // Stats
    statGenTime: document.getElementById('stat-gen-time'),
    statUniqueCount: document.getElementById('stat-unique-count'),
    statTopAlbum: document.getElementById('stat-top-album'),
    statGridDim: document.getElementById('stat-grid-dim'),
    toast: document.getElementById('toast-notice')
};

// ==========================================================================
// Color Mathematics: sRGB to CIE L*a*b* (D65 Illuminant)
// ==========================================================================
function srgbToLinear(c) {
    const v = c / 255.0;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToLab(r, g, b) {
    const rL = srgbToLinear(r);
    const gL = srgbToLinear(g);
    const bL = srgbToLinear(b);

    const xVal = (rL * 0.4124564 + gL * 0.3575761 + bL * 0.1804375) / 0.95047;
    const yVal = (rL * 0.2126729 + gL * 0.7151522 + bL * 0.0721750);
    const zVal = (rL * 0.0193339 + gL * 0.1191920 + bL * 0.9503041) / 1.08883;

    const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16.0 / 116.0);

    const fx = f(xVal);
    const fy = f(yVal);
    const fz = f(zVal);

    const labL = 116.0 * fy - 16.0;
    const labA = 500.0 * (fx - fy);
    const labB = 200.0 * (fy - fz);
    return [labL, labA, labB];
}

// ==========================================================================
// Atlas Preloading (Starts Immediately)
// ==========================================================================
function startAtlasPreload() {
    if (window.ATLAS_DATA_URI) {
        const atlasImg = new Image();
        atlasImg.onload = () => {
            state.atlasImg = atlasImg;
            console.log('Atlas loaded instantly from embedded Data URI');
            atlasResolve(atlasImg);
        };
        atlasImg.onerror = (e) => {
            console.error('Failed loading embedded atlas Data URI, falling back...', e);
            fallbackAtlasLoad();
        };
        atlasImg.src = window.ATLAS_DATA_URI;
        return;
    }
    fallbackAtlasLoad();
}

function fallbackAtlasLoad() {
    const webpImg = new Image();
    webpImg.onload = () => {
        state.atlasImg = webpImg;
        console.log('Atlas loaded (WebP)');
        atlasResolve(webpImg);
    };
    webpImg.onerror = () => {
        console.warn('WebP atlas failed, loading JPEG fallback...');
        const jpgImg = new Image();
        jpgImg.onload = () => {
            state.atlasImg = jpgImg;
            console.log('Atlas loaded (JPEG)');
            atlasResolve(jpgImg);
        };
        jpgImg.onerror = (e) => {
            console.error('Failed to load sprite atlas:', e);
            atlasResolve(null);
        };
        jpgImg.src = 'atlas.jpg';
    };
    webpImg.src = 'atlas.webp';
}

// Start atlas download in background immediately
startAtlasPreload();

// ==========================================================================
// Initialization & Asset Loading
// ==========================================================================
async function initApp() {
    setupEventListeners();

    // 1. Resolve covers data (from embedded script or fetch fallback)
    if (window.COVERS_DATA && Array.isArray(window.COVERS_DATA) && window.COVERS_DATA.length > 0) {
        state.covers = window.COVERS_DATA;
        console.log(`Loaded ${state.covers.length} covers from embedded script.`);
        coversResolve(state.covers);
    } else {
        try {
            const res = await fetch('covers_data.json');
            if (res.ok) {
                state.covers = await res.json();
                console.log(`Loaded ${state.covers.length} covers from JSON fetch.`);
            }
        } catch (e) {
            console.warn('covers_data.json fetch failed:', e);
        }
        coversResolve(state.covers);
    }

    // 2. Wait for atlas sprite sheet
    await atlasPromise;

    // 3. Load initial sample image (Album #32: Buzzmonx - Toms'n Jerry)
    loadSampleImage('samples/cover_32_buzzmonx.jpg', "Buzzmonx - Toms'n Jerry", '32');
}

// ==========================================================================
// Image Loading & Handling
// ==========================================================================
function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, WebP).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            setSourceImage(img, file.name);
        };
        img.onerror = () => {
            showToast('Failed to decode selected image.');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadSampleImage(url, name, key) {
    const img = new Image();
    img.onload = () => {
        setSourceImage(img, name);
    };
    img.onerror = () => {
        console.error('Failed to load sample image:', url);
        showToast(`Failed to load sample: ${name}`);
    };
    if (key && window.SAMPLES_DATA && window.SAMPLES_DATA[key]) {
        img.src = window.SAMPLES_DATA[key];
    } else {
        img.src = url;
    }
}

function setSourceImage(img, name) {
    state.sourceImg = img;
    state.sourceName = name || 'Uploaded Image';

    // Update preview bar
    DOM.previewBar.style.display = 'flex';
    DOM.previewThumb.src = img.src;
    DOM.sourceNameText.textContent = state.sourceName;
    DOM.sourceMetaText.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;

    // Highlight sample thumb if applicable
    DOM.sampleThumbs.forEach(st => {
        const src = st.getAttribute('data-src');
        if (img.src.includes(src)) {
            st.classList.add('active');
        } else {
            st.classList.remove('active');
        }
    });

    updateGridDimensions();
    DOM.btnGenerate.disabled = false;

    // Auto-generate mosaic
    generateMosaic();
}

// ==========================================================================
// Grid Dimensions Calculation
// ==========================================================================
function updateGridDimensions() {
    state.gridWidth = parseInt(DOM.gridSlider.value, 10);
    
    if (state.sourceImg && !state.forceSquare) {
        const aspect = state.sourceImg.naturalWidth / state.sourceImg.naturalHeight;
        state.gridHeight = Math.max(5, Math.round(state.gridWidth / aspect));
    } else {
        state.gridHeight = state.gridWidth;
    }

    const totalTiles = state.gridWidth * state.gridHeight;
    DOM.gridValText.textContent = `${state.gridWidth} × ${state.gridHeight} (${totalTiles.toLocaleString()} tiles)`;
}

// ==========================================================================
// Mosaic Generation Engine
// ==========================================================================
async function generateMosaic() {
    if (state.isGenerating) return;

    if (!state.sourceImg) {
        showToast('Please select or upload an image first.');
        DOM.fileInput.click();
        return;
    }

    // Wait for covers if not ready
    if (!state.covers || state.covers.length === 0) {
        showToast('Loading 841 album covers data...');
        await coversPromise;
        if (!state.covers || state.covers.length === 0) {
            showToast('Could not load album metadata. Please reload the page.');
            return;
        }
    }

    // Wait for atlas if not ready
    if (!state.atlasImg) {
        showToast('Loading sprite atlas...');
        await atlasPromise;
        if (!state.atlasImg) {
            showToast('Could not load cover art atlas. Please check network.');
            return;
        }
    }

    state.isGenerating = true;
    state.generationStartTime = performance.now();
    DOM.btnGenerate.disabled = true;
    DOM.progressContainer.style.display = 'block';
    DOM.progressFill.style.width = '0%';
    DOM.progressStatus.textContent = 'Analyzing source image...';
    DOM.progressPercent.textContent = '0%';

    // Yield to render initial progress bar
    await sleep(20);

    try {
        const gw = state.gridWidth;
        const gh = state.gridHeight;
        const totalTiles = gw * gh;

        // 1. Filter candidates by minimum rating
        const activeCandidates = state.covers.filter(c => c.rating >= state.minRating);
        const numCandidates = activeCandidates.length;

        // 2. Prepare flat typed arrays for fast SIMD-friendly matching
        const isQuad = (state.matchMode === 'quad');
        let candidateData;
        const candidateIds = new Int32Array(numCandidates);

        if (isQuad) {
            candidateData = new Float32Array(numCandidates * 12);
            for (let i = 0; i < numCandidates; i++) {
                candidateIds[i] = activeCandidates[i].id;
                const q = activeCandidates[i].quad_lab;
                for (let k = 0; k < 4; k++) {
                    candidateData[i * 12 + k * 3]     = q[k][0];
                    candidateData[i * 12 + k * 3 + 1] = q[k][1];
                    candidateData[i * 12 + k * 3 + 2] = q[k][2];
                }
            }
        } else {
            candidateData = new Float32Array(numCandidates * 3);
            for (let i = 0; i < numCandidates; i++) {
                candidateIds[i] = activeCandidates[i].id;
                candidateData[i * 3]     = activeCandidates[i].avg_lab[0];
                candidateData[i * 3 + 1] = activeCandidates[i].avg_lab[1];
                candidateData[i * 3 + 2] = activeCandidates[i].avg_lab[2];
            }
        }

        // 3. Render source image onto an offscreen canvas at sample resolution
        const sampleScale = isQuad ? 2 : 1;
        const sampleW = gw * sampleScale;
        const sampleH = gh * sampleScale;

        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = sampleW;
        sampleCanvas.height = sampleH;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
        sampleCtx.drawImage(state.sourceImg, 0, 0, sampleW, sampleH);

        let samplePixels;
        try {
            samplePixels = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;
        } catch (secErr) {
            console.error('Canvas pixel read error:', secErr);
            showToast('Canvas pixel read error: ' + secErr.message);
            throw secErr;
        }

        // Precompute CIELAB for all sample pixels
        const sampleLab = new Float32Array(sampleW * sampleH * 3);
        for (let p = 0, ptr = 0; p < samplePixels.length; p += 4, ptr += 3) {
            const lab = rgbToLab(samplePixels[p], samplePixels[p + 1], samplePixels[p + 2]);
            sampleLab[ptr]     = lab[0];
            sampleLab[ptr + 1] = lab[1];
            sampleLab[ptr + 2] = lab[2];
        }

        // 4. Allocate mosaic grid results
        state.mosaicGrid = new Int32Array(totalTiles);

        // Diversity penalty parameters
        const useDiversity = state.diversityMode !== 'none';
        const penaltyWeight = state.diversityMode === 'high' ? 1.5 : 0.6;
        const recentUsage = new Int16Array(841);

        // 5. Chunked processing by rows for non-blocking UI
        const rowsPerChunk = Math.max(1, Math.floor(gh / 20));
        let currentRow = 0;

        await new Promise((resolve, reject) => {
            function processChunks() {
                try {
                    const endRow = Math.min(gh, currentRow + rowsPerChunk);

                    for (let y = currentRow; y < endRow; y++) {
                        for (let x = 0; x < gw; x++) {
                            const cellIndex = y * gw + x;
                            let bestDist = Infinity;
                            let bestCandidateIndex = 0;

                            if (isQuad) {
                                const x0 = x * 2,     y0 = y * 2;
                                const x1 = x * 2 + 1, y1 = y * 2 + 1;

                                const idxTL = (y0 * sampleW + x0) * 3;
                                const idxTR = (y0 * sampleW + x1) * 3;
                                const idxBL = (y1 * sampleW + x0) * 3;
                                const idxBR = (y1 * sampleW + x1) * 3;

                                for (let c = 0, cPtr = 0; c < numCandidates; c++, cPtr += 12) {
                                    let dist = 0;

                                    // TL
                                    let dL = sampleLab[idxTL]     - candidateData[cPtr];
                                    let da = sampleLab[idxTL + 1] - candidateData[cPtr + 1];
                                    let db = sampleLab[idxTL + 2] - candidateData[cPtr + 2];
                                    dist += dL * dL + da * da + db * db;
                                    if (dist >= bestDist) continue;

                                    // TR
                                    dL = sampleLab[idxTR]     - candidateData[cPtr + 3];
                                    da = sampleLab[idxTR + 1] - candidateData[cPtr + 4];
                                    db = sampleLab[idxTR + 2] - candidateData[cPtr + 5];
                                    dist += dL * dL + da * da + db * db;
                                    if (dist >= bestDist) continue;

                                    // BL
                                    dL = sampleLab[idxBL]     - candidateData[cPtr + 6];
                                    da = sampleLab[idxBL + 1] - candidateData[cPtr + 7];
                                    db = sampleLab[idxBL + 2] - candidateData[cPtr + 8];
                                    dist += dL * dL + da * da + db * db;
                                    if (dist >= bestDist) continue;

                                    // BR
                                    dL = sampleLab[idxBR]     - candidateData[cPtr + 9];
                                    da = sampleLab[idxBR + 1] - candidateData[cPtr + 10];
                                    db = sampleLab[idxBR + 2] - candidateData[cPtr + 11];
                                    dist += dL * dL + da * da + db * db;

                                    if (useDiversity) {
                                        const id = candidateIds[c];
                                        if (recentUsage[id] > 0) {
                                            dist *= (1.0 + recentUsage[id] * penaltyWeight);
                                        }
                                    }

                                    if (dist < bestDist) {
                                        bestDist = dist;
                                        bestCandidateIndex = c;
                                    }
                                }
                            } else {
                                const pIdx = (y * sampleW + x) * 3;
                                const cL = sampleLab[pIdx];
                                const ca = sampleLab[pIdx + 1];
                                const cb = sampleLab[pIdx + 2];

                                for (let c = 0, cPtr = 0; c < numCandidates; c++, cPtr += 3) {
                                    const dL = cL - candidateData[cPtr];
                                    const da = ca - candidateData[cPtr + 1];
                                    const db = cb - candidateData[cPtr + 2];
                                    let dist = dL * dL + da * da + db * db;

                                    if (useDiversity) {
                                        const id = candidateIds[c];
                                        if (recentUsage[id] > 0) {
                                            dist *= (1.0 + recentUsage[id] * penaltyWeight);
                                        }
                                    }

                                    if (dist < bestDist) {
                                        bestDist = dist;
                                        bestCandidateIndex = c;
                                    }
                                }
                            }

                            const chosenId = candidateIds[bestCandidateIndex];
                            state.mosaicGrid[cellIndex] = chosenId;

                            if (useDiversity) {
                                recentUsage[chosenId]++;
                                if (y > 2) {
                                    const oldId = state.mosaicGrid[(y - 3) * gw + x];
                                    if (oldId !== undefined && recentUsage[oldId] > 0) {
                                        recentUsage[oldId]--;
                                    }
                                }
                            }
                        }
                    }

                    currentRow = endRow;
                    const pct = Math.round((currentRow / gh) * 100);
                    DOM.progressFill.style.width = pct + '%';
                    DOM.progressPercent.textContent = pct + '%';
                    DOM.progressStatus.textContent = `Matching tiles (Row ${currentRow}/${gh})...`;

                    if (currentRow < gh) {
                        requestAnimationFrame(processChunks);
                    } else {
                        finishGeneration();
                        resolve();
                    }
                } catch (innerErr) {
                    reject(innerErr);
                }
            }

            requestAnimationFrame(processChunks);
        });

    } catch (err) {
        console.error('Mosaic generation error:', err);
        showToast('Generation error: ' + err.message);
    } finally {
        state.isGenerating = false;
        DOM.btnGenerate.disabled = false;
        DOM.progressContainer.style.display = 'none';
    }
}

// ==========================================================================
// Rendering Mosaic to Canvas
// ==========================================================================
function finishGeneration() {
    DOM.progressStatus.textContent = 'Rendering mosaic canvas...';

    // Target canvas resolution ~1600 to 2400 px
    const targetDim = 2000;
    state.tilePixelSize = Math.max(16, Math.min(60, Math.floor(targetDim / Math.max(state.gridWidth, state.gridHeight))));

    state.canvasWidth = state.gridWidth * state.tilePixelSize;
    state.canvasHeight = state.gridHeight * state.tilePixelSize;

    // Create offscreen cached tiles canvas
    state.cachedTilesCanvas = document.createElement('canvas');
    state.cachedTilesCanvas.width = state.canvasWidth;
    state.cachedTilesCanvas.height = state.canvasHeight;
    const tileCtx = state.cachedTilesCanvas.getContext('2d');

    const gw = state.gridWidth;
    const gh = state.gridHeight;
    const ts = state.tilePixelSize;

    // Draw all tiles from atlas onto cached offscreen canvas
    for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
            const albumId = state.mosaicGrid[y * gw + x];
            const col = albumId % ATLAS_GRID_DIM;
            const row = Math.floor(albumId / ATLAS_GRID_DIM);
            const sx = col * ATLAS_TILE_SIZE;
            const sy = row * ATLAS_TILE_SIZE;
            const dx = x * ts;
            const dy = y * ts;

            tileCtx.drawImage(
                state.atlasImg,
                sx, sy, ATLAS_TILE_SIZE, ATLAS_TILE_SIZE,
                dx, dy, ts, ts
            );
        }
    }

    // Set visible canvas dimensions
    DOM.canvas.width = state.canvasWidth;
    DOM.canvas.height = state.canvasHeight;

    // Compose final image with blend overlay
    renderComposite();

    // Hide progress bar, update stats
    DOM.progressContainer.style.display = 'none';
    DOM.emptyState.style.display = 'none';
    DOM.canvas.style.display = 'block';
    DOM.btnGenerate.disabled = false;
    DOM.btnDownloadPng.disabled = false;
    DOM.btnDownloadJpg.disabled = false;
    DOM.btnCopyClipboard.disabled = false;
    DOM.btnExportHd.disabled = false;

    // Reset pan & zoom to fit screen comfortably
    fitToViewport();

    // Calculate and display statistics
    updateStatistics();
}

/**
 * Composite the cached tiles canvas and the original image overlay.
 * Very fast (<5ms) - called whenever blend slider or blend mode changes!
 */
function renderComposite() {
    if (!state.cachedTilesCanvas || !state.sourceImg) return;

    const ctx = DOM.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

    if (state.activeViewMode === 'original') {
        // Show pure original source image
        ctx.drawImage(state.sourceImg, 0, 0, state.canvasWidth, state.canvasHeight);
    } else {
        // 1. Draw base mosaic tiles
        ctx.drawImage(state.cachedTilesCanvas, 0, 0);

        // 2. Draw blend overlay if opacity > 0
        if (state.blendOpacity > 0) {
            ctx.save();
            ctx.globalAlpha = state.blendOpacity;
            ctx.globalCompositeOperation = state.blendMode;
            ctx.drawImage(state.sourceImg, 0, 0, state.canvasWidth, state.canvasHeight);
            ctx.restore();
        }
    }
}

// ==========================================================================
// Statistics
// ==========================================================================
function updateStatistics() {
    const elapsed = Math.round(performance.now() - state.generationStartTime);
    DOM.statGenTime.textContent = `${elapsed} ms`;

    // Count unique albums and frequencies
    const freq = {};
    let maxCount = 0;
    let topId = 0;

    for (let i = 0; i < state.mosaicGrid.length; i++) {
        const id = state.mosaicGrid[i];
        freq[id] = (freq[id] || 0) + 1;
        if (freq[id] > maxCount) {
            maxCount = freq[id];
            topId = id;
        }
    }

    const uniqueCount = Object.keys(freq).length;
    const uniquePct = ((uniqueCount / 841) * 100).toFixed(1);
    DOM.statUniqueCount.textContent = `${uniqueCount} / 841 (${uniquePct}%)`;

    const topCover = state.covers[topId];
    if (topCover) {
        DOM.statTopAlbum.textContent = `${topCover.album} (${maxCount}×)`;
    }

    DOM.statGridDim.textContent = `${state.gridWidth} × ${state.gridHeight} (${state.mosaicGrid.length.toLocaleString()})`;
}

// ==========================================================================
// Viewport Navigation: Pan & Zoom
// ==========================================================================
function updateStageTransform() {
    DOM.stage.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    DOM.zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
}

function fitToViewport() {
    if (!state.canvasWidth || !state.canvasHeight) return;

    const vpRect = DOM.viewport.getBoundingClientRect();
    const margin = 40;
    const availW = Math.max(100, vpRect.width - margin);
    const availH = Math.max(100, vpRect.height - margin);

    const scaleW = availW / state.canvasWidth;
    const scaleH = availH / state.canvasHeight;
    state.zoom = Math.min(scaleW, scaleH, 1.0); // Fit completely within view

    state.panX = Math.round((vpRect.width - state.canvasWidth * state.zoom) / 2);
    state.panY = Math.round((vpRect.height - state.canvasHeight * state.zoom) / 2);
    updateStageTransform();
}

function resetZoom() {
    state.zoom = 1.0;
    const vpRect = DOM.viewport.getBoundingClientRect();
    state.panX = Math.round((vpRect.width - state.canvasWidth) / 2);
    state.panY = Math.round((vpRect.height - state.canvasHeight) / 2);
    updateStageTransform();
}

function zoomBy(factor, centerX, centerY) {
    const prevZoom = state.zoom;
    let newZoom = prevZoom * factor;
    newZoom = Math.max(0.15, Math.min(8.0, newZoom));

    if (centerX === undefined || centerY === undefined) {
        const vpRect = DOM.viewport.getBoundingClientRect();
        centerX = vpRect.width / 2;
        centerY = vpRect.height / 2;
    }

    // Zoom centered on specified point
    state.panX = Math.round(centerX - (centerX - state.panX) * (newZoom / prevZoom));
    state.panY = Math.round(centerY - (centerY - state.panY) * (newZoom / prevZoom));
    state.zoom = newZoom;
    updateStageTransform();
}

// ==========================================================================
// Interactive Tile Inspector
// ==========================================================================
function handleMouseMove(e) {
    if (state.isPanning) {
        state.panX = e.clientX - state.panStartX;
        state.panY = e.clientY - state.panStartY;
        updateStageTransform();
        return;
    }

    if (!state.mosaicGrid || state.activeViewMode !== 'mosaic') {
        DOM.tileHighlighter.style.display = 'none';
        DOM.inspectorHud.style.display = 'none';
        return;
    }

    // Convert mouse coordinates to canvas tile coordinates
    const stageRect = DOM.stage.getBoundingClientRect();
    const relX = (e.clientX - stageRect.left) / state.zoom;
    const relY = (e.clientY - stageRect.top) / state.zoom;

    const ts = state.tilePixelSize;
    const tileCol = Math.floor(relX / ts);
    const tileRow = Math.floor(relY / ts);

    if (tileCol >= 0 && tileCol < state.gridWidth && tileRow >= 0 && tileRow < state.gridHeight) {
        const cellIndex = tileRow * state.gridWidth + tileCol;
        const albumId = state.mosaicGrid[cellIndex];
        const album = state.covers[albumId];

        if (album) {
            // Position highlighter
            DOM.tileHighlighter.style.display = 'block';
            DOM.tileHighlighter.style.left = `${tileCol * ts}px`;
            DOM.tileHighlighter.style.top = `${tileRow * ts}px`;
            DOM.tileHighlighter.style.width = `${ts}px`;
            DOM.tileHighlighter.style.height = `${ts}px`;

            // Update Inspector HUD
            DOM.inspectorCoords.textContent = `Tile (${tileCol}, ${tileRow}) | #${album.id}`;
            DOM.inspectorCover.src = `../cover_art/${album.id}.jpg`;
            DOM.inspectorTitle.textContent = album.album;
            DOM.inspectorArtist.textContent = album.artist;
            DOM.inspectorMeta.textContent = `${album.year || 'Unknown Year'} • ${album.label || 'No Label'} • ${album.tracks_count} tracks`;
            DOM.inspectorRating.textContent = '★'.repeat(album.rating || 3) + '☆'.repeat(5 - (album.rating || 3));
            
            const discogsQuery = encodeURIComponent(`${album.artist} ${album.album}`);
            DOM.inspectorDiscogsLink.href = `https://www.discogs.com/search/?q=${discogsQuery}&type=all`;

            DOM.inspectorHud.style.display = 'block';
        }
    } else {
        DOM.tileHighlighter.style.display = 'none';
        DOM.inspectorHud.style.display = 'none';
    }
}

// ==========================================================================
// Exports: Download PNG, JPEG, Clipboard, and Ultra-HD Poster
// ==========================================================================
function downloadImage(format) {
    if (!state.mosaicGrid) return;

    const link = document.createElement('a');
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const quality = format === 'jpeg' ? 0.92 : undefined;

    link.download = `psyscores_mosaic_${state.gridWidth}x${state.gridHeight}.${ext}`;
    link.href = DOM.canvas.toDataURL(mime, quality);
    link.click();

    showToast(`Mosaic downloaded as .${ext}`);
}

async function copyToClipboard() {
    if (!state.mosaicGrid) return;
    try {
        DOM.canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('Clipboard export not supported by browser.');
                return;
            }
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('Mosaic copied to clipboard!');
        }, 'image/png');
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        showToast('Clipboard copy failed: ' + err.message);
    }
}

async function exportUltraHd() {
    if (!state.mosaicGrid) return;

    showToast('Generating Ultra-HD Poster (Lossless 200px source tiles)...');
    DOM.progressContainer.style.display = 'block';
    DOM.progressFill.style.width = '10%';
    DOM.progressStatus.textContent = 'Gathering unique album covers...';

    // Identify all unique album IDs used in this mosaic
    const uniqueIds = Array.from(new Set(state.mosaicGrid));
    console.log(`HD Export requires ${uniqueIds.length} unique source covers.`);

    const hdTileSize = Math.min(120, Math.floor(4000 / Math.max(state.gridWidth, state.gridHeight)));
    const hdWidth = state.gridWidth * hdTileSize;
    const hdHeight = state.gridHeight * hdTileSize;

    const hdCanvas = document.createElement('canvas');
    hdCanvas.width = hdWidth;
    hdCanvas.height = hdHeight;
    const hdCtx = hdCanvas.getContext('2d');

    const coverImages = new Map();

    const isFileProto = (window.location.protocol === 'file:');

    if (!isFileProto) {
        let loadedCount = 0;
        const batchSize = 25;
        for (let i = 0; i < uniqueIds.length; i += batchSize) {
            const batch = uniqueIds.slice(i, i + batchSize);
            await Promise.all(batch.map(id => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        coverImages.set(id, img);
                        loadedCount++;
                        const p = Math.round(10 + (loadedCount / uniqueIds.length) * 75);
                        DOM.progressFill.style.width = `${p}%`;
                        DOM.progressStatus.textContent = `Loading HD covers (${loadedCount}/${uniqueIds.length})...`;
                        resolve();
                    };
                    img.onerror = () => {
                        loadedCount++;
                        resolve();
                    };
                    img.src = `../cover_art/${id}.jpg`;
                });
            }));
        }
    }

    DOM.progressStatus.textContent = 'Rendering Ultra-HD canvas...';
    DOM.progressFill.style.width = '90%';
    await sleep(20);

    const gw = state.gridWidth;
    const gh = state.gridHeight;

    for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
            const albumId = state.mosaicGrid[y * gw + x];
            const dx = x * hdTileSize;
            const dy = y * hdTileSize;
            const srcImg = coverImages.get(albumId);

            if (srcImg) {
                hdCtx.drawImage(srcImg, dx, dy, hdTileSize, hdTileSize);
            } else {
                // Fallback to atlas
                const col = albumId % ATLAS_GRID_DIM;
                const row = Math.floor(albumId / ATLAS_GRID_DIM);
                hdCtx.drawImage(
                    state.atlasImg,
                    col * ATLAS_TILE_SIZE, row * ATLAS_TILE_SIZE, ATLAS_TILE_SIZE, ATLAS_TILE_SIZE,
                    dx, dy, hdTileSize, hdTileSize
                );
            }
        }
    }

    // Apply blend overlay if enabled
    if (state.blendOpacity > 0 && state.sourceImg) {
        hdCtx.save();
        hdCtx.globalAlpha = state.blendOpacity;
        hdCtx.globalCompositeOperation = state.blendMode;
        hdCtx.drawImage(state.sourceImg, 0, 0, hdWidth, hdHeight);
        hdCtx.restore();
    }

    DOM.progressStatus.textContent = 'Encoding HD Image...';
    DOM.progressFill.style.width = '100%';
    await sleep(20);

    hdCanvas.toBlob((blob) => {
        DOM.progressContainer.style.display = 'none';
        if (!blob) {
            showToast('Failed to generate HD image.');
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `psyscores_mosaic_HD_${hdWidth}x${hdHeight}.jpg`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Ultra-HD Poster (${hdWidth}×${hdHeight} px) generated!`);
    }, 'image/jpeg', 0.94);
}

// ==========================================================================
// User Interface Event Listeners
// ==========================================================================
function setupEventListeners() {
    // Dropzone & File picker
    DOM.dropzone.addEventListener('click', () => {
        DOM.fileInput.click();
    });

    DOM.fileInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
        }
        DOM.fileInput.value = ''; // Reset so same file can be selected again
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
        DOM.dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            DOM.dropzone.classList.add('dragover');
        });
        window.addEventListener(name, (e) => e.preventDefault());
    });

    ['dragleave', 'drop'].forEach(name => {
        DOM.dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            DOM.dropzone.classList.remove('dragover');
        });
        window.addEventListener(name, (e) => e.preventDefault());
    });

    DOM.dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageFile(e.dataTransfer.files[0]);
        }
    });

    // Global Paste (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                handleImageFile(item.getAsFile());
                showToast('Pasted image from clipboard!');
                break;
            }
        }
    });

    // Sample Image buttons
    DOM.sampleThumbs.forEach(st => {
        st.addEventListener('click', () => {
            const src = st.getAttribute('data-src');
            const name = st.getAttribute('data-name');
            const key = st.getAttribute('data-key');
            loadSampleImage(src, name, key);
        });
    });

    // Grid Slider
    DOM.gridSlider.addEventListener('input', () => {
        updateGridDimensions();
        DOM.presetButtons.forEach(btn => btn.classList.remove('active'));
    });

    // Preset buttons (30, 50, 75, 100)
    DOM.presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            DOM.gridSlider.value = btn.getAttribute('data-val');
            updateGridDimensions();
            if (state.sourceImg) generateMosaic();
        });
    });

    // Options dropdowns
    DOM.matchModeSelect.addEventListener('change', (e) => {
        state.matchMode = e.target.value;
    });

    DOM.diversitySelect.addEventListener('change', (e) => {
        state.diversityMode = e.target.value;
    });

    DOM.ratingSelect.addEventListener('change', (e) => {
        state.minRating = parseInt(e.target.value, 10);
    });

    DOM.aspectSelect.addEventListener('change', (e) => {
        state.forceSquare = (e.target.value === 'square');
        updateGridDimensions();
        if (state.sourceImg) generateMosaic();
    });

    // Real-time Blend Slider (Instant 60fps update, no re-compute needed)
    DOM.blendSlider.addEventListener('input', (e) => {
        state.blendOpacity = parseInt(e.target.value, 10) / 100.0;
        DOM.blendValText.textContent = `${e.target.value}%`;
        renderComposite();
    });

    DOM.blendModeSelect.addEventListener('change', (e) => {
        state.blendMode = e.target.value;
        renderComposite();
    });

    // Generate Button
    DOM.btnGenerate.addEventListener('click', () => generateMosaic());

    // View Mode Toggle (Mosaic vs Original)
    DOM.viewModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.viewModeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeViewMode = btn.getAttribute('data-mode');
            renderComposite();
        });
    });

    // Pan & Zoom events
    DOM.viewport.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // left click
            state.isPanning = true;
            state.panStartX = e.clientX - state.panX;
            state.panStartY = e.clientY - state.panY;
            DOM.viewport.classList.add('panning');
        }
    });

    window.addEventListener('mouseup', () => {
        if (state.isPanning) {
            state.isPanning = false;
            DOM.viewport.classList.remove('panning');
        }
    });

    DOM.viewport.addEventListener('mousemove', handleMouseMove);

    DOM.viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        const vpRect = DOM.viewport.getBoundingClientRect();
        const mouseX = e.clientX - vpRect.left;
        const mouseY = e.clientY - vpRect.top;
        zoomBy(factor, mouseX, mouseY);
    }, { passive: false });

    // Zoom Toolbar Buttons
    DOM.btnZoomIn.addEventListener('click', () => zoomBy(1.25));
    DOM.btnZoomOut.addEventListener('click', () => zoomBy(0.8));
    DOM.btnZoomFit.addEventListener('click', fitToViewport);
    DOM.btnResetView.addEventListener('click', resetZoom);

    // Export Buttons
    DOM.btnDownloadPng.addEventListener('click', () => downloadImage('png'));
    DOM.btnDownloadJpg.addEventListener('click', () => downloadImage('jpeg'));
    DOM.btnCopyClipboard.addEventListener('click', copyToClipboard);
    DOM.btnExportHd.addEventListener('click', exportUltraHd);

    // Keyboard Shortcuts: Space toggles between mosaic and original preview
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && state.sourceImg && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            state.activeViewMode = state.activeViewMode === 'mosaic' ? 'original' : 'mosaic';
            DOM.viewModeButtons.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-mode') === state.activeViewMode);
            });
            renderComposite();
        }
    });
}

// ==========================================================================
// Toast Utility
// ==========================================================================
let toastTimer = null;
function showToast(msg) {
    if (!DOM.toast) return;
    DOM.toast.textContent = msg;
    DOM.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 2800);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
