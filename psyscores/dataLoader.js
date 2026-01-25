export async function loadMusicData() {
    const response = await fetch('ss_songs.json');
    const tracks = await response.json();
    return tracks;
}
