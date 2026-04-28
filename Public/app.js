// Neuer Commit 15:26:42


// ==========================================
// 1. SETUP & KONFIGURATION
// ==========================================
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/';
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';

// Hier definieren wir den Client (darf nicht 'supabase' heißen, da das CDN dies blockiert)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
});

// ==========================================
// 2. AUTHENTIFIZIERUNG, UI & GREETING
// ==========================================

let isLoginMode = true;
let currentUsername = ''; // Globaler Cache für den aktuellen Usernamen

function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;

    const displayIdent = currentUsername || 'Collector';
    const hour = new Date().getHours();
    let message = '';

    if (hour >= 5 && hour < 12) message = 'Guten Morgen';
    else if (hour >= 12 && hour < 18) message = 'Guten Tag';
    else if (hour >= 18 && hour < 22) message = 'Guten Abend';
    else message = 'Gute Nacht';

    greetingElement.innerHTML = `${message}, <span class="text-white font-semibold">${displayIdent}</span>`;
}

// ==========================================
// GOOGLE ANMELDUNG 
// ==========================================

async function signInWithGoogle() {
    const btnText = document.getElementById('google-btn-text');
    const btn = document.getElementById('google-login-btn');

    if (!supabaseClient || !supabaseClient.auth) {
        console.error("Supabase Client missing!");
        alert("Connecting to server... Please try again in 2 seconds.");
        return;
    }

    try {
        // UI Feedback
        btnText.innerText = "Opening Google...";
        btn.disabled = true;
        btn.style.opacity = "0.7";

        const redirectUrl = window.location.origin + window.location.pathname;

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    prompt: 'select_account',
                    access_type: 'offline'
                }
            }
        });

        if (error) throw error;

        if (data?.url) {
            window.location.href = data.url;
        }

    } catch (error) {
        console.error("Google Login Error:", error.message);
        alert("Login error: " + error.message);

        // Reset label depending on current mode
        btnText.innerText = isLoginMode ? "Sign in with Google" : "Register with Google";
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

// ==========================================
// DEINE ALTE CHECK USER LOGIK (Unverändert)
// ==========================================
async function checkUser() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        const overlay = document.getElementById('auth-overlay');

        if (session) {
            // Check if username exists (important for Google Login)
            const hasUsername = session.user.user_metadata?.username;

            if (!hasUsername) {
                const usernameView = document.getElementById('auth-username-view');
                if (!usernameView) {
                    console.error("HTML element 'auth-username-view' missing!");
                    return;
                }

                // Show the auth card (in case email-check screen is showing)
                document.getElementById('auth-card')?.classList.remove('hidden');
                document.getElementById('email-check-screen')?.classList.add('hidden');

                document.getElementById('auth-main-view')?.classList.add('hidden');
                document.getElementById('auth-verify-view')?.classList.add('hidden');
                usernameView.classList.remove('hidden');
                if (document.getElementById('auth-subtitle')) document.getElementById('auth-subtitle').innerText = "Almost there";
                return;
            }

            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 500);

            // Scroll home to top after login
            window.scrollTo(0, 0);

            // Seed profile cache immediately on login
            (async () => {
                try {
                    const { data: profile } = await supabaseClient
                        .from('profiles')
                        .select('username, username_changes, username_last_reset')
                        .eq('id', session.user.id).single();
                    const now = new Date();
                    const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
                    const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
                    const remaining = Math.max(0, 3 - (sameMonth ? (profile?.username_changes || 0) : 0));
                    window._profileCache = { email: session.user.email, username: profile?.username || session.user.user_metadata?.username || '', remaining };
                    window._cachedUsernameChangesRemaining = remaining;
                } catch (e) { /* ignore */ }
            })();

            setupProfile(session.user);

            loadDex();
            loadUsageData();

            updateGreeting();
        } else {
            overlay.classList.remove('hidden', 'opacity-0');
        }
    } catch (err) {
        console.error("Session check failed:", err);
        document.getElementById('auth-overlay').classList.remove('hidden', 'opacity-0');
    }
}

// ==========================================
// NEU: USERNAME SETUP NACH GOOGLE LOGIN
// ==========================================
async function saveSetupUsername() {
    const usernameInput = document.getElementById('setup-username').value.trim();
    const errorEl = document.getElementById('setup-username-error');
    const btn = document.getElementById('setup-username-btn');

    if (!usernameInput) {
        errorEl.innerText = "Please enter a username.";
        errorEl.classList.remove('hidden');
        return;
    }

    // Only letters, numbers, underscores (2-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/;
    if (!usernameRegex.test(usernameInput)) {
        errorEl.innerText = "Only letters, numbers and _ allowed (2–30 chars).";
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        const { error: updateError } = await supabaseClient.auth.updateUser({
            data: { username: usernameInput }
        });
        if (updateError) throw updateError;

        const { data: userData } = await supabaseClient.auth.getUser();
        if (userData?.user) {
            await supabaseClient.from('profiles').update({ username: usernameInput }).eq('id', userData.user.id);
        }

        errorEl.classList.add('hidden');
        checkUser();
    } catch (error) {
        errorEl.innerText = error.message;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerText = "Continue";
    }
}

async function handleLogout(btn) {
    if (btn) {
        btn.innerHTML = `<div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[#FF3B30]/10 flex items-center justify-center"><svg class="animate-spin h-4 w-4 text-[#FF3B30]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div><span class="text-[#FF3B30] text-[17px] font-medium">Signing Out</span></div>`;
        btn.disabled = true;
    }
    const {
        error
    } = await supabaseClient.auth.signOut();
    if (!error) window.location.reload();
}

// ==========================================
// NEU: UI TOGGLE (Login <-> Register)
// ==========================================
function toggleAuthMode() {
    isLoginMode = !isLoginMode;

    const registerFields = document.getElementById('register-fields');
    const registerConfirmWrap = document.getElementById('register-confirm-wrap');
    const subtitle = document.getElementById('auth-subtitle');
    const mainBtn = document.getElementById('auth-main-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleBtnText = document.querySelector('#auth-toggle-btn span.font-semibold');
    const errorEl = document.getElementById('auth-error');
    const googleBtnText = document.getElementById('google-btn-text');
    const appleBtnText = document.getElementById('apple-btn-text');

    errorEl.classList.add('hidden');

    if (isLoginMode) {
        registerFields.classList.add('hidden');
        registerConfirmWrap?.classList.add('hidden');
        subtitle.innerText = "Welcome back";
        mainBtn.innerText = "Sign In";
        toggleText.innerText = "Don't have an account? ";
        if (toggleBtnText) toggleBtnText.innerText = "Register";
        if (googleBtnText) googleBtnText.innerText = "Sign in with Google";
        if (appleBtnText) appleBtnText.innerText = "Sign in with Apple";
    } else {
        registerFields.classList.remove('hidden');
        registerConfirmWrap?.classList.remove('hidden');
        subtitle.innerText = "Create your account";
        mainBtn.innerText = "Register";
        toggleText.innerText = "Already have an account? ";
        if (toggleBtnText) toggleBtnText.innerText = "Sign In";
        if (googleBtnText) googleBtnText.innerText = "Register with Google";
        if (appleBtnText) appleBtnText.innerText = "Register with Apple";
    }
}

// ==========================================
// NEU: DER MASTER BUTTON (Login & Register)
// ==========================================
async function handleLoginWrapper() {
    triggerHapticFeedback();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const mainBtn = document.getElementById('auth-main-btn');

    if (!email || !password) {
        errorEl.innerText = "Please fill in all fields.";
        errorEl.classList.remove('hidden');
        triggerHapticFeedback();
        return;
    }

    // Disable button while loading
    mainBtn.disabled = true;
    mainBtn.innerHTML = `<div class="flex items-center justify-center h-[26px]"><svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;

    if (isLoginMode) {
        // --- LOGIN ---
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            errorEl.innerText = "Incorrect email or password.";
            errorEl.classList.remove('hidden');
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = "Sign In";
        } else {
            errorEl.classList.add('hidden');
            checkUser();
        }
    } else {
        // --- REGISTER ---
        const username = document.getElementById('auth-username').value.trim();
        const passwordConfirm = document.getElementById('auth-password-confirm').value;

        if (password !== passwordConfirm) {
            errorEl.innerText = "Passwords do not match.";
            errorEl.classList.remove('hidden');
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = "Register";
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { data: { username: username } }
        });

        if (error) {
            errorEl.innerText = error.message.includes('already registered')
                ? "This email is already in use."
                : error.message;
            errorEl.classList.remove('hidden');
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = "Register";
        } else {
            // Show email-check screen
            showEmailCheckScreen(email);
            mainBtn.disabled = false;
            mainBtn.innerText = "Register";
        }
    }
}

// Show the email confirmation screen after successful sign-up
function showEmailCheckScreen(email) {
    const authCard = document.getElementById('auth-card');
    const emailCheckScreen = document.getElementById('email-check-screen');
    const emailAddressEl = document.getElementById('email-check-address');

    if (emailAddressEl) emailAddressEl.innerText = email;
    if (authCard) authCard.classList.add('hidden');
    if (emailCheckScreen) emailCheckScreen.classList.remove('hidden');
}

// Return to sign-in form from the email-check screen with email pre-filled
function goToSignInFromEmailCheck() {
    const authCard = document.getElementById('auth-card');
    const emailCheckScreen = document.getElementById('email-check-screen');
    const emailInput = document.getElementById('auth-email');
    const emailAddressEl = document.getElementById('email-check-address');

    // Pre-fill email
    if (emailInput && emailAddressEl) {
        emailInput.value = emailAddressEl.innerText;
    }

    // Switch back to login mode if currently in register mode
    if (!isLoginMode) toggleAuthMode();

    if (emailCheckScreen) emailCheckScreen.classList.add('hidden');
    if (authCard) authCard.classList.remove('hidden');
}
// ==========================================
// 3. NAVIGATION (TABS)
// ==========================================

function switchTab(tabId) {
    const dexTab = document.getElementById('tab-dex');
    const isDexTarget = tabId === 'dex';

    // Früh-Abbruch: Tab schon aktiv?
    if (isDexTarget) {
        if (!dexTab.classList.contains('tab-dex-hidden')) return;
    } else {
        const activeTab = document.getElementById(`tab-${tabId}`);
        if (!activeTab || !activeTab.classList.contains('hidden')) return;
    }

    // Alle NICHT-Dex-Tabs per display:none verstecken
    document.querySelectorAll('.tab-content').forEach(tab => {
        if (tab.id === 'tab-dex') return; // Dex niemals mit display:none anfassen!
        tab.classList.add('hidden');
    });

    if (isDexTarget) {
        // Dex einblenden: Layout war immer da, nur Sichtbarkeit ändert sich
        dexTab.classList.remove('tab-dex-hidden');
        // Animation neu starten (identisch zu allen anderen Tabs)
        dexTab.style.animation = 'none';
        void dexTab.offsetWidth; // Force reflow → Animation-Reset
        dexTab.style.animation = '';
    } else {
        // Dex ausblenden: Layout BLEIBT berechnet → kein Reflow beim nächsten Switch
        dexTab.classList.add('tab-dex-hidden');
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isActive = btn.id === `btn-${tabId}`;
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-[#8E8E93]', !isActive);
    });

    // scrollTo nach erstem Paint
    requestAnimationFrame(() => window.scrollTo(0, 0));

    if (tabId === 'home' && displayedXp !== null && actualXp !== null && displayedXp !== actualXp) {
        setTimeout(() => {
            const level = Math.floor(actualXp / 300) + 1;
            animateXp(displayedXp, actualXp, level);
        }, 200);
    }

    if (tabId === 'social') {
        loadTopSnusOfWeek();
        loadBadges();
    }

    if (tabId === 'dex') {
        requestAnimationFrame(updateDexScale);
    }

    if (tabId === 'profile') {
        // Pre-fetch profile data so Edit Profile opens instantly with real values
        (async () => {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return;
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('username, username_changes, username_last_reset')
                    .eq('id', user.id).single();

                const now = new Date();
                const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
                const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
                const changesThisMonth = sameMonth ? (profile?.username_changes || 0) : 0;
                const remaining = Math.max(0, 3 - changesThisMonth);

                window._profileCache = {
                    email: user.email,
                    username: profile?.username || user.user_metadata?.username || '',
                    remaining
                };
                window._cachedUsernameChangesRemaining = remaining;
            } catch (e) { /* ignore */ }
        })();
    } else {
        // Clear cache when leaving profile tab
        window._profileCache = null;
    }
}


// ==========================================
// 4. DATEN LADEN & RENDERN
// ==========================================

let globalSnusData = [];
let globalUserCollection = {};

async function loadDex() {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (user) {
        const {
            data: myCol
        } = await supabaseClient.from('user_collections').select('*').eq('user_id', user.id);
        globalUserCollection = {};
        if (myCol) {
            myCol.forEach(item => {
                globalUserCollection[item.snus_id] = {
                    date: item.collected_at,
                    ratings: {
                        taste: item.rating_taste || 5,
                        smell: item.rating_smell || 5,
                        bite: item.rating_bite || 5,
                        drip: item.rating_drip || 5,
                        visuals: item.rating_visuals || 5
                    }
                };
            });
        }
    }

    const {
        data: snusItems
    } = await supabaseClient.from('snus_products').select('*').order('id', {
        ascending: true
    });
    globalSnusData = snusItems || [];
    updateLivePerformance();
    updateDexSortButtonUI();
    filterDex();
    loadTopSnusOfWeek();
    renderSuggestions();

}

let currentDexRenderCount = 0;
let currentDexItems = [];
const DEX_CHUNK_SIZE = 30; // Erhöht für einen durchgängigeren Aufbau
let dexObserver = null;
let imageLazyObserver = null;

// ==========================================
// GLOBALER IMAGE CACHE (Session-persistent)
// ==========================================
// Speichert fertig geladene Image-Objekte für die Dauer der App-Session.
// Key: URL-String, Value: 'loaded' | 'error'
const dexImageCache = new Map();

// Lädt alle Bilder im Hintergrund mit einer geordneten Queue.
// Max. 6 parallele Downloads – kein setTimeout-Spam, kein Browser-Überlastung.
function preloadAllDexImages(items) {
    const queue = items
        .map(snus => GITHUB_BASE + snus.image)
        .filter(url => !dexImageCache.has(url));

    if (queue.length === 0) return;

    const MAX_CONCURRENT = 6;
    let active = 0;

    function loadNext() {
        while (active < MAX_CONCURRENT && queue.length > 0) {
            const url = queue.shift();
            active++;
            const img = new Image();
            img.onload = () => { dexImageCache.set(url, 'loaded'); active--; loadNext(); };
            img.onerror = () => { dexImageCache.set(url, 'error'); active--; loadNext(); };
            img.src = url;
        }
    }

    // Erst nach nächstem Frame starten, damit sichtbare DOM-Bilder Vorrang haben
    requestAnimationFrame(loadNext);
}

function initImageLazyLoadObserver() {
    if (imageLazyObserver) return;

    // rootMargin: 1200px = weit voraus laden für smoothes Scrollen
    imageLazyObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');

                if (src) {
                    const container = img.closest('.dex-image-container');
                    const shimmer = container ? container.querySelector('.dex-placeholder') : null;

                    const showImage = () => {
                        img.classList.remove('opacity-0');
                        dexImageCache.set(src, 'loaded');
                        if (shimmer) shimmer.remove();
                    };

                    img.onload = showImage;

                    img.onerror = () => {
                        img.src = 'https://via.placeholder.com/150/000000/FFFFFF?text=?';
                        dexImageCache.set(src, 'error');
                        img.classList.remove('opacity-0');
                        if (shimmer) shimmer.remove();
                    };

                    img.src = src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '0px 0px 1200px 0px'
    });
}

function initDexObserver() {
    if (dexObserver) {
        dexObserver.disconnect();
    }
    const sentinel = document.getElementById('dex-sentinel');
    if (!sentinel) return;

    // Beobachter der auslöst sobald der Bereich ca. 800px vor dem Sichtfeld ist (ca. 5 Reihen)
    dexObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreDexItems();
        }
    }, {
        rootMargin: '800px'
    });

    dexObserver.observe(sentinel);
}

// Anzahl Items für den ersten sichtbaren Screen (3-Spalten-Grid à 3 Reihen = 9)
const DEX_FIRST_CHUNK = 9;

function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    grid.innerHTML = '';

    currentDexItems = items;
    currentDexRenderCount = 0;

    // Erster Chunk (sichtbarer Bereich) sofort rendern
    loadMoreDexItems(DEX_FIRST_CHUNK);
    initDexObserver();

    // Hintergrund-Preload + Rest-Rendering nach erstem Paint starten
    requestAnimationFrame(() => {
        preloadAllDexImages(items);
        // Nächsten Chunk sofort bereitstellen, damit Scrollen sofort klappt
        if (currentDexRenderCount < currentDexItems.length) {
            loadMoreDexItems(); // Normal-Chunk (30 Items) nach erstem Paint
        }
    });
}

function loadMoreDexItems(chunkOverride) {
    const grid = document.getElementById('dex-grid');
    if (!grid || currentDexRenderCount >= currentDexItems.length) return;

    const chunkSize = chunkOverride || DEX_CHUNK_SIZE;
    const nextChunk = currentDexItems.slice(currentDexRenderCount, currentDexRenderCount + chunkSize);

    const cols = localStorage.getItem('dexColumns') || '3';
    const is2Cols = cols === '2';
    const glowActive = localStorage.getItem('dexGlow') === 'true';

    // DocumentFragment für performantes Batch-Insert
    const fragment = document.createDocumentFragment();

    nextChunk.forEach(snus => {
        const isUnlocked = !!globalUserCollection[snus.id];
        const formattedId = '#' + String(snus.id).padStart(3, '0');
        const rarity = (snus.rarity || 'common').toLowerCase().trim();
        const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
        const imgUrl = GITHUB_BASE + snus.image;
        const isCached = dexImageCache.has(imgUrl);

        const rarityIndicator = is2Cols ?
            `<span class="text-[10px] font-bold tracking-wide uppercase" style="color: var(--${rarity}, var(--common)); text-shadow: 0px 0px 8px var(--${rarity}, var(--common));">${rarity}</span>` :
            `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;

        // Loading-Placeholder: CSS-Shimmer statt Video (kein RAM/CPU-Overhead)
        const placeholderHTML = isCached ? '' :
            `<div class="dex-placeholder absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-[60%] h-[60%] rounded-xl bg-white/5 animate-pulse"></div>
            </div>`;

        // Wenn gecacht → sofort sichtbar (kein opacity-0, kein lazy loading nötig)
        const imgClass = isCached
            ? `dex-img-cached w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10`
            : `dex-lazy-img w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10 opacity-0 transition-opacity duration-500`;
        const imgSrcAttr = isCached ? `src="${imgUrl}"` : `data-src="${imgUrl}"`;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div onclick="openSnusDetail(${snus.id})" class="dex-anim-card cursor-pointer group h-full w-full transition-all duration-200 ease-out origin-center will-change-transform">
                <div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] transition-all group-active:scale-95 shadow-md overflow-hidden ${!isUnlocked ? 'opacity-40 grayscale' : ''}" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}">
                    <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                        <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                        ${rarityIndicator}
                    </div>
                    <div class="dex-image-container w-full aspect-square flex items-center justify-center relative mt-1">
                        ${placeholderHTML}
                        <img ${imgSrcAttr} class="${imgClass}">
                    </div>
                    <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                        <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5>
                    </div>
                </div>
            </div>
        `.trim();
        fragment.appendChild(wrapper.firstChild);
    });

    grid.appendChild(fragment);
    currentDexRenderCount += chunkSize;

    // Layout-Reads + Observer-Setup nach dem Paint (kein erzwungener Reflow)
    if (!imageLazyObserver) initImageLazyLoadObserver();
    requestAnimationFrame(() => {
        // Recalc haptic threshold from real rendered row height after first chunk
        if (currentDexRenderCount <= chunkSize + DEX_CHUNK_SIZE) {
            recalcHapticThreshold();
        }

        // Lazy-Observer für neue Bilder registrieren
        grid.querySelectorAll('.dex-lazy-img:not(.observed)').forEach(img => {
            img.classList.add('observed');
            imageLazyObserver.observe(img);
        });

        updateDexScale();
    });
}

function renderActiveCansUI() {
    const container = document.getElementById('active-cans-list');
    if (!container) return;

    container.innerHTML = '';

    if (globalActiveLogs.length === 0) {
        container.innerHTML = '<div class="flex items-center justify-between px-1 py-2"><p class="text-[13px] text-zinc-500">Keine aktiven Dosen.</p><button onclick="triggerHapticFeedback(); openScanModal()" class="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-full text-[13px] font-medium text-white active:bg-white/20 transition-colors tracking-wide">Öffne die nächste<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></button></div>';
        return;
    }

    globalActiveLogs.forEach(can => {
        const snusName = can.snus_products ? can.snus_products.name : 'Unknown';
        const snusImg = can.snus_products ? can.snus_products.image : '';

        container.innerHTML += `
            <div class="flex items-center justify-between bg-[#1C1C1E] border border-white/5 rounded-2xl p-3 mb-3 shadow-sm">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 flex items-center justify-center">
                        <img src="${GITHUB_BASE}${snusImg}" class="h-full object-contain">
                    </div>
                    <div class="min-w-0">
                        <h4 class="text-white text-[15px] font-semibold truncate">${snusName}</h4>
                        <p class="text-[11px] text-[#8E8E93] tracking-wider">Open since ${new Date(can.opened_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <button onclick="triggerHapticFeedback(); this.innerHTML='<div class=\\'flex items-center justify-center w-[34px] h-[16px]\\'><svg class=\\'animate-spin h-3.5 w-3.5 text-black\\' xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\'><circle class=\\'opacity-25\\' cx=\\'12\\' cy=\\'12\\' r=\\'10\\' stroke=\\'currentColor\\' stroke-width=\\'4\\'></circle><path class=\\'opacity-75\\' fill=\\'currentColor\\' d=\\'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\\'></path></svg></div>'; this.disabled=true; this.classList.add('opacity-50'); finishSpecificCan('${can.id}')" class="bg-white text-black text-[11px] font-bold px-4 py-2 rounded-full active:scale-95 transition-all">
                    Empty
                </button>
            </div>
        `;
    });
}

// ==========================================
// 5. RATING ENGINE & MODAL LOGIK
// ==========================================

let detailStartY = 0;
let detailCurrentY = 0;
let isDetailDragging = false;

function setupGlobalSwipe() {
    const card = document.getElementById('snus-modal-card');
    if (!card) return;

    card.addEventListener('touchstart', (e) => {
        detailStartY = e.touches[0].clientY;
        detailCurrentY = detailStartY;
        isDetailDragging = true;
        card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isDetailDragging) return;

        detailCurrentY = e.touches[0].clientY;
        const deltaY = detailCurrentY - detailStartY;

        if (deltaY > 0) {
            card.style.transform = `translateY(${deltaY}px)`;
        }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
        if (!isDetailDragging) return;
        isDetailDragging = false;

        const deltaY = detailCurrentY - detailStartY;
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaY > 100) {
            card.style.transform = 'translateY(100%)';
            closeSnusDetail(true);
        } else {
            card.style.transform = 'translateY(0px)';
            setTimeout(() => {
                card.style.transform = '';
                card.style.transition = '';
            }, 400);
        }
    });
}

setupGlobalSwipe();

let tempRatings = {
    taste: 5,
    taste_text: '',
    smell: 5,
    smell_text: '',
    bite: 5,
    bite_text: '',
    drip: 5,
    drip_text: '',
    visuals: 5,
    visuals_text: '',
    strength: 5,
    strength_text: ''
};
let currentSelectedSnusId = null;

const RATING_STEPS = ['visuals', 'smell', 'taste', 'bite', 'drip', 'strength'];
let currentRatingStepIndex = 0;

function initRatingWizard() {
    currentRatingStepIndex = 0;

    RATING_STEPS.forEach(cat => {
        tempRatings[cat] = 5;
        tempRatings[`${cat}_text`] = '';

        const row = document.getElementById(`row-${cat}`);
        if (!row) return;
        row.innerHTML = `<div class="rating-pill" id="pill-${cat}"></div>`;
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('div');
            btn.className = `rating-btn ${i === 5 ? 'active' : 'inactive'}`;
            btn.innerText = i;
            btn.onclick = () => setRating(cat, i);
            row.appendChild(btn);
        }
        updatePill(cat, 5);
        const valIndicator = row.parentElement.querySelector('.rating-val');
        if (valIndicator) valIndicator.innerText = `5/10`;

        const textEl = document.getElementById(`text-${cat}`);
        if (textEl) textEl.value = '';
    });

    updateRatingStepUI();
}

function setRating(category, value) {
    tempRatings[category] = value;
    updatePill(category, value);
    const row = document.getElementById(`row-${category}`);
    row.querySelectorAll('.rating-btn').forEach((btn, idx) => {
        btn.className = `rating-btn ${idx + 1 === value ? 'active' : 'inactive'}`;
    });
    const valIndicator = row.parentElement.querySelector('.rating-val');
    if (valIndicator) valIndicator.innerText = `${value}/10`;
    triggerHapticFeedback();
}

function updatePill(cat, val) {
    const pill = document.getElementById(`pill-${cat}`);
    if (pill) pill.style.transform = `translateX(${(val - 1) * 100}%)`;
}

function updateRatingStepUI() {
    const backBtn = document.getElementById('rating-back-btn');
    const cancelBtn = document.getElementById('rating-cancel-btn');
    const nextBtn = document.getElementById('rating-next-btn');
    const nextText = document.getElementById('rating-next-text');
    const nextIcon = document.getElementById('rating-next-icon');
    const title = document.getElementById('rating-step-title');
    const indicator = document.getElementById('rating-step-indicator');

    if (!title) return;

    title.innerText = RATING_STEPS[currentRatingStepIndex];
    indicator.innerText = `${currentRatingStepIndex + 1}/${RATING_STEPS.length}`;

    if (currentRatingStepIndex === 0) {
        if (backBtn) backBtn.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
    } else {
        if (backBtn) backBtn.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    if (currentRatingStepIndex === 0) {
        backBtn.classList.add('opacity-0', 'pointer-events-none');
        backBtn.classList.remove('opacity-100', 'pointer-events-auto');
    } else {
        backBtn.classList.remove('opacity-0', 'pointer-events-none');
        backBtn.classList.add('opacity-100', 'pointer-events-auto', 'cursor-pointer');
    }

    if (currentRatingStepIndex === RATING_STEPS.length - 1) {
        nextText.innerText = "Speichern";
        nextBtn.classList.remove('bg-white', 'text-black');
        nextBtn.classList.add('bg-[#34C759]', 'text-white', 'shadow-[0_4px_14px_rgba(52,199,89,0.3)]');
        nextIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />`;
    } else {
        nextText.innerText = "Weiter";
        nextBtn.classList.remove('bg-[#34C759]', 'text-white', 'shadow-[0_4px_14px_rgba(52,199,89,0.3)]');
        nextBtn.classList.add('bg-white', 'text-black');
        nextIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />`;
    }

    RATING_STEPS.forEach((step, index) => {
        const panel = document.getElementById(`step-${step}`);
        if (!panel) return;

        panel.classList.remove('translate-x-0', 'translate-x-full', '-translate-x-full', 'opacity-0', 'opacity-100', 'z-10', 'z-0', 'pointer-events-none');

        if (index === currentRatingStepIndex) {
            panel.classList.add('translate-x-0', 'opacity-100', 'z-10');
        } else if (index < currentRatingStepIndex) {
            panel.classList.add('-translate-x-full', 'opacity-0', 'z-0', 'pointer-events-none');
        } else {
            panel.classList.add('translate-x-full', 'opacity-0', 'z-0', 'pointer-events-none');
        }
    });
}

function nextRatingStep() {
    const currentStep = RATING_STEPS[currentRatingStepIndex];
    const textEl = document.getElementById(`text-${currentStep}`);
    if (textEl) tempRatings[`${currentStep}_text`] = textEl.value;

    if (currentRatingStepIndex < RATING_STEPS.length - 1) {
        currentRatingStepIndex++;
        updateRatingStepUI();
    } else {
        collectCurrentSnus();
    }
}

function prevRatingStep() {
    const currentStep = RATING_STEPS[currentRatingStepIndex];
    const textEl = document.getElementById(`text-${currentStep}`);
    if (textEl) tempRatings[`${currentStep}_text`] = textEl.value;

    if (currentRatingStepIndex > 0) {
        currentRatingStepIndex--;
        updateRatingStepUI();
    }
}

function showInfoView() {
    hideAllViews();
    document.getElementById('modal-view-info').classList.remove('hidden');
}

function showRatingView() {
    hideAllViews();
    document.getElementById('modal-view-rating').classList.remove('hidden');
    document.getElementById('modal-view-rating').classList.add('flex');
}

function showSavedRating() {
    hideAllViews();
    document.getElementById('modal-view-saved-rating').classList.remove('hidden');
    document.getElementById('modal-view-saved-rating').classList.add('flex');
    let ratings = globalUserCollection[currentSelectedSnusId]?.ratings || {
        taste: 5,
        smell: 5,
        bite: 5,
        drip: 5,
        visuals: 5,
        strength: 5
    };

    const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag])) : '';

    const createBar = (label, val, text) => {
        const hasText = text && String(text).trim() !== '';
        return `
            <div class="mb-4">
                <div class="flex justify-between text-[13px] text-[#8E8E93] mb-1"><span>${label}</span><span class="text-white">${val}/10</span></div>
                <div class="w-full bg-black rounded-full h-1.5 mb-2"><div class="bg-white h-1.5 rounded-full" style="width: ${val * 10}%"></div></div>
                ${hasText ? `<div class="bg-black/40 border border-white/10 rounded-xl p-3 text-[14px] text-white/90 italic shadow-sm mt-2 leading-relaxed">"${escapeHTML(text)}"</div>` : ''}
            </div>`;
    };

    document.getElementById('saved-rating-bars').innerHTML =
        createBar("Visuals", ratings.visuals, ratings.visuals_text) +
        createBar("Smell", ratings.smell, ratings.smell_text) +
        createBar("Taste", ratings.taste, ratings.taste_text) +
        createBar("Bite", ratings.bite, ratings.bite_text) +
        createBar("Drip", ratings.drip, ratings.drip_text) +
        createBar("Strength", ratings.strength, ratings.strength_text);
}

function hideAllViews() {
    document.getElementById('modal-view-info').classList.add('hidden');
    document.getElementById('modal-view-rating').classList.add('hidden');
    document.getElementById('modal-view-rating').classList.remove('flex');
    document.getElementById('modal-view-saved-rating').classList.add('hidden');
    document.getElementById('modal-view-saved-rating').classList.remove('flex');
}

function openSnusDetail(id, isFromScan = false) {
    // 1. DATEN-CHECK
    // Sicherstellen, dass die ID eine Zahl ist, falls sie als String kommt
    const snusId = parseInt(id);
    const snus = globalSnusData.find(s => parseInt(s.id) === snusId);

    if (!snus) {
        console.error("Snus mit ID " + id + " nicht gefunden!");
        return;
    }

    currentSelectedSnusId = snusId;

    // 2. ELEMENTE SICHER BEFÜLLEN (mit Fallbacks)
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    const setHTML = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    // ID Formatieren (z.B. #001)
    setText('modal-id', '#' + String(snus.id).padStart(3, '0'));
    setText('modal-name', snus.name || 'Unbekannter Snus');

    // Rarity & Nicotine
    const rarity = (snus.rarity || 'Common').trim();
    const rarityLower = rarity.toLowerCase();
    const nicotine = snus.nicotine || '??';

    setHTML('modal-nicotine', `
        <span class="px-3 py-1.5 bg-white/10 border border-white/5 rounded-full text-[13px] font-semibold text-white tracking-wide shadow-sm">${nicotine} MG/G</span>
        <span class="px-3 py-1.5 bg-[var(--${rarityLower},var(--common))]/10 border border-[var(--${rarityLower},var(--common))]/30 rounded-full text-[13px] font-bold uppercase tracking-wider" style="color: var(--${rarityLower}, var(--common)); text-shadow: 0px 0px 8px var(--${rarityLower}, var(--common));">${rarity}</span>
    `);

    // Bild laden
    const modalImg = document.getElementById('modal-image');
    if (modalImg) {
        modalImg.src = snus.image ? `${GITHUB_BASE}${snus.image}` : 'placeholder.png';
    }

    // 2.5 NACHBESTELLEN LINK DYNAMISCH SETZEN
    // Hier kannst du den Affiliate-Link anpassen:
    const affiliateLink = `https://snuzone.com/search?q=${encodeURIComponent(snus.name)}`;

    const orderBtn = document.getElementById('order-snus-btn');
    if (orderBtn) orderBtn.href = affiliateLink;

    const orderBtnUncollected = document.getElementById('order-snus-btn-uncollected');
    if (orderBtnUncollected) orderBtnUncollected.href = affiliateLink;

    // 3. COLLECTION STATUS (Freigeschaltet oder nicht)
    const isUnlocked = globalUserCollection[snusId];
    const uncollectedGroup = document.getElementById('uncollected-action-group');
    const scannedGroup = document.getElementById('scanned-action-group');
    const statusGroup = document.getElementById('modal-collected-status');
    const dateEl = document.getElementById('modal-unlocked-date');

    // Erstmal alles verstecken
    if (uncollectedGroup) uncollectedGroup.classList.add('hidden');
    if (scannedGroup) scannedGroup.classList.add('hidden');
    if (statusGroup) statusGroup.classList.add('hidden');

    if (isUnlocked) {
        // Fall: Bereits gesammelt
        if (statusGroup) statusGroup.classList.remove('hidden');
        if (dateEl && isUnlocked.date) {
            const dateObj = new Date(isUnlocked.date);
            dateEl.innerText = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
        }

        // Live-Daten lokal aus dem Cache lesen (instant)
        const openedCountEl = document.getElementById('modal-opened-count');

        // Alle Logs für diese Snus aus dem Cache filtern
        const snusLogs = globalAllLogs.filter(l => l.snus_id === snusId);

        // Öffnungsanzahl updaten
        if (openedCountEl) {
            const count = snusLogs.length;
            openedCountEl.innerText = count > 0 ? `${count}x` : '0x';
        }

        // "Unlocked at" mit dem ältesten (letzten im Array, da descending sortiert) opened_at überschreiben
        // falls Logs existieren. (Wir gehen auf Nummer sicher und suchen das kleinste Datum)
        if (dateEl && snusLogs.length > 0) {
            const earliestLog = snusLogs.reduce((prev, curr) => {
                return (new Date(prev.opened_at) < new Date(curr.opened_at)) ? prev : curr;
            });
            const firstOpen = new Date(earliestLog.opened_at);
            dateEl.innerText = firstOpen.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        }
    } else {
        // Fall: Noch nicht gesammelt
        if (isFromScan) {
            if (scannedGroup) scannedGroup.classList.remove('hidden');
        } else {
            if (uncollectedGroup) uncollectedGroup.classList.remove('hidden');
        }
    }

    // 4. VIEWS AKTIVIEREN
    if (typeof showInfoView === "function") showInfoView();
    if (typeof initRatingWizard === "function") initRatingWizard();

    // 5. MODAL ANZEIGEN & ANIMIEREN
    const modal = document.getElementById('snus-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');

    if (modal && backdrop && card) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');

            card.classList.remove('translate-y-full');
            card.classList.add('translate-y-0');
        }, 10);
    }

    if (typeof triggerHapticFeedback === "function") triggerHapticFeedback();
}

function closeSnusDetail(isDragging = false) {
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');

    // 1. Haptik sofort auslösen wie beim Scanner
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    // 2. Animation
    card.classList.remove('translate-y-0');
    card.classList.add('translate-y-full');

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');

    if (!isDragging) {
        card.style.transform = '';
        card.style.transition = '';
    }

    // 3. Reset
    setTimeout(() => {
        document.getElementById('snus-modal').classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        if (isDragging) {
            card.style.transform = '';
            card.style.transition = '';
        }
    }, 400);
}

// ==========================================
// 6. DB INSERT (BUG GEFIXT)
// ==========================================

async function collectCurrentSnus() {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const btn = document.getElementById('rating-next-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;
    btn.disabled = true;

    const isUpdate = !!globalUserCollection[currentSelectedSnusId];
    let error;
    let savedDate = new Date().toISOString();

    const payload = {
        rating_taste: tempRatings.taste,
        rating_taste_text: tempRatings.taste_text,
        rating_smell: tempRatings.smell,
        rating_smell_text: tempRatings.smell_text,
        rating_bite: tempRatings.bite,
        rating_bite_text: tempRatings.bite_text,
        rating_drip: tempRatings.drip,
        rating_drip_text: tempRatings.drip_text,
        rating_visuals: tempRatings.visuals,
        rating_visuals_text: tempRatings.visuals_text,
        rating_strength: tempRatings.strength,
        rating_strength_text: tempRatings.strength_text
    };

    if (isUpdate) {
        const response = await supabaseClient.from('user_collections')
            .update(payload)
            .eq('user_id', user.id)
            .eq('snus_id', currentSelectedSnusId);

        error = response.error;
        savedDate = globalUserCollection[currentSelectedSnusId].date;
    } else {
        const response = await supabaseClient.from('user_collections').insert([{
            user_id: user.id,
            snus_id: currentSelectedSnusId,
            ...payload
        }]).select().single();

        error = response.error;
        if (response.data && response.data.collected_at) {
            savedDate = response.data.collected_at;
        }
    }

    if (!error) {
        globalUserCollection[currentSelectedSnusId] = {
            date: savedDate,
            ratings: {
                ...tempRatings
            }
        };

        if (!isUpdate) {
            await startNewCan(currentSelectedSnusId);
            await loadUserStats(user.id);
            updateLivePerformance();
            evaluateBadges();
        }
        renderDexGrid(globalSnusData);
        closeSnusDetail();
    } else {
        alert("Fehler beim Speichern: " + error.message);
    }

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 500);
}

function editRating() {
    if (globalUserCollection[currentSelectedSnusId]) {
        const currentRatings = globalUserCollection[currentSelectedSnusId].ratings;
        RATING_STEPS.forEach(cat => {
            setRating(cat, currentRatings[cat] || 5);
            const textEl = document.getElementById(`text-${cat}`);
            if (textEl) {
                textEl.value = currentRatings[`${cat}_text`] || '';
                tempRatings[`${cat}_text`] = currentRatings[`${cat}_text`] || '';
            }
        });
    }
    currentRatingStepIndex = 0;
    updateRatingStepUI();
    showRatingView();
}

// ==========================================
// 7. ADMIN PANEL (VOLLSTÄNDIG)
// ==========================================

async function adminAddSnus() {
    const name = document.getElementById('admin-name').value;
    const nicotine = document.getElementById('admin-nicotine').value;
    const rarity = document.getElementById('admin-rarity').value;
    const flavorsRaw = document.getElementById('admin-flavor').value;
    const barcode = document.getElementById('admin-barcode').value;
    const image = document.getElementById('admin-image').value;

    if (!name || !nicotine || !image) {
        return alert("Bitte Name, Nicotine und Image angeben!");
    }

    // Flavors formatieren (Komma-getrennt zu Array)
    const flavorArray = flavorsRaw ? flavorsRaw.split(',').map(s => s.trim()).filter(s => s) : [];

    const {
        data,
        error
    } = await supabaseClient.from('snus_products').insert([{
        name: name,
        nicotine: parseInt(nicotine),
        rarity: rarity,
        flavor: flavorArray,
        barcode: barcode || null,
        image: image
    }]);

    if (error) {
        alert("Fehler beim Hinzufügen: " + error.message);
    } else {
        alert("Snus erfolgreich hinzugefügt!");
        // Felder leeren
        document.getElementById('admin-name').value = '';
        document.getElementById('admin-nicotine').value = '';
        document.getElementById('admin-flavor').value = '';
        document.getElementById('admin-barcode').value = '';
        document.getElementById('admin-image').value = '';
        // Dex direkt neu laden, damit der neue Snus sichtbar ist
        loadDex();
    }
}

// ==========================================
// 8. HELPER & INITIALISIERUNG
// ==========================================

async function loadUserStats(userId) {
    const {
        count
    } = await supabaseClient.from('user_collections').select('*', {
        count: 'exact',
        head: true
    }).eq('user_id', userId);
    const scoreEl = document.getElementById('score');
    const pouchEl = document.getElementById('pouch-count');
    if (scoreEl) scoreEl.innerText = count * 100;
    if (pouchEl) pouchEl.innerText = count || 0;
}

let dexSortMode = localStorage.getItem('dexDefaultSort') || 'id';
let dexFilterUnlocked = false;

function updateDexSortButtonUI() {
    const btn = document.getElementById('dex-sort-btn');
    if (!btn) return;

    if (dexSortMode === 'id') {
        btn.innerHTML = `<span class="font-bold text-[16px]">#</span>`;
        btn.classList.add('text-white', 'bg-white/20');
        btn.classList.remove('text-[#8E8E93]', 'bg-white/10');
    } else {
        btn.innerHTML = `<span class="font-bold text-[16px]">A</span>`;
        btn.classList.add('text-white', 'bg-white/20');
        btn.classList.remove('text-[#8E8E93]', 'bg-white/10');
    }
}

function toggleDexSort() {
    dexSortMode = (dexSortMode === 'id') ? 'alpha' : 'id';

    updateDexSortButtonUI();
    filterDex();
}

function toggleDexFilterUnlocked() {
    dexFilterUnlocked = !dexFilterUnlocked;
    const btn = document.getElementById('dex-filter-unlocked-btn');
    if (dexFilterUnlocked) {
        btn.classList.add('bg-white', 'text-black');
        btn.classList.remove('text-[#8E8E93]', 'bg-white/10');
    } else {
        btn.classList.remove('bg-white', 'text-black');
        btn.classList.add('text-[#8E8E93]', 'bg-white/10');
    }
    filterDex();
}


async function setupProfile(user) {
    // Username aus profiles Tabelle laden (Single Source of Truth)
    const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

    // Fallback-Kette: profiles.username → user_metadata.username → email-prefix
    currentUsername = profileData?.username
        || user.user_metadata?.username
        || user.email.split('@')[0];

    // Alle UI-Stellen synchron aktualisieren
    const emailEl = document.getElementById('profile-email');
    const initialsEl = document.getElementById('user-initials');
    if (emailEl) emailEl.innerText = currentUsername;
    if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();

    updateGreeting();
    loadUserStats(user.id);
}

function triggerHapticFeedback() {
    if (window.webkit && window.webkit.messageHandlers.hapticHandler) window.webkit.messageHandlers.hapticHandler.postMessage("vibrate");
    else if (navigator.vibrate) navigator.vibrate(15);
}

function switchTabWrapper(tabId) {
    triggerHapticFeedback();
    switchTab(tabId);
}

document.addEventListener('DOMContentLoaded', () => {
    const allScansCard = document.getElementById('all-scans-card');

    if (allScansCard) {
        allScansCard.addEventListener('touchstart', (e) => {
            allScansStartY = e.touches[0].clientY;
            isAllScansDragging = true;
            allScansCard.style.transition = 'none';
        }, { passive: true });

        allScansCard.addEventListener('touchmove', (e) => {
            if (!isAllScansDragging) return;

            const currentY = e.touches[0].clientY;
            const deltaY = currentY - allScansStartY;

            if (deltaY > 0) {
                if (e.cancelable) e.preventDefault();
                allScansCard.style.transform = `translate3d(0, ${deltaY}px, 0)`;
            }
        }, { passive: false });

        allScansCard.addEventListener('touchend', (e) => {
            if (!isAllScansDragging) return;
            isAllScansDragging = false;

            const deltaY = e.changedTouches[0].clientY - allScansStartY;
            allScansCard.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

            if (deltaY > 100) {
                allScansCard.style.transform = 'translate3d(0, 100%, 0)';
                closeAllScansModal(true);
            } else {
                allScansCard.style.transform = 'translate3d(0, 0px, 0)';
                setTimeout(() => {
                    allScansCard.style.transform = '';
                    allScansCard.style.transition = '';
                }, 350);
            }
        });
    }
});

// ==========================================
// 9. TOP SNUS OF THE WEEK & SOCIAL
// ==========================================

async function loadTopSnusOfWeek() {
    const {
        data,
        error
    } = await supabaseClient.rpc('get_social_stats');

    const container = document.getElementById('top-snus-container');
    if (!container) return;

    if (error) {
        console.error("Error fetching social stats:", error);
        container.innerHTML = '<div class="p-6 text-center text-[#FF3B30] text-[15px]">Could not load social stats.</div>';
        return;
    }

    // Start with empty container
    container.innerHTML = '';

    if (!data || (!data.top_rated && !data.most_popular_today)) {
        // Render nothing for these cards, but continue to load Most Scanned
    } else {
        const {
            top_rated,
            most_popular_today
        } = data;

        // Render Top Rated card
        if (top_rated && top_rated.snus_id) {
            const snusInfo = globalSnusData.find(s => s.id == top_rated.snus_id);
            if (snusInfo) {
                const ratings = {
                    visuals: (top_rated.avg_ratings.visuals || 0).toFixed(1),
                    smell: (top_rated.avg_ratings.smell || 0).toFixed(1),
                    taste: (top_rated.avg_ratings.taste || 0).toFixed(1),
                    bite: (top_rated.avg_ratings.bite || 0).toFixed(1),
                    drip: (top_rated.avg_ratings.drip || 0).toFixed(1),
                    strength: (top_rated.avg_ratings.strength || 0).toFixed(1),
                };
                const overall = (top_rated.avg_score || 0).toFixed(1);
                const count = top_rated.rating_count || 0;
                container.innerHTML += renderSocialCard("Top Rated Snus 🏆", snusInfo, ratings, overall, count, 'Ratings');
            }
        }

        // Render Most Popular Today card
        if (most_popular_today && most_popular_today.snus_id) {
            const snusInfo = globalSnusData.find(s => s.id == most_popular_today.snus_id);
            if (snusInfo) {
                let popOverall = 'N/A';
                let popAvgRatings = {
                    taste: 'N/A',
                    smell: 'N/A',
                    bite: 'N/A',
                    drip: 'N/A',
                    visuals: 'N/A',
                    strength: 'N/A'
                };

                // Check if there are any ratings for the most popular snus
                if (most_popular_today.rating_count && most_popular_today.rating_count > 0) {
                    popAvgRatings = {
                        visuals: (most_popular_today.avg_ratings.visuals || 0).toFixed(1),
                        smell: (most_popular_today.avg_ratings.smell || 0).toFixed(1),
                        taste: (most_popular_today.avg_ratings.taste || 0).toFixed(1),
                        bite: (most_popular_today.avg_ratings.bite || 0).toFixed(1),
                        drip: (most_popular_today.avg_ratings.drip || 0).toFixed(1),
                        strength: (most_popular_today.avg_ratings.strength || 0).toFixed(1),
                    };
                    popOverall = (most_popular_today.avg_score || 0).toFixed(1);
                }

                container.innerHTML += renderSocialCard("Most Popular Today 🔍", snusInfo, popAvgRatings, popOverall, most_popular_today.scan_count, 'Scans');
            }
        }
    }

    // Load Most Scanned List
    await loadMostScannedThisWeek();
}

async function loadMostScannedThisWeek() {
    const container = document.getElementById('top-snus-container');
    if (!container) return;

    // Fetch collections from last 7 days — aggregate by snus_id client-side
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabaseClient
        .from('user_collections')
        .select('snus_id, collected_at')
        .gte('collected_at', sevenDaysAgo.toISOString());

    if (error) {
        console.error("Error fetching most scanned:", error);
        return;
    }

    // Count occurrences per snus_id
    const counts = {};
    if (data && data.length > 0) {
        data.forEach(item => {
            if (item.snus_id) counts[item.snus_id] = (counts[item.snus_id] || 0) + 1;
        });
    }

    // Sort by count and take top 7
    const sortedSnus = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([id, count]) => {
            const snusInfo = globalSnusData.find(s => String(s.id) === String(id));
            return { snusInfo, count };
        })
        .filter(item => item.snusInfo != null);

    // Helper: score color
    const scoreColor = (v) => {
        if (!v && v !== 0) return 'text-[#8E8E93]';
        const n = parseFloat(v);
        if (n <= 3.9) return 'text-[#FF3B30]';
        if (n <= 6.9) return 'text-[#FFCC00]';
        if (n <= 8.9) return 'text-[#34C759]';
        return 'text-[#32ADE6]';
    };

    // Render HTML
    let listHTML = `
        <div class="mb-6">
            <div class="flex items-center justify-between mb-2.5">
                <span class="text-[13px] text-[#8E8E93] font-semibold uppercase tracking-wider">Most Scanned (7 Tage)</span>
            </div>
            <div class="bg-[#1C1C1E] rounded-[16px] border border-white/5 overflow-hidden shadow-lg">
    `;

    for (let i = 0; i < 7; i++) {
        const rank = i + 1;
        if (i < sortedSnus.length) {
            const item = sortedSnus[i];
            const snus = item.snusInfo;
            const name = snus.name || '—';
            const imgUrl = snus.image ? `${GITHUB_BASE}${snus.image}` : '';
            // overall_score may not exist; use avg_score or computed field; fallback to '—'
            const rawScore = snus.overall_score ?? snus.avg_score ?? snus.score ?? null;
            const scoreDisplay = (rawScore !== null && rawScore !== undefined) ? parseFloat(rawScore).toFixed(1) : '—';
            const colorClass = scoreColor(rawScore);

            listHTML += `
                <div class="flex items-center gap-3 p-3 border-b border-white/5 last:border-0 active:bg-white/5 cursor-pointer transition-colors" onclick="openSnusDetail(${snus.id})">
                    <span class="text-[13px] font-bold text-[#8E8E93] w-5 text-center flex-shrink-0">${rank}</span>
                    <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        ${imgUrl ? `<img src="${imgUrl}" class="h-full w-full object-contain" onerror="this.style.display='none'">` : '<div class="w-10 h-10 rounded-md bg-[#2C2C2E]"></div>'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-white text-[15px] font-semibold truncate tracking-tight leading-tight">${name}</h4>
                        <p class="text-[#8E8E93] text-[11px] tracking-wider mt-0.5">${item.count} Scan${item.count > 1 ? 's' : ''} diese Woche</p>
                    </div>
                    <div class="flex-shrink-0 flex flex-col items-center justify-center min-w-[40px]">
                        <span class="text-[17px] font-bold ${colorClass}">${scoreDisplay}</span>
                        <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-medium">Score</span>
                    </div>
                </div>
            `;
        } else {
            // Empty placeholder row
            listHTML += `
                <div class="flex items-center gap-3 p-3 border-b border-white/5 last:border-0 opacity-30">
                    <span class="text-[13px] font-bold text-[#8E8E93] w-5 text-center flex-shrink-0">${rank}</span>
                    <div class="w-10 h-10 rounded-md bg-[#2C2C2E] flex-shrink-0"></div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-[#8E8E93] text-[14px] italic tracking-tight">Noch keine Daten</h4>
                    </div>
                </div>
            `;
        }
    }

    listHTML += `
            </div>
        </div>
    `;

    container.innerHTML += listHTML;
}

function getScoreColor(score) {
    const val = parseFloat(score);
    if (val <= 3.9) return 'text-[#FF3B30]';
    if (val <= 6.9) return 'text-[#FFCC00]';
    if (val <= 8.9) return 'text-[#34C759]';
    return 'text-[#32ADE6]';
}

function getScoreRingColor(score) {
    const val = parseFloat(score);
    if (val <= 3.9) return 'border-[#FF3B30]/40';
    if (val <= 6.9) return 'border-[#FFCC00]/40';
    if (val <= 8.9) return 'border-[#34C759]/40';
    return 'border-[#32ADE6]/40';
}

function renderSocialCard(title, snus, ratings, overall, count, countLabel = 'Scans') {
    const rarity = (snus.rarity || 'common').toLowerCase().trim();

    const createCircle = (label, val) => `
        <div class="flex flex-col items-center">
            <div class="w-10 h-10 rounded-full border-2 ${getScoreRingColor(val)} flex items-center justify-center bg-black/20 mb-1">
                <span class="text-[13px] font-bold ${getScoreColor(val)}">${val}</span>
            </div>
            <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-medium">${label}</span>
        </div>
    `;

    return `
        <div class="bg-[#1C1C1E] rounded-[24px] p-5 shadow-lg border border-white/10 mb-5 relative active:scale-[0.98] transition-transform cursor-pointer" onclick="openSnusDetail(${snus.id})">
            <div class="mb-4 flex justify-between items-center">
                <span class="text-[11px] font-bold text-white tracking-widest uppercase bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">${title}</span>
                <span class="text-[11px] text-[#8E8E93] font-medium bg-black/30 px-2 py-1 rounded-md">${count} ${countLabel}</span>
            </div>
            
            <div class="flex items-center gap-4 mb-5">
                <div class="w-24 h-24 flex-shrink-0 flex items-center justify-center relative">
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full z-0" style="box-shadow: 0 0 20px 2px var(--${rarity}, var(--common)); opacity: 0.4;"></div>
                    <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain drop-shadow-xl z-10 relative" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                </div>
                
                <div class="flex-1 flex flex-col justify-center">
                    <h3 class="text-[18px] font-bold text-white tracking-tight leading-tight line-clamp-2 mb-1">${snus.name}</h3>
                    <p class="text-[12px] text-[#8E8E93] font-medium mb-2">${snus.nicotine} MG/G • <span style="color: var(--${rarity}, var(--common)); text-shadow: 0 0 8px var(--${rarity}, var(--common));" class="uppercase">${snus.rarity || 'Common'}</span></p>
                    
                    <div class="flex items-end gap-1.5">
                        <span class="text-[26px] font-bold ${getScoreColor(overall)} leading-none">${overall}</span>
                        <span class="text-[12px] text-[#8E8E93] font-medium pb-0.5">/ 10 Overall</span>
                    </div>
                </div>
            </div>
            
            <div class="pt-4 border-t border-white/5 grid grid-cols-6 gap-1">
                ${createCircle('Vis.', ratings.visuals)}
                ${createCircle('Smell', ratings.smell)}
                ${createCircle('Taste', ratings.taste)}
                ${createCircle('Bite', ratings.bite)}
                ${createCircle('Drip', ratings.drip)}
                ${createCircle('Str.', ratings.strength)}
            </div>
        </div>
    `;
}

// ==========================================
// 9.5. BADGES SYSTEM
// ==========================================

let globalBadges = [];
let globalUserBadges = new Set();
let globalBadgeProgress = 0;

async function loadBadges() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Fetch badges
    const { data: allBadges } = await supabaseClient
        .from('badges')
        .select('*')
        .order('level', { ascending: true });

    globalBadges = allBadges || [];

    // Fetch user badges
    const { data: userBadges } = await supabaseClient
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

    globalUserBadges = new Set(userBadges ? userBadges.map(ub => ub.badge_id) : []);

    // Calculate progress for "collector" badges
    const { data: collections } = await supabaseClient
        .from('user_collections')
        .select('snus_id')
        .eq('user_id', user.id);

    globalBadgeProgress = collections ? new Set(collections.map(c => c.snus_id)).size : 0;

    const stripContainer = document.getElementById('badges-strip');
    if (stripContainer) {
        let stripHtml = '';
        globalBadges.forEach(badge => {
            if (globalUserBadges.has(badge.id)) {
                const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
                stripHtml += `<div class="w-12 h-12 flex-shrink-0"><img src="${imgUrl}" class="w-full h-full object-contain" onerror="this.src='https://via.placeholder.com/150'"></div>`;
            }
        });

        if (stripHtml === '') {
            stripContainer.innerHTML = '<div class="text-[13px] text-[#8E8E93] py-2 px-1">Noch keine Badges freigeschaltet.</div>';
        } else {
            stripContainer.innerHTML = stripHtml;
        }
    }
}

function openBadgesGrid() {
    const gridPage = document.getElementById('badges-grid-page');
    if (!gridPage) return;

    gridPage.classList.remove('hidden');
    setTimeout(() => {
        gridPage.classList.remove('translate-x-full');
    }, 10);

    const gridContent = document.getElementById('badges-grid-content');
    if (!gridContent) return;

    let html = '';
    globalBadges.forEach(badge => {
        const isUnlocked = globalUserBadges.has(badge.id);
        const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;

        let progressPercent = 0;
        if (badge.category === 'collector') {
            progressPercent = Math.min(100, Math.floor((globalBadgeProgress / badge.required_count) * 100));
        }

        if (isUnlocked) {
            html += `
                <div class="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 flex flex-col items-center shadow-sm relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                    <div class="w-28 h-28 mb-3 drop-shadow-lg">
                        <img src="${imgUrl}" class="w-full h-full object-contain" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <h3 class="text-white text-[15px] font-bold text-center leading-tight mb-1">${badge.name}</h3>
                    <p class="text-[#8E8E93] text-[11px] text-center mb-3 line-clamp-2">${badge.description}</p>
                    <div class="w-full bg-[#34C759]/20 rounded-full py-1 text-center mt-auto border border-[#34C759]/30">
                        <span class="text-[#34C759] text-[10px] font-bold uppercase tracking-wider">Freigeschaltet</span>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="bg-[#1C1C1E]/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center shadow-sm relative opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                    <div class="w-28 h-28 mb-3 opacity-50 drop-shadow-none">
                        <img src="${imgUrl}" class="w-full h-full object-contain" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <h3 class="text-white/70 text-[15px] font-bold text-center leading-tight mb-1">${badge.name}</h3>
                    <p class="text-[#8E8E93]/70 text-[11px] text-center mb-3 line-clamp-2">${badge.description}</p>
                    
                    <div class="w-full mt-auto">
                        <div class="flex justify-between items-end mb-1">
                            <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-semibold">Fortschritt</span>
                            <span class="text-[11px] font-bold text-white">${progressPercent}%</span>
                        </div>
                        <div class="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                            <div class="h-full bg-white/30 rounded-full" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    gridContent.innerHTML = html;
}

function closeBadgesGrid() {
    const gridPage = document.getElementById('badges-grid-page');
    if (!gridPage) return;

    gridPage.classList.add('translate-x-full');
    setTimeout(() => {
        gridPage.classList.add('hidden');
    }, 300);
}

async function evaluateBadges() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    await loadBadges();

    for (const badge of globalBadges) {
        if (!globalUserBadges.has(badge.id) && badge.category === 'collector' && globalBadgeProgress >= badge.required_count) {

            const { error } = await supabaseClient
                .from('user_badges')
                .insert([{ user_id: user.id, badge_id: badge.id }]);

            if (!error) {
                const xpMap = { 1: 250, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1200, 7: 1400, 8: 1600, 9: 1800, 10: 2000 };
                const xpGained = xpMap[badge.level] || 100;
                await supabaseClient.rpc('increment_badge_xp', { uid: user.id, xp_amount: xpGained });

                showBadgeUnlock(badge, xpGained);
                globalUserBadges.add(badge.id);
            }
        }
    }

    loadBadges();
}

function showBadgeUnlock(badge, xp) {
    const overlay = document.getElementById('badge-unlock-overlay');
    const img = document.getElementById('badge-unlock-img');
    const nameText = document.getElementById('badge-unlock-name');
    const xpText = document.getElementById('badge-unlock-xp');

    if (!overlay || !img || !nameText) return;

    const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
    img.src = imgUrl;
    nameText.innerText = badge.name;

    if (xpText && xp) {
        xpText.style.display = 'block';
        xpText.innerText = '+' + xp + ' XP';
    } else if (xpText) {
        xpText.style.display = 'none';
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');

    // Close on click
    overlay.onclick = () => closeBadgeUnlock();
}

function closeBadgeUnlock() {
    const overlay = document.getElementById('badge-unlock-overlay');
    if (!overlay) return;

    overlay.classList.remove('flex');
    overlay.classList.add('hidden');
    overlay.onclick = null;

    if (typeof loadUserStats === 'function') {
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) loadUserStats(user.id);
        });
    }
}

// ==========================================
// 9.6. SOCIAL FEATURES (FRIENDS & SEARCH)
// ==========================================

let userSearchTimeout;

function clearConnectionSearch() {
    const input = document.getElementById('connections-search-input');
    const clearBtn = document.getElementById('conn-search-clear');
    const searchPanel = document.getElementById('connections-search-panel');
    const mainPanel = document.getElementById('connections-main-panel');
    const resultsContainer = document.getElementById('connections-search-results');

    input.value = '';
    clearBtn.classList.add('hidden');
    searchPanel.classList.add('hidden');
    mainPanel.classList.remove('hidden');
    resultsContainer.innerHTML = '';
}

async function searchUsersConnections() {
    clearTimeout(userSearchTimeout);
    const inputField = document.getElementById('connections-search-input');
    const query = inputField.value.trim();
    const resultsContainer = document.getElementById('connections-search-results');
    const searchPanel = document.getElementById('connections-search-panel');
    const mainPanel = document.getElementById('connections-main-panel');
    const clearBtn = document.getElementById('conn-search-clear');

    if (query.length === 0) {
        // Wenn komplett leer, rufe clearConnectionSearch auf (welches alles zurücksetzt)
        clearConnectionSearch();
        return;
    }

    if (query.length < 2) {
        // Wenn 1 Buchstabe: Zeige Search Panel mit "Bitte mehr tippen", aber lösche NICHT den Input!
        clearBtn.classList.remove('hidden');
        mainPanel.classList.add('hidden');
        searchPanel.classList.remove('hidden');
        resultsContainer.innerHTML = '<div class="text-center text-[#8E8E93] text-[14px] mt-8">Bitte mindestens 2 Zeichen eingeben...</div>';
        return;
    }

    clearBtn.classList.remove('hidden');
    mainPanel.classList.add('hidden');
    searchPanel.classList.remove('hidden');
    resultsContainer.innerHTML = '<div class="text-center text-[#8E8E93] text-[14px] mt-8">Suche...</div>';

    userSearchTimeout = setTimeout(async () => {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // Suche Profile
        const { data: profiles, error: pError } = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url, xp')
            .ilike('username', `%${query}%`)
            .neq('id', user.id)
            .limit(20);

        if (pError || !profiles || profiles.length === 0) {
            resultsContainer.innerHTML = '<div class="text-center text-[#8E8E93] text-[14px] mt-8">Keine Collector gefunden.</div>';
            return;
        }

        // Finde Follow-Status des aktuellen Users zu diesen Profilen
        const { data: follows } = await supabaseClient
            .from('user_follows')
            .select('following_id, status')
            .eq('follower_id', user.id)
            .in('following_id', profiles.map(p => p.id));

        const followMap = {};
        if (follows) {
            follows.forEach(f => followMap[f.following_id] = f.status);
        }

        resultsContainer.innerHTML = '';
        profiles.forEach(profile => {
            const followStatus = followMap[profile.id] || 'none';

            let btnText = "Folgen";
            let btnClass = "bg-[#0A84FF] text-white active:bg-[#0070E0]"; // Standard Follow Button

            if (followStatus === 'accepted') {
                btnText = "Folge ich";
                btnClass = "bg-[#2C2C2E] text-white active:bg-[#3A3A3C]";
            } else if (followStatus === 'pending') {
                btnText = "Angefragt";
                btnClass = "bg-[#2C2C2E] text-white active:bg-[#3A3A3C]";
            }

            const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;
            const xp = profile.xp || 0;
            const level = Math.floor(xp / 300) + 1;
            const cans = Math.floor(xp / 100);

            resultsContainer.innerHTML += `
                <div class="flex items-center justify-between py-2.5">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[15px] font-semibold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                            <p class="text-[13px] text-[#8E8E93] truncate">Lvl ${level} • ${cans} Dosen</p>
                        </div>
                    </div>
                    <button onclick="triggerHapticFeedback(); toggleFollow('${profile.id}', this)" 
                            data-status="${followStatus}"
                            class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all flex-shrink-0 ${btnClass}">
                        ${btnText}
                    </button>
                </div>
            `;
        });
    }, 400);
}

async function toggleFollow(targetId, btnElement) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const currentStatus = btnElement.getAttribute('data-status');
    btnElement.disabled = true;

    // Visuelles Feedback sofort
    const originalText = btnElement.innerText;
    const originalClass = btnElement.className;
    btnElement.innerText = "...";

    if (currentStatus === 'accepted' || currentStatus === 'pending') {
        // UNFOLLOW / ANFRAGE ZURÜCKZIEHEN
        const { error } = await supabaseClient
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetId);

        if (!error) {
            btnElement.setAttribute('data-status', 'none');
            btnElement.className = "ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all flex-shrink-0 bg-[#0A84FF] text-white active:bg-[#0070E0]";
            btnElement.innerText = "Folgen";
        } else {
            btnElement.className = originalClass;
            btnElement.innerText = originalText;
        }
    } else {
        // FOLLOW / ANFRAGE SENDEN
        const { error } = await supabaseClient
            .from('user_follows')
            .insert([{
                follower_id: user.id,
                following_id: targetId,
                status: 'pending' // Instagram-style: immer erst pending
            }]);

        if (!error) {
            btnElement.setAttribute('data-status', 'pending');
            btnElement.className = "ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all flex-shrink-0 bg-[#2C2C2E] text-white active:bg-[#3A3A3C]";
            btnElement.innerText = "Angefragt";
        } else {
            btnElement.className = originalClass;
            btnElement.innerText = originalText;
        }
    }

    btnElement.disabled = false;
    // Wenn wir nicht in der Suche sind, lade Daten neu
    const searchPanel = document.getElementById('connections-search-panel');
    if (searchPanel && searchPanel.classList.contains('hidden')) {
        loadConnectionsData();
    }
}

// ==========================================
// 9.6. CONNECTIONS PAGE TABS & DATA LOGIC
// ==========================================

function switchConnTab(tabName) {
    // 1. Update Buttons
    const tabs = ['friends', 'followers', 'following', 'requests'];
    tabs.forEach(t => {
        const btn = document.getElementById(`conn-tab-${t}`);
        if (btn) {
            if (t === tabName) {
                btn.classList.remove('text-[#8E8E93]', 'bg-transparent');
                btn.classList.add('bg-white', 'text-black');
            } else {
                btn.classList.remove('bg-white', 'text-black');
                btn.classList.add('text-[#8E8E93]', 'bg-transparent');
            }
        }

        // 2. Update Panels
        const panel = document.getElementById(`conn-panel-${t}`);
        if (panel) {
            if (t === tabName) panel.classList.remove('hidden');
            else panel.classList.add('hidden');
        }
    });
}

async function acceptFollowRequest(requestId, targetId) {
    triggerHapticFeedback();
    const btn = event.currentTarget;
    const parentDiv = btn.closest('.request-item-row');

    // Optimistic UI
    if (parentDiv) parentDiv.style.opacity = '0.5';

    const { error } = await supabaseClient
        .from('user_follows')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    if (!error) {
        if (parentDiv) parentDiv.remove();
        loadConnectionsData(); // Refresh all lists
    } else {
        if (parentDiv) parentDiv.style.opacity = '1';
        alert("Fehler beim Akzeptieren der Anfrage.");
    }
}

async function declineFollowRequest(requestId) {
    triggerHapticFeedback();
    const btn = event.currentTarget;
    const parentDiv = btn.closest('.request-item-row');

    // Optimistic UI
    if (parentDiv) parentDiv.style.opacity = '0.5';

    const { error } = await supabaseClient
        .from('user_follows')
        .delete()
        .eq('id', requestId);

    if (!error) {
        if (parentDiv) parentDiv.remove();
        loadConnectionsData(); // Refresh counts
    } else {
        if (parentDiv) parentDiv.style.opacity = '1';
        alert("Fehler beim Ablehnen der Anfrage.");
    }
}

async function loadConnectionsData() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const friendsList = document.getElementById('friends-list-container');
    const followersList = document.getElementById('followers-list-container');
    const followingList = document.getElementById('following-list-container');
    const requestsList = document.getElementById('requests-list-container');

    // 1. Lade eingehende Anfragen & Follower
    const { data: incoming } = await supabaseClient
        .from('user_follows')
        .select(`
            id, status,
            follower:profiles!follower_id(id, username, avatar_url, xp)
        `)
        .eq('following_id', user.id);

    // 2. Lade ausgehende Follows
    const { data: outgoing } = await supabaseClient
        .from('user_follows')
        .select(`
            id, status, following_id,
            following:profiles!following_id(id, username, avatar_url, xp)
        `)
        .eq('follower_id', user.id);

    // Verarbeiten
    const pendingRequests = (incoming || []).filter(c => c.status === 'pending');
    const myFollowers = (incoming || []).filter(c => c.status === 'accepted');
    const iAmFollowing = (outgoing || []).filter(c => c.status === 'accepted');

    // Freunde (Mutuals) = Die, denen ich folge UND die mir folgen
    const myFollowersIds = new Set(myFollowers.map(f => f.follower.id));
    const friends = iAmFollowing.filter(f => myFollowersIds.has(f.following_id));

    // --- RENDER PENDING REQUESTS ---
    const banner = document.getElementById('conn-pending-banner');
    const badge = document.getElementById('conn-requests-badge');
    const countText = document.getElementById('conn-pending-count-text');

    if (pendingRequests.length > 0) {
        banner.classList.remove('hidden');
        badge.classList.remove('hidden');
        countText.innerText = `${pendingRequests.length} offene Anfrage${pendingRequests.length > 1 ? 'n' : ''}`;

        requestsList.innerHTML = '';
        pendingRequests.forEach(req => {
            const profile = req.follower;
            if (!profile) return;
            const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;

            requestsList.innerHTML += `
                <div class="request-item-row flex items-center justify-between py-2.5">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[15px] font-semibold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                            <p class="text-[13px] text-[#8E8E93] truncate">Möchte dir folgen</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 pl-2">
                        <button onclick="acceptFollowRequest('${req.id}', '${profile.id}')" class="px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-[#0A84FF] text-white active:bg-[#0070E0] transition-colors">
                            Bestätigen
                        </button>
                        <button onclick="declineFollowRequest('${req.id}')" class="w-8 h-8 rounded-[10px] bg-[#2C2C2E] text-[#8E8E93] flex items-center justify-center active:bg-[#3A3A3C] transition-colors">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>
            `;
        });
    } else {
        banner.classList.add('hidden');
        badge.classList.add('hidden');
        requestsList.innerHTML = '<div class="py-10 text-center text-[#8E8E93] text-[14px]">Keine offenen Anfragen.</div>';
    }

    // --- RENDER FRIENDS ---
    if (friends.length > 0) {
        friendsList.innerHTML = '';
        friends.forEach(f => {
            friendsList.innerHTML += renderConnectionItem(f.following, 'accepted', f.following_id);
        });
    } else {
        friendsList.innerHTML = '<div class="py-10 text-center text-[#8E8E93] text-[14px]">Füge Freunde hinzu, um sie hier zu sehen.</div>';
    }

    // Erstelle ein Map mit Status der Leute, denen ich folge
    const myOutgoingFollows = new Map();
    (outgoing || []).forEach(f => myOutgoingFollows.set(f.following_id, f.status));

    // --- RENDER FOLLOWERS ---
    if (myFollowers.length > 0) {
        followersList.innerHTML = '';
        myFollowers.forEach(f => {
            const status = myOutgoingFollows.get(f.follower.id) || 'none';
            followersList.innerHTML += renderConnectionItem(f.follower, status, f.follower.id);
        });
    } else {
        followersList.innerHTML = '<div class="py-10 text-center text-[#8E8E93] text-[14px]">Du hast noch keine Follower.</div>';
    }

    // --- RENDER FOLLOWING ---
    if (iAmFollowing.length > 0) {
        followingList.innerHTML = '';
        iAmFollowing.forEach(f => {
            followingList.innerHTML += renderConnectionItem(f.following, 'accepted', f.following_id);
        });
    } else {
        followingList.innerHTML = '<div class="py-10 text-center text-[#8E8E93] text-[14px]">Du folgst noch niemandem.</div>';
    }
}

// Helper zum Rendern von Profil-Reihen in den Listen
function renderConnectionItem(profile, followStatus, profileId) {
    if (!profile) return '';
    const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;
    const xp = profile.xp || 0;
    const level = Math.floor(xp / 300) + 1;
    const cans = Math.floor(xp / 100);

    let actionBtn = '';
    if (followStatus === 'accepted') {
        actionBtn = `
            <button onclick="triggerHapticFeedback(); toggleFollow('${profileId}', this)" data-status="accepted" class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-[#2C2C2E] text-white active:bg-[#3A3A3C] transition-all flex-shrink-0">
                Folge ich
            </button>`;
    } else if (followStatus === 'pending') {
        actionBtn = `
            <button onclick="triggerHapticFeedback(); toggleFollow('${profileId}', this)" data-status="pending" class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-[#2C2C2E] text-white active:bg-[#3A3A3C] transition-all flex-shrink-0">
                Angefragt
            </button>`;
    } else {
        actionBtn = `
            <button onclick="triggerHapticFeedback(); toggleFollow('${profileId}', this)" data-status="none" class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-[#0A84FF] text-white active:bg-[#0070E0] transition-all flex-shrink-0">
                Folgen
            </button>`;
    }

    return `
        <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff'">
                <div class="min-w-0 flex-1">
                    <h4 class="text-white text-[15px] font-semibold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                    <p class="text-[13px] text-[#8E8E93] truncate">Lvl ${level} • ${cans} Dosen</p>
                </div>
            </div>
            ${actionBtn}
        </div>
    `;
}

// Swipe-Logik für die Connections-Seite
let connStartX = 0;
let connStartY = 0;
let connCurrentX = 0;
let isConnDragging = false;
let isHorizontalIntent = null; // Prüft, ob der User scrollt oder wischt

function setupConnectionsSwipe() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    page.addEventListener('touchstart', (e) => {
        // WICHTIG: Ignoriere Swipes, die auf einem Input-Feld starten,
        // da sonst iOS Safari den Fokus-Event abbrechen kann.
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            isConnDragging = false;
            return;
        }

        connStartX = e.touches[0].clientX;
        connStartY = e.touches[0].clientY;
        connCurrentX = connStartX;
        isConnDragging = true;
        isHorizontalIntent = null; // Intent bei jedem neuen Touch zurücksetzen

        page.style.transition = 'none'; // Sofortiges Tracking
    }, { passive: true });

    page.addEventListener('touchmove', (e) => {
        if (!isConnDragging) return;

        connCurrentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = connCurrentX - connStartX;
        const deltaY = currentY - connStartY;

        // 1. Finde heraus, ob der User vertikal oder horizontal wischt (nur beim ersten Bewegen)
        if (isHorizontalIntent === null) {
            // Wenn die Bewegung nach oben/unten größer ist als nach links/rechts -> abbrechen
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isHorizontalIntent = false;
                isConnDragging = false;
                return;
            } else {
                isHorizontalIntent = true;
            }
        }

        // 2. Wenn es ein horizontaler Swipe ist, folge dem Finger (nur nach rechts)
        if (isHorizontalIntent && deltaX > 0) {
            if (e.cancelable) e.preventDefault(); // Verhindert Browser-Back-Swipe Konflikte
            page.style.transform = `translateX(${deltaX}px)`;
        }
    }, { passive: false }); // false, damit wir preventDefault nutzen können

    page.addEventListener('touchend', () => {
        if (!isConnDragging) return;
        isConnDragging = false;

        const deltaX = connCurrentX - connStartX;

        // Die Apple-Bezier-Kurve für das Zurückschnappen
        page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaX > 100) { // Schwellenwert: Wenn mehr als 100px gezogen, dann schließen
            closeConnectionsPage();
        } else {
            // Zurück in die Ausgangsposition
            page.style.transform = 'translateX(0px)';
            setTimeout(() => {
                page.style.transition = '';
            }, 350);
        }
    });
}

// Einmal initialisieren
setupConnectionsSwipe();

function openConnectionsPage() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    // 1. Reset & Lade Daten
    clearConnectionSearch();
    switchConnTab('friends'); // Default Tab
    loadConnectionsData();

    // 2. Setup (Unsichtbar nach rechts schieben)
    page.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    page.style.transition = 'none';
    page.style.transform = 'translateX(100%)';

    // 3. Force Reflow (zwingt den Browser, die Startposition zu übernehmen)
    page.offsetHeight;

    // 4. Animation abspielen
    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(0)';
}

function closeConnectionsPage() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    // 1. Animation nach rechts weg
    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(100%)';

    // 2. Aufräumen nach der Animation
    setTimeout(() => {
        page.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        // Reset Styles für den nächsten Start
        page.style.transform = '';
        page.style.transition = '';
    }, 350);
}

document.addEventListener('DOMContentLoaded', () => {
    const connectionsPage = document.getElementById('connections-page');
    if (!connectionsPage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    connectionsPage.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, {
        passive: true
    });

    connectionsPage.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY) return;

        let touchCurrentX = e.touches[0].clientX;
        let touchCurrentY = e.touches[0].clientY;

        let diffX = touchCurrentX - touchStartX;
        let diffY = Math.abs(touchCurrentY - touchStartY);

        if (diffY > Math.abs(diffX)) {
            return;
        }

        if (diffX > 0) {
            isSwiping = true;
            connectionsPage.style.transition = 'none';
            connectionsPage.style.transform = `translateX(${diffX}px)`;
        }
    }, {
        passive: true
    });

    connectionsPage.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        let diffX = e.changedTouches[0].clientX - touchStartX;
        connectionsPage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        if (diffX > window.innerWidth / 3 || diffX > 100) {
            closeConnectionsPage();
        } else {
            connectionsPage.style.transform = 'translateX(0)';
        }
        setTimeout(() => {
            connectionsPage.style.transform = '';
            connectionsPage.style.transition = '';
        }, 300);
        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;
    });
});

// 10. USAGE LOGS & CONCURRENT CAN TRACKING
// ==========================================

let globalAllLogs = []; // Array für alle Logs (Caching für Stats/Modals)
let globalActiveLogs = []; // Array für alle aktuell offenen Dosen
let globalInactiveLogs = []; // Array für alle geschlossenen Dosen

async function startNewCan(snusId) {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return false;

    // mg_per_gram aus dem globalen Dex ziehen
    const snus = globalSnusData.find(s => s.id == snusId);
    const mgVal = snus ? snus.nicotine : 0;

    const {
        error
    } = await supabaseClient
        .from('usage_logs')
        .insert([{
            user_id: user.id,
            snus_id: snusId,
            mg_per_gram: mgVal,
            is_active: true
        }]);

    if (!error) {
        triggerHapticFeedback();
        await loadUsageData(); // UI aktualisieren
        return true; // WICHTIG: Signalisiert Erfolg!
    } else {
        console.error("Supabase Error:", error.message);
        return false;
    }
}

// Diese Funktion wird vom Button im Modal aufgerufen
async function startNewCanFromModal() {
    if (!currentSelectedSnusId) {
        console.error("Fehler: Keine Snus-ID gefunden.");
        return;
    }

    // Button visuell blockieren, damit der User nicht 5x klickt
    const btn = document.getElementById('open-can-btn');
    if (btn) {
        btn.innerHTML = '<div class="flex items-center justify-center w-[34px] h-[25px] mx-auto"><svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
        btn.classList.add('opacity-80');
        btn.disabled = true;
    }

    const success = await startNewCan(currentSelectedSnusId);

    if (success) {
        closeSnusDetail();
        // Wir wechseln automatisch zum Home/Wallet-Tab, damit der User seine neue Dose sieht!
        switchTab('home');
    } else {
        alert("Fehler beim Öffnen. Hast du das SQL-Update (mg_per_gram) in Supabase ausgeführt?");
    }

    if (btn) {
        btn.innerHTML = "Neue Dose öffnen";
        btn.classList.remove('opacity-80');
        btn.disabled = false;
    }
}

// Zentrale Lade-Funktion für alles, was mit Konsum zu tun hat
async function loadUsageData() {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const {
        data: logs,
        error
    } = await supabaseClient
        .from('usage_logs')
        .select('*, snus_products(name, image)')
        .eq('user_id', user.id)
        .order('opened_at', {
            ascending: false
        });

    if (!error && logs) {
        globalAllLogs = logs;
        globalActiveLogs = logs.filter(l => l.is_active === true);
        globalInactiveLogs = logs.filter(l => l.is_active === false);

        renderActiveCansUI();
        calculateUsageStats(logs);
        updateLivePerformance();
    }
}

async function finishSpecificCan(logId) {
    triggerHapticFeedback();

    const logItem = globalActiveLogs.find(c => c.id === logId);
    const maxPouches = logItem ? (logItem.pouches_per_can || 20) : 20;

    const {
        error
    } = await supabaseClient
        .from('usage_logs')
        .update({
            finished_at: new Date().toISOString(),
            is_active: false,
            pouches_taken: maxPouches
        })
        .eq('id', logId);

    if (!error) {
        await loadUsageData();
    }
}

function renderActiveCansUI() {
    const container = document.getElementById('active-cans-list');
    if (!container) return;

    container.innerHTML = '';

    if (globalActiveLogs.length === 0) {
        container.innerHTML = '<div class="flex items-center justify-between px-1 py-2"><p class="text-[13px] text-zinc-500">Keine aktiven Dosen.</p><button onclick="triggerHapticFeedback(); openScanModal()" class="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-full text-[13px] font-medium text-white active:bg-white/20 transition-colors tracking-wide">Öffne die nächste<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></button></div>';
        return;
    }

    const trackingMode = localStorage.getItem('snusTrackingMode') || 'full';

    globalActiveLogs.forEach(can => {
        const snusName = can.snus_products ? can.snus_products.name : 'Unknown';
        const snusImg = can.snus_products ? can.snus_products.image : '';
        const logId = can.id;

        if (trackingMode === 'individual') {
            const pouchesTotal = can.pouches_per_can || 20;
            const pouchesTaken = can.pouches_taken || 0;

            container.innerHTML += `
                <div class="flex items-center justify-between bg-[#1C1C1E] border border-white/5 rounded-2xl p-3 mb-3 shadow-sm select-none">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <img src="${GITHUB_BASE}${snusImg}" class="h-full object-contain">
                        </div>
                        <div class="min-w-0 flex-1 pr-2">
                            <h4 class="text-white text-[15px] font-semibold truncate leading-tight">${snusName}</h4>
                            <p class="text-[11px] text-[#8E8E93] tracking-wider mt-0.5">${pouchesTaken} / ${pouchesTotal} Pouches Taken</p>
                        </div>
                    </div>
                    
                    <div class="relative w-[48px] h-[48px] flex items-center justify-center group flex-shrink-0 touch-none" 
                         oncontextmenu="return false;"
                         ontouchstart="startAddPouch('${logId}', ${pouchesTotal}, ${pouchesTaken})" 
                         ontouchend="stopAddPouch()" 
                         onmousedown="startAddPouch('${logId}', ${pouchesTotal}, ${pouchesTaken})" 
                         onmouseup="stopAddPouch()" 
                         onmouseleave="stopAddPouch()">
                        
                        <svg class="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.1)" stroke-width="4" fill="none" />
                            <circle id="progress-${logId}" cx="24" cy="24" r="22" stroke="white" stroke-width="4" fill="none" 
                                    stroke-dasharray="138.2" stroke-dashoffset="138.2" style="transition: none;" />
                        </svg>
                        
                        <div class="w-[36px] h-[36px] bg-white/10 rounded-full flex items-center justify-center group-active:scale-95 transition-transform pointer-events-none">
                            <svg class="w-5 h-5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="flex items-center justify-between bg-[#1C1C1E] border border-white/5 rounded-2xl p-3 mb-3 shadow-sm">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <img src="${GITHUB_BASE}${snusImg}" class="h-full object-contain">
                        </div>
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[15px] font-semibold truncate leading-tight">${snusName}</h4>
                            <p class="text-[11px] text-[#8E8E93] tracking-wider mt-0.5">Open since ${new Date(can.opened_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div id="empty-container-${can.id}" class="relative flex-shrink-0 cursor-pointer ml-3"
                        ontouchstart="startEmptyCan('${can.id}')"
                        ontouchend="stopEmptyCan()"
                        onmousedown="startEmptyCan('${can.id}')"
                        onmouseup="stopEmptyCan()"
                        onmouseleave="stopEmptyCan()"
                        style="user-select: none; -webkit-user-select: none;">

                        <!-- Ring: 8px Abstand, rx = button-rx + 8, perfekt konzentrisch -->
                        <svg class="absolute pointer-events-none"
                             style="inset: -8px; width: calc(100% + 16px); height: calc(100% + 16px);"
                             viewBox="0 0 88 50">
                            <!-- Track -->
                            <path d="M44,4 H64 A21,21 0 1,1 64,46 H24 A21,21 0 1,1 24,4 H44 Z"
                                stroke="rgba(255,255,255,0.15)" stroke-width="3" fill="none"
                                stroke-linecap="round" />
                            <!-- Progress — von Mitte oben, Uhrzeigersinn -->
                            <path id="empty-progress-${can.id}"
                                d="M44,4 H64 A21,21 0 1,1 64,46 H24 A21,21 0 1,1 24,4 H44 Z"
                                stroke="white" stroke-width="3" fill="none"
                                stroke-linecap="round"
                                pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"
                                style="transition: none;" />
                        </svg>

                        <div id="empty-btn-${can.id}" class="bg-white text-black text-[11px] font-bold px-4 py-2 rounded-full active:scale-95 transition-transform pointer-events-none select-none whitespace-nowrap">
                            Empty
                        </div>
                    </div>
                </div>
            `;
        }
    });
}

let addPouchTimer = null;
let addPouchProgress = 0;
let addPouchLogId = null;

let emptyCanTimer = null;
let emptyCanProgress = 0;
let emptyCanLogId = null;

function startEmptyCan(logId) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('light');
    emptyCanLogId = logId;
    emptyCanProgress = 0;

    const progressRect = document.getElementById(`empty-progress-${logId}`);
    if (progressRect) {
        progressRect.style.transition = 'none';
        progressRect.style.strokeDashoffset = '100';
    }

    emptyCanTimer = setInterval(() => {
        emptyCanProgress += 2;

        if (progressRect) {
            progressRect.style.strokeDashoffset = 100 - emptyCanProgress;
        }

        if (emptyCanProgress >= 100) {
            clearInterval(emptyCanTimer);
            emptyCanTimer = null;
            emptyCanProgress = 100;
            if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');

            const btn = document.getElementById(`empty-btn-${logId}`);
            if (btn) {
                btn.innerHTML = '<div class="flex items-center justify-center w-[34px] h-[16px]"><svg class="animate-spin h-3.5 w-3.5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
                btn.classList.add('opacity-50');
            }

            const container = document.getElementById(`empty-container-${logId}`);
            if (container) {
                container.style.pointerEvents = 'none';
            }

            finishSpecificCan(logId);
        }
    }, 20);
}

function stopEmptyCan() {
    if (emptyCanTimer) {
        clearInterval(emptyCanTimer);
        emptyCanTimer = null;
    }

    if (emptyCanLogId && emptyCanProgress < 100) {
        const progressRect = document.getElementById(`empty-progress-${emptyCanLogId}`);
        if (progressRect) {
            progressRect.style.transition = 'stroke-dashoffset 0.3s ease';
            progressRect.style.strokeDashoffset = '100';
        }
    }
}

function startAddPouch(logId, maxPouches, currentPouches) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('light');
    addPouchLogId = logId;
    addPouchProgress = 0;
    const progressCircle = document.getElementById(`progress-${logId}`);
    if (progressCircle) {
        progressCircle.style.transition = 'none';
        progressCircle.style.strokeDashoffset = '138.2';
    }

    addPouchTimer = setInterval(() => {
        addPouchProgress += 2; // 50 updates per second -> 100 in 1 second
        if (progressCircle) {
            const offset = 138.2 - (138.2 * (addPouchProgress / 100));
            progressCircle.style.strokeDashoffset = offset;
        }

        if (addPouchProgress >= 100) {
            clearInterval(addPouchTimer);
            addPouchTimer = null;
            addPouchProgress = 100;
            if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');

            executeAddPouch(logId, maxPouches, currentPouches + 1);
        }
    }, 20);
}

function stopAddPouch() {
    if (addPouchTimer) {
        clearInterval(addPouchTimer);
        addPouchTimer = null;
    }

    if (addPouchLogId && addPouchProgress < 100) {
        const progressCircle = document.getElementById(`progress-${addPouchLogId}`);
        if (progressCircle) {
            progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';
            progressCircle.style.strokeDashoffset = '138.2';
        }
    }
    addPouchLogId = null;
}

async function executeAddPouch(logId, maxPouches, newCount) {
    const isFinished = newCount >= maxPouches;

    const updates = { pouches_taken: newCount };
    if (isFinished) {
        updates.is_active = false;
        updates.finished_at = new Date().toISOString();
    }

    const canIndex = globalActiveLogs.findIndex(c => c.id === logId);
    if (canIndex > -1) {
        globalActiveLogs[canIndex].pouches_taken = newCount;
        if (isFinished) {
            globalActiveLogs[canIndex].is_active = false;
            globalActiveLogs[canIndex].finished_at = updates.finished_at;
            globalActiveLogs.splice(canIndex, 1);
        }
    }
    renderActiveCansUI();

    const { error } = await supabaseClient
        .from('usage_logs')
        .update(updates)
        .eq('id', logId);

    if (error) {
        console.error("Error updating pouch count:", error);
    } else {
        loadUsageData();
    }
}

function calculateUsageStats(allLogs) {
    const finishedCans = allLogs.filter(log => !log.is_active && log.finished_at);
    const activeCans = allLogs.filter(log => log.is_active);

    if (finishedCans.length === 0 && activeCans.length === 0) {
        if (currentDashboardStats.flow !== 0) animateNumber('stat-flow', currentDashboardStats.flow, 0, 1500, " MG", false);
        if (currentDashboardStats.avgPouches !== 0) animateNumber('stat-avg-pouches', currentDashboardStats.avgPouches, 0, 1500, "", true);
        if (currentDashboardStats.avgMg !== 0) animateNumber('stat-avg-mg', currentDashboardStats.avgMg, 0, 1500, " MG", false);

        currentDashboardStats.flow = 0;
        currentDashboardStats.avgPouches = 0;
        currentDashboardStats.avgMg = 0;
        return;
    }

    let totalMgHistory = 0;
    let totalPouchesHistory = 0;

    finishedCans.forEach(can => {
        const mgPerPouch = (can.mg_per_gram || 0) / 2;
        const mgPerCan = mgPerPouch * (can.pouches_per_can || 20);
        totalMgHistory += mgPerCan;
        totalPouchesHistory += (can.pouches_per_can || 20);
    });

    activeCans.forEach(can => {
        const mgPerPouch = (can.mg_per_gram || 0) / 2;
        const taken = can.pouches_taken || 0;
        totalMgHistory += (mgPerPouch * taken);
        totalPouchesHistory += taken;
    });

    let startDate = new Date();
    if (finishedCans.length > 0) {
        startDate = new Date(finishedCans[finishedCans.length - 1].opened_at);
    } else if (activeCans.length > 0) {
        startDate = new Date(activeCans[activeCans.length - 1].opened_at);
    }

    const today = new Date();
    let totalDaysSpan = (today - startDate) / (1000 * 60 * 60 * 24);
    if (totalDaysSpan < 1) totalDaysSpan = 1;

    let avgMgPerDay = totalMgHistory / totalDaysSpan;
    let avgPouchesPerDay = totalPouchesHistory / totalDaysSpan;

    if (activeCans.length === 0) {
        const sortedFinished = [...finishedCans].sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at));
        if (sortedFinished.length > 0) {
            const lastFinishedDate = new Date(sortedFinished[0].finished_at);
            const todayReset = new Date();
            todayReset.setHours(0, 0, 0, 0);
            lastFinishedDate.setHours(0, 0, 0, 0);

            const daysSinceLastFinished = (todayReset - lastFinishedDate) / (1000 * 60 * 60 * 24);
            if (daysSinceLastFinished >= 1) {
                avgMgPerDay = 0;
                avgPouchesPerDay = 0;
            }
        }
    }

    if (currentDashboardStats.flow !== totalMgHistory) {
        animateNumber('stat-flow', currentDashboardStats.flow, totalMgHistory, 1500, " MG", false);
        currentDashboardStats.flow = totalMgHistory;
    }
    if (currentDashboardStats.avgPouches !== avgPouchesPerDay) {
        animateNumber('stat-avg-pouches', currentDashboardStats.avgPouches, avgPouchesPerDay, 1500, "", true);
        currentDashboardStats.avgPouches = avgPouchesPerDay;
    }
    if (currentDashboardStats.avgMg !== avgMgPerDay) {
        animateNumber('stat-avg-mg', currentDashboardStats.avgMg, avgMgPerDay, 1500, " MG", false);
        currentDashboardStats.avgMg = avgMgPerDay;
    }
}




let html5QrCode = null;
let isProcessingScan = false;
let scanFlashlightOn = false;
let scanCurrentTrack = null; // MediaStreamTrack for torch control
let scanCameraIndex = 0;     // 0=normal, 1=wide, 2=tele
const SCAN_CAMERA_MODES = [
    { label: 'Normal', zoom: null, facingMode: 'environment' },
    { label: 'Weitwinkel', zoom: 0.5, facingMode: 'environment' },
    { label: 'Telelinse', zoom: 2.0, facingMode: 'environment' },
];

const scanModal = document.getElementById('scan-modal');
const scanModalCard = document.getElementById('scan-modal-card');
const scanModalBackdrop = document.getElementById('scan-modal-backdrop');


if (scanModal) {
    scanModal.addEventListener('touchmove', (e) => {
        if (!isScanDragging) {
            e.preventDefault();
        }
    }, {
        passive: false
    });
}


async function openScanModal() {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    isProcessingScan = false;
    scanFlashlightOn = false;
    scanCurrentTrack = null;
    scanCameraIndex = 0;

    // Reset button states
    const flashlightBtn = document.getElementById('scan-flashlight-btn');
    const flashlightLabel = document.getElementById('scan-flashlight-label');
    const cameraLabel = document.getElementById('scan-camera-label');
    if (flashlightBtn) {
        flashlightBtn.classList.remove('bg-white/20', 'border-white/40');
        flashlightBtn.classList.add('bg-[#1C1C1E]', 'border-white/10');
    }
    if (flashlightLabel) flashlightLabel.textContent = 'Licht';
    if (cameraLabel) cameraLabel.textContent = SCAN_CAMERA_MODES[0].label;

    scanModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
        scanModalBackdrop.classList.remove('opacity-0');
        scanModalBackdrop.classList.add('opacity-100');

        scanModalCard.classList.remove('translate-y-full');
        scanModalCard.classList.add('translate-y-0');
    }, 10);

    setTimeout(() => {
        const loadingBar = document.getElementById('loading-bar-fill');

        if (loadingBar) {
            loadingBar.style.transition = 'width 750ms cubic-bezier(0.4, 0, 0.2, 1)';
            loadingBar.style.width = '100%';
        }
    }, 300);

    setTimeout(async () => {
        try {
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("scanner-reader");
            }

            await html5QrCode.start({
                facingMode: "environment"
            }, {
                fps: 60,
            },
                (decodedText, decodedResult) => {
                    if (isProcessingScan) return;
                    isProcessingScan = true;

                    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
                    closeScanModal();

                    setTimeout(() => {
                        const foundSnus = globalSnusData.find(s => String(s.barcode) === decodedText);
                        if (foundSnus) {
                            openSnusDetail(foundSnus.id, true);
                        } else {
                            console.log(`code ${decodedText} konnte nicht gefunden werden`);
                        }
                    }, 400);
                },
                (errorMessage) => { }
            );

            // Grab the active camera track for torch/zoom control
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                const tracks = stream.getVideoTracks();
                if (tracks.length > 0) {
                    scanCurrentTrack = tracks[0];
                    // Hide flashlight button if torch not supported
                    const capabilities = scanCurrentTrack.getCapabilities ? scanCurrentTrack.getCapabilities() : {};
                    const flashBtn = document.getElementById('scan-flashlight-btn');
                    if (flashBtn && !capabilities.torch) {
                        flashBtn.style.opacity = '0.3';
                        flashBtn.style.pointerEvents = 'none';
                    }
                }
            } catch (e) { /* torch not available */ }

            document.getElementById('camera-loading').classList.add('opacity-0', 'pointer-events-none');

            const scannerReader = document.getElementById('scanner-reader');
            if (scannerReader) {
                scannerReader.classList.remove('opacity-0');
                scannerReader.classList.add('opacity-100');
            }
        } catch (err) {
            console.error("Kamera-Zugriff verweigert:", err);
            const loadingScreen = document.getElementById('camera-loading');
            if (loadingScreen) {
                loadingScreen.innerHTML = '<p class="text-[#FF453A] text-sm font-medium">Kamera nicht verfügbar</p>';
            }
        }
    }, 300);
}


function closeScanModal(isDragging = false) {
    // Turn off flashlight when closing
    if (scanFlashlightOn && scanCurrentTrack) {
        try { scanCurrentTrack.applyConstraints({ advanced: [{ torch: false }] }); } catch (e) { }
        scanFlashlightOn = false;
    }
    scanCurrentTrack = null;

    scanModalCard.classList.remove('translate-y-0');
    scanModalCard.classList.add('translate-y-full');

    scanModalBackdrop.classList.remove('opacity-100');
    scanModalBackdrop.classList.add('opacity-0');

    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    if (!isDragging) {
        scanModalCard.style.transform = '';
        scanModalCard.style.transition = '';
    }

    setTimeout(async () => {
        scanModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        if (isDragging) {
            scanModalCard.style.transform = '';
            scanModalCard.style.transition = '';
        }

        if (html5QrCode) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (err) {
                console.log("Scanner war nicht aktiv oder konnte nicht gestoppt werden:", err);
            }
        }

        const loadingScreen = document.getElementById('camera-loading');
        const loadingBar = document.getElementById('loading-bar-fill');

        if (loadingScreen) loadingScreen.classList.remove('opacity-0', 'pointer-events-none');

        if (loadingBar) {
            loadingBar.style.transition = 'none';
            loadingBar.style.width = '0%';
        }

        const scannerReader = document.getElementById('scanner-reader');
        if (scannerReader) {
            scannerReader.classList.remove('opacity-100');
            scannerReader.classList.add('opacity-0');
        }

        // Reset flashlight button visual state
        const flashBtn = document.getElementById('scan-flashlight-btn');
        if (flashBtn) {
            flashBtn.style.opacity = '';
            flashBtn.style.pointerEvents = '';
        }

    }, 400);
}

async function toggleScanFlashlight() {
    if (!scanCurrentTrack) return;
    try {
        const capabilities = scanCurrentTrack.getCapabilities ? scanCurrentTrack.getCapabilities() : {};
        if (!capabilities.torch) return;

        scanFlashlightOn = !scanFlashlightOn;
        await scanCurrentTrack.applyConstraints({ advanced: [{ torch: scanFlashlightOn }] });

        const btn = document.getElementById('scan-flashlight-btn');
        const label = document.getElementById('scan-flashlight-label');
        if (btn) {
            if (scanFlashlightOn) {
                btn.classList.remove('bg-[#1C1C1E]', 'border-white/10');
                btn.classList.add('bg-white/20', 'border-white/40');
            } else {
                btn.classList.add('bg-[#1C1C1E]', 'border-white/10');
                btn.classList.remove('bg-white/20', 'border-white/40');
            }
        }
        if (label) label.textContent = scanFlashlightOn ? 'An' : 'Licht';
    } catch (e) {
        console.error('Torch not supported:', e);
    }
}

async function cycleScanCamera() {
    scanCameraIndex = (scanCameraIndex + 1) % SCAN_CAMERA_MODES.length;
    const mode = SCAN_CAMERA_MODES[scanCameraIndex];
    const label = document.getElementById('scan-camera-label');
    if (label) label.textContent = mode.label;

    // If zoom is supported by the current track, use applyConstraints
    if (scanCurrentTrack && typeof scanCurrentTrack.getCapabilities === 'function') {
        const capabilities = scanCurrentTrack.getCapabilities();
        if (capabilities.zoom && mode.zoom !== null) {
            try {
                const clampedZoom = Math.min(Math.max(mode.zoom, capabilities.zoom.min), capabilities.zoom.max);
                await scanCurrentTrack.applyConstraints({ advanced: [{ zoom: clampedZoom }] });
                return;
            } catch (e) {
                console.warn('Zoom constraint failed, ignoring:', e);
            }
        }
    }
    // Fallback: restart scanner with a zoom hint (no-op on unsupported devices)
    console.log(`Camera mode set to: ${mode.label} (hardware zoom not available on this device)`);
}

let scanStartY = 0;
let scanCurrentY = 0;
let isScanDragging = false;

if (scanModalCard) {
    scanModalCard.addEventListener('touchstart', (e) => {
        scanStartY = e.touches[0].clientY;
        isScanDragging = true;
        scanModalCard.style.transition = 'none';
    }, {
        passive: true
    });

    scanModalCard.addEventListener('touchmove', (e) => {
        if (!isScanDragging) return;
        scanCurrentY = e.touches[0].clientY;
        const deltaY = scanCurrentY - scanStartY;

        if (deltaY > 0) {
            scanModalCard.style.transform = `translateY(${deltaY}px)`;
        }
    }, {
        passive: true
    });

    scanModalCard.addEventListener('touchend', (e) => {
        if (!isScanDragging) return;
        isScanDragging = false;

        const deltaY = scanCurrentY - scanStartY;
        scanModalCard.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';

        if (deltaY > 100) {
            scanModalCard.style.transform = 'translateY(100%)';
            closeScanModal(true);
        } else {
            scanModalCard.style.transform = 'translateY(0px)';
            setTimeout(() => {
                scanModalCard.style.transform = '';
                scanModalCard.style.transition = '';
            }, 400);
        }
    });
}

function toggleSetting(element) {
    const isActive = element.classList.contains('bg-white');
    if (isActive) {
        element.classList.remove('bg-white');
        element.classList.add('bg-[#3A3A3C]');
        element.children[0].classList.remove('translate-x-5');
        element.children[0].classList.remove('bg-black');
        element.children[0].classList.add('bg-white');
    } else {
        element.classList.remove('bg-[#3A3A3C]');
        element.classList.add('bg-white');
        element.children[0].classList.add('translate-x-5');
        element.children[0].classList.remove('bg-white');
        element.children[0].classList.add('bg-black');
    }
}

function toggleGridColumns(element) {
    toggleSetting(element);
    const is2Cols = element.classList.contains('bg-white');
    const grid = document.getElementById('dex-grid');
    if (grid) {
        if (is2Cols) {
            grid.classList.remove('grid-cols-3');
            grid.classList.add('grid-cols-2');
            localStorage.setItem('dexColumns', '2');
        } else {
            grid.classList.remove('grid-cols-2');
            grid.classList.add('grid-cols-3');
            localStorage.setItem('dexColumns', '3');
        }
        if (globalSnusData.length > 0) filterDex();
    }
}

function toggleGridGlow(element) {
    toggleSetting(element);
    const isActive = element.classList.contains('bg-white');
    localStorage.setItem('dexGlow', isActive ? 'true' : 'false');
    if (globalSnusData.length > 0) filterDex();
}

function toggleDefaultSort(element) {
    toggleSetting(element);
    const isActive = element.classList.contains('bg-white'); // true = Nach Marke, false = Nach ID
    localStorage.setItem('dexDefaultSort', isActive ? 'alpha' : 'id');
}

function toggleTrackingMode(element) {
    toggleSetting(element);
    const isActive = element.classList.contains('bg-white');
    localStorage.setItem('snusTrackingMode', isActive ? 'individual' : 'full');
    const preview = document.getElementById('tracking-mode-preview');
    if (preview) preview.innerText = isActive ? 'Individual' : 'Full Tracking';
    renderActiveCansUI();
}

function openSettingsSubpage(type) {
    const subpage = document.getElementById('settings-subpage');
    const titleObj = document.getElementById('subpage-title');
    const contentObj = document.getElementById('subpage-content');

    titleObj.innerText = type;
    let html = '';

    if (type === 'Edit Profile') {
        const cache = window._profileCache;

        // Use cached username as placeholder, cached email as value – both instant
        const cachedRemaining = cache?.remaining ?? window._cachedUsernameChangesRemaining ?? null;
        const cachedEmail = cache?.email || '';
        // Always read the username directly from the profile card in the DOM – it's always correct
        const liveUsername = document.getElementById('profile-email')?.innerText?.trim() || '';
        const cachedUsername = liveUsername || cache?.username || '';

        // Default avatar: Merz photo
        const defaultAvatarSvg = `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <rect width="96" height="96" fill="#3A3A3C"/>
            <circle cx="48" cy="38" r="16" fill="#636366"/>
            <path d="M16 80c0-17.673 14.327-32 32-32s32 14.327 32 32" fill="#636366"/>
        </svg>`;

        // Changes badge: shows "X/3" format – grey=3, orange=1, red=0
        const changesLabel = cachedRemaining === null
            ? ''
            : cachedRemaining === 0
                ? `<span class="text-[11px] text-[#FF3B30] font-semibold">0/3</span>`
                : cachedRemaining === 1
                    ? `<span class="text-[11px] text-[#FF9500] font-medium">1/3</span>`
                    : `<span class="text-[11px] text-[#8E8E93] font-medium">${cachedRemaining}/3</span>`;

        html = `
            <div class="flex flex-col items-center mb-6 mt-2">
                <div class="relative">
                    <input type="file" id="profile-image-upload" accept="image/*" class="hidden" onchange="previewProfileImage(event)">
                    <div class="w-24 h-24 rounded-full flex-shrink-0 shadow-lg border-2 border-white/5 overflow-hidden bg-[#3A3A3C]">
                        <img id="edit-profile-image-preview" src="merz.jpg" alt="Profile photo" class="w-full h-full object-cover">
                        <div id="edit-profile-avatar-placeholder" class="w-full h-full hidden">${defaultAvatarSvg}</div>
                    </div>
                    <button onclick="triggerHapticFeedback(); document.getElementById('profile-image-upload').click()" class="absolute bottom-0 right-0 w-8 h-8 bg-[#1C1C1E] border border-white/20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10">
                        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
            </div>

            <div class="bg-[#1C1C1E] rounded-[24px] border border-white/10 shadow-sm w-full overflow-hidden mb-4">
                <!-- Username -->
                <div class="px-5 pt-4 pb-3">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium">Username</label>
                        <span id="username-changes-left">${changesLabel}</span>
                    </div>
                    <input type="text" id="edit-username" value=""
                        class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all placeholder:text-[#8E8E93]/60"
                        placeholder="${cachedUsername || 'Username'}"
                        oninput="this.value=this.value.replace(/[^a-zA-Z0-9_]/g,'')">
                    <p id="edit-username-error" class="hidden text-[#FF3B30] text-[13px] mt-2"></p>
                    <p class="text-[11px] text-[#8E8E93] mt-2">3 changes per month</p>
                </div>

                <!-- Email -->
                <div class="px-5 py-4">
                    <label class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium block mb-2">Email</label>
                    <input type="email" id="edit-email" value="${cachedEmail}" disabled class="w-full bg-black/50 text-[#8E8E93] border border-white/5 rounded-[14px] px-4 py-3.5 text-[17px] outline-none cursor-not-allowed">
                </div>

                <!-- Save Changes inside the card -->
                <div class="px-5 pb-4">
                    <button id="save-profile-btn" onclick="triggerHapticFeedback(); handleProfileSave(this)" class="w-full bg-white text-black font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-all duration-300 shadow-[0_4px_14px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2">
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        `;

        // Always fetch fresh from server to ensure username + changes badge are up-to-date
        setTimeout(async () => {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return;

                const emailInput = document.getElementById('edit-email');
                if (emailInput) emailInput.value = user.email;

                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('username, username_changes, username_last_reset')
                    .eq('id', user.id).single();

                // Use user_metadata.username – same source as setupProfile – always correct
                const correctUsername = user.user_metadata?.username || profile?.username || '';

                const usernameInput = document.getElementById('edit-username');
                if (usernameInput && correctUsername) usernameInput.placeholder = correctUsername;

                const now = new Date();
                const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
                const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
                const changesThisMonth = sameMonth ? (profile?.username_changes || 0) : 0;
                const remaining = Math.max(0, 3 - changesThisMonth);

                window._cachedUsernameChangesRemaining = remaining;
                window._profileCache = { email: user.email, username: correctUsername, remaining };

                const changesLeftEl = document.getElementById('username-changes-left');
                if (changesLeftEl) {
                    changesLeftEl.innerHTML = remaining === 0
                        ? `<span class="text-[11px] text-[#FF3B30] font-semibold">0/3</span>`
                        : remaining === 1
                            ? `<span class="text-[11px] text-[#FF9500] font-medium">1/3</span>`
                            : `<span class="text-[11px] text-[#8E8E93] font-medium">${remaining}/3</span>`;
                }
            } catch (e) { /* ignore */ }
        }, 100);
    } else if (type === 'Stats') {
        const brandStats = getBrandStats();

        let gridHTML = '<div class="grid grid-cols-2 gap-4 pb-6">';

        brandStats.forEach(stat => {
            const percentage = stat.total > 0 ? (stat.unlocked / stat.total) : 0;
            const radius = 32;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (percentage * circumference);

            let favoriteBrands = [];
            try { favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]'); } catch (e) { }
            const isFav = favoriteBrands.includes(stat.name);
            const safeBrandName = stat.name.replace(/'/g, "\\'");

            const starIcon = isFav
                ? `<svg class="w-4 h-4 text-yellow-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
                : `<svg class="w-4 h-4 text-[#8E8E93]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`;

            const strokeColor = `var(--${stat.dominantRarity}, var(--common))`;

            gridHTML += `
                <div class="bg-[#1C1C1E] rounded-[24px] p-4 border border-white/10 flex flex-col items-center text-center shadow-sm relative">
                    <!-- Name & Star Header -->
                    <div class="flex items-center justify-between w-full mb-4 px-1 gap-2">
                        <h3 class="text-[15px] font-bold text-white tracking-tight leading-tight line-clamp-1 text-left flex-1">
                            ${stat.name}
                        </h3>
                        <button onclick="handleStatsFavoriteClick('${safeBrandName}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-[#8E8E93] transition-all duration-200 active:scale-90 shadow-sm flex-shrink-0">
                            ${starIcon}
                        </button>
                    </div>

                    <!-- Circular Chart -->
                    <div class="relative w-[80px] h-[80px] mb-3 flex items-center justify-center">
                        <svg class="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="${radius}" stroke="${strokeColor}" opacity="0.15" stroke-width="6" fill="none" />
                            <circle cx="40" cy="40" r="${radius}" stroke="${strokeColor}" stroke-width="6" fill="none" 
                                stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${offset}" 
                                stroke-linecap="round" 
                                class="transition-all duration-1000 ease-out" />
                        </svg>
                        <div class="flex flex-col items-center justify-center absolute">
                            <span class="text-[14px] font-bold text-white">
                                ${Math.round(percentage * 100)}%
                            </span>
                        </div>
                    </div>
                    
                    <!-- Footer Info -->
                    <div class="w-full bg-white/5 rounded-xl py-1.5 px-3 flex justify-between items-center mt-auto">
                        <span class="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">Collected</span>
                        <span class="text-[13px] font-semibold text-white">
                            ${stat.unlocked} <span class="text-[#8E8E93] font-normal">/ ${stat.total}</span>
                        </span>
                    </div>
                </div>
            `;
        });

        gridHTML += '</div>';

        html = `
            <p class="text-[#8E8E93] text-[15px] mb-6 leading-relaxed">
                Verfolge deinen Sammler-Fortschritt sortiert nach Snus-Marken.
            </p>
            ${gridHTML}
        `;
    } else if (type === 'Notifications') {
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Push Notifications</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">New Snus Drops (Dex)</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Email Summaries</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Privacy & Security') {
        html = `
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">Profile Visibility</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 mb-8">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Private Profile</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">Data</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Share Analytics</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Tracking') {
        const trackingMode = localStorage.getItem('snusTrackingMode') || 'full';
        const isIndividual = trackingMode === 'individual';
        const trackToggleBg = isIndividual ? 'bg-white' : 'bg-[#3A3A3C]';
        const trackHandleTransform = isIndividual ? 'translate-x-5' : '';
        const trackHandleBg = isIndividual ? 'bg-black' : 'bg-white';

        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">Individual Pouch Tracking</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">Tracke jeden einzelnen Pouch anstatt nur die ganze Dose am Ende.</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleTrackingMode(this)" class="w-12 h-7 ${trackToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${trackHandleBg} rounded-full transition-transform duration-300 ${trackHandleTransform} shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Language') {
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div onclick="triggerHapticFeedback()" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">English</span>
                    <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div onclick="triggerHapticFeedback()" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">Deutsch</span>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div onclick="triggerHapticFeedback()" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">Svenska</span>
                </div>
            </div>
        `;
    } else if (type === 'Darstellung') {
        const cols = localStorage.getItem('dexColumns') || '3';
        const is2Cols = cols === '2';

        const toggleBg = is2Cols ? 'bg-white' : 'bg-[#3A3A3C]';
        const handleTransform = is2Cols ? 'translate-x-5' : '';
        const handleBg = is2Cols ? 'bg-black' : 'bg-white';

        const glow = localStorage.getItem('dexGlow') === 'true';
        const glowToggleBg = glow ? 'bg-white' : 'bg-[#3A3A3C]';
        const glowHandleTransform = glow ? 'translate-x-5' : '';
        const glowHandleBg = glow ? 'bg-black' : 'bg-white';

        // NEU: Status für Standard-Sortierung auslesen
        const defaultSort = localStorage.getItem('dexDefaultSort') || 'id';
        const isAlphaDefault = defaultSort === 'alpha';
        const sortToggleBg = isAlphaDefault ? 'bg-white' : 'bg-[#3A3A3C]';
        const sortHandleTransform = isAlphaDefault ? 'translate-x-5' : '';
        const sortHandleBg = isAlphaDefault ? 'bg-black' : 'bg-white';

        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex flex-col p-5">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex flex-col pr-4">
                            <span class="text-white text-[17px]">Standard-Sortierung: Marke</span>
                            <span class="text-[#8E8E93] text-[13px] mt-0.5">Startet den Dex nach Marke statt ID sortiert.</span>
                        </div>
                        <div onclick="triggerHapticFeedback(); toggleDefaultSort(this)" class="w-12 h-7 ${sortToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${sortHandleBg} rounded-full transition-transform duration-300 ${sortHandleTransform} shadow-sm"></div></div>
                    </div>
                    <p class="text-[12px] text-[#FF3B30] font-semibold leading-tight">⚠️ Vorsicht beim Aktivieren: Dieses Feature verursacht Lags und könnte zu Abstürzen führen. Bitte nur auf eigenes Risiko verwenden.</p>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>

                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">Große Kacheln</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">Zeigt 2 statt 3 Spalten im Dex an</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleGridColumns(this)" class="w-12 h-7 ${toggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${handleBg} rounded-full transition-transform duration-300 ${handleTransform} shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">Kachel Glow</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">Farbiger Hintergrund-Glow der Seltenheit</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleGridGlow(this)" class="w-12 h-7 ${glowToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${glowHandleBg} rounded-full transition-transform duration-300 ${glowHandleTransform} shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Help Center & FAQ') {
        html = `
            <div class="space-y-4">
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">How does the Dex work?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">Every time you scan a new can, it gets added to your permanent Snusdex collection. You earn XP for rarities.</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">Can I manually add a Snus?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">Currently, scanning the barcode is required to verify the product and maintain the integrity of the Dex.</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">How do I level up?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">Your Collector Level increases as you gain XP. Rarer Snus (like Epic or Mythic) yield significantly more XP than Common ones.</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">How is my usage calculated?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">When you mark a can as 'Active' and later 'Empty', we calculate your daily average pouches and nicotine intake based on the time it took to finish it.</p>
                </div>
                
                <div class="mt-10 flex justify-center pb-8">
                    <button onclick="triggerHapticFeedback()" class="text-[#8E8E93] hover:text-white text-[14px] font-medium underline decoration-white/30 underline-offset-4 active:opacity-50 transition-all">
                        Contact Support
                    </button>
                </div>
            </div>
        `;
    } else if (type === 'Delete Account') {
        html = `
            <div class="text-center mt-6 mb-8">
                <div class="w-16 h-16 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <h2 class="text-white text-[22px] font-bold tracking-tight mb-2">Delete Account?</h2>
                <p class="text-[#8E8E93] text-[15px] px-4 leading-relaxed">This action is permanent and cannot be undone. All your Dex collections and stats will be lost forever.</p>
            </div>
            <button onclick="triggerHapticFeedback()" class="w-full bg-[#FF3B30] text-white font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-transform mb-3 shadow-[0_4px_14px_rgba(255,59,48,0.2)]">
                Yes, delete my account
            </button>
            <button onclick="triggerHapticFeedback(); closeSettingsSubpage()" class="w-full bg-[#1C1C1E] border border-white/10 text-white font-medium text-[17px] py-4 rounded-[14px] active:bg-white/5 transition-colors">
                Cancel
            </button>
        `;
    }

    contentObj.innerHTML = html;

    subpage.classList.remove('hidden');

    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
        subpage.classList.remove('translate-x-full');
        subpage.classList.add('translate-x-0');
    }, 10);
}

function closeSettingsSubpage() {
    const subpage = document.getElementById('settings-subpage');
    if (!subpage) return;

    subpage.style.transform = '';
    subpage.style.transition = '';

    subpage.classList.remove('translate-x-0');
    subpage.classList.add('translate-x-full');

    setTimeout(() => {
        subpage.classList.add('hidden');

        document.body.classList.remove('overflow-hidden');
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    const settingsSubpage = document.getElementById('settings-subpage');
    if (!settingsSubpage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    settingsSubpage.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, {
        passive: true
    });

    settingsSubpage.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY) return;

        let touchCurrentX = e.touches[0].clientX;
        let touchCurrentY = e.touches[0].clientY;

        let diffX = touchCurrentX - touchStartX;
        let diffY = Math.abs(touchCurrentY - touchStartY);

        if (diffY > Math.abs(diffX)) {
            return;
        }

        if (diffX > 0) {
            isSwiping = true;
            settingsSubpage.style.transition = 'none';
            settingsSubpage.style.transform = `translateX(${diffX}px)`;
        }
    }, {
        passive: true
    });

    settingsSubpage.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        let touchEndX = e.changedTouches[0].clientX;
        let diffX = touchEndX - touchStartX;

        settingsSubpage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

        if (diffX > window.innerWidth / 3 || diffX > 100) {
            closeSettingsSubpage();
        } else {
            settingsSubpage.style.transform = 'translateX(0)';
        }

        setTimeout(() => {
            settingsSubpage.style.transform = '';
            settingsSubpage.style.transition = '';
        }, 300);

        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;
    });
});

// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const splashVideo = document.getElementById('splash-video');
    const splashSound = document.getElementById('splash-sound');

    function removeSplashScreen() {
        if (!splashScreen.classList.contains('opacity-0')) {
            splashScreen.classList.remove('opacity-100');
            splashScreen.classList.add('opacity-0');

            if (splashSound) {
                const fadeAudio = setInterval(() => {
                    if (splashSound.volume > 0.1) {
                        splashSound.volume -= 0.1;
                    } else {
                        splashSound.pause();
                        splashSound.currentTime = 0;
                        clearInterval(fadeAudio);
                    }
                }, 50);
            }

            setTimeout(() => {
                splashScreen.classList.add('hidden');
            }, 500);
        }
    }

    /**
     * Prüft ob gerade externe Musik läuft.
     * Methode: AudioContext kurz öffnen und einen winzigen PCM-Buffer analysieren.
     * Auf iOS/WebKit gibt die AudioContext-State Auskunft über Audio-Aktivität.
     * Falls Musik läuft → Jingle überspringen.
     */
    async function isMusicPlaying() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Wenn iOS die Session bereits aktiv hat (Musik spielt),
            // ist der ctx.state direkt 'running' und wir können einen kurzen
            // AnalyserNode nutzen, um nach echten Samples zu suchen.
            await ctx.resume();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const data = new Uint8Array(analyser.frequencyBinCount);
            // Kurz warten damit der Analyser befüllt wird
            await new Promise(resolve => setTimeout(resolve, 100));
            analyser.getByteFrequencyData(data);
            const sum = data.reduce((a, b) => a + b, 0);
            await ctx.close();
            return sum > 0;
        } catch (e) {
            // Kein AudioContext verfügbar → sicherheitshalber abspielen
            return false;
        }
    }

    if (splashScreen && splashVideo) {
        splashVideo.play().then(async () => {
            if (splashSound) {
                const musicActive = await isMusicPlaying();
                if (!musicActive) {
                    splashSound.play().catch(e => console.log("Audio-Autoplay blockiert"));
                } else {
                    console.log("Musik läuft – Jingle übersprungen.");
                }
            }
        }).catch(e => console.log("Video-Autoplay blockiert:", e));

        splashVideo.addEventListener('ended', removeSplashScreen);
        setTimeout(removeSplashScreen, 2500);
    }
});

//

// ==========================================
// 8. HELPER & INITIALISIERUNG
// ==========================================

async function loadUserStats(userId) {
    const {
        count
    } = await supabaseClient.from('user_collections').select('*', {
        count: 'exact',
        head: true
    }).eq('user_id', userId);

    const xp = (count || 0) * 100;
    const level = Math.floor(xp / 300) + 1;

    const scoreEl = document.getElementById('score');
    const homeLevelEl = document.getElementById('home-level');

    if (scoreEl) {
        scoreEl.innerHTML = `${xp} <span class="text-[20px] text-white/50 font-medium">XP</span>`;
    }
    if (homeLevelEl) {
        homeLevelEl.innerText = `LVL ${level}`;
    }

    const profileXpEl = document.getElementById('profile-xp');
    const profileLevelEl = document.getElementById('profile-level');

    if (profileXpEl) profileXpEl.innerText = `${xp} XP`;
    if (profileLevelEl) profileLevelEl.innerText = `Lvl ${level}`;
}

function filterDex() {
    const searchEl = document.getElementById('dex-search');
    if (!searchEl) return;

    const term = searchEl.value.toLowerCase().trim();
    const searchWords = term ? term.split(/\s+/) : [];

    let filtered = globalSnusData.filter(s => {
        // Filter für freigeschaltete
        if (dexFilterUnlocked && !globalUserCollection[s.id]) {
            return false;
        }

        // Text Filter (Suchleiste)
        if (searchWords.length > 0) {
            const searchableText = [
                s.name,
                s.brand,
                Array.isArray(s.flavor) ? s.flavor.join(' ') : s.flavor
            ].filter(Boolean).join(' ').toLowerCase();

            if (!searchWords.every(word => searchableText.includes(word))) {
                return false;
            }
        }

        return true;
    });

    const grid = document.getElementById('dex-grid');
    if (!grid) return;

    // Reset der Layout-Klassen für saubere Wechsel
    grid.className = ''; // Löscht alle bestehenden Klassen des Containers

    if (dexSortMode === 'alpha') {
        // --- NEU: Sort by Name (Grouped Layout) ---
        grid.classList.add('flex', 'flex-col', 'w-full');

        // Observer für Chunking abschalten, da wir hier horizontales Scrollen nutzen
        if (dexObserver) dexObserver.disconnect();

        const groupedData = groupAndSortByBrand(filtered);
        renderDexGrouped(groupedData);

    } else {
        // --- BESTEHEND: Sort by ID (Grid Layout) ---
        const cols = localStorage.getItem('dexColumns') || '3';
        grid.classList.add('grid', cols === '2' ? 'grid-cols-2' : 'grid-cols-3', 'gap-3');

        filtered.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        renderDexGrid(filtered); // Lädt Chunks & triggert Observer neu
    }
}

function setupProfile(user) {
    const emailEl = document.getElementById('profile-email');
    const idEl = document.getElementById('profile-id');
    const adminEl = document.getElementById('admin-panel');
    if (emailEl) emailEl.innerText = user.user_metadata?.username || user.email;
    if (idEl) {
        const shortId = user.id.split('-')[0].toUpperCase();
        idEl.innerText = `ID #${shortId}`;
    }

    if (user.email === 'tarayannorman@gmail.com' && adminEl) {
        adminEl.classList.remove('hidden');
    }
    loadUserStats(user.id);
}

function previewProfileImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('edit-profile-image-preview');
            const placeholder = document.getElementById('edit-profile-avatar-placeholder');
            if (img) { img.src = e.target.result; img.classList.remove('hidden'); }
            if (placeholder) placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function handleProfileSave(btn) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    const newUsername = (document.getElementById('edit-username')?.value || '').trim();
    const errorEl = document.getElementById('edit-username-error');

    // Validierung: nur Buchstaben, Zahlen, Unterstriche
    const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/;
    if (!usernameRegex.test(newUsername)) {
        if (errorEl) { errorEl.innerText = 'Nur Buchstaben, Zahlen und _ erlaubt (2–30 Zeichen).'; errorEl.classList.remove('hidden'); }
        return;
    }
    if (errorEl) errorEl.classList.add('hidden');

    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Nicht eingeloggt.');

        // Aktuelles Profil laden (Rate-Limit Check)
        const { data: profile } = await supabaseClient
            .from('profiles').select('username, username_changes, username_last_reset').eq('id', user.id).single();

        const now = new Date();
        const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
        const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
        const changesThisMonth = sameMonth ? (profile.username_changes || 0) : 0;

        if (changesThisMonth >= 3) {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const daysLeft = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));
            if (errorEl) { errorEl.innerText = `Limit erreicht (3/3). Noch ${daysLeft} Tag(e) bis zur Freischaltung.`; errorEl.classList.remove('hidden'); }
            btn.disabled = false;
            btn.innerHTML = `<span>Save Changes</span>`;
            return;
        }

        if (newUsername === currentUsername) {
            btn.disabled = false; btn.innerHTML = `<span>Save Changes</span>`; return;
        }

        // Supabase auth metadata updaten
        const { error: authError } = await supabaseClient.auth.updateUser({ data: { username: newUsername } });
        if (authError) throw authError;

        // profiles Tabelle updaten inkl. Rate-Limit Counter
        const { error: dbError } = await supabaseClient.from('profiles').update({
            username: newUsername,
            username_changes: changesThisMonth + 1,
            username_last_reset: sameMonth ? profile.username_last_reset : now.toISOString()
        }).eq('id', user.id);
        if (dbError) throw dbError;

        // Update global cache + all UI spots
        currentUsername = newUsername;
        const emailEl = document.getElementById('profile-email');
        const initialsEl = document.getElementById('user-initials');
        if (emailEl) emailEl.innerText = currentUsername;
        if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();
        updateGreeting();

        // Update the remaining-changes badge and cache
        const newRemaining = Math.max(0, 3 - (changesThisMonth + 1));
        window._cachedUsernameChangesRemaining = newRemaining;
        // Also update profileCache so next open of Edit Profile shows correct values
        window._profileCache = { ...(window._profileCache || {}), username: newUsername, remaining: newRemaining };
        const changesLeftEl = document.getElementById('username-changes-left');
        if (changesLeftEl) {
            changesLeftEl.innerHTML = newRemaining === 0
                ? `<span class="text-[11px] text-[#FF3B30] font-semibold">0/3</span>`
                : newRemaining === 1
                    ? `<span class="text-[11px] text-[#FF9500] font-medium">1/3</span>`
                    : `<span class="text-[11px] text-[#8E8E93] font-medium">${newRemaining}/3</span>`;
        }

        btn.classList.remove('bg-white', 'text-black');
        btn.classList.add('bg-[#34C759]', 'text-white');
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg> Gespeichert`;
        if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('bg-[#34C759]', 'text-white');
            btn.classList.add('bg-white', 'text-black');
            btn.innerHTML = `<span>Save Changes</span>`;
        }, 2500);

    } catch (err) {
        if (errorEl) { errorEl.innerText = err.message; errorEl.classList.remove('hidden'); }
        btn.disabled = false;
        btn.innerHTML = `<span>Save Changes</span>`;
    }
}

let displayedXp = null;
let actualXp = null;

async function loadUserStats(userId) {
    const {
        count
    } = await supabaseClient.from('user_collections').select('*', {
        count: 'exact',
        head: true
    }).eq('user_id', userId);

    const xp = (count || 0) * 100;
    const level = Math.floor(xp / 300) + 1;

    actualXp = xp;

    const profileXpEl = document.getElementById('profile-xp');
    const profileLevelEl = document.getElementById('profile-level');
    if (profileXpEl) profileXpEl.innerText = `${xp} XP`;
    if (profileLevelEl) profileLevelEl.innerText = `Lvl ${level}`;

    if (displayedXp === null) {
        displayedXp = xp;
        const scoreEl = document.getElementById('score');
        const homeLevelEl = document.getElementById('home-level');
        if (scoreEl) scoreEl.innerHTML = `${xp} <span class="font-medium text-[20px] text-white/50">XP</span>`;
        if (homeLevelEl) homeLevelEl.innerText = `LVL ${level}`;
    } else if (displayedXp !== actualXp) {
        const homeTab = document.getElementById('tab-home');
        if (!homeTab.classList.contains('hidden')) {
            animateXp(displayedXp, actualXp, level);
        }
    }
}

function animateXp(startValue, endValue, newLevel) {
    const scoreEl = document.getElementById('score');
    const homeLevelEl = document.getElementById('home-level');
    if (!scoreEl) return;

    const duration = 1500;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const currentVal = Math.floor(startValue + (endValue - startValue) * easeProgress);

        scoreEl.innerHTML = `${currentVal} <span class="font-medium text-[20px] text-white/50">XP</span>`;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            displayedXp = endValue;
            if (homeLevelEl) homeLevelEl.innerText = `LVL ${newLevel}`;

            if (typeof triggerHapticFeedback === 'function') {
                triggerHapticFeedback();
            }
        }
    }

    requestAnimationFrame(updateCounter);
}

let currentDashboardStats = {
    count: 0,
    flow: 0,
    avgPouches: 0,
    avgMg: 0
};

function animateNumber(elementId, startValue, endValue, duration = 1500, suffix = "", isFloat = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentVal = startValue + (endValue - startValue) * easeProgress;

        let displayStr = "";
        if (isFloat) {
            displayStr = currentVal.toFixed(1).replace('.', ',');
        } else {
            displayStr = Math.floor(currentVal).toLocaleString('de-DE');
        }

        el.innerText = `${displayStr}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            let finalStr = isFloat ? endValue.toFixed(1).replace('.', ',') : Math.floor(endValue).toLocaleString('de-DE');
            el.innerText = `${finalStr}${suffix}`;
        }
    }
    requestAnimationFrame(update);
}

// ==========================================
// 11. DEBUGGING & DEV COMMANDS
// ==========================================
window.unlock = function (id) {
    const foundSnus = globalSnusData.find(s => s.id === id);
    if (foundSnus) {
        console.log(`[Dev] Unlocking Snus #${id}: ${foundSnus.name} for rating...`);
        openSnusDetail(foundSnus.id, true);
    } else {
        console.error(`[Dev] Snus mit ID ${id} nicht gefunden!`);
    }
    return "Dev command executed.";
};


// ==========================================
// 12. RECENT SCANS & ALL SCANS MODAL LOGIK
// ==========================================

function createScanListItemHTML(snus, fromModal = false, customDateStr = null) {
    let dateStr = "";
    if (customDateStr) {
        dateStr = customDateStr;
    } else {
        const dateObj = new Date(globalUserCollection[snus.id].date);
        dateStr = dateObj.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }

    const clickAction = fromModal ?
        `closeAllScansModal(); setTimeout(() => openSnusDetail(${snus.id}), 300);` :
        `openSnusDetail(${snus.id})`;

    return `
        <div class="flex items-center justify-between p-3 border-b border-white/5 last:border-0 cursor-pointer active:bg-white/5 transition-colors" onclick="triggerHapticFeedback(); ${clickAction}">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-11 h-11 flex items-center justify-center flex-shrink-0">
                    <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain" onerror="this.style.display='none'">
                </div>
                <div class="min-w-0 flex-1">
                    <h4 class="text-[17px] font-semibold text-white tracking-tight truncate">${snus.name}</h4>
                    <p class="text-[13px] text-[#8E8E93] font-medium mt-0.5">${dateStr}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 pl-4 flex-shrink-0 text-right">
                <span class="text-[17px] font-semibold text-white tracking-tight">${snus.nicotine}mg</span>
                <svg class="w-4 h-4 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
            </div>
        </div>
    `;
}

function updateLivePerformance() {
    const collectedItems = globalSnusData.filter(snus => !!globalUserCollection[snus.id]);
    collectedItems.sort((a, b) => new Date(globalUserCollection[b.id].date) - new Date(globalUserCollection[a.id].date));

    const targetCount = collectedItems.length;
    if (currentDashboardStats.count !== targetCount) {
        animateNumber('stat-count', currentDashboardStats.count, targetCount, 1500, "", false);
        currentDashboardStats.count = targetCount;
    }

    const listEl = document.getElementById('latest-unlocks-list');
    const showMoreBtn = document.getElementById('show-more-scans-btn');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (globalInactiveLogs.length === 0) {
        listEl.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[15px]">Noch keine Dosen geschlossen.</div>';
        if (showMoreBtn) showMoreBtn.classList.add('hidden');
        return;
    }

    if (showMoreBtn) {
        if (globalInactiveLogs.length > 4) {
            showMoreBtn.classList.remove('hidden');
        } else {
            showMoreBtn.classList.add('hidden');
        }
    }

    globalInactiveLogs.slice(0, 4).forEach(log => {
        const snus = globalSnusData.find(s => s.id === log.snus_id);
        if (snus) {
            const dateObj = new Date(log.finished_at || log.opened_at);
            const customDateStr = dateObj.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
            listEl.innerHTML += createScanListItemHTML(snus, false, customDateStr);
        }
    });
}

function openAllScansModal() {
    const modal = document.getElementById('all-scans-modal');
    const backdrop = document.getElementById('all-scans-backdrop');
    const card = document.getElementById('all-scans-card');
    const listContainer = document.getElementById('all-scans-list-container');

    listContainer.innerHTML = '';
    globalInactiveLogs.forEach(log => {
        const snus = globalSnusData.find(s => s.id === log.snus_id);
        if (snus) {
            const dateObj = new Date(log.finished_at || log.opened_at);
            const customDateStr = dateObj.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
            listContainer.innerHTML += createScanListItemHTML(snus, true, customDateStr);
        }
    });

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');

        card.classList.remove('translate-y-full');
        card.classList.add('translate-y-0');
    }, 10);
}

function closeAllScansModal(isDragging = false) {
    const modal = document.getElementById('all-scans-modal');
    const backdrop = document.getElementById('all-scans-backdrop');
    const card = document.getElementById('all-scans-card');

    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');

    if (!isDragging) {
        card.classList.remove('translate-y-0');
        card.classList.add('translate-y-full');
    }

    setTimeout(() => {
        modal.classList.add('hidden');

        if (isDragging) {
            card.style.transform = '';
            card.style.transition = '';
            card.classList.remove('translate-y-0');
            card.classList.add('translate-y-full');
        }

        if (document.getElementById('snus-modal').classList.contains('hidden')) {
            document.body.classList.remove('overflow-hidden');
        }
    }, 400);
}

let allScansStartY = 0;
let allScansCurrentY = 0;
let isAllScansDragging = false;
let allScansRafId = null;

document.addEventListener('DOMContentLoaded', () => {
    const allScansCard = document.getElementById('all-scans-card');
    const allScansScrollArea = document.getElementById('all-scans-scroll-area');

    if (allScansCard && allScansScrollArea) {
        allScansCard.addEventListener('touchstart', (e) => {
            if (allScansScrollArea.scrollTop > 0) {
                isAllScansDragging = false;
                return;
            }
            allScansStartY = e.touches[0].clientY;
            isAllScansDragging = true;

            allScansCard.style.transition = 'transform 0s';
            allScansCard.style.willChange = 'transform';
        }, { passive: true });

        allScansCard.addEventListener('touchmove', (e) => {
            if (!isAllScansDragging) return;

            const currentY = e.touches[0].clientY;
            const deltaY = currentY - allScansStartY;

            if (deltaY > 0 && allScansScrollArea.scrollTop <= 0) {
                if (e.cancelable) e.preventDefault();

                // Fix: Untergeordneten Container vom Scrollen abhalten
                allScansScrollArea.style.overflowY = 'hidden';

                if (allScansRafId) cancelAnimationFrame(allScansRafId);
                allScansRafId = requestAnimationFrame(() => {
                    allScansCard.style.transform = `translate3d(0, ${deltaY}px, 0)`;
                });
            } else {
                isAllScansDragging = false;
                allScansScrollArea.style.overflowY = 'auto';
                allScansCard.style.transform = '';
            }
        }, { passive: false });

        allScansCard.addEventListener('touchend', (e) => {
            if (!isAllScansDragging) return;
            isAllScansDragging = false;

            if (allScansRafId) cancelAnimationFrame(allScansRafId);

            const deltaY = e.changedTouches[0].clientY - allScansStartY;
            allScansCard.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
            allScansCard.style.willChange = 'auto';

            if (deltaY > 100) {
                allScansCard.style.transform = 'translate3d(0, 100%, 0)';
                closeAllScansModal(true); // Haptik!

                setTimeout(() => {
                    allScansScrollArea.style.overflowY = 'auto';
                }, 400);
            } else {
                allScansCard.style.transform = 'translate3d(0, 0px, 0)';
                setTimeout(() => {
                    allScansCard.style.transform = '';
                    allScansCard.style.transition = '';
                    allScansScrollArea.style.overflowY = 'auto';
                }, 400);
            }
        });
    }
});

// ==========================================
// SUGGESTIONS / NEU ENTDECKEN LOGIK
// ==========================================

function renderSuggestions() {
    const container = document.getElementById('suggestions-container');
    if (!container || globalSnusData.length === 0) return;

    const uncollected = globalSnusData.filter(snus => !globalUserCollection[snus.id]);

    if (uncollected.length === 0) {
        container.innerHTML = '<p class="text-[13px] text-[#8E8E93] text-center w-full">Du hast bereits alle Snus im Dex gesammelt!</p>';
        return;
    }

    const shuffled = uncollected.sort(() => 0.5 - Math.random());
    const suggestions = shuffled.slice(0, 9); // 9 Dosen

    container.innerHTML = '';
    const glowActive = localStorage.getItem('dexGlow') === 'true';

    suggestions.forEach(snus => {
        const formattedId = '#' + String(snus.id).padStart(3, '0');
        const rarity = (snus.rarity || 'common').toLowerCase().trim();
        const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
        const rarityIndicator = `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;

        container.innerHTML += `
            <div onclick="openSnusDetail(${snus.id})" class="suggestion-card cursor-pointer group flex-shrink-0 w-[28vw] snap-center transition-transform duration-200 ease-out origin-center" style="touch-action: pan-x;">
                <div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] shadow-md overflow-hidden" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}">
                    
                    <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                        <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                        ${rarityIndicator}
                    </div>

                    <div class="w-full aspect-square flex items-center justify-center relative mt-1">
                        <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10" loading="lazy" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                    </div>
                    
                    <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                        <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 text-white">${snus.name}</h5>
                    </div>
                    
                </div>
            </div>
        `;
    });

    setTimeout(initSuggestionsScrollAnimation, 50);
}

function initSuggestionsScrollAnimation() {
    const container = document.getElementById('suggestions-container');
    if (!container) return;

    const cards = container.querySelectorAll('.suggestion-card');

    const updateScale = () => {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        const focusZoneHalfWidth = containerRect.width * 0.35;

        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;

            const distanceToCenter = Math.abs(containerCenter - cardCenter);

            let scale = 1.0;
            let opacity = 1.0;

            if (distanceToCenter > focusZoneHalfWidth) {
                const distancePastZone = distanceToCenter - focusZoneHalfWidth;

                let progress = distancePastZone / (containerRect.width * 0.15);
                if (progress > 1) progress = 1;

                scale = 1.0 - (0.15 * progress);
                opacity = 1.0 - (0.6 * progress);
            }

            card.style.transform = `scale(${scale})`;
            card.style.opacity = opacity;
        });
    };

    updateScale();

    container.addEventListener('scroll', () => {
        requestAnimationFrame(updateScale);
    }, {
        passive: true
    });
}

// ==========================================
// GITHUB COMMIT FETCH (App-Version + Time)
// ==========================================
async function loadLatestGitHubCommit() {
    const repoOwner = 'HazeCCS';
    const repoName = 'Snusdex';

    try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1`);

        if (!response.ok) throw new Error('Repo ist privat oder API Rate Limit erreicht');

        const data = await response.json();

        if (data && data.length > 0) {
            const fullMessage = data[0].commit.message;
            let shortMsg = fullMessage.split('\n')[0];
            if (shortMsg.length > 50) { // Du kannst das Limit hier auch erhöhen, da es jetzt umbricht!
                shortMsg = shortMsg.substring(0, 50) + '...';
            }

            const commitDate = new Date(data[0].commit.committer.date);
            const now = new Date();
            const diffMs = now - commitDate;

            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            let timeString = "";
            if (diffDays > 0) {
                timeString = `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
            } else if (diffHours > 0) {
                timeString = `vor ${diffHours} Std`;
            } else if (diffMins > 0) {
                timeString = `vor ${diffMins} Min`;
            } else {
                timeString = `Gerade eben`;
            }

            // --- HIER IST DIE WICHTIGE ÄNDERUNG ---
            const msgElement = document.getElementById('latest-commit-msg');
            const timeElement = document.getElementById('latest-commit-time');

            if (msgElement) {
                msgElement.innerText = shortMsg; // Setzt nur den reinen Text
            }
            if (timeElement) {
                timeElement.innerText = timeString; // Setzt die Zeit in das graue Feld darunter
            }
        }
    } catch (error) {
        console.warn('GitHub Commit Log:', error.message);
        const msgElement = document.getElementById('latest-commit-msg');
        const timeElement = document.getElementById('latest-commit-time');

        if (msgElement) {
            msgElement.innerText = 'Unavailable';
        }
        if (timeElement) {
            timeElement.innerText = '';
        }
    }
}

// ==========================================
// DEX SCROLL ANIMATION & HAPTICS (PIXEL-PERFECT)
// ==========================================
let dexScrollRafId = null;
let lastHapticScrollY = 0;
// Dynamic threshold – updated after first render to match actual card row height
let HAPTIC_PIXEL_THRESHOLD = 140;

// Called from loadMoreDexItems after first chunk: compute real row height from DOM
function recalcHapticThreshold() {
    const grid = document.getElementById('dex-grid');
    if (!grid || grid.children.length < 2) return;
    const first = grid.children[0].getBoundingClientRect();
    const second = grid.children[1].getBoundingClientRect();
    // In 3-col layout rows differ by top position; in 2-col too
    // Walk cards until we find one on the next row (different top)
    let rowHeight = 0;
    for (let i = 1; i < Math.min(grid.children.length, 12); i++) {
        const rect = grid.children[i].getBoundingClientRect();
        if (rect.top > first.top + 4) {
            rowHeight = rect.top - first.top;
            break;
        }
    }
    if (rowHeight > 30) {
        HAPTIC_PIXEL_THRESHOLD = rowHeight;
    }
}

function updateDexScale() {
    if (typeof dexSortMode !== 'undefined' && dexSortMode === 'alpha') return;

    const grid = document.getElementById('dex-grid');
    if (!grid || grid.children.length === 0) return;

    const viewportCenter = window.innerHeight / 2;
    const focusZoneHalfHeight = window.innerHeight * 0.25;
    const fadeZoneHeight = window.innerHeight * 0.2;
    // Nur Karten in einem erweiterten Viewport prüfen (Culling)
    const cullMargin = window.innerHeight * 1.5;
    const cards = grid.querySelectorAll('.dex-anim-card');

    // 1. DOM Reads - alle rects auf einmal lesen (kein thrashing)
    const rects = Array.from(cards).map(card => ({
        card,
        rect: card.getBoundingClientRect()
    }));

    // 2. DOM Writes - gebatcht, nur für Karten im erweiterten Viewport
    rects.forEach(({ card, rect }) => {
        const cardCenter = rect.top + rect.height / 2;

        // Culling: Karten weit außerhalb nicht anfassen
        if (rect.bottom < -cullMargin || rect.top > window.innerHeight + cullMargin) {
            return;
        }

        const distanceToCenter = Math.abs(viewportCenter - cardCenter);
        let scale = 1.0;
        let opacity = 1.0;

        if (distanceToCenter > focusZoneHalfHeight) {
            let progress = (distanceToCenter - focusZoneHalfHeight) / fadeZoneHeight;
            if (progress > 1) progress = 1;
            scale = 1.0 - (0.15 * progress);
            opacity = 1.0 - (0.6 * progress);
        }

        card.style.transform = `scale(${scale})`;
        card.style.opacity = opacity;
    });
}

function initDexScrollAnimation() {
    // Startpunkt setzen, sobald die Animation initialisiert wird
    lastHapticScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const dexTab = document.getElementById('tab-dex');
        // Dex is active when it does NOT have the tab-dex-hidden class
        const dexIsActive = dexTab && !dexTab.classList.contains('tab-dex-hidden');

        if (dexIsActive) {
            // 1. Visual scale animation (60fps)
            if (dexScrollRafId) cancelAnimationFrame(dexScrollRafId);
            dexScrollRafId = requestAnimationFrame(updateDexScale);

            // 2. Row-based haptics – ONLY in ID sort mode
            if (dexSortMode === 'id') {
                const currentScrollY = window.scrollY;
                const scrollDelta = Math.abs(currentScrollY - lastHapticScrollY);

                if (scrollDelta >= HAPTIC_PIXEL_THRESHOLD) {
                    const timesToTrigger = Math.min(
                        Math.floor(scrollDelta / HAPTIC_PIXEL_THRESHOLD),
                        10 // safety cap for extreme flick-scrolls
                    );

                    // Fire all haptics immediately – no setTimeout delay
                    // so rapid flick scrolling fires bam-bam-bam without lag
                    for (let i = 0; i < timesToTrigger; i++) {
                        triggerLightHapticFeedback();
                    }

                    // Carry over the remainder so no pixel is "lost" between events
                    const sign = currentScrollY > lastHapticScrollY ? 1 : -1;
                    lastHapticScrollY = currentScrollY - (scrollDelta % HAPTIC_PIXEL_THRESHOLD) * sign;
                }
            } else {
                lastHapticScrollY = window.scrollY;
            }
        }
    }, { passive: true });
}

function triggerLightHapticFeedback() {
    if (window.webkit && window.webkit.messageHandlers.hapticHandler) {
        window.webkit.messageHandlers.hapticHandler.postMessage("selection");
    } else if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// ==========================================
// BRAND GROUPING & RENDERING (Sort by Name)
// ==========================================

function groupAndSortByBrand(items) {
    const groups = {};

    // 1. Gruppieren nach Marke
    items.forEach(snus => {
        const brand = snus.brand || 'Unbekannt';
        if (!groups[brand]) groups[brand] = [];
        groups[brand].push(snus);
    });

    // 2. Marken alphabetisch und nach Favoriten sortieren
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    const sortedBrands = Object.keys(groups).sort((a, b) => {
        const aFav = favoriteBrands.includes(a);
        const bFav = favoriteBrands.includes(b);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.localeCompare(b);
    });

    const result = [];
    sortedBrands.forEach(brand => {
        const brandItems = groups[brand];

        // 3. Innerhalb der Marke sortieren: Freigeschaltet zuerst, dann nach ID
        brandItems.sort((a, b) => {
            const aUnlocked = !!globalUserCollection[a.id];
            const bUnlocked = !!globalUserCollection[b.id];

            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;

            return parseInt(a.id) - parseInt(b.id);
        });

        const unlockedCount = brandItems.filter(item => !!globalUserCollection[item.id]).length;

        result.push({
            brandName: brand,
            items: brandItems,
            totalCount: brandItems.length,
            unlockedCount: unlockedCount
        });
    });

    return result;
}

let brandToRemove = null;

window.handleFavoriteClick = function (brandName) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    if (favoriteBrands.includes(brandName)) {
        showRemoveFavoriteModal(brandName);
    } else {
        favoriteBrands.push(brandName);
        localStorage.setItem('dexFavoriteBrands', JSON.stringify(favoriteBrands));
        filterDex();
    }
};

window.handleStatsFavoriteClick = function (brandName) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    if (favoriteBrands.includes(brandName)) {
        showRemoveFavoriteModal(brandName);
    } else {
        favoriteBrands.push(brandName);
        localStorage.setItem('dexFavoriteBrands', JSON.stringify(favoriteBrands));
        filterDex();
        openSettingsSubpage('Stats');
    }
};

window.showRemoveFavoriteModal = function (brandName) {
    brandToRemove = brandName;
    const modal = document.getElementById('remove-favorite-modal');
    const backdrop = document.getElementById('remove-favorite-backdrop');
    const card = document.getElementById('remove-favorite-card');
    const nameEl = document.getElementById('remove-favorite-brand-name');

    if (nameEl) nameEl.innerText = brandName;

    if (modal && backdrop && card) {
        document.body.classList.add('overflow-hidden');
        modal.classList.remove('hidden');
        // Force reflow
        void modal.offsetWidth;
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        card.classList.remove('scale-95', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
    }
};

window.closeRemoveFavoriteModal = function () {
    const modal = document.getElementById('remove-favorite-modal');
    const backdrop = document.getElementById('remove-favorite-backdrop');
    const card = document.getElementById('remove-favorite-card');

    if (modal && backdrop && card) {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
        card.classList.remove('scale-100', 'opacity-100');
        card.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            modal.classList.add('hidden');
            brandToRemove = null;
            // Restore scroll if not in settings subpage (which also controls overflow)
            const subpage = document.getElementById('settings-subpage');
            if (!subpage || subpage.classList.contains('translate-x-full')) {
                document.body.classList.remove('overflow-hidden');
            }
        }, 300);
    }
};

window.confirmRemoveFavorite = function () {
    if (brandToRemove) {
        let favoriteBrands = [];
        try {
            favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
        } catch (e) { }

        favoriteBrands = favoriteBrands.filter(b => b !== brandToRemove);
        localStorage.setItem('dexFavoriteBrands', JSON.stringify(favoriteBrands));

        closeRemoveFavoriteModal();
        filterDex();

        const subpage = document.getElementById('settings-subpage');
        const titleEl = document.getElementById('subpage-title');
        if (titleEl && titleEl.innerText === 'Stats' && subpage && !subpage.classList.contains('translate-x-full')) {
            openSettingsSubpage('Stats');
        }
    }
};

function createBrandHeaderHTML(brandName, unlockedCount, totalCount) {
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    const isFav = favoriteBrands.includes(brandName);

    const starIcon = isFav
        ? `<svg class="w-4 h-4 text-yellow-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
        : `<svg class="w-4 h-4 text-[#8E8E93]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`;

    const safeBrandName = brandName.replace(/'/g, "\\'");

    return `
        <div class="flex justify-between items-end mb-3 px-1 mt-6 first:mt-2">
            <div class="flex items-center gap-2">
                <h2 class="text-[20px] font-semibold text-white tracking-tight">${brandName}</h2>
                <button onclick="handleFavoriteClick('${safeBrandName}')" class="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 border border-white/5 text-[#8E8E93] transition-all duration-200 active:scale-90 shadow-sm mb-0.5">
                    ${starIcon}
                </button>
            </div>
            <span class="text-[13px] font-medium text-[#8E8E93] bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                ${unlockedCount} / ${totalCount}
            </span>
        </div>
    `;
}

function createHorizontalCardHTML(snus, isUnlocked, glowActive) {
    const formattedId = '#' + String(snus.id).padStart(3, '0');
    const rarity = (snus.rarity || 'common').toLowerCase().trim();
    const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
    const rarityIndicator = `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;
    const imgUrl = GITHUB_BASE + snus.image;
    const isCached = dexImageCache.has(imgUrl);

    // Loading-Placeholder: CSS-Shimmer statt Video (kein RAM/CPU-Overhead)
    const placeholderHTML = isCached ? '' :
        `<div class="dex-placeholder absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-[60%] h-[60%] rounded-xl bg-white/5 animate-pulse"></div>
            </div>`;
    const imgClass = isCached
        ? `dex-img-cached w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10`
        : `dex-lazy-img w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10 opacity-0 transition-opacity duration-500`;
    const imgSrcAttr = isCached ? `src="${imgUrl}"` : `data-src="${imgUrl}"`;

    return `
        <div onclick="openSnusDetail(${snus.id})" class="brand-anim-card cursor-pointer group flex-shrink-0 w-[28vw] max-w-[120px] snap-center transition-all duration-200 ease-out origin-center will-change-transform">
            <div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] shadow-md overflow-hidden transition-transform group-active:scale-95 ${!isUnlocked ? 'opacity-40 grayscale' : ''}" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}">
                <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                    <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                    ${rarityIndicator}
                </div>
                <div class="dex-image-container w-full aspect-square flex items-center justify-center relative mt-1">
                    ${placeholderHTML}
                    <img ${imgSrcAttr} class="${imgClass}">
                </div>
                <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                    <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5>
                </div>
            </div>
        </div>
    `;
}

// Tracked scroll listener refs so we can remove them on re-render
let _brandScrollListeners = [];

function renderDexGrouped(groupedData) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;

    // Bestehende Carousel-Scroll-Listener aufräumen
    _brandScrollListeners.forEach(({ el, fn }) => el.removeEventListener('scroll', fn));
    _brandScrollListeners = [];

    grid.innerHTML = '';
    const glowActive = localStorage.getItem('dexGlow') === 'true';

    if (!imageLazyObserver) initImageLazyLoadObserver();

    // Alle Bilder im Hintergrund vorladen (für Alpha-Sort genauso wichtig wie für ID-Sort)
    // Flache Liste aller Items aus den Brand-Gruppen erstellen
    const allAlphaItems = groupedData.flatMap(b => b.items);
    // Nach erstem Paint starten, damit erste Brands sofort gezeigt werden
    requestAnimationFrame(() => preloadAllDexImages(allAlphaItems));

    // Chunked async rendering – 2 Brands pro Frame für maximal smooth Progressive Reveal
    const BRAND_CHUNK = 2;
    let brandIndex = 0;

    function renderNextBrandChunk() {
        const chunk = groupedData.slice(brandIndex, brandIndex + BRAND_CHUNK);
        if (chunk.length === 0) return;

        const fragment = document.createDocumentFragment();

        chunk.forEach(brandData => {
            const section = document.createElement('div');
            section.className = 'brand-section w-full mb-4';
            // Dem Browser erlauben, Off-Screen-Sections zu überspringen (reduziert Reflow-Kosten)
            section.style.contentVisibility = 'auto';
            section.style.containIntrinsicSize = '0 200px';

            const header = createBrandHeaderHTML(brandData.brandName, brandData.unlockedCount, brandData.totalCount);
            let cardsHTML = '';
            brandData.items.forEach(snus => {
                const isUnlocked = !!globalUserCollection[snus.id];
                cardsHTML += createHorizontalCardHTML(snus, isUnlocked, glowActive);
            });

            section.innerHTML = `
                ${header}
                <div class="brand-carousel flex gap-[3vw] overflow-x-auto pb-4 pt-2 snap-x snap-mandatory scroll-smooth px-1">
                    ${cardsHTML}
                </div>
            `;
            fragment.appendChild(section);
        });

        grid.appendChild(fragment);

        // Lazy-Loading für neue Bilder registrieren
        grid.querySelectorAll('.dex-lazy-img:not(.observed)').forEach(img => {
            img.classList.add('observed');
            imageLazyObserver.observe(img);
        });

        // Scroll-Animation für neue Carousels registrieren
        const newCarousels = grid.querySelectorAll('.brand-carousel:not(.anim-init)');
        newCarousels.forEach(carousel => {
            carousel.classList.add('anim-init');
            initBrandScrollAnimation(carousel);
        });

        brandIndex += BRAND_CHUNK;

        if (brandIndex < groupedData.length) {
            requestAnimationFrame(renderNextBrandChunk);
        }
    }

    renderNextBrandChunk();
}

// Horizontale Scroll-Animation für Brand-Carousels
// Throttled mit RAF – ein Listener pro Carousel, kein Thrashing
function initBrandScrollAnimation(container) {
    const cards = Array.from(container.querySelectorAll('.brand-anim-card'));
    if (cards.length === 0) return;

    let rafPending = false;

    const updateScale = () => {
        rafPending = false;
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        const focusZoneHalfWidth = containerRect.width * 0.35;
        const fadeZoneWidth = containerRect.width * 0.15;

        // Alle Rects auf einmal lesen
        const rects = cards.map(card => card.getBoundingClientRect());

        // Dann alle Styles schreiben
        cards.forEach((card, i) => {
            const cardCenter = rects[i].left + rects[i].width / 2;
            const distanceToCenter = Math.abs(containerCenter - cardCenter);

            let scale = 1.0;
            let opacity = 1.0;

            if (distanceToCenter > focusZoneHalfWidth) {
                let progress = (distanceToCenter - focusZoneHalfWidth) / fadeZoneWidth;
                if (progress > 1) progress = 1;
                scale = 1.0 - (0.15 * progress);
                opacity = 1.0 - (0.6 * progress);
            }

            card.style.transform = `scale(${scale})`;
            card.style.opacity = opacity;
        });
    };

    updateScale(); // Initialer Aufruf

    const onScroll = () => {
        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(updateScale);
        }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    // Für späteres Cleanup tracken
    _brandScrollListeners.push({ el: container, fn: onScroll });
}

// ==========================================
// STATS HELPER
// ==========================================
function getBrandStats() {
    const stats = {};

    // Daten aggregieren
    globalSnusData.forEach(snus => {
        const brand = snus.brand || 'Unbekannt';
        const rarity = (snus.rarity || 'common').toLowerCase().trim();

        if (!stats[brand]) {
            stats[brand] = { total: 0, unlocked: 0, rarities: {} };
        }

        stats[brand].total++;
        if (globalUserCollection[snus.id]) {
            stats[brand].unlocked++;
        }

        if (!stats[brand].rarities[rarity]) {
            stats[brand].rarities[rarity] = 0;
        }
        stats[brand].rarities[rarity]++;
    });

    // In Array umwandeln und alphabetisch sortieren (Favoriten zuerst)
    let favoriteBrands = [];
    try { favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]'); } catch (e) { }

    return Object.keys(stats).map(brand => {
        // Find dominant rarity
        let dominantRarity = 'common';
        let maxCount = 0;
        for (const [r, count] of Object.entries(stats[brand].rarities)) {
            if (count > maxCount) {
                maxCount = count;
                dominantRarity = r;
            }
        }

        return {
            name: brand,
            total: stats[brand].total,
            unlocked: stats[brand].unlocked,
            dominantRarity: dominantRarity
        };
    }).sort((a, b) => {
        const aFav = favoriteBrands.includes(a.name);
        const bFav = favoriteBrands.includes(b.name);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.name.localeCompare(b.name);
    });
}

















//░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░░░░░████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░░░░█░░░██░░░██████░░░░░░░░░░░░░░░░░░░░░
//░░░██░░░░░░░░░█░░░███░░░░██░░░░░░░░░░░░░
//░░░█░░░░░░░░░░█░░░░░██░░░░██░░░░░░██░░░░
//░░░██░░░░░░░░░█░░░░░░██░░░░██░░░░██░░░░░
//░░░░░█████░░░░█░░░░░░░█░░░░░░█░██░░░░░░░
//░░░░░░░░░░█░░░█░░░░░░░█░░░░░░░██░░░░░░░░
//░░░█░░░░░█░░░░█░░░░░░██░░░░░░████░░░░░░░
//░░░░██████░░░░█░░░░███░░░░░██░░░█░░░░░░░
//░░░░░░░░░░░░░░██████░░░░░░██░░░░░██░░░░░
//░░██████░░░░░░░░░░░░░░█░░░░░░░░░░░█░░░█░
//░░░░█░░██░░░░░░░░░░░░░█░░░░░░░░░░░░░░░█░
//░░░░█████░█░░░░░░░░░░░█░░░░░░░░░░░░░░░█░
//░░░░██░░░░███░███░░░███░░█░█░░░███░░░██░
//░░░░█░░░░░█░░░█░██░██░█░░█░█░░██░░░░███░
//░░░░█░░░░░█░░░█░█░░█░░█░░█░██░██░░░░░█░░
//░░░░█░░░░░█░░░███░░█████░█████░████░░█░░
//░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░░░▄█▀▀▀▀▀▀▀▄░░░░░░▄▄▄▄░░░░█░░░░░░░░░░░░
//░░█░░░░░░░░░░▀█░░░░░░░░█░░▀░▀█░░░░░░░░░░
//░▐░░░█▀▀█░░░░░░█░░░░▄▄█░░█░░░█░░░░░░░░░░
//░█░░░▌░░░█░░░░░▐░░███▄▄▄░▐▄▄█░░░░░░░░░░░
//░▌░░░██▀▀▀░░░░░▐░░░░░░░░░░░░░░░░░░░░░░░░
//░▌░░░▌▀█░░░░░░░▐░░░█▀▀█░░▄█▀░░░░░░░░░░░░
//▐░░░▐░░░█▄░░░░░▀░░░░░▄█░▐▄▄░░░░░░░░░░░░░
//░█░░▐░░░░▀▄░░░█░░░░▄█░░░▐░░▀█░░░░░░░░░░░
//░░██░░░░░░░▄▄█░░░░░▀▀▀▀░▐▄▄█▀░░░░░░░░░░░
//░░░▀▀▀▀▀▀▀▀░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
// ==========================================