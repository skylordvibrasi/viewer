// --- KONSTANTA & VARIABEL GLOBAL ---
const SHORTS_MAX_DURATION_SECONDS = 60; 
const LS_KEY_AUTO_MODE = 'auto_watch_mode';
const LS_KEY_CONTENT_URL = 'auto_watch_url';

let player;
let isAutoMode = false;
let autoTimeout = null; 
let breakResumeTimeout = null; 
let scrollInterval = null; 
let interactionInterval = null; 
let sessionTimeout = null; 
let rateAdjustmentInterval = null; // [PENYEMPURNAAN 2] Interval untuk penyesuaian kecepatan
let currentVideoId = ''; 
let isPlaylistMode = false; 
let lastInteractedAt = 0; 
let isWindowFocused = true; // [PENYEMPURNAAN 3] Status fokus jendela

// --- PENYEMPURNAAN KRITIS: Flag untuk membedakan jeda manual dari jeda sistem/iklan ---
let isManualPause = false; 

// --- PENYEMPURNAAN KUSTOM: Logika Eksplorasi Channel ---
let playlistVideoCount = 0; 
let originalContentUrl = ''; // Menyimpan URL Awal
let isExploringMode = false; // Flag untuk melacak jika kita berada dalam 'lompatan eksplorasi'


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
    const rates = [0.75, 1.0, 1.25];
    return rates[Math.floor(Math.random() * rates.length)];
}

function isShortsMode() {
    const playerDiv = document.getElementById('player');
    // Cek juga durasi jika pemutar sudah memuat video
    let isShort = playerDiv.classList.contains('player-vertical');
    if (!isShort && player && typeof player.getDuration === 'function' && player.getDuration() > 0) {
        isShort = player.getDuration() <= SHORTS_MAX_DURATION_SECONDS;
    }
    return isShort;
}

// --- FUNGSI GRACEFUL SHUTDOWN (Pembersihan Semua Interval/Timeout) ---
function stopAllAutomation() {
    stopAutoScroll();
    stopAutoSessionReboot(); 
    stopRandomInteraction(); 
    stopRandomRateAdjustment(); // [PENYEMPURNAAN 2] Bersihkan interval rate
    if (autoTimeout) {
         clearTimeout(autoTimeout);
         autoTimeout = null;
    }
    if (breakResumeTimeout) {
         clearTimeout(breakResumeTimeout);
         breakResumeTimeout = null;
    }
    console.log("[SHUTDOWN] Semua interval/timeout otomatis telah dibersihkan.");
}


// --- KONTROL SCROLL ---
function startAutoScroll() {
    if (scrollInterval) clearTimeout(scrollInterval);
    const randomInterval = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000; 

    const scheduleScroll = () => {
        if (!isAutoMode) {
             scrollInterval = null; 
             return; 
        }
        const scrollDistance = Math.floor(Math.random() * 401) - 200; 
        window.scrollBy({ top: scrollDistance, behavior: 'smooth' });
        const nextInterval = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000; 
        scrollInterval = setTimeout(scheduleScroll, nextInterval);
    };

    scrollInterval = setTimeout(scheduleScroll, randomInterval); 
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearTimeout(scrollInterval);
        scrollInterval = null;
    }
}

// --- KONTROL INTERAKSI ---
function startRandomInteraction() {
    if (interactionInterval) clearTimeout(interactionInterval);
    const baseIntervalMs = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000; 

    const scheduleInteraction = () => {
        if (!isAutoMode) {
            interactionInterval = null;
            return;
        }
        
        const shouldInteract = Math.random() < 0.15; 

        if (shouldInteract) {
            
            // 1. Simulasi Gerakan Mouse di Player (sudah ada)
            const playerDiv = document.getElementById('player');
            const playerRect = playerDiv.getBoundingClientRect();
            const x = playerRect.left + Math.random() * playerRect.width;
            const y = playerRect.top + Math.random() * playerRect.height;
            
            const mouseMoveEvent = new MouseEvent('mousemove', {
                view: window, bubbles: true, cancelable: true, clientX: x, clientY: y
            });
            playerDiv.dispatchEvent(mouseMoveEvent);

            lastInteractedAt = Date.now();

            // 2. Simulasi Interaksi Non-Player [PENYEMPURNAAN 1]
            const container = document.getElementById('watch7-content'); // Container utama
            if (container) {
                // A. Simulasi Klik Like/Dislike (Probabilitas 5%)
                if (Math.random() < 0.05) {
                    // Selektor untuk tombol Like/Dislike di YT (bisa berubah)
                    const likeButton = container.querySelector('ytd-toggle-button-renderer:nth-child(1) button'); 
                    if (likeButton) {
                        likeButton.click();
                        console.log("[Interaksi] Simulasi klik tombol Suka/Tidak Suka.");
                    }
                }
                
                // B. Simulasi Toggle Deskripsi (Probabilitas 10%)
                if (Math.random() < 0.10) {
                    // Selektor untuk tombol toggle deskripsi (bisa berubah)
                    const descriptionToggle = container.querySelector('#description-container #more-button button'); 
                    if (descriptionToggle) {
                         descriptionToggle.click();
                         console.log("[Interaksi] Simulasi Toggle Deskripsi/Komentar.");
                    }
                }
            }


            // 3. Simulasi Jeda Acak (Sudah ada)
            if (Math.random() < 0.25 && player.getPlayerState() === YT.PlayerState.PLAYING) {
                
                 if (breakResumeTimeout) clearTimeout(breakResumeTimeout);
                 const breakDuration = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
                 
                 // --- PENTING: Set isManualPause=true agar onPlayerStateChange mengabaikan jeda ini
                 isManualPause = true; 
                 player.pauseVideo();
                 
                 breakResumeTimeout = setTimeout(() => {
                     // Reset flag setelah jeda selesai
                     isManualPause = false; 
                     
                     if (player && player.getPlayerState() === YT.PlayerState.PAUSED) {
                         player.playVideo();
                     }
                     breakResumeTimeout = null;
                 }, breakDuration);
            }
        }
        
        const nextInterval = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000; 
        interactionInterval = setTimeout(scheduleInteraction, nextInterval);
    };

    interactionInterval = setTimeout(scheduleInteraction, baseIntervalMs); 
}

function stopRandomInteraction() {
    if (interactionInterval) {
        clearTimeout(interactionInterval);
        interactionInterval = null;
    }
}

// --- KONTROL PENYESUAIAN PLAYBACK RATE [PENYEMPURNAAN 2] ---
function startRandomRateAdjustment() {
    if (rateAdjustmentInterval) clearTimeout(rateAdjustmentInterval);
    // Interval 5 - 10 menit
    const randomInterval = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000; 

    rateAdjustmentInterval = setTimeout(() => {
        if (isAutoMode && player && player.getPlayerState() === YT.PlayerState.PLAYING) {
            const newRate = getRandomPlaybackRate();
            if (player.getPlaybackRate() !== newRate) {
                 player.setPlaybackRate(newRate);
                 console.log(`[Rate] Kecepatan diubah menjadi ${newRate}x.`);
            }
        }
        // Jadwalkan lagi terlepas dari apakah rate diubah atau tidak
        startRandomRateAdjustment(); 
    }, randomInterval);
}

function stopRandomRateAdjustment() {
    if (rateAdjustmentInterval) {
        clearTimeout(rateAdjustmentInterval);
        rateAdjustmentInterval = null;
    }
}


// --- FUNGSI EKSPLORASI BARU: Mencari dan Memutar Video Terkait ---
function findAndPlayRelatedVideo() {
    // Selector untuk mendapatkan daftar video yang disarankan di sidebar YouTube
    // Catatan: Selector ini sering berubah, tapi 'ytd-compact-video-renderer' umumnya stabil
    const relatedVideos = document.querySelectorAll('ytd-compact-video-renderer'); 

    if (relatedVideos.length === 0) {
        console.log("[Eksplorasi] Gagal menemukan video terkait. Kembali ke playlist utama.");
        return false;
    }

    // Pilih video acak dari 5 video teratas untuk simulasi yang realistis
    const maxIndex = Math.min(relatedVideos.length, 5);
    const randomIndex = Math.floor(Math.random() * maxIndex);
    const selectedVideo = relatedVideos[randomIndex];
    
    // Temukan tombol/link yang sebenarnya untuk diklik
    const videoLink = selectedVideo.querySelector('a#thumbnail'); 
    
    if (videoLink) {
        // Ekstrak URL untuk mendapatkan Video ID yang baru
        const url = videoLink.href;
        const newVideoId = extractVideoId(url);
        
        if (newVideoId && player && typeof player.loadVideoById === 'function') {
            
            // PENTING: Set mode eksplorasi sebelum memuat
            isExploringMode = true; 
            isPlaylistMode = false; // Video tunggal (eksplorasi)
            
            player.loadVideoById({
                videoId: newVideoId,
                startSeconds: 0,
                suggestedQuality: getRandomQuality()
            });
            player.setPlaybackRate(getRandomPlaybackRate());
            
            console.log(`[Eksplorasi] Memuat video terkait: ${newVideoId}`);
            return true;
        }
    }
    return false;
}


// --- KONTROL SESI (Reboot Sesi Otomatis) ---

function startAutoSessionReboot() {
    if (sessionTimeout) clearTimeout(sessionTimeout);

    const sessionDuration = Math.floor(Math.random() * (3600000 - 600000 + 1)) + 600000; 
    const sessionHours = Math.floor(sessionDuration / 3600000);
    const sessionMinutes = Math.round((sessionDuration % 3600000) / 60000);
    
    sessionTimeout = setTimeout(() => {
        
        if (!isAutoMode) return; 
        
        stopAllAutomation(); 
        
        const statusText = document.getElementById('status-text');
        statusText.textContent = `Status: Sesi reboot otomatis setelah ${sessionHours} jam ${sessionMinutes} menit.`;
        statusText.style.color = 'orange';

        // Mulai ulang semua interval
        startAutoScroll();
        startRandomInteraction(); 
        startRandomRateAdjustment(); // [PENYEMPURNAAN 2]
        startAutoSessionReboot(); 
        
        if (player && player.getPlayerState() !== YT.PlayerState.PLAYING) {
             startAutoPlaybackWithDelay(); 
        }
        
    }, sessionDuration);
}

function stopAutoSessionReboot() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
}


// --- FUNGSI UTAMA UNTUK MUAT KONTEN ---
function loadContentFromUrl(url, fromAutoStart = false) {
    const statusText = document.getElementById('status-text');
    const watchBtn = document.getElementById('start-watch-btn');
    const playerDiv = document.getElementById('player');
    
    const trimmedUrl = url.trim(); 
    
    const newVideoId = extractVideoId(trimmedUrl);
    const newPlaylistId = extractPlaylistId(trimmedUrl);
    
    if (!player || typeof player.loadPlaylist !== 'function' || player.getVideoData().video_id === undefined) {
        if (!fromAutoStart) {
             alert("Pemutar belum siap. Harap tunggu sebentar.");
        }
        return false; 
    }
    
    playerDiv.classList.remove('player-vertical'); 
    
    // --- PENYEMPURNAAN KUSTOM 1: Simpan URL Asli dan Reset Eksplorasi ---
    if (!fromAutoStart) {
        originalContentUrl = trimmedUrl; 
        playlistVideoCount = 0; // Reset hitungan saat memuat konten baru
        isExploringMode = false;
    } else if (isExploringMode) {
         // Jika ini adalah pemuatan ulang setelah eksplorasi, pastikan mode playlist dipertahankan
         const storedId = extractPlaylistId(originalContentUrl) || extractVideoId(originalContentUrl);
         if (storedId) {
             isPlaylistMode = storedId.startsWith('PL') || storedId.startsWith('LL') || storedId.startsWith('UU');
             currentVideoId = isPlaylistMode ? '' : storedId;
         }
         isExploringMode = false; // Reset eksplorasi saat kembali
    }
    
    // --- PENTING: Hentikan semua interval saat memuat konten baru
    stopAllAutomation(); 
    localStorage.removeItem(LS_KEY_AUTO_MODE);
    localStorage.setItem(LS_KEY_CONTENT_URL, trimmedUrl); 

    if (newPlaylistId) {
        isPlaylistMode = true;
        currentVideoId = ''; 
        
        player.loadPlaylist({
            list: newPlaylistId,
            listType: 'playlist',
            index: 0,
            suggestedQuality: getRandomQuality(),
            shuffle: true 
        });
        player.setPlaybackRate(getRandomPlaybackRate());
        statusText.textContent = fromAutoStart ? 'Status: Playlist otomatis dimuat ulang (Acak).' : 'Status: Playlist dimuat. Klik "Aktifkan Otomatis".';
        
    } else if (newVideoId) {
        currentVideoId = newVideoId;
        isPlaylistMode = false;
        
        if (trimmedUrl.includes('shorts/') || (newVideoId.length === 11 && trimmedUrl.includes('youtube.com/'))) {
             playerDiv.classList.add('player-vertical');
        }
        
        player.loadVideoById({
            videoId: newVideoId,
            startSeconds: 0,
            suggestedQuality: getRandomQuality()
        });
        player.setPlaybackRate(getRandomPlaybackRate());
        
        statusText.textContent = fromAutoStart ? 'Status: Video otomatis dimuat ulang.' : 'Status: Video Tunggal dimuat. Klik "Aktifkan Otomatis".';
    } else if (!fromAutoStart) {
        alert("URL tidak valid. Harap masukkan URL video atau playlist YouTube yang benar.");
        localStorage.removeItem(LS_KEY_CONTENT_URL); 
        return false;
    }

    watchBtn.textContent = 'Aktifkan Otomatis'; 
    watchBtn.disabled = false;

    if (!fromAutoStart && player && typeof player.pauseVideo === 'function') {
         // --- PENTING: Set isManualPause=true untuk menghindari logika jeda iklan yang tidak perlu
         isManualPause = true; 
         player.pauseVideo();
         setTimeout(() => { isManualPause = false; }, 500); 
         
         statusText.textContent = isPlaylistMode 
            ? 'Status: Playlist dimuat. Klik "Aktifkan Otomatis" untuk memulai.' 
            : 'Status: Video dimuat. Klik "Aktifkan Otomatis" untuk memulai.';
         statusText.style.color = 'var(--warna-teks-muda)'; 
    }

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
        videoId: '2J-6hR8Q2hY', 
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
    
    const storedUrl = localStorage.getItem(LS_KEY_CONTENT_URL);
    const storedAutoMode = localStorage.getItem(LS_KEY_AUTO_MODE) === 'true';
    
    if (storedUrl) {
         loadContentFromUrl(storedUrl, true);
         // Ambil URL yang tersimpan, ini mungkin menjadi originalContentUrl
         if (!originalContentUrl) {
              originalContentUrl = storedUrl;
         }
    }
    
    if (storedAutoMode && storedUrl) {
         setTimeout(() => {
              if (player.getVideoData().video_id) { 
                 toggleAutoPlayback(true);
              }
         }, 1500); 
    }
}

function startAutoPlaybackWithDelay() {
    const randomDelay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
    
    if (autoTimeout) clearTimeout(autoTimeout);
    
    const statusText = document.getElementById('status-text');
    statusText.textContent = `Status: Otomatis AKTIF. Memutar dalam ${Math.ceil(randomDelay / 1000)} detik...`;
    statusText.style.color = 'blue';

    autoTimeout = setTimeout(() => {
        if (player && typeof player.playVideo === 'function' && 
            (player.getPlayerState() === YT.PlayerState.CUED || player.getPlayerState() === YT.PlayerState.PAUSED)) {
            player.playVideo();
        }
        autoTimeout = null;
    }, randomDelay);
}

function resetAndPlayVideo() {
    const currentVidId = player ? player.getVideoData().video_id : currentVideoId; 
    
    if (currentVidId && !isPlaylistMode && player && typeof player.loadVideoById === 'function') {
         
         player.loadVideoById({
            videoId: currentVidId,
            startSeconds: 0,
            suggestedQuality: getRandomQuality()
         });
         player.setPlaybackRate(getRandomPlaybackRate());
         
         document.getElementById('status-text').textContent = `Status: Video Tunggal dimuat ulang.`;
         document.getElementById('status-text').style.color = 'green';
         
    } else if (isPlaylistMode) {
         if (player && typeof player.playVideoAt === 'function') {
              player.playVideoAt(0); 
              player.setPlaybackRate(getRandomPlaybackRate());
         }
    }
}


function onPlayerError(event) {
    const statusText = document.getElementById('status-text');
    let errorMessage = '';

    if (event.data === 100 || event.data === 101 || event.data === 150) {
         errorMessage = 'Video tidak tersedia, pribadi, atau pemutaran disematkan dilarang.';
    } else if (event.data === 2) {
         errorMessage = 'Parameter tidak valid (mungkin format ID video salah).';
    } else {
         errorMessage = `Kesalahan pemutar yang tidak diketahui (Kode: ${event.data}).`;
    }
    
    statusText.textContent = `Status: ERROR. ${errorMessage} Menghentikan Otomatis...`;
    statusText.style.color = 'red';
    
    toggleAutoPlayback(false); 
    document.getElementById('start-watch-btn').disabled = false;
}

// Fungsi untuk menangani perubahan status pemutar (TERBARU)
function onPlayerStateChange(event) {
    const statusText = document.getElementById('status-text');
    const btn = document.getElementById('start-watch-btn');
    const playerState = event.data;

    if (autoTimeout) {
        clearTimeout(autoTimeout);
        autoTimeout = null;
    }
    
    // Penanganan Video Hilang/Dibatasi di Playlist (SKIP)
    if (playerState === YT.PlayerState.UNSTARTED) {
         const isUnplayable = player.getDuration() === 0 && (isPlaylistMode || isExploringMode); 
         
         if (isUnplayable) {
             statusText.textContent = 'Status: Terdeteksi Video Hilang/Dibatasi. Otomatis LOMPAT ke video berikutnya/kembali...';
             statusText.style.color = 'red';
             
             setTimeout(() => {
                  if (isExploringMode) {
                       // Jika di eksplorasi dan gagal, kembali ke playlist utama
                       loadContentFromUrl(originalContentUrl, true);
                       isExploringMode = false;
                  } else if (player && typeof player.nextVideo === 'function') {
                       // Jika di playlist dan gagal, lanjut ke video berikutnya
                       player.nextVideo();
                  }
             }, 1000);
             return;
         }
         
         if (isAutoMode) {
             startAutoPlaybackWithDelay();
             return;
         }
    }

    // Penanganan PLAYING state
    if (playerState === YT.PlayerState.PLAYING) {
        
        // Reset jeda manual/break
        isManualPause = false; 
        if (breakResumeTimeout) clearTimeout(breakResumeTimeout); breakResumeTimeout = null;

        // Mulai penyesuaian rate acak jika belum berjalan
        if (!rateAdjustmentInterval) { // [PENYEMPURNAAN 2]
             startRandomRateAdjustment();
        }

        let currentVideoIndex = 1;
        let totalVideos = 1;
        try {
             currentVideoIndex = isPlaylistMode ? player.getPlaylistIndex() + 1 : 1;
             totalVideos = isPlaylistMode ? player.getPlaylist().length : 1;
             
             // Atur kecepatan pemutaran hanya jika saat ini 1.0x dan mode Otomatis aktif
             if (isAutoMode && player.getPlaybackRate() === 1.0) { 
                  player.setPlaybackRate(getRandomPlaybackRate());
             }
             
        } catch(e) { /* Abaikan */ }

        let statusMode = isExploringMode ? 'EKSPLORASI (1 Video Terkait)' : 
                         (isPlaylistMode ? `Memutar Video ${currentVideoIndex} dari ${totalVideos}` : 'Video sedang diputar');
        
        statusText.textContent = `Status: Otomatis AKTIF. ${statusMode}. Kecepatan: ${player.getPlaybackRate()}x`; 
        
        statusText.style.color = isExploringMode ? 'purple' : 'green';
        btn.textContent = 'Nonaktifkan Otomatis (Jeda)'; 
        btn.disabled = false; 
        
    // Penanganan PAUSED state
    } else if (playerState === YT.PlayerState.PAUSED) {
        
        // Hentikan penyesuaian rate saat dijeda
        stopRandomRateAdjustment(); // [PENYEMPURNAAN 2]

        // Abaikan jeda yang disebabkan oleh interaksi acak yang direncanakan
        if (breakResumeTimeout) {
             return; 
        }
        
        // Abaikan jeda yang disebabkan oleh interaksi/tombol manual atau kehilangan fokus
        if (isManualPause) {
             statusText.textContent = 'Status: Dijeda secara manual. Klik "Aktifkan Otomatis" atau Putar di player.';
             statusText.style.color = 'red';
             btn.textContent = 'Aktifkan Otomatis';
             return; 
        }

        if (isAutoMode) { 
             const adsWaitDelay = Math.floor(Math.random() * (15000 - 10000 + 1)) + 10000;
             const waitSeconds = Math.ceil(adsWaitDelay / 1000);

             statusText.textContent = `Status: Terdeteksi Jeda Tak Terduga (Kemungkinan Iklan/Buffer). Melanjutkan dalam ${waitSeconds} detik...`;
             statusText.style.color = 'orange';
             
             if (autoTimeout) clearTimeout(autoTimeout);
             autoTimeout = setTimeout(() => {
                 if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === YT.PlayerState.PAUSED) {
                      player.playVideo();
                 }
                 autoTimeout = null;
             }, adsWaitDelay); 
        } else {
             statusText.textContent = 'Status: Dijeda secara manual. Klik "Aktifkan Otomatis" atau Putar di player.';
             statusText.style.color = 'red';
             btn.textContent = 'Aktifkan Otomatis';
        }
        
    // Penanganan ENDED state (Dirombak untuk Eksplorasi)
    } else if (playerState === YT.PlayerState.ENDED) {
        // Hentikan penyesuaian rate saat selesai
        stopRandomRateAdjustment(); 
        
        if (isAutoMode) {
            
            // Logika Kembali dari Eksplorasi
            if (isExploringMode) {
                 const randomExploreEndDelay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
                 
                 statusText.textContent = `Status: Eksplorasi (1 Video Terkait) Selesai. Kembali ke konten awal dalam ${Math.ceil(randomExploreEndDelay / 1000)} detik...`;
                 statusText.style.color = 'purple'; 

                 autoTimeout = setTimeout(() => {
                    // Muat ulang konten asli (ini akan memulai siklus dari awal)
                    loadContentFromUrl(originalContentUrl, true);
                    
                    statusText.textContent = `Status: Otomatis AKTIF. Kembali ke konten awal.`;
                 }, randomExploreEndDelay); 
                 
                 return;
            }
            
            // Logika Eksplorasi Khusus (Setiap 3 video)
            if (isPlaylistMode && !isShortsMode()) {
                playlistVideoCount++;
                console.log(`[Eksplorasi] Video ke-${playlistVideoCount} selesai di playlist utama.`);

                if (playlistVideoCount >= 3) {
                    
                    if (autoTimeout) clearTimeout(autoTimeout); 
                    const randomExploreStartDelay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
                    
                    statusText.textContent = `Status: Video ke-3 Selesai. Otomatis LOMPAT Eksplorasi (1 Video Terkait) dalam ${Math.ceil(randomExploreStartDelay / 1000)} detik...`;
                    statusText.style.color = 'purple'; 
                    btn.textContent = 'Nonaktifkan Otomatis (Jeda)'; 
                    
                    playlistVideoCount = 0; // Reset hitungan di sini

                    autoTimeout = setTimeout(() => {
                        const jumped = findAndPlayRelatedVideo();
                        if (!jumped) {
                            // Gagal melompat (misal, tidak ada saran), lanjut ke video berikutnya di playlist
                            player.nextVideo();
                            isExploringMode = false;
                            console.log("[Eksplorasi] Gagal Lompat. Lanjut ke video playlist berikutnya.");
                        }
                    }, randomExploreStartDelay); 
                    
                    return; // Selesai, tunggu timeout eksplorasi/lompatan
                }
            } 
            

            // Logika Shorts/Pendek (Tidak tersentuh)
            if (isShortsMode()) {
                 const randomShortsDelay = Math.floor(Math.random() * (3000 - 500 + 1)) + 500; 
                 
                 statusText.textContent = `Status: Selesai (Shorts/Pendek). Otomatis memuat berikutnya dalam ${Math.ceil(randomShortsDelay / 1000)} detik...`;
                 statusText.style.color = 'blue';

                 autoTimeout = setTimeout(() => {
                     if (player && typeof player.nextVideo === 'function') {
                          player.nextVideo(); 
                     }
                 }, randomShortsDelay);
                 
            // Logika Video Tunggal (setelah pemeriksaan eksplorasi)
            } else if (!isPlaylistMode) {
                
                // Jika video tunggal dan bukan mode eksplorasi (hanya pemutaran tunggal), lakukan pemutaran ulang
                const randomWaitDelay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000; 
                    
                statusText.textContent = `Status: Video Tunggal Selesai. Menonton saran selama ${Math.ceil(randomWaitDelay / 1000)} detik... Otomatis akan memutar ulang.`;
                statusText.style.color = 'orange';

                autoTimeout = setTimeout(() => {
                    resetAndPlayVideo(); 
                    
                }, randomWaitDelay);
                
            } else {
                 // Logika Playlist berakhir (memuat ulang playlist yang sama)
                 const randomPlaylistEndDelay = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
                 
                 statusText.textContent = `Status: Playlist Otomatis Selesai. Memuat ulang acak dalam ${Math.ceil(randomPlaylistEndDelay / 1000)} detik...`;
                 statusText.style.color = 'orange';

                 autoTimeout = setTimeout(() => {
                    if (player && typeof player.loadPlaylist === 'function') {
                         
                         const storedUrl = originalContentUrl || localStorage.getItem(LS_KEY_CONTENT_URL);
                         const newPlaylistId = extractPlaylistId(storedUrl);

                         if (newPlaylistId) {
                             player.loadPlaylist({
                                 list: newPlaylistId,
                                 listType: 'playlist',
                                 index: 0,
                                 shuffle: true, 
                                 suggestedQuality: getRandomQuality()
                             });
                             statusText.textContent = `Status: Otomatis AKTIF. Playlist dimuat ulang (Acak).`;
                             playlistVideoCount = 0; // Reset hitungan saat playlist dimuat ulang
                         } else {
                            player.playVideoAt(0);
                         }

                    }
                 }, randomPlaylistEndDelay); 
            }
        } else {
            statusText.textContent = 'Status: Selesai. Mode Otomatis TIDAK aktif. Klik "Aktifkan Otomatis" untuk memulai.';
            statusText.style.color = 'var(--warna-teks-muda)';
            btn.textContent = 'Aktifkan Otomatis';
        }
    } 
    
    // Penanganan BUFFERING state
    else if (playerState === YT.PlayerState.BUFFERING) {
        if (isAutoMode) {
             statusText.textContent = 'Status: Buffering... Otomatis menunggu.';
             statusText.style.color = 'orange';
        }
    }
    
    // Penanganan CUED state (Hanya jika tidak dalam mode otomatis)
    else if (playerState === YT.PlayerState.CUED && !isAutoMode) {
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
    
    if (!player || typeof player.getPlayerState !== 'function' || player.getVideoData().video_id === undefined) {
         statusText.textContent = 'Status: Pemutar belum siap atau video belum dimuat.';
         statusText.style.color = 'red';
         return;
    }
    
    if (isAutoMode && !forceStart) {
        // --- Nonaktifkan Otomatis ---
        isAutoMode = false;
        
        // --- PENTING: Set flag jeda manual sebelum jeda, untuk mencegah resume otomatis
        isManualPause = true; 
        player.pauseVideo();
        
        stopAllAutomation(); // Pembersihan semua timeout/interval
        
        localStorage.setItem(LS_KEY_AUTO_MODE, 'false');

        statusText.textContent = 'Status: Otomatis NONAKTIF. Pemutaran dihentikan.';
        statusText.style.color = 'red';
        btn.textContent = 'Aktifkan Otomatis';
        
        setTimeout(() => { isManualPause = false; }, 500); 
        
    } else {
        // --- Mulai Otomatis ---
        isAutoMode = true;
        
        localStorage.setItem(LS_KEY_AUTO_MODE, 'true');
        
        startAutoScroll();
        startAutoSessionReboot(); 
        startRandomInteraction(); 
        startRandomRateAdjustment(); // [PENYEMPURNAAN 2] Mulai penyesuaian rate acak
        
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
             isManualPause = false; 
             startAutoPlaybackWithDelay();
        } else {
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
        
        // PEMBERSIHAN TOTAL SEBELUM MUAT KONTEN BARU
        isAutoMode = false;
        isManualPause = false; 
        stopAllAutomation(); 
        localStorage.removeItem(LS_KEY_AUTO_MODE);
        localStorage.removeItem(LS_KEY_CONTENT_URL); 
        
        const loaded = loadContentFromUrl(url);
        if (loaded) {
            urlInput.value = ''; 
        }
    });

    // [PENYEMPURNAAN 3] Penanganan Fokus Jendela
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            isWindowFocused = false;
            // Jeda sementara saat tab tidak terlihat, jika Otomatis aktif
            if (isAutoMode && player && player.getPlayerState() === YT.PlayerState.PLAYING) {
                 // Set flag jeda manual agar onPlayerStateChange mengabaikan jeda ini
                 isManualPause = true; 
                 player.pauseVideo();
                 console.log("[Fokus] Tab tidak terlihat. Dijeda.");
            }
        } else {
            isWindowFocused = true;
            // Lanjutkan setelah tab kembali terlihat, jika Otomatis aktif
            if (isAutoMode && player && player.getPlayerState() === YT.PlayerState.PAUSED) {
                 isManualPause = false; // Reset flag
                 startAutoPlaybackWithDelay(); // Lanjutkan dengan penundaan acak
                 console.log("[Fokus] Tab kembali terlihat. Dilanjutkan otomatis.");
            }
        }
    });


    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    document.getElementById('status-text').textContent = 'Status: Menunggu Pemutar YouTube Siap...';
});
