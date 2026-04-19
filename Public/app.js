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
    const audio = document.getElementById('splash-sound');
    const splash = document.getElementById('splash-screen');

    // Video + Sound gleichzeitig starten
    Promise.all([
        video.play(),
        audio.play()
    ]).catch(err => {
        console.log("Autoplay blocked:", err);
    });

    // Wenn das Video zu Ende ist → Splash ausblenden
    video.addEventListener('ended', () => {
        splash.style.opacity = '0';

        setTimeout(() => {
            splash.style.display = 'none';
            // Optional: Audio stoppen
            audio.pause();
        }, 600);
    });
    loadLatestGitHubCommit();
    checkUser();
    initDexScrollAnimation();
});

// ==========================================
// 2. AUTHENTIFIZIERUNG, UI & GREETING
// ==========================================

let isLoginMode = true;

async function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();
    let displayIdent = "Collector";

    if (session && session.user) {
        if (session.user.user_metadata?.username) {
            displayIdent = session.user.user_metadata.username;
        } else if (session.user.email) {
            let rawName = session.user.email.split('@')[0];
            displayIdent = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        }
    }

    const hour = new Date().getHours();
    let message = "";

    if (hour >= 5 && hour < 12) message = "Guten Morgen";
    else if (hour >= 12 && hour < 18) message = "Guten Tag";
    else if (hour >= 18 && hour < 22) message = "Guten Abend";
    else message = "Gute Nacht";

    greetingElement.innerHTML = `${message}, <span class="text-white font-semibold">${displayIdent}</span>`;
}

// ==========================================
// GOOGLE ANMELDUNG 
// ==========================================

async function signInWithGoogle() {
    const btnText = document.getElementById('google-btn-text');
    const btn = document.getElementById('google-login-btn');

    // 1. Validierung des Clients
    if (!supabaseClient || !supabaseClient.auth) {
        console.error("Supabase Client fehlt!");
        alert("Verbindung zum Server wird aufgebaut... Bitte versuche es in 2 Sekunden erneut.");
        return;
    }

    try {
        // UI Feedback
        btnText.innerText = "Öffne Google...";
        btn.disabled = true;
        btn.style.opacity = "0.7";

        // 2. Redirect URL für WebViews optimieren
        // Auf iOS WebViews ist window.location.origin oft 'file://' oder lokal.
        // Falls du eine echte Domain hast (ngrok oder live), setze sie hier fest ein.
        const redirectUrl = window.location.origin + window.location.pathname;

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    prompt: 'select_account', // Zwingt Google zur Kontoauswahl (hilft bei WebView-Hängern)
                    access_type: 'offline'
                }
            }
        });

        if (error) throw error;

        // data.url enthält den Google-Link. In manchen WebViews muss man 
        // den Redirect manuell triggern, falls er nicht automatisch passiert:
        if (data?.url) {
            window.location.href = data.url;
        }

    } catch (error) {
        console.error("Google Login Error:", error.message);
        alert("Login-Fehler: " + error.message);
        
        // UI Reset
        btnText.innerText = "Mit Google anmelden";
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
            // NEU: Prüfen ob Username existiert (wichtig für Google Login)
            const hasUsername = session.user.user_metadata?.username;
            
            if (!hasUsername) {
                const usernameView = document.getElementById('auth-username-view');
                if (!usernameView) {
                    console.error("HTML Element 'auth-username-view' fehlt in der index.html!");
                    return; // Stoppe Ausführung, um Endlosschleife/Absturz zu verhindern
                }
                
                document.getElementById('auth-main-view')?.classList.add('hidden');
                document.getElementById('auth-verify-view')?.classList.add('hidden');
                usernameView.classList.remove('hidden');
                if (document.getElementById('auth-title')) document.getElementById('auth-title').innerText = "Fast geschafft";
                if (document.getElementById('auth-subtitle')) document.getElementById('auth-subtitle').innerText = "Wie möchtest du heißen?";
                return; // Warte auf Usereingabe
            }

            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 500);

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
        errorEl.innerText = "Bitte gib einen Benutzernamen ein.";
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerText = "Speichere...";

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
        btn.innerText = "Weiter";
    }
}

async function handleLogout() {
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
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const mainBtn = document.getElementById('auth-main-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleBtnText = document.querySelector('button[onclick="toggleAuthMode()"] span.font-semibold');
    const errorEl = document.getElementById('auth-error');

    errorEl.classList.add('hidden'); // Fehler ausblenden beim Wechsel

    if (isLoginMode) {
        registerFields.classList.replace('flex', 'hidden');
        title.innerText = "Snusdex Elite";
        subtitle.innerText = "Willkommen zurück";
        mainBtn.innerText = "Anmelden";
        toggleText.innerText = "Noch kein Account? ";
        toggleBtnText.innerText = "Registrieren";
    } else {
        registerFields.classList.replace('hidden', 'flex');
        title.innerText = "Account erstellen";
        subtitle.innerText = "Werde Teil der Elite";
        mainBtn.innerText = "Registrieren";
        toggleText.innerText = "Bereits einen Account? ";
        toggleBtnText.innerText = "Anmelden";
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
        errorEl.innerText = "Bitte fülle alle Felder aus.";
        errorEl.classList.remove('hidden');
        triggerHapticFeedback();
        return;
    }

    // Button deaktivieren während er lädt
    mainBtn.disabled = true;
    mainBtn.innerText = "Lädt...";

    if (isLoginMode) {
        // --- DEIN ORIGINALER LOGIN CODE ---
        const {
            error
        } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorEl.innerText = "Falsches Passwort oder E-Mail";
            errorEl.classList.remove('hidden');
            triggerHapticFeedback();

            mainBtn.disabled = false;
            mainBtn.innerText = "Anmelden";
        } else {
            errorEl.classList.add('hidden');
            checkUser();
        }
    } else {
        // --- REGISTRIERUNGS CODE ---
        const username = document.getElementById('auth-username').value.trim();
        const passwordConfirm = document.getElementById('auth-password-confirm').value;

        if (password !== passwordConfirm) {
            errorEl.innerText = "Die Passwörter stimmen nicht überein.";
            errorEl.classList.remove('hidden');
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = "Registrieren";
            return;
        }

        const {
            data,
            error
        } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (error) {
            // Falls E-Mail schon existiert etc.
            errorEl.innerText = error.message.includes('already registered') ? "E-Mail wird bereits verwendet." : error.message;
            errorEl.classList.remove('hidden');
            triggerHapticFeedback();

            mainBtn.disabled = false;
            mainBtn.innerText = "Registrieren";
        } else {
            alert("Account erfolgreich erstellt! Bitte melde dich jetzt an.");
            toggleAuthMode(); // Zurück zur Anmeldung wischen

            mainBtn.disabled = false;
            mainBtn.innerText = "Anmelden";
        }
    }
}
// ==========================================
// 3. NAVIGATION (TABS)
// ==========================================

function switchTab(tabId) {
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (!activeTab || !activeTab.classList.contains('hidden')) return;

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    activeTab.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isActive = btn.id === `btn-${tabId}`;
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-[#8E8E93]', !isActive);
    });
    window.scrollTo(0, 0);

    if (tabId === 'home' && displayedXp !== null && actualXp !== null && displayedXp !== actualXp) {
        // Wir warten 200ms, damit die Fade-In Animation vom Tab fertig ist, bevor die Zahlen hochrollen
        setTimeout(() => {
            const level = Math.floor(actualXp / 300) + 1;
            animateXp(displayedXp, actualXp, level);
        }, 200);
    }

    if (tabId === 'social') {
        loadTopSnusOfWeek();
    }

    if (tabId === 'dex') {
        setTimeout(updateDexScale, 50);
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
    } = await supabaseClient.from('snus_items').select('*').order('id', {
        ascending: true
    });
    globalSnusData = snusItems || [];
    updateLivePerformance();
    renderDexGrid(globalSnusData);
    loadTopSnusOfWeek();
    renderSuggestions();

}

let currentDexRenderCount = 0;
let currentDexItems = [];
const DEX_CHUNK_SIZE = 18;
let dexObserver = null;

function initDexObserver() {
    if (dexObserver) {
        dexObserver.disconnect();
    }
    const sentinel = document.getElementById('dex-sentinel');
    if (!sentinel) return;

    // Beobachter der auslöst sobald der Bereich ca. 400px vor dem Sichtfeld ist
    dexObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreDexItems();
        }
    }, {
        rootMargin: '400px'
    });

    dexObserver.observe(sentinel);
}

function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    grid.innerHTML = '';

    currentDexItems = items;
    currentDexRenderCount = 0;

    loadMoreDexItems();
    initDexObserver();
}

function loadMoreDexItems() {
    const grid = document.getElementById('dex-grid');
    if (!grid || currentDexRenderCount >= currentDexItems.length) return;

    const nextChunk = currentDexItems.slice(currentDexRenderCount, currentDexRenderCount + DEX_CHUNK_SIZE);
    let htmlChunk = '';

    const cols = localStorage.getItem('dexColumns') || '3';
    const is2Cols = cols === '2';
    const glowActive = localStorage.getItem('dexGlow') === 'true';

    nextChunk.forEach(snus => {
        const isUnlocked = !!globalUserCollection[snus.id];

        const formattedId = '#' + String(snus.id).padStart(3, '0');
        const rarity = (snus.rarity || 'common').toLowerCase().trim();

        const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';

        const rarityIndicator = is2Cols ?
            `<span class="text-[10px] font-bold tracking-wide uppercase" style="color: var(--${rarity}, var(--common)); text-shadow: 0px 0px 8px var(--${rarity}, var(--common));">${rarity}</span>` :
            `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;

        // w-full hinzugefügt, damit das Grid richtig gefüllt wird
        // NEU: Klassen für die Scroll-Animation hinzugefügt (dex-anim-card, transition-all, duration-200, origin-center)
        htmlChunk += `
            <div onclick="openSnusDetail(${snus.id})" class="dex-anim-card cursor-pointer group h-full w-full transition-all duration-200 ease-out origin-center will-change-transform">
                <div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] transition-all group-active:scale-95 shadow-md overflow-hidden ${!isUnlocked ? 'opacity-40 grayscale' : ''}" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}">
                    
                    <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                        <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                        ${rarityIndicator}
                    </div>

                    <div class="w-full aspect-square flex items-center justify-center relative mt-1">
                        <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10" loading="lazy" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                    </div>
                    
                    <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                        <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5>
                    </div>
                    
                </div>
            </div>
        `;
    });

    grid.insertAdjacentHTML('beforeend', htmlChunk);
    currentDexRenderCount += DEX_CHUNK_SIZE;
    setTimeout(updateDexScale, 50);
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
        const snusName = can.snus_items ? can.snus_items.name : 'Unknown';
        const snusImg = can.snus_items ? can.snus_items.image : '';

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
                <button onclick="triggerHapticFeedback(); this.innerText='Emptying...'; this.disabled=true; this.classList.add('opacity-50'); finishSpecificCan('${can.id}')" class="bg-white text-black text-[11px] font-bold px-4 py-2 rounded-full active:scale-95 transition-all">
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
let isDetailDragging = false;

function setupGlobalSwipe() {
    const card = document.getElementById('snus-modal-card');
    if (!card) return;

    card.addEventListener('touchstart', (e) => {
        detailStartY = e.touches[0].clientY;
        isDetailDragging = true;
        card.style.transition = 'none'; 
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isDetailDragging) return;
        
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - detailStartY;

        if (deltaY > 0) { // Nur nach unten ziehen erlauben
            if (e.cancelable) e.preventDefault(); // Verhindert System-Gesten
            card.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        }
    }, { passive: false });

    card.addEventListener('touchend', (e) => {
        if (!isDetailDragging) return;
        isDetailDragging = false;
        
        const deltaY = e.changedTouches[0].clientY - detailStartY;
        card.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaY > 100) {
            card.style.transform = 'translate3d(0, 100%, 0)';
            closeSnusDetail(true);
        } else {
            card.style.transform = 'translate3d(0, 0px, 0)';
            setTimeout(() => {
                card.style.transform = '';
                card.style.transition = '';
            }, 350);
        }
    });
}

setupGlobalSwipe();

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
    } [tag])) : '';

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

        // Animation vorbereiten
        backdrop.style.transition = 'none';
        card.style.transition = 'none';
        backdrop.style.opacity = '0';
        card.style.transform = 'translateY(100%)';

        // Kleiner Force-Reflow
        modal.offsetHeight; 

        // Animation starten
        backdrop.style.transition = 'opacity 0.3s ease-out';
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
        
        backdrop.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }
    
    if (typeof triggerHapticFeedback === "function") triggerHapticFeedback();
}

function closeSnusDetail(isDragging = false) {
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');

    // 1. Haptik sofort auslösen wie beim Scanner
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    // 2. Animation (nur wenn nicht schon durch Drag nach unten geschoben)
    if (!isDragging) {
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
        card.style.transform = 'translateY(100%)';
    }
    
    backdrop.style.transition = 'opacity 0.4s ease-in';
    backdrop.style.opacity = '0';
    
    document.body.classList.remove('overflow-hidden');
    
    // 3. Reset nach exakt 400ms (Scanner Timing)
    setTimeout(() => {
        document.getElementById('snus-modal').classList.add('hidden');
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
    } = await supabaseClient.from('snus_items').insert([{
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

function filterDex() {
    const term = document.getElementById('dex-search').value.toLowerCase();
    renderDexGrid(globalSnusData.filter(s => s.name?.toLowerCase().includes(term) || s.flavor?.some(f => f.toLowerCase().includes(term))));
}

function setupProfile(user) {
    const emailEl = document.getElementById('profile-email');
    const initialsEl = document.getElementById('user-initials');
    const adminEl = document.getElementById('admin-panel');

    if (emailEl) emailEl.innerText = user.user_metadata?.username || user.email;
    if (initialsEl) initialsEl.innerText = user.email[0].toUpperCase();
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
        container.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[15px]">No social stats available yet.</div>';
        return;
    }

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

    // Final check if anything was rendered
    if (container.innerHTML.trim() === '') {
        container.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[15px]">No social stats available yet.</div>';
    }
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
// 9.5. SOCIAL FEATURES (FRIENDS & SEARCH)
// ==========================================

let userSearchTimeout;
async function searchUsersConnections() {
    clearTimeout(userSearchTimeout);
    const query = document.getElementById('connections-search-input').value.trim();
    const resultsContainer = document.getElementById('connections-search-results');
    const listsContainer = document.getElementById('connections-lists');

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        listsContainer.style.display = 'block';
        return;
    }

    listsContainer.style.display = 'none';
    resultsContainer.innerHTML = '<div class="text-center text-[#8E8E93] text-[15px] mt-4">Searching...</div>';

    userSearchTimeout = setTimeout(async () => {
        const {
            data: {
                user
            }
        } = await supabaseClient.auth.getUser();
        if (!user) return;

        const {
            data: profiles,
            error: pError
        } = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url, xp')
            .ilike('username', `%${query}%`)
            .neq('id', user.id)
            .limit(20);

        if (pError || !profiles || profiles.length === 0) {
            resultsContainer.innerHTML = '<div class="text-center text-[#8E8E93] text-[15px] mt-4">No Collectors found.</div>';
            return;
        }

        const {
            data: follows
        } = await supabaseClient
            .from('connections')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', profiles.map(p => p.id));

        const followingSet = new Set(follows?.map(f => f.following_id) || []);

        resultsContainer.innerHTML = '';
        profiles.forEach(profile => {
            const isFollowing = followingSet.has(profile.id);
            const btnIcon = isFollowing ?
                `<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"/></svg>` :
                `<svg class="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>`;
            const btnClass = isFollowing ?
                `bg-black border border-white/20 active:bg-white/10` :
                `bg-white active:bg-zinc-200`;

            const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=random`;
            const xp = profile.xp || 0;
            const level = Math.floor(xp / 300) + 1;
            const cans = Math.floor(xp / 100);

            resultsContainer.innerHTML += `
                <div class="flex items-center justify-between p-3 bg-[#2C2C2E] rounded-[16px] border border-white/5 shadow-sm">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <img src="${avatar}" class="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}'">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[16px] font-bold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                            <p class="text-[12px] text-[#8E8E93] font-medium">Lvl ${level} • ${cans} Cans</p>
                        </div>
                    </div>
                    <button onclick="triggerHapticFeedback(); toggleFollow('${profile.id}', this)" class="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ml-3 ${btnClass}" data-following="${isFollowing}">
                        ${btnIcon}
                    </button>
                </div>
            `;
        });
    }, 300);
}

async function toggleFollow(targetId, btnElement) {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const isFollowing = btnElement.getAttribute('data-following') === 'true';
    btnElement.disabled = true;

    if (isFollowing) {
        const {
            error
        } = await supabaseClient
            .from('connections')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetId);

        if (!error) {
            btnElement.setAttribute('data-following', 'false');
            btnElement.className = "w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white active:bg-zinc-200";
            btnElement.innerHTML = `<svg class="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>`;
        }
    } else {
        const {
            error
        } = await supabaseClient
            .from('connections')
            .insert([{
                follower_id: user.id,
                following_id: targetId
            }]);

        if (!error) {
            btnElement.setAttribute('data-following', 'true');
            btnElement.className = "w-10 h-10 rounded-full flex items-center justify-center transition-all bg-black border border-white/20 active:bg-white/10";
            btnElement.innerHTML = `<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"/></svg>`;
        }
    }

    btnElement.disabled = false;

    const connectionsPage = document.getElementById('connections-page');
    if (connectionsPage && !connectionsPage.classList.contains('hidden')) {
        loadConnectionsData();
    }
}

// ==========================================
// 9.6. CONNECTIONS PAGE (New)
// ==========================================


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
    document.getElementById('connections-search-input').value = '';
    document.getElementById('connections-search-results').innerHTML = '';
    document.getElementById('connections-lists').style.display = 'block';
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

async function loadConnectionsData() {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const followersList = document.getElementById('followers-list');
    const followingList = document.getElementById('following-list');

        followersList.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[14px]">Loading...</div>';
        followingList.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[14px]">Loading...</div>';

    // Load Followers
    const {
        data: followers,
        error: followersError
    } = await supabaseClient
        .from('connections')
        .select('profiles:profiles!follower_id(id, username, avatar_url, xp)')
        .eq('following_id', user.id);

    if (followersError || !followers || followers.length === 0) {
            followersList.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[14px]">No one is following you yet.</div>';
    } else {
        followersList.innerHTML = '';
            const sortedFollowers = followers
                .map(conn => Array.isArray(conn.profiles) ? conn.profiles[0] : conn.profiles)
                .filter(p => p)
                .sort((a, b) => (b.xp || 0) - (a.xp || 0));

            sortedFollowers.forEach((profile, idx) => {
                followersList.innerHTML += renderConnectionItem(profile, idx);
        });
    }

    // Load Following
    const {
        data: following,
        error: followingError
    } = await supabaseClient
        .from('connections')
        .select('profiles:profiles!following_id(id, username, avatar_url, xp)')
        .eq('follower_id', user.id);

    if (followingError || !following || following.length === 0) {
            followingList.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[14px]">You are not following anyone yet.</div>';
    } else {
        followingList.innerHTML = '';
            const sortedFollowing = following
                .map(conn => Array.isArray(conn.profiles) ? conn.profiles[0] : conn.profiles)
                .filter(p => p)
                .sort((a, b) => (b.xp || 0) - (a.xp || 0));

            sortedFollowing.forEach((profile, idx) => {
                followingList.innerHTML += renderConnectionItem(profile, idx);
        });
    }
}

    function renderConnectionItem(profile, index) {
    const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=random`;
    const xp = profile.xp || 0;
    const level = Math.floor(xp / 300) + 1;
        const cans = Math.floor(xp / 100);

        let rankHtml = '';
        if (index !== undefined) {
            let rankColor = 'text-[#8E8E93]';
            if (index === 0) rankColor = 'text-[#FFCC00]';
            else if (index === 1) rankColor = 'text-[#E5E4E2]';
            else if (index === 2) rankColor = 'text-[#CD7F32]';
            
            rankHtml = `<span class="text-[15px] font-bold ${rankColor} w-5 text-center mr-1 flex-shrink-0">${index + 1}</span>`;
        }

    return `
            <div class="flex items-center justify-between p-3 border-b border-white/5 last:border-0 cursor-pointer active:bg-white/5 transition-colors">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    ${rankHtml}
                    <img src="${avatar}" class="w-11 h-11 rounded-full object-cover border border-white/10 flex-shrink-0" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}'">
                    <div class="min-w-0 flex-1">
                        <h4 class="text-[17px] font-semibold text-white tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                        <p class="text-[13px] text-[#8E8E93] font-medium mt-0.5">Lvl ${level} • ${cans} Cans</p>
                    </div>
            </div>
                <div class="flex items-center gap-2 pl-4 flex-shrink-0 text-right">
                    <span class="text-[17px] font-semibold text-white tracking-tight">${xp} XP</span>
            </div>
        </div>
    `;
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

let globalActiveLogs = []; // Array für alle aktuell offenen Dosen

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
        btn.innerText = "Processing...";
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
        btn.innerText = "Open New Can";
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
        .select('*, snus_items(name, image)')
        .eq('user_id', user.id)
        .order('opened_at', {
            ascending: false
        });

    if (!error && logs) {
        globalActiveLogs = logs.filter(l => l.is_active === true);

        renderActiveCansUI();
        calculateUsageStats(logs);
    }
}

async function finishSpecificCan(logId) {
    triggerHapticFeedback();

    const {
        error
    } = await supabaseClient
        .from('usage_logs')
        .update({
            finished_at: new Date().toISOString(),
            is_active: false
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

    globalActiveLogs.forEach(can => {
        const snusName = can.snus_items ? can.snus_items.name : 'Unknown';
        const snusImg = can.snus_items ? can.snus_items.image : '';

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
                <button onclick="triggerHapticFeedback(); this.innerText='Emptying...'; this.disabled=true; this.classList.add('opacity-50'); finishSpecificCan('${can.id}')" class="bg-white text-black text-[11px] font-bold px-4 py-2 rounded-full active:scale-95 transition-all">
                    Empty
                </button>
            </div>
        `;
    });
}

function calculateUsageStats(allLogs) {
    const finishedCans = allLogs.filter(log => !log.is_active && log.finished_at);

    // Fallback, wenn noch keine Dose leer ist
    if (finishedCans.length === 0) {
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

    const firstEverLog = finishedCans[finishedCans.length - 1];
    const startDate = new Date(firstEverLog.opened_at);
    const today = new Date();

    let totalDaysSpan = (today - startDate) / (1000 * 60 * 60 * 24);
    if (totalDaysSpan < 1) totalDaysSpan = 1;

    const avgMgPerDay = totalMgHistory / totalDaysSpan;
    const avgPouchesPerDay = totalPouchesHistory / totalDaysSpan;

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
                (errorMessage) => {}
            );

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

    }, 400);
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

function openSettingsSubpage(type) {
    const subpage = document.getElementById('settings-subpage');
    const titleObj = document.getElementById('subpage-title');
    const contentObj = document.getElementById('subpage-content');

    titleObj.innerText = type;
    let html = '';

    if (type === 'Edit Profile') {
        html = `
            <div class="flex flex-col items-center mb-8 mt-2">
                <div class="relative">
                    <input type="file" id="profile-image-upload" accept="image/*" class="hidden" onchange="previewProfileImage(event)">
                    <div class="w-24 h-24 rounded-full flex-shrink-0 shadow-lg border-2 border-white/5 overflow-hidden bg-zinc-800">
                        <img id="edit-profile-image-preview" src="https://i.pravatar.cc/150?img=11" alt="Profilbild" class="w-full h-full object-cover">
                    </div>
                    <button onclick="triggerHapticFeedback(); document.getElementById('profile-image-upload').click()" class="absolute bottom-0 right-0 w-8 h-8 bg-[#1C1C1E] border border-white/20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10">
                        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="bg-[#1C1C1E] rounded-[24px] p-5 space-y-4 border border-white/10 mb-8 shadow-sm w-full max-w-full">
                <div class="flex flex-col gap-1.5 w-full">
                    <label class="text-[13px] text-[#8E8E93] ml-1 uppercase tracking-wider font-medium">Username</label>
                    <input type="text" id="edit-username" value="Collector69" class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all">
                </div>
                
                <div class="flex flex-col gap-1.5 w-full">
                    <label class="text-[13px] text-[#8E8E93] ml-1 uppercase tracking-wider font-medium">Email</label>
                    <input type="email" id="edit-email" value="user@example.com" disabled class="w-full bg-black/50 text-[#8E8E93] border border-white/5 rounded-[14px] px-4 py-3.5 text-[17px] outline-none cursor-not-allowed">
                </div>
                
                <input type="date" id="edit-dob" value="2000-01-01" min="1900-01-01" max="2099-12-31" oninput="limitDateInput(this)" class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all appearance-none" />
                
                <div class="flex flex-col gap-1.5 w-full">
                    <label class="text-[13px] text-[#8E8E93] ml-1 uppercase tracking-wider font-medium">Location</label>
                    <input type="text" id="edit-location" placeholder="City, Country" class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all placeholder:text-[#8E8E93]">
                </div>
            </div>

            <button id="save-profile-btn" onclick="triggerHapticFeedback(); handleProfileSave(this)" class="w-full bg-white text-black font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-all duration-300 shadow-[0_4px_14px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2">
                <span>Save Changes</span>
            </button>
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

        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
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
                        clearInterval(fadeAudio);
                    }
                }, 50);
            }

            setTimeout(() => {
                splashScreen.classList.add('hidden');
            }, 500);
        }
    }

    if (splashScreen && splashVideo) {
        splashVideo.play().then(() => {
            if (splashSound) {
                splashSound.play().catch(e => console.log("Audio-Autoplay blockiert"));
            }
        });

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
    const term = document.getElementById('dex-search').value.toLowerCase();
    renderDexGrid(globalSnusData.filter(s => s.name?.toLowerCase().includes(term) || s.flavor?.some(f => f.toLowerCase().includes(term))));
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
        reader.onload = function(e) {
            document.getElementById('edit-profile-image-preview').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

function handleProfileSave(btn) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    btn.disabled = true;
    btn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Saving...
    `;

    setTimeout(() => {
        if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

        btn.classList.remove('bg-white', 'text-black');
        btn.classList.add('bg-[#34C759]', 'text-white');
        btn.innerHTML = `
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
        `;

        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('bg-[#34C759]', 'text-white');
            btn.classList.add('bg-white', 'text-black');
            btn.innerHTML = `<span>Save Changes</span>`;
        }, 2000);

    }, 500);
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
window.unlock = function(id) {
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

function createScanListItemHTML(snus, fromModal = false) {
    const dateObj = new Date(globalUserCollection[snus.id].date);
    const dateStr = dateObj.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });

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

    if (collectedItems.length === 0) {
        listEl.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[15px]">Keine gefundenden Dosen.</div>';
        if (showMoreBtn) showMoreBtn.classList.add('hidden');
        return;
    }

    if (showMoreBtn) {
        if (collectedItems.length > 4) {
            showMoreBtn.classList.remove('hidden');
        } else {
            showMoreBtn.classList.add('hidden');
        }
    }

    collectedItems.slice(0, 4).forEach(snus => {
        listEl.innerHTML += createScanListItemHTML(snus, false);
    });
}

function openAllScansModal() {
    const modal = document.getElementById('all-scans-modal');
    const backdrop = document.getElementById('all-scans-backdrop');
    const card = document.getElementById('all-scans-card');
    const listContainer = document.getElementById('all-scans-list-container');

    const collectedItems = globalSnusData.filter(snus => !!globalUserCollection[snus.id]);
    collectedItems.sort((a, b) => new Date(globalUserCollection[b.id].date) - new Date(globalUserCollection[a.id].date));

    listContainer.innerHTML = '';
    collectedItems.forEach(snus => {
        listContainer.innerHTML += createScanListItemHTML(snus, true);
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
            <div onclick="openSnusDetail(${snus.id})"class="suggestion-card cursor-pointer group flex-shrink-0 w-[28vw] snap-center transition-transform duration-200 ease-out origin-center">
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
            if (shortMsg.length > 25) {
                shortMsg = shortMsg.substring(0, 25) + '...';
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
            
            const msgElement = document.getElementById('latest-commit-msg');
            if (msgElement) {
                msgElement.innerHTML = `${shortMsg} <span class="text-white/40 text-[11px] ml-1 tracking-wide">${timeString}</span>`;
            }
        }
    } catch (error) {
        console.warn('GitHub Commit Log:', error.message);
        const msgElement = document.getElementById('latest-commit-msg');
        if (msgElement) {
            msgElement.innerText = 'Unavailable';
        }
    }
}

// ==========================================
// DEX SCROLL ANIMATION & HAPTICS (NEU)
// ==========================================
let dexScrollRafId = null;
let lastFocusedDexRow = -1;

// ==========================================
// DEX SCROLL ANIMATION & HAPTICS (UPDATE)
// ==========================================
let dexScrollRafId = null;
let lastFocusedDexRow = -1;

function updateDexScale() {
    const grid = document.getElementById('dex-grid');
    if (!grid || grid.children.length === 0) return;

    const viewportCenter = window.innerHeight / 2;
    const focusZoneHalfHeight = window.innerHeight * 0.25; 

    const cards = grid.querySelectorAll('.dex-anim-card');
    let closestRowDist = Infinity;
    let currentRowFocus = -1;
    
    // Spaltenanzahl abrufen für die Reihen-Berechnung
    const cols = parseInt(localStorage.getItem('dexColumns') || '3');

    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distanceToCenter = Math.abs(viewportCenter - cardCenter);

        let scale = 1.0;
        let opacity = 1.0;

        // Visuelle Skalierung
        if (distanceToCenter > focusZoneHalfHeight) {
            const distancePastZone = distanceToCenter - focusZoneHalfHeight;
            let progress = distancePastZone / (window.innerHeight * 0.2);
            if (progress > 1) progress = 1;

            scale = 1.0 - (0.15 * progress);  
            opacity = 1.0 - (0.6 * progress); 
        }

        card.style.transform = `scale(${scale})`;
        card.style.opacity = opacity;

        // Berechnen, welche Reihe gerade exakt in der Mitte liegt
        if (distanceToCenter < closestRowDist) {
            closestRowDist = distanceToCenter;
            currentRowFocus = Math.floor(index / cols); 
        }
    });

    // ----------------------------------------------------
    // DYNAMISCHES HAPTIC FEEDBACK ("Zahnrad"-Effekt)
    // ----------------------------------------------------
    if (currentRowFocus !== -1 && currentRowFocus !== lastFocusedDexRow) {
        if (lastFocusedDexRow !== -1 && typeof triggerHapticFeedback === 'function') {
            
            // Berechne, wie viele Zeilen seit dem letzten Frame übersprungen wurden
            const skippedRows = Math.abs(currentRowFocus - lastFocusedDexRow);
            
            // Wenn der User sehr schnell wischt, simulieren wir das schnelle Vorbeirauschen 
            // der Zeilen durch mehrere, extrem schnelle Haptic-Ticks hintereinander.
            if (skippedRows > 1) { 
                // Wir cappen es auf maximal 5 schnelle Ticks, damit das Handy bei einem 
                // riesigen Sprung (z.B. "Scroll to Top") nicht 3 Sekunden lang vibriert.
                const ticksToPlay = Math.min(skippedRows, 5); 
                
                for (let i = 0; i < ticksToPlay; i++) {
                    // 35ms Abstand ergibt ein sehr befriedigendes, schnelles Rattern
                    setTimeout(() => triggerHapticFeedback(), i * 35); 
                }
            } else {
                // Bei langsamem Scrollen: Genau 1 präziser Tick pro Zeile
                triggerHapticFeedback();
            }
        }
        lastFocusedDexRow = currentRowFocus;
    }
}

function initDexScrollAnimation() {
    window.addEventListener('scroll', () => {
        const activeTab = document.getElementById('tab-dex');
        if (activeTab && !activeTab.classList.contains('hidden')) {
            if (dexScrollRafId) cancelAnimationFrame(dexScrollRafId);
            dexScrollRafId = requestAnimationFrame(updateDexScale);
        }
    }, { passive: true });
}

function initDexScrollAnimation() {
    window.addEventListener('scroll', () => {
        const activeTab = document.getElementById('tab-dex');
        if (activeTab && !activeTab.classList.contains('hidden')) {
            if (dexScrollRafId) cancelAnimationFrame(dexScrollRafId);
            dexScrollRafId = requestAnimationFrame(updateDexScale);
        }
    }, { passive: true });
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