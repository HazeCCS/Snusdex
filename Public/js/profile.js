// ==========================================
// 8. HELPER & INITIALISIERUNG
// ==========================================

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

    // Smooth fade-out of grid only (search bar is outside grid, stays intact)
    grid.style.transition = 'opacity 0.2s ease-out';
    grid.style.opacity = '0';
    grid.style.pointerEvents = 'none';

    grid._fadeTimer = setTimeout(() => {
        grid.style.transition = 'none';
        grid.style.pointerEvents = '';

        // Klassen sauber zurücksetzen
        if (dexSortMode === 'alpha') {
            grid.className = 'flex flex-col w-full';
            if (dexObserver) dexObserver.disconnect();
        } else {
            const cols = localStorage.getItem('dexColumns') || '3';
            const is2Cols = cols === '2';
            grid.className = `grid ${is2Cols ? 'grid-cols-2' : 'grid-cols-3'} gap-3`;
        }

        const hasItems = grid.querySelectorAll('.dex-anim-card, .brand-section').length > 0;
        const showSkeletons = !hasItems || (isSearch && grid.dataset.lastSearch !== searchKey);
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
    }, 200);
}

async function setupProfile(user) {
    // Sofort mit user_metadata rendern (kein DB-Wait nötig)
    const emailEl = document.getElementById('profile-email');
    const initialsEl = document.getElementById('user-initials');
    const idEl = document.getElementById('profile-id');
    const adminEl = document.getElementById('admin-panel');

    const immediateUsername = user.user_metadata?.username || user.email.split('@')[0];
    currentUsername = immediateUsername;

    if (emailEl) emailEl.innerText = currentUsername;
    if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();
    if (idEl) idEl.innerText = `ID #${user.id.split('-')[0].toUpperCase()}`;
    if (user.email === 'tarayannorman@gmail.com' && adminEl) adminEl.classList.remove('hidden');

    updateGreeting();
    loadUserStats(user.id);

    // Vollständiges Profil im Hintergrund nachladen (featured badge + korrekter username aus DB)
    try {
        const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('username, featured_badge_id')
            .eq('id', user.id)
            .single();

        if (profileData?.username && profileData.username !== currentUsername) {
            currentUsername = profileData.username;
            if (emailEl) emailEl.innerText = currentUsername;
            if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();
            updateGreeting();
        }

        window._featuredBadgeId = profileData?.featured_badge_id || null;
        renderFeaturedBadgeOverlay();
    } catch (e) { /* ignore */ }
}

function previewProfileImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('edit-profile-image-preview');
            const placeholder = document.getElementById('edit-profile-avatar-placeholder');
            if (img) { img.src = e.target.result; img.classList.remove('hidden'); }
            if (placeholder) placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function handleProfileSave(btn) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    const newUsername = (document.getElementById('edit-username')?.value || '').trim();
    const errorEl = document.getElementById('edit-username-error');

    // Validierung: nur Buchstaben, Zahlen, Unterstriche
    const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/;
    if (!usernameRegex.test(newUsername)) {
        if (errorEl) { errorEl.innerText = 'Nur Buchstaben, Zahlen und _ erlaubt (2–30 Zeichen).'; errorEl.classList.remove('hidden'); }
        return;
    }
    if (errorEl) errorEl.classList.add('hidden');

    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Nicht eingeloggt.');

        // Aktuelles Profil laden (Rate-Limit Check)
        const { data: profile } = await supabaseClient
            .from('profiles').select('username, username_changes, username_last_reset').eq('id', user.id).single();

        const now = new Date();
        const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
        const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
        const changesThisMonth = sameMonth ? (profile.username_changes || 0) : 0;

        if (changesThisMonth >= 3) {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const daysLeft = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));
            if (errorEl) { errorEl.innerText = `Limit erreicht (3/3). Noch ${daysLeft} Tag(e) bis zur Freischaltung.`; errorEl.classList.remove('hidden'); }
            btn.disabled = false;
            btn.innerHTML = `<span>Save Changes</span>`;
            return;
        }

        if (newUsername === currentUsername) {
            btn.disabled = false; btn.innerHTML = `<span>Save Changes</span>`; return;
        }

        // Supabase auth metadata updaten
        const { error: authError } = await supabaseClient.auth.updateUser({ data: { username: newUsername } });
        if (authError) throw authError;

        // profiles Tabelle updaten inkl. Rate-Limit Counter
        const { error: dbError } = await supabaseClient.from('profiles').update({
            username: newUsername,
            username_changes: changesThisMonth + 1,
            username_last_reset: sameMonth ? profile.username_last_reset : now.toISOString()
        }).eq('id', user.id);
        if (dbError) throw dbError;

        // Update global cache + all UI spots
        currentUsername = newUsername;
        const emailEl = document.getElementById('profile-email');
        const initialsEl = document.getElementById('user-initials');
        if (emailEl) emailEl.innerText = currentUsername;
        if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();
        updateGreeting();

        // Update the remaining-changes badge and cache
        const newRemaining = Math.max(0, 3 - (changesThisMonth + 1));
        window._cachedUsernameChangesRemaining = newRemaining;
        // Also update profileCache so next open of Edit Profile shows correct values
        window._profileCache = { ...(window._profileCache || {}), username: newUsername, remaining: newRemaining };
        const changesLeftEl = document.getElementById('username-changes-left');
        if (changesLeftEl) {
            changesLeftEl.innerHTML = newRemaining === 0
                ? `<span class="text-[11px] text-[#FF3B30] font-semibold">0/3</span>`
                : newRemaining === 1
                    ? `<span class="text-[11px] text-[#FF9500] font-medium">1/3</span>`
                    : `<span class="text-[11px] text-[#8E8E93] font-medium">${newRemaining}/3</span>`;
        }

        btn.classList.remove('bg-white', 'text-black');
        btn.classList.add('bg-[#34C759]', 'text-white');
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg> Gespeichert`;
        if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('bg-[#34C759]', 'text-white');
            btn.classList.add('bg-white', 'text-black');
            btn.innerHTML = `<span>Save Changes</span>`;
        }, 2500);

    } catch (err) {
        if (errorEl) { errorEl.innerText = err.message; errorEl.classList.remove('hidden'); }
        btn.disabled = false;
        btn.innerHTML = `<span>Save Changes</span>`;
    }
}

let displayedXp = null;
let actualXp = null;

async function loadUserStats(userId) {
    const {
        count
    } = await supabaseClient.from('user_collections').select('*', {
        count: 'exact',
        head: true
    }).eq('user_id', userId);

    const xp = (count || 0) * 100;
    const level = Math.floor(xp / 300) + 1;

    actualXp = xp;

    const profileXpEl = document.getElementById('profile-xp');
    const profileLevelEl = document.getElementById('profile-level');
    if (profileXpEl) profileXpEl.innerText = `${xp} XP`;
    if (profileLevelEl) profileLevelEl.innerText = `Lvl ${level}`;

    if (displayedXp === null) {
        displayedXp = xp;
        const scoreEl = document.getElementById('score');
        const homeLevelEl = document.getElementById('home-level');
        if (scoreEl) scoreEl.innerHTML = `${xp} <span class="font-medium text-[20px] text-white/50">XP</span>`;
        if (homeLevelEl) homeLevelEl.innerText = `LVL ${level}`;
    } else if (displayedXp !== actualXp) {
        const homeTab = document.getElementById('tab-home');
        if (!homeTab.classList.contains('hidden')) {
            animateXp(displayedXp, actualXp, level);
        }
    }
}

function animateXp(startValue, endValue, newLevel) {
    const scoreEl = document.getElementById('score');
    const homeLevelEl = document.getElementById('home-level');
    if (!scoreEl) return;

    const duration = 1500;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const currentVal = Math.floor(startValue + (endValue - startValue) * easeProgress);

        scoreEl.innerHTML = `${currentVal} <span class="font-medium text-[20px] text-white/50">XP</span>`;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            displayedXp = endValue;
            if (homeLevelEl) homeLevelEl.innerText = `LVL ${newLevel}`;

            if (typeof triggerHapticFeedback === 'function') {
                triggerHapticFeedback();
            }
        }
    }

    requestAnimationFrame(updateCounter);
}

let currentDashboardStats = {
    count: 0,
    flow: 0,
    avgPouches: 0,
    avgMg: 0
};

function animateNumber(elementId, startValue, endValue, duration = 1500, suffix = "", isFloat = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentVal = startValue + (endValue - startValue) * easeProgress;

        let displayStr = "";
        if (isFloat) {
            displayStr = currentVal.toFixed(1).replace('.', ',');
        } else {
            displayStr = Math.floor(currentVal).toLocaleString('de-DE');
        }

        el.innerText = `${displayStr}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            let finalStr = isFloat ? endValue.toFixed(1).replace('.', ',') : Math.floor(endValue).toLocaleString('de-DE');
            el.innerText = `${finalStr}${suffix}`;
        }
    }
    requestAnimationFrame(update);
}

// ==========================================
// 11. DEBUGGING & DEV COMMANDS
// ==========================================
window.unlock = function (id) {
    const foundSnus = globalSnusData.find(s => s.id === id);
    if (foundSnus) {
        console.log(`[Dev] Unlocking Snus #${id}: ${foundSnus.name} for rating...`);
        openSnusDetail(foundSnus.id, true);
    } else {
        console.error(`[Dev] Snus mit ID ${id} nicht gefunden!`);
    }
    return "Dev command executed.";
};
