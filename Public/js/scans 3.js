// ==========================================
// 12. RECENT SCANS & ALL SCANS MODAL LOGIK
// ==========================================

function createScanListItemHTML(snus, fromModal = false, customDateStr = null) {
    let dateStr = "";
    if (customDateStr) {
        dateStr = customDateStr;
    } else {
        const dateObj = new Date(globalUserCollection[snus.id].date);
        dateStr = dateObj.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }

    const clickAction = fromModal ?
        `closeAllScansModal(); setTimeout(() => openSnusDetail(${snus.id}), 300);` :
        `openSnusDetail(${snus.id})`;

    return `
        <div class="flex items-center justify-between p-3 border-b border-white/5 last:border-0 cursor-pointer active:bg-white/5 transition-colors" onclick="triggerHapticFeedback(); ${clickAction}">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-11 h-11 flex items-center justify-center flex-shrink-0">
                    <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain" onerror="this.style.display='none'">
                </div>
                <div class="min-w-0 flex-1">
                    <h4 class="text-[17px] font-semibold text-white tracking-tight truncate">${snus.name}</h4>
                    <p class="text-[13px] text-[#8E8E93] font-medium mt-0.5">${dateStr}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 pl-4 flex-shrink-0 text-right">
                <span class="text-[17px] font-semibold text-white tracking-tight">${snus.nicotine}mg</span>
                <svg class="w-4 h-4 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
            </div>
        </div>
    `;
}

function updateLivePerformance() {
    const collectedItems = globalSnusData.filter(snus => !!globalUserCollection[snus.id]);
    collectedItems.sort((a, b) => new Date(globalUserCollection[b.id].date) - new Date(globalUserCollection[a.id].date));

    const targetCount = collectedItems.length;
    if (currentDashboardStats.count !== targetCount) {
        animateNumber('stat-count', currentDashboardStats.count, targetCount, 1500, "", false);
        currentDashboardStats.count = targetCount;
    }

    const listEl = document.getElementById('latest-unlocks-list');
    const showMoreBtn = document.getElementById('show-more-scans-btn');
    if (!listEl) return;

    if (globalInactiveLogs.length === 0) {
        listEl.innerHTML = '<div class="p-6 text-center text-[#8E8E93] text-[15px]">Noch keine Dosen geschlossen.</div>';
        if (showMoreBtn) showMoreBtn.classList.add('hidden');
        return;
    }

    if (showMoreBtn) {
        if (globalInactiveLogs.length > 4) {
            showMoreBtn.classList.remove('hidden');
        } else {
            showMoreBtn.classList.add('hidden');
        }
    }

    const parts = [];
    globalInactiveLogs.slice(0, 4).forEach(log => {
        const snus = globalSnusData.find(s => s.id === log.snus_id);
        if (snus) {
            const dateObj = new Date(log.finished_at || log.opened_at);
            const customDateStr = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
            parts.push(createScanListItemHTML(snus, false, customDateStr));
        }
    });
    listEl.innerHTML = parts.join('');
}

function openAllScansModal() {
    const modal = document.getElementById('all-scans-modal');
    const backdrop = document.getElementById('all-scans-backdrop');
    const card = document.getElementById('all-scans-card');
    const listContainer = document.getElementById('all-scans-list-container');
    const scrollArea = document.getElementById('all-scans-scroll-area');

    // Scroll immer auf Top zurücksetzen, damit Swipe-to-close sofort funktioniert
    if (scrollArea) scrollArea.scrollTop = 0;

    // Card-Styles aus ggf. vorherigerGeste zurücksetzen
    card.style.transform = '';
    card.style.transition = '';
    card.style.willChange = 'auto';

    const scanParts = [];
    globalInactiveLogs.forEach(log => {
        const snus = globalSnusData.find(s => s.id === log.snus_id);
        if (snus) {
            const dateObj = new Date(log.finished_at || log.opened_at);
            const customDateStr = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
            scanParts.push(createScanListItemHTML(snus, true, customDateStr));
        }
    });
    listContainer.innerHTML = scanParts.join('');

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');

        card.classList.remove('translate-y-full');
        card.classList.add('translate-y-0');
    }, 10);
}

function closeAllScansModal(isDragging = false) {
    const modal = document.getElementById('all-scans-modal');
    const backdrop = document.getElementById('all-scans-backdrop');
    const card = document.getElementById('all-scans-card');

    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');

    if (!isDragging) {
        card.classList.remove('translate-y-0');
        card.classList.add('translate-y-full');
    }

    setTimeout(() => {
        modal.classList.add('hidden');

        if (isDragging) {
            card.style.transform = '';
            card.style.transition = '';
            card.classList.remove('translate-y-0');
            card.classList.add('translate-y-full');
        }

        if (document.getElementById('snus-modal').classList.contains('hidden')) {
            document.body.classList.remove('overflow-hidden');
        }
    }, 400);
}

// ==========================================
// ALL-SCANS MODAL – GESTURE ENGINE (einzige Definition)
// ==========================================

function initAllScansGestures() {
    const card = document.getElementById('all-scans-card');
    const scrollArea = document.getElementById('all-scans-scroll-area');
    const dragHandle = document.getElementById('all-scans-drag-handle');
    if (!card || !scrollArea) return;

    function applyRelease(startY, startTime, rafId) {
        if (rafId) cancelAnimationFrame(rafId);
        return { rafId: null };
    }

    function snapBack() {
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
        card.style.transform = 'translate3d(0, 0, 0)';
        card.style.willChange = 'auto';
        setTimeout(() => { card.style.transform = ''; card.style.transition = ''; }, 400);
    }

    function dismiss() {
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
        card.style.transform = 'translate3d(0, 100%, 0)';
        card.style.willChange = 'auto';
        closeAllScansModal(true);
    }

    function decide(deltaY, velocity) {
        if (deltaY >= 120 || (deltaY >= 20 && velocity > 0.4)) dismiss();
        else snapBack();
    }

    // --- Drag Handle: immer Drag-to-close ---
    let _hStartY = 0, _hStartTime = 0, _hDragging = false, _hRafId = null;

    dragHandle.addEventListener('touchstart', (e) => {
        _hStartY = e.touches[0].clientY;
        _hStartTime = Date.now();
        _hDragging = true;
        card.style.transition = 'none';
        card.style.willChange = 'transform';
    }, { passive: true });

    dragHandle.addEventListener('touchmove', (e) => {
        if (!_hDragging) return;
        const dy = e.touches[0].clientY - _hStartY;
        if (dy <= 0) return;
        if (e.cancelable) e.preventDefault();
        if (_hRafId) cancelAnimationFrame(_hRafId);
        _hRafId = requestAnimationFrame(() => { card.style.transform = `translate3d(0, ${dy}px, 0)`; });
    }, { passive: false });

    dragHandle.addEventListener('touchend', (e) => {
        if (!_hDragging) return;
        if (_hRafId) { cancelAnimationFrame(_hRafId); _hRafId = null; }
        const dy = e.changedTouches[0].clientY - _hStartY;
        const vel = dy / Math.max(1, Date.now() - _hStartTime);
        _hDragging = false;
        decide(dy, vel);
    }, { passive: true });

    dragHandle.addEventListener('touchcancel', () => {
        _hDragging = false;
        if (_hRafId) { cancelAnimationFrame(_hRafId); _hRafId = null; }
        snapBack();
    }, { passive: true });

    // --- Scroll Area: Drag-to-close nur ab scrollTop 0 nach unten ---
    let _sStartY = 0, _sStartTop = 0, _sStartTime = 0;
    let _sDragging = false, _sIntentSet = false, _sRafId = null;

    scrollArea.addEventListener('touchstart', (e) => {
        _sStartY = e.touches[0].clientY;
        _sStartTop = scrollArea.scrollTop;
        _sStartTime = Date.now();
        _sDragging = false;
        _sIntentSet = false;
        if (_sRafId) { cancelAnimationFrame(_sRafId); _sRafId = null; }
    }, { passive: true });

    scrollArea.addEventListener('touchmove', (e) => {
        const dy = e.touches[0].clientY - _sStartY;
        if (!_sIntentSet) {
            if (Math.abs(dy) < 8) return;
            _sIntentSet = true;
            if (dy > 0 && _sStartTop <= 0) {
                _sDragging = true;
                card.style.transition = 'none';
                card.style.willChange = 'transform';
            }
        }
        if (_sDragging && dy > 0) {
            if (e.cancelable) e.preventDefault();
            if (_sRafId) cancelAnimationFrame(_sRafId);
            _sRafId = requestAnimationFrame(() => { card.style.transform = `translate3d(0, ${dy}px, 0)`; });
        }
    }, { passive: false });

    scrollArea.addEventListener('touchend', (e) => {
        if (_sRafId) { cancelAnimationFrame(_sRafId); _sRafId = null; }
        if (!_sDragging) { card.style.willChange = 'auto'; return; }
        const dy = e.changedTouches[0].clientY - _sStartY;
        const vel = dy / Math.max(1, Date.now() - _sStartTime);
        _sDragging = false;
        decide(dy, vel);
    }, { passive: true });

    scrollArea.addEventListener('touchcancel', () => {
        if (_sRafId) { cancelAnimationFrame(_sRafId); _sRafId = null; }
        if (_sDragging) { _sDragging = false; snapBack(); }
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initAllScansGestures);
