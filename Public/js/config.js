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

    // Initialize metal card glow color + border + font
    const savedGlowColor = localStorage.getItem('metalCardColorHex') || '#ffffff';
    document.documentElement.style.setProperty('--card-glow-color', savedGlowColor);
    const savedGlowIntensity = localStorage.getItem('metalCardIntensity') || '1';
    document.documentElement.style.setProperty('--card-glow-intensity', savedGlowIntensity);
    if (typeof _applyCardBorderColor === 'function') _applyCardBorderColor(savedGlowColor);
    const savedFont = localStorage.getItem('metalCardFont') || 'system';
    const fontMap = { system: '-apple-system, sans-serif', rounded: 'ui-rounded, -apple-system, sans-serif', futura: 'Futura, -apple-system, sans-serif', serif: 'Georgia, serif', baskerville: 'Baskerville, serif', display: 'Didot, serif', copperplate: 'Copperplate, serif', mono: 'Menlo, monospace' };
    document.documentElement.style.setProperty('--card-font', fontMap[savedFont] || fontMap.system);
    const savedSaturation = localStorage.getItem('metalCardSaturation') || '1.3';
    document.documentElement.style.setProperty('--card-saturation', savedSaturation);
    const savedAnim = localStorage.getItem('metalCardAnim') || 'sweep';
    const cardContainer = document.getElementById('metal-card-container');
    if (cardContainer) cardContainer.dataset.anim = savedAnim;
    const savedPattern = localStorage.getItem('metalCardPattern') || 'none';
    const patternEl = document.getElementById('metal-card-pattern');
    if (patternEl && savedPattern !== 'none') patternEl.classList.add('p-' + savedPattern);

    // Initialize tracking mode preview label
    const trackingModeEl = document.getElementById('tracking-mode-preview');
    if (trackingModeEl) {
        const storedMode = localStorage.getItem('snusTrackingMode') || 'full';
        const key = storedMode === 'individual' ? 'tracking.modeIndividual' : 'tracking.modeFull';
        trackingModeEl.setAttribute('data-i18n', key);
        trackingModeEl.innerText = t(key);
    }
});

// Open camera from native bridge (sdx-open-camera custom event)
window.addEventListener('sdx-open-camera', function () {
    if (typeof openScanModal === 'function') openScanModal();
});

