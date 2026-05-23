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
    taste: 5,
    taste_text: '',
    smell: 5,
    smell_text: '',
    bite: 5,
    bite_text: '',
    drip: 5,
    drip_text: '',
    visuals: 5,
    visuals_text: '',
    strength: 5,
    strength_text: ''
};
let currentSelectedSnusId = null;

const RATING_STEPS = ['visuals', 'smell', 'taste', 'bite', 'drip', 'strength'];
let currentRatingStepIndex = 0;

function initRatingWizard() {
    currentRatingStepIndex = 0;

    RATING_STEPS.forEach(cat => {
        tempRatings[cat] = 5;
        tempRatings[`${cat}_text`] = '';

        const row = document.getElementById(`row-${cat}`);
        if (!row) return;
        row.innerHTML = `<div class="rating-pill" id="pill-${cat}"></div>`;
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('div');
            btn.className = `rating-btn ${i === 5 ? 'active' : 'inactive'}`;
            btn.innerText = i;
            btn.onclick = () => setRating(cat, i);
            row.appendChild(btn);
        }
        updatePill(cat, 5);
        const valIndicator = row.parentElement.querySelector('.rating-val');
        if (valIndicator) valIndicator.innerText = `5/10`;

        const textEl = document.getElementById(`text-${cat}`);
        if (textEl) textEl.value = '';
    });

    updateRatingStepUI();
}

function setRating(category, value) {
    tempRatings[category] = value;
    updatePill(category, value);
    const row = document.getElementById(`row-${category}`);
    row.querySelectorAll('.rating-btn').forEach((btn, idx) => {
        btn.className = `rating-btn ${idx + 1 === value ? 'active' : 'inactive'}`;
    });
    const valIndicator = row.parentElement.querySelector('.rating-val');
    if (valIndicator) valIndicator.innerText = `${value}/10`;
    triggerHapticFeedback();
}

function updatePill(cat, val) {
    const pill = document.getElementById(`pill-${cat}`);
    if (pill) pill.style.transform = `translateX(${(val - 1) * 100}%)`;
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
}

function showRatingView() {
    hideAllViews();
    document.getElementById('modal-view-rating').classList.remove('hidden');
    document.getElementById('modal-view-rating').classList.add('flex');
}

function showSavedRating() {
    hideAllViews();
    document.getElementById('modal-view-saved-rating').classList.remove('hidden');
    document.getElementById('modal-view-saved-rating').classList.add('flex');
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
    const isUnlocked = globalUserCollection[snusId];
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
        if (response.data && response.data.collected_at) {
            savedDate = response.data.collected_at;
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
        closeSnusDetail();
        // Social Cache invalidieren, da neue Kollektion hinzugekommen ist
        _socialCacheData = null;
        _socialCacheTime = 0;
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
            setRating(cat, currentRatings[cat] || 5);
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
