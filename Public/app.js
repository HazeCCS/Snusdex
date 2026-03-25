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
        // Login erfolgreich
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);
        
        // UI vorbereiten
        setupProfile(session.user);
        loadDex(); 
        
        updateGreeting();
        // Kurz warten, bis CSS geladen ist für das Carousel
        setTimeout(() => initCarouselObserver(), 100); 
        
        console.log("Access Granted: ", session.user.email);
    } else {
        // Nicht eingeloggt
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
    // 1. Alle Tabs verstecken
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // 2. Den neuen Tab sichtbar machen (Das triggert die CSS Animation automatisch!)
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) {
        activeTab.classList.remove('hidden');
    }
    
    // 3. Navbar-Icons stylen
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.id === `btn-${tabId}`) {
            btn.classList.add('text-purple-500');
            btn.classList.remove('text-zinc-500');
        } else {
            btn.classList.add('text-zinc-500');
            btn.classList.remove('text-purple-500');
        }
    });

    // Vibration Feedback
    if (navigator.vibrate) navigator.vibrate(5);
    window.scrollTo(0, 0);
}

// ==========================================
// 4. DATEN LADEN (DEX & STATS)
// ==========================================

// ==========================================
// 4. DATEN LADEN (DEX & STATS)
// ==========================================

let globalSnusData = []; 
let globalUserCollection = []; // NEU: Speichert die IDs, die du schon hast

async function loadDex() {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    
    try {
        // 1. Zuerst schauen, wer eingeloggt ist
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // 2. Deine gesammelten Snus holen (Die "Freigeschalteten")
        if (user) {
            const { data: myCollection } = await supabaseClient
                .from('user_collections')
                .select('snus_id')
                .eq('user_id', user.id);
            
            if (myCollection) {
                // Macht aus [{snus_id: 1}, {snus_id: 2}] eine simple Liste: [1, 2]
                globalUserCollection = myCollection.map(item => item.snus_id);
            }
        }

        // 3. Alle Snus aus der Master-Datenbank holen
        const { data: snusItems, error } = await supabaseClient
            .from('snus_items')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        
        globalSnusData = snusItems; 
        grid.innerHTML = ''; 

        if (snusItems.length === 0) {
            grid.innerHTML = `<p class="text-zinc-500 text-[10px] col-span-3 text-center mt-10">Noch keine Snus in der Datenbank.</p>`;
            return;
        }

        // 4. Kacheln zeichnen
        snusItems.forEach(snus => {
            // HIER IST DIE MAGIE: Ist die ID in deiner Sammlung?
            const isUnlocked = globalUserCollection.includes(snus.id); 
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
    } catch (error) {
        console.error("Supabase-Fehler:", error);
    }
}

// ... Lass loadUserStats() so wie es ist ...

// NEU: Diese Funktion fehlte komplett! Sie berechnet XP und füllt dein Profil.
async function loadUserStats(userId) {
    try {
        // Zählt die gesammelten Snus in user_collections
        const { count, error: collectionError } = await supabaseClient
            .from('user_collections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        let pouchCount = 0;
        let totalXp = 0;

        if (!collectionError && count !== null) {
            pouchCount = count;
            totalXp = count * 100; // 100 XP pro Pouch
        }

        // UI Aktualisieren (Home-Screen & Profil)
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
    console.log("Setting up profile for:", user.email);

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
        // ADMIN CHECK
        if (user.email === 'tarayannorman@gmail.com') {
            adminPanel.classList.remove('hidden');
            console.log("Admin-Modus aktiviert ⚡️");
        } else {
            adminPanel.classList.add('hidden');
        }
    }
    
    // Hier ist der Aufruf, der vorher gecrasht ist, weil die Funktion oben fehlte!
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

    if(!name || !nicotine) return alert("Bitte Name und Nikotin eingeben!");

    // Button deaktivieren während dem Laden
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
            barcode: barcode || null, // Optional
            image: image || 'placeholder.png' // Fallback Bild
        }]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        alert("Fehler: " + error.message);
    } else {
        alert("Erfolgreich hinzugefügt! 🚀");
        // Felder leeren
        document.getElementById('admin-name').value = '';
        document.getElementById('admin-barcode').value = '';
        document.getElementById('admin-image').value = '';
        
        // Dex direkt im Hintergrund neu laden
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

    // 1. Daten ins HTML einfügen
    document.getElementById('modal-id').innerText = `#${String(snus.id).padStart(3, '0')}`;
    document.getElementById('modal-name').innerText = snus.name;
    document.getElementById('modal-nicotine').innerText = `${snus.nicotine} MG/G`;
    document.getElementById('modal-rarity-text').innerText = snus.rarity;
    document.getElementById('modal-image').src = `${GITHUB_BASE}${snus.image}`;

    // 2. Farben & Seltenheit stylen
    const rarityClass = snus.rarity ? snus.rarity.toLowerCase() : 'common';
    document.getElementById('modal-name').className = `text-3xl font-black uppercase tracking-tighter mb-1 text-${rarityClass}`; 
    document.getElementById('modal-rarity-dot').className = `w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] bg-${rarityClass}`; 

    // 3. Button-Status prüfen (Hast du ihn schon?)
    const btn = document.getElementById('collect-btn');
    const collectedText = document.getElementById('collected-text');

    if (globalUserCollection.includes(id)) {
        btn.classList.add('hidden');
        collectedText.classList.remove('hidden');
    } else {
        btn.classList.remove('hidden');
        collectedText.classList.add('hidden');
    }

    // 4. ANIMATION START: Erst sichtbar machen, dann Klassen für Fade/Slide
    const modal = document.getElementById('snus-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');
    
    if (!backdrop || !card) return; // Sicherheitscheck

    modal.classList.remove('hidden');
    
    // Kleiner Timeout, damit der Browser die Transition erkennt
    setTimeout(() => {
        backdrop.classList.add('active'); // Fadet sanft ein
        card.classList.remove('translate-y-full'); // Slidet sanft hoch
    }, 10);
    
    if (navigator.vibrate) navigator.vibrate(10);
}

function closeSnusDetail() {
    const modal = document.getElementById('snus-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');
    
    if (!backdrop || !card) return;

    // 1. Animationen zurückfahren
    backdrop.classList.remove('active'); // Blur fadet aus
    card.classList.add('translate-y-full'); // Card slidet runter
    
    // 2. Erst nach Ende der CSS-Animation (400ms) komplett verstecken
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 400);
}

async function collectCurrentSnus() {
    if (!currentSelectedSnusId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Du musst eingeloggt sein!");

    const btn = document.getElementById('collect-btn');
    btn.innerText = "WIRD GESAMMELT...";
    btn.disabled = true;

    // Ab in die Datenbank
    const { error } = await supabaseClient
        .from('user_collections')
        .insert([{ user_id: user.id, snus_id: currentSelectedSnusId }]);

    if (error) {
        console.error("Fehler:", error);
        alert("Konnte nicht hinzugefügt werden.");
        btn.innerText = "ZUR SAMMLUNG HINZUFÜGEN";
        btn.disabled = false;
        return;
    }

    // ERFOLG!
    if (navigator.vibrate) navigator.vibrate([50, 50, 100]); 
    
    // Lokale Updates für das UI
    globalUserCollection.push(currentSelectedSnusId);
    await loadUserStats(user.id);
    loadDex(); // Kacheln im Hintergrund aktualisieren

    // Modal mit neuem smoothen Effekt schließen
    closeSnusDetail();
    
    setTimeout(() => {
        btn.innerText = "ZUR SAMMLUNG HINZUFÜGEN";
        btn.disabled = false;
    }, 500);
}