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
    const mainContent = document.querySelectorAll('main, nav');

    if (session) {
        // Login erfolgreich
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);
        
        // UI vorbereiten
        setupProfile(session.user);
        loadDex(); 
        
        // --- HIER DIE NEUEN AUFRUFE REINPACKEN ---
        updateGreeting();
        updateScore();
        setTimeout(() => initCarouselObserver(), 100); // Kurz warten, bis CSS geladen ist
        // ----------------------------------------
        
        console.log("Access Granted: ", session.user.email);
    } else {
        // Nicht eingeloggt
        overlay.classList.remove('hidden');
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
// 3. NAVIGATION (TAB SYSTEM)
// ==========================================

function switchTab(tabId) {
    // 1. Alle Tabs finden
    const allTabs = document.querySelectorAll('.tab-content');
    
    allTabs.forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('animate-tab'); // Animation zurücksetzen
    });

    // 2. Den neuen Tab auswählen
    const activeTab = document.getElementById(`tab-${tabId}`);
    
    if (activeTab) {
        activeTab.classList.remove('hidden');
        
        // Kleiner Trick: Ein "Reflow" erzwingen, damit der Browser 
        // merkt, dass die Animation neu starten soll
        void activeTab.offsetWidth; 
        
        activeTab.classList.add('animate-tab');
    }
    
    // 3. Navbar-Icons stylen (Lila Akzent für Aktiven Tab)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.id === `btn-${tabId}`) {
            btn.classList.add('text-purple-500');
            btn.classList.remove('text-zinc-500');
        } else {
            btn.classList.add('text-zinc-500');
            btn.classList.remove('text-purple-500');
        }
    });
}

// ==========================================
// 4. DATEN LADEN (DEX)
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

        snusItems.forEach(snus => {
            const isUnlocked = true; // Später Logik für User-Inventory
            const rarityClass = snus.rarity ? snus.rarity.toLowerCase() : 'common'; 

            const card = `
                <div class="dex-card ${isUnlocked ? 'unlocked' : 'locked'} rarity-${rarityClass} relative flex flex-col items-center p-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] transition-all active:scale-95">
                    <span class="absolute top-3 left-3 text-[10px] font-mono opacity-30">#${String(snus.id).padStart(3, '0')}</span>
                    
                    <div class="w-full aspect-square flex items-center justify-center p-2 mb-2">
                        <img src="${GITHUB_BASE}${snus.image}" alt="${snus.name}" class="w-full h-full object-contain ${!isUnlocked ? 'brightness-0 opacity-40' : ''}">
                    </div>

                    <h5 class="text-[0.75rem] font-bold uppercase tracking-tight text-center truncate w-full">${snus.name}</h5>
                    <p class="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-widest">${snus.nicotine} MG/G</p>
                </div>
            `;
            grid.innerHTML += card;
        });
    } catch (error) {
        console.error("Supabase-Fehler:", error);
        grid.innerHTML = `<p class="text-red-500 text-[10px] col-span-3 text-center">Fehler beim Laden der Datenbank.</p>`;
    }
}

// ==========================================
// 5. HELPER & UI FUNCTIONS
// ==========================================

function setupProfile(user) {
    const emailField = document.getElementById('profile-email');
    const initialsField = document.getElementById('user-initials');
    if (emailField) emailField.innerText = user.email.split('@')[0];
    if (initialsField) initialsField.innerText = user.email.substring(0,1).toUpperCase();
}

function startScanner() {
    alert("Kamera wird gestartet... (Feature folgt)");
}

// ==========================================
// 6. INITIALISIERUNG
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    checkUser(); // Wichtig: Prüft Login & schaltet Content frei
});

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

function updateScore() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) scoreElement.innerText = "3.612"; 
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