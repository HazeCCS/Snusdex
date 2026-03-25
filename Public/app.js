// ==========================================
// 1. SETUP & KONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/'; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. AUTHENTIFIZIERUNG
// ==========================================

// ==========================================
// GREETING LOGIK (Zeit & Name)
// ==========================================

async function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;

    // 1. User aus der aktuellen Session holen
    const { data: { session } } = await supabaseClient.auth.getSession();
    let displayIdent = "Snuser";
    
    if (session && session.user && session.user.email) {
        // Gleiche Logik wie in setupProfile: Alles vor dem @
        displayIdent = session.user.email.split('@')[0];
    }

    // 2. Zeitbasierte Nachricht ermitteln
    const hour = new Date().getHours();
    let message = "";

    if (hour >= 5 && hour < 12) {
        message = "Guten Morgen";
    } else if (hour >= 12 && hour < 18) {
        message = "Guten Tag";
    } else if (hour >= 18 && hour < 22) {
        message = "Guten Abend";
    } else {
        message = "Gute Nacht"; // 22:00 bis 04:59
    }

    // 3. Im HTML ausgeben (mit fettem Namen für den Look)
    greetingElement.innerHTML = `${message}, <span class="text-white font-bold">${displayIdent}</span>`;
}

function initCarouselObserver() {
    const carousel = document.getElementById('stats-carousel');
    const cards = document.querySelectorAll('.stats-card');
    
    if (!carousel || cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Karte ist im Fokus -> Klasse hinzufügen
                entry.target.classList.add('active');
            } else {
                // Karte verlässt den Fokus -> Klasse entfernen
                entry.target.classList.remove('active');
            }
        });
    }, { 
        root: carousel, 
        threshold: 0.6, // Karte muss zu 60% sichtbar sein
        rootMargin: "0px" 
    });

    cards.forEach(card => observer.observe(card));
}

async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const overlay = document.getElementById('auth-overlay');

    if (session) {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);
        setupProfile(session.user);
        loadDex(); 
        updateGreeting();
        setTimeout(() => initCarouselObserver(), 100); 
    } else {
        overlay.classList.remove('hidden');
        overlay.classList.remove('opacity-0');
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.innerText = "Zugriff verweigert";
        errorEl.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(50);
    } else {
        errorEl.classList.add('hidden');
        checkUser(); 
    }
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) window.location.reload();
}

// ==========================================
// 3. NAVIGATION
// ==========================================

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('text-purple-500', btn.id === `btn-${tabId}`);
        btn.classList.toggle('text-zinc-500', btn.id !== `btn-${tabId}`);
    });

    if (navigator.vibrate) navigator.vibrate(5);
    window.scrollTo(0, 0);
}

// ==========================================
// 4. DATEN LADEN
// ==========================================

let globalSnusData = []; 
let globalUserCollection = {}; 

async function loadDex() {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            const { data: myCollection } = await supabaseClient
                .from('user_collections')
                .select('snus_id, collected_at, rating_taste, rating_smell, rating_bite, rating_drip, rating_visuals')
                .eq('user_id', user.id);
            
            globalUserCollection = {};
            if (myCollection) {
                myCollection.forEach(item => {
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

        const { data: snusItems, error } = await supabaseClient.from('snus_items').select('*').order('id', { ascending: true });
        if (error) throw error;
        
        globalSnusData = snusItems; 
        updateLivePerformance();
        renderDexGrid(globalSnusData);
    } catch (error) { console.error("Supabase-Fehler:", error); }
}

function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    if(!grid) return;
    grid.innerHTML = ''; 

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-3 text-center py-20 opacity-30 text-[10px] uppercase tracking-[0.2em]">Nichts gefunden 🧊</div>`;
        return;
    }

    items.forEach(snus => {
        const isUnlocked = !!globalUserCollection[snus.id]; 
        const rarityClass = (snus.rarity || 'common').toLowerCase(); 

        const card = `
            <div onclick="openSnusDetail(${snus.id})" class="dex-card ${isUnlocked ? 'unlocked rarity-' + rarityClass : 'locked'} relative flex flex-col items-center p-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] transition-all active:scale-95 cursor-pointer">
                <span class="absolute top-3 left-3 text-[10px] font-mono opacity-30">#${String(snus.id).padStart(3, '0')}</span>
                <div class="w-full aspect-square flex items-center justify-center p-2 mb-2">
                    <img src="${GITHUB_BASE}${snus.image}" alt="${snus.name}" class="w-full h-full object-contain ${!isUnlocked ? 'brightness-0 opacity-40' : ''}" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=NO+IMG'">
                </div>
                <h5 class="text-[0.75rem] font-bold uppercase tracking-tight text-center truncate w-full ${isUnlocked ? 'text-' + rarityClass : 'text-zinc-500'}">${snus.name}</h5>
                <p class="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-widest">${snus.nicotine} MG/G</p>
            </div>
        `;
        grid.innerHTML += card;
    });
}

function updateLivePerformance() {
    let totalMg = 0, pouchCount = 0, latestSnusName = "Keine";

    const collectedItems = globalSnusData.filter(snus => !!globalUserCollection[snus.id]);
    pouchCount = collectedItems.length;

    if (pouchCount > 0) {
        collectedItems.sort((a, b) => {
            const dateA = globalUserCollection[a.id].date ? new Date(globalUserCollection[a.id].date) : new Date(0);
            const dateB = globalUserCollection[b.id].date ? new Date(globalUserCollection[b.id].date) : new Date(0);
            return dateB - dateA;
        });
        latestSnusName = collectedItems[0].name;
    }

    collectedItems.forEach(snus => totalMg += (snus.nicotine || 0));

    const flowEl = document.getElementById('stat-flow');
    const countEl = document.getElementById('stat-count');
    const streakEl = document.getElementById('stat-streak');

    if(flowEl) flowEl.innerText = `${totalMg.toLocaleString()} MG`;
    if(countEl) countEl.innerText = pouchCount;
    if(streakEl) streakEl.innerText = latestSnusName;
}

// ==========================================
// 5. HELPER, UI & RATING ENGINE
// ==========================================

// Globale Variable für temporäre Ratings
let tempRatings = { taste: 5, smell: 5, bite: 5, drip: 5, visuals: 5 };

function initRatingRows() {
    const categories = ['taste', 'smell', 'bite', 'drip', 'visuals'];
    categories.forEach(cat => {
        const row = document.getElementById(`row-${cat}`);
        if(!row) return; // Airbag: Falls das HTML fehlt, crasht es hier nicht!
        
        row.innerHTML = `<div class="rating-pill" id="pill-${cat}"></div>`;
        for(let i = 1; i <= 10; i++) {
            const btn = document.createElement('div');
            btn.className = `rating-btn ${i === 5 ? 'active' : 'inactive'}`;
            btn.innerText = i;
            btn.onclick = () => setRating(cat, i);
            row.appendChild(btn);
        }
        updatePill(cat, 5);
        tempRatings[cat] = 5; 
    });
}

function setRating(category, value) {
    tempRatings[category] = value;
    updatePill(category, value);
    
    const row = document.getElementById(`row-${category}`);
    if(row) {
        row.querySelectorAll('.rating-btn').forEach((btn, idx) => {
            btn.className = `rating-btn ${idx + 1 === value ? 'active' : 'inactive'}`;
        });
        row.parentElement.querySelector('.rating-val').innerText = `${value}/10`;
    }
    if (navigator.vibrate) navigator.vibrate(5);
}

function updatePill(category, value) {
    const pill = document.getElementById(`pill-${category}`);
    if(pill) pill.style.transform = `translateX(${(value - 1) * 100}%)`;
}

// Die Airbag-Versionen der View-Umschalter
function showInfoView() {
    hideAllViews();
    document.getElementById('modal-view-info').classList.remove('hidden');
}

function showRatingView() {
    hideAllViews();
    document.getElementById('modal-view-rating').classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate(8);
}

function showSavedRating() {
    hideAllViews();
    document.getElementById('modal-view-saved-rating').classList.remove('hidden');

    // DATEN AIRBAG: Holt das gespeicherte Objekt
    let userData = globalUserCollection[currentSelectedSnusId];
    
    // Standard-Werte (Falls alter Snus ohne Rating gespeichert wurde)
    let ratings = { taste: 5, smell: 5, bite: 5, drip: 5, visuals: 5 };
    
    // Wenn es ein echtes Objekt ist und Ratings hat, nehmen wir die echten Daten
    if (userData && typeof userData === 'object' && userData.ratings) {
        ratings = userData.ratings;
    }

    const rContainer = document.getElementById('saved-rating-bars');
    if (!rContainer) return;
    
    // HTML für die Balken generieren
    const createBar = (label, val) => `
        <div class="mb-3">
            <div class="flex justify-between text-[10px] uppercase tracking-widest mb-1">
                <span class="text-zinc-400">${label}</span>
                <span class="text-purple-400 font-bold">${val}/10</span>
            </div>
            <div class="w-full bg-zinc-800 rounded-full h-1.5">
                <div class="bg-purple-500 h-1.5 rounded-full" style="width: ${val * 10}%"></div>
            </div>
        </div>
    `;

    // HTML in die leere Box schießen
    rContainer.innerHTML = 
        createBar("Geschmack", ratings.taste) +
        createBar("Geruch", ratings.smell) +
        createBar("Bite", ratings.bite) +
        createBar("Drip", ratings.drip) +
        createBar("Visuals", ratings.visuals);
}

// ... Admin und Profil Code bleibt unangetastet ...
function setupProfile(user) {
    document.getElementById('profile-email').innerText = user.email.split('@')[0]; 
    document.getElementById('user-initials').innerText = user.email.substring(0, 1).toUpperCase();
    if (user.email === 'tarayannorman@gmail.com') document.getElementById('admin-panel')?.classList.remove('hidden');
    loadUserStats(user.id);
}

async function loadUserStats(userId) {
    const { count } = await supabaseClient.from('user_collections').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    document.getElementById('score').innerText = (count ? count * 100 : 0).toLocaleString();
    document.getElementById('pouch-count').innerText = count || 0;
}

// ==========================================
// 9. POP-UP LOGIK (MODAL) & SAMMELN
// ==========================================

let currentSelectedSnusId = null; 

function openSnusDetail(id) {
    const snus = globalSnusData.find(s => s.id === id);
    if (!snus) return;

    currentSelectedSnusId = id; 

    document.getElementById('modal-id').innerText = `#${String(snus.id).padStart(3, '0')}`;
    document.getElementById('modal-name').innerText = snus.name;
    document.getElementById('modal-nicotine').innerText = `${snus.nicotine} MG/G`;
    document.getElementById('modal-image').src = `${GITHUB_BASE}${snus.image}`;
    document.getElementById('modal-rarity-text').innerText = snus.rarity || 'Common';

    const flavorContainer = document.getElementById('modal-flavors');
    if(flavorContainer) {
        flavorContainer.innerHTML = ''; 
        if (snus.flavor && Array.isArray(snus.flavor)) {
            snus.flavor.forEach(f => {
                flavorContainer.innerHTML += `<span class="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-[9px] uppercase tracking-widest text-zinc-400">${f}</span>`;
            });
        }
    }

    const rarityClass = snus.rarity ? snus.rarity.toLowerCase() : 'common';
    document.getElementById('modal-name').className = `text-3xl font-black uppercase tracking-tighter mb-1 text-center text-${rarityClass}`; 
    document.getElementById('modal-rarity-dot').className = `w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] bg-${rarityClass}`; 

    // UI Reset und Slider aufbauen
    showInfoView();
    initRatingRows();

    const btn = document.getElementById('start-collect-btn');
    const collectedStatus = document.getElementById('modal-collected-status');
    const dateText = document.getElementById('modal-unlocked-date');

    if (globalUserCollection[id]) {
        if(btn) btn.classList.add('hidden');
        if(collectedStatus) collectedStatus.classList.remove('hidden');
        
        const dateObj = new Date(globalUserCollection[id].date || new Date());
        if(dateText) dateText.innerText = `UNLOCKED ON ${dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    } else {
        if(btn) btn.classList.remove('hidden');
        if(collectedStatus) collectedStatus.classList.add('hidden');
    }

    const modal = document.getElementById('snus-modal');
    if (!modal) return; 

    modal.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modal-backdrop')?.classList.add('active'); 
        document.getElementById('snus-modal-card')?.classList.remove('translate-y-full'); 
    }, 10);
    
    if (navigator.vibrate) navigator.vibrate(10);
}

function closeSnusDetail() {
    document.getElementById('modal-backdrop')?.classList.remove('active'); 
    document.getElementById('snus-modal-card')?.classList.add('translate-y-full'); 
    
    // Status und Rating View für nächstes Mal zurücksetzen
    setTimeout(() => {
        document.getElementById('snus-modal')?.classList.add('hidden');
        document.getElementById('modal-view-saved-rating')?.classList.add('hidden');
        document.getElementById('modal-view-info')?.classList.remove('hidden');
    }, 400);
}

function hideAllViews() {
    document.getElementById('modal-view-info').classList.add('hidden');
    document.getElementById('modal-view-rating').classList.add('hidden');
    document.getElementById('modal-view-saved-rating').classList.add('hidden');
}

async function collectCurrentSnus() {
    if (!currentSelectedSnusId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Du musst eingeloggt sein!");

    const btn = document.getElementById('final-collect-btn');
    if(btn) { btn.innerText = "SAVING..."; btn.disabled = true; }

    // Zieht die Daten jetzt aus dem JS Objekt statt aus den HTML Slidern
    const { data, error } = await supabaseClient
        .from('user_collections')
        .insert([{ 
            user_id: user.id, 
            snus_id: currentSelectedSnusId,
            rating_taste: tempRatings.taste,
            rating_smell: tempRatings.smell,
            rating_bite: tempRatings.bite,
            rating_drip: tempRatings.drip,
            rating_visuals: tempRatings.visuals
        }])
        .select()
        .single();

    if (error) {
        console.error("Fehler:", error);
        alert("Konnte nicht hinzugefügt werden.");
        if(btn) { btn.innerText = "COLLECT & SAVE"; btn.disabled = false; }
        return;
    }

    if (navigator.vibrate) navigator.vibrate([50, 50, 100]); 
    
    globalUserCollection[currentSelectedSnusId] = {
        date: data ? data.collected_at : new Date().toISOString(),
        ratings: { ...tempRatings }
    };
    
    await loadUserStats(user.id);
    updateLivePerformance(); 
    filterDex(); 

    closeSnusDetail();
    
    setTimeout(() => {
        if(btn) { btn.innerText = "COLLECT & SAVE"; btn.disabled = false; }
    }, 500);
}

// ==========================================
// 10. SUCHE & INITIALISIERUNG
// ==========================================

function filterDex() {
    const searchInput = document.getElementById('dex-search');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!globalSnusData || globalSnusData.length === 0) return;

    const filteredItems = globalSnusData.filter(snus => {
        const nameMatch = snus.name && snus.name.toLowerCase().includes(searchTerm);
        const flavorMatch = snus.flavor && Array.isArray(snus.flavor) && 
                            snus.flavor.some(f => f.toLowerCase().includes(searchTerm));
        return nameMatch || flavorMatch;
    });

    renderDexGrid(filteredItems);
}

document.addEventListener('DOMContentLoaded', () => checkUser());