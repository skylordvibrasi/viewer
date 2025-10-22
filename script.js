// --- FUNGSI UTILITAS ---
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return (match && match[1].length === 11) ? match[1] : null;
}

function extractPlaylistId(url) {
    const regex = /[?&]list=([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function getRandomQuality() {
    const qualities = ['small', 'medium', 'large', 'hd720'];
    return qualities[Math.floor(Math.random() * qualities.length)];
}

function getRandomPlaybackRate() {
    // Kecepatan yang didukung API: 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2
    // Kita fokus pada yang paling umum: 0.75, 1.0, 1.25
    const rates = [0.75, 1.0, 1.25];
    return rates[Math.floor(Math.random() * rates.length)];
}

// FUNGSI BARU: Mengecek apakah dalam mode tampilan vertikal (Shorts)
function isShortsMode() {
    const playerDiv = document.getElementById('player');
    return playerDiv && playerDiv.classList.contains('player-vertical');
}


// Kunci untuk penyimpanan lokal
const LS_KEY_AUTO_MODE = 'auto_viewer_mode';
const LS_KEY_CONTENT_URL = 'auto_viewer_url';

// --- KONSTANTA WAKTU/FREKUENSI (Peningkatan Struktur) ---
const SCROLL_INTERVAL_MS = 10000; // Gulir setiap 10 detik
const INTERACTION_INTERVAL_MS_MIN = 5 * 60 * 1000; // Min 5 menit
const INTERACTION_INTERVAL_MS_MAX = 10 * 60 * 1000; // Max 10 menit
const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000; // Batas waktu sesi (6 jam)
const SHORTS_MAX_DURATION_SECONDS = 90; // Video dianggap "Short" jika durasi <= 90 detik

// --- KONTROL PEMUTAR YOUTUBE (IFrame API) ---
let player;
let currentVideoId = 'eY2YfC2Yl7k'; // Video ID default
let isPlaylistMode = false;
let isAutoMode = false; 
let autoTimeout = null; 
let scrollInterval = null; 
let sessionTimeout = null; 
let startDelayTimeout = null; 
let randomInteractionInterval = null; 
let breakResumeTimeout = null; // Timeout untuk jeda interupsi

// Muat IFrame API secara Asinkron
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    const storedUrl = localStorage.getItem(LS_KEY_CONTENT_URL);
    
    const initialVideoId = storedUrl 
        ? extractVideoId(storedUrl) || 'eY2YfC2Yl7k' 
        : currentVideoId;
        
    const initialPlaylistId = storedUrl ? extractPlaylistId(storedUrl) : null;
    
    // SELALU buat player pertama kali di sini
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: initialPlaylistId ? 'eY2YfC2Yl7k' : initialVideoId,
        playerVars: {
            'autoplay': 0, 
            'controls': 1,
            'rel': 0, 
            'modestbranding': 1,
            'loop': initialPlaylistId ? 1 : 0 
        },
        events: {
            'onStateChange': onPlayerStateChange,
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    const storedUrl = localStorage.getItem(LS_KEY_CONTENT_URL);
    const storedAuto = localStorage.getItem(LS_KEY_AUTO_MODE) === 'true';
    const watchBtn = document.getElementById('start-watch-btn');
    const statusText = document.getElementById('status-text');

    if (storedUrl && storedAuto) {
        isAutoMode = true;
        // PENTING: loadContentFromUrl menangani start/delay jika fromAutoStart=true
        loadContentFromUrl(storedUrl, true);
        
        // Jeda kecil untuk memastikan API siap dan kemudian mencoba Play
        setTimeout(() => {
            // Pengecekan Kesiapan Pemutar yang Lebih Baik
            if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                toggleAutoPlayback(true); 
            }
        }, 1500); 
    } else {
         statusText.textContent = 'Status: Siap Memuat Video. Harap Muat Konten Dahulu.';
         watchBtn.disabled = true; 
    }
}

// --- FUNGSI SCROLL & INTERAKSI OTOMATIS (Ditambahkan log debugging) ---

function startAutoScroll() {
    // JANGAN SCROLL JIKA DALAM MODE VERTIKAL (Shorts)
    if (isShortsMode()) { 
        stopAutoScroll(); 
        console.log("[SCROLL] Scroll Otomatis dilewati karena mode vertikal (Shorts).");
        return; 
    }

    if (scrollInterval) clearInterval(scrollInterval);
    console.log(`[SCROLL] Memulai Scroll Otomatis. Interval: ${SCROLL_INTERVAL_MS}ms.`); 
    
    scrollInterval = setInterval(() => {
        if (!isAutoMode) {
             console.log("[SCROLL] Dihentikan di dalam interval: isAutoMode false.");
             return;
        }
        const scrollDistance = Math.floor(Math.random() * 401) - 200; 
        window.scrollBy({ top: scrollDistance, behavior: 'smooth' });
        console.log(`[SCROLL] Gulir sebesar: ${scrollDistance}px`); 
    }, SCROLL_INTERVAL_MS);
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        console.log("[SCROLL] Scroll Otomatis dihentikan."); 
    }
}


// FUNGSI INTERAKSI DIREVISI: Variasi berdasarkan durasi video
function startRandomInteraction() {
    if (randomInteractionInterval) clearInterval(randomInteractionInterval);
    
    // Interval acak standar (5-10 menit)
    const INTERACTION_INTERVAL_MS_MIN_RANDOM = Math.floor(Math.random() * (INTERACTION_INTERVAL_MS_MAX - INTERACTION_INTERVAL_MS_MIN + 1)) + INTERACTION_INTERVAL_MS_MIN;
    let finalInterval = INTERACTION_INTERVAL_MS_MIN_RANDOM;

    // JIKA Shorts/Video Pendek, percepat interval (misalnya, 1-3 menit)
    try {
        if (player && player.getDuration() <= SHORTS_MAX_DURATION_SECONDS) {
            finalInterval = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000; // 1 to 3 minutes
        }
    } catch(e) { /* Abaikan error getDuration */ }

    randomInteractionInterval = setInterval(() => {
        // Pengecekan Kesiapan Pemutar yang Lebih Baik
        if (!isAutoMode || !player || typeof player.getPlayerState !== 'function' || player.getPlayerState() !== YT.PlayerState.PLAYING) {
            return;
        }

        const statusText = document.getElementById('status-text');
        // Random action: 1 (adjust volume) - 12 (no action)
        const action = Math.floor(Math.random() * 12) + 1; 

        // LOGIKA PENAMBAHAN: HANYA INTERAKSI SETELAH WAKTU TERSENTUH (Minimal 10% durasi)
        let duration = player.getDuration();
        let currentTime = player.getCurrentTime();
        if (duration > 0 && currentTime / duration < 0.1) {
            console.log("Interaksi acak dilewati, video baru saja dimulai.");
            return; // Lewati interaksi jika video baru saja dimulai
        }
        
        if (action <= 2) { // 16.6% Chance: Volume/Mute Change
            if (player.isMuted()) {
                player.unMute();
                statusText.textContent = `Status: Interaksi Acak. Unmute. Kecepatan: ${player.getPlaybackRate()}x`;
            } else {
                player.mute();
                statusText.textContent = `Status: Interaksi Acak. Mute. Kecepatan: ${player.getPlaybackRate()}x`;
            }
        } else if (action <= 4) { // 16.6% Chance: Playback Rate Change
            const newRate = getRandomPlaybackRate();
            player.setPlaybackRate(newRate);
            statusText.textContent = `Status: Interaksi Acak. Kecepatan Putar diubah menjadi ${newRate}x.`;
        } else if (action === 5) { // 8.3% Chance: Take a Break/Interruption (Pause & Resume)
            player.pauseVideo();
            
            const breakDuration = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000; // 1 to 3 minutes
            
            statusText.textContent = `Status: Interupsi Jeda Acak. Melanjutkan dalam ${Math.ceil(breakDuration / 1000)} detik.`;
            statusText.style.color = 'orange';

            if (breakResumeTimeout) clearTimeout(breakResumeTimeout);

            breakResumeTimeout = setTimeout(() => {
                // Pengecekan Kesiapan Pemutar yang Lebih Baik
                if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.PAUSED) {
                    player.playVideo();
                }
            }, breakDuration);
        } else if (action === 6) { // 8.3% Chance: Skip Next (Simulasi Swipe Shorts)
            if (isPlaylistMode && typeof player.nextVideo === 'function') {
                 player.nextVideo();
                 statusText.textContent = `Status: Interaksi Acak. Melewati ke video berikutnya (Simulasi Swipe).`;
                 statusText.style.color = 'blue';
            }
        }
        // 7-12 (50% Chance) is No Action, which is the most natural

    }, finalInterval); // Menggunakan finalInterval yang bervariasi
}

function stopRandomInteraction() {
    if (randomInteractionInterval) {
        clearInterval(randomInteractionInterval);
        randomInteractionInterval = null;
    }
    if (breakResumeTimeout) {
        clearTimeout(breakResumeTimeout);
        breakResumeTimeout = null;
    }
}

// --- FUNGSI BATAS WAKTU SESI OTOMATIS (AUTO-REFRESH PENUH) ---
function startAutoSessionTimeout() {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    
    sessionTimeout = setTimeout(() => {
        const hours = SESSION_TIMEOUT_MS / 3600000;
        
        // Simpan status sebelum me-refresh
        localStorage.setItem(LS_KEY_AUTO_MODE, 'true');
        let currentContentUrl;
        try {
            currentContentUrl = isPlaylistMode && player && typeof player.getPlaylistId === 'function' && player.getPlaylistId()
                ? `https://www.youtube.com/playlist?list=${player.getPlaylistId()}` 
                : `https://www.youtube.com/watch?v=${currentVideoId}`;
        } catch (e) {
             currentContentUrl = `https://www.youtube.com/watch?v=${currentVideoId}`;
        }

        localStorage.setItem(LS_KEY_CONTENT_URL, currentContentUrl);

        // PENGGANTIAN ALERT() DENGAN CONSOLE.WARN() DAN AUTO-RELOAD
        console.warn(`
            [PENTING - AUTO REFRESH] Sesi otomatis telah berjalan selama ${hours} jam. 
            Memuat ulang halaman (Reload) untuk sesi baru dalam 3 detik!

            TINDAKAN MANUAL (OPSIONAL):
            1. Ubah alamat IP Anda (VPN/Proxy)
            2. Ubah akun penonton (jika menggunakan login)
        `);

        // Beri jeda kecil (3 detik) agar pesan di konsol sempat terlihat
        setTimeout(() => {
            window.location.reload(); 
        }, 3000); 
        
    }, SESSION_TIMEOUT_MS); // Batas waktu 6 jam
}

// FUNGSI DIREVISI: Ditambahkan pembersihan Local Storage secara eksplisit
function stopAutoSessionTimeout() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
    if (startDelayTimeout) {
        clearTimeout(startDelayTimeout);
        startDelayTimeout = null;
    }
}

// FUNGSI DIREVISI: Menambahkan logika Shorts/Video Pendek yang lebih cepat
function onPlayerStateChange(event) {
    const statusText = document.getElementById('status-text');
    const btn = document.getElementById('start-watch-btn');

    if (autoTimeout) {
        clearTimeout(autoTimeout);
        autoTimeout = null;
    }
    
    // =================================================================
    // REVISI BARU: Penanganan Video Hilang/Dibatasi di Playlist (SKIP)
    // =================================================================
    if (event.data === YT.PlayerState.UNSTARTED) {
         // Kondisi video tidak dapat dimainkan/dihapus (durasi 0)
         const isUnplayable = event.target.getVideoUrl() && event.target.getDuration() === 0;

         if (isUnplayable) {
              if (isPlaylistMode) {
                  // Jika dalam mode playlist dan video tidak dapat dimainkan, LOMPAT!
                  statusText.textContent = 'Status: Terdeteksi Video Hilang/Dibatasi. Otomatis LOMPAT ke video berikutnya...';
                  statusText.style.color = 'red';
                  console.warn("[ERROR/SKIP] Video yang tidak dapat dimainkan/dihapus terdeteksi di playlist. Melompat ke yang berikutnya.");
                  
                  // Beri waktu sejenak (1 detik) sebelum melompat
                  setTimeout(() => {
                       if (player && typeof player.nextVideo === 'function') {
                            player.nextVideo();
                       }
                  }, 1000);
                  
                  return; // Jangan matikan mode otomatis, lanjutkan loop
                  
              } else {
                  // Ini adalah video tunggal yang dibatasi/dihapus, matikan mode otomatis
                  statusText.textContent = 'Status: ERROR. Video Tunggal tidak dapat diputar (Dihapus/Dibatasi).';
                  statusText.style.color = 'red';
                  isAutoMode = false;
                  stopAutoScroll();
                  stopAutoSessionTimeout();
                  stopRandomInteraction(); 
                  btn.textContent = 'Aktifkan Otomatis';
                  btn.disabled = true; 
                  return; 
              }
         }
    }
    // =================================================================

    if (isAutoMode && event.data === YT.PlayerState.CUED) {
        startAutoPlaybackWithDelay();
    }

    if (event.data === YT.PlayerState.PLAYING) {
        let currentVideoIndex = 1;
        let totalVideos = 1;
        try {
             currentVideoIndex = isPlaylistMode ? player.getPlaylistIndex() + 1 : 1;
             totalVideos = isPlaylistMode ? player.getPlaylist().length : 1;
             
             // **MENETAPKAN KECEPATAN PUTAR ACAK SAAT MULAI**
             if (player.getPlaybackRate() === 1.0) { 
                  player.setPlaybackRate(getRandomPlaybackRate());
             }
             
        } catch(e) { /* Abaikan */ }

        statusText.textContent = isPlaylistMode 
            ? `Status: Otomatis AKTIF. Memutar Video ${currentVideoIndex} dari ${totalVideos}. Kecepatan: ${player.getPlaybackRate()}x` 
            : `Status: Otomatis AKTIF. Video sedang diputar. Kecepatan: ${player.getPlaybackRate()}x`;
        
        statusText.style.color = 'green';
        btn.textContent = 'Nonaktifkan Otomatis (Jeda)'; 
        btn.disabled = false; 
    } else if (event.data === YT.PlayerState.PAUSED) {
        if (breakResumeTimeout) {
             // Biarkan pesan interupsi yang direncanakan tetap muncul
        } else if (isAutoMode) { 
             statusText.textContent = 'Status: Terdeteksi Jeda Tidak Terduga. Memulai kembali dalam 3 detik...';
             statusText.style.color = 'orange';
             
             if (autoTimeout) clearTimeout(autoTimeout);
             autoTimeout = setTimeout(() => {
                 // Pengecekan Kesiapan Pemutar yang Lebih Baik
                 if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.PAUSED) {
                      player.playVideo();
                 }
             }, 3000); 
        } else {
             statusText.textContent = 'Status: Dijeda secara manual. Klik "Nonaktifkan Otomatis" atau Putar di player.';
             statusText.style.color = 'red';
        }
    } else if (event.data === YT.PlayerState.ENDED) {
        if (isAutoMode) {
            
            let isShorts = false;
            try {
                isShorts = player.getDuration() > 0 && player.getDuration() <= SHORTS_MAX_DURATION_SECONDS;
            } catch(e) { /* Abaikan */ }
            
            if (isShorts || isShortsMode()) {
                 // LOGIKA BARU UNTUK SHORTS/VIDEO PENDEK (Simulasi Swipe Cepat)
                 const randomShortsDelay = Math.floor(Math.random() * (3000 - 500 + 1)) + 500; // 0.5 to 3 seconds
                 
                 statusText.textContent = `Status: Selesai (Shorts/Pendek). Otomatis memuat berikutnya dalam ${Math.ceil(randomShortsDelay / 1000)} detik...`;
                 statusText.style.color = 'blue';

                 autoTimeout = setTimeout(() => {
                     if (player && typeof player.nextVideo === 'function') {
                          player.nextVideo(); // Langsung ke video berikutnya
                     }
                 }, randomShortsDelay);
                 
            } else if (!isPlaylistMode) {
                // Logika Video Panjang Tunggal
                const randomReplayDelay = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; 
                
                statusText.textContent = `Status: Selesai. Otomatis akan memutar ulang dalam ${Math.ceil(randomReplayDelay / 1000)} detik...`;
                statusText.style.color = 'red';
                
                autoTimeout = setTimeout(() => {
                    resetAndPlayVideo(); 
                }, randomReplayDelay);
            } else {
                 // Logika Playlist Video Panjang
                 statusText.textContent = 'Status: Playlist Otomatis. Memuat ulang video pertama karena loop gagal...';
                 statusText.style.color = 'orange';

                 autoTimeout = setTimeout(() => {
                    if (player && typeof player.playVideoAt === 'function') {
                         player.playVideoAt(0);
                    }
                 }, 5000); 
            }
        } else {
            statusText.textContent = 'Status: Selesai. Mode Otomatis TIDAK aktif. Klik "Aktifkan Otomatis" untuk memulai.';
            statusText.style.color = 'var(--warna-teks-muda)';
            btn.textContent = 'Aktifkan Otomatis';
        }
    } else if (event.data === YT.PlayerState.CUED) {
         const text = isPlaylistMode ? 'Playlist dimuat.' : 'Video dimuat.';
         statusText.textContent = `Status: ${text} Klik "Aktifkan Otomatis".`;
         statusText.style.color = 'var(--warna-teks-muda)';
         btn.textContent = 'Aktifkan Otomatis';
         btn.disabled = false; 
    }
}

// FUNGSI DIREVISI: Variasi Penundaan Awal Cerdas
function startAutoPlaybackWithDelay() {
    if (!isAutoMode || !player || typeof player.getDuration !== 'function') return;
    
    if (startDelayTimeout) clearTimeout(startDelayTimeout);
    
    let randomDelay;
    
    // VARIABEL PENUNDAAN CERDAS BERDASARKAN DURASI
    try {
        const duration = player.getDuration();
        if (duration > 0 && duration <= SHORTS_MAX_DURATION_SECONDS) {
            // Video Pendek/Shorts: Penundaan sangat singkat (1-3 detik)
            randomDelay = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
        } else {
            // Video Panjang: Penundaan wajar (5-15 detik)
            randomDelay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
        }
    } catch(e) {
        randomDelay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000; // Default
    }

    const statusText = document.getElementById('status-text');
    
    statusText.textContent = `Status: Jeda awal acak. Pemutaran akan dimulai dalam ${Math.ceil(randomDelay / 1000)} detik...`;
    statusText.style.color = 'orange';

    startDelayTimeout = setTimeout(() => {
        if (player && typeof player.playVideo === 'function') {
             player.playVideo();
        }
    }, randomDelay);
}

function resetAndPlayVideo() {
     // Pengecekan Kesiapan Pemutar yang Lebih Baik
     if (player && typeof player.loadVideoById === 'function') {
         player.loadVideoById({
            'videoId': currentVideoId,
            'startSeconds': 0, 
            'suggestedQuality': getRandomQuality() 
        });
        // **PENTING: SET KECEPATAN SETELAH LOAD**
        player.setPlaybackRate(getRandomPlaybackRate());
     }
}

// FUNGSI DIREVISI: Menambahkan pembersihan Local Storage secara eksplisit
function toggleAutoPlayback(forcedStart = false) {
     if (!player || typeof player.getPlayerState !== 'function') {
         alert("Pemutar belum siap.");
         return;
     }
     
     if (!forcedStart) {
         isAutoMode = !isAutoMode; 
     } else if (!isAutoMode) {
         isAutoMode = true; 
     }
     
     const statusText = document.getElementById('status-text');
     const btn = document.getElementById('start-watch-btn');

     if (isAutoMode) {
         // --- Mulai Otomatis ---
         
         // Pastikan pemutar memiliki konten
         if (!currentVideoId && !isPlaylistMode) {
             alert("Harap muat video atau playlist terlebih dahulu sebelum mengaktifkan mode otomatis.");
             isAutoMode = false;
             return;
         }
         
         if (isPlaylistMode) {
             if (typeof player.setLoop === 'function') {
                  player.setLoop(true); 
             }
             
             if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                 player.playVideo();
             }
             
         } else {
             // Hanya reset dan play jika bukan playlist dan pemutar tidak memutar
             if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                  resetAndPlayVideo();
             }
         }
         
         startAutoScroll(); 
         startAutoSessionTimeout(); 
         startRandomInteraction(); 
         
         // Simpan status AutoMode ke LocalStorage
         let currentContentUrl;
         try {
            currentContentUrl = isPlaylistMode && player && typeof player.getPlaylistId === 'function' && player.getPlaylistId()
               ? `https://www.youtube.com/playlist?list=${player.getPlaylistId()}` 
               : `https://www.youtube.com/watch?v=${currentVideoId}`;
         } catch(e) {
            // Fallback jika API sedang rewel
            try {
                 currentVideoId = player.getVideoData().video_id || currentVideoId; 
            } catch(err) {/* Abaikan */}
            currentContentUrl = `https://www.youtube.com/watch?v=${currentVideoId}`;
         }
         
         localStorage.setItem(LS_KEY_AUTO_MODE, 'true');
         localStorage.setItem(LS_KEY_CONTENT_URL, currentContentUrl);
         
         btn.textContent = 'Nonaktifkan Otomatis (Jeda)';
     } else {
         // --- Nonaktifkan Otomatis (Hentikan) ---
         if (autoTimeout) clearTimeout(autoTimeout); 
         if (startDelayTimeout) clearTimeout(startDelayTimeout); 
         stopAutoScroll(); 
         stopAutoSessionTimeout(); 
         stopRandomInteraction(); 
         
         // Pembersihan Local Storage secara eksplisit
         localStorage.removeItem(LS_KEY_AUTO_MODE);
         localStorage.removeItem(LS_KEY_CONTENT_URL);

         player.pauseVideo();
         statusText.textContent = 'Status: Mode Otomatis Dinonaktifkan. Pemutaran dijeda.';
         btn.textContent = 'Aktifkan Otomatis';
         statusText.style.color = 'var(--warna-utama)';
     }

     btn.disabled = false;
}

// FUNGSI UTAMA UNTUK MUAT KONTEN DIREVISI
function loadContentFromUrl(url, fromAutoStart = false) {
    const statusText = document.getElementById('status-text');
    const watchBtn = document.getElementById('start-watch-btn');
    const playerDiv = document.getElementById('player');
    
    const newVideoId = extractVideoId(url);
    const newPlaylistId = extractPlaylistId(url);
    
    // Pengecekan Kesiapan Pemutar yang Lebih Baik
    if (!player || typeof player.loadPlaylist !== 'function') {
        if (!fromAutoStart) {
             alert("Pemutar belum siap. Harap tunggu sebentar.");
        }
        return false;
    }
    
    // Bersihkan mode Shorts/Vertical
    playerDiv.classList.remove('player-vertical'); 

    if (newPlaylistId) {
        isPlaylistMode = true;
        currentVideoId = ''; 
        
        player.loadPlaylist({
            list: newPlaylistId,
            listType: 'playlist',
            index: 0,
            suggestedQuality: getRandomQuality() 
        });
        // **PENTING: SET KECEPATAN SETELAH LOAD**
        player.setPlaybackRate(getRandomPlaybackRate());


        statusText.textContent = fromAutoStart ? 'Status: Playlist otomatis dimuat ulang.' : 'Status: Playlist dimuat. Klik "Aktifkan Otomatis".';
        
    } else if (newVideoId) {
        isPlaylistMode = false;
        currentVideoId = newVideoId; 
        
        // Coba deteksi Shorts/Vertical melalui URL, meskipun penentuan pasti ada di onPlayerStateChange
        if (url.includes('youtube.com/shorts/')) {
            playerDiv.classList.add('player-vertical');
        }

        player.cueVideoById({
            videoId: currentVideoId,
            suggestedQuality: getRandomQuality() 
        });
        // **PENTING: SET KECEPATAN SETELAH LOAD**
        player.setPlaybackRate(getRandomPlaybackRate());

        // Mulai Langsung untuk Auto-Mode (Bagus untuk Shorts) 
        if (fromAutoStart) {
             // Jeda kecil untuk memastikan API siap, kemudian akan ditangani oleh startAutoPlaybackWithDelay
             setTimeout(() => {
                 if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.CUED) {
                     startAutoPlaybackWithDelay();
                 }
             }, 500); 
        }

        statusText.textContent = fromAutoStart ? 'Status: Video otomatis dimuat ulang.' : 'Status: Video baru dimuat. Klik "Aktifkan Otomatis".';
    } else if (!fromAutoStart) {
        alert("URL tidak valid. Harap masukkan URL video atau playlist YouTube yang benar.");
        return false;
    }

    watchBtn.textContent = 'Aktifkan Otomatis'; 
    watchBtn.disabled = false;
    return true;
}


// --- INISIALISASI & EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const watchBtn = document.getElementById('start-watch-btn');
    const loadBtn = document.getElementById('load-video-btn'); 
    const urlInput = document.getElementById('video-url-input'); 

    watchBtn.addEventListener('click', () => {
        if (!player || typeof player.getPlayerState !== 'function') {
            alert("Pemutar belum siap. Harap tunggu sebentar atau muat konten dahulu.");
            return;
        }
        toggleAutoPlayback();
    });
    
    loadBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            alert("Harap masukkan URL video YouTube atau Playlist.");
            return;
        }
        
        // PEMBERSIHAN SEBELUM MUAT KONTEN BARU
        isAutoMode = false; 
        if (autoTimeout) clearTimeout(autoTimeout);
        stopAutoScroll();
        stopAutoSessionTimeout();
        stopRandomInteraction(); 
        localStorage.removeItem(LS_KEY_AUTO_MODE);
        localStorage.removeItem(LS_KEY_CONTENT_URL);
        
        const loaded = loadContentFromUrl(url);
        if (loaded) {
            urlInput.value = ''; 
        }
    });
});
