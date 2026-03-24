// Nutze den "Project URL" und den "Anon / Public" Key
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Begrüßung nach Tageszeit
function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;
    const hour = new Date().getHours();
    let message;

    if (hour >= 5 && hour < 12) message = "Guten Morgen";
    else if (hour >= 12 && hour < 18) message = "Guten Tag";
    else if (hour >= 18 && hour < 22) message = "Guten Abend";
    else message = "Gute Nacht";

    const username = "HazeCC"; 
    greetingElement.innerText = `${message}, ${username}`;
}

// 2. Score Anzeige
function updateScore() {
    const scoreElement = document.getElementById('score');
    if (!scoreElement) return;
    const score = 100; // Später aus Firebase
    scoreElement.innerText = score;
}

// 3. Carousel Focus Logic
function initCarouselObserver() {
    const carousel = document.getElementById('stats-carousel');
    const cards = document.querySelectorAll('.stats-card');

    if (!carousel || cards.length === 0) return;

    const observerOptions = {
        root: carousel,
        threshold: 0.6
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                if (navigator.vibrate) navigator.vibrate(5);
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, observerOptions);

    cards.forEach(card => observer.observe(card));
}

// Alles starten, wenn das DOM bereit ist
window.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    updateScore();
    initCarouselObserver();
});

async function loadDex() {
    const grid = document.getElementById('dex-grid');
    
    try {
        const response = await fetch('snus_db.json');
        const data = await response.json();
        
        grid.innerHTML = ''; // Clear loading state

        data.forEach(snus => {
            const statusClass = snus.unlocked ? 'unlocked' : 'locked';
            
            const card = `
                <div class="dex-card ${statusClass} rarity-${snus.rarity} relative flex flex-col items-center p-4 bg-zinc-900 border rounded-2xl transition-all active:scale-95">
                    
                    <span class="absolute top-2 left-2 text-[0.75rem] font-mono opacity-50">#${String(snus.id).padStart(3, '0')}</span>
                    
                    <div class="w-full aspect-square flex items-center justify-center mb-3">
                        <img src="${snus.image}" alt="${snus.name}" class="w-full h-full object-contain rounded-lg">
                    </div>

                    <h5 class="text-[0.9rem] font-bold uppercase tracking-tight text-center truncate w-full">${snus.name}</h5>
                    <p class="text-[0.75rem] text-zinc-500 mt-0.5 uppercase">${snus.nicotine} MG/G</p>
                </div>
            `;
            grid.innerHTML += card;
        });
    } catch (error) {
        console.error("Datenbank-Fehler:", error);
        grid.innerHTML = '<p class="text-red-900 text-[10px]">Database Offline</p>';
    }
}

// In deine DOMContentLoaded Logik einfügen
window.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    initCarouselObserver();
    loadDex(); // <--- Neu!
});

function switchTab(tab) {
    const homeView = document.getElementById('view-home');
    const dexView = document.getElementById('view-dex');
    const navHome = document.getElementById('nav-home');
    const navDex = document.getElementById('nav-dex');

    // Haptik-Feedback (für iPhone/Android)
    if (navigator.vibrate) navigator.vibrate(10);

    if (tab === 'dex') {
        // Dex anzeigen
        homeView.classList.add('hidden');
        dexView.classList.remove('hidden');
        
        // Buttons stylen
        navDex.classList.replace('text-zinc-600', 'text-white');
        navHome.classList.replace('text-white', 'text-zinc-600');
        
        // Datenbank laden (Funktion von vorhin)
        loadDex(); 
        
        // Seite nach oben scrollen
        window.scrollTo(0, 0);
    } else {
        // Home anzeigen
        dexView.classList.add('hidden');
        homeView.classList.remove('hidden');
        
        // Buttons stylen
        navHome.classList.replace('text-zinc-600', 'text-white');
        navDex.classList.replace('text-white', 'text-zinc-600');
    }
}