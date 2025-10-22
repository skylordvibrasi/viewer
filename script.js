// --- KONSTANTA & VARIABEL GLOBAL ---
const SHORTS_MAX_DURATION_SECONDS = 60; // Definisi maksimal durasi Shorts
const LS_KEY_AUTO_MODE = 'auto_watch_mode';
const LS_KEY_CONTENT_URL = 'auto_watch_url';
// CATATAN: SCROLL_INTERVAL_MS DIHAPUS, SEKARANG DIHITUNG DINAMIS

let player;
let isAutoMode = false;
let autoTimeout = null; // Timeout untuk penundaan pemutaran
let breakResumeTimeout = null; // Timeout untuk jeda interaksi
let scrollInterval = null; // Interval untuk gulir acak (Sekarang berupa setTimeout ID)
let interactionInterval = null; // Interval untuk interaksi acak (Sekarang berupa setTimeout ID)
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
    // Kualitas acak untuk naturalness
    const qualities = ['small', 'medium', 'large', 'hd720'];
    return qualities[Math.floor(Math.random() * qualities.length)];
}

function getRandomPlaybackRate() {
    // Kecepatan acak untuk naturalness
    const rates = [0.75, 1.0, 1.25];
    return rates[Math.floor(Math.random() * rates.length)];
}

// FUNGSI BARU: Mengecek apakah dalam mode tampilan vertikal (Shorts)
function isShortsMode() {
    const playerDiv = document.getElementById('player');
    return playerDiv.classList.contains('player-vertical');
}


// --- KONTROL SCROLL (GULIR) - OPTIMASI INTERVAL DINAMIS ---

function startAutoScroll() {
    // Gunakan clearTimeout karena sekarang menggunakan setTimeout rekursif
    if (scrollInterval) clearTimeout(scrollInterval);
    
    // Interval scroll acak pertama (8 - 15 detik)
    const randomInterval = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000; 

    console.log(`[SCROLL] Memulai Scroll Otomatis. Interval Awal: ${randomInterval}ms.`); 
    
    // Fungsi rekursif untuk interval yang dinamis
    const scheduleScroll = () => {
        if (!isAutoMode) {
             console.log("[SCROLL] Dihentikan di dalam interval: isAutoMode false.");
             scrollInterval = null; 
             return;
        }
        
        // 1. Lakukan aksi scroll
        // Jarak gulir acak antara -200px dan +200px (Natural)
        const scrollDistance = Math.floor(Math.random() * 401) - 200; 
        window.scrollBy({ top: scrollDistance, behavior: 'smooth' });
        console.log(`[SCROLL] Gulir sebesar: ${scrollDistance}px`); 
        
        // 2. Tentukan interval acak berikutnya (8 - 15 detik)
        const nextInterval = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000; 
        
        // 3. Jadwalkan panggilan berikutnya
        scrollInterval = setTimeout(scheduleScroll, nextInterval);
    };

    // Panggil pertama kali
    scheduleScroll();
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearTimeout(scrollInterval);
        scrollInterval = null;
        console.log("[SCROLL] Scroll Otomatis Dihentikan.");
    }
}

// --- KONTROL INTERAKSI (Simulasi Mouse Move/Click) - OPTIMASI INTERVAL DINAMIS ---

function startRandomInteraction() {
    if (interactionInterval) clearTimeout(interactionInterval);

    // Interval dasar pertama untuk mencoba interaksi (Acak 10-25 detik)
    const baseIntervalMs = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000; 

    console.log(`[INTERAKSI] Memulai Interaksi Acak. Interval Awal: ${baseIntervalMs}ms.`); 

    const scheduleInteraction = () => {
        if (!isAutoMode) {
            interactionInterval = null;
            return;
        }
        
        // Peluang Interaksi: 15% setiap interval
        const shouldInteract = Math.random() < 0.15; 

        if (shouldInteract) {
            
            // 1. Simulasi gerakan mouse di atas player
            const playerRect = document.getElementById('player').getBoundingClientRect();
            const x = playerRect.left + Math.random() * playerRect.width;
            const y = playerRect.top + Math.random() * playerRect.height;
            const event = new MouseEvent('mousemove', {
                view: window, bubbles: true, cancelable: true, clientX: x, clientY: y
            });
            
            // Tambahkan simulasi mouseout dan mouseenter (lebih alami)
            const playerDiv = document.getElementById('player');
            playerDiv.dispatchEvent(new MouseEvent('mouseout', { view: window, bubbles: true }));
            playerDiv.dispatchEvent(event);
            playerDiv.dispatchEvent(new MouseEvent('mouseenter', { view: window, bubbles: true }));

            lastInteractedAt = Date.now();
            console.log("[INTERAKSI] Mouse move acak disimulasikan.");

            // 2. Terkadang, mensimulasikan jeda/lanjut singkat (25% kemungkinan)
            if (Math.random() < 0.25 && player.getPlayerState() === YT.PlayerState.PLAYING) {
                
                 if (breakResumeTimeout) clearTimeout(breakResumeTimeout);
                 
                 // Jeda 5-15 detik (Lebih bervariasi)
                 const breakDuration = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
                 player.pauseVideo();
                 console.log(`[INTERAKSI] Jeda singkat disimulasikan selama ${Math.ceil(breakDuration/1000)} detik.`);
                 
                 breakResumeTimeout = setTimeout(() => {
                     player.playVideo();
                     breakResumeTimeout = null;
                     console.log("[INTERAKSI] Pemutaran dilanjutkan.");
                 }, breakDuration);
            }
        }
        
        // 3. Tentukan interval acak berikutnya (10 - 25 detik)
        const nextInterval = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000; 
        
        // 4. Jadwalkan panggilan berikutnya
        interactionInterval = setTimeout(scheduleInteraction, nextInterval);
    };

    // Panggil pertama kali
    scheduleInteraction();
}

function stopRandomInteraction() {
    if (interactionInterval) {
        clearTimeout(interactionInterval);
        interactionInterval = null;
        console.log("[INTERAKSI] Interaksi Acak Dihentikan.");
    }
}


// --- KONTROL SESI (Diubah menjadi Reboot Sesi Otomatis) ---

// REVISI: Mengubah timeout menjadi REBOOT berkelanjutan
function startAutoSessionReboot() {
    if (sessionTimeout) clearTimeout(sessionTimeout);

    // Sesi 10-60 menit (600000ms hingga 3600000ms) - Dipertahankan untuk simulasi wajar
    const sessionDuration = Math.floor(Math.random() * (3600000 - 600000 + 1)) + 600000; 
    const sessionHours = Math.floor(sessionDuration / 3600000);
    const sessionMinutes = Math.round((sessionDuration % 3600000) / 60000);
    
    console.log(`[SESI] Sesi Otomatis akan REBOOT dalam: ${sessionHours} jam ${sessionMinutes} menit.`);

    sessionTimeout = setTimeout(() => {
        
        console.log("[SESI] Timeout sesi tercapai. Melakukan REBOOT otomatis.");
        
        // 1. Hentikan interval lama
        stopAutoScroll();
        stopRandomInteraction(); 
        
        // 2. Perbarui status
        const statusText = document.getElementById('status-text');
        statusText.textContent = `Status: Sesi reboot otomatis setelah ${sessionHours} jam ${sessionMinutes} menit.`;
        statusText.style.color = 'orange';

        // 3. Mulai ulang semua interval dan timeout (Reboot)
        startAutoScroll();
        startRandomInteraction(); 
        startAutoSessionReboot(); // <-- REKURENSI: Mulai timer untuk sesi berikutnya!
        
        // 4. Pastikan pemutaran dilanjutkan
        if (player && player.getPlayerState() !== YT.PlayerState.PLAYING) {
             player.playVideo();
        }
        
    }, sessionDuration);
}

function stopAutoSessionReboot() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
        console.log("[SESI] Timeout Sesi Otomatis Dihentikan.");
    }
}


// --- FUNGSI UTAMA UNTUK MUAT KONTEN ---
function loadContentFromUrl(url, fromAutoStart = false) {
    const statusText = document.getElementById('status-text');
    const watchBtn = document.getElementById('start-watch-btn');
    const playerDiv = document.getElementById('player');
    
    const newVideoId = extractVideoId(url);
    const newPlaylistId = extractPlaylistId(url);
    
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
            shuffle: true 
        });
        player.setPlaybackRate(getRandomPlaybackRate());

        statusText.textContent = fromAutoStart ? 'Status: Playlist otomatis dimuat ulang (Acak).' : 'Status: Playlist dimuat (Acak). Klik "Aktifkan Otomatis".';
        
    } else if (newVideoId) {
        currentVideoId = newVideoId;
        isPlaylistMode = false;
        
        if (url.includes('shorts/') || (newVideoId.length === 11 && (url.includes('t=')) && (url.includes('youtube.com/')))) {
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
    // Penundaan acak sebelum pemutaran (2-5 detik untuk naturalness)
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
    stopAutoSessionReboot(); 
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
                  // Jika video tunggal hilang, hentikan karena tidak bisa melanjutkan
                  onPlayerError({data: 100}); 
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
                    
                    // WAKTU TUNGGU CHANNEL SWITCH ACAK (3-8 detik untuk naturalness)
                    const randomChannelSwitchDelay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
                    
                    statusText.textContent = `Status: Video Tunggal Selesai. Otomatis beralih ke video acak Channel (${currentVideoData.author}) dalam ${Math.ceil(randomChannelSwitchDelay / 1000)} detik...`;
                    statusText.style.color = 'blue';

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
                            // Fallback jika gagal loadPlaylist, panggil logika gagal (Tunggu Alami)
                            onPlayerStateChange({data: YT.PlayerState.ENDED, target: player});
                        }
                    }, randomChannelSwitchDelay); 
                    
                } else {
                    // REVISI NATURAL: Fallback jika metadata channel tidak tersedia (TUNGGU LAMA DI LAYAR SARAN)
                    console.log("[Channel Mode] Gagal mendapatkan ID Channel atau metadata. Menunggu di layar saran.");
                    
                    // Jeda yang lebih lama (30-90 detik) untuk melihat layar saran video (Sangat Natural)
                    const randomWaitDelay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000; 
                    
                    statusText.textContent = `Status: Gagal beralih ke Channel. Menonton saran selama ${Math.ceil(randomWaitDelay / 1000)} detik... Otomatis akan memutar ulang.`;
                    statusText.style.color = 'orange';

                    autoTimeout = setTimeout(() => {
                        console.log("[Channel Mode] Waktu tunggu layar saran selesai. Memutar ulang video tunggal sebagai upaya terakhir.");
                        resetAndPlayVideo(); 
                        
                    }, randomWaitDelay);
                }
                
            } else {
                 // Logika Playlist Video Panjang
                 
                 // WAKTU TUNGGU PLAYLIST END ACAK (3-10 detik untuk naturalness)
                 const randomPlaylistEndDelay = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
                 
                 statusText.textContent = `Status: Playlist Otomatis Selesai. Memuat ulang acak dalam ${Math.ceil(randomPlaylistEndDelay / 1000)} detik...`;
                 statusText.style.color = 'orange';

                 autoTimeout = setTimeout(() => {
                    if (player && typeof player.loadPlaylist === 'function') {
                         
                         // Muat ulang playlist dengan mode acak (menggunakan URL tersimpan)
                         const storedUrl = localStorage.getItem(LS_KEY_CONTENT_URL);
                         const newPlaylistId = extractPlaylistId(storedUrl);

                         if (newPlaylistId) {
                             player.loadPlaylist({
                                 list: newPlaylistId,
                                 listType: 'playlist',
                                 index: 0,
                                 shuffle: true, // PENTING: Aktifkan mode acak
                                 suggestedQuality: getRandomQuality()
                             });
                             statusText.textContent = `Status: Otomatis AKTIF. Playlist dimuat ulang (Acak).`;
                         } else {
                            // Fallback jika gagal dapat ID Playlist, coba putar ulang dari awal (kurang acak tapi aman)
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
        stopAutoSessionReboot(); 
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
             const currentUrl = player.getVideoUrl(); 
             const storedUrl = localStorage.getItem(LS_KEY_CONTENT_URL);
             if (currentUrl && !storedUrl) { 
                  localStorage.setItem(LS_KEY_CONTENT_URL, currentUrl);
             }
        } catch(e) { /* Abaikan */ }
        
        // Memulai semua interval dan timeout
        startAutoScroll();
        startAutoSessionReboot(); // Memulai REBOOT Otomatis
        startRandomInteraction(); 
        
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
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
        
        // PEMBERSIHAN SEBELUM MUAT KONTEN BARU
        isAutoMode = false; 
        if (autoTimeout) clearTimeout(autoTimeout);
        stopAutoScroll();
        stopAutoSessionReboot(); 
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
