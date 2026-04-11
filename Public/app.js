// Neuer Commit 15:26:42


// ==========================================
// 1. SETUP & KONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/'; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. AUTHENTIFIZIERUNG & GREETING
// ==========================================

// ==========================================
// GREETING LOGIK (Zeit & Name)
// ==========================================
async function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;

    // 1. Session holen
    const { data: { session } } = await supabaseClient.auth.getSession();
    let displayIdent = "Collector";
    
    if (session && session.user && session.user.email) {
        // Alles vor dem @ nehmen und den ersten Buchstaben groß machen
        let rawName = session.user.email.split('@')[0];
        displayIdent = rawName.charAt(0).toUpperCase() + rawName.slice(1);
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

    // 3. Im HTML ausgeben (Nachricht in Grau, Name in Weiß und Fett)
    greetingElement.innerHTML = `${message}, <span class="text-white font-semibold">${displayIdent}</span>`;
}

async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const overlay = document.getElementById('auth-overlay');

    if (session) {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);
        
        setupProfile(session.user);
        
        // WICHTIG: await verhindert das Aufhängen! 
        // Erst Dex laden, DANN Usage laden.
        loadDex(); 
        loadUsageData(); 
        
        updateGreeting();
    } else {
        overlay.classList.remove('hidden', 'opacity-0');
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        errorEl.innerText = "Falsches Passwort oder E-Mail";
        errorEl.classList.remove('hidden');
        triggerHapticFeedback();
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
}

// ==========================================
// 4. DATEN LADEN & RENDERN
// ==========================================

let globalSnusData = []; 
let globalUserCollection = {}; 

async function loadDex() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data: myCol } = await supabaseClient.from('user_collections').select('*').eq('user_id', user.id);
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

    const { data: snusItems } = await supabaseClient.from('snus_items').select('*').order('id', { ascending: true });
    globalSnusData = snusItems || []; 
    updateLivePerformance();
    renderDexGrid(globalSnusData);
    loadTopSnusOfWeek();
    
    if (user) {
        await loadUsageLogs(user.id);
    }
}

function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    grid.innerHTML = ''; 
    
    items.forEach(snus => {
        const isUnlocked = !!globalUserCollection[snus.id]; 
        grid.innerHTML += `
            <div onclick="openSnusDetail(${snus.id})" class="relative flex flex-col bg-[#1C1C1E] rounded-[20px] transition-all active:scale-95 cursor-pointer shadow-sm border border-white/5 overflow-hidden ${!isUnlocked ? 'opacity-50 grayscale hover:opacity-75' : ''}">
                
                ${!isUnlocked ? `
                <div class="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-md z-10">
                    <svg class="w-3 h-3 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
                </div>
                ` : ''}

                <div class="w-full aspect-[4/3] flex items-center justify-center p-3 bg-gradient-to-b from-white/5 to-transparent relative">
                    <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain drop-shadow-xl z-0" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                </div>
                
                <div class="p-3 pt-1 text-center bg-[#1C1C1E] flex-1 flex items-center justify-center">
                    <h5 class="text-[13px] font-medium leading-[1.2] line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5>
                </div>
            </div>
        `;
    });
}

function updateLivePerformance() {
    const collectedItems = globalSnusData.filter(snus => !!globalUserCollection[snus.id]);
    
    collectedItems.sort((a, b) => new Date(globalUserCollection[b.id].date) - new Date(globalUserCollection[a.id].date));

    // UPDATE: Nur noch die 'Collection' (Total Pouches) updaten!
    // stat-flow (Nikotin) lassen wir in Ruhe, das macht die andere Funktion.
    const countEl = document.getElementById('stat-count');
    if(countEl) countEl.innerText = collectedItems.length;

    const listEl = document.getElementById('latest-unlocks-list');
    if(!listEl) return;
    
    listEl.innerHTML = '';
    if(collectedItems.length === 0) {
        listEl.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[15px]">No transactions yet.</div>';
        return;
    }

    collectedItems.slice(0, 5).forEach(snus => {
        const dateObj = new Date(globalUserCollection[snus.id].date);
        const dateStr = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
        
        listEl.innerHTML += `
            <div class="flex items-center justify-between p-3 border-b border-white/5 last:border-0 cursor-pointer active:bg-white/5 transition-colors" onclick="openSnusDetail(${snus.id})">
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
    });
}

// ==========================================
// 5. RATING ENGINE & MODAL LOGIK
// ==========================================

let tempRatings = { taste: 5, smell: 5, bite: 5, drip: 5, visuals: 5 };
let currentSelectedSnusId = null; 

function initRatingRows() {
    ['taste', 'smell', 'bite', 'drip', 'visuals'].forEach(cat => {
        const row = document.getElementById(`row-${cat}`);
        if(!row) return;
        row.innerHTML = `<div class="rating-pill" id="pill-${cat}"></div>`;
        for(let i = 1; i <= 10; i++) {
            const btn = document.createElement('div');
            btn.className = `rating-btn ${i === 5 ? 'active' : 'inactive'}`;
            btn.innerText = i;
            btn.onclick = () => setRating(cat, i);
            row.appendChild(btn);
        }
        updatePill(cat, 5); tempRatings[cat] = 5; 
    });
}

function setRating(category, value) {
    tempRatings[category] = value;
    updatePill(category, value);
    const row = document.getElementById(`row-${category}`);
    row.querySelectorAll('.rating-btn').forEach((btn, idx) => {
        btn.className = `rating-btn ${idx + 1 === value ? 'active' : 'inactive'}`;
    });
    row.parentElement.querySelector('.rating-val').innerText = `${value}/10`;
    triggerHapticFeedback();
}

function updatePill(cat, val) { 
    document.getElementById(`pill-${cat}`).style.transform = `translateX(${(val - 1) * 100}%)`; 
}

function showInfoView() { hideAllViews(); document.getElementById('modal-view-info').classList.remove('hidden'); }
function showRatingView() { hideAllViews(); document.getElementById('modal-view-rating').classList.remove('hidden'); }

function showSavedRating() {
    hideAllViews();
    document.getElementById('modal-view-saved-rating').classList.remove('hidden');
    let ratings = globalUserCollection[currentSelectedSnusId]?.ratings || { taste: 5, smell: 5, bite: 5, drip: 5, visuals: 5 };
    
    const createBar = (label, val) => `
        <div>
            <div class="flex justify-between text-[13px] text-[#8E8E93] mb-1"><span>${label}</span><span class="text-white">${val}/10</span></div>
            <div class="w-full bg-black rounded-full h-1.5"><div class="bg-white h-1.5 rounded-full" style="width: ${val * 10}%"></div></div>
        </div>`;
    
    document.getElementById('saved-rating-bars').innerHTML = 
        createBar("Taste", ratings.taste) + 
        createBar("Smell", ratings.smell) + 
        createBar("Bite", ratings.bite) + 
        createBar("Drip", ratings.drip) + 
        createBar("Visuals", ratings.visuals);
}

function hideAllViews() {
    document.getElementById('modal-view-info').classList.add('hidden');
    document.getElementById('modal-view-rating').classList.add('hidden');
    document.getElementById('modal-view-saved-rating').classList.add('hidden');
}

function openSnusDetail(id) {
    const snus = globalSnusData.find(s => s.id === id);
    if (!snus) return;
    currentSelectedSnusId = id; 

    document.getElementById('modal-name').innerText = snus.name;
    document.getElementById('modal-nicotine').innerText = `${snus.nicotine} MG/G • ${snus.rarity || 'Common'}`;
    document.getElementById('modal-image').src = `${GITHUB_BASE}${snus.image}`;
    document.body.classList.add('overflow-hidden'); 

    showInfoView(); 
    initRatingRows();

    const isUnlocked = globalUserCollection[id];
    document.getElementById('uncollected-action-group').classList.toggle('hidden', !!isUnlocked);
    document.getElementById('modal-collected-status').classList.toggle('hidden', !isUnlocked);

    if (isUnlocked) {
        const dateObj = new Date(isUnlocked.date);
        document.getElementById('modal-unlocked-date').innerText = `Added on ${dateObj.toLocaleDateString()}`;
    }

    document.getElementById('snus-modal').classList.remove('hidden');
    setTimeout(() => {
        const backdrop = document.getElementById('modal-backdrop');
        const card = document.getElementById('snus-modal-card');
        
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        
        card.classList.remove('translate-y-full');
        card.classList.add('translate-y-0');
    }, 10);
    
    triggerHapticFeedback();
}

function closeSnusDetail() {
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    
    card.classList.remove('translate-y-0');
    card.classList.add('translate-y-full');
    
    document.body.classList.remove('overflow-hidden');function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    grid.innerHTML = ''; 
    
    items.forEach(snus => {
        const isUnlocked = !!globalUserCollection[snus.id]; 
        
        // ID formatieren (z.B. aus 22 wird #022)
        const formattedId = '#' + String(snus.id).padStart(3, '0');
        
        // Rarity abrufen und formatieren (Fallback ist 'common')
        const rarity = (snus.rarity || 'common').toLowerCase();
        
        grid.innerHTML += `
            <div onclick="openSnusDetail(${snus.id})" class="relative flex flex-col bg-[#2A2A2E] rounded-[20px] transition-all active:scale-95 cursor-pointer shadow-md border border-white/20 overflow-hidden ${!isUnlocked ? 'opacity-40 grayscale hover:opacity-60' : ''}">
                
                <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                    <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                    <span class="text-[10px] font-bold tracking-wide" style="color: var(--${rarity}, var(--common)); text-shadow: 0px 0px 8px var(--${rarity}, var(--common));">${rarity}</span>
                </div>

                ${!isUnlocked ? `
                <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div class="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-md">
                        <svg class="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
                    </div>
                </div>
                ` : ''}

                <div class="w-full aspect-square flex items-center justify-center relative mt-1">
                    <div class="absolute w-[75%] aspect-square bg-[#D9D9D9]/20 rounded-full z-0"></div>
                    <img src="${GITHUB_BASE}${snus.image}" class="w-[80%] h-[80%] object-contain drop-shadow-xl z-10" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                </div>
                
                <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                    <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5>
                </div>
                
            </div>
        `;
    });
}
    setTimeout(() => {
        document.getElementById('snus-modal').classList.add('hidden');
        hideAllViews(); 
        document.getElementById('modal-view-info').classList.remove('hidden');
    }, 400);
}

// ==========================================
// 6. DB INSERT (BUG GEFIXT)
// ==========================================

async function collectCurrentSnus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const btn = document.getElementById('final-collect-btn');
    btn.innerText = "Processing..."; btn.disabled = true;

    // FIX: Explizite Zuordnung der Tabellen-Spalten zu den JS Variablen
    const { data, error } = await supabaseClient.from('user_collections').insert([{ 
        user_id: user.id, 
        snus_id: currentSelectedSnusId, 
        rating_taste: tempRatings.taste,
        rating_smell: tempRatings.smell,
        rating_bite: tempRatings.bite,
        rating_drip: tempRatings.drip,
        rating_visuals: tempRatings.visuals
    }]).select().single();

    if (!error) {
        globalUserCollection[currentSelectedSnusId] = { date: data.collected_at, ratings: { ...tempRatings } };
        
        await startNewCan(currentSelectedSnusId);

        await loadUserStats(user.id); 
        updateLivePerformance(); 
        renderDexGrid(globalSnusData);
        closeSnusDetail();
    } else {
        alert("Fehler beim Speichern: " + error.message);
    }
    
    setTimeout(() => { btn.innerText = "Confirm"; btn.disabled = false; }, 500);
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

    const { data, error } = await supabaseClient.from('snus_items').insert([{
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
    const { count } = await supabaseClient.from('user_collections').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const scoreEl = document.getElementById('score');
    const pouchEl = document.getElementById('pouch-count');
    if(scoreEl) scoreEl.innerText = count * 100;
    if(pouchEl) pouchEl.innerText = count || 0;
}

function filterDex() {
    const term = document.getElementById('dex-search').value.toLowerCase();
    renderDexGrid(globalSnusData.filter(s => s.name?.toLowerCase().includes(term) || s.flavor?.some(f => f.toLowerCase().includes(term))));
}

function setupProfile(user) {
    const emailEl = document.getElementById('profile-email');
    const initialsEl = document.getElementById('user-initials');
    const adminEl = document.getElementById('admin-panel');
    
    if(emailEl) emailEl.innerText = user.email; 
    if(initialsEl) initialsEl.innerText = user.email[0].toUpperCase();
    if (user.email === 'tarayannorman@gmail.com' && adminEl) {
        adminEl.classList.remove('hidden');
    }
    loadUserStats(user.id);
}

function triggerHapticFeedback() {
    if (window.webkit && window.webkit.messageHandlers.hapticHandler) window.webkit.messageHandlers.hapticHandler.postMessage("vibrate");
    else if (navigator.vibrate) navigator.vibrate(15);
}

function handleLoginWrapper() { triggerHapticFeedback(); handleLogin(); }
function switchTabWrapper(tabId) { triggerHapticFeedback(); switchTab(tabId); }

document.addEventListener('DOMContentLoaded', () => checkUser());

// ==========================================
// 9. TOP SNUS OF THE WEEK & SOCIAL
// ==========================================

async function loadTopSnusOfWeek() {
    // 1. Daten holen (Hier könntest du später noch ein .gte('collected_at', ...) für die letzte Woche einbauen)
    const { data: collections, error } = await supabaseClient
        .from('user_collections')
        .select('snus_id, rating_taste, rating_smell, rating_bite, rating_drip, rating_visuals, rating_strength'); // rating_strength falls vorhanden

    if (error || !collections || collections.length === 0) return;

    const stats = {};

    // 2. Summen bilden
    collections.forEach(item => {
        if (!stats[item.snus_id]) {
            stats[item.snus_id] = { count: 0, taste: 0, smell: 0, bite: 0, drip: 0, visuals: 0, strength: 0 };
        }
        const s = stats[item.snus_id];
        s.count++;
        s.taste += item.rating_taste || 5;
        s.smell += item.rating_smell || 5;
        s.bite += item.rating_bite || 5;
        s.drip += item.rating_drip || 5;
        s.visuals += item.rating_visuals || 5;
        s.strength += item.rating_strength || 5; // Falls du Stärke auch trackst
    });

    // 3. Den Snus mit dem höchsten Gesamtdurchschnitt finden
    let topSnusId = null;
    let highestAverage = 0;

    for (const [id, s] of Object.entries(stats)) {
        // Durchschnitt aller 6 Kategorien für diesen speziellen Snus berechnen
        // Wir teilen die Summe aller Ratings durch (Anzahl der Scans * 6 Kategorien)
        const totalPoints = s.taste + s.smell + s.bite + s.drip + s.visuals + s.strength;
        const currentAvg = totalPoints / (s.count * 6); 

        // Nur Snus berücksichtigen, die z.B. mindestens 2-3 mal bewertet wurden (Vermeidet 10/10 Glückstreffer)
        if (currentAvg > highestAverage) {
            highestAverage = currentAvg;
            topSnusId = id;
        }
    }

    if (!topSnusId) return;

    const topStat = stats[topSnusId];
    const maxCount = topStat.count;

    // 4. Finale Werte für das UI vorbereiten
    const avgRatings = {
        taste: (topStat.taste / maxCount).toFixed(1),
        smell: (topStat.smell / maxCount).toFixed(1),
        bite: (topStat.bite / maxCount).toFixed(1),
        drip: (topStat.drip / maxCount).toFixed(1),
        visuals: (topStat.visuals / maxCount).toFixed(1),
        strength: (topStat.strength / maxCount).toFixed(1)
    };
    
    // Gesamtscore (0-10)
    const overallAvg = (highestAverage).toFixed(1);

    const snusInfo = globalSnusData.find(s => s.id == topSnusId);
    if (snusInfo) {
        renderTopSnus(snusInfo, avgRatings, maxCount, overallAvg);
    }
}

function renderTopSnus(snus, ratings, count, overall) {
    const container = document.getElementById('top-snus-container');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-[#1C1C1E] rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col items-center border border-white/10" onclick="openSnusDetail(${snus.id})">
            <div class="absolute top-4 left-4 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                <span class="text-[12px] font-semibold text-white tracking-wide">🏆 TOP OF THE WEEK</span>
            </div>
            <div class="absolute top-4 right-4">
                <span class="text-[12px] font-medium text-[#8E8E93] bg-black/30 px-2 py-1 rounded-lg">${count} Scans</span>
            </div>
            
            <div class="w-32 h-32 mt-12 mb-4 rounded-full overflow-hidden bg-[#2C2C2E] border-4 border-white/5 shadow-2xl flex-shrink-0">
                <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
            </div>
            
            <h3 class="text-[22px] font-bold text-white tracking-tight">${snus.name}</h3>
            <p class="text-[15px] text-[#8E8E93] mt-1 font-medium">${snus.nicotine} MG/G • ${snus.rarity || 'Common'}</p>
            
            <div class="w-full bg-black/40 rounded-2xl p-5 mt-6 border border-white/5">
                <div class="flex justify-between items-end mb-4">
                    <span class="text-[14px] font-semibold text-white">Community Rating</span>
                    <span class="text-2xl font-bold text-white">${overall}<span class="text-[14px] text-[#8E8E93] font-medium">/10</span></span>
                </div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                    ${createAvgBar('Taste', ratings.taste)}
                    ${createAvgBar('Smell', ratings.smell)}
                    ${createAvgBar('Bite', ratings.bite)}
                    ${createAvgBar('Drip', ratings.drip)}
                    <div class="col-span-2 mt-1">${createAvgBar('Visuals', ratings.visuals)}</div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 10. USAGE LOGS & CONCURRENT CAN TRACKING
// ==========================================

let globalActiveLogs = []; // Array für alle aktuell offenen Dosen

async function startNewCan(snusId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return false;

    // mg_per_gram aus dem globalen Dex ziehen
    const snus = globalSnusData.find(s => s.id == snusId);
    const mgVal = snus ? snus.nicotine : 0;

    const { error } = await supabaseClient
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
    if (btn) { btn.innerText = "Processing..."; btn.disabled = true; }

    const success = await startNewCan(currentSelectedSnusId);

    if (success) {
        closeSnusDetail();
        // Wir wechseln automatisch zum Home/Wallet-Tab, damit der User seine neue Dose sieht!
        switchTab('home'); 
    } else {
        alert("Fehler beim Öffnen. Hast du das SQL-Update (mg_per_gram) in Supabase ausgeführt?");
    }

    if (btn) { btn.innerText = "Open New Can"; btn.disabled = false; }
}

// Zentrale Lade-Funktion für alles, was mit Konsum zu tun hat
async function loadUsageData() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: logs, error } = await supabaseClient
        .from('usage_logs')
        .select('*, snus_items(name, image)')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false });

    if (!error && logs) {
        globalActiveLogs = logs.filter(l => l.is_active === true);
        
        renderActiveCansUI();
        calculateUsageStats(logs);
    }
}

async function finishSpecificCan(logId) {
    triggerHapticFeedback();
    
    const { error } = await supabaseClient
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
        container.innerHTML = '<div class="flex items-center justify-between px-1 py-2"><p class="text-[13px] text-zinc-500">Keine aktiven Dosen.</p><button onclick="openScanModal()" class="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-full text-[13px] font-medium text-white active:bg-white/20 transition-colors tracking-wide">Öffne die nächste<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></button></div>';
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
                        <p class="text-[11px] text-[#8E8E93] uppercase tracking-wider">Aktiv</p>
                    </div>
                </div>
                <button onclick="finishSpecificCan('${can.id}')" class="bg-white text-black text-[11px] font-bold px-4 py-2 rounded-full active:scale-95 transition-transform">
                    EMPTY
                </button>
            </div>
        `;
    });
}

function calculateUsageStats(allLogs) {
    const finishedCans = allLogs.filter(log => !log.is_active && log.finished_at);
    
    // Die HTML Elemente greifen
    const statFlow = document.getElementById('stat-flow');               // Lifetime MG
    const avgPouchesEl = document.getElementById('stat-avg-pouches');    // Pouches / Day
    const avgMgEl = document.getElementById('stat-avg-mg');              // MG / Day
    
    if (finishedCans.length === 0) {
        if(statFlow) statFlow.innerText = `0 MG`;
        if(avgPouchesEl) avgPouchesEl.innerText = '0';
        if(avgMgEl) avgMgEl.innerText = '0 MG';
        return;
    }

    let totalMgHistory = 0;
    let totalPouchesHistory = 0;

    // 1. Alles summieren, was jemals konsumiert wurde (Lifetime)
    finishedCans.forEach(can => {
        const mgPerPouch = (can.mg_per_gram || 0) / 2;
        const mgPerCan = mgPerPouch * (can.pouches_per_can || 20);
        
        totalMgHistory += mgPerCan;
        totalPouchesHistory += (can.pouches_per_can || 20);
    });

    // 2. Den Zeitraum berechnen (Erste Dose bis heute)
    const firstEverLog = finishedCans[finishedCans.length - 1]; 
    const startDate = new Date(firstEverLog.opened_at);
    const today = new Date();
    
    let totalDaysSpan = (today - startDate) / (1000 * 60 * 60 * 24);
    if (totalDaysSpan < 1) totalDaysSpan = 1; // Minimum 1 Tag

    // 3. Tagesdurchschnitt berechnen
    const avgMgPerDay = (totalMgHistory / totalDaysSpan).toFixed(0);
    const avgPouchesPerDay = (totalPouchesHistory / totalDaysSpan).toFixed(1);

    // 4. UI updaten (genau nach deiner Vorgabe)
    if(statFlow) statFlow.innerText = `${totalMgHistory.toLocaleString()} MG`;
    if(avgPouchesEl) avgPouchesEl.innerText = avgPouchesPerDay;
    if(avgMgEl) avgMgEl.innerText = `${avgMgPerDay} MG`;                     
}









let cameraStream = null;

const scanModal = document.getElementById('scan-modal');
const scanModalCard = document.getElementById('scan-modal-card');
const scanModalBackdrop = document.getElementById('scan-modal-backdrop');
const cameraVideo = document.getElementById('camera-stream');


if (scanModal) {
    scanModal.addEventListener('touchmove', (e) => {
        if (!isScanDragging) {
            e.preventDefault(); 
        }
    }, { passive: false });
}


async function openScanModal() {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
    
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
            const [stream] = await Promise.all([
                navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment", aspectRatio: 1/1 }, 
                    audio: false 
                }),
                new Promise(resolve => setTimeout(resolve, 700)) 
            ]);

            cameraStream = stream;
            
            if (cameraVideo) {
                cameraVideo.srcObject = cameraStream;
                
                cameraVideo.onloadedmetadata = () => {
                    document.getElementById('camera-loading').classList.add('opacity-0', 'pointer-events-none');
                    cameraVideo.classList.remove('opacity-0');
                    cameraVideo.classList.add('opacity-100');
                };
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

    setTimeout(() => {
        scanModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        
        if (isDragging) {
            scanModalCard.style.transform = '';
            scanModalCard.style.transition = ''; 
        }
        
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
            if (cameraVideo) cameraVideo.srcObject = null;
        }

        const loadingScreen = document.getElementById('camera-loading');
        const loadingBar = document.getElementById('loading-bar-fill');

        if (loadingScreen) loadingScreen.classList.remove('opacity-0', 'pointer-events-none');
        
        if (loadingBar) {
            loadingBar.style.transition = 'none'; 
            loadingBar.style.width = '0%';
        }

        if (cameraVideo) {
            cameraVideo.classList.remove('opacity-100');
            cameraVideo.classList.add('opacity-0');
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
    }, { passive: true });

    scanModalCard.addEventListener('touchmove', (e) => {
        if (!isScanDragging) return;
        scanCurrentY = e.touches[0].clientY;
        const deltaY = scanCurrentY - scanStartY;

        if (deltaY > 0) {
            scanModalCard.style.transform = `translateY(${deltaY}px)`;
        }
    }, { passive: true });

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


const snusModalCardElement = document.getElementById('snus-modal-card');
let snusStartY = 0;
let snusCurrentY = 0;
let isSnusDragging = false;

if (snusModalCardElement) {
    snusModalCardElement.addEventListener('touchstart', (e) => {
        snusStartY = e.touches[0].clientY;
        isSnusDragging = true;

        snusModalCardElement.style.transition = 'none';
    }, { passive: true });

    snusModalCardElement.addEventListener('touchmove', (e) => {
        if (!isSnusDragging) return;
        snusCurrentY = e.touches[0].clientY;
        const deltaY = snusCurrentY - snusStartY;

        if (deltaY > 0) {
            snusModalCardElement.style.transform = `translateY(${deltaY}px)`;
        }
    }, { passive: true });

    snusModalCardElement.addEventListener('touchend', (e) => {
        if (!isSnusDragging) return;
        isSnusDragging = false;

        const deltaY = snusCurrentY - snusStartY;

        snusModalCardElement.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';

        if (deltaY > 100) {
            snusModalCardElement.style.transform = 'translateY(100%)';

            setTimeout(() => {
                if (typeof closeSnusDetail === 'function') closeSnusDetail(); 

                setTimeout(() => {
                    snusModalCardElement.style.transform = '';
                }, 50);
            }, 400);

        } else {
            snusModalCardElement.style.transform = 'translateY(0px)';

            setTimeout(() => {
                snusModalCardElement.style.transform = '';
            }, 400);
        }
    });
}















let isLoginMode = true;

        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const googleBtnText = document.getElementById('google-btn-text');
        const appleBtnText = document.getElementById('apple-btn-text');
        const registerFields = document.getElementById('register-fields');
        const mainBtn = document.getElementById('auth-main-btn');
        const toggleText = document.getElementById('toggle-text');
        const toggleAction = document.querySelector('#toggle-text + span');
        const errorMsg = document.getElementById('auth-error');
        const mainView = document.getElementById('auth-main-view');
        const verifyView = document.getElementById('auth-verify-view');

        function toggleAuthMode() {
            isLoginMode = !isLoginMode;
            errorMsg.classList.add('hidden');

            if (isLoginMode) {
                title.innerText = "Snusdex Elite";
                subtitle.innerText = "Willkommen zurück";
                googleBtnText.innerText = "Mit Google anmelden";
                appleBtnText.innerText = "Mit Apple anmelden";
                registerFields.classList.add('hidden');
                mainBtn.innerText = "Anmelden";
                toggleText.innerText = "Noch kein Account? ";
                toggleAction.innerText = "Registrieren";
            } else {
                title.innerText = "Snusdex Elite";
                subtitle.innerText = "Erstelle deinen Account";
                googleBtnText.innerText = "Mit Google registrieren";
                appleBtnText.innerText = "Mit Apple registrieren";
                registerFields.classList.remove('hidden');
                mainBtn.innerText = "Registrieren";
                toggleText.innerText = "Bereits einen Account? ";
                toggleAction.innerText = "Anmelden";
            }
        }

        function showVerificationScreen() {
            title.innerText = "E-Mail bestätigen";
            subtitle.innerText = "Fast geschafft!";
            mainView.classList.add('hidden');
            verifyView.classList.remove('hidden');
        }

        function hideVerificationScreen() {
            verifyView.classList.add('hidden');
            mainView.classList.remove('hidden');
            isLoginMode = !isLoginMode; 
            toggleAuthMode(); 
        }

        function handleCodeVerification() {
            const code = document.getElementById('auth-verify-code').value;
            console.log("Prüfe Code: " + code);
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
                    <div class="w-24 h-24 bg-gradient-to-tr from-gray-200 to-white rounded-full flex items-center justify-center shadow-lg">
                        <span class="text-3xl font-bold text-black">H</span>
                    </div>
                    <button class="absolute bottom-0 right-0 w-8 h-8 bg-[#1C1C1E] border border-white/20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="bg-[#1C1C1E] rounded-[24px] p-5 space-y-4 border border-white/10 mb-8 shadow-sm">
                <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] text-[#8E8E93] ml-1 uppercase tracking-wider font-medium">Username</label>
                    <input type="text" value="Collector1337" class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] text-[#8E8E93] ml-1 uppercase tracking-wider font-medium">Email</label>
                    <input type="email" value="user@example.com" disabled class="w-full bg-black/50 text-[#8E8E93] border border-white/5 rounded-[14px] px-4 py-3.5 text-[17px] outline-none cursor-not-allowed">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] text-[#8E8E93] ml-1 uppercase tracking-wider font-medium">Date of Birth</label>
                    <input type="date" value="2000-01-01" class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all [color-scheme:dark]">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] text-[#8E8E93] ml-1 uppercase tracking-wider font-medium">Location</label>
                    <input type="text" placeholder="City, Country" class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all placeholder:text-[#8E8E93]">
                </div>
            </div>
            
            <button class="w-full bg-white text-black font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-transform shadow-[0_4px_14px_rgba(255,255,255,0.1)]">
                Save Changes
            </button>
        `;
    } 
    else if (type === 'Notifications') {
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Push Notifications</span>
                    <div onclick="toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">New Snus Drops (Dex)</span>
                    <div onclick="toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Email Summaries</span>
                    <div onclick="toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
        `;
    }
    else if (type === 'Privacy & Security') {
        html = `
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">Profile Visibility</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 mb-8">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Private Profile</span>
                    <div onclick="toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">Data</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Share Analytics</span>
                    <div onclick="toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
            </div>
        `;
    }
    else if (type === 'Language') {
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">English</span>
                    <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">Deutsch</span>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">Svenska</span>
                </div>
            </div>
        `;
    }
    else if (type === 'Help Center & FAQ') {
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
                    <button class="text-[#8E8E93] hover:text-white text-[14px] font-medium underline decoration-white/30 underline-offset-4 active:opacity-50 transition-all">
                        Contact Support
                    </button>
                </div>
            </div>
        `;
    }
    else if (type === 'Delete Account') {
        html = `
            <div class="text-center mt-6 mb-8">
                <div class="w-16 h-16 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <h2 class="text-white text-[22px] font-bold tracking-tight mb-2">Delete Account?</h2>
                <p class="text-[#8E8E93] text-[15px] px-4 leading-relaxed">This action is permanent and cannot be undone. All your Dex collections and stats will be lost forever.</p>
            </div>
            <button class="w-full bg-[#FF3B30] text-white font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-transform mb-3 shadow-[0_4px_14px_rgba(255,59,48,0.2)]">
                Yes, delete my account
            </button>
            <button onclick="closeSettingsSubpage()" class="w-full bg-[#1C1C1E] border border-white/10 text-white font-medium text-[17px] py-4 rounded-[14px] active:bg-white/5 transition-colors">
                Cancel
            </button>
        `;
    }

    contentObj.innerHTML = html;

    subpage.classList.remove('hidden');
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
    }, { passive: true });

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
    }, { passive: true });

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

    function removeSplashScreen() {
        if (!splashScreen.classList.contains('opacity-0')) {
            splashScreen.classList.remove('opacity-100');
            splashScreen.classList.add('opacity-0');
            
            setTimeout(() => {
                splashScreen.classList.add('hidden');
            }, 500); 
        }
    }

    if (splashScreen && splashVideo) {
        splashVideo.addEventListener('ended', removeSplashScreen);

        setTimeout(removeSplashScreen, 2500);
    }
});