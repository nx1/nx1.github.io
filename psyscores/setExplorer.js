const state = {
    selectedCategories: new Set(['album']),
    tracks: [],
    aggregatedData: [],
    aggregationSortState: { key: null, asc: true },
};

const CATEGORICAL_COLUMNS = [
    { displayName: 'Artist', dataKey: 'artist' },
    { displayName: 'Album Artist', dataKey: 'album_artist' },
    { displayName: 'Album', dataKey: 'album' },
    { displayName: 'Label', dataKey: 'label' },
    { displayName: 'Catalog', dataKey: 'catalog' },
    { displayName: 'Year', dataKey: 'date' }
];

function calculateAggregations(group) {
    const ratings = group.map(track => track.rating).filter(r => typeof r === 'number');
    if (ratings.length === 0) {
        return { min: 'N/A', max: 'N/A', mean: 'N/A', count: group.length };
    }
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const sum = ratings.reduce((a, b) => a + b, 0);
    const mean = (sum / ratings.length).toFixed(2);
    return { min, max, mean, count: group.length };
}

function groupBy(data, keys) {
    return data.reduce((acc, item) => {
        const key = keys.map(k => item[k]).join(' | ');
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {});
}

function renderAggregationTable() {
    const container = document.getElementById('set-aggregations');
    if (!container) return;

    const selectedCatObjects = CATEGORICAL_COLUMNS.filter(c => state.selectedCategories.has(c.dataKey));
    const isAlbumSelected = state.selectedCategories.has('album');

    let tableHtml = '<table><thead><tr id="aggregation-header">';
    
    if (isAlbumSelected) {
        tableHtml += '<th>Album Art</th>';
    }

    selectedCatObjects.forEach(cat => {
        tableHtml += `<th class="category-column" data-sort-key="${cat.dataKey}">${cat.displayName}</th>`;
    });

    const aggregationHeaders = [
        { displayName: 'Min Rating', key: 'min' },
        { displayName: 'Max Rating', key: 'max' },
        { displayName: 'Mean Rating', key: 'mean' },
        { displayName: 'Count', key: 'count' },
    ];

    aggregationHeaders.forEach(header => {
        tableHtml += `<th data-sort-key="${header.key}">${header.displayName}</th>`;
    });

    tableHtml += '</tr></thead><tbody>';

    state.aggregatedData.forEach(row => {
        tableHtml += '<tr>';
        if (isAlbumSelected) {
            tableHtml += `<td><img src="${row.image_path}" class="table-album-art"></td>`;
        }
        selectedCatObjects.forEach(cat => {
            tableHtml += `<td class="category-column">${row.keys[cat.dataKey]}</td>`;
        });
        tableHtml += `
            <td>${row.aggregations.min}</td>
            <td>${row.aggregations.max}</td>
            <td>${row.aggregations.mean}</td>
            <td>${row.aggregations.count}</td>
        </tr>`;
    });

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
    makeAggregationHeaderSortable();
}

function processAndRenderAggregations() {
    const selectedCategories = Array.from(state.selectedCategories);
    const groups = groupBy(state.tracks, selectedCategories);
    
    state.aggregatedData = Object.keys(groups).map(key => {
        const keyParts = key.split(' | ');
        const keys = {};
        selectedCategories.forEach((cat, i) => keys[cat] = keyParts[i]);
        
        const rowData = {
            keys,
            aggregations: calculateAggregations(groups[key])
        };

        if (state.selectedCategories.has('album')) {
            const firstTrack = groups[key][0];
            rowData.image_path = firstTrack.image_path;
        }

        return rowData;
    });

    // Apply sorting
    const { key, asc } = state.aggregationSortState;
    if (key) {
        state.aggregatedData.sort((a, b) => {
            const aVal = selectedCategories.includes(key) ? a.keys[key] : a.aggregations[key];
            const bVal = selectedCategories.includes(key) ? b.keys[key] : b.aggregations[key];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return asc ? aVal - bVal : bVal - aVal;
            }
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return 0;
        });
    }

    renderAggregationTable();
}

function makeAggregationHeaderSortable() {
    const header = document.getElementById('aggregation-header');
    if (!header) return;

    header.querySelectorAll('th').forEach(cell => {
        const sortKey = cell.dataset.sortKey;
        if (!sortKey) return;
        
        cell.style.cursor = 'pointer';
        if (state.aggregationSortState.key === sortKey) {
            cell.classList.add('sorted-column');
            cell.classList.add(state.aggregationSortState.asc ? 'sort-asc' : 'sort-desc');
        }

        cell.addEventListener('click', () => {
            if (state.aggregationSortState.key === sortKey) {
                state.aggregationSortState.asc = !state.aggregationSortState.asc;
            } else {
                state.aggregationSortState.key = sortKey;
                state.aggregationSortState.asc = true;
            }
            processAndRenderAggregations();
        });
    });
}

function toggleCategory(category, element) {
    const dataKey = category.dataKey;
    if (state.selectedCategories.has(dataKey)) {
        if (state.selectedCategories.size > 1) {
            state.selectedCategories.delete(dataKey);
            element.classList.remove('selected');
        }
    } else {
        state.selectedCategories.add(dataKey);
        element.classList.add('selected');
    }
    processAndRenderAggregations();
}

function renderCategories() {
    const container = document.getElementById('categories');
    if (!container) return;

    container.innerHTML = '';
    CATEGORICAL_COLUMNS.forEach(category => {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.textContent = category.displayName;
        div.dataset.category = category.dataKey;
        if (state.selectedCategories.has(category.dataKey)) {
            div.classList.add('selected');
        }
        div.onclick = () => toggleCategory(category, div);
        container.appendChild(div);
    });
}

export function initSetExplorer(tracks) {
    state.tracks = tracks;
    renderCategories();
    processAndRenderAggregations();
}
