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
        errorEl.innerText = "Access Denied";
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
            <div onclick="openSnusDetail(${snus.id})" class="relative flex flex-col items-center p-3 bg-[#1C1C1E] rounded-3xl transition-all active:scale-95 cursor-pointer shadow-sm border border-white/5 ${!isUnlocked ? 'opacity-40 grayscale' : ''}">
                <div class="w-full aspect-square flex items-center justify-center p-2 mb-2">
                    <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain drop-shadow-md" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                </div>
                <h5 class="text-[12px] font-semibold text-center truncate w-full tracking-tight ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5>
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
    document.getElementById('start-collect-btn').classList.toggle('hidden', !!isUnlocked);
    document.getElementById('modal-collected-status').classList.toggle('hidden', !isUnlocked);

    if (isUnlocked) {
        const dateObj = new Date(isUnlocked.date);
        document.getElementById('modal-unlocked-date').innerText = `Added on ${dateObj.toLocaleDateString()}`;
    }

    document.getElementById('snus-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modal-backdrop').classList.add('active'); 
        document.getElementById('snus-modal-card').classList.remove('translate-y-full'); 
    }, 10);
    triggerHapticFeedback();
}

function closeSnusDetail() {
    document.getElementById('modal-backdrop').classList.remove('active'); 
    document.getElementById('snus-modal-card').classList.add('translate-y-full'); 
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => {
        document.getElementById('snus-modal').classList.add('hidden');
        hideAllViews(); document.getElementById('modal-view-info').classList.remove('hidden');
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


const scanModal = document.getElementById('scan-modal');
const scanModalCard = document.getElementById('scan-modal-card');
const scanModalBackdrop = document.getElementById('scan-modal-backdrop');

function openScanModal() {
    triggerHapticFeedback();
    scanModal.classList.remove('hidden');
    
    document.body.classList.add('overflow-hidden');
    
    setTimeout(() => {
        scanModalBackdrop.classList.remove('opacity-0');
        scanModalBackdrop.classList.add('opacity-100');
        scanModalCard.classList.remove('translate-y-full');
        scanModalCard.classList.add('translate-y-0');
    }, 10);
}

function closeScanModal() {
    scanModalCard.classList.remove('translate-y-0');
    scanModalCard.classList.add('translate-y-full');
    scanModalBackdrop.classList.remove('opacity-100');
    scanModalBackdrop.classList.add('opacity-0');
    
    scanModalCard.style.transform = ''; 

    triggerHapticFeedback(),

    setTimeout(() => {
        scanModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
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
            closeScanModal();
        } else {
            scanModalCard.style.transform = '';
        }
    });
}


// ==========================================
// SNUS DETAIL MODAL DRAG LOGIC (FIXED)
// ==========================================
const snusModalCardElement = document.getElementById('snus-modal-card');
let snusStartY = 0;
let snusCurrentY = 0;
let isSnusDragging = false;

if (snusModalCardElement) {
    snusModalCardElement.addEventListener('touchstart', (e) => {
        // --- CEO-FIX START ---
        // Wir prüfen, ob der Finger ein Element berührt, das NICHT ziehen soll.
        // Falls du dein Rating in einem Div mit der Klasse "rating-grid" hast, füge sie hier hinzu.
        if (e.target.closest('button, input, select, textarea, .no-drag, .rating-stars, [role="button"]')) {
            isSnusDragging = false;
            return; // Beendet die Funktion hier, das Modal bewegt sich nicht.
        }
        // --- CEO-FIX ENDE ---

        snusStartY = e.touches[0].clientY;
        snusCurrentY = snusStartY; // Reset für saubere Berechnung
        isSnusDragging = true;

        snusModalCardElement.style.transition = 'none';
    }, { passive: true });

    snusModalCardElement.addEventListener('touchmove', (e) => {
        if (!isSnusDragging) return;
        
        snusCurrentY = e.touches[0].clientY;
        const deltaY = snusCurrentY - snusStartY;

        // Nur nach unten ziehen erlauben
        if (deltaY > 0) {
            snusModalCardElement.style.transform = `translateY(${deltaY}px)`;
        }
    }, { passive: true });

    snusModalCardElement.addEventListener('touchend', (e) => {
        if (!isSnusDragging) return;
        isSnusDragging = false;
        
        const deltaY = snusCurrentY - snusStartY;
        
        // Sanfte Apple-Animation zurück
        snusModalCardElement.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';

        if (deltaY > 100) {
            // Modal ganz nach unten aus dem Bild schieben
            snusModalCardElement.style.transform = 'translateY(100%)';
            
            setTimeout(() => {
                closeSnusDetail(); 
                setTimeout(() => {
                    snusModalCardElement.style.transform = '';
                }, 50);
            }, 400);

        } else {
            // Modal schnappt zurück auf Ursprung
            snusModalCardElement.style.transform = 'translateY(0px)';
            
            setTimeout(() => {
                snusModalCardElement.style.transform = '';
            }, 400);
        }
    });
}

// ==========================================
// BARCODE SCANNER & KAMERA LOGIK
// ==========================================
let html5QrCode = null;
let isProcessingScan = false;

async function openScanModal() {
    triggerHapticFeedback();
    const modal = document.getElementById('scan-modal');
    const backdrop = document.getElementById('scan-modal-backdrop');
    const card = document.getElementById('scan-modal-card');

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    setTimeout(() => {
        backdrop.classList.add('opacity-100');
        card.classList.remove('translate-y-full');
        card.classList.add('translate-y-0');
    }, 10);

    // Kamera-Start verzögern, bis Modal-Animation fertig ist (iOS Fix)
    setTimeout(startScanner, 500);
}

async function startScanner() {
    if (html5QrCode) {
        try { await html5QrCode.clear(); } catch(e) {}
    }
    
    html5QrCode = new Html5Qrcode("scanner-reader");
    
    const config = { 
        fps: 25, // Höher für flüssigeres Tracking
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        // WICHTIG: Das hier sagt dem Browser: "KEIN VOLLBILD"
        videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    try {
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            onScanSuccess
        );
        
        // --- DER IOS-KILLER-CODE ---
        const video = document.querySelector('#scanner-reader video');
        if (video) {
            // Diese Attribute sind für Xcode/iOS Pflicht:
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            video.setAttribute('muted', 'true');
            video.muted = true; // Doppelt hält besser
            video.setAttribute('autoplay', 'true');
            
            // Verhindert das "Pausieren"-Icon aus deinem Screenshot
            video.play().catch(e => console.log("Autoplay blockiert:", e));
        }
        
        document.getElementById('kamera-placeholder').style.display = 'none';
    } catch (err) {
        console.error("Scanner Error:", err);
    }
}

async function onScanSuccess(decodedText) {
    // 1. Sicherheitssperre: Wir wollen nicht 50 Scans gleichzeitig triggern
    if (isProcessingScan) return;
    isProcessingScan = true;

    // 2. Feedback: Handy vibriert kurz (Haptic)
    triggerHapticFeedback();
    
    // Visuelles Feedback: Ring wird grün (Signal für den User: "Hab's!")
    const ring = document.getElementById('scan-target-ring');
    if (ring) {
        ring.style.borderColor = "#34C759";
        ring.style.boxShadow = "0 0 0 999px rgba(52, 199, 89, 0.3)";
    }

    // 3. Datenbank-Check in Supabase
    // Wir suchen in der Spalte 'barcode' nach der Nummer (z.B. 5740031410243)
    const { data: snusItem, error } = await supabaseClient
        .from('snus_items')
        .select('id')
        .eq('barcode', decodedText)
        .single();

    if (error || !snusItem) {
        console.log("Barcode nicht gefunden:", decodedText);
        // Falls nicht gefunden: Ring kurz rot machen und nach 2 Sek. wieder freigeben
        if (ring) ring.style.borderColor = "#FF3B30"; 
        setTimeout(() => {
            if (ring) {
                ring.style.borderColor = "";
                ring.style.boxShadow = "";
            }
            isProcessingScan = false;
        }, 2000);
        return;
    }

    // 4. DER AUTO-CLOSE & OPEN MOVE
    // Zuerst Kamera stoppen, damit das System entlastet wird
    await stopScanner();
    
    // Dann das Scan-Modal schließen
    closeScanModal();

    // Kurze Pause (ca. 400ms), damit die Schließ-Animation vom Scan-Modal 
    // fertig ist, bevor das Snus-Detail-Modal hochfährt. Sieht sauberer aus!
    setTimeout(() => {
        // Hier rufst du deine bestehende Funktion auf, die die Details anzeigt
        openSnusDetail(snusItem.id); 
        
        // Reset für den nächsten Scan (falls man das Modal wieder öffnet)
        isProcessingScan = false;
        if (ring) {
            ring.style.borderColor = "";
            ring.style.boxShadow = "";
        }
    }, 450);
}

function closeScanModal() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('scanner-reader').innerHTML = '';
            html5QrCode = null;
        }).catch(err => console.log(err));
    }

    const backdrop = document.getElementById('scan-modal-backdrop');
    const card = document.getElementById('scan-modal-card');

    card.classList.add('translate-y-full');
    backdrop.classList.remove('opacity-100');
    
    triggerHapticFeedback();

    setTimeout(() => {
        document.getElementById('scan-modal').classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }, 400);
<<<<<<< HEAD
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

        function handleAuthAction() {
            if (isLoginMode) {
                console.log("Rufe echtes Login auf...");
            } else {
                console.log("Rufe echte Registrierung auf...");
            }
        }

        function handleCodeVerification() {
            const code = document.getElementById('auth-verify-code').value;
            console.log("Prüfe Code: " + code);
        }


// ==========================================
//empty commit 13
=======
}
>>>>>>> refs/remotes/origin/main
