import { loadMusicData } from './dataLoader.js';
import { initSetExplorer } from './setExplorer.js';

function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
}

function populateTrackList(tracks) {
    const trackRows = document.querySelector('.track-rows');
    trackRows.innerHTML = ''; // Clear existing rows
    tracks.forEach((track, idx) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        const rating = typeof track.rating === 'number' ? track.rating : 0;
        const ratingStars = Array.from({ length: 5 }, (_, i) =>
            `<div class="rating-star${i < rating ? ' filled' : ''}"></div>`
        ).join('');
        row.innerHTML = `
            <div>${String(idx + 1).padStart(3, '0')}</div>
            <div>${track.title || ''}</div>
            <div>${track.artist || ''}</div>
            <div>${track.album || ''}</div>
            <div>${track.label || ''}</div>
            <div>${track.catalog || ''}</div>
            <div>${track.date || ''}</div>
            <div>${track.bpm || ''}</div>
            <div>${track.key || ''}</div>
            <div>${formatDuration(track.length)}</div>
            <div>${track.bitrate || ''}</div>
            <div><div class="rating-bar">${ratingStars}</div></div>
        `;
        trackRows.appendChild(row);
    });
}

function makeTrackHeaderSortable(tracks) {
    const header = document.getElementById('trackHeader');
    const columns = [
        { key: null }, // #
        { key: 'title' },
        { key: 'artist' },
        { key: 'album' },
        { key: 'label' },
        { key: 'catalog' },
        { key: 'date' },
        { key: 'bpm' },
        { key: 'key' },
        { key: 'length' },
        { key: 'bitrate' },
        { key: 'rating' }
    ];
    let sortState = { idx: null, asc: true };

    header.querySelectorAll('div').forEach((cell, idx) => {
        if (!columns[idx].key) return; // skip #
        cell.dataset.sortKey = columns[idx].key;
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => {
            if (sortState.idx !== null && sortState.idx !== idx) {
                const prevCell = header.querySelectorAll('div')[sortState.idx];
                prevCell.classList.remove('sorted-column');
                prevCell.classList.remove('sort-asc');
                prevCell.classList.remove('sort-desc');
            }

            // Toggle sort direction if same column, otherwise default to ascending
            if (sortState.idx === idx) {
                sortState.asc = !sortState.asc;
            } else {
                sortState.idx = idx;
                sortState.asc = true;
            }
            
            cell.classList.add('sorted-column');
            cell.classList.remove(sortState.asc ? 'sort-desc' : 'sort-asc');
            cell.classList.add(sortState.asc ? 'sort-asc' : 'sort-desc');

            tracks.sort((a, b) => {
                let aVal = a[columns[idx].key];
                let bVal = b[columns[idx].key];
                // Handle numbers and strings
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortState.asc ? aVal - bVal : bVal - aVal;
                }
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortState.asc
                        ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
                        : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: 'base' });
                }
                // Fallback
                return 0;
            });
            populateTrackList(tracks);
        });
    });
}

const OPEN_KEY_MUSICAL = {
    '1m': 'Am',  '2m': 'Em',  '3m': 'Bm',  '4m': 'F#m', '5m': 'C#m', '6m': 'G#m',
    '7m': 'D#m', '8m': 'A#m', '9m': 'Fm',  '10m': 'Cm', '11m': 'Gm', '12m': 'Dm',
    '1d': 'C',   '2d': 'G',   '3d': 'D',   '4d': 'A',   '5d': 'E',   '6d': 'B',
    '7d': 'F#',  '8d': 'Db',  '9d': 'Ab',  '10d': 'Eb', '11d': 'Bb', '12d': 'F'
};

function normalizeOpenKey(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return null;
    const trimmed = rawKey.trim();
    const openMatch = /^([1-9]|1[0-2])([md])$/i.exec(trimmed);
    if (openMatch) {
        return `${openMatch[1]}${openMatch[2].toLowerCase()}`;
    }
    const camelotMatch = /^([1-9]|1[0-2])([AB])$/i.exec(trimmed);
    if (camelotMatch) {
        const num = parseInt(camelotMatch[1], 10);
        const mode = camelotMatch[2].toUpperCase() === 'A' ? 'm' : 'd';
        const openNum = ((num + 4) % 12) + 1;
        return `${openNum}${mode}`;
    }
    return null;
}

function populateStats(tracks) {
    const totalTracks = tracks.length;
    
    // Unique albums (filtering out blank/null/undefined names)
    const uniqueAlbums = new Set(tracks.map(t => t.album).filter(Boolean)).size;
    
    // Unique artists (filtering out blank/null/undefined names)
    const uniqueArtists = new Set(tracks.map(t => t.artist).filter(Boolean)).size;
    
    // Unique labels (filtering out blank/null/undefined names)
    const uniqueLabels = new Set(tracks.map(t => t.label).filter(Boolean)).size;
    
    // Mean BPM
    const validBpms = tracks.map(t => Number(t.bpm)).filter(b => b > 0 && !isNaN(b));
    const meanBpm = validBpms.length > 0
        ? (validBpms.reduce((sum, b) => sum + b, 0) / validBpms.length).toFixed(1)
        : '-';

    // Top Key
    const keyCounts = {};
    tracks.forEach(t => {
        const k = normalizeOpenKey(t.key);
        if (k) keyCounts[k] = (keyCounts[k] || 0) + 1;
    });
    const topKeyEntry = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0];
    const topKeyText = topKeyEntry
        ? `${topKeyEntry[0]} (${OPEN_KEY_MUSICAL[topKeyEntry[0]] || ''})`
        : '-';

    // Total duration in hours and minutes
    const totalSeconds = tracks.reduce((sum, t) => sum + (t.length || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedTime = `${hours.toLocaleString()}h ${minutes}m`;
    
    // Update the DOM elements
    document.getElementById('stat-tracks').textContent = totalTracks.toLocaleString();
    document.getElementById('stat-albums').textContent = uniqueAlbums.toLocaleString();
    document.getElementById('stat-artists').textContent = uniqueArtists.toLocaleString();
    document.getElementById('stat-labels').textContent = uniqueLabels.toLocaleString();
    const statBpmEl = document.getElementById('stat-bpm');
    if (statBpmEl) statBpmEl.textContent = meanBpm;
    const statKeyEl = document.getElementById('stat-key');
    if (statKeyEl) statKeyEl.textContent = topKeyText;
    document.getElementById('stat-time').textContent = formattedTime;
}

function populateYearStats(tracks) {
    const container = document.getElementById('year-stats-container');
    if (!container) return;

    // Group tracks and albums by year
    const yearMap = {};
    tracks.forEach(track => {
        const yearVal = parseInt(track.date, 10);
        if (!yearVal || isNaN(yearVal) || yearVal < 1900 || yearVal > 2100) return;
        
        if (!yearMap[yearVal]) {
            yearMap[yearVal] = {
                year: yearVal,
                tracks: 0,
                albums: new Set()
            };
        }
        yearMap[yearVal].tracks++;
        if (track.album) {
            yearMap[yearVal].albums.add(track.album);
        }
    });

    const yearData = Object.values(yearMap).map(item => ({
        year: item.year,
        tracks: item.tracks,
        albums: item.albums.size
    }));

    if (yearData.length === 0) return;

    // Sort order configuration
    let sortKey = 'year';
    let sortAsc = true;

    function render() {
        const maxTracks = Math.max(...yearData.map(d => d.tracks), 1);
        const maxAlbums = Math.max(...yearData.map(d => d.albums), 1);

        // Sort data copy
        const sortedData = [...yearData].sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];
            if (sortAsc) {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });

        const getSortIndicator = (key) => {
            if (sortKey !== key) return '';
            return sortAsc ? ' ▲' : ' ▼';
        };

        let html = `
            <div class="year-stats-section">
                <div class="year-stats-title">Yearly Distribution</div>
                <div class="year-stats-table-wrapper">
                    <table class="year-stats-table">
                        <thead>
                            <tr>
                                <th class="sortable ${sortKey === 'year' ? 'sorted-column' : ''}" data-sort="year" style="width: 80px;">Year${getSortIndicator('year')}</th>
                                <th class="sortable ${sortKey === 'tracks' ? 'sorted-column' : ''}" data-sort="tracks">Distribution (<span style="color: #4a8;">■</span> Tracks / <span style="color: #666;">■</span> Albums)${getSortIndicator('tracks')}</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        const totalTracksSum = yearData.reduce((sum, d) => sum + d.tracks, 0);
        const totalAlbumsSum = yearData.reduce((sum, d) => sum + d.albums, 0);

        sortedData.forEach(d => {
            const trackPct = (d.tracks / maxTracks) * 100;
            const albumPct = (d.albums / maxAlbums) * 100;
            const trackShare = ((d.tracks / totalTracksSum) * 100).toFixed(1);
            const albumShare = ((d.albums / totalAlbumsSum) * 100).toFixed(1);

            html += `
                <tr>
                    <td>${d.year}</td>
                    <td>
                        <div class="bar-container">
                            <div class="bar-row" title="${d.tracks} tracks (${trackShare}%)">
                                <span class="bar-label-left">T:</span>
                                <div class="bar-bg">
                                    <div class="bar-fill track-fill" style="width: ${trackPct}%;"></div>
                                </div>
                                <span class="bar-label-right">${d.tracks} (${trackShare}%)</span>
                            </div>
                            <div class="bar-row" title="${d.albums} albums (${albumShare}%)">
                                <span class="bar-label-left">A:</span>
                                <div class="bar-bg">
                                    <div class="bar-fill album-fill" style="width: ${albumPct}%;"></div>
                                </div>
                                <span class="bar-label-right">${d.albums} (${albumShare}%)</span>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Re-attach sort events
        container.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const clickedKey = th.getAttribute('data-sort');
                if (sortKey === clickedKey) {
                    sortAsc = !sortAsc;
                } else {
                    sortKey = clickedKey;
                    sortAsc = true;
                }
                render();
            });
        });
    }

    render();
}

function populateQualityStats(tracks) {
    const container = document.getElementById('quality-stats-container');
    if (!container) return;

    let totalWithBitrate = 0;
    const stats = {
        lossless: 0,
        mp3_320: 0,
        lossy_med: 0,
        lossy_low: 0
    };

    tracks.forEach(track => {
        const br = parseInt(track.bitrate, 10);
        if (!br || isNaN(br)) return;
        totalWithBitrate++;
        if (br > 320) {
            stats.lossless++;
        } else if (br === 320) {
            stats.mp3_320++;
        } else if (br >= 192) {
            stats.lossy_med++;
        } else {
            stats.lossy_low++;
        }
    });

    if (totalWithBitrate === 0) return;

    const losslessPct = ((stats.lossless / totalWithBitrate) * 100).toFixed(1);
    const mp3320Pct = ((stats.mp3_320 / totalWithBitrate) * 100).toFixed(1);
    const lossyMedPct = ((stats.lossy_med / totalWithBitrate) * 100).toFixed(1);
    const lossyLowPct = ((stats.lossy_low / totalWithBitrate) * 100).toFixed(1);

    const html = `
        <div class="quality-stats-section">
            <div class="quality-stats-title">Audio Quality Breakdown</div>
            <div class="quality-bar-wrapper">
                <div class="quality-bar-container">
                    <div class="quality-segment lossless-segment" style="width: ${losslessPct}%;" title="Lossless / FLAC: ${losslessPct}% (${stats.lossless.toLocaleString()} tracks)"></div>
                    <div class="quality-segment mp3-320-segment" style="width: ${mp3320Pct}%;" title="320 kbps MP3: ${mp3320Pct}% (${stats.mp3_320.toLocaleString()} tracks)"></div>
                    <div class="quality-segment lossy-med-segment" style="width: ${lossyMedPct}%;" title="192-256 kbps MP3: ${lossyMedPct}% (${stats.lossy_med.toLocaleString()} tracks)"></div>
                    <div class="quality-segment lossy-low-segment" style="width: ${lossyLowPct}%;" title="&lt;192 kbps MP3: ${lossyLowPct}% (${stats.lossy_low.toLocaleString()} tracks)"></div>
                </div>
                <div class="quality-legend">
                    <div class="quality-legend-item">
                        <div class="legend-header">
                            <span class="legend-dot lossless-dot"></span>
                            <span>Lossless (FLAC)</span>
                        </div>
                        <div class="legend-stats">
                            <span class="legend-pct">${losslessPct}%</span>
                            <span>(${stats.lossless.toLocaleString()} tracks)</span>
                        </div>
                    </div>
                    <div class="quality-legend-item">
                        <div class="legend-header">
                            <span class="legend-dot mp3-320-dot"></span>
                            <span>320 kbps MP3</span>
                        </div>
                        <div class="legend-stats">
                            <span class="legend-pct">${mp3320Pct}%</span>
                            <span>(${stats.mp3_320.toLocaleString()} tracks)</span>
                        </div>
                    </div>
                    <div class="quality-legend-item">
                        <div class="legend-header">
                            <span class="legend-dot lossy-med-dot"></span>
                            <span>192-256 kbps</span>
                        </div>
                        <div class="legend-stats">
                            <span class="legend-pct">${lossyMedPct}%</span>
                            <span>(${stats.lossy_med.toLocaleString()} tracks)</span>
                        </div>
                    </div>
                    <div class="quality-legend-item">
                        <div class="legend-header">
                            <span class="legend-dot lossy-low-dot"></span>
                            <span>&lt;192 kbps</span>
                        </div>
                        <div class="legend-stats">
                            <span class="legend-pct">${lossyLowPct}%</span>
                            <span>(${stats.lossy_low.toLocaleString()} tracks)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function populateRatingStats(tracks) {
    const container = document.getElementById('rating-stats-container');
    if (!container) return;

    // Count tracks per rating (1 to 5)
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRated = 0;

    tracks.forEach(track => {
        const r = parseInt(track.rating, 10);
        if (!r || isNaN(r) || r < 1 || r > 5) return;
        ratingCounts[r]++;
        totalRated++;
    });

    if (totalRated === 0) return;

    // Convert ratingCounts to array for rendering (usually sorted descending by rating 5 down to 1)
    const ratingData = [5, 4, 3, 2, 1].map(r => ({
        rating: r,
        count: ratingCounts[r]
    }));

    // Sort configuration (default: rating descending)
    let sortKey = 'rating';
    let sortAsc = false;

    function render() {
        const maxCount = Math.max(...ratingData.map(d => d.count), 1);

        // Sort data copy
        const sortedData = [...ratingData].sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];
            if (sortAsc) {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });

        const getSortIndicator = (key) => {
            if (sortKey !== key) return '';
            return sortAsc ? ' ▲' : ' ▼';
        };

        const renderStars = (rating) => {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= rating) {
                    stars += '★';
                } else {
                    stars += '<span class="empty-star">☆</span>';
                }
            }
            return stars;
        };

        const ratingLabels = {
            5: 'Certified banger',
            4: 'Pretty good',
            3: 'Mid',
            2: 'Okay pass the aux pls',
            1: 'Ambient/downtempo'
        };

        let html = `
            <div class="rating-stats-section">
                <div class="rating-stats-title">Rating Distribution</div>
                <div class="year-stats-table-wrapper">
                    <table class="rating-stats-table">
                        <thead>
                            <tr>
                                <th class="sortable ${sortKey === 'rating' ? 'sorted-column' : ''}" data-sort="rating" style="width: 250px;">Rating${getSortIndicator('rating')}</th>
                                <th class="sortable ${sortKey === 'count' ? 'sorted-column' : ''}" data-sort="count">Distribution${getSortIndicator('count')}</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        const totalRatedCount = ratingData.reduce((sum, d) => sum + d.count, 0);

        sortedData.forEach(d => {
            const pct = (d.count / maxCount) * 100;
            const sharePct = ((d.count / totalRatedCount) * 100).toFixed(1);

            html += `
                <tr>
                    <td class="rating-stars-cell"><span class="rating-description">${ratingLabels[d.rating]}</span>${renderStars(d.rating)}</td>
                    <td>
                        <div class="rating-bar-row">
                            <div class="rating-bar-bg">
                                <div class="rating-bar-fill" style="width: ${pct}%;"></div>
                            </div>
                            <span class="bar-label-right">${d.count} (${sharePct}%)</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Re-attach sort events
        container.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const clickedKey = th.getAttribute('data-sort');
                if (sortKey === clickedKey) {
                    sortAsc = !sortAsc;
                } else {
                    sortKey = clickedKey;
                    sortAsc = true;
                }
                render();
            });
        });
    }

    render();
}

function populateBpmStats(tracks) {
    const container = document.getElementById('bpm-stats-container');
    if (!container) return;

    const tempoBands = [
        { id: 'b0', order: 0, label: '< 110',   desc: 'Ambient / Downtempo', match: b => b < 110 },
        { id: 'b1', order: 1, label: '110-124', desc: 'Chill / Midtempo',    match: b => b >= 110 && b <= 124 },
        { id: 'b2', order: 2, label: '125-129', desc: 'Deep / Prog House',   match: b => b >= 125 && b <= 129 },
        { id: 'b3', order: 3, label: '130-134', desc: 'Progressive Psy',     match: b => b >= 130 && b <= 134 },
        { id: 'b4', order: 4, label: '135-137', desc: 'Groove / Morning',    match: b => b >= 135 && b <= 137 },
        { id: 'b5', order: 5, label: '138-140', desc: 'Classic Psy / Full-On', match: b => b >= 138 && b <= 140 },
        { id: 'b6', order: 6, label: '141-144', desc: 'Driving Full-On',     match: b => b >= 141 && b <= 144 },
        { id: 'b7', order: 7, label: '145-148', desc: 'Fast Full-On / Night', match: b => b >= 145 && b <= 148 },
        { id: 'b8', order: 8, label: '149+',    desc: 'Darkpsy / Hi-Tech',   match: b => b >= 149 }
    ];

    let viewMode = 'bands'; // 'bands' | 'exact'
    let sortKey = 'order';
    let sortAsc = true;

    function buildRows() {
        const defs = [];
        if (viewMode === 'bands') {
            tempoBands.forEach(b => defs.push(b));
        } else {
            defs.push({ id: 'lt124', order: 123, label: '< 124', desc: 'Sub-124 BPM', match: b => b < 124 });
            for (let bpm = 124; bpm <= 150; bpm++) {
                defs.push({ id: `bpm_${bpm}`, order: bpm, label: `${bpm} BPM`, desc: '', match: b => b === bpm });
            }
            defs.push({ id: 'gt150', order: 151, label: '151+', desc: '151+ BPM', match: b => b > 150 });
        }

        const buckets = defs.map(d => ({
            ...d,
            tracks: 0,
            bangers: 0,
            ratingSum: 0,
            ratedCount: 0
        }));

        tracks.forEach(t => {
            const bpm = parseInt(t.bpm, 10);
            if (!bpm || isNaN(bpm)) return;
            const bucket = buckets.find(b => b.match(bpm));
            if (!bucket) return;
            bucket.tracks++;
            const r = parseInt(t.rating, 10);
            if (r && !isNaN(r)) {
                bucket.ratingSum += r;
                bucket.ratedCount++;
                if (r === 5) bucket.bangers++;
            }
        });

        return buckets.map(b => ({
            ...b,
            meanRating: b.ratedCount > 0 ? b.ratingSum / b.ratedCount : 0
        }));
    }

    function render() {
        const rows = buildRows();
        const totalTracksSum = rows.reduce((s, r) => s + r.tracks, 0) || 1;
        const maxTracks = Math.max(...rows.map(r => r.tracks), 1);
        const maxBangers = Math.max(...rows.map(r => r.bangers), 1);

        const sortedRows = [...rows].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            return sortAsc ? valA - valB : valB - valA;
        });

        const getSortIndicator = (key) => {
            if (sortKey !== key) return '';
            return sortAsc ? ' ▲' : ' ▼';
        };

        let html = `
            <div class="year-stats-section">
                <div class="stats-header-bar">
                    <div class="year-stats-title" style="margin-bottom: 0;">BPM Distribution</div>
                    <div class="terminal-toggle-group">
                        <button type="button" class="terminal-toggle-btn ${viewMode === 'bands' ? 'active' : ''}" data-mode="bands">[ TEMPO BANDS ]</button>
                        <button type="button" class="terminal-toggle-btn ${viewMode === 'exact' ? 'active' : ''}" data-mode="exact">[ EXACT BPM (124-150) ]</button>
                    </div>
                </div>
                <div class="year-stats-table-wrapper">
                    <table class="year-stats-table bpm-stats-table">
                        <thead>
                            <tr>
                                <th class="sortable ${sortKey === 'order' ? 'sorted-column' : ''}" data-sort="order" style="width: ${viewMode === 'bands' ? '230px' : '110px'};">BPM${getSortIndicator('order')}</th>
                                <th class="sortable ${sortKey === 'tracks' ? 'sorted-column' : ''}" data-sort="tracks">Distribution (<span style="color: #4a8;">■</span> Tracks / <span style="color: #00ff66;">★</span> 5★ Bangers)${getSortIndicator('tracks')}</th>
                                <th class="sortable ${sortKey === 'bangers' ? 'sorted-column' : ''}" data-sort="bangers" style="width: 95px;">5★ Count${getSortIndicator('bangers')}</th>
                                <th class="sortable ${sortKey === 'meanRating' ? 'sorted-column' : ''}" data-sort="meanRating" style="width: 85px;">Mean ★${getSortIndicator('meanRating')}</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        sortedRows.forEach(d => {
            const trackPct = (d.tracks / maxTracks) * 100;
            const bangerPct = (d.bangers / maxBangers) * 100;
            const trackShare = ((d.tracks / totalTracksSum) * 100).toFixed(1);
            const bangerRate = d.tracks > 0 ? ((d.bangers / d.tracks) * 100).toFixed(1) : '0.0';
            const meanStr = d.ratedCount > 0 ? d.meanRating.toFixed(2) : '-';

            html += `
                <tr>
                    <td class="bpm-label-cell">
                        <span class="bpm-range-text">${d.label}</span>
                        ${d.desc ? `<span class="bpm-desc-text">${d.desc}</span>` : ''}
                    </td>
                    <td>
                        <div class="bar-container">
                            <div class="bar-row" title="${d.tracks} tracks (${trackShare}% of collection)">
                                <span class="bar-label-left">T:</span>
                                <div class="bar-bg">
                                    <div class="bar-fill track-fill" style="width: ${trackPct}%;"></div>
                                </div>
                                <span class="bar-label-right">${d.tracks} (${trackShare}%)</span>
                            </div>
                            <div class="bar-row" title="${d.bangers} 5★ bangers (${bangerRate}% of band)">
                                <span class="bar-label-left" style="color: #00ff66;">5★:</span>
                                <div class="bar-bg">
                                    <div class="bar-fill banger-fill" style="width: ${bangerPct}%;"></div>
                                </div>
                                <span class="bar-label-right">${d.bangers} (${bangerRate}%)</span>
                            </div>
                        </div>
                    </td>
                    <td class="text-right" style="color: #00ff66;">${d.bangers}</td>
                    <td class="text-right">${meanStr}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;

        container.querySelectorAll('.terminal-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextMode = btn.getAttribute('data-mode');
                if (nextMode && nextMode !== viewMode) {
                    viewMode = nextMode;
                    render();
                }
            });
        });

        container.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const clickedKey = th.getAttribute('data-sort');
                if (sortKey === clickedKey) {
                    sortAsc = !sortAsc;
                } else {
                    sortKey = clickedKey;
                    sortAsc = clickedKey === 'order';
                }
                render();
            });
        });
    }

    render();
}

function populateKeyBpmMatrix(tracks) {
    const container = document.getElementById('key-bpm-matrix-container');
    if (!container) return;

    const bpmCols = [
        { id: 'c0', label: '<125',    match: b => b < 125 },
        { id: 'c1', label: '125-129', match: b => b >= 125 && b <= 129 },
        { id: 'c2', label: '130-133', match: b => b >= 130 && b <= 133 },
        { id: 'c3', label: '134-136', match: b => b >= 134 && b <= 136 },
        { id: 'c4', label: '137-139', match: b => b >= 137 && b <= 139 },
        { id: 'c5', label: '140-142', match: b => b >= 140 && b <= 142 },
        { id: 'c6', label: '143-145', match: b => b >= 143 && b <= 145 },
        { id: 'c7', label: '146+',    match: b => b >= 146 }
    ];

    let metricMode = 'tracks'; // 'tracks' | 'bangers'
    let keyFilter = 'all';     // 'minor' | 'major' | 'all'
    let selectedCell = null;   // { keyId, colId, label }

    function getKeyList() {
        const minorKeys = Array.from({ length: 12 }, (_, i) => `${i + 1}m`);
        const majorKeys = Array.from({ length: 12 }, (_, i) => `${i + 1}d`);
        if (keyFilter === 'minor') return minorKeys;
        if (keyFilter === 'major') return majorKeys;
        return [...minorKeys, ...majorKeys];
    }

    function render() {
        const keyList = getKeyList();
        const cellMap = {};
        keyList.forEach(k => {
            cellMap[k] = {};
            bpmCols.forEach(c => {
                cellMap[k][c.id] = [];
            });
        });

        tracks.forEach(t => {
            const normKey = normalizeOpenKey(t.key);
            const bpm = parseInt(t.bpm, 10);
            if (!normKey || !bpm || isNaN(bpm)) return;
            if (!cellMap[normKey]) return;
            if (metricMode === 'bangers' && t.rating !== 5) return;
            const col = bpmCols.find(c => c.match(bpm));
            if (col) {
                cellMap[normKey][col.id].push(t);
            }
        });

        let maxCellCount = 1;
        const colTotals = {};
        bpmCols.forEach(c => { colTotals[c.id] = 0; });
        let grandTotal = 0;

        keyList.forEach(k => {
            bpmCols.forEach(c => {
                const cnt = cellMap[k][c.id].length;
                if (cnt > maxCellCount) maxCellCount = cnt;
                colTotals[c.id] += cnt;
                grandTotal += cnt;
            });
        });

        let html = `
            <div class="year-stats-section">
                <div class="stats-header-bar">
                    <div class="year-stats-title" style="margin-bottom: 0;">2D Key × BPM Heatmap Matrix</div>
                    <div class="terminal-toggle-group">
                        <button type="button" class="terminal-toggle-btn ${metricMode === 'tracks' ? 'active' : ''}" data-metric="tracks">[ ALL TRACKS ]</button>
                        <button type="button" class="terminal-toggle-btn ${metricMode === 'bangers' ? 'active' : ''}" data-metric="bangers">[ 5★ BANGERS ]</button>
                        <span class="toggle-divider">|</span>
                        <button type="button" class="terminal-toggle-btn ${keyFilter === 'all' ? 'active' : ''}" data-kfilter="all">[ ALL 24 KEYS ]</button>
                        <button type="button" class="terminal-toggle-btn ${keyFilter === 'minor' ? 'active' : ''}" data-kfilter="minor">[ MINOR (1m-12m) ]</button>
                        <button type="button" class="terminal-toggle-btn ${keyFilter === 'major' ? 'active' : ''}" data-kfilter="major">[ MAJOR (1d-12d) ]</button>
                    </div>
                </div>
                <div class="matrix-subtitle">Click any cell to inspect tracks in that Key × BPM window. Keys normalized to Traktor Open Key (with musical equivalents).</div>
                <div class="year-stats-table-wrapper">
                    <table class="key-bpm-matrix-table">
                        <thead>
                            <tr>
                                <th class="matrix-key-header">KEY</th>
                                ${bpmCols.map(c => `<th>${c.label}</th>`).join('')}
                                <th class="matrix-total-header">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        keyList.forEach(k => {
            const musical = OPEN_KEY_MUSICAL[k] || '';
            let rowTotal = 0;
            let cellsHtml = '';

            bpmCols.forEach(c => {
                const matching = cellMap[k][c.id];
                const cnt = matching.length;
                rowTotal += cnt;
                const intensity = cnt > 0 ? Math.max(0.10, (cnt / maxCellCount) * 0.85) : 0;
                const bgStyle = cnt > 0 ? `background: rgba(68, 170, 136, ${intensity.toFixed(3)});` : '';
                const isPeak = cnt > 0 && cnt >= maxCellCount * 0.65;
                const isSelected = selectedCell && selectedCell.keyId === k && selectedCell.colId === c.id;
                const cellClass = [
                    'matrix-cell',
                    cnt === 0 ? 'matrix-cell-empty' : 'matrix-cell-filled',
                    isPeak ? 'matrix-cell-peak' : '',
                    isSelected ? 'matrix-cell-selected' : ''
                ].filter(Boolean).join(' ');

                cellsHtml += `
                    <td class="${cellClass}" style="${bgStyle}" data-key="${k}" data-col="${c.id}" title="${k} (${musical}) @ ${c.label} BPM: ${cnt} ${metricMode === 'bangers' ? '5★ bangers' : 'tracks'}">
                        ${cnt === 0 ? '·' : cnt}
                    </td>
                `;
            });

            html += `
                <tr>
                    <td class="matrix-key-cell" data-key-row="${k}" title="Click to view all tracks in ${k} (${musical})">
                        <span class="open-key-code">${k}</span>
                        <span class="musical-key-code">${musical}</span>
                    </td>
                    ${cellsHtml}
                    <td class="matrix-row-total" data-key-row="${k}">${rowTotal}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <td class="matrix-total-label">TOTAL</td>
                                ${bpmCols.map(c => `<td class="matrix-col-total">${colTotals[c.id]}</td>`).join('')}
                                <td class="matrix-grand-total">${grandTotal}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
        `;

        if (selectedCell) {
            let matchingTracks = [];
            if (selectedCell.colId === 'ALL' && cellMap[selectedCell.keyId]) {
                bpmCols.forEach(c => {
                    matchingTracks.push(...cellMap[selectedCell.keyId][c.id]);
                });
            } else if (cellMap[selectedCell.keyId] && cellMap[selectedCell.keyId][selectedCell.colId]) {
                matchingTracks = [...cellMap[selectedCell.keyId][selectedCell.colId]];
            }

            matchingTracks.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (a.bpm || 0) - (b.bpm || 0));

            html += `
                <div class="matrix-drilldown">
                    <div class="matrix-drilldown-header">
                        <span>SELECTION: <b>${selectedCell.label}</b> (${matchingTracks.length} ${metricMode === 'bangers' ? '5★ bangers' : 'tracks'})</span>
                        <button type="button" class="terminal-toggle-btn" id="clear-matrix-drilldown">[ × CLEAR ]</button>
                    </div>
                    <div class="matrix-drilldown-list">
                        <table class="year-stats-table" style="max-width: 100%;">
                            <thead>
                                <tr>
                                    <th>TITLE</th>
                                    <th>ARTIST</th>
                                    <th>ALBUM</th>
                                    <th style="width: 55px;">YEAR</th>
                                    <th style="width: 55px;">BPM</th>
                                    <th style="width: 55px;">KEY</th>
                                    <th style="width: 65px;">RATING</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${matchingTracks.slice(0, 50).map(t => `
                                    <tr>
                                        <td>${t.title || ''}</td>
                                        <td>${t.artist || ''}</td>
                                        <td>${t.album || ''}</td>
                                        <td>${t.date || ''}</td>
                                        <td>${t.bpm || ''}</td>
                                        <td>${t.key || ''}</td>
                                        <td style="color: #4a8;">${'★'.repeat(t.rating || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${matchingTracks.length > 50 ? `<div class="matrix-drilldown-more">Showing top 50 of ${matchingTracks.length} tracks (sorted by rating).</div>` : ''}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;

        container.querySelectorAll('[data-metric]').forEach(btn => {
            btn.addEventListener('click', () => {
                metricMode = btn.getAttribute('data-metric');
                render();
            });
        });

        container.querySelectorAll('[data-kfilter]').forEach(btn => {
            btn.addEventListener('click', () => {
                keyFilter = btn.getAttribute('data-kfilter');
                selectedCell = null;
                render();
            });
        });

        container.querySelectorAll('.matrix-cell-filled').forEach(cell => {
            cell.addEventListener('click', () => {
                const k = cell.getAttribute('data-key');
                const c = cell.getAttribute('data-col');
                const colObj = bpmCols.find(col => col.id === c);
                const musical = OPEN_KEY_MUSICAL[k] || '';
                if (selectedCell && selectedCell.keyId === k && selectedCell.colId === c) {
                    selectedCell = null;
                } else {
                    selectedCell = {
                        keyId: k,
                        colId: c,
                        label: `${k} (${musical}) @ ${colObj ? colObj.label : ''} BPM`
                    };
                }
                render();
            });
        });

        container.querySelectorAll('[data-key-row]').forEach(rowEl => {
            rowEl.addEventListener('click', () => {
                const k = rowEl.getAttribute('data-key-row');
                const musical = OPEN_KEY_MUSICAL[k] || '';
                if (selectedCell && selectedCell.keyId === k && selectedCell.colId === 'ALL') {
                    selectedCell = null;
                } else {
                    selectedCell = {
                        keyId: k,
                        colId: 'ALL',
                        label: `${k} (${musical}) — All BPMs`
                    };
                }
                render();
            });
        });

        const clearBtn = container.querySelector('#clear-matrix-drilldown');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                selectedCell = null;
                render();
            });
        }
    }

    render();
}

function initCollapsibleSections() {
    const headers = document.querySelectorAll('.section-header');
    headers.forEach(header => {
        const titleText = header.textContent.trim();
        const content = header.nextElementSibling;
        if (!content) return;

        const isCurrentlyCollapsed = content.classList.contains('collapsed');
        
        header.innerHTML = `
            <span class="header-title">${titleText}</span>
            <span class="header-toggle">${isCurrentlyCollapsed ? '[ + ]' : '[ - ]'}</span>
        `;
        
        header.addEventListener('click', () => {
            const isCollapsed = content.classList.toggle('collapsed');
            const toggleSpan = header.querySelector('.header-toggle');
            if (toggleSpan) {
                toggleSpan.textContent = isCollapsed ? '[ + ]' : '[ - ]';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const tracks = await loadMusicData();
    populateTrackList(tracks);
    populateStats(tracks);
    populateYearStats(tracks);
    populateQualityStats(tracks);
    populateRatingStats(tracks);
    populateBpmStats(tracks);
    populateKeyBpmMatrix(tracks);
    makeTrackHeaderSortable(tracks);
    initSetExplorer(tracks);
    initCollapsibleSections();
});
