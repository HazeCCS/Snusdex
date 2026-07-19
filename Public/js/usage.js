let globalAllLogs = [];
let globalActiveLogs = [];
let globalInactiveLogs = [];

let currentStreakCount = 0;
const MOUTRACK_DAILY_SIDE_KEY = 'mouTrackDailySide';
const MOUTRACK_POSITIONS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
const MOUTRACK_OPPOSITES = {
    topLeft: 'bottomRight',
    topRight: 'bottomLeft',
    bottomLeft: 'topRight',
    bottomRight: 'topLeft'
};
const MOUTRACK_ARROW_ROTATIONS = {
    topLeft: 225,
    topRight: 315,
    bottomLeft: 135,
    bottomRight: 45
};
let mouTrackPlacementSnapshot = null;
let mouTrackPendingPlacementPosition = null;
let mouTrackSyncQueue = Promise.resolve();
let mouTrackSheetStartY = 0;
let mouTrackSheetCurrentY = 0;
let isMouTrackSheetDragging = false;

function isValidMouTrackPosition(position) {
    return MOUTRACK_POSITIONS.includes(position);
}

function getMouTrackPositionLabel(position) {
    const labels = {
        topLeft: t('mouTrack.topLeft'),
        topRight: t('mouTrack.topRight'),
        bottomLeft: t('mouTrack.bottomLeft'),
        bottomRight: t('mouTrack.bottomRight'),
        left: t('mouTrack.left'),
        right: t('mouTrack.right')
    };
    return labels[position] || '-';
}

function createEmptyMouTrackCounts() {
    return MOUTRACK_POSITIONS.reduce((acc, position) => {
        acc[position] = 0;
        return acc;
    }, {});
}

function normalizeMouTrackCounts(counts) {
    const normalized = createEmptyMouTrackCounts();
    if (!counts || typeof counts !== 'object') return normalized;
    MOUTRACK_POSITIONS.forEach(position => {
        const value = parseInt(counts[position], 10);
        normalized[position] = Number.isFinite(value) && value > 0 ? value : 0;
    });
    return normalized;
}

function getMouTrackRecommendedPosition(counts, lastPosition) {
    const normalizedCounts = normalizeMouTrackCounts(counts);
    const minCount = Math.min(...MOUTRACK_POSITIONS.map(position => normalizedCounts[position]));
    const candidates = MOUTRACK_POSITIONS.filter(position => normalizedCounts[position] === minCount);
    const opposite = MOUTRACK_OPPOSITES[lastPosition];

    if (opposite && candidates.includes(opposite)) return opposite;

    const notLast = candidates.find(position => position !== lastPosition);
    return notLast || candidates[0] || 'topLeft';
}

function getMouTrackDefaultState() {
    return {
        date: getMouTrackTodayKey(),
        counts: createEmptyMouTrackCounts(),
        lastPosition: null,
        recommendedPosition: null
    };
}

function saveMouTrackState(state) {
    localStorage.setItem(MOUTRACK_DAILY_SIDE_KEY, JSON.stringify({
        date: getMouTrackTodayKey(),
        counts: normalizeMouTrackCounts(state?.counts),
        lastPosition: isValidMouTrackPosition(state?.lastPosition) ? state.lastPosition : null,
        recommendedPosition: isValidMouTrackPosition(state?.recommendedPosition) ? state.recommendedPosition : null
    }));
}

function restoreMouTrackStateSnapshot(snapshot) {
    if (!snapshot) {
        localStorage.removeItem(MOUTRACK_DAILY_SIDE_KEY);
    } else {
        saveMouTrackState(snapshot);
    }
    renderMouTrackUI();
}

function syncMouTrackPosition(position, amount = 1) {
    if (!isValidMouTrackPosition(position) || typeof supabaseClient === 'undefined') return;

    mouTrackSyncQueue = mouTrackSyncQueue
        .catch(() => {})
        .then(async () => {
            const { error } = await supabaseClient.rpc('increment_moutrack_side', {
                p_side: position,
                p_tracked_date: getMouTrackTodayKey(),
                p_amount: amount
            });

            if (error) {
                console.warn('[MouTrack] Could not sync side:', error);
            }
        });
}

function getMouTrackTodayKey(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getStoredMouTrackState() {
    try {
        const raw = localStorage.getItem(MOUTRACK_DAILY_SIDE_KEY);
        if (!raw) return null;

        const data = JSON.parse(raw);
        if (data?.date !== getMouTrackTodayKey()) {
            localStorage.removeItem(MOUTRACK_DAILY_SIDE_KEY);
            return null;
        }

        const counts = normalizeMouTrackCounts(data?.counts);
        const legacySide = data?.nextSide || data?.side || null;
        const legacyLastSide = data?.lastSide || null;
        const lastPosition = isValidMouTrackPosition(data?.lastPosition)
            ? data.lastPosition
            : (legacyLastSide === 'left' ? 'topLeft' : (legacyLastSide === 'right' ? 'topRight' : null));
        const recommendedPosition = isValidMouTrackPosition(data?.recommendedPosition)
            ? data.recommendedPosition
            : (isValidMouTrackPosition(data?.nextPosition)
                ? data.nextPosition
                : (legacySide === 'left' ? 'topLeft' : (legacySide === 'right' ? 'topRight' : null)));

        return {
            date: data.date,
            counts,
            lastPosition,
            recommendedPosition
        };
    } catch (_err) {
        localStorage.removeItem(MOUTRACK_DAILY_SIDE_KEY);
        return null;
    }
}

function renderMouTrackUI() {
    const widget = document.getElementById('moutrack-widget');
    if (!widget) return;

    const isIndividualTracking = (localStorage.getItem('snusTrackingMode') || 'full') === 'individual';
    widget.classList.toggle('hidden', !isIndividualTracking);
    if (!isIndividualTracking) return;

    const state = getStoredMouTrackState();
    const counts = normalizeMouTrackCounts(state?.counts);
    const recommendedPosition = state?.recommendedPosition || null;
    const lastPosition = state?.lastPosition || null;
    const sideEl = document.getElementById('moutrack-next-side');
    const helperEl = document.getElementById('moutrack-helper');
    const lastEl = document.getElementById('moutrack-last-side');
    const countGrid = document.getElementById('moutrack-count-grid');
    const arrowCircle = document.getElementById('moutrack-arrow-circle');
    const arrowIcon = document.getElementById('moutrack-arrow-icon');

    if (sideEl) {
        sideEl.removeAttribute('data-i18n');
        sideEl.textContent = recommendedPosition ? getMouTrackPositionLabel(recommendedPosition) : t('mouTrack.chooseStart');
    }

    if (helperEl) {
        helperEl.removeAttribute('data-i18n');
        helperEl.textContent = recommendedPosition ? t('mouTrack.nextPouch') : t('mouTrack.chooseToday');
    }

    if (lastEl) {
        lastEl.removeAttribute('data-i18n');
        lastEl.textContent = lastPosition
            ? t('mouTrack.lastSide', { side: getMouTrackPositionLabel(lastPosition) })
            : t('mouTrack.lastEmpty');
    }

    if (arrowCircle) {
        arrowCircle.classList.toggle('hidden', !recommendedPosition);
        arrowCircle.classList.toggle('flex', !!recommendedPosition);
    }

    if (arrowIcon) {
        arrowIcon.style.transform = `rotate(${MOUTRACK_ARROW_ROTATIONS[recommendedPosition] || 0}deg)`;
    }

    if (countGrid) {
        countGrid.innerHTML = MOUTRACK_POSITIONS.map(position => `
            <div class="rounded-[12px] bg-white/[0.04] border border-white/5 px-2 py-2 text-center">
                <p class="text-[10px] text-[#8E8E93] font-medium leading-tight">${getMouTrackPositionLabel(position)}</p>
                <p class="text-[15px] text-white font-semibold leading-tight mt-1">${counts[position]}</p>
            </div>
        `).join('');
    }
}

function recordMouTrackPosition(position) {
    if (!isValidMouTrackPosition(position)) return null;
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('light');

    const state = getStoredMouTrackState() || getMouTrackDefaultState();
    const counts = normalizeMouTrackCounts(state.counts);
    counts[position] += 1;
    const recommendedPosition = getMouTrackRecommendedPosition(counts, position);

    saveMouTrackState({
        counts,
        lastPosition: position,
        recommendedPosition
    });
    renderMouTrackUI();
    return recommendedPosition;
}

function setMouTrackSide(side) {
    const mappedPosition = side === 'left' ? 'topLeft' : (side === 'right' ? 'topRight' : side);
    const recommendedPosition = recordMouTrackPosition(mappedPosition);
    if (recommendedPosition) showMouTrackRecommendationView(recommendedPosition);
}

function openMouTrackPlacementModal() {
    if ((localStorage.getItem('snusTrackingMode') || 'full') !== 'individual') return;
    mouTrackPlacementSnapshot = null;
    mouTrackPendingPlacementPosition = null;

    let overlay = document.getElementById('moutrack-placement-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'moutrack-placement-modal';
        overlay.className = 'fixed inset-0 z-[999] hidden flex flex-col justify-end';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div id="moutrack-modal-backdrop" class="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-400" onclick="closeMouTrackPlacementModal()"></div>
        <div id="moutrack-modal-card"
            class="relative rounded-t-[32px] bg-[#1C1C1E] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col z-[1000] mt-auto w-full max-w-md mx-auto overflow-hidden"
            style="transform: translateY(100%); padding-bottom: max(env(safe-area-inset-bottom), 24px);">
            <div id="moutrack-modal-drag-handle" class="sticky top-0 bg-[#1C1C1E] z-50 pt-4 pb-3 flex justify-center flex-shrink-0 w-full rounded-t-[32px]">
                <div class="w-10 h-1.5 bg-[#3A3A3C] rounded-full"></div>
            </div>
            <div id="moutrack-modal-track" class="flex transition-transform duration-300 ease-out" style="width: 200%; transform: translateX(0);">
                <div class="shrink-0 px-6 pb-1" style="width: 50%;">
                    <div class="text-center w-full overflow-hidden px-2" style="margin-bottom: 18px;">
                        <span class="text-[13px] font-semibold text-[#8E8E93] tracking-wider mb-1 block">MouTrack™</span>
                        <h2 class="text-[26px] font-bold tracking-tight text-white leading-tight" style="margin-bottom: 6px;">${t('mouTrack.modalTitle')}</h2>
                        <p class="text-[#8E8E93] text-[14px] leading-relaxed max-w-[280px] mx-auto">${t('mouTrack.modalDesc')}</p>
                    </div>
                    <div class="grid grid-cols-2" style="gap: 10px;">
                        ${MOUTRACK_POSITIONS.map(position => `
                            <button type="button" onclick="chooseMouTrackPlacement('${position}')" class="rounded-[14px] bg-white/10 border border-white/5 active:scale-95 transition-transform flex flex-col items-center justify-center" style="height: 92px; padding: 12px 10px 10px;">
                                <span class="rounded-full bg-white text-black flex items-center justify-center shadow-sm" style="width: 44px; height: 44px; margin-bottom: 8px;">
                                    <svg style="width: 25px; height: 25px; transform: rotate(${MOUTRACK_ARROW_ROTATIONS[position]}deg)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                </span>
                                <span class="text-[#D1D1D6] font-semibold leading-tight" style="font-size: 12px;">${getMouTrackPositionLabel(position)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div id="moutrack-recommendation-panel" class="shrink-0 px-6 pb-1 flex flex-col" style="width: 50%; min-height: 354px;"></div>
            </div>
        </div>
    `;

    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    setupMouTrackSheetSwipe();

    requestAnimationFrame(() => {
        const backdrop = document.getElementById('moutrack-modal-backdrop');
        const card = document.getElementById('moutrack-modal-card');
        if (backdrop) {
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
        }
        if (card) card.style.transform = 'translateY(0)';
    });
}

function closeMouTrackPlacementModal(isDragging = false) {
    const overlay = document.getElementById('moutrack-placement-modal');
    if (!overlay) return;

    const backdrop = document.getElementById('moutrack-modal-backdrop');
    const card = document.getElementById('moutrack-modal-card');
    if (card) {
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
        card.style.transform = 'translateY(100%)';
    }
    if (backdrop) {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
    }

    setTimeout(() => {
        overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        if (card) {
            card.style.transform = 'translateY(100%)';
            if (isDragging) card.style.transition = '';
        }
    }, 400);
    mouTrackPlacementSnapshot = null;
    mouTrackPendingPlacementPosition = null;
}

function setupMouTrackSheetSwipe() {
    const card = document.getElementById('moutrack-modal-card');
    if (!card || card.dataset.swipeReady === 'true') return;
    card.dataset.swipeReady = 'true';

    card.addEventListener('touchstart', (e) => {
        mouTrackSheetStartY = e.touches[0].clientY;
        mouTrackSheetCurrentY = mouTrackSheetStartY;
        isMouTrackSheetDragging = true;
        card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isMouTrackSheetDragging) return;
        mouTrackSheetCurrentY = e.touches[0].clientY;
        const deltaY = mouTrackSheetCurrentY - mouTrackSheetStartY;
        if (deltaY > 0) card.style.transform = `translateY(${deltaY}px)`;
    }, { passive: true });

    card.addEventListener('touchend', () => {
        if (!isMouTrackSheetDragging) return;
        isMouTrackSheetDragging = false;

        const deltaY = mouTrackSheetCurrentY - mouTrackSheetStartY;
        card.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaY > 100) {
            closeMouTrackPlacementModal(true);
        } else {
            card.style.transform = 'translateY(0)';
        }
    });
}

function chooseMouTrackPlacement(position) {
    if (!isValidMouTrackPosition(position)) return;
    mouTrackPlacementSnapshot = getStoredMouTrackState();
    mouTrackPendingPlacementPosition = position;
    const recommendedPosition = recordMouTrackPosition(position);
    syncMouTrackPosition(position, 1);
    if (recommendedPosition) showMouTrackRecommendationInModal(recommendedPosition);
}

function backToMouTrackPlacementStep() {
    restoreMouTrackStateSnapshot(mouTrackPlacementSnapshot);
    if (mouTrackPendingPlacementPosition) {
        syncMouTrackPosition(mouTrackPendingPlacementPosition, -1);
    }
    mouTrackPlacementSnapshot = null;
    mouTrackPendingPlacementPosition = null;

    const track = document.getElementById('moutrack-modal-track');
    if (track) track.style.transform = 'translateX(0)';
}

function showMouTrackRecommendationInModal(position) {
    if (!isValidMouTrackPosition(position)) return;

    const panel = document.getElementById('moutrack-recommendation-panel');
    const track = document.getElementById('moutrack-modal-track');
    if (!panel || !track) {
        showMouTrackRecommendationView(position);
        return;
    }

    panel.innerHTML = `
        <div class="flex items-center justify-between" style="margin-bottom: 12px;">
            <button type="button" onclick="backToMouTrackPlacementStep()" class="w-10 h-10 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-[#8E8E93] active:scale-90 transition-all duration-200" aria-label="${t('mouTrack.back')}">
                <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 18 9 12l6-6" />
                </svg>
            </button>
            <button type="button" onclick="closeMouTrackPlacementModal()" class="w-10 h-10 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-[#8E8E93] active:scale-90 transition-all duration-200" aria-label="${t('mouTrack.done')}">
                <svg class="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center text-center" style="padding-bottom: 22px;">
            <div class="rounded-full bg-white text-black flex items-center justify-center" style="width: 104px; height: 104px; box-shadow: 0 16px 48px rgba(255,255,255,0.13); margin-bottom: 22px;">
                <svg class="transition-transform" style="width: 58px; height: 58px; transform: rotate(${MOUTRACK_ARROW_ROTATIONS[position]}deg)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
            </div>
            <span class="text-[13px] font-semibold text-[#8E8E93] tracking-wider block" style="margin-bottom: 4px;">${t('mouTrack.recommendationTitle')}</span>
            <h2 class="text-[26px] font-bold tracking-tight text-white leading-tight" style="margin-bottom: 8px;">${getMouTrackPositionLabel(position)}</h2>
            <div class="bg-white/5 border border-white/5 rounded-[14px]" style="padding: 12px 14px; max-width: 292px;">
                <p class="text-[#D1D1D6] text-[14px] leading-relaxed">${t('mouTrack.recommendationSubtitle')}</p>
            </div>
        </div>
        <button type="button" onclick="closeMouTrackPlacementModal()" class="w-full bg-white text-black font-semibold text-[17px] py-4 rounded-[14px] shadow-[0_4px_14px_rgba(255,255,255,0.1)] flex justify-center items-center active:scale-95 transition-transform">${t('mouTrack.done')}</button>
    `;

    requestAnimationFrame(() => {
        track.style.transform = 'translateX(-50%)';
    });
}

function closeMouTrackRecommendationView() {
    const view = document.getElementById('moutrack-recommendation-view');
    if (!view) return;
    view.style.transform = 'translateX(100%)';
    view.style.opacity = '0.96';
    setTimeout(() => {
        view.classList.add('hidden');
        view.classList.remove('flex');
        view.style.transform = '';
        view.style.opacity = '';
    }, 260);
}

function showMouTrackRecommendationView(position) {
    if (!isValidMouTrackPosition(position)) return;

    let view = document.getElementById('moutrack-recommendation-view');
    if (!view) {
        view = document.createElement('div');
        view.id = 'moutrack-recommendation-view';
        view.className = 'fixed inset-0 z-[150] hidden flex-col text-white transition-all duration-300 ease-out';
        view.style.backgroundColor = '#0B0B0C';
        document.body.appendChild(view);
    }

    view.innerHTML = `
        <div class="flex items-center justify-between px-5" style="padding-top: max(env(safe-area-inset-top), 20px);">
            <span class="text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold">MouTrack™</span>
            <button type="button" onclick="closeMouTrackRecommendationView()" class="w-9 h-9 rounded-full bg-white/10 border border-white/5 flex items-center justify-center active:scale-95 transition-transform" aria-label="${t('mouTrack.done')}">
                <svg class="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
            <div class="rounded-full bg-white text-black flex items-center justify-center" style="width: 190px; height: 190px; box-shadow: 0 20px 70px rgba(255,255,255,0.16);">
                <svg class="w-24 h-24 transition-transform" style="transform: rotate(${MOUTRACK_ARROW_ROTATIONS[position]}deg)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
            </div>
            <p class="text-[#8E8E93] text-[12px] uppercase tracking-wider font-semibold mt-10">${t('mouTrack.recommendationTitle')}</p>
            <h2 class="text-white text-[34px] font-semibold tracking-tight leading-tight mt-2">${getMouTrackPositionLabel(position)}</h2>
            <p class="text-[#8E8E93] text-[14px] leading-relaxed mt-3 max-w-[280px]">${t('mouTrack.recommendationSubtitle')}</p>
        </div>
        <div class="px-5" style="padding-bottom: max(env(safe-area-inset-bottom), 20px);">
            <button type="button" onclick="closeMouTrackRecommendationView()" class="w-full h-14 rounded-full bg-white text-black text-[16px] font-semibold active:scale-[0.98] transition-transform">${t('mouTrack.done')}</button>
        </div>
    `;

    view.classList.remove('hidden');
    view.classList.add('flex');
    view.style.transform = 'translateX(100%)';
    view.style.opacity = '0.96';
    requestAnimationFrame(() => {
        view.style.transform = 'translateX(0)';
        view.style.opacity = '1';
    });
}

function getStreakMilestoneXP(day) {
    if (day === 5) return 50;
    if (day === 10) return 75;
    if (day === 15) return 100;
    if (day === 30) return 200;
    if (day === 45) return 200;
    if (day === 60) return 500;
    if (day > 60 && (day - 60) % 15 === 0) return 200;
    return 0;
}

function getNextStreakMilestone(currentStreak) {
    const milestones = [
        { day: 5, xp: 50 },
        { day: 10, xp: 75 },
        { day: 15, xp: 100 },
        { day: 30, xp: 200 },
        { day: 45, xp: 200 },
        { day: 60, xp: 500 }
    ];

    for (let m of milestones) {
        if (currentStreak < m.day) {
            return m;
        }
    }

    let nextDay = 60 + 15;
    while (currentStreak >= nextDay) {
        nextDay += 15;
    }
    return { day: nextDay, xp: 200 };
}

function renderStreakUI() {
    const title = document.getElementById('streak-header-title');
    const text = document.getElementById('streak-counter-text');
    const container = document.getElementById('streak-tiles');
    if (!text || !container) return;

    text.innerText = currentStreakCount + " 🔥";

    if (title) {
        const nextMilestone = getNextStreakMilestone(currentStreakCount);
        title.innerText = (typeof t === 'function')
            ? t('streak.nextReward', { day: nextMilestone.day, xp: nextMilestone.xp })
            : `Next Reward: Day ${nextMilestone.day} - ${nextMilestone.xp}XP`;
    }

    let startDay = Math.floor((currentStreakCount > 0 ? currentStreakCount - 1 : 0) / 5) * 5 + 1;
    if (currentStreakCount === 0) startDay = 1;

    let html = '';
    for (let i = 0; i < 5; i++) {
        let dayNum = startDay + i;
        let isBurned = dayNum <= currentStreakCount;
        let xpVal = getStreakMilestoneXP(dayNum);
        let xpLabel = xpVal ? `+${xpVal}` : '';

        if (isBurned) {
            html += `
                <div class="flex-1 flex flex-col items-center gap-0.5 opacity-100 transition-all duration-300">
                    <span class="text-[9px] font-bold text-[#FFD60A] h-3.5 flex items-center justify-center drop-shadow-[0_0_4px_rgba(255,214,10,0.4)]">${xpLabel}</span>
                    <svg class="w-4 h-4 text-[#FF9500] drop-shadow-[0_0_6px_rgba(255,149,0,0.5)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    </svg>
                    <span class="text-[10px] font-bold text-[#FF9500]">${dayNum}</span>
                </div>
            `;
        } else {
            let iconHtml = `
                <div class="w-4 h-4 flex items-center justify-center">
                    <div class="w-1.5 h-1.5 rounded-full bg-[#8E8E93]"></div>
                </div>
            `;
            if (xpVal > 0) {
                iconHtml = `
                    <svg class="w-4 h-4 text-[#FFD60A] opacity-60 drop-shadow-[0_0_4px_rgba(255,214,10,0.3)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    </svg>
                `;
            }
            html += `
                <div class="flex-1 flex flex-col items-center gap-0.5 ${xpVal > 0 ? 'opacity-60' : 'opacity-30'} transition-all duration-300">
                    <span class="text-[9px] font-bold text-[#FFD60A] h-3.5 flex items-center justify-center">${xpLabel}</span>
                    ${iconHtml}
                    <span class="text-[10px] font-medium text-[#8E8E93]">${dayNum}</span>
                </div>
            `;
        }
    }
    container.innerHTML = html;
}

async function validateAndRenderStreak() {
    let storedDate = localStorage.getItem('lastTrackedDate');
    let storedStreak = parseInt(localStorage.getItem('streakCount'));

    if (!storedDate || isNaN(storedStreak)) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const { data } = await supabaseClient
                    .from('profiles')
                    .select('streak_count, last_tracked_date')
                    .eq('id', user.id)
                    .single();
                if (data?.last_tracked_date) {
                    storedDate = data.last_tracked_date;
                    storedStreak = data.streak_count || 0;
                    localStorage.setItem('lastTrackedDate', storedDate);
                    localStorage.setItem('streakCount', storedStreak);
                }
            }
        } catch (e) {  }
    }

    let activeStreak = storedStreak || 0;

    if (storedDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parts = storedDate.split('-');
        const lastDate = new Date(parts[0], parts[1] - 1, parts[2]);
        lastDate.setHours(0, 0, 0, 0);

        const diffTime = today - lastDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            activeStreak = 0;
            localStorage.setItem('streakCount', 0);
        }
    }

    currentStreakCount = activeStreak;
    renderStreakUI();
}

async function incrementStreak() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const storedDate = localStorage.getItem('lastTrackedDate');

    if (storedDate !== todayStr) {
        let activeStreak = parseInt(localStorage.getItem('streakCount')) || 0;

        if (storedDate) {
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);

            const parts = storedDate.split('-');
            const lastDate = new Date(parts[0], parts[1] - 1, parts[2]);
            lastDate.setHours(0, 0, 0, 0);

            const diffTime = todayMidnight - lastDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                activeStreak += 1;
            } else if (diffDays > 1) {
                activeStreak = 1;
            }
        } else {
            activeStreak = 1;
        }

        localStorage.setItem('streakCount', activeStreak);
        localStorage.setItem('lastTrackedDate', todayStr);
        currentStreakCount = activeStreak;
        renderStreakUI();

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const xpVal = getStreakMilestoneXP(activeStreak);

                const { error } = await supabaseClient.from('profiles').update({
                    streak_count: activeStreak,
                    last_tracked_date: todayStr
                }).eq('id', user.id);

                if (error) {
                    console.error("Failed to update daily streak in database:", error);
                } else {
                    if (xpVal > 0) {
                        try {
                            if (typeof loadUserStats === 'function') await loadUserStats(user.id);
                            if (typeof updateLivePerformance === 'function') updateLivePerformance();
                            showStreakMilestoneOverlay(activeStreak, xpVal);
                        } catch (e) {
                            console.error("Failed to update user stats / show streak overlay:", e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error in incrementStreak database update:", e);
        }
    }
}

function showStreakMilestoneOverlay(streak, xp) {
    const overlay = document.getElementById('streak-milestone-overlay');
    const descText = document.getElementById('streak-milestone-desc');
    const xpText = document.getElementById('streak-milestone-xp');

    if (!overlay || !descText || !xpText) return;

    descText.innerText = (typeof t === 'function') ? t('streak.milestoneDay', { day: streak }) : `Tag ${streak}`;
    xpText.innerText = `+${xp} XP`;

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');

    overlay.onclick = () => {
        overlay.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.classList.remove('flex');
            overlay.classList.add('hidden');
            overlay.style.transition = '';
            overlay.style.opacity = '';
            overlay.onclick = null;
        }, 400);
    };
}
window.showStreakMilestoneOverlay = showStreakMilestoneOverlay;

async function startNewCan(snusId) {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return false;

    const snus = globalSnusData.find(s => s.id == snusId);
    const mgVal = snus ? snus.nicotine : 0;

    const {
        error
    } = await supabaseClient
        .from('usage_logs')
        .insert([{
            user_id: user.id,
            snus_id: snusId,
            mg_per_gram: mgVal,
            is_active: true
        }]);

    if (!error) {
        triggerHapticFeedback();
        await loadUsageData();
        return true;
    } else {
        console.error("Supabase Error:", error.message);
        return false;
    }
}

async function startNewCanFromModal() {
    if (!currentSelectedSnusId) {
        console.error("Fehler: Keine Snus-ID gefunden.");
        return;
    }

    const btn = document.getElementById('open-can-btn');
    if (btn) {
        btn.innerHTML = '<div class="flex items-center justify-center w-[34px] h-[25px] mx-auto"><svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
        btn.classList.add('opacity-80');
        btn.disabled = true;
    }

    const success = await startNewCan(currentSelectedSnusId);

    if (success) {
        closeSnusDetail();

        switchTab('home');
    } else {
        alert(t('error.openCanFailed'));
    }

    if (btn) {
        btn.innerHTML = t('modal.openNewCan');
        btn.classList.remove('opacity-80');
        btn.disabled = false;
    }
}

async function loadUsageData() {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const {
        data: logs,
        error
    } = await supabaseClient
        .from('usage_logs')
        .select('*, snus_products(name, image)')
        .eq('user_id', user.id)
        .order('opened_at', {
            ascending: false
        });

    if (!error && logs) {
        globalAllLogs = logs;
        globalActiveLogs = logs.filter(l => l.is_active === true);
        globalInactiveLogs = logs.filter(l => l.is_active === false);

        renderActiveCansUI();
        calculateUsageStats(logs);
        updateLivePerformance();
        validateAndRenderStreak();
    }
}

async function finishSpecificCan(logId) {
    triggerHapticFeedback();

    const logItem = globalActiveLogs.find(c => c.id === logId);
    const maxPouches = logItem ? (logItem.pouches_per_can || 20) : 20;

    const {
        error
    } = await supabaseClient
        .from('usage_logs')
        .update({
            finished_at: new Date().toISOString(),
            is_active: false,
            pouches_taken: maxPouches
        })
        .eq('id', logId);

    if (!error) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const addedPouches = maxPouches - (logItem ? (logItem.pouches_taken || 0) : 0);
            if (addedPouches > 0) {
                const todayStr = new Date().toISOString().split('T')[0];
                await supabaseClient.rpc('increment_daily_consumption', {
                    uid: user.id,
                    target_date: todayStr,
                    amount: addedPouches
                });
            }
        }
        await loadUsageData();
    }
}

function renderActiveCansUI() {
    const container = document.getElementById('active-cans-list');
    renderMouTrackUI();
    if (!container) return;

    container.innerHTML = '';

    if (globalActiveLogs.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-between px-1 py-2"><p class="text-[13px] text-zinc-500">${t('activeCan.noActive')}</p><button onclick="triggerHapticFeedback(); openScanModal()" class="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-full text-[13px] font-medium text-white active:bg-white/20 transition-colors tracking-wide">${t('activeCan.openNext')}<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></button></div>`;
        return;
    }

    const trackingMode = localStorage.getItem('snusTrackingMode') || 'full';
    const parts = [];

    globalActiveLogs.forEach(can => {
        const snusName = can.snus_products ? can.snus_products.name : 'Unknown';
        const snusImg = can.snus_products ? can.snus_products.image : '';
        const logId = can.id;

        if (trackingMode === 'individual') {
            const pouchesTotal = can.pouches_per_can || 20;
            const pouchesTaken = can.pouches_taken || 0;

            parts.push(`
                <div class="flex items-center justify-between bg-[#1C1C1E] border border-white/5 rounded-2xl p-3 mb-3 shadow-sm select-none">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <img src="${GITHUB_BASE}${snusImg}" class="h-full object-contain">
                        </div>
                        <div class="min-w-0 flex-1 pr-2">
                            <h4 class="text-white text-[15px] font-semibold truncate leading-tight">${snusName}</h4>
                            <p class="text-[11px] text-[#8E8E93] tracking-wider mt-0.5">${pouchesTaken} / ${pouchesTotal} ${t('activeCan.pouchesTaken')}</p>
                        </div>
                    </div>

                    <div class="relative w-[48px] h-[48px] flex items-center justify-center group flex-shrink-0 touch-none"
                         oncontextmenu="return false;"
                         ontouchstart="startAddPouch('${logId}', ${pouchesTotal}, ${pouchesTaken})"
                         ontouchend="stopAddPouch()"
                         onmousedown="startAddPouch('${logId}', ${pouchesTotal}, ${pouchesTaken})"
                         onmouseup="stopAddPouch()"
                         onmouseleave="stopAddPouch()">

                        <svg class="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 48 48">
                            <circle class="hold-progress-track" cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.1)" stroke-width="4" fill="none" />
                            <circle id="progress-${logId}" class="hold-progress-fill" cx="24" cy="24" r="22" stroke="white" stroke-width="4" fill="none"
                                    stroke-dasharray="138.2" stroke-dashoffset="138.2" style="transition: none;" />
                        </svg>

                        <div class="w-[36px] h-[36px] bg-white/10 rounded-full flex items-center justify-center group-active:scale-95 transition-transform pointer-events-none">
                            <svg class="w-5 h-5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                    </div>
                </div>
            `);
        } else {
            parts.push(`
                <div class="flex items-center justify-between bg-[#1C1C1E] border border-white/5 rounded-2xl p-3 mb-3 shadow-sm">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <img src="${GITHUB_BASE}${snusImg}" class="h-full object-contain">
                        </div>
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[15px] font-semibold truncate leading-tight">${snusName}</h4>
                            <p class="text-[11px] text-[#8E8E93] tracking-wider mt-0.5">${t('activeCan.openSince')} ${new Date(can.opened_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div id="empty-container-${can.id}" class="relative flex-shrink-0 cursor-pointer ml-3"
                        ontouchstart="startEmptyCan('${can.id}')"
                        ontouchend="stopEmptyCan()"
                        onmousedown="startEmptyCan('${can.id}')"
                        onmouseup="stopEmptyCan()"
                        onmouseleave="stopEmptyCan()"
                        oncontextmenu="return false;"
                        style="padding: 4px; user-select: none; -webkit-user-select: none;">

                        <svg class="absolute inset-0 w-full h-full pointer-events-none"
                             viewBox="0 0 76 41">
                            <path class="empty-progress-track" d="M38,1.25 H55.5 A19.25,19.25 0 1,1 55.5,39.75 H20.5 A19.25,19.25 0 1,1 20.5,1.25 H38 Z"
                                stroke="rgba(255,255,255,0.15)" stroke-width="2.5" fill="none"
                                stroke-linecap="butt" />
                            <path id="empty-progress-${can.id}" class="empty-progress-fill"
                                d="M38,1.25 H55.5 A19.25,19.25 0 1,1 55.5,39.75 H20.5 A19.25,19.25 0 1,1 20.5,1.25 H38 Z"
                                stroke="white" stroke-width="2.5" fill="none"
                                stroke-linecap="butt"
                                pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"
                                style="transition: none;" />
                        </svg>

                        <div id="empty-btn-${can.id}" class="relative bg-white text-black text-[11px] font-bold px-4 py-2 rounded-full pointer-events-none select-none whitespace-nowrap">
                            ${t('activeCan.empty')}
                        </div>
                    </div>
                </div>
            `);
        }
    });

    container.innerHTML = parts.join('');
}

let addPouchTimer = null;
let addPouchProgress = 0;
let addPouchLogId = null;

let emptyCanTimer = null;
let emptyCanProgress = 0;
let emptyCanLogId = null;

function startEmptyCan(logId) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('light');
    emptyCanLogId = logId;
    emptyCanProgress = 0;

    const progressRect = document.getElementById(`empty-progress-${logId}`);
    if (progressRect) {
        progressRect.style.transition = 'none';
        progressRect.style.strokeDashoffset = '100';
    }

    let lastTs = null;
    function animateEmpty(ts) {
        if (lastTs === null) lastTs = ts;
        const delta = ts - lastTs;
        lastTs = ts;

        emptyCanProgress = Math.min(100, emptyCanProgress + (delta / 20) * 2);

        if (progressRect) {
            progressRect.style.strokeDashoffset = 100 - emptyCanProgress;
        }

        if (emptyCanProgress < 100) {
            emptyCanTimer = requestAnimationFrame(animateEmpty);
        } else {
            emptyCanTimer = null;
            if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');

            const btn = document.getElementById(`empty-btn-${logId}`);
            if (btn) {
                btn.innerHTML = '<div class="flex items-center justify-center w-[34px] h-[16px]"><svg class="animate-spin h-3.5 w-3.5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
                btn.classList.add('opacity-50');
            }

            const container = document.getElementById(`empty-container-${logId}`);
            if (container) container.style.pointerEvents = 'none';

            finishSpecificCan(logId);
        }
    }
    emptyCanTimer = requestAnimationFrame(animateEmpty);
}

function stopEmptyCan() {
    if (emptyCanTimer) {
        cancelAnimationFrame(emptyCanTimer);
        emptyCanTimer = null;
    }

    if (emptyCanLogId && emptyCanProgress < 100) {
        const progressRect = document.getElementById(`empty-progress-${emptyCanLogId}`);
        if (progressRect) {
            progressRect.style.transition = 'stroke-dashoffset 0.3s ease';
            progressRect.style.strokeDashoffset = '100';
        }
    }
}

function startAddPouch(logId, maxPouches, currentPouches) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('light');
    addPouchLogId = logId;
    addPouchProgress = 0;
    const progressCircle = document.getElementById(`progress-${logId}`);
    if (progressCircle) {
        progressCircle.style.transition = 'none';
        progressCircle.style.strokeDashoffset = '138.2';
    }

    let lastTs = null;
    function animatePouch(ts) {
        if (lastTs === null) lastTs = ts;
        const delta = ts - lastTs;
        lastTs = ts;

        addPouchProgress = Math.min(100, addPouchProgress + (delta / 20) * 2);

        if (progressCircle) {
            progressCircle.style.strokeDashoffset = 138.2 - (138.2 * (addPouchProgress / 100));
        }

        if (addPouchProgress < 100) {
            addPouchTimer = requestAnimationFrame(animatePouch);
        } else {
            addPouchTimer = null;
            if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');
            openMouTrackPlacementModal();
            executeAddPouch(logId, maxPouches, currentPouches + 1);
        }
    }
    addPouchTimer = requestAnimationFrame(animatePouch);
}

function stopAddPouch() {
    if (addPouchTimer) {
        cancelAnimationFrame(addPouchTimer);
        addPouchTimer = null;
    }

    if (addPouchLogId && addPouchProgress < 100) {
        const progressCircle = document.getElementById(`progress-${addPouchLogId}`);
        if (progressCircle) {
            progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';
            progressCircle.style.strokeDashoffset = '138.2';
        }
    }
    addPouchLogId = null;
}

async function executeAddPouch(logId, maxPouches, newCount) {
    const isFinished = newCount >= maxPouches;

    const updates = { pouches_taken: newCount };
    if (isFinished) {
        updates.is_active = false;
        updates.finished_at = new Date().toISOString();
    }

    const canIndex = globalActiveLogs.findIndex(c => c.id === logId);
    if (canIndex > -1) {
        globalActiveLogs[canIndex].pouches_taken = newCount;
        if (isFinished) {
            globalActiveLogs[canIndex].is_active = false;
            globalActiveLogs[canIndex].finished_at = updates.finished_at;
            globalActiveLogs.splice(canIndex, 1);
        }
    }
    renderActiveCansUI();

    const { error } = await supabaseClient
        .from('usage_logs')
        .update(updates)
        .eq('id', logId);

    if (error) {
        console.error("Error updating pouch count:", error);
    } else {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const todayStr = new Date().toISOString().split('T')[0];
            await supabaseClient.rpc('increment_daily_consumption', {
                uid: user.id,
                target_date: todayStr,
                amount: 1
            });
        }
        await incrementStreak();
        await loadUsageData();
    }
}

function calculateUsageStats(allLogs) {
    const finishedCans = allLogs.filter(log => !log.is_active && log.finished_at);
    const activeCans = allLogs.filter(log => log.is_active);

    if (finishedCans.length === 0 && activeCans.length === 0) {
        if (currentDashboardStats.flow !== 0) animateNumber('stat-flow', currentDashboardStats.flow, 0, 1500, " MG", false);
        if (currentDashboardStats.avgPouches !== 0) animateNumber('stat-avg-pouches', currentDashboardStats.avgPouches, 0, 1500, "", true);
        if (currentDashboardStats.avgMg !== 0) animateNumber('stat-avg-mg', currentDashboardStats.avgMg, 0, 1500, " MG", false);

        currentDashboardStats.flow = 0;
        currentDashboardStats.avgPouches = 0;
        currentDashboardStats.avgMg = 0;
        return;
    }

    let totalMgHistory = 0;
    let totalPouchesHistory = 0;

    finishedCans.forEach(can => {
        const mgPerPouch = (can.mg_per_gram || 0) / 2;
        const mgPerCan = mgPerPouch * (can.pouches_per_can || 20);
        totalMgHistory += mgPerCan;
        totalPouchesHistory += (can.pouches_per_can || 20);
    });

    activeCans.forEach(can => {
        const mgPerPouch = (can.mg_per_gram || 0) / 2;
        const taken = can.pouches_taken || 0;
        totalMgHistory += (mgPerPouch * taken);
        totalPouchesHistory += taken;
    });

    let startDate = new Date();
    if (finishedCans.length > 0) {
        startDate = new Date(finishedCans[finishedCans.length - 1].opened_at);
    } else if (activeCans.length > 0) {
        startDate = new Date(activeCans[activeCans.length - 1].opened_at);
    }

    const today = new Date();
    let totalDaysSpan = (today - startDate) / (1000 * 60 * 60 * 24);
    if (totalDaysSpan < 1) totalDaysSpan = 1;

    let avgMgPerDay = totalMgHistory / totalDaysSpan;
    let avgPouchesPerDay = totalPouchesHistory / totalDaysSpan;

    if (activeCans.length === 0) {
        const sortedFinished = [...finishedCans].sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at));
        if (sortedFinished.length > 0) {
            const lastFinishedDate = new Date(sortedFinished[0].finished_at);
            const todayReset = new Date();
            todayReset.setHours(0, 0, 0, 0);
            lastFinishedDate.setHours(0, 0, 0, 0);

            const daysSinceLastFinished = (todayReset - lastFinishedDate) / (1000 * 60 * 60 * 24);
            if (daysSinceLastFinished >= 1) {
                avgMgPerDay = 0;
                avgPouchesPerDay = 0;
            }
        }
    }

    if (currentDashboardStats.flow !== totalMgHistory) {
        animateNumber('stat-flow', currentDashboardStats.flow, totalMgHistory, 1500, " MG", false);
        currentDashboardStats.flow = totalMgHistory;
    }
    if (currentDashboardStats.avgPouches !== avgPouchesPerDay) {
        animateNumber('stat-avg-pouches', currentDashboardStats.avgPouches, avgPouchesPerDay, 1500, "", true);
        currentDashboardStats.avgPouches = avgPouchesPerDay;
    }
    if (currentDashboardStats.avgMg !== avgMgPerDay) {
        animateNumber('stat-avg-mg', currentDashboardStats.avgMg, avgMgPerDay, 1500, " MG", false);
        currentDashboardStats.avgMg = avgMgPerDay;
    }
}

window.renderActiveCansUI = renderActiveCansUI;
window.renderMouTrackUI = renderMouTrackUI;
window.setMouTrackSide = setMouTrackSide;

document.addEventListener('i18n:applied', () => {
    renderStreakUI();
    renderMouTrackUI();
});

document.addEventListener('DOMContentLoaded', renderMouTrackUI);
