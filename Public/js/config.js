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
    const video  = document.getElementById('splash-video');
    const splash = document.getElementById('splash-screen');

    function dismissSplash() {
        if (!splash || splash.dataset.dismissed) return;
        splash.dataset.dismissed = '1';
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; }, 600);
    }

    if (video) {
        video.play().catch(err => {
            console.log("Video-Autoplay blocked:", err);
            // Autoplay blockiert → sofort dimmen (kurze Pause für UX)
            setTimeout(dismissSplash, 400);
        });

        video.addEventListener('ended', dismissSplash, { once: true });

        // Sicherheitsnetz: Splash spätestens nach 5s schließen
        setTimeout(dismissSplash, 5000);
    } else {
        dismissSplash();
    }

    loadLatestGitHubCommit();
    checkUser();
    initDexScrollAnimation();
    loadBadgesFromCache();
});

