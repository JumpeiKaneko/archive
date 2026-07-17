// アーカイブ公開する6つの音源リスト（指定の順序：6, 5, 4, 2, 1, 3）
const ARCHIVE_TRACKS = [
    { id: "archive_06", fileName: "6.mp3", imageName: "6.jpg" },
    { id: "archive_05", fileName: "5.mp3", imageName: "5.jpg" },
    { id: "archive_04", fileName: "4.mp3", imageName: "4.jpg" },
    { id: "archive_02", fileName: "2.mp3", imageName: "2.jpg" },
    { id: "archive_01", fileName: "1.mp3", imageName: "1.jpg" },
    { id: "archive_03", fileName: "3.mp3", imageName: "3.jpg" }
];

let audioCtx = null;
let currentPlayingTrack = null; // 現在再生中のトラックを管理

// 音声処理システム（Web Audio API）の初期化
async function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

// プレイリストのUIを組み立てて表示
function buildPlaylist() {
    const playlistContainer = document.getElementById('archive-playlist');
    playlistContainer.innerHTML = "";

    ARCHIVE_TRACKS.forEach(track => {
        // 各トラックの状態パラメータをセット（デフォルトでループ再生を有効化）
        track.buffer = null;
        track.source = null;
        track.isPlaying = false;
        track.isLooping = true; 

        const item = document.createElement('div');
        item.className = 'track-item';
        // ★修正点：画像の取得パスを assets/ 直下に合わせました
        item.innerHTML = `
            <div class="track-left-block">
                <!-- トラックごとの画像アイコン -->
                <div class="track-image-wrapper">
                    <img src="assets/${track.imageName}" alt="" class="track-icon-img">
                </div>
            </div>
            <div class="track-controls">
                <button class="action-btn play-btn" data-id="${track.id}">再生</button>
            </div>
        `;
        playlistContainer.appendChild(item);
    });

    // イベントの紐付け
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
}

// 再生と停止の切り替え処理
async function toggleTrackPlayback(track, playButton) {
    // 他のトラックがすでに再生している場合は、排他処理として先に止める
    if (currentPlayingTrack && currentPlayingTrack !== track) {
        forceStopTrack(currentPlayingTrack);
    }

    if (track.isPlaying) {
        forceStopTrack(track);
    } else {
        playButton.innerText = "読込中...";
        playButton.style.opacity = "0.5";

        try {
            // キャッシュがない場合のみ新規に音声ファイルをロードしてデコード
            if (!track.buffer) {
                const response = await fetch(`assets/${track.fileName}`);
                if (!response.ok) throw new Error("音源データの取得に失敗しました");
                const arrayBuffer = await response.arrayBuffer();
                track.buffer = await audioCtx.decodeAudioData(arrayBuffer);
            }

            // Web Audio ノードを生成して結線
            track.source = audioCtx.createBufferSource();
            track.source.buffer = track.buffer;
            track.source.loop = track.isLooping;
            track.source.connect(audioCtx.destination);

            // ループOFFの状態で最後まで再生しきった場合の終了処理
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

// 特定のトラックを強制停止
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

// 読み込み完了時に自動的にリストを構築
window.addEventListener('DOMContentLoaded', () => {
    buildPlaylist();
});

// ブラウザが一時停止状態（サスペンド）になった場合のセキュリティ保護解除用
document.body.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}, true);
