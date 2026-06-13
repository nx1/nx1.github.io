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
                    return sortState.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                // Fallback
                return 0;
            });
            populateTrackList(tracks);
        });
    });
}

function populateStats(tracks) {
    const totalTracks = tracks.length;
    
    // Unique albums (filtering out blank/null/undefined names)
    const uniqueAlbums = new Set(tracks.map(t => t.album).filter(Boolean)).size;
    
    // Unique artists (filtering out blank/null/undefined names)
    const uniqueArtists = new Set(tracks.map(t => t.artist).filter(Boolean)).size;
    
    // Unique labels (filtering out blank/null/undefined names)
    const uniqueLabels = new Set(tracks.map(t => t.label).filter(Boolean)).size;
    
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
    makeTrackHeaderSortable(tracks);
    initSetExplorer(tracks);
    initCollapsibleSections();
});
