// ==========================================
// DEX SCROLL ANIMATION & HAPTICS (PIXEL-PERFECT)
// ==========================================
let dexScrollRafId = null;
let lastHapticScrollY = 0;
let _dexScrollListenerActive = false;
// Dynamic threshold – updated after first render to match actual card row height
let HAPTIC_PIXEL_THRESHOLD = 140;

// Called from loadMoreDexItems after first chunk: compute real row height from DOM
function recalcHapticThreshold() {
    const grid = document.getElementById('dex-grid');
    if (!grid || grid.children.length < 2) return;
    const first = grid.children[0].getBoundingClientRect();
    const second = grid.children[1].getBoundingClientRect();
    // In 3-col layout rows differ by top position; in 2-col too
    // Walk cards until we find one on the next row (different top)
    let rowHeight = 0;
    for (let i = 1; i < Math.min(grid.children.length, 12); i++) {
        const rect = grid.children[i].getBoundingClientRect();
        if (rect.top > first.top + 4) {
            rowHeight = rect.top - first.top;
            break;
        }
    }
    if (rowHeight > 30) {
        HAPTIC_PIXEL_THRESHOLD = rowHeight;
    }
}

function updateDexScale() {
    if (typeof dexSortMode !== 'undefined' && dexSortMode === 'alpha') return;

    const grid = document.getElementById('dex-grid');
    if (!grid || grid.children.length === 0) return;

    const viewportCenter = window.innerHeight / 2;
    const focusZoneHalfHeight = window.innerHeight * 0.25;
    const fadeZoneHeight = window.innerHeight * 0.2;
    // Nur Karten in einem erweiterten Viewport prüfen (Culling)
    const cullMargin = window.innerHeight * 1.5;
    const cards = grid.querySelectorAll('.dex-anim-card');

    // 1. DOM Reads - alle rects auf einmal lesen (kein thrashing)
    const rects = Array.from(cards).map(card => ({
        card,
        rect: card.getBoundingClientRect()
    }));

    // 2. DOM Writes - gebatcht, nur für Karten im erweiterten Viewport
    rects.forEach(({ card, rect }) => {
        const cardCenter = rect.top + rect.height / 2;

        // Culling: Karten weit außerhalb nicht anfassen
        if (rect.bottom < -cullMargin || rect.top > window.innerHeight + cullMargin) {
            return;
        }

        const distanceToCenter = Math.abs(viewportCenter - cardCenter);
        let scale = 1.0;
        let opacity = 1.0;

        if (distanceToCenter > focusZoneHalfHeight) {
            let progress = (distanceToCenter - focusZoneHalfHeight) / fadeZoneHeight;
            if (progress > 1) progress = 1;
            scale = 1.0 - (0.15 * progress);
            opacity = 1.0 - (0.6 * progress);
        }

        card.style.transform = `scale(${scale})`;
        card.style.opacity = opacity;
    });
}

function initDexScrollAnimation() {
    lastHapticScrollY = window.scrollY;
    if (_dexScrollListenerActive) return; // Verhindert doppelte Registrierung
    _dexScrollListenerActive = true;

    window.addEventListener('scroll', () => {
        const dexTab = document.getElementById('tab-dex');
        // Dex is active when it does NOT have the tab-dex-hidden class
        const dexIsActive = dexTab && !dexTab.classList.contains('tab-dex-hidden');

        if (dexIsActive) {
            // 1. Visual scale animation (60fps)
            if (dexScrollRafId) cancelAnimationFrame(dexScrollRafId);
            dexScrollRafId = requestAnimationFrame(updateDexScale);

            // 2. Row-based haptics – ONLY in ID sort mode
            if (dexSortMode === 'id') {
                const currentScrollY = window.scrollY;
                const scrollDelta = Math.abs(currentScrollY - lastHapticScrollY);

                if (scrollDelta >= HAPTIC_PIXEL_THRESHOLD) {
                    const timesToTrigger = Math.min(
                        Math.floor(scrollDelta / HAPTIC_PIXEL_THRESHOLD),
                        10 // safety cap for extreme flick-scrolls
                    );

                    // Fire all haptics immediately – no setTimeout delay
                    // so rapid flick scrolling fires bam-bam-bam without lag
                    for (let i = 0; i < timesToTrigger; i++) {
                        triggerLightHapticFeedback();
                    }

                    // Carry over the remainder so no pixel is "lost" between events
                    const sign = currentScrollY > lastHapticScrollY ? 1 : -1;
                    lastHapticScrollY = currentScrollY - (scrollDelta % HAPTIC_PIXEL_THRESHOLD) * sign;
                }
            } else {
                lastHapticScrollY = window.scrollY;
            }
        }
    }, { passive: true });
}

function triggerLightHapticFeedback() {
    if (window.webkit && window.webkit.messageHandlers.hapticHandler) {
        window.webkit.messageHandlers.hapticHandler.postMessage("selection");
    } else if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// ==========================================
// BRAND GROUPING & RENDERING (Sort by Name)
// ==========================================

function groupAndSortByBrand(items) {
    const groups = {};

    // 1. Gruppieren nach Marke
    items.forEach(snus => {
        const brand = snus.brand || 'Unbekannt';
        if (!groups[brand]) groups[brand] = [];
        groups[brand].push(snus);
    });

    // 2. Marken alphabetisch und nach Favoriten sortieren
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    const sortedBrands = Object.keys(groups).sort((a, b) => {
        const aFav = favoriteBrands.includes(a);
        const bFav = favoriteBrands.includes(b);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.localeCompare(b);
    });

    const result = [];
    sortedBrands.forEach(brand => {
        const brandItems = groups[brand];

        // 3. Innerhalb der Marke sortieren: Freigeschaltet zuerst, dann nach ID
        brandItems.sort((a, b) => {
            const aUnlocked = !!globalUserCollection[a.id];
            const bUnlocked = !!globalUserCollection[b.id];

            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;

            return parseInt(a.id) - parseInt(b.id);
        });

        const unlockedCount = brandItems.filter(item => !!globalUserCollection[item.id]).length;

        result.push({
            brandName: brand,
            items: brandItems,
            totalCount: brandItems.length,
            unlockedCount: unlockedCount
        });
    });

    return result;
}

let brandToRemove = null;

window.handleFavoriteClick = function (brandName) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    if (favoriteBrands.includes(brandName)) {
        showRemoveFavoriteModal(brandName);
    } else {
        favoriteBrands.push(brandName);
        localStorage.setItem('dexFavoriteBrands', JSON.stringify(favoriteBrands));
        filterDex();
    }
};

window.handleStatsFavoriteClick = function (brandName) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    if (favoriteBrands.includes(brandName)) {
        showRemoveFavoriteModal(brandName);
    } else {
        favoriteBrands.push(brandName);
        localStorage.setItem('dexFavoriteBrands', JSON.stringify(favoriteBrands));
        filterDex();
        openSettingsSubpage('Stats');
    }
};

window.showRemoveFavoriteModal = function (brandName) {
    brandToRemove = brandName;
    const modal = document.getElementById('remove-favorite-modal');
    const backdrop = document.getElementById('remove-favorite-backdrop');
    const card = document.getElementById('remove-favorite-card');
    const nameEl = document.getElementById('remove-favorite-brand-name');

    if (nameEl) nameEl.innerText = brandName;

    if (modal && backdrop && card) {
        document.body.classList.add('overflow-hidden');
        modal.classList.remove('hidden');
        // Force reflow
        void modal.offsetWidth;
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        card.classList.remove('scale-95', 'opacity-0');
        card.classList.add('scale-100', 'opacity-100');
    }
};

window.closeRemoveFavoriteModal = function () {
    const modal = document.getElementById('remove-favorite-modal');
    const backdrop = document.getElementById('remove-favorite-backdrop');
    const card = document.getElementById('remove-favorite-card');

    if (modal && backdrop && card) {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
        card.classList.remove('scale-100', 'opacity-100');
        card.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            modal.classList.add('hidden');
            brandToRemove = null;
            // Restore scroll if not in settings subpage (which also controls overflow)
            const subpage = document.getElementById('settings-subpage');
            if (!subpage || subpage.classList.contains('translate-x-full')) {
                document.body.classList.remove('overflow-hidden');
            }
        }, 300);
    }
};

window.confirmRemoveFavorite = function () {
    if (brandToRemove) {
        let favoriteBrands = [];
        try {
            favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
        } catch (e) { }

        favoriteBrands = favoriteBrands.filter(b => b !== brandToRemove);
        localStorage.setItem('dexFavoriteBrands', JSON.stringify(favoriteBrands));

        closeRemoveFavoriteModal();
        filterDex();

        const subpage = document.getElementById('settings-subpage');
        const titleEl = document.getElementById('subpage-title');
        if (titleEl && titleEl.innerText === 'Stats' && subpage && !subpage.classList.contains('translate-x-full')) {
            openSettingsSubpage('Stats');
        }
    }
};

function createBrandHeaderHTML(brandName, unlockedCount, totalCount) {
    let favoriteBrands = [];
    try {
        favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]');
    } catch (e) { }

    const isFav = favoriteBrands.includes(brandName);

    const starIcon = isFav
        ? `<svg class="w-4 h-4 text-yellow-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
        : `<svg class="w-4 h-4 text-[#8E8E93]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`;

    const safeBrandName = brandName.replace(/'/g, "\\'");

    return `
        <div class="flex justify-between items-end mb-3 px-5 mt-6 first:mt-2">
            <div class="flex items-center gap-2">
                <h2 class="text-[20px] font-semibold text-white tracking-tight">${brandName}</h2>
                <button onclick="handleFavoriteClick('${safeBrandName}')" class="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 border border-white/5 text-[#8E8E93] transition-all duration-200 active:scale-90 shadow-sm mb-0.5">
                    ${starIcon}
                </button>
            </div>
            <span class="text-[13px] font-medium text-[#8E8E93] bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                ${unlockedCount} / ${totalCount}
            </span>
        </div>
    `;
}

function createHorizontalCardHTML(snus, isUnlocked, glowActive) {
    const formattedId = '#' + String(snus.id).padStart(3, '0');
    const rarity = (snus.rarity || 'common').toLowerCase().trim();
    const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
    const rarityIndicator = `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;
    const imgUrl = GITHUB_BASE + snus.image;

    // Immer opacity-0 starten – verhindert Flash bei gecachten Bildern im Brand-Carousel
    const placeholderHTML = `<div class="dex-placeholder absolute inset-0 flex items-center justify-center pointer-events-none"><div class="w-[60%] h-[60%] rounded-xl sk"></div></div>`;
    const imgClass = `dex-lazy-img w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10 opacity-0 transition-opacity duration-300`;

    return `
        <div onclick="openSnusDetail(${snus.id})" class="brand-anim-card cursor-pointer group flex-shrink-0 w-[28vw] max-w-[120px] snap-center transition-all duration-200 ease-out origin-center will-change-transform">
            <div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] shadow-md overflow-hidden transition-transform group-active:scale-95 ${!isUnlocked ? 'opacity-40 grayscale' : ''}" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}">
                <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                    <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                    ${rarityIndicator}
                </div>
                <div class="dex-image-container w-full aspect-square flex items-center justify-center relative mt-1 overflow-hidden">
                    ${placeholderHTML}
                    <img data-src="${imgUrl}" class="${imgClass}">
                </div>
                <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                    <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 ${isUnlocked ? 'text-white' : 'text-[#8E8E93]'}">${snus.name}</h5>
                </div>
            </div>
        </div>
    `;
}

// Tracked scroll listener refs so we can remove them on re-render
let _brandScrollListeners = [];

function renderDexGrouped(groupedData) {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;

    // Bestehende Carousel-Scroll-Listener aufräumen
    _brandScrollListeners.forEach(({ el, fn }) => el.removeEventListener('scroll', fn));
    _brandScrollListeners = [];

    const glowActive = localStorage.getItem('dexGlow') === 'true';

    if (!imageLazyObserver) initImageLazyLoadObserver();

    // Preload all images in background after first paint
    const allAlphaItems = groupedData.flatMap(b => b.items);
    requestAnimationFrame(() => preloadAllDexImages(allAlphaItems));

    // Clear skeleton, show grid immediately
    grid.innerHTML = '';
    grid.style.opacity = '1';
    grid.style.transition = '';

    // Pulse animation: render each brand individually with staggered setTimeout
    // This creates a smooth wave/pulse effect on iPhone – each brand pops in after the previous
    const PULSE_DELAY_MS = 60; // ms between each brand appearing

    groupedData.forEach((brandData, globalIndex) => {
        const delay = globalIndex * PULSE_DELAY_MS;

        setTimeout(() => {
            if (!document.contains(grid)) return; // Guard: grid might be replaced

            const section = document.createElement('div');
            section.className = 'brand-section mb-4';
            section.style.marginLeft = '-20px';
            section.style.marginRight = '-20px';
            section.style.width = 'calc(100% + 40px)';
            section.style.contentVisibility = 'auto';
            section.style.containIntrinsicSize = '0 200px';

            // Each brand fades+slides in individually – no cumulative delay offset,
            // because setTimeout already handles the stagger.
            section.style.opacity = '0';
            section.style.transform = 'translateY(10px)';
            section.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

            const header = createBrandHeaderHTML(brandData.brandName, brandData.unlockedCount, brandData.totalCount);
            let cardsHTML = '';
            brandData.items.forEach(snus => {
                const isUnlocked = !!globalUserCollection[snus.id];
                cardsHTML += createHorizontalCardHTML(snus, isUnlocked, glowActive);
            });

            section.innerHTML = `
                ${header}
                <div class="brand-carousel flex gap-[3vw] overflow-x-auto pb-4 pt-3 snap-x snap-mandatory scroll-smooth px-5">
                    ${cardsHTML}
                </div>
            `;

            grid.appendChild(section);

            // Trigger transition on next frame (needs to be in DOM first)
            requestAnimationFrame(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
                // Clean up transition after it completes
                setTimeout(() => {
                    section.style.transition = '';
                }, 350);
            });

            // Register lazy loading for newly appended images
            section.querySelectorAll('.dex-lazy-img:not(.observed)').forEach(img => {
                img.classList.add('observed');
                imageLazyObserver.observe(img);
            });

            // Register scroll animation for this carousel
            const carousel = section.querySelector('.brand-carousel:not(.anim-init)');
            if (carousel) {
                carousel.classList.add('anim-init');
                initBrandScrollAnimation(carousel);
            }

            // Save cache after last brand is appended
            if (globalIndex === groupedData.length - 1) {
                const term = document.getElementById('dex-search')?.value.trim();
                if (!term) {
                    if (typeof _dexCache === 'undefined') window._dexCache = {};
                    window._dexCache['alpha' + (dexFilterUnlocked ? '_unlocked' : '')] = grid.innerHTML;
                }
            }
        }, delay);
    });
}

// Horizontale Scroll-Animation für Brand-Carousels
// Throttled mit RAF – ein Listener pro Carousel, kein Thrashing
function initBrandScrollAnimation(container) {
    const cards = Array.from(container.querySelectorAll('.brand-anim-card'));
    if (cards.length === 0) return;

    let rafPending = false;

    const updateScale = () => {
        rafPending = false;
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        const focusZoneHalfWidth = containerRect.width * 0.35;
        const fadeZoneWidth = containerRect.width * 0.15;

        // Alle Rects auf einmal lesen
        const rects = cards.map(card => card.getBoundingClientRect());

        // Dann alle Styles schreiben
        cards.forEach((card, i) => {
            const cardCenter = rects[i].left + rects[i].width / 2;
            const distanceToCenter = Math.abs(containerCenter - cardCenter);

            let scale = 1.0;
            let opacity = 1.0;

            if (distanceToCenter > focusZoneHalfWidth) {
                let progress = (distanceToCenter - focusZoneHalfWidth) / fadeZoneWidth;
                if (progress > 1) progress = 1;
                scale = 1.0 - (0.15 * progress);
                opacity = 1.0 - (0.6 * progress);
            }

            card.style.transform = `scale(${scale})`;
            card.style.opacity = opacity;
        });
    };

    updateScale(); // Initialer Aufruf

    const onScroll = () => {
        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(updateScale);
        }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    // Für späteres Cleanup tracken
    _brandScrollListeners.push({ el: container, fn: onScroll });
}

// ==========================================
// STATS HELPER
// ==========================================
function getBrandStats() {
    const stats = {};

    // Daten aggregieren
    globalSnusData.forEach(snus => {
        const brand = snus.brand || 'Unbekannt';
        const rarity = (snus.rarity || 'common').toLowerCase().trim();

        if (!stats[brand]) {
            stats[brand] = { total: 0, unlocked: 0, rarities: {} };
        }

        stats[brand].total++;
        if (globalUserCollection[snus.id]) {
            stats[brand].unlocked++;
        }

        if (!stats[brand].rarities[rarity]) {
            stats[brand].rarities[rarity] = 0;
        }
        stats[brand].rarities[rarity]++;
    });

    // In Array umwandeln und alphabetisch sortieren (Favoriten zuerst)
    let favoriteBrands = [];
    try { favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]'); } catch (e) { }

    return Object.keys(stats).map(brand => {
        // Find dominant rarity
        let dominantRarity = 'common';
        let maxCount = 0;
        for (const [r, count] of Object.entries(stats[brand].rarities)) {
            if (count > maxCount) {
                maxCount = count;
                dominantRarity = r;
            }
        }

        return {
            name: brand,
            total: stats[brand].total,
            unlocked: stats[brand].unlocked,
            dominantRarity: dominantRarity
        };
    }).sort((a, b) => {
        const aFav = favoriteBrands.includes(a.name);
        const bFav = favoriteBrands.includes(b.name);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.name.localeCompare(b.name);
    });
}
