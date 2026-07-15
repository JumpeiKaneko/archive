// アーカイブ公開する6つの音源リスト（ファイル名と表示タイトル）
const ARCHIVE_TRACKS = [
    { id: "archive_01", number: "01", title: "水の音", fileName: "mizu_no_oti.mp3" },
    { id: "archive_02", number: "02", title: "夜の森", fileName: "yoru_no_mori.mp3" },
    { id: "archive_03", number: "03", title: "風の音", fileName: "kaze_no_oti.mp3" },
    { id: "archive_04", number: "04", title: "森の音", fileName: "mori_no_oti.mp3" },
    { id: "archive_05", number: "05", title: "さえずり", fileName: "saezuri.mp3" },
    { id: "archive_06", number: "06", title: "ゆらぎ", fileName: "yuragi.mp3" }
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
        // 各トラックの状態パラメータをセット
        track.buffer = null;
        track.source = null;
        track.isPlaying = false;
        track.isLooping = true; // デフォルトでリピートONに設定

        const item = document.createElement('div');
        item.className = 'track-item';
        item.innerHTML = `
            <div class="track-info-block">
                <span class="track-num-badge">TRACK ${track.number}</span>
                <span class="track-title-text">${track.title}</span>
            </div>
            <div class="track-controls">
                <button class="action-btn loop-btn active" data-id="${track.id}">Loop: ON</button>
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

    document.querySelectorAll('.loop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trackId = e.target.getAttribute('data-id');
            const track = ARCHIVE_TRACKS.find(t => t.id === trackId);
            if (track) {
                track.isLooping = !track.isLooping;
                e.target.innerText = `Loop: ${track.isLooping ? 'ON' : 'OFF'}`;
                e.target.classList.toggle('active', track.isLooping);
                
                // 再生中の場合はループ状態をリアルタイムで同期
                if (track.source) {
                    track.source.loop = track.isLooping;
                }
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
                const response = await fetch(`assets/sounds/${track.fileName}`);
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
