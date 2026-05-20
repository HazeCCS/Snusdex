// 10. USAGE LOGS & CONCURRENT CAN TRACKING
// ==========================================

let globalAllLogs = []; // Array für alle Logs (Caching für Stats/Modals)
let globalActiveLogs = []; // Array für alle aktuell offenen Dosen
let globalInactiveLogs = []; // Array für alle geschlossenen Dosen

// --- STREAK LOGIC ---
let currentStreakCount = 0;

function renderStreakUI() {
    const text = document.getElementById('streak-counter-text');
    const container = document.getElementById('streak-tiles');
    if (!text || !container) return;

    text.innerText = currentStreakCount + " 🔥";

    let startDay = Math.floor((currentStreakCount > 0 ? currentStreakCount - 1 : 0) / 5) * 5 + 1;
    if (currentStreakCount === 0) startDay = 1;

    let html = '';
    for (let i = 0; i < 5; i++) {
        let dayNum = startDay + i;
        let isBurned = dayNum <= currentStreakCount;

        if (isBurned) {
            html += `
                <div class="flex-1 flex flex-col items-center gap-0.5 opacity-100 transition-all duration-300">
                    <svg class="w-4 h-4 text-[#FF9500] drop-shadow-[0_0_6px_rgba(255,149,0,0.5)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    </svg>
                    <span class="text-[10px] font-bold text-[#FF9500]">${dayNum}</span>
                </div>
            `;
        } else {
            html += `
                <div class="flex-1 flex flex-col items-center gap-0.5 opacity-30 transition-all duration-300">
                    <div class="w-4 h-4 flex items-center justify-center">
                        <div class="w-1.5 h-1.5 rounded-full bg-[#8E8E93]"></div>
                    </div>
                    <span class="text-[10px] font-medium text-[#8E8E93]">${dayNum}</span>
                </div>
            `;
        }
    }
    container.innerHTML = html;
}

async function validateAndRenderStreak() {
    const storedDate = localStorage.getItem('lastTrackedDate');
    const storedStreak = parseInt(localStorage.getItem('streakCount')) || 0;
    
    let activeStreak = storedStreak;

    if (storedDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastDate = new Date(storedDate);
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
    const todayStr = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('lastTrackedDate');
    
    if (storedDate !== todayStr) {
        let activeStreak = parseInt(localStorage.getItem('streakCount')) || 0;
        
        if (storedDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const lastDate = new Date(storedDate);
            lastDate.setHours(0, 0, 0, 0);
            
            const diffTime = today - lastDate;
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
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            supabaseClient.from('profiles').update({
                streak_count: activeStreak,
                last_tracked_date: todayStr
            }).eq('id', user.id).then(({error}) => {
                if (error) console.log("SQL Columns streak_count/last_tracked_date may not exist yet.");
            });
        }
    }
}
// ----------------------

async function startNewCan(snusId) {
    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();
    if (!user) return false;

    // mg_per_gram aus dem globalen Dex ziehen
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
        await loadUsageData(); // UI aktualisieren
        return true; // WICHTIG: Signalisiert Erfolg!
    } else {
        console.error("Supabase Error:", error.message);
        return false;
    }
}

// Diese Funktion wird vom Button im Modal aufgerufen
async function startNewCanFromModal() {
    if (!currentSelectedSnusId) {
        console.error("Fehler: Keine Snus-ID gefunden.");
        return;
    }

    // Button visuell blockieren, damit der User nicht 5x klickt
    const btn = document.getElementById('open-can-btn');
    if (btn) {
        btn.innerHTML = '<div class="flex items-center justify-center w-[34px] h-[25px] mx-auto"><svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
        btn.classList.add('opacity-80');
        btn.disabled = true;
    }

    const success = await startNewCan(currentSelectedSnusId);

    if (success) {
        closeSnusDetail();
        // Wir wechseln automatisch zum Home/Wallet-Tab, damit der User seine neue Dose sieht!
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

// Zentrale Lade-Funktion für alles, was mit Konsum zu tun hat
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
                            <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.1)" stroke-width="4" fill="none" />
                            <circle id="progress-${logId}" cx="24" cy="24" r="22" stroke="white" stroke-width="4" fill="none"
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
                            <path d="M38,1.25 H55.5 A19.25,19.25 0 1,1 55.5,39.75 H20.5 A19.25,19.25 0 1,1 20.5,1.25 H38 Z"
                                stroke="rgba(255,255,255,0.15)" stroke-width="2.5" fill="none"
                                stroke-linecap="butt" />
                            <path id="empty-progress-${can.id}"
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
        // 2% pro 20ms entspricht 100% in 1 Sekunde
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
        // 2% pro 20ms entspricht 100% in 1 Sekunde
        addPouchProgress = Math.min(100, addPouchProgress + (delta / 20) * 2);

        if (progressCircle) {
            progressCircle.style.strokeDashoffset = 138.2 - (138.2 * (addPouchProgress / 100));
        }

        if (addPouchProgress < 100) {
            addPouchTimer = requestAnimationFrame(animatePouch);
        } else {
            addPouchTimer = null;
            if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');
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
        incrementStreak();
        loadUsageData();
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
