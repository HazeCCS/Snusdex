// ==========================================
// 5. RATING ENGINE & MODAL LOGIK
// ==========================================

let detailStartY = 0;
let detailCurrentY = 0;
let isDetailDragging = false;

function setupGlobalSwipe() {
    const card = document.getElementById('snus-modal-card');
    if (!card) return;

    card.addEventListener('touchstart', (e) => {
        detailStartY = e.touches[0].clientY;
        detailCurrentY = detailStartY;
        isDetailDragging = true;
        card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isDetailDragging) return;

        detailCurrentY = e.touches[0].clientY;
        const deltaY = detailCurrentY - detailStartY;

        if (deltaY > 0) {
            card.style.transform = `translateY(${deltaY}px)`;
        }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
        if (!isDetailDragging) return;
        isDetailDragging = false;

        const deltaY = detailCurrentY - detailStartY;
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaY > 100) {
            card.style.transform = 'translateY(100%)';
            closeSnusDetail(true);
        } else {
            card.style.transform = 'translateY(0px)';
            setTimeout(() => {
                card.style.transform = '';
                card.style.transition = '';
            }, 400);
        }
    });
}

setupGlobalSwipe();

let tempRatings = {
    taste: null,
    taste_text: '',
    smell: null,
    smell_text: '',
    bite: null,
    bite_text: '',
    drip: null,
    drip_text: '',
    visuals: null,
    visuals_text: '',
    strength: null,
    strength_text: ''
};
let currentSelectedSnusId = null;

const RATING_STEPS = ['visuals', 'smell', 'taste', 'bite', 'drip', 'strength'];
let currentRatingStepIndex = 0;

function getRatingColor(val) {
    // Returns a CSS color string transitioning red(1)→yellow(5)→green(7)→blue(10)
    const stops = [
        { v: 1,  r: 255, g: 59,  b: 48  }, // iOS red
        { v: 4,  r: 255, g: 159, b: 10  }, // iOS orange
        { v: 6,  r: 255, g: 214, b: 10  }, // iOS yellow
        { v: 8,  r: 52,  g: 199, b: 89  }, // iOS green
        { v: 10, r: 10,  g: 132, b: 255 }  // iOS blue
    ];
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (val >= stops[i].v && val <= stops[i + 1].v) { lo = stops[i]; hi = stops[i + 1]; break; }
    }
    const t = (val - lo.v) / (hi.v - lo.v);
    const r = Math.round(lo.r + t * (hi.r - lo.r));
    const g = Math.round(lo.g + t * (hi.g - lo.g));
    const b = Math.round(lo.b + t * (hi.b - lo.b));
    return `rgb(${r},${g},${b})`;
}

function initRatingWizard() {
    currentRatingStepIndex = 0;

    RATING_STEPS.forEach(cat => {
        tempRatings[cat] = null;
        tempRatings[`${cat}_text`] = '';

        const row = document.getElementById(`row-${cat}`);
        if (!row) return;
        row.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'rating-btn inactive';
            btn.setAttribute('data-val', i);
            btn.innerText = i;
            btn.onclick = () => setRating(cat, i);
            row.appendChild(btn);
        }
        const valIndicator = row.parentElement.querySelector('.rating-val');
        if (valIndicator) valIndicator.innerText = '';

        const textEl = document.getElementById(`text-${cat}`);
        if (textEl) textEl.value = '';
    });

    updateRatingStepUI();
}

function setRating(category, value) {
    tempRatings[category] = value;
    const color = getRatingColor(value);
    const row = document.getElementById(`row-${category}`);
    row.querySelectorAll('.rating-btn').forEach((btn) => {
        const btnVal = parseInt(btn.getAttribute('data-val'));
        if (btnVal === value) {
            btn.className = 'rating-btn active';
            btn.style.setProperty('--accent-color', color);
            btn.style.color = color;
            btn.style.borderColor = color;
            btn.style.background = color + '22';
            btn.style.boxShadow = `0 0 10px ${color}55`;
        } else {
            btn.className = 'rating-btn inactive';
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.style.background = '';
            btn.style.boxShadow = '';
        }
    });
    const valIndicator = row.parentElement.querySelector('.rating-val');
    if (valIndicator) {
        valIndicator.innerText = `${value}/10`;
        valIndicator.style.color = color;
    }
    // Remove warning state if it was shown
    row.classList.remove('rating-row--warn');
    triggerHapticFeedback();
}

function updateRatingStepUI() {
    const backBtn = document.getElementById('rating-back-btn');
    const cancelBtn = document.getElementById('rating-cancel-btn');
    const nextBtn = document.getElementById('rating-next-btn');
    const nextText = document.getElementById('rating-next-text');
    const nextIcon = document.getElementById('rating-next-icon');
    const title = document.getElementById('rating-step-title');
    const indicator = document.getElementById('rating-step-indicator');

    if (!title) return;

    title.innerText = t('rating.' + RATING_STEPS[currentRatingStepIndex]);
    indicator.innerText = `${currentRatingStepIndex + 1}/${RATING_STEPS.length}`;

    if (currentRatingStepIndex === 0) {
        if (backBtn) backBtn.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
    } else {
        if (backBtn) backBtn.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    if (currentRatingStepIndex === 0) {
        backBtn.classList.add('opacity-0', 'pointer-events-none');
        backBtn.classList.remove('opacity-100', 'pointer-events-auto');
    } else {
        backBtn.classList.remove('opacity-0', 'pointer-events-none');
        backBtn.classList.add('opacity-100', 'pointer-events-auto', 'cursor-pointer');
    }

    if (currentRatingStepIndex === RATING_STEPS.length - 1) {
        nextText.innerText = t('rating.save');
        nextBtn.classList.remove('bg-white', 'text-black');
        nextBtn.classList.add('bg-[#34C759]', 'text-white', 'shadow-[0_4px_14px_rgba(52,199,89,0.3)]');
        nextIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />`;
    } else {
        nextText.innerText = t('rating.next');
        nextBtn.classList.remove('bg-[#34C759]', 'text-white', 'shadow-[0_4px_14px_rgba(52,199,89,0.3)]');
        nextBtn.classList.add('bg-white', 'text-black');
        nextIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />`;
    }

    RATING_STEPS.forEach((step, index) => {
        const panel = document.getElementById(`step-${step}`);
        if (!panel) return;

        panel.classList.remove('translate-x-0', 'translate-x-full', '-translate-x-full', 'opacity-0', 'opacity-100', 'z-10', 'z-0', 'pointer-events-none');

        if (index === currentRatingStepIndex) {
            panel.classList.add('translate-x-0', 'opacity-100', 'z-10');
        } else if (index < currentRatingStepIndex) {
            panel.classList.add('-translate-x-full', 'opacity-0', 'z-0', 'pointer-events-none');
        } else {
            panel.classList.add('translate-x-full', 'opacity-0', 'z-0', 'pointer-events-none');
        }
    });
}

function nextRatingStep() {
    const currentStep = RATING_STEPS[currentRatingStepIndex];

    // Guard: require a rating selection before proceeding
    if (tempRatings[currentStep] === null) {
        const row = document.getElementById(`row-${currentStep}`);
        if (row) {
            row.classList.remove('rating-row--warn');
            void row.offsetWidth; // reflow to restart animation
            row.classList.add('rating-row--warn');
        }
        return;
    }

    const textEl = document.getElementById(`text-${currentStep}`);
    if (textEl) tempRatings[`${currentStep}_text`] = textEl.value;

    if (currentRatingStepIndex < RATING_STEPS.length - 1) {
        currentRatingStepIndex++;
        updateRatingStepUI();
    } else {
        collectCurrentSnus();
    }
}

function prevRatingStep() {
    const currentStep = RATING_STEPS[currentRatingStepIndex];
    const textEl = document.getElementById(`text-${currentStep}`);
    if (textEl) tempRatings[`${currentStep}_text`] = textEl.value;

    if (currentRatingStepIndex > 0) {
        currentRatingStepIndex--;
        updateRatingStepUI();
    }
}

function showInfoView() {
    hideAllViews();
    document.getElementById('modal-view-info').classList.remove('hidden');

    // Favorite- und Close-Button anzeigen + Pop-Animation triggern
    ['modal-favorite-btn', 'modal-close-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.remove('hidden');
        btn.classList.remove('favorite-pop-anim');
        void btn.offsetWidth;
        btn.classList.add('favorite-pop-anim');
    });
}

function showRatingView() {
    hideAllViews();
    document.getElementById('modal-view-rating').classList.remove('hidden');
    document.getElementById('modal-view-rating').classList.add('flex');

    // Favorite- und Close-Button während der Bewertung ausblenden
    ['modal-favorite-btn', 'modal-close-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.add('hidden');
    });
}

function showSavedRating() {
    hideAllViews();
    document.getElementById('modal-view-saved-rating').classList.remove('hidden');
    document.getElementById('modal-view-saved-rating').classList.add('flex');

    // Favorite- und Close-Button auch in der Bewertungs-Ansicht ausblenden
    ['modal-favorite-btn', 'modal-close-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.add('hidden');
    });
    let ratings = globalUserCollection[currentSelectedSnusId]?.ratings || {
        taste: 5,
        smell: 5,
        bite: 5,
        drip: 5,
        visuals: 5,
        strength: 5
    };

    const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag])) : '';

    const createBar = (label, val, text) => {
        const hasText = text && String(text).trim() !== '';
        return `
            <div class="mb-4">
                <div class="flex justify-between text-[13px] text-[#8E8E93] mb-1"><span>${label}</span><span class="text-white">${val}/10</span></div>
                <div class="w-full bg-black rounded-full h-1.5 mb-2"><div class="bg-white h-1.5 rounded-full" style="width: ${val * 10}%"></div></div>
                ${hasText ? `<div class="bg-black/40 border border-white/10 rounded-xl p-3 text-[14px] text-white/90 italic shadow-sm mt-2 leading-relaxed">"${escapeHTML(text)}"</div>` : ''}
            </div>`;
    };

    document.getElementById('saved-rating-bars').innerHTML =
        createBar(t('rating.visuals'), ratings.visuals, ratings.visuals_text) +
        createBar(t('rating.smell'), ratings.smell, ratings.smell_text) +
        createBar(t('rating.taste'), ratings.taste, ratings.taste_text) +
        createBar(t('rating.bite'), ratings.bite, ratings.bite_text) +
        createBar(t('rating.drip'), ratings.drip, ratings.drip_text) +
        createBar(t('rating.strength'), ratings.strength, ratings.strength_text);
}

function tRarity(rarity) {
    const key = 'rarity.' + (rarity || 'common').toLowerCase().trim();
    const tr = t(key);
    return tr !== key ? tr : rarity;
}

function hideAllViews() {
    document.getElementById('modal-view-info').classList.add('hidden');
    document.getElementById('modal-view-rating').classList.add('hidden');
    document.getElementById('modal-view-rating').classList.remove('flex');
    document.getElementById('modal-view-saved-rating').classList.add('hidden');
    document.getElementById('modal-view-saved-rating').classList.remove('flex');
}

function openSnusDetail(id, isFromScan = false) {
    // 1. DATEN-CHECK
    // Sicherstellen, dass die ID eine Zahl ist, falls sie als String kommt
    const snusId = parseInt(id);
    const snus = globalSnusData.find(s => parseInt(s.id) === snusId);

    if (!snus) {
        console.error("Snus mit ID " + id + " nicht gefunden!");
        return;
    }

    currentSelectedSnusId = snusId;
    window.currentSelectedSnusId = snusId;
    if (typeof window.updateModalFavoriteBtnUI === 'function') {
        window.updateModalFavoriteBtnUI(snusId);
    }

    // 2. ELEMENTE SICHER BEFÜLLEN (mit Fallbacks)
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    const setHTML = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    // ID Formatieren (z.B. #001)
    setText('modal-id', '#' + String(snus.id).padStart(3, '0'));
    setText('modal-name', snus.name || t('common.unknownSnus'));

    // Rarity & Nicotine
    const rarity = (snus.rarity || 'Common').trim();
    const rarityLower = rarity.toLowerCase();
    const nicotine = snus.nicotine || '??';

    const isUnlocked = globalUserCollection[snusId];

    setHTML('modal-nicotine', `
        <span class="px-3 py-1.5 bg-white/10 border border-white/5 rounded-full text-[13px] font-semibold text-white tracking-wide shadow-sm">${nicotine} ${t('unit.mgPerG')}</span>
        <span class="px-3 py-1.5 bg-[var(--${rarityLower},var(--common))]/10 border border-[var(--${rarityLower},var(--common))]/30 rounded-full text-[13px] font-bold uppercase tracking-wider" style="color: var(--${rarityLower}, var(--common)); text-shadow: 0px 0px 8px var(--${rarityLower}, var(--common));">${tRarity(rarity)}</span>
    `);

    // Bild laden + Skeleton-Overlay steuern
    const modalImg = document.getElementById('modal-image');
    const imgSkeleton = document.getElementById('modal-img-skeleton');
    if (modalImg) {
        if (imgSkeleton) { imgSkeleton.style.opacity = '1'; imgSkeleton.style.transition = 'none'; }
        modalImg.style.opacity = '0';
        modalImg.onload = () => {
            if (imgSkeleton) { imgSkeleton.style.transition = 'opacity 0.3s ease'; imgSkeleton.style.opacity = '0'; }
            modalImg.style.opacity = '1';
        };
        modalImg.onerror = () => {
            if (imgSkeleton) imgSkeleton.style.opacity = '0';
            modalImg.style.opacity = '1';
        };
        modalImg.src = snus.image ? `${GITHUB_BASE}${snus.image}` : 'placeholder.png';
    }

    // 2.5 NACHBESTELLEN LINK DYNAMISCH SETZEN
    // Hier kannst du den Affiliate-Link anpassen:
    const affiliateLink = `https://snuzone.com/search?q=${encodeURIComponent(snus.name)}`;

    const orderBtn = document.getElementById('order-snus-btn');
    if (orderBtn) orderBtn.href = affiliateLink;

    const orderBtnUncollected = document.getElementById('order-snus-btn-uncollected');
    if (orderBtnUncollected) orderBtnUncollected.href = affiliateLink;

    // 3. COLLECTION STATUS (Freigeschaltet oder nicht)
    // isUnlocked already defined above
    const uncollectedGroup = document.getElementById('uncollected-action-group');
    const scannedGroup = document.getElementById('scanned-action-group');
    const statusGroup = document.getElementById('modal-collected-status');
    const dateEl = document.getElementById('modal-unlocked-date');

    // Erstmal alles verstecken
    if (uncollectedGroup) uncollectedGroup.classList.add('hidden');
    if (scannedGroup) scannedGroup.classList.add('hidden');
    if (statusGroup) statusGroup.classList.add('hidden');

    if (isUnlocked) {
        // Fall: Bereits gesammelt
        if (statusGroup) statusGroup.classList.remove('hidden');
        if (dateEl && isUnlocked.date) {
            const dateObj = new Date(isUnlocked.date);
            dateEl.innerText = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
        }

        // Live-Daten lokal aus dem Cache lesen (instant)
        const openedCountEl = document.getElementById('modal-opened-count');

        // Alle Logs für diese Snus aus dem Cache filtern
        const snusLogs = globalAllLogs.filter(l => l.snus_id === snusId);

        // Öffnungsanzahl updaten
        if (openedCountEl) {
            const count = snusLogs.length;
            openedCountEl.innerText = count > 0 ? `${count}x` : '0x';
        }

        // "Unlocked at" mit dem ältesten (letzten im Array, da descending sortiert) opened_at überschreiben
        // falls Logs existieren. (Wir gehen auf Nummer sicher und suchen das kleinste Datum)
        if (dateEl && snusLogs.length > 0) {
            const earliestLog = snusLogs.reduce((prev, curr) => {
                return (new Date(prev.opened_at) < new Date(curr.opened_at)) ? prev : curr;
            });
            const firstOpen = new Date(earliestLog.opened_at);
            dateEl.innerText = firstOpen.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        }
    } else {
        // Fall: Noch nicht gesammelt
        if (isFromScan) {
            if (scannedGroup) scannedGroup.classList.remove('hidden');
        } else {
            if (uncollectedGroup) uncollectedGroup.classList.remove('hidden');
        }
    }

    // 4. VIEWS AKTIVIEREN
    if (typeof showInfoView === "function") showInfoView();
    if (typeof initRatingWizard === "function") initRatingWizard();

    // 5. MODAL ANZEIGEN & ANIMIEREN
    const modal = document.getElementById('snus-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');

    if (modal && backdrop && card) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');

            card.classList.remove('translate-y-full');
            card.classList.add('translate-y-0');
        }, 10);
    }

    if (typeof triggerHapticFeedback === "function") triggerHapticFeedback();
}

function closeSnusDetail(isDragging = false) {
    const backdrop = document.getElementById('modal-backdrop');
    const card = document.getElementById('snus-modal-card');

    // 1. Haptik sofort auslösen wie beim Scanner
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    // 2. Animation
    card.classList.remove('translate-y-0');
    card.classList.add('translate-y-full');

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');

    if (!isDragging) {
        card.style.transform = '';
        card.style.transition = '';
    }

    // 3. Reset
    setTimeout(() => {
        document.getElementById('snus-modal').classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        if (isDragging) {
            card.style.transform = '';
            card.style.transition = '';
        }
    }, 400);
}

// ==========================================
// 6. DB INSERT (BUG GEFIXT)
// ==========================================

async function collectCurrentSnus() {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const btn = document.getElementById('rating-next-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;
    btn.disabled = true;

    const isUpdate = !!globalUserCollection[currentSelectedSnusId];
    let error;
    let savedDate = new Date().toISOString();

    const payload = {
        rating_taste: tempRatings.taste,
        rating_taste_text: tempRatings.taste_text,
        rating_smell: tempRatings.smell,
        rating_smell_text: tempRatings.smell_text,
        rating_bite: tempRatings.bite,
        rating_bite_text: tempRatings.bite_text,
        rating_drip: tempRatings.drip,
        rating_drip_text: tempRatings.drip_text,
        rating_visuals: tempRatings.visuals,
        rating_visuals_text: tempRatings.visuals_text,
        rating_strength: tempRatings.strength,
        rating_strength_text: tempRatings.strength_text
    };

    if (isUpdate) {
        const response = await supabaseClient.from('user_collections')
            .update(payload)
            .eq('user_id', user.id)
            .eq('snus_id', currentSelectedSnusId);

        error = response.error;
        savedDate = globalUserCollection[currentSelectedSnusId].date;
    } else {
        const response = await supabaseClient.from('user_collections').insert([{
            user_id: user.id,
            snus_id: currentSelectedSnusId,
            ...payload
        }]).select().single();

        error = response.error;
        const inserted = response.data;
        if (inserted && inserted.collected_at) {
            savedDate = inserted.collected_at;
        }

        // IP-Geolocation für neue Bewertung asynchron ermitteln (fire-and-forget)
        if (!error && inserted && inserted.id) {
            try {
                supabaseClient.functions.invoke('rating-geo-lookup', {
                    body: { collection_id: inserted.id }
                }).catch(err => console.warn('[geo-lookup] Edge Function Fehler (async):', err));
            } catch (err) {
                console.warn('[geo-lookup] Edge Function nicht verfügbar:', err);
            }
        }
    }

    if (!error) {
        globalUserCollection[currentSelectedSnusId] = {
            date: savedDate,
            ratings: {
                ...tempRatings
            }
        };

        if (!isUpdate) {
            await startNewCan(currentSelectedSnusId);
            await loadUserStats(user.id);
            updateLivePerformance();
            evaluateBadges();
            if (typeof incrementStreak === 'function') {
                incrementStreak();
            }
        }
        renderDexGrid(globalSnusData);
        // Social Cache invalidieren, da neue Kollektion hinzugekommen ist
        _socialCacheData = null;
        _socialCacheTime = 0;

        // Show rating summary popup instead of closing directly
        showRatingSummary(currentSelectedSnusId, { ...tempRatings });
    } else {
        alert(t('error.saveFailed', { msg: error.message }));
    }

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 500);
}

function editRating() {
    if (globalUserCollection[currentSelectedSnusId]) {
        const currentRatings = globalUserCollection[currentSelectedSnusId].ratings;
        RATING_STEPS.forEach(cat => {
            const val = currentRatings[cat];
            if (val != null) setRating(cat, val);
            const textEl = document.getElementById(`text-${cat}`);
            if (textEl) {
                textEl.value = currentRatings[`${cat}_text`] || '';
                tempRatings[`${cat}_text`] = currentRatings[`${cat}_text`] || '';
            }
        });
    }
    currentRatingStepIndex = 0;
    updateRatingStepUI();
    showRatingView();
}

// ==========================================
// RATING SUMMARY POPUP
// ==========================================

function getScoreColorClass(val) {
    const n = parseFloat(val);
    if (n <= 3.9) return '#FF3B30';
    if (n <= 6.9) return '#FFCC00';
    if (n <= 8.9) return '#34C759';
    return '#0A84FF';
}

function getScoreRingStyle(val) {
    const color = getScoreColorClass(val);
    return `border-color: ${color}40; color: ${color};`;
}

function showRatingSummary(snusId, ratings) {
    const snus = globalSnusData.find(s => parseInt(s.id) === parseInt(snusId));
    if (!snus) return;

    // Populate image
    const img = document.getElementById('rating-summary-img');
    const glow = document.getElementById('rating-summary-glow');
    if (img) {
        img.src = snus.image ? `${GITHUB_BASE}${snus.image}` : '';
        img.alt = snus.name || '';
    }

    // Rarity glow color
    const rarity = (snus.rarity || 'common').toLowerCase().trim();
    if (glow) {
        const colorMap = { common: '#8E8E93', uncommon: '#34C759', rare: '#0A84FF', epic: '#BF5AF2', legendary: '#FF9F0A', exotic: '#FF375F', mythic: '#64D2FF' };
        const glowColor = colorMap[rarity] || '#8E8E93';
        glow.style.background = glowColor;
    }

    // Name & meta
    const nameEl = document.getElementById('rating-summary-name');
    const metaEl = document.getElementById('rating-summary-meta');
    if (nameEl) nameEl.innerText = snus.name || '';
    if (metaEl) metaEl.innerText = `${snus.nicotine || '??'} mg/g`;

    // Overall score (average of all 6)
    const vals = RATING_STEPS.map(cat => ratings[cat]).filter(v => v !== null && v !== undefined);
    const overall = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const overallEl = document.getElementById('rating-summary-overall');
    if (overallEl) {
        overallEl.innerText = overall.toFixed(1);
        overallEl.style.color = getScoreColorClass(overall);
    }

    // Circles
    const circlesEl = document.getElementById('rating-summary-circles');
    if (circlesEl) {
        const labels = {
            visuals:  t('rating.vis')   || 'Vis.',
            smell:    t('rating.smell') || 'Smell',
            taste:    t('rating.taste') || 'Taste',
            bite:     t('rating.bite')  || 'Bite',
            drip:     t('rating.drip')  || 'Drip',
            strength: t('rating.str')   || 'Str.'
        };
        circlesEl.innerHTML = RATING_STEPS.map(cat => {
            const val = ratings[cat];
            const display = (val !== null && val !== undefined) ? Number(val).toFixed(1) : '—';
            const ringStyle = getScoreRingStyle(val);
            return `
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-black/30 mb-1.5 shadow-inner" style="${ringStyle}">
                        <span class="text-[13px] font-bold" style="color: ${getScoreColorClass(val)}">${display}</span>
                    </div>
                    <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-semibold">${labels[cat]}</span>
                </div>`;
        }).join('');
    }

    // Show overlay
    const overlay = document.getElementById('rating-summary-overlay');
    const card = document.getElementById('rating-summary-card');
    if (!overlay || !card) return;

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            card.style.transform = 'translateY(0)';
        });
    });

    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');
}

function closeRatingSummary() {
    const overlay = document.getElementById('rating-summary-overlay');
    const card = document.getElementById('rating-summary-card');
    if (!overlay || !card) return;

    card.style.transform = 'translateY(100%)';
    setTimeout(() => {
        overlay.classList.remove('flex');
        overlay.classList.add('hidden');
        card.style.transform = 'translateY(100%)';
        // Now close the snus detail modal
        closeSnusDetail();
    }, 420);
}

// ==========================================
// 7. LEGALITY REDIRECT POP-UP LOGIC
// ==========================================

let pendingRedirectUrl = null;

window.handleOrderClick = function (url) {
    pendingRedirectUrl = url;
    const modal = document.getElementById('legality-modal');
    const backdrop = document.getElementById('legality-backdrop');
    const card = document.getElementById('legality-card');

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

window.closeLegalityModal = function () {
    const modal = document.getElementById('legality-modal');
    const backdrop = document.getElementById('legality-backdrop');
    const card = document.getElementById('legality-card');

    if (modal && backdrop && card) {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
        card.classList.remove('scale-100', 'opacity-100');
        card.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            modal.classList.add('hidden');
            pendingRedirectUrl = null;
            
            // Restore scroll if snus modal is not open
            const snusModal = document.getElementById('snus-modal');
            const snusModalOpen = snusModal && !snusModal.classList.contains('hidden');
            if (!snusModalOpen) {
                document.body.classList.remove('overflow-hidden');
            }
        }, 300);
    }
};

window.confirmLegalityRedirect = function () {
    if (pendingRedirectUrl) {
        // Fallback für iOS WKWebView Wrapper: Wenn ein JS-Bridge Handler registriert ist, diesen nutzen
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.openExternal) {
            window.webkit.messageHandlers.openExternal.postMessage({ url: pendingRedirectUrl });
        } else {
            window.open(pendingRedirectUrl, '_blank');
        }
    }
    closeLegalityModal();
};

