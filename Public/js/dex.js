// ==========================================
// 4. DATEN LADEN & RENDERN — REWRITE v2
// ==========================================
//
// PERFORMANCE-PRINZIPIEN:
// - filterDex() cancelt ausstehende Timer + RAFs bevor neu gerendert wird
// - renderDexGrouped() nutzt DocumentFragment + einen einzigen Flush statt
//   setTimeout-pro-Brand (der Hauptgrund für Stotter auf iOS)
// - Brand-Pulse-Animation läuft via CSS animation-delay auf dem Element,
//   kein setTimeout-Spam im JS mehr
// - Lazy-Observer wird EINMAL initialisiert, nicht pro Render neu gebaut
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

    // Matches renderSocialCard() exactly
    'social-featured': `<div class="bg-[#1C1C1E] rounded-[24px] p-5 shadow-lg border border-white/10 mb-5"><div class="mb-4 flex justify-between items-center"><div class="sk h-7 w-36 rounded-full"></div><div class="sk h-6 w-14 rounded-md"></div></div><div class="flex items-center gap-4 mb-5"><div class="sk w-24 h-24 rounded-2xl flex-shrink-0"></div><div class="flex-1 flex flex-col justify-center gap-2"><div class="sk h-[22px] w-[85%] rounded-md"></div><div class="sk h-[22px] w-[60%] rounded-md"></div><div class="sk h-[14px] w-[45%] rounded-full"></div><div class="flex items-end gap-1.5 mt-1"><div class="sk h-[26px] w-12 rounded-md"></div><div class="sk h-[14px] w-16 rounded-full mb-0.5"></div></div></div></div><div class="pt-4 border-t border-white/5 grid grid-cols-6 gap-1">${Array(6).fill('<div class="flex flex-col items-center"><div class="sk w-10 h-10 rounded-full mb-1"></div><div class="sk h-[9px] w-7 rounded-full"></div></div>').join('')}</div></div>`,

    // Matches renderSocialListUI() list item exactly
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

    // Beide Modi' erste Bilder im Hintergrund cachen, damit ein Moduswechsel
    // nie Lade-Platzhalter zeigt. Startet erst nach 500ms damit der initiale
    // Paint und erste Chunk-Render nicht konkurrieren.
    setTimeout(() => {
        if (!globalSnusData.length) return;
        const byId = globalSnusData.slice().sort((a, b) => parseInt(a.id) - parseInt(b.id));
        preloadAllDexImages(byId.slice(0, 9));
        const groups = groupAndSortByBrand(globalSnusData);
        preloadAllDexImages(groups.slice(0, 3).flatMap(g => g.items.slice(0, 3)));
    }, 500);
}

let currentDexRenderCount = 0;
let currentDexItems = [];
const DEX_CHUNK_SIZE = 30;
let dexObserver = null;
let imageLazyObserver = null;

// ==========================================
// GLOBALER IMAGE CACHE (Session-persistent)
// ==========================================
const dexImageCache = new Map();

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

    // Sofort als 'pending' markieren – verhindert doppelte Netzwerk-Requests
    // wenn preloadAllDexImages mehrfach mit denselben URLs aufgerufen wird.
    queue.forEach(url => dexImageCache.set(url, 'pending'));

    const MAX_CONCURRENT = 6;
    let active = 0;

    function loadNext() {
        while (active < MAX_CONCURRENT && queue.length > 0) {
            const url = queue.shift();
            active++;
            const img = new Image();
            img.onload  = () => { dexImageCache.set(url, 'loaded'); active--; loadNext(); };
            img.onerror = () => { dexImageCache.set(url, 'error');  active--; loadNext(); };
            img.src = url;
        }
    }

    // Nach nächstem Frame starten – sichtbare DOM-Bilder haben Vorrang
    requestAnimationFrame(loadNext);
}

function initImageLazyLoadObserver() {
    imageLazyObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            const src = img.getAttribute('data-src');
            if (!src) return;

            const container = img.closest('.dex-image-container');
            const shimmer   = container ? container.querySelector('.dex-placeholder') : null;

            const showImage = () => {
                img.classList.remove('opacity-0');
                dexImageCache.set(src, 'loaded');
                if (shimmer) shimmer.remove();
            };

            img.removeAttribute('data-src');
            observer.unobserve(img);

            if (dexImageCache.get(src) === 'loaded') {
                // Bild bereits vorgeladen → sofort anzeigen, keine 300ms Fade-Transition.
                // transition-opacity duration-300 ist eine CSS-Klasse; style.transition
                // überschreibt sie inline und macht den Übergang instantan.
                img.style.transition = 'none';
                img.src = src;
                showImage();
                return;
            }

            img.onload  = showImage;
            img.onerror = () => {
                img.src = 'https://via.placeholder.com/150/000000/FFFFFF?text=?';
                dexImageCache.set(src, 'error');
                img.classList.remove('opacity-0');
                if (shimmer) shimmer.remove();
            };
            img.src = src;
        });
    }, { rootMargin: '0px 0px 400px 0px' });
}

function initDexObserver() {
    if (dexObserver) dexObserver.disconnect();
    const sentinel = document.getElementById('dex-sentinel');
    if (!sentinel) return;

    dexObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMoreDexItems();
    }, { rootMargin: '800px' });

    dexObserver.observe(sentinel);
}

const DEX_FIRST_CHUNK = 9;

function renderDexGrid(items) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;

    currentDexItems = items;
    currentDexRenderCount = 0;

    loadMoreDexItems(DEX_FIRST_CHUNK, true);
    initDexObserver();

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
    const chunkSize    = chunkOverride || DEX_CHUNK_SIZE;
    const nextChunk    = currentDexItems.slice(currentDexRenderCount, currentDexRenderCount + chunkSize);
    if (!nextChunk.length) return;

    const cols = localStorage.getItem('dexColumns') || '3';
    const is2Cols = cols === '2';
    const glowActive = localStorage.getItem('dexGlow') === 'true';

    const fragment = document.createDocumentFragment();

    nextChunk.forEach((snus, index) => {
        const isUnlocked    = !!globalUserCollection[snus.id];
        const formattedId   = '#' + String(snus.id).padStart(3, '0');
        const rarity        = (snus.rarity || 'common').toLowerCase().trim();
        const boxShadow     = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
        const imgUrl        = GITHUB_BASE + snus.image;

        const rarityIndicator = is2Cols
            ? `<span class="text-[10px] font-bold tracking-wide uppercase" style="color: var(--${rarity}, var(--common)); text-shadow: 0px 0px 8px var(--${rarity}, var(--common));">${tRarity(snus.rarity)}</span>`
            : `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;

        const placeholderHTML = `<div class="dex-placeholder absolute inset-0 flex items-center justify-center pointer-events-none"><div class="w-[60%] h-[60%] rounded-xl sk"></div></div>`;

        // Erste Chunk: gestaffeltes Fade-in. Spätere Chunks: keine Animation → kein GPU-Layer-Overhead
        const animClass = isFirstChunk ? 'opacity-0' : '';
        const animStyle = isFirstChunk
            ? ` style="animation: fadeViewIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both ${Math.floor(index / 3) * 70}ms"`
            : '';

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div onclick="openSnusDetail(${snus.id})" class="dex-anim-card cursor-pointer group h-full w-full origin-center ${animClass}"${animStyle}><div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] transition-transform duration-200 group-active:scale-95 shadow-md overflow-hidden ${!isUnlocked ? 'opacity-40 grayscale' : ''}" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}"><div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10"><span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>${rarityIndicator}</div><div class="dex-image-container w-full aspect-square flex items-center justify-center relative mt-1 overflow-hidden">${placeholderHTML}<img data-src="${imgUrl}" class="dex-lazy-img w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10 opacity-0 transition-opacity duration-300"></div><div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10"><h5 class="text-[12px] font-semibold leading-tight line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5></div></div></div>`.trim();
        fragment.appendChild(wrapper.firstChild);
    });

    grid.appendChild(fragment);
    currentDexRenderCount += nextChunk.length;

    if (isFirstChunk) {
        grid.style.opacity = '1';
    }

    if (!imageLazyObserver) initImageLazyLoadObserver();

    requestAnimationFrame(() => {
        if (isFirstChunk) recalcHapticThreshold();

        grid.querySelectorAll('.dex-lazy-img:not(.observed)').forEach(img => {
            img.classList.add('observed');
            imageLazyObserver.observe(img);
        });

        if (isFirstChunk) updateDexScale();
    });
}

let dexSortMode = localStorage.getItem('dexDefaultSort') || 'id';
let dexFilterUnlocked = false;
let dexFilterFavorites = false;

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

window.getFavoriteSnusList = function() {
    try {
        return JSON.parse(localStorage.getItem('dexFavoriteSnus') || '[]');
    } catch (e) {
        return [];
    }
};

window.isFavoriteSnus = function(id) {
    const list = window.getFavoriteSnusList();
    return list.includes(parseInt(id));
};

window.toggleFavoriteSnus = function(id) {
    const snusId = parseInt(id);
    let list = window.getFavoriteSnusList();
    if (list.includes(snusId)) {
        list = list.filter(item => item !== snusId);
    } else {
        list.push(snusId);
    }
    localStorage.setItem('dexFavoriteSnus', JSON.stringify(list));
    window.updateModalFavoriteBtnUI(snusId);
    
    // Refresh the Dex grid to reflect the change if active
    if (typeof filterDex === 'function') {
        filterDex();
    }
};

window.updateModalFavoriteBtnUI = function(id) {
    const btn = document.getElementById('modal-favorite-btn');
    if (!btn) return;

    const isFav = window.isFavoriteSnus(id);

    // Nur visuelle Klassen wechseln — Positions-Klassen bleiben im HTML untouched
    const favoriteClasses   = ['bg-[#FFD60A]/10', 'border-[#FFD60A]/20', 'text-[#FFD60A]', 'shadow-[0_0_14px_rgba(255,214,10,0.25)]'];
    const defaultClasses    = ['bg-white/10', 'border-white/5', 'text-[#8E8E93]'];

    if (isFav) {
        btn.classList.remove(...defaultClasses);
        btn.classList.add(...favoriteClasses);
        btn.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
        `;
    } else {
        btn.classList.remove(...favoriteClasses);
        btn.classList.add(...defaultClasses);
        btn.innerHTML = `
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499c.195-.39.638-.39.832 0l2.673 5.418 5.978.868c.43.063.602.589.291.896l-4.325 4.215 1.021 5.952c.074.43-.377.757-.76.552L12 18.252l-5.353 2.923c-.383.205-.834-.122-.76-.552l1.021-5.952-4.325-4.215c-.311-.307-.139-.833.291-.896l5.978-.868 2.673-5.418z" />
            </svg>
        `;
    }

    // Pop-Animation re-triggern
    btn.classList.remove('favorite-pop-anim');
    void btn.offsetWidth;
    btn.classList.add('favorite-pop-anim');
};

window.toggleFavoriteSnusWrapper = function() {
    const globalId = window.currentSelectedSnusId || (typeof currentSelectedSnusId !== 'undefined' ? currentSelectedSnusId : null);
    if (globalId) {
        window.toggleFavoriteSnus(globalId);
    }
};

window.toggleDexFilterFavorites = function() {
    dexFilterFavorites = !dexFilterFavorites;
    const btn = document.getElementById('dex-filter-favorites-btn');
    if (!btn) return;
    
    if (dexFilterFavorites) {
        btn.classList.add('bg-white', 'text-[#FFD60A]');
        btn.classList.remove('text-[#8E8E93]', 'bg-white/10');
        btn.innerHTML = `
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
        `;
    } else {
        btn.classList.remove('bg-white', 'text-[#FFD60A]');
        btn.classList.add('text-[#8E8E93]', 'bg-white/10');
        btn.innerHTML = `
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499c.195-.39.638-.39.832 0l2.673 5.418 5.978.868c.43.063.602.589.291.896l-4.325 4.215 1.021 5.952c.074.43-.377.757-.76.552L12 18.252l-5.353 2.923c-.383.205-.834-.122-.76-.552l1.021-5.952-4.325-4.215c-.311-.307-.139-.833.291-.896l5.978-.868 2.673-5.418z" />
            </svg>
        `;
    }
    filterDex();
};

// setupProfile: nur eine Definition weiter unten

function triggerHapticFeedback() {
    if (localStorage.getItem('hapticGlobal') === 'off') return;
    if (window.webkit && window.webkit.messageHandlers.hapticHandler) window.webkit.messageHandlers.hapticHandler.postMessage("vibrate");
    else if (navigator.vibrate) navigator.vibrate(15);
}

// ==========================================
// FILTER DEX — Lag-freie Version
// ==========================================
// Zentrale Laufzeit-Guards, damit keine alten Render-Jobs
// mit einem neuen Render-Aufruf kollidieren.
let _filterDexRaf   = null;
let _filterDexTimer = null;

function filterDex() {
    const searchEl = document.getElementById('dex-search');
    if (!searchEl) return;

    const term        = searchEl.value.toLowerCase().trim();
    const searchWords = term ? term.split(/\s+/) : [];

    let filtered = globalSnusData.filter(s => {
        if (dexFilterUnlocked && !globalUserCollection[s.id]) return false;
        if (dexFilterFavorites && !window.isFavoriteSnus(s.id)) return false;

        if (searchWords.length > 0) {
            const searchableText = [
                s.name,
                s.brand,
                Array.isArray(s.flavor) ? s.flavor.join(' ') : s.flavor
            ].filter(Boolean).join(' ').toLowerCase();

            if (!searchWords.every(word => searchableText.includes(word))) return false;
        }

        return true;
    });

    const grid = document.getElementById('dex-grid');
    if (!grid) return;

    // ── Laufende Timer + RAFs canceln ────────────────────────────────────────
    if (_filterDexRaf)   { cancelAnimationFrame(_filterDexRaf);  _filterDexRaf = null; }
    if (_filterDexTimer) { clearTimeout(_filterDexTimer);         _filterDexTimer = null; }

    const hasRealContent = grid.querySelector('.dex-anim-card, .brand-section') !== null;

    // ── Falls kein echter Inhalt: Skeleton sofort zeigen, dann rendern ────────
    if (!hasRealContent) {
        _injectDexSkeleton(grid);
        grid.style.opacity = '1';
        _filterDexRaf = requestAnimationFrame(() => {
            _filterDexRaf = null;
            _executeDexRender(grid, filtered);

            // Sichtbarste Bilder nachladen – nach dem ersten Render, damit
            // der initiale Paint nicht verzögert wird.
            setTimeout(() => {
                if (dexSortMode === 'alpha') {
                    const previewGroups = groupAndSortByBrand(filtered);
                    const previewItems  = previewGroups.slice(0, 3).flatMap(g => g.items.slice(0, 3));
                    preloadAllDexImages(previewItems);
                } else {
                    const sortedPreview = filtered.slice().sort((a, b) => parseInt(a.id) - parseInt(b.id));
                    preloadAllDexImages(sortedPreview.slice(0, 9));
                }
            }, 150);
        });
        return;
    }

    // ── Echter Inhalt: kurzes Fade-Out, dann austauschen ─────────────────────
    // Grid-Klasse NICHT hier setzen – erst in _executeDexRender(), damit das
    // alte Content während des Fade-Outs noch im korrekten Layout bleibt.

    // Während des Fade-Outs die sichtbarsten Bilder vorladen (3 Marken × 3 Items
    // bzw. erste 9 IDs), damit sie cache-ready sind wenn der neue Content erscheint.
    // Nur beim Sort-Toggle – nicht beim initialen Render (hasRealContent = false).
    if (dexSortMode === 'alpha') {
        const previewGroups = groupAndSortByBrand(filtered);
        const previewItems  = previewGroups.slice(0, 3).flatMap(g => g.items.slice(0, 3));
        preloadAllDexImages(previewItems);
    } else {
        const sortedPreview = filtered.slice().sort((a, b) => parseInt(a.id) - parseInt(b.id));
        preloadAllDexImages(sortedPreview.slice(0, 9));
    }

    grid.style.transition   = 'opacity 0.18s ease-out';
    grid.style.opacity      = '0';
    grid.style.pointerEvents = 'none';

    _filterDexTimer = setTimeout(() => {
        _filterDexTimer = null;
        grid.style.transition    = 'none';
        grid.style.opacity       = '1';
        grid.style.pointerEvents = '';
        window.scrollTo(0, 0);

        _executeDexRender(grid, filtered);
    }, 180);
}

function _injectDexSkeleton(grid) {
    if (dexSortMode === 'alpha') {
        grid.innerHTML = [1, 2, 3].map(() => `
            <div class="brand-section mb-4 w-[calc(100%+40px)] -mx-[20px] px-5 opacity-50">
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
            </div>`).join('');
    } else {
        grid.innerHTML = [...Array(12)].map(() => `
            <div class="aspect-[1/1.2] bg-[#2A2A2E] rounded-[20px] border border-white/5 overflow-hidden flex flex-col">
                <div class="flex justify-between p-2.5"><div class="sk h-2.5 w-6 rounded-full"></div><div class="sk w-2.5 h-2.5 rounded-full"></div></div>
                <div class="flex-1 flex items-center justify-center"><div class="sk w-[60%] h-[60%] rounded-xl"></div></div>
                <div class="p-2 flex justify-center"><div class="sk h-3 w-[70%] rounded-full"></div></div>
            </div>`).join('');
    }
}

function _executeDexRender(grid, filtered) {
    // Alten Image-Observer wegwerfen: verhindert Speicherlecks durch
    // beobachtete Elemente die gleich aus dem DOM entfernt werden.
    if (imageLazyObserver) {
        imageLazyObserver.disconnect();
        imageLazyObserver = null;
    }

    // Grid-Layout hier setzen (nicht in filterDex), damit altes Content
    // während des Fade-Outs noch im korrekten Layout verbleibt.
    if (dexSortMode === 'alpha') {
        grid.className = 'flex flex-col w-full';
        if (dexObserver) dexObserver.disconnect();
    } else {
        const cols = localStorage.getItem('dexColumns') || '3';
        grid.className = `grid ${cols === '2' ? 'grid-cols-2' : 'grid-cols-3'} gap-3`;
    }

    if (dexSortMode === 'alpha') {
        const groupedData = groupAndSortByBrand(filtered);
        renderDexGrouped(groupedData);
    } else {
        filtered.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        renderDexGrid(filtered);
    }
}
