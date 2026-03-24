// 1. SUPABASE & GITHUB SETUP
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/'; 
 
// DER FIX: Wir nennen die Variable "supabaseClient", damit es keinen Namenskonflikt gibt!
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. BEGRÜßUNG
function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;
    const hour = new Date().getHours();
    let message = (hour < 12) ? "Guten Morgen" : (hour < 18) ? "Guten Tag" : "Guten Abend";
    greetingElement.innerText = `${message}, HazeCC`;
}

// 3. SCORE ANZEIGE
function updateScore() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) scoreElement.innerText = 3612; 
}

// 4. CAROUSEL LOGIK
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

// 5. SUPABASE DEX LADEN
async function loadDex() {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    
    try {
        // HIER AUCH DER FIX: Wir nutzen jetzt supabaseClient
        const { data: snusItems, error } = await supabaseClient
            .from('snus_items')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        
        grid.innerHTML = ''; // Ladezustand leeren

        snusItems.forEach(snus => {
            const isUnlocked = true; 
            const statusClass = isUnlocked ? 'unlocked' : 'locked';
            
            const rarityClass = snus.rarity ? snus.rarity.toLowerCase() : 'common'; 

            const card = `
                <div class="dex-card ${statusClass} rarity-${rarityClass} relative flex flex-col items-center p-4 bg-zinc-900 border rounded-2xl transition-all active:scale-95">
                    <span class="absolute top-2 left-2 text-[0.75rem] font-mono opacity-50">#${String(snus.id).padStart(3, '0')}</span>
                    
                    <div class="w-full aspect-square flex items-center justify-center mb-3">
                        <img src="${GITHUB_BASE}${snus.image}" alt="${snus.name}" class="w-full h-full object-contain rounded-lg">
                    </div>

                    <h5 class="text-[0.9rem] font-bold uppercase tracking-tight text-center truncate w-full">${snus.name}</h5>
                    <p class="text-[0.75rem] text-zinc-500 mt-0.5 uppercase">${snus.nicotine} MG/G</p>
                </div>
            `;
            grid.innerHTML += card;
        });
    } catch (error) {
        console.error("Supabase-Fehler:", error);
        grid.innerHTML = `<p class="text-red-500 text-[10px] col-span-3 text-center">Database Offline: ${error.message}</p>`;
    }
}

// 6. TAB-NAVIGATION
function switchTab(tab) {
    const homeView = document.getElementById('view-home');
    const dexView = document.getElementById('view-dex');
    const btnHome = document.getElementById('btn-home');
    const btnDex = document.getElementById('btn-dex');

    if (navigator.vibrate) navigator.vibrate(10);

    if (tab === 'dex') {
        homeView.classList.add('hidden');
        dexView.classList.remove('hidden');
        
        btnDex.classList.replace('text-zinc-600', 'text-white');
        btnHome.classList.replace('text-white', 'text-zinc-600');
        
        loadDex(); 
        window.scrollTo(0, 0);
    } else {
        dexView.classList.add('hidden');
        homeView.classList.remove('hidden');
        
        btnHome.classList.replace('text-zinc-600', 'text-white');
        btnDex.classList.replace('text-white', 'text-zinc-600');
    }
}

// 7. INITIALISIERUNG
document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    updateScore();
    initCarouselObserver();
});