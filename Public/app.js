// ==========================================
// 1. SETUP & KONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/'; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. AUTHENTIFIZIERUNG (LOGIN/LOGOUT)
// ==========================================

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
        
        console.log("Access Granted: ", session.user.email);
    } else {
        overlay.classList.remove('hidden');
        overlay.classList.remove('opacity-0');
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

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
// 3. NAVIGATION (TAB SYSTEM MIT ANIMATION FIX)
// ==========================================

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) {
        activeTab.classList.remove('hidden');
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.id === `btn-${tabId}`) {
            btn.classList.add('text-purple-500');
            btn.classList.remove('text-zinc-500');
        } else {
            btn.classList.add('text-zinc-500');
            btn.classList.remove('text-purple-500');
        }
    });

    if (navigator.vibrate) navigator.vibrate(5);
    window.scrollTo(0, 0);
}

// ==========================================
// 4. DATEN LADEN (DEX & STATS)
// ==========================================

let globalSnusData = []; 
let globalUserCollection = {}; // Speichert ID und Unlock-Date { id: "datum" }

async function loadDex() {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // 1. Eigene Collection laden
        if (user) {
            const { data: myCollection } = await supabaseClient
                .from('user_collections')
                .select('snus_id, collected_at')
                .eq('user_id', user.id);
            
            globalUserCollection = {};
            if (myCollection) {
                myCollection.forEach(item => {
                    globalUserCollection[item.snus_id] = item.collected_at;
                });
            }
        }

        // 2. Master DB laden
        const { data: snusItems, error } = await supabaseClient
            .from('snus_items')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        
        globalSnusData = snusItems; 
        
        // 3. Live Stats und Grid bauen
        updateLivePerformance();
        renderDexGrid(globalSnusData);

    } catch (error) {
        console.error("Supabase-Fehler:", error);
    }
}

// Zeichnet das Grid (für loadDex und filterDex genutzt)
function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    grid.innerHTML = ''; 

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-3 text-center py-20 opacity-30 text-[10px] uppercase tracking-[0.2em]">Nichts gefunden 🧊</div>`;
        return;
    }

    items.forEach(snus => {
        const isUnlocked = !!globalUserCollection[snus.id]; 
        const rarityClass = snus.rarity ? snus.rarity.toLowerCase() : 'common'; 

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
    let totalMg = 0;
    let pouchCount = 0;
    let latestSnusName = "Keine";

    const collectedItems = globalSnusData.filter(snus => !!globalUserCollection[snus.id]);
    pouchCount = collectedItems.length;

    if (pouchCount > 0) {
        collectedItems.sort((a, b) => new Date(globalUserCollection[b.id]) - new Date(globalUserCollection[a.id]));
        latestSnusName = collectedItems[0].name;
    }

    collectedItems.forEach(snus => {
        totalMg += (snus.nicotine || 0);
    });

    const flowEl = document.getElementById('stat-flow');
    const countEl = document.getElementById('stat-count');
    const streakEl = document.getElementById('stat-streak');

    if(flowEl) flowEl.innerText = `${totalMg.toLocaleString()} MG`;
    if(countEl) countEl.innerText = pouchCount;
    if(streakEl) streakEl.innerText = latestSnusName;
}

async function loadUserStats(userId) {
    try {
        const { count, error: collectionError } = await supabaseClient
            .from('user_collections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        let pouchCount = 0;
        let totalXp = 0;

        if (!collectionError && count !== null) {
            pouchCount = count;
            totalXp = count * 100;
        }

        const scoreElement = document.getElementById('score');
        const pouchCountEl = document.getElementById('pouch-count');

        if (scoreElement) scoreElement.innerText = totalXp.toLocaleString();
        if (pouchCountEl) pouchCountEl.innerText = pouchCount;

    } catch (e) {
        console.error("Fehler beim Laden der User-Stats", e);
    }
}

// ==========================================
// 5. HELPER & UI FUNCTIONS
// ==========================================

function setupProfile(user) {
    const emailField = document.getElementById('profile-email');
    if (emailField) {
        emailField.innerText = user.email.split('@')[0]; 
    }

    const initialsField = document.getElementById('user-initials');
    if (initialsField) {
        initialsField.innerText = user.email.substring(0, 1).toUpperCase();
    }

    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        if (user.email === 'tarayannorman@gmail.com') {
            adminPanel.classList.remove('hidden');
        } else {
            adminPanel.classList.add('hidden');
        }
    }
    
    loadUserStats(user.id);
}

function startScanner() {
    alert("Kamera wird gestartet... (Feature folgt)");
}

// ==========================================
// 6. ADMIN FUNKTIONEN
// ==========================================

async function adminAddSnus() {
    const name = document.getElementById('admin-name').value;
    const nicotine = document.getElementById('admin-nicotine').value;
    const rarity = document.getElementById('admin-rarity').value;
    const barcode = document.getElementById('admin-barcode').value;
    const image = document.getElementById('admin-image').value;
    
    // Flavor einlesen und splitten
    const flavorInput = document.getElementById('admin-flavor').value; 
    const flavorArray = flavorInput ? flavorInput.split(',').map(f => f.trim()) : [];

    if(!name || !nicotine) return alert("Bitte Name und Nikotin eingeben!");

    const btn = document.querySelector('button[onclick="adminAddSnus()"]');
    const originalText = btn.innerText;
    btn.innerText = "SPEICHERE...";
    btn.disabled = true;

    const { error } = await supabaseClient
        .from('snus_items')
        .insert([{ 
            name: name, 
            nicotine: parseInt(nicotine), 
            rarity: rarity, 
            barcode: barcode || null,
            image: image || 'placeholder.png',
            flavor: flavorArray
        }]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        alert("Fehler: " + error.message);
    } else {
        alert("Erfolgreich hinzugefügt! 🚀");
        document.getElementById('admin-name').value = '';
        document.getElementById('admin-barcode').value = '';
        document.getElementById('admin-image').value = '';
        document.getElementById('admin-flavor').value = '';
        
        loadDex(); 
    }
}

// ==========================================
// 7. ANIMATION & INTERAKTIONEN
// ==========================================

function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;
    const hour = new Date().getHours();
    let message = (hour < 12) ? "Guten Morgen" : (hour < 18) ? "Guten Tag" : "Guten Abend";
    greetingElement.innerText = `${message}, HazeCC`;
}

function initCarouselObserver() {
    const carousel = document.getElementById('stats-carousel');
    const cards = document.querySelectorAll('.stats-card');
    if (!carousel || cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                if (navigator.vibrate) navigator.vibrate(5);
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, { root: carousel, threshold: 0.6 });

    cards.forEach(card => observer.observe(card));
}

// ==========================================
// 8. INITIALISIERUNG
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    checkUser(); 
});

// ==========================================
// 9. POP-UP LOGIK (MODAL) & SAMMELN
// ==========================================

let currentSelectedSnusId = null; 

function openSnusDetail(id) {
    const snus = globalSnusData.find(s => s.id === id);
    if (!snus) return;

    currentSelectedSnusId = id; 

    // HTML füllen
    document.getElementById('modal-id').innerText = `#${String(snus.id).padStart(3, '0')}`;
    document.getElementById('modal-name').innerText = snus.name;
    document.getElementById('modal-nicotine').innerText = `${snus.nicotine} MG/G`;
    document.getElementById('modal-rarity-text').innerText = snus.rarity;
    document.getElementById('modal-image').src = `${GITHUB_BASE}${snus.image}`;

    // Flavors als Tags
    const flavorContainer = document.getElementById('modal-flavors');
    flavorContainer.innerHTML = ''; 
    if (snus.flavor && Array.isArray(snus.flavor)) {
        snus.flavor.forEach(f => {
            flavorContainer.innerHTML += `<span class="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-[9px] uppercase tracking-widest text-zinc-400">${f}</span>`;
        });
    }

    // Farben anpassen
    const rarityClass = snus.rarity ? snus.rarity.toLowerCase() : 'common';
    document.getElementById('modal-name').className = `text-3xl font-black uppercase tracking-tighter mb-1 text-${rarityClass}`; 
    document.getElementById('modal-rarity-dot').className = `w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] bg-${rarityClass}`; 

    // Status / Datum prüfen
    const btn = document.getElementById('collect-btn');
    const collectedText = document.getElementById('collected-text');
    const dateText = document.getElementById('modal-unlocked-date');

    if (globalUserCollection[id]) {
        btn.classList.add('hidden');
        collectedText.classList.remove('hidden');
        
        const dateObj = new Date(globalUserCollection[id]);
        const formattedDate = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        dateText.innerText = `UNLOCKED ON ${formattedDate}`; // Schön groß geschrieben
        dateText.classList.remove('hidden');
    } else {
        btn.classList.remove('hidden');
        collectedText.classList.add('hidden');
        dateText.classList.add('hidden');
    }

    // Animation starten
    const modal = document.getElementById('snus-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');
    
    if (!backdrop || !card) return; 

    modal.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.add('active'); 
        card.classList.remove('translate-y-full'); 
    }, 10);
    
    if (navigator.vibrate) navigator.vibrate(10);
}

function closeSnusDetail() {
    const modal = document.getElementById('snus-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');
    
    if (!backdrop || !card) return;

    backdrop.classList.remove('active'); 
    card.classList.add('translate-y-full'); 
    
    setTimeout(() => modal.classList.add('hidden'), 400);
}

async function collectCurrentSnus() {
    if (!currentSelectedSnusId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Du musst eingeloggt sein!");

    const btn = document.getElementById('collect-btn');
    btn.innerText = "WIRD GESAMMELT...";
    btn.disabled = true;

    const { data, error } = await supabaseClient
        .from('user_collections')
        .insert([{ user_id: user.id, snus_id: currentSelectedSnusId }])
        .select()
        .single();

    if (error) {
        console.error("Fehler:", error);
        alert("Konnte nicht hinzugefügt werden.");
        btn.innerText = "ZUR SAMMLUNG HINZUFÜGEN";
        btn.disabled = false;
        return;
    }

    if (navigator.vibrate) navigator.vibrate([50, 50, 100]); 
    
    globalUserCollection[currentSelectedSnusId] = data ? data.collected_at : new Date().toISOString();
    
    await loadUserStats(user.id);
    updateLivePerformance(); 
    filterDex(); 

    closeSnusDetail();
    
    setTimeout(() => {
        btn.innerText = "ZUR SAMMLUNG HINZUFÜGEN";
        btn.disabled = false;
    }, 500);
}

// ==========================================
// 10. SUCHE & FILTER LOGIK
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