// --- KONSTANTA & VARIABEL GLOBAL ---
const SHORTS_MAX_DURATION_SECONDS = 60; // Definisi maksimal durasi Shorts
const LS_KEY_AUTO_MODE = 'auto_watch_mode';
const LS_KEY_CONTENT_URL = 'auto_watch_url';
const SCROLL_INTERVAL_MS = 10000; // Interval scroll setiap 10 detik

let player;
let isAutoMode = false;
let autoTimeout = null; // Timeout untuk penundaan pemutaran
let breakResumeTimeout = null; // Timeout untuk jeda interaksi
let scrollInterval = null; // Interval untuk gulir acak
let interactionInterval = null; // Interval untuk interaksi acak
let sessionTimeout = null; // Timeout untuk durasi sesi
let currentVideoId = ''; // Menyimpan ID video yang saat ini dimuat
let isPlaylistMode = false; // Menyimpan apakah sedang memutar playlist/channel
let lastInteractedAt = 0; // Waktu interaksi terakhir

// --- FUNGSI UTILITAS ---
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
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
    const rates = [0.75, 1.0, 1.25];
    return rates[Math.floor(Math.random() * rates.length)];
}

// FUNGSI BARU: Mengecek apakah dalam mode tampilan vertikal (Shorts)
function isShortsMode() {
    const playerDiv = document.getElementById('player');
    return playerDiv.classList.contains('player-vertical');
}


// --- KONTROL SCROLL (GULIR) ---

// FUNGSI INI KINI BERLAKU UNTUK SEMUA JENIS KONTEN
function startAutoScroll() {
    // Pengecekan Shorts dihapus, scroll berlaku untuk semua mode
    if (scrollInterval) clearInterval(scrollInterval);
    console.log(`[SCROLL] Memulai Scroll Otomatis. Interval: ${SCROLL_INTERVAL_MS}ms. (Aktif untuk semua konten)`); 
    
    scrollInterval = setInterval(() => {
        if (!isAutoMode) {
             console.log("[SCROLL] Dihentikan di dalam interval: isAutoMode false.");
             return;
        }
        // Jarak gulir acak antara -200px dan +200px
        const scrollDistance = Math.floor(Math.random() * 401) - 200; 
        window.scrollBy({ top: scrollDistance, behavior: 'smooth' });
        console.log(`[SCROLL] Gulir sebesar: ${scrollDistance}px`); 
    }, SCROLL_INTERVAL_MS);
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        console.log("[SCROLL] Scroll Otomatis Dihentikan.");
    }
}

// --- KONTROL INTERAKSI (Simulasi Mouse Move/Click) ---

function startRandomInteraction() {
    if (interactionInterval) clearInterval(interactionInterval);

    const interactionIntervalMs = 15000; // Setiap 15 detik

    interactionInterval = setInterval(() => {
        if (!isAutoMode) return;
        
        // Randomly decide to do an action (e.g., 10% chance per interval)
        const shouldInteract = Math.random() < 0.1;
        
        if (shouldInteract) {
            // Kita akan mensimulasikan gerakan mouse di atas player
            const playerRect = document.getElementById('player').getBoundingClientRect();
            
            // Koordinat acak di dalam player
            const x = playerRect.left + Math.random() * playerRect.width;
            const y = playerRect.top + Math.random() * playerRect.height;

            // Membuat event mouse
            const event = new MouseEvent('mousemove', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            
            document.getElementById('player').dispatchEvent(event);
            lastInteractedAt = Date.now();
            console.log("[INTERAKSI] Mouse move acak disimulasikan.");

            // Terkadang, mensimulasikan klik untuk jeda/lanjut singkat (opsional)
            if (Math.random() < 0.2 && player.getPlayerState() === YT.PlayerState.PLAYING) {
                
                 if (breakResumeTimeout) clearTimeout(breakResumeTimeout);
                 
                 // Jeda 5-10 detik
                 const breakDuration = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
                 player.pauseVideo();
                 console.log(`[INTERAKSI] Jeda singkat disimulasikan selama ${Math.ceil(breakDuration/1000)} detik.`);
                 
                 breakResumeTimeout = setTimeout(() => {
                     player.playVideo();
                     breakResumeTimeout = null;
                     console.log("[INTERAKSI] Pemutaran dilanjutkan.");
                 }, breakDuration);
            }
        }
        
    }, interactionIntervalMs);
}

function stopRandomInteraction() {
    if (interactionInterval) {
        clearInterval(interactionInterval);
        interactionInterval = null;
        console.log("[INTERAKSI] Interaksi Acak Dihentikan.");
    }
}


// --- KONTROL SESI ---

function startAutoSessionTimeout() {
    if (sessionTimeout) clearTimeout(sessionTimeout);

    // Sesi 10-60 menit (600000ms hingga 3600000ms)
    const sessionDuration = Math.floor(Math.random() * (3600000 - 600000 + 1)) + 600000; 
    const sessionHours = Math.floor(sessionDuration / 3600000);
    const sessionMinutes = Math.round((sessionDuration % 3600000) / 60000);
    
    console.log(`[SESI] Sesi Otomatis akan berakhir dalam: ${sessionHours} jam ${sessionMinutes} menit.`);

    sessionTimeout = setTimeout(() => {
        toggleAutoPlayback(); // Mematikan mode otomatis
        const statusText = document.getElementById('status-text');
        statusText.textContent = `Status: Sesi Otomatis berakhir setelah ${sessionHours} jam ${sessionMinutes} menit.`;
        statusText.style.color = 'red';
        alert(`Sesi menonton otomatis telah berakhir (Durasi: ${sessionHours} jam ${sessionMinutes} menit).`);
    }, sessionDuration);
}

function stopAutoSessionTimeout() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
        console.log("[SESI] Timeout Sesi Otomatis Dihentikan.");
    }
}


// --- FUNGSI UTAMA UNTUK MUAT KONTEN DIREVISI ---
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
            suggestedQuality: getRandomQuality(),
            shuffle: true // REVISI: Memastikan playlist apa pun dimulai dalam mode acak
        });
        // **PENTING: SET KECEPATAN SETELAH LOAD**
        player.setPlaybackRate(getRandomPlaybackRate());


        statusText.textContent = fromAutoStart ? 'Status: Playlist otomatis dimuat ulang (Acak).' : 'Status: Playlist dimuat (Acak). Klik "Aktifkan Otomatis".';
        
    } else if (newVideoId) {
        currentVideoId = newVideoId;
        isPlaylistMode = false;
        
        // Cek jika ini adalah Shorts, dan atur tata letak
        if (url.includes('shorts/') || (newVideoId.length === 11 && (url.includes('t=')) && (url.includes('youtube.com/')))) {
             // Asumsi cepat: Jika dari URL shorts/, anggap sebagai mode Shorts (Vertikal)
             playerDiv.classList.add('player-vertical');
        }
        
        player.loadVideoById({
            videoId: newVideoId,
            startSeconds: 0,
            suggestedQuality: getRandomQuality()
        });
        
        // **PENTING: SET KECEPATAN SETELAH LOAD**
        player.setPlaybackRate(getRandomPlaybackRate());
        
        statusText.textContent = fromAutoStart ? 'Status: Video otomatis dimuat ulang.' : 'Status: Video Tunggal dimuat. Klik "Aktifkan Otomatis".';
    } else if (!fromAutoStart) {
        alert("URL tidak valid. Harap masukkan URL video atau playlist YouTube yang benar.");
        return false;
    }

    watchBtn.textContent = 'Aktifkan Otomatis'; 
    watchBtn.disabled = false;
    return true;
}

// --- KONTROL PEMUTAR YOUTUBE (IFrame API) ---

function onYouTubeIframeAPIReady() {
    const playerDiv = document.getElementById('player');
    const playerWidth = playerDiv.offsetWidth;
    const playerHeight = playerDiv.offsetHeight;
    
    player = new YT.Player('player', {
        height: playerHeight,
        width: playerWidth,
        videoId: '', 
        playerVars: {
            'controls': 1,
            'autoplay': 0,
            'rel': 0,
            'modestbranding': 1,
            'disablekb': 1,
            'cc_load_policy': 0 
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError 
        }
    });
}

function onPlayerReady(event) {
    const statusText = document.getElementById('status-text');
    statusText.textContent = 'Status: Pemutar Siap. Muat video.';
    
    // Coba muat konten dari localStorage jika mode otomatis sebelumnya aktif
    const storedUrl = localStorage.getItem(LS_KEY_CONTENT_URL);
    const storedAutoMode = localStorage.getItem(LS_KEY_AUTO_MODE) === 'true';
    
    if (storedUrl) {
         loadContentFromUrl(storedUrl, true);
    }
    
    if (storedAutoMode && storedUrl) {
         // Beri waktu sejenak agar pemutar siap dan beralih ke mode otomatis
         setTimeout(() => {
              toggleAutoPlayback(true);
         }, 1000); 
    }
}

function startAutoPlaybackWithDelay() {
    // Penundaan acak sebelum pemutaran (2-5 detik)
    const randomDelay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
    
    if (autoTimeout) clearTimeout(autoTimeout);
    
    const statusText = document.getElementById('status-text');
    statusText.textContent = `Status: Otomatis AKTIF. Memutar dalam ${Math.ceil(randomDelay / 1000)} detik...`;
    statusText.style.color = 'blue';

    autoTimeout = setTimeout(() => {
        if (player && typeof player.playVideo === 'function' && player.getPlayerState() === YT.PlayerState.CUED) {
            player.playVideo();
        }
        autoTimeout = null;
    }, randomDelay);
}

function resetAndPlayVideo() {
    if (currentVideoId && player && typeof player.loadVideoById === 'function') {
         
         // Muat ulang video tunggal dengan kecepatan dan kualitas acak
         player.loadVideoById({
            videoId: currentVideoId,
            startSeconds: 0,
            suggestedQuality: getRandomQuality()
         });
         player.setPlaybackRate(getRandomPlaybackRate());
         
         // Langsung putar setelah dimuat ulang (mode CUED akan mengaktifkan startAutoPlaybackWithDelay)
         // Jika perlu segera, gunakan playVideo()
         // player.playVideo(); 
         
         const statusText = document.getElementById('status-text');
         statusText.textContent = `Status: Video Tunggal dimuat ulang.`;
         statusText.style.color = 'green';
         
    } else if (isPlaylistMode) {
         // Jika playlist, kembali ke video pertama (atau muat ulang playlist jika perlu)
         if (player && typeof player.playVideoAt === 'function') {
              player.playVideoAt(0); 
              player.setPlaybackRate(getRandomPlaybackRate());
         }
    }
}


function onPlayerError(event) {
    const statusText = document.getElementById('status-text');
    let errorMessage = '';

    // Referensi Kode Kesalahan YouTube:
    // 100: Video not found or embedded playback disabled
    // 101/150: Video embedding disabled for requested content
    
    if (event.data === 100 || event.data === 101 || event.data === 150) {
         errorMessage = 'Video tidak tersedia atau pemutaran disematkan dilarang.';
    } else if (event.data === 2) {
         errorMessage = 'Parameter tidak valid (mungkin format ID video salah).';
    } else {
         errorMessage = `Kesalahan pemutar yang tidak diketahui (Kode: ${event.data}).`;
    }
    
    console.error(`[ERROR] Pemutar YouTube: ${errorMessage}`);
    statusText.textContent = `Status: ERROR. ${errorMessage} Menghentikan Otomatis...`;
    statusText.style.color = 'red';
    
    // Hentikan mode otomatis saat terjadi kesalahan serius
    isAutoMode = false;
    stopAutoScroll();
    stopAutoSessionTimeout();
    stopRandomInteraction(); 
    localStorage.removeItem(LS_KEY_AUTO_MODE);
    document.getElementById('start-watch-btn').textContent = 'Aktifkan Otomatis';
    document.getElementById('start-watch-btn').disabled = true;
}

// Fungsi untuk menangani perubahan status pemutar (TERBARU)
function onPlayerStateChange(event) {
    const statusText = document.getElementById('status-text');
    const btn = document.getElementById('start-watch-btn');

    if (autoTimeout) {
        clearTimeout(autoTimeout);
        autoTimeout = null;
    }
    
    // Penanganan Video Hilang/Dibatasi di Playlist (SKIP)
    if (event.data === YT.PlayerState.UNSTARTED) {
         const isUnplayable = event.target.getVideoUrl() && event.target.getDuration() === 0;

         if (isUnplayable) {
              if (isPlaylistMode) {
                  statusText.textContent = 'Status: Terdeteksi Video Hilang/Dibatasi. Otomatis LOMPAT ke video berikutnya...';
                  statusText.style.color = 'red';
                  console.warn("[ERROR/SKIP] Video yang tidak dapat dimainkan/dihapus terdeteksi di playlist. Melompat ke yang berikutnya.");
                  
                  setTimeout(() => {
                       if (player && typeof player.nextVideo === 'function') {
                            player.nextVideo();
                       }
                  }, 1000);
                  
                  return;
                  
              } else {
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

    if (isAutoMode && event.data === YT.PlayerState.CUED) {
        startAutoPlaybackWithDelay();
    }

    if (event.data === YT.PlayerState.PLAYING) {
        let currentVideoIndex = 1;
        let totalVideos = 1;
        try {
             currentVideoIndex = isPlaylistMode ? player.getPlaylistIndex() + 1 : 1;
             totalVideos = isPlaylistMode ? player.getPlaylist().length : 1;
             
             // MENETAPKAN KECEPATAN PUTAR ACAK SAAT MULAI
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
                 // LOGIKA SHORTS/VIDEO PENDEK
                 const randomShortsDelay = Math.floor(Math.random() * (3000 - 500 + 1)) + 500; // 0.5 to 3 seconds
                 
                 statusText.textContent = `Status: Selesai (Shorts/Pendek). Otomatis memuat berikutnya dalam ${Math.ceil(randomShortsDelay / 1000)} detik...`;
                 statusText.style.color = 'blue';

                 autoTimeout = setTimeout(() => {
                     if (player && typeof player.nextVideo === 'function') {
                          player.nextVideo(); // Langsung ke video berikutnya
                     }
                 }, randomShortsDelay);
                 
            } else if (!isPlaylistMode) {
                
                // Video Tunggal Selesai (Beralih ke Channel Acak)
                let currentVideoData;
                try {
                    currentVideoData = player.getVideoData();
                } catch(e) {
                    currentVideoData = null;
                }
                
                if (currentVideoData && currentVideoData.channelId && currentVideoData.author) {
                    const channelId = currentVideoData.channelId;
                    const uploadPlaylistId = 'UU' + channelId.substring(2); 

                    if (autoTimeout) clearTimeout(autoTimeout); 
                    
                    // PENYEMPURNAAN 1: WAKTU TUNGGU CHANNEL SWITCH ACAK (3-8 detik)
                    const randomChannelSwitchDelay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
                    
                    statusText.textContent = `Status: Video Tunggal Selesai. Otomatis beralih ke video acak Channel (${currentVideoData.author}) dalam ${Math.ceil(randomChannelSwitchDelay / 1000)} detik...`;
                    statusText.style.color = 'blue';

                    // Beri jeda acak (mensimulasikan jeda berpikir)
                    autoTimeout = setTimeout(() => {
                        if (player && typeof player.loadPlaylist === 'function') {
                             isPlaylistMode = true; 
                             
                             player.loadPlaylist({
                                 list: uploadPlaylistId,
                                 listType: 'playlist',
                                 index: 0,
                                 shuffle: true, // Putar acak
                                 suggestedQuality: getRandomQuality() 
                             });
                             
                             const authorName = currentVideoData.author;
                             statusText.textContent = `Status: Otomatis AKTIF. Memuat playlist acak dari Channel: ${authorName}.`;
                             
                        } else {
                            resetAndPlayVideo(); 
                        }
                    }, randomChannelSwitchDelay); 
                    
                } else {
                    // Fallback jika metadata channel tidak tersedia (kembali ke putar ulang)
                    console.log("[Channel Mode] Gagal mendapatkan ID Channel atau metadata. Memutar ulang video tunggal.");
                    const randomReplayDelay = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; 
                    
                    statusText.textContent = `Status: Selesai. Otomatis akan memutar ulang dalam ${Math.ceil(randomReplayDelay / 1000)} detik...`;
                    statusText.style.color = 'red';
                    
                    autoTimeout = setTimeout(() => {
                        resetAndPlayVideo(); 
                    }, randomReplayDelay);
                }
                
            } else {
                 // Logika Playlist Video Panjang
                 
                 // PENYEMPURNAAN 2: WAKTU TUNGGU PLAYLIST END ACAK (3-10 detik)
                 const randomPlaylistEndDelay = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
                 
                 statusText.textContent = `Status: Playlist Otomatis Selesai. Memuat ulang video pertama dalam ${Math.ceil(randomPlaylistEndDelay / 1000)} detik...`;
                 statusText.style.color = 'orange';

                 autoTimeout = setTimeout(() => {
                    if (player && typeof player.playVideoAt === 'function') {
                         player.playVideoAt(0);
                    }
                 }, randomPlaylistEndDelay); 
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


// --- KONTROL TOMBOL & LOGIKA UTAMA ---

function toggleAutoPlayback(forceStart = false) {
    const statusText = document.getElementById('status-text');
    const btn = document.getElementById('start-watch-btn');
    
    // Pengecekan Kesiapan Pemutar yang Lebih Baik
    if (!player || typeof player.getPlayerState !== 'function') {
         statusText.textContent = 'Status: Pemutar belum siap atau video belum dimuat.';
         statusText.style.color = 'red';
         return;
    }
    
    if (isAutoMode && !forceStart) {
        // --- Nonaktifkan Otomatis ---
        isAutoMode = false;
        player.pauseVideo();
        stopAutoScroll();
        stopAutoSessionTimeout();
        stopRandomInteraction(); 
        
        localStorage.setItem(LS_KEY_AUTO_MODE, 'false');

        if (autoTimeout) clearTimeout(autoTimeout);
        if (breakResumeTimeout) clearTimeout(breakResumeTimeout);

        statusText.textContent = 'Status: Otomatis NONAKTIF. Pemutaran dihentikan.';
        statusText.style.color = 'red';
        btn.textContent = 'Aktifkan Otomatis';
        
    } else {
        // --- Mulai Otomatis ---
        isAutoMode = true;
        
        // Simpan status dan URL terakhir ke localStorage
        localStorage.setItem(LS_KEY_AUTO_MODE, 'true');
        try {
             const currentUrl = player.getVideoUrl(); // URL video tunggal saat ini
             if (currentUrl) {
                  localStorage.setItem(LS_KEY_CONTENT_URL, currentUrl);
             }
        } catch(e) { /* Abaikan */ }
        
        // Memulai semua interval dan timeout
        startAutoScroll();
        startAutoSessionTimeout();
        startRandomInteraction(); 
        
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
             // Jika dijeda/dihentikan, putar (dengan penundaan)
             startAutoPlaybackWithDelay();
        } else {
             // Jika sudah diputar, perbarui status
             statusText.textContent = 'Status: Otomatis AKTIF. Video sedang diputar.';
             statusText.style.color = 'green';
        }
        
        btn.textContent = 'Nonaktifkan Otomatis (Jeda)';
        btn.disabled = false;
    }
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

    // Tambahkan script YouTube IFrame Player API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // Inisialisasi status awal
    document.getElementById('status-text').textContent = 'Status: Menunggu Pemutar YouTube Siap...';
});
