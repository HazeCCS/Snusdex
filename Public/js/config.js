// Neuer Commit 15:26:42


// ==========================================
// 1. SETUP & KONFIGURATION
// ==========================================
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/';
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';

// Hier definieren wir den Client (darf nicht 'supabase' heißen, da das CDN dies blockiert)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Globale Caches für Dex-Views & Performance
window._dexCache = {};

// ==========================================
// 1.5. SPLASH SCREEN / LOADING
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('splash-video');
    const splash = document.getElementById('splash-screen');

    // Nur das Video starten – Sound wird vom zweiten Handler mit Musik-Check übernommen
    if (video) {
        video.play().catch(err => console.log("Video-Autoplay blocked:", err));

        // Wenn das Video zu Ende ist → Splash ausblenden
        video.addEventListener('ended', () => {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 600);
        });
    }
    loadLatestGitHubCommit();
    checkUser();
    initDexScrollAnimation();
    loadBadgesFromCache();
});
