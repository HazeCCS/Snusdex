// ==========================================
// 4. DATEN LADEN & RENDERN
// ==========================================

let globalSnusData = [];
let globalUserCollection = {};

// ==========================================
// SESSION CACHE FÜR SOCIAL TAB
// ==========================================
let _socialCacheData = null;
let _socialCacheTime = 0;
const SOCIAL_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

// ==========================================
// SKELETON LOADING HELPER
// ==========================================
const _skeletonTemplates = {
    // Matches loadMoreDexItems() exactly: one div per grid cell, aspect-square image, same padding
    'dex-card': `<div class="flex flex-col bg-[#2A2A2E] rounded-[20px] overflow-hidden" style="border:1px solid rgba(255,255,255,0.05)"><div class="flex justify-between items-center w-full px-2.5 pt-2.5"><div class="sk h-3 w-7 rounded-full"></div><div class="sk w-2.5 h-2.5 rounded-full"></div></div><div class="sk w-full aspect-square mt-1"></div><div class="px-2 pt-1 pb-3 flex-1 flex items-center justify-center"><div class="sk h-3 w-[70%] rounded-full"></div></div></div>`,

    // Matches renderSocialCard() exactly: p-5, shadow-lg, border-white/10, mb-5,
    // header badges, w-24 h-24 image, 2-line name, sub, score row, 6 score circles
    'social-featured': `<div class="bg-[#1C1C1E] rounded-[24px] p-5 shadow-lg border border-white/10 mb-5"><div class="mb-4 flex justify-between items-center"><div class="sk h-7 w-36 rounded-full"></div><div class="sk h-6 w-14 rounded-md"></div></div><div class="flex items-center gap-4 mb-5"><div class="sk w-24 h-24 rounded-2xl flex-shrink-0"></div><div class="flex-1 flex flex-col justify-center gap-2"><div class="sk h-[22px] w-[85%] rounded-md"></div><div class="sk h-[22px] w-[60%] rounded-md"></div><div class="sk h-[14px] w-[45%] rounded-full"></div><div class="flex items-end gap-1.5 mt-1"><div class="sk h-[26px] w-12 rounded-md"></div><div class="sk h-[14px] w-16 rounded-full mb-0.5"></div></div></div></div><div class="pt-4 border-t border-white/5 grid grid-cols-6 gap-1">${Array(6).fill('<div class="flex flex-col items-center"><div class="sk w-10 h-10 rounded-full mb-1"></div><div class="sk h-[9px] w-7 rounded-full"></div></div>').join('')}</div></div>`,

    // Matches renderSocialListUI() list item exactly: p-3 gap-3, w-10 h-10 img,
    // flex-1 text column, score button with min-w-[48px] and two inner lines
    'social-list-item': `<div class="border-b border-white/5 last:border-0"><div class="flex items-center gap-3 p-3"><div class="sk w-5 h-[14px] rounded flex-shrink-0"></div><div class="sk w-10 h-10 rounded-xl flex-shrink-0"></div><div class="flex-1 min-w-0 flex flex-col gap-1.5"><div class="sk h-[18px] w-[65%] rounded-full"></div><div class="sk h-[13px] w-[40%] rounded-full"></div></div><div class="flex-shrink-0 min-w-[48px] px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1"><div class="sk h-[17px] w-8 rounded-md"></div><div class="sk h-[9px] w-7 rounded-full"></div></div></div></div>`,
};

function skeletonHTML(type, count) {
    const tpl = _skeletonTemplates[type] || '';
    return Array(count || 1).fill(tpl).join('');
}

async function loadDex() {
    const grid = document.getElementById('dex-grid');
    if (grid && !globalSnusData.length) {
        grid.innerHTML = skeletonHTML('dex-card', 12);
        grid.style.opacity = '1';
    }

    const { data: { user } } = await supabaseClient.auth.getUser();

    const queries = [
        supabaseClient.from('snus_products').select('*').order('id', { ascending: true })
    ];
    if (user) {
        queries.push(supabaseClient.from('user_collections').select('*').eq('user_id', user.id));
    }

    const results = await Promise.all(queries);

    globalSnusData = results[0].data || [];
    globalUserCollection = {};

    if (user && results[1]?.data) {
        results[1].data.forEach(item => {
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

    updateLivePerformance();
    updateDexSortButtonUI();
    filterDex();
    renderSuggestions();
}

let currentDexRenderCount = 0;
let currentDexItems = [];
const DEX_CHUNK_SIZE = 30; // Erhöht für einen durchgängigeren Aufbau
let dexObserver = null;
let imageLazyObserver = null;

// ==========================================
// GLOBALER IMAGE CACHE (Session-persistent)
// ==========================================
// Speichert fertig geladene Image-Objekte für die Dauer der App-Session.
// Key: URL-String, Value: 'loaded' | 'error'
const dexImageCache = new Map();

// Lädt alle Bilder im Hintergrund mit einer geordneten Queue.
// Max. 6 parallele Downloads – kein setTimeout-Spam, kein Browser-Überlastung.
async function preloadBadgeImages() {
    if (!globalBadges || globalBadges.length === 0) return;
    const unlockedBadges = globalBadges.filter(b => globalUserBadges.has(b.id));
    await Promise.all(unlockedBadges.map(async badge => {
        const url = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
        if (badgeImageCache.has(url)) return;
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const blob = await resp.blob();
                badgeImageCache.set(url, URL.createObjectURL(blob));
            }
        } catch (e) { }
    }));
}

function preloadAllDexImages(items) {
    const queue = items
        .map(snus => GITHUB_BASE + snus.image)
        .filter(url => !dexImageCache.has(url));

    if (queue.length === 0) return;

    const MAX_CONCURRENT = 6;
    let active = 0;

    function loadNext() {
        while (active < MAX_CONCURRENT && queue.length > 0) {
            const url = queue.shift();
            active++;
            const img = new Image();
            img.onload = () => { dexImageCache.set(url, 'loaded'); active--; loadNext(); };
            img.onerror = () => { dexImageCache.set(url, 'error'); active--; loadNext(); };
            img.src = url;
        }
    }

    // Erst nach nächstem Frame starten, damit sichtbare DOM-Bilder Vorrang haben
    requestAnimationFrame(loadNext);
}

function initImageLazyLoadObserver() {
    if (imageLazyObserver) return;

    imageLazyObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                if (!src) return;

                const container = img.closest('.dex-image-container');
                const shimmer = container ? container.querySelector('.dex-placeholder') : null;

                const showImage = () => {
                    img.classList.remove('opacity-0');
                    dexImageCache.set(src, 'loaded');
                    if (shimmer) shimmer.remove();
                };

                img.removeAttribute('data-src');
                observer.unobserve(img);

                // Already in browser cache → show synchronously, skip onload wait
                if (dexImageCache.get(src) === 'loaded') {
                    img.src = src;
                    showImage();
                    return;
                }

                img.onload = showImage;
                img.onerror = () => {
                    img.src = 'https://via.placeholder.com/150/000000/FFFFFF?text=?';
                    dexImageCache.set(src, 'error');
                    img.classList.remove('opacity-0');
                    if (shimmer) shimmer.remove();
                };
                img.src = src;
            }
        });
    }, { rootMargin: '0px 0px 1200px 0px' });
}

function initDexObserver() {
    if (dexObserver) {
        dexObserver.disconnect();
    }
    const sentinel = document.getElementById('dex-sentinel');
    if (!sentinel) return;

    // Beobachter der auslöst sobald der Bereich ca. 800px vor dem Sichtfeld ist (ca. 5 Reihen)
    dexObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreDexItems();
        }
    }, {
        rootMargin: '800px'
    });

    dexObserver.observe(sentinel);
}

// Anzahl Items für den ersten sichtbaren Screen (3-Spalten-Grid à 3 Reihen = 9)
const DEX_FIRST_CHUNK = 9;

function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;

    currentDexItems = items;
    currentDexRenderCount = 0;

    loadMoreDexItems(DEX_FIRST_CHUNK, true);
    initDexObserver();

    // After first paint: preload images in background.
    // The sentinel IntersectionObserver naturally loads the next batch as it enters view.
    // Belt-and-suspenders: also trigger next batch in case sentinel is already visible.
    requestAnimationFrame(() => {
        preloadAllDexImages(items);
        if (currentDexRenderCount < currentDexItems.length) {
            loadMoreDexItems();
        }
    });
}

function loadMoreDexItems(chunkOverride, shouldClear = false) {
    const grid = document.getElementById('dex-grid');
    if (!grid || currentDexRenderCount >= currentDexItems.length) return;

    if (shouldClear) grid.innerHTML = '';

    const isFirstChunk = shouldClear;
    const chunkSize = chunkOverride || DEX_CHUNK_SIZE;
    const nextChunk = currentDexItems.slice(currentDexRenderCount, currentDexRenderCount + chunkSize);
    if (!nextChunk.length) return;

    const cols = localStorage.getItem('dexColumns') || '3';
    const is2Cols = cols === '2';
    const glowActive = localStorage.getItem('dexGlow') === 'true';

    const fragment = document.createDocumentFragment();

    nextChunk.forEach((snus, index) => {
        const isUnlocked = !!globalUserCollection[snus.id];
        const formattedId = '#' + String(snus.id).padStart(3, '0');
        const rarity = (snus.rarity || 'common').toLowerCase().trim();
        const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
        const imgUrl = GITHUB_BASE + snus.image;

        const rarityIndicator = is2Cols
            ? `<span class="text-[10px] font-bold tracking-wide uppercase" style="color: var(--${rarity}, var(--common)); text-shadow: 0px 0px 8px var(--${rarity}, var(--common));">${rarity}</span>`
            : `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;

        const placeholderHTML = `<div class="dex-placeholder absolute inset-0 flex items-center justify-center pointer-events-none"><div class="w-[60%] h-[60%] rounded-xl sk"></div></div>`;

        // First chunk: staggered row fade-in + will-change only during animation.
        // Later chunks: no animation class, no will-change — saves GPU layers on mobile.
        const animClass = isFirstChunk ? 'opacity-0 will-change-transform' : '';
        const animStyle = isFirstChunk
            ? ` style="animation: fadeViewIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards ${Math.floor(index / 3) * 0.08}s"`
            : '';

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div onclick="openSnusDetail(${snus.id})" class="dex-anim-card cursor-pointer group h-full w-full transition-transform duration-200 ease-out origin-center ${animClass}"${animStyle}><div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] transition-transform group-active:scale-95 shadow-md overflow-hidden ${!isUnlocked ? 'opacity-40 grayscale' : ''}" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}"><div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10"><span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>${rarityIndicator}</div><div class="dex-image-container w-full aspect-square flex items-center justify-center relative mt-1 overflow-hidden">${placeholderHTML}<img data-src="${imgUrl}" class="dex-lazy-img w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10 opacity-0 transition-opacity duration-300"></div><div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10"><h5 class="text-[12px] font-semibold leading-tight line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5></div></div></div>`.trim();
        fragment.appendChild(wrapper.firstChild);
    });

    grid.appendChild(fragment);
    // Use actual rendered count, not chunkSize — avoids overshoot at the end of the list
    currentDexRenderCount += nextChunk.length;

    if (isFirstChunk) {
        grid.style.opacity = '1';
        // Release GPU layers after all first-chunk animations finish
        const lastRowDelay = Math.floor((DEX_FIRST_CHUNK - 1) / 3) * 80;
        setTimeout(() => {
            grid.querySelectorAll('.dex-anim-card').forEach(c => (c.style.willChange = 'auto'));
        }, lastRowDelay + 450);
    }

    if (!imageLazyObserver) initImageLazyLoadObserver();

    requestAnimationFrame(() => {
        // Haptic threshold only needs one accurate DOM read after first chunk
        if (isFirstChunk) recalcHapticThreshold();

        grid.querySelectorAll('.dex-lazy-img:not(.observed)').forEach(img => {
            img.classList.add('observed');
            imageLazyObserver.observe(img);
        });

        // Scale effect only on first chunk — subsequent batches are offscreen anyway
        if (isFirstChunk) updateDexScale();
    });
}

let dexSortMode = localStorage.getItem('dexDefaultSort') || 'id';
let dexFilterUnlocked = false;

function updateDexSortButtonUI() {
    const btn = document.getElementById('dex-sort-btn');
    if (!btn) return;

    if (dexSortMode === 'id') {
        btn.innerHTML = `<span class="font-bold text-[16px]">#</span>`;
        btn.classList.add('text-white', 'bg-white/20');
        btn.classList.remove('text-[#8E8E93]', 'bg-white/10');
    } else {
        btn.innerHTML = `<span class="font-bold text-[16px]">A</span>`;
        btn.classList.add('text-white', 'bg-white/20');
        btn.classList.remove('text-[#8E8E93]', 'bg-white/10');
    }
}

function toggleDexSort() {
    dexSortMode = (dexSortMode === 'id') ? 'alpha' : 'id';
    updateDexSortButtonUI();
    filterDex();
}

function toggleDexFilterUnlocked() {
    dexFilterUnlocked = !dexFilterUnlocked;
    const btn = document.getElementById('dex-filter-unlocked-btn');
    if (dexFilterUnlocked) {
        btn.classList.add('bg-white', 'text-black');
        btn.classList.remove('text-[#8E8E93]', 'bg-white/10');
    } else {
        btn.classList.remove('bg-white', 'text-black');
        btn.classList.add('text-[#8E8E93]', 'bg-white/10');
    }
    filterDex();
}


// setupProfile: nur eine Definition weiter unten (Zeile ~4331)

function triggerHapticFeedback() {
    if (window.webkit && window.webkit.messageHandlers.hapticHandler) window.webkit.messageHandlers.hapticHandler.postMessage("vibrate");
    else if (navigator.vibrate) navigator.vibrate(15);
}

function switchTabWrapper(tabId) {
    triggerHapticFeedback();
    switchTab(tabId);
}

// All-Scans Modal Gestures – initialisiert via initAllScansGestures() weiter unten

function filterDex() {
    const searchEl = document.getElementById('dex-search');
    if (!searchEl) return;

    const term = searchEl.value.toLowerCase().trim();
    const searchWords = term ? term.split(/\s+/) : [];

    let filtered = globalSnusData.filter(s => {
        // Filter für freigeschaltete
        if (dexFilterUnlocked && !globalUserCollection[s.id]) {
            return false;
        }

        // Text Filter (Suchleiste)
        if (searchWords.length > 0) {
            const searchableText = [
                s.name,
                s.brand,
                Array.isArray(s.flavor) ? s.flavor.join(' ') : s.flavor
            ].filter(Boolean).join(' ').toLowerCase();

            if (!searchWords.every(word => searchableText.includes(word))) {
                return false;
            }
        }

        return true;
    });

    const grid = document.getElementById('dex-grid');
    if (!grid) return;

    const isSearch = searchWords.length > 0;
    const searchKey = searchWords.join(' ');

    // Cancel any in-flight fade timer
    if (grid._fadeTimer) clearTimeout(grid._fadeTimer);

    // Only fade out if real cards exist — skip delay on initial skeleton-only load
    const hasRealContent = grid.querySelector('.dex-anim-card, .brand-section') !== null;
    if (hasRealContent) {
        grid.style.transition = 'opacity 0.2s ease-out';
        grid.style.opacity = '0';
        grid.style.pointerEvents = 'none';
    }
    const fadeDelay = hasRealContent ? 200 : 0;

    grid._fadeTimer = setTimeout(() => {
        grid.style.transition = 'none';
        grid.style.pointerEvents = '';

        if (dexSortMode === 'alpha') {
            grid.className = 'flex flex-col w-full';
            if (dexObserver) dexObserver.disconnect();
        } else {
            const cols = localStorage.getItem('dexColumns') || '3';
            const is2Cols = cols === '2';
            grid.className = `grid ${is2Cols ? 'grid-cols-2' : 'grid-cols-3'} gap-3`;
        }

        const showSkeletons = !hasRealContent || (isSearch && grid.dataset.lastSearch !== searchKey);
        grid.dataset.lastSearch = searchKey;

        if (dexSortMode === 'alpha') {
            if (showSkeletons) {
                grid.innerHTML = `
                ${[1, 2, 3].map(() => `
                <div class="brand-section mb-4 w-[calc(100%+40px)] -mx-[20px] px-5 opacity-50" style="contain-intrinsic-size: 0 200px;">
                    <div class="flex justify-between items-end mb-3 mt-6 px-1">
                        <div class="sk h-6 w-32 rounded-md"></div>
                        <div class="sk h-5 w-12 rounded-full"></div>
                    </div>
                    <div class="flex gap-[3vw] overflow-hidden pb-4 pt-3">
                        ${[1, 2, 3, 4].map(() => `
                            <div class="flex-shrink-0 w-[28vw] max-w-[120px] aspect-[1/1.2] bg-[#2A2A2E] rounded-[20px] border border-white/5 overflow-hidden">
                                <div class="flex justify-between p-2.5"><div class="sk h-2.5 w-6 rounded-full"></div><div class="sk w-2.5 h-2.5 rounded-full"></div></div>
                                <div class="flex-1 flex items-center justify-center"><div class="sk w-[60%] h-[60%] rounded-xl"></div></div>
                                <div class="p-2 flex justify-center"><div class="sk h-3 w-[70%] rounded-full"></div></div>
                            </div>
                        `).join('')}
                    </div>
                </div>`).join('')}
                `;
            }
            // Always make grid visible before rendering (skeleton or existing content)
            grid.style.opacity = '1';

            // Single RAF – avoid double RAF jank on iPhone
            requestAnimationFrame(() => {
                const groupedData = groupAndSortByBrand(filtered);
                renderDexGrouped(groupedData);
            });

        } else {
            if (showSkeletons) {
                grid.innerHTML = `
                    ${[...Array(12)].map(() => `
                        <div class="aspect-[1/1.2] bg-[#2A2A2E] rounded-[20px] border border-white/5 overflow-hidden flex flex-col">
                            <div class="flex justify-between p-2.5"><div class="sk h-2.5 w-6 rounded-full"></div><div class="sk w-2.5 h-2.5 rounded-full"></div></div>
                            <div class="flex-1 flex items-center justify-center"><div class="sk w-[60%] h-[60%] rounded-xl"></div></div>
                            <div class="p-2 flex justify-center"><div class="sk h-3 w-[70%] rounded-full"></div></div>
                        </div>
                    `).join('')}
                `;
            }
            // Always make grid visible before rendering
            grid.style.opacity = '1';

            // Single RAF – avoid double RAF jank on iPhone
            requestAnimationFrame(() => {
                filtered.sort((a, b) => parseInt(a.id) - parseInt(b.id));
                renderDexGrid(filtered);
            });
        }
    }, fadeDelay);
}
