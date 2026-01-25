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

document.addEventListener('DOMContentLoaded', async () => {
    const tracks = await loadMusicData();
    populateTrackList(tracks);
    makeTrackHeaderSortable(tracks);
    initSetExplorer(tracks);
});
