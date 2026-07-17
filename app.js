// アーカイブ公開する6つの音源リスト（ファイル名、表示タイトル、画像名）
const ARCHIVE_TRACKS = [
    { id: "archive_01", number: "01", title: "水の音", fileName: "1.mp3", imageName: "1.jpeg" },
    { id: "archive_02", number: "02", title: "夜の森", fileName: "2.mp3", imageName: "2.jpeg" },
    { id: "archive_03", number: "03", title: "風の音", fileName: "3.mp3", imageName: "3.jpeg" },
    { id: "archive_04", number: "04", title: "森の音", fileName: "4.mp3", imageName: "4.jpeg" },
    { id: "archive_05", number: "05", title: "さえずり", fileName: "5.mp3", imageName: "5.jpeg" },
    { id: "archive_06", number: "06", title: "ゆらぎ", fileName: "6.mp3", imageName: "6.jpeg" }
];

let audioCtx = null;
let currentPlayingTrack = null; 

async function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

function buildPlaylist() {
    const playlistContainer = document.getElementById('archive-playlist');
    playlistContainer.innerHTML = "";

    ARCHIVE_TRACKS.forEach(track => {
        track.buffer = null;
        track.source = null;
        track.isPlaying = false;
        track.isLooping = true; 

        const item = document.createElement('div');
        item.className = 'track-item';
        item.innerHTML = `
            <div class="track-left-block">
                <!-- トラックごとの画像アイコン -->
                <div class="track-image-wrapper">
                    <img src="assets/images/${track.imageName}" alt="${track.title}" class="track-icon-img">
                </div>
                <div class="track-info-block">
                    <span class="track-num-badge">TRACK ${track.number}</span>
                    <span class="track-title-text">${track.title}</span>
                </div>
            </div>
            <div class="track-controls">
                <button class="action-btn loop-btn active" data-id="${track.id}">Loop: ON</button>
                <button class="action-btn play-btn" data-id="${track.id}">再生</button>
            </div>
        `;
        playlistContainer.appendChild(item);
    });

    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const trackId = e.target.getAttribute('data-id');
            const track = ARCHIVE_TRACKS.find(t => t.id === trackId);
            if (track) {
                await initAudioContext();
                toggleTrackPlayback(track, e.target);
            }
        });
    });

    document.querySelectorAll('.loop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trackId = e.target.getAttribute('data-id');
            const track = ARCHIVE_TRACKS.find(t => t.id === trackId);
            if (track) {
                track.isLooping = !track.isLooping;
                e.target.innerText = `Loop: ${track.isLooping ? 'ON' : 'OFF'}`;
                e.target.classList.toggle('active', track.isLooping);
                
                if (track.source) {
                    track.source.loop = track.isLooping;
                }
            }
        });
    });
}

async function toggleTrackPlayback(track, playButton) {
    if (currentPlayingTrack && currentPlayingTrack !== track) {
        forceStopTrack(currentPlayingTrack);
    }

    if (track.isPlaying) {
        forceStopTrack(track);
    } else {
        playButton.innerText = "読込中...";
        playButton.style.opacity = "0.5";

        try {
            if (!track.buffer) {
                const response = await fetch(`assets/sounds/${track.fileName}`);
                if (!response.ok) throw new Error("音源データの取得に失敗しました");
                const arrayBuffer = await response.arrayBuffer();
                track.buffer = await audioCtx.decodeAudioData(arrayBuffer);
            }

            track.source = audioCtx.createBufferSource();
            track.source.buffer = track.buffer;
            track.source.loop = track.isLooping;
            track.source.connect(audioCtx.destination);

            track.source.onended = () => {
                if (!track.source.loop) {
                    track.isPlaying = false;
                    playButton.innerText = "再生";
                    playButton.classList.remove('active');
                    if (currentPlayingTrack === track) currentPlayingTrack = null;
                }
            };

            track.source.start(0);
            track.isPlaying = true;
            currentPlayingTrack = track;

            playButton.innerText = "停止";
            playButton.classList.add('active');
            playButton.style.opacity = "1";

        } catch (error) {
            console.error(error);
            alert("音源の再生処理中にエラーが発生しました。");
            playButton.innerText = "再生";
            playButton.style.opacity = "1";
        }
    }
}

function forceStopTrack(track) {
    if (track.source) {
        try {
            track.source.stop();
        } catch (e) {}
        track.source = null;
    }
    track.isPlaying = false;
    
    const playButton = document.querySelector(`.play-btn[data-id="${track.id}"]`);
    if (playButton) {
        playButton.innerText = "再生";
        playButton.classList.remove('active');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    buildPlaylist();
});

document.body.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}, true);
