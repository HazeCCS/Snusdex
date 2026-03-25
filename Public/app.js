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

async function loadDex() {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    
    try {
        const { data: snusItems, error } = await supabaseClient
            .from('snus_items')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        
        grid.innerHTML = ''; 

        if (snusItems.length === 0) {
            grid.innerHTML = `<p class="text-zinc-500 text-[10px] col-span-3 text-center mt-10">Noch keine Snus in der Datenbank.</p>`;
            return;
        }

        snusItems.forEach(snus => {
            const isUnlocked = true; // Später ändern wir das auf Basis von user_collections
            const rarityClass = snus.rarity ? snus.rarity.toLowerCase() : 'common'; 

            const card = `
                <div class="dex-card ${isUnlocked ? 'unlocked' : 'locked'} rarity-${rarityClass} relative flex flex-col items-center p-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] transition-all active:scale-95">
                    <span class="absolute top-3 left-3 text-[10px] font-mono opacity-30">#${String(snus.id).padStart(3, '0')}</span>
                    
                    <div class="w-full aspect-square flex items-center justify-center p-2 mb-2">
                        <img src="${GITHUB_BASE}${snus.image}" alt="${snus.name}" class="w-full h-full object-contain ${!isUnlocked ? 'brightness-0 opacity-40' : ''}" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=NO+IMG'">
                    </div>

                    <h5 class="text-[0.75rem] font-bold uppercase tracking-tight text-center truncate w-full">${snus.name}</h5>
                    <p class="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-widest">${snus.nicotine} MG/G</p>
                </div>
            `;
            grid.innerHTML += card;
        });
    } catch (error) {
        console.error("Supabase-Fehler:", error);
        grid.innerHTML = `<p class="text-red-500 text-[10px] col-span-3 text-center">Fehler beim Laden der Datenbank: ${error.message}</p>`;
    }
}

// NEU: Lädt die User XP und Collection-Anzahl
async function loadUserStats(userId) {
    try {
        // 1. Zähle die gesammelten Snus in user_collections
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

        // 2. UI Aktualisieren (Home-Screen & Profil)
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
    
    // Ruft die fehlende Funktion auf!
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