// ==========================================
// 9. TOP SNUS OF THE WEEK & SOCIAL
// ==========================================

// Rendert den gecachten Social-Inhalt sofort ohne Netzwerkzugriff
function renderSocialFromCache() {
    const container = document.getElementById('top-snus-container');
    if (!container || !_socialCacheData) return;
    container.innerHTML = _socialCacheData;
}

async function loadTopSnusOfWeek() {
    const container = document.getElementById('top-snus-container');
    if (!container) return;

    // Two featured cards (each has mb-5 built-in matching renderSocialCard)
    // + list section matching renderSocialListUI wrapper structure
    container.innerHTML = `
        ${skeletonHTML('social-featured', 2)}
        <div class="mb-6">
            <div class="flex items-center justify-between mb-2.5">
                <div class="sk h-4 w-32 rounded-full"></div>
                <div class="sk h-7 w-28 rounded-full"></div>
            </div>
            <div class="bg-[#1C1C1E] rounded-[16px] border border-white/5 overflow-hidden shadow-lg">
                ${skeletonHTML('social-list-item', 7)}
            </div>
        </div>
    `;

    const {
        data,
        error
    } = await supabaseClient.rpc('get_social_stats');

    if (error) {
        console.error("Error fetching social stats:", error);
        container.innerHTML = `<div class="p-6 text-center text-[#FF3B30] text-[15px]">${t('social.errorLoad')}</div>`;
        return;
    }

    // Start with empty container
    container.innerHTML = '';

    if (!data || (!data.top_rated && !data.most_popular_today)) {
        // Render nothing for these cards, but continue to load Most Scanned
    } else {
        const {
            top_rated,
            most_popular_today
        } = data;

        // Render Top Rated card
        if (top_rated && top_rated.snus_id) {
            const snusInfo = globalSnusData.find(s => s.id == top_rated.snus_id);
            if (snusInfo) {
                const ratings = {
                    visuals: (top_rated.avg_ratings.visuals || 0).toFixed(1),
                    smell: (top_rated.avg_ratings.smell || 0).toFixed(1),
                    taste: (top_rated.avg_ratings.taste || 0).toFixed(1),
                    bite: (top_rated.avg_ratings.bite || 0).toFixed(1),
                    drip: (top_rated.avg_ratings.drip || 0).toFixed(1),
                    strength: (top_rated.avg_ratings.strength || 0).toFixed(1),
                };
                const overall = (top_rated.avg_score || 0).toFixed(1);
                const count = top_rated.rating_count || 0;
                container.innerHTML += renderSocialCard(t('social.topRatedCard'), snusInfo, ratings, overall, count, t('social.ratingsLabel'));
            }
        }

        // Render Most Popular Today card
        if (most_popular_today && most_popular_today.snus_id) {
            const snusInfo = globalSnusData.find(s => s.id == most_popular_today.snus_id);
            if (snusInfo) {
                let popOverall = 'N/A';
                let popAvgRatings = {
                    taste: 'N/A',
                    smell: 'N/A',
                    bite: 'N/A',
                    drip: 'N/A',
                    visuals: 'N/A',
                    strength: 'N/A'
                };

                // Check if there are any ratings for the most popular snus
                if (most_popular_today.rating_count && most_popular_today.rating_count > 0) {
                    popAvgRatings = {
                        visuals: (most_popular_today.avg_ratings.visuals || 0).toFixed(1),
                        smell: (most_popular_today.avg_ratings.smell || 0).toFixed(1),
                        taste: (most_popular_today.avg_ratings.taste || 0).toFixed(1),
                        bite: (most_popular_today.avg_ratings.bite || 0).toFixed(1),
                        drip: (most_popular_today.avg_ratings.drip || 0).toFixed(1),
                        strength: (most_popular_today.avg_ratings.strength || 0).toFixed(1),
                    };
                    popOverall = (most_popular_today.avg_score || 0).toFixed(1);
                }

                container.innerHTML += renderSocialCard(t('social.mostPopularCard'), snusInfo, popAvgRatings, popOverall, most_popular_today.scan_count, t('social.scansLabel'));
            }
        }
    }

    // Load Most Scanned List Wrapper & Data
    await loadMostScannedThisWeek();
}

let _socialListMode = 0; // 0: 7 Days, 1: Today, 2: Top Rated
let _socialListData = { days7: [], today: [], topRated: [] };

window.cycleSocialListMode = function () {
    _socialListMode = (_socialListMode + 1) % 3;
    triggerHapticFeedback();
    renderSocialListUI();
};

window.toggleListScore = function (btn, id) {
    triggerHapticFeedback();
    const detailsDiv = document.getElementById(`score-details-${id}`);
    if (detailsDiv) {
        const isHidden = detailsDiv.classList.contains('hidden');

        if (isHidden) {
            detailsDiv.classList.remove('hidden');
            detailsDiv.style.opacity = '0';
            detailsDiv.style.transform = 'translateY(-10px)';
            detailsDiv.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

            // Force reflow
            void detailsDiv.offsetWidth;

            detailsDiv.style.opacity = '1';
            detailsDiv.style.transform = 'translateY(0)';
        } else {
            detailsDiv.style.opacity = '0';
            detailsDiv.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                detailsDiv.classList.add('hidden');
            }, 300);
        }

        const svg = btn.querySelector('svg');
        if (svg) {
            svg.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            svg.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }

        // Cache aktualisieren, da sich das DOM verändert hat
        setTimeout(() => {
            const topContainer = document.getElementById('top-snus-container');
            if (topContainer) _socialCacheData = topContainer.innerHTML;
        }, 300);
    }
};

async function loadMostScannedThisWeek() {
    const container = document.getElementById('top-snus-container');
    if (!container) return;

    // Wrapper anhängen falls noch nicht vorhanden
    if (!document.getElementById('social-dynamic-list-wrapper')) {
        container.innerHTML += `<div id="social-dynamic-list-wrapper"></div>`;
    }

    // Skeleton für die Liste zeigen, solange der RPC läuft
    const listWrapper = document.getElementById('social-dynamic-list-wrapper');
    if (listWrapper && !listWrapper.innerHTML.trim()) {
        listWrapper.innerHTML = `
            <div class="mb-6">
                <div class="flex items-center justify-between mb-2.5">
                    <div class="sk h-4 w-32 rounded-full"></div>
                    <div class="sk h-7 w-28 rounded-full"></div>
                </div>
                <div class="bg-[#1C1C1E] rounded-[16px] border border-white/5 overflow-hidden shadow-lg">
                    ${skeletonHTML('social-list-item', 7)}
                </div>
            </div>
        `;
    }

    // Call the RPC that bypasses RLS and returns all 3 lists with ratings
    const { data, error } = await supabaseClient.rpc('get_social_list_stats');

    if (error) {
        console.error("Error fetching social list stats:", error);
        return;
    }

    const mapToSnus = (items, countField) => {
        if (!items) return [];
        return items.map(item => {
            const snusInfo = globalSnusData.find(s => String(s.id) === String(item.snus_id));
            return {
                snusInfo,
                count: item[countField],
                score: item.score,
                ratings: {
                    visuals: item.visuals,
                    smell: item.smell,
                    taste: item.taste,
                    bite: item.bite,
                    drip: item.drip,
                    strength: item.strength
                }
            };
        }).filter(item => item.snusInfo != null);
    };

    _socialListData.days7 = mapToSnus(data?.most_scanned_7d, 'scan_count');
    _socialListData.today = mapToSnus(data?.most_scanned_today, 'scan_count');
    _socialListData.topRated = mapToSnus(data?.top_rated_all_time, 'rating_count');

    renderSocialListUI();
}

function renderSocialListUI() {
    const wrapper = document.getElementById('social-dynamic-list-wrapper');
    if (!wrapper) return;

    let items = [];
    let title = '';
    let countLabel = '';

    if (_socialListMode === 0) {
        items = _socialListData.days7;
        title = t('social.mostScanned7d');
        countLabel = t('social.scansLabel');
    } else if (_socialListMode === 1) {
        items = _socialListData.today;
        title = t('social.mostScannedToday');
        countLabel = t('social.scansLabel');
    } else {
        items = _socialListData.topRated;
        title = t('social.topRated');
        countLabel = t('social.ratingsLabel');
    }

    const scoreColor = (v) => {
        if (!v && v !== 0) return 'text-[#8E8E93]';
        const n = parseFloat(v);
        if (n <= 3.9) return 'text-[#FF3B30]';
        if (n <= 6.9) return 'text-[#FFCC00]';
        if (n <= 8.9) return 'text-[#34C759]';
        return 'text-[#32ADE6]';
    };

    const scoreRingColor = (v) => {
        if (!v && v !== 0) return 'border-[#8E8E93]/40';
        const n = parseFloat(v);
        if (n <= 3.9) return 'border-[#FF3B30]/40';
        if (n <= 6.9) return 'border-[#FFCC00]/40';
        if (n <= 8.9) return 'border-[#34C759]/40';
        return 'border-[#32ADE6]/40';
    };

    const createCircle = (label, val) => {
        const valueDisplay = (val !== null && val !== undefined) ? parseFloat(val).toFixed(1) : '—';
        return `
        <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full border-[1.5px] ${scoreRingColor(val)} flex items-center justify-center bg-black/30 mb-1.5 shadow-inner">
                <span class="text-[10px] font-bold ${scoreColor(val)}">${valueDisplay}</span>
            </div>
            <span class="text-[8px] text-[#8E8E93] uppercase tracking-wider font-semibold">${label}</span>
        </div>
        `;
    };

    let listHTML = `
        <div class="mb-6">
            <div class="flex items-center justify-between mb-2.5">
                <span class="text-[13px] text-[#8E8E93] font-semibold uppercase tracking-wider">${title}</span>
                <button onclick="cycleSocialListMode()" class="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 active:bg-white/20 transition-colors rounded-full text-white text-[10px] font-bold tracking-wider">
                    ${t('social.switchMode')}
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </div>
            <div class="bg-[#1C1C1E] rounded-[16px] border border-white/5 overflow-hidden shadow-lg">
    `;

    for (let i = 0; i < 7; i++) {
        const rank = i + 1;
        if (i < items.length) {
            const item = items[i];
            const snus = item.snusInfo;
            const name = snus.name || '—';
            const imgUrl = snus.image ? `${GITHUB_BASE}${snus.image}` : '';
            const rawScore = item.score ?? snus.overall_score ?? snus.avg_score ?? snus.score ?? null;
            const scoreDisplay = (rawScore !== null && rawScore !== undefined) ? parseFloat(rawScore).toFixed(1) : '—';
            const colorClass = scoreColor(rawScore);

            let countText = '';
            if (_socialListMode === 2) {
                countText = `${item.count} ${countLabel}`;
            } else {
                countText = `${item.count} ${countLabel}`;
            }

            listHTML += `
                <div class="border-b border-white/5 last:border-0 opacity-0" style="animation: fadeViewIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards ${i * 0.05}s">
                    <div class="flex items-center gap-3 p-3 active:bg-white/5 cursor-pointer transition-colors" onclick="openSnusDetail(${snus.id})">
                        <span class="text-[13px] font-bold text-[#8E8E93] w-5 text-center flex-shrink-0">${rank}</span>
                        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0 relative overflow-hidden bg-[#2C2C2E] rounded-md">
                            ${imgUrl ? `
                                <div class="sk absolute inset-0 opacity-10"></div>
                                <img src="${imgUrl}" class="h-full w-full object-contain relative z-10" onerror="this.style.display='none'">
                            ` : '<div class="w-10 h-10 rounded-md bg-[#2C2C2E]"></div>'}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-white text-[15px] font-semibold truncate tracking-tight leading-tight">${name}</h4>
                            <p class="text-[#8E8E93] text-[11px] tracking-wider mt-0.5">${countText}</p>
                        </div>
                        <button onclick="event.stopPropagation(); toggleListScore(this, '${snus.id}_${i}')" class="flex-shrink-0 flex flex-col items-center justify-center min-w-[48px] px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 active:bg-white/10 active:scale-95 transition-all">
                            <span class="text-[17px] font-bold ${colorClass} leading-none">${scoreDisplay}</span>
                            <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-medium mt-1 flex items-center gap-0.5">${t('social.scoreLabel')} <svg class="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" /></svg></span>
                        </button>
                    </div>
                    <!-- Details Dropdown -->
                    <div id="score-details-${snus.id}_${i}" class="hidden bg-black/20 border-t border-white/5 p-3">
                        <div class="grid grid-cols-6 gap-1 pt-1 pb-1">
                            ${createCircle(t('rating.vis'), item.ratings?.visuals)}
                            ${createCircle(t('rating.smell'), item.ratings?.smell)}
                            ${createCircle(t('rating.taste'), item.ratings?.taste)}
                            ${createCircle(t('rating.bite'), item.ratings?.bite)}
                            ${createCircle(t('rating.drip'), item.ratings?.drip)}
                            ${createCircle(t('rating.str'), item.ratings?.strength)}
                        </div>
                    </div>
                </div>
            `;
        } else {
            listHTML += `
                <div class="border-b border-white/5 last:border-0 opacity-0" style="animation: fadeViewIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards ${i * 0.05}s">
                    <div class="flex items-center gap-3 p-3 opacity-30">
                        <span class="text-[13px] font-bold text-[#8E8E93] w-5 text-center flex-shrink-0">${rank}</span>
                        <div class="w-10 h-10 rounded-md bg-[#2C2C2E] flex-shrink-0"></div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-[#8E8E93] text-[14px] italic tracking-tight">${t('social.noData')}</h4>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    listHTML += `</div></div>`;
    wrapper.innerHTML = listHTML;

    // Update Cache
    const topContainer = document.getElementById('top-snus-container');
    if (topContainer) {
        _socialCacheData = topContainer.innerHTML;
        _socialCacheTime = Date.now();
    }
}

function getScoreColor(score) {
    const val = parseFloat(score);
    if (val <= 3.9) return 'text-[#FF3B30]';
    if (val <= 6.9) return 'text-[#FFCC00]';
    if (val <= 8.9) return 'text-[#34C759]';
    return 'text-[#32ADE6]';
}

function getScoreRingColor(score) {
    const val = parseFloat(score);
    if (val <= 3.9) return 'border-[#FF3B30]/40';
    if (val <= 6.9) return 'border-[#FFCC00]/40';
    if (val <= 8.9) return 'border-[#34C759]/40';
    return 'border-[#32ADE6]/40';
}

function renderSocialCard(title, snus, ratings, overall, count, countLabel = 'Scans') {
    const rarity = (snus.rarity || 'common').toLowerCase().trim();

    const createCircle = (label, val) => `
        <div class="flex flex-col items-center">
            <div class="w-10 h-10 rounded-full border-2 ${getScoreRingColor(val)} flex items-center justify-center bg-black/20 mb-1">
                <span class="text-[13px] font-bold ${getScoreColor(val)}">${val}</span>
            </div>
            <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-medium">${label}</span>
        </div>
    `;

    return `
        <div class="bg-[#1C1C1E] rounded-[24px] p-5 shadow-lg border border-white/10 mb-5 relative active:scale-[0.98] transition-transform cursor-pointer" onclick="openSnusDetail(${snus.id})">
            <div class="mb-4 flex justify-between items-center">
                <span class="text-[11px] font-bold text-white tracking-widest uppercase bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">${title}</span>
                <span class="text-[11px] text-[#8E8E93] font-medium bg-black/30 px-2 py-1 rounded-md">${count} ${countLabel}</span>
            </div>

            <div class="flex items-center gap-4 mb-5">
                <div class="w-24 h-24 flex-shrink-0 flex items-center justify-center relative">
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full z-0" style="box-shadow: 0 0 20px 2px var(--${rarity}, var(--common)); opacity: 0.4;"></div>
                    <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain drop-shadow-xl z-10 relative" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                </div>

                <div class="flex-1 flex flex-col justify-center">
                    <h3 class="text-[18px] font-bold text-white tracking-tight leading-tight line-clamp-2 mb-1">${snus.name}</h3>
                    <p class="text-[12px] text-[#8E8E93] font-medium mb-2">${snus.nicotine} ${t('unit.mgPerG')} • <span style="color: var(--${rarity}, var(--common)); text-shadow: 0 0 8px var(--${rarity}, var(--common));" class="uppercase">${tRarity(snus.rarity)}</span></p>

                    <div class="flex items-end gap-1.5">
                        <span class="text-[26px] font-bold ${getScoreColor(overall)} leading-none">${overall}</span>
                        <span class="text-[12px] text-[#8E8E93] font-medium pb-0.5">${t('social.overallSuffix')}</span>
                    </div>
                </div>
            </div>

            <div class="pt-4 border-t border-white/5 grid grid-cols-6 gap-1">
                ${createCircle(t('rating.vis'), ratings.visuals)}
                ${createCircle(t('rating.smell'), ratings.smell)}
                ${createCircle(t('rating.taste'), ratings.taste)}
                ${createCircle(t('rating.bite'), ratings.bite)}
                ${createCircle(t('rating.drip'), ratings.drip)}
                ${createCircle(t('rating.str'), ratings.strength)}
            </div>
        </div>
    `;
}

// ==========================================
// 9.5. BADGES SYSTEM
// ==========================================

let globalBadges = [];
let globalUserBadges = new Set();
let globalBadgeProgress = 0;
const badgeImageCache = new Map();

function updateBadgesStrip() {
    const stripContainer = document.getElementById('badges-strip');
    if (stripContainer) {
        let stripHtml = '';
        globalBadges.forEach(badge => {
            if (globalUserBadges.has(badge.id)) {
                const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
                const displayUrl = badgeImageCache.get(imgUrl) || imgUrl;
                stripHtml += `<div class="w-12 h-12 flex-shrink-0"><img src="${displayUrl}" class="w-full h-full object-contain" onerror="this.src='https://via.placeholder.com/150'"></div>`;
            }
        });

        if (stripHtml === '') {
            stripContainer.innerHTML = `<div class="text-[13px] text-[#8E8E93] py-2 px-1">${t('badges.noBadges')}</div>`;
        } else {
            stripContainer.innerHTML = stripHtml;
        }
    }
}

function loadBadgesFromCache() {
    try {
        const cachedBadges = localStorage.getItem('cached_badges');
        const cachedUserBadges = localStorage.getItem('cached_user_badges');
        const cachedProgress = localStorage.getItem('cached_badge_progress');

        if (cachedBadges) globalBadges = JSON.parse(cachedBadges);
        if (cachedUserBadges) globalUserBadges = new Set(JSON.parse(cachedUserBadges));
        if (cachedProgress) globalBadgeProgress = parseInt(cachedProgress) || 0;

        if (globalBadges.length > 0) {
            updateBadgesStrip();
            renderFeaturedBadgeOverlay();
            preloadBadgeImages();
        }
    } catch (e) {
        console.warn("Failed to load badges from cache", e);
    }
}

async function loadBadges() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Alle 3 Queries parallel starten – spart ~60-80% Wartezeit
    const [{ data: allBadges }, { data: userBadges }, { data: collections }] = await Promise.all([
        supabaseClient.from('badges').select('*').order('level', { ascending: true }),
        supabaseClient.from('user_badges').select('badge_id').eq('user_id', user.id),
        supabaseClient.from('user_collections').select('snus_id').eq('user_id', user.id)
    ]);

    if (allBadges) globalBadges = allBadges;
    globalUserBadges = new Set(userBadges ? userBadges.map(ub => ub.badge_id) : []);
    globalBadgeProgress = collections ? new Set(collections.map(c => c.snus_id)).size : 0;

    // Save to cache
    localStorage.setItem('cached_badges', JSON.stringify(globalBadges));
    localStorage.setItem('cached_user_badges', JSON.stringify([...globalUserBadges]));
    localStorage.setItem('cached_badge_progress', globalBadgeProgress);

    updateBadgesStrip();
    renderFeaturedBadgeOverlay();
    preloadBadgeImages();
}

function openBadgesGrid() {
    const gridPage = document.getElementById('badges-grid-page');
    if (!gridPage) return;

    gridPage.classList.remove('hidden');
    setTimeout(() => {
        gridPage.classList.remove('translate-x-full');
    }, 10);

    const gridContent = document.getElementById('badges-grid-content');
    if (!gridContent) return;

    let html = '';
    globalBadges.forEach(badge => {
        const isUnlocked = globalUserBadges.has(badge.id);
        const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;

        let progressPercent = 0;
        if (badge.category === 'collector') {
            progressPercent = Math.min(100, Math.floor((globalBadgeProgress / badge.required_count) * 100));
        }

        if (isUnlocked) {
            html += `
                <div class="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 flex flex-col items-center shadow-sm relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                    <div class="w-28 h-28 mb-3 drop-shadow-lg">
                        <img src="${imgUrl}" class="w-full h-full object-contain" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <h3 class="text-white text-[15px] font-bold text-center leading-tight mb-1">${badge.name}</h3>
                    <p class="text-[#8E8E93] text-[11px] text-center mb-3 line-clamp-2">${badge.description}</p>
                    <div class="w-full bg-[#34C759]/20 rounded-full py-1 text-center mt-auto border border-[#34C759]/30">
                        <span class="text-[#34C759] text-[10px] font-bold uppercase tracking-wider">${t('badges.unlocked')}</span>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="bg-[#1C1C1E]/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center shadow-sm relative opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                    <div class="w-28 h-28 mb-3 opacity-50 drop-shadow-none">
                        <img src="${imgUrl}" class="w-full h-full object-contain" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <h3 class="text-white/70 text-[15px] font-bold text-center leading-tight mb-1">${badge.name}</h3>
                    <p class="text-[#8E8E93]/70 text-[11px] text-center mb-3 line-clamp-2">${badge.description}</p>

                    <div class="w-full mt-auto">
                        <div class="flex justify-between items-end mb-1">
                            <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-semibold">${t('badges.progress')}</span>
                            <span class="text-[11px] font-bold text-white">${progressPercent}%</span>
                        </div>
                        <div class="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                            <div class="h-full bg-white/30 rounded-full" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    gridContent.innerHTML = html;
}

function closeBadgesGrid() {
    const gridPage = document.getElementById('badges-grid-page');
    if (!gridPage) return;

    gridPage.classList.add('translate-x-full');
    setTimeout(() => {
        gridPage.classList.add('hidden');
    }, 300);
}

function renderFeaturedBadgeOverlay() {
    const overlay = document.getElementById('profile-badge-overlay');
    const img = document.getElementById('profile-badge-img');
    if (!overlay || !img) return;

    const badgeId = window._featuredBadgeId;
    if (!badgeId) { overlay.classList.add('hidden'); return; }

    const badge = globalBadges.find(b => b.id === badgeId);
    if (!badge) { overlay.classList.add('hidden'); return; }

    const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
    img.src = badgeImageCache.get(imgUrl) || imgUrl;
    overlay.classList.remove('hidden');
}

function renderBadgeSelectorItems() {
    const container = document.getElementById('badge-selector-scroll');
    if (!container) return;

    while (container.children.length > 1) container.removeChild(container.lastChild);

    const unlockedBadges = globalBadges.filter(b => globalUserBadges.has(b.id));

    if (unlockedBadges.length === 0) {
        container.insertAdjacentHTML('beforeend', `<span class="text-[12px] text-[#8E8E93] self-center pl-1">${t('badges.noBadges')}</span>`);
    }

    unlockedBadges.forEach(badge => {
        const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
        const displayUrl = badgeImageCache.get(imgUrl) || imgUrl;
        const item = document.createElement('div');
        item.className = 'badge-sel-item flex-shrink-0 flex flex-col items-center gap-2';
        item.dataset.badgeId = String(badge.id);
        item.onclick = function () { triggerHapticFeedback(); selectFeaturedBadge(badge.id, this); };
        const displayName = badge.name.replace(/\bcollector\b/i, '').trim();
        item.innerHTML = `
            <div class="sel-ring w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center bg-[#1C1C1E] transition-all duration-200 overflow-hidden p-1">
                <img src="${displayUrl}" class="w-full h-full object-contain">
            </div>
            <span class="text-[11px] text-[#8E8E93] text-center leading-tight w-[56px] line-clamp-2">${displayName}</span>
        `;
        container.appendChild(item);
    });

    updateBadgeSelectorUI();
}

function updateBadgeSelectorUI() {
    const selected = window._featuredBadgeId;
    document.querySelectorAll('.badge-sel-item').forEach(item => {
        const ring = item.querySelector('.sel-ring');
        if (!ring) return;
        const isNone = item.dataset.badgeId === 'none';
        const isSelected = selected ? String(selected) === item.dataset.badgeId : isNone;
        if (isSelected) {
            ring.classList.remove('border-white/20', 'border-dashed');
            ring.classList.add('border-white');
        } else {
            ring.classList.remove('border-white');
            ring.classList.add('border-white/20');
            if (isNone) ring.classList.add('border-dashed');
        }
    });
}

async function selectFeaturedBadge(badgeId, el) {
    window._featuredBadgeId = badgeId;
    updateBadgeSelectorUI();
    renderFeaturedBadgeOverlay();

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        await supabaseClient.from('profiles').update({ featured_badge_id: badgeId }).eq('id', user.id);
    } catch (e) { /* ignore */ }
}

async function evaluateBadges() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    await loadBadges();

    let anyUnlocked = false;
    for (const badge of globalBadges) {
        if (!globalUserBadges.has(badge.id) && badge.category === 'collector' && globalBadgeProgress >= badge.required_count) {
            const { error } = await supabaseClient
                .from('user_badges')
                .insert([{ user_id: user.id, badge_id: badge.id }]);

            if (!error) {
                const xpMap = { 1: 250, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1200, 7: 1400, 8: 1600, 9: 1800, 10: 2000 };
                const xpGained = xpMap[badge.level] || 100;
                await supabaseClient.rpc('increment_badge_xp', { uid: user.id, xp_amount: xpGained });
                showBadgeUnlock(badge, xpGained);
                globalUserBadges.add(badge.id);
                anyUnlocked = true;
            }
        }
    }

    // Nur UI aktualisieren wenn neue Badges freigeschaltet wurden – kein zweites loadBadges()
    if (anyUnlocked) {
        updateBadgesStrip();
        renderFeaturedBadgeOverlay();
        localStorage.setItem('cached_user_badges', JSON.stringify([...globalUserBadges]));
    }
}

function showBadgeUnlock(badge, xp) {
    const overlay = document.getElementById('badge-unlock-overlay');
    const img = document.getElementById('badge-unlock-img');
    const nameText = document.getElementById('badge-unlock-name');
    const xpText = document.getElementById('badge-unlock-xp');

    if (!overlay || !img || !nameText) return;

    const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
    img.src = imgUrl;
    nameText.innerText = badge.name;

    if (xpText && xp) {
        xpText.style.display = 'block';
        xpText.innerText = '+' + xp + ' XP';
    } else if (xpText) {
        xpText.style.display = 'none';
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');

    // Close on click
    overlay.onclick = () => closeBadgeUnlock();
}

function closeBadgeUnlock() {
    const overlay = document.getElementById('badge-unlock-overlay');
    if (!overlay) return;

    // Smooth Fade-Out Animation
    overlay.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.classList.remove('flex');
        overlay.classList.add('hidden');
        overlay.style.transition = '';
        overlay.style.opacity = '';
        overlay.onclick = null;
    }, 400);

    if (typeof loadUserStats === 'function') {
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) loadUserStats(user.id);
        });
    }
}

// ==========================================
// 9.6. SOCIAL FEATURES (FRIENDS & SEARCH)
// ==========================================

let userSearchTimeout;

function clearConnectionSearch() {
    const input = document.getElementById('connections-search-input');
    const clearBtn = document.getElementById('conn-search-clear');
    const searchPanel = document.getElementById('connections-search-panel');
    const mainPanel = document.getElementById('connections-main-panel');
    const resultsContainer = document.getElementById('connections-search-results');

    input.value = '';
    clearBtn.classList.add('hidden');
    searchPanel.classList.add('hidden');
    mainPanel.classList.remove('hidden');
    resultsContainer.innerHTML = '';
}

async function searchUsersConnections() {
    clearTimeout(userSearchTimeout);
    const inputField = document.getElementById('connections-search-input');
    const query = inputField.value.trim();
    const resultsContainer = document.getElementById('connections-search-results');
    const searchPanel = document.getElementById('connections-search-panel');
    const mainPanel = document.getElementById('connections-main-panel');
    const clearBtn = document.getElementById('conn-search-clear');

    if (query.length === 0) {
        // Wenn komplett leer, rufe clearConnectionSearch auf (welches alles zurücksetzt)
        clearConnectionSearch();
        return;
    }

    if (query.length < 2) {
        // Wenn 1 Buchstabe: Zeige Search Panel mit "Bitte mehr tippen", aber lösche NICHT den Input!
        clearBtn.classList.remove('hidden');
        mainPanel.classList.add('hidden');
        searchPanel.classList.remove('hidden');
        resultsContainer.innerHTML = `<div class="text-center text-[#8E8E93] text-[14px] mt-8">${t('connections.typeMore')}</div>`;
        return;
    }

    clearBtn.classList.remove('hidden');
    mainPanel.classList.add('hidden');
    searchPanel.classList.remove('hidden');
    resultsContainer.innerHTML = `<div class="text-center text-[#8E8E93] text-[14px] mt-8">${t('connections.searching')}</div>`;

    userSearchTimeout = setTimeout(async () => {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // Suche Profile
        const { data: profiles, error: pError } = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url, xp')
            .ilike('username', `%${query}%`)
            .neq('id', user.id)
            .limit(20);

        if (pError || !profiles || profiles.length === 0) {
            resultsContainer.innerHTML = `<div class="text-center text-[#8E8E93] text-[14px] mt-8">${t('connections.noCollectorFound')}</div>`;
            return;
        }

        // Finde Follow-Status des aktuellen Users zu diesen Profilen
        const { data: follows } = await supabaseClient
            .from('user_follows')
            .select('following_id, status')
            .eq('follower_id', user.id)
            .in('following_id', profiles.map(p => p.id));

        const followMap = {};
        if (follows) {
            follows.forEach(f => followMap[f.following_id] = f.status);
        }

        resultsContainer.innerHTML = profiles.map(profile => {
            const followStatus = followMap[profile.id] || 'none';
            let btnText = t('connections.follow');
            let btnClass = "bg-white text-black active:bg-white/90";
            if (followStatus === 'accepted') { btnText = t('connections.following_btn'); btnClass = "bg-[#2C2C2E] text-white active:bg-[#3A3A3C]"; }
            else if (followStatus === 'pending') { btnText = t('connections.requested'); btnClass = "bg-[#2C2C2E] text-white active:bg-[#3A3A3C]"; }

            const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;
            const xp = profile.xp || 0;
            const level = Math.floor(xp / 300) + 1;
            const cans = Math.floor(xp / 100);

            return `
                <div class="flex items-center justify-between py-2.5">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[15px] font-semibold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                            <p class="text-[13px] text-[#8E8E93] truncate">${t('profile.level')} ${level} • ${cans} ${t('profile.cans')}</p>
                        </div>
                    </div>
                    <button onclick="triggerHapticFeedback(); toggleFollow('${profile.id}', this)"
                            data-status="${followStatus}"
                            class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all flex-shrink-0 ${btnClass}">
                        ${btnText}
                    </button>
                </div>
            `;
        }).join('');
    }, 400);
}

async function toggleFollow(targetId, btnElement) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const currentStatus = btnElement.getAttribute('data-status');
    btnElement.disabled = true;

    // Visuelles Feedback sofort
    const originalText = btnElement.innerText;
    const originalClass = btnElement.className;
    btnElement.innerText = "...";

    if (currentStatus === 'accepted' || currentStatus === 'pending') {
        // UNFOLLOW / ANFRAGE ZURÜCKZIEHEN
        const { error } = await supabaseClient
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetId);

        if (!error) {
            btnElement.setAttribute('data-status', 'none');
            btnElement.className = "ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all flex-shrink-0 bg-white text-black active:bg-white/90";
            btnElement.innerText = t('connections.follow');
        } else {
            btnElement.className = originalClass;
            btnElement.innerText = originalText;
        }
    } else {
        // FOLLOW / ANFRAGE SENDEN
        const { error } = await supabaseClient
            .from('user_follows')
            .insert([{
                follower_id: user.id,
                following_id: targetId,
                status: 'pending' // Instagram-style: immer erst pending
            }]);

        if (!error) {
            btnElement.setAttribute('data-status', 'pending');
            btnElement.className = "ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all flex-shrink-0 bg-[#2C2C2E] text-white active:bg-[#3A3A3C]";
            btnElement.innerText = t('connections.requested');
        } else {
            btnElement.className = originalClass;
            btnElement.innerText = originalText;
        }
    }

    btnElement.disabled = false;
    // Wenn wir nicht in der Suche sind, lade Daten neu
    const searchPanel = document.getElementById('connections-search-panel');
    if (searchPanel && searchPanel.classList.contains('hidden')) {
        loadConnectionsData();
    }
}

// ==========================================
// 9.6. CONNECTIONS PAGE TABS & DATA LOGIC
// ==========================================

function switchConnTab(tabName) {
    // 1. Update Buttons
    const tabs = ['friends', 'followers', 'following', 'requests'];
    tabs.forEach(t => {
        const btn = document.getElementById(`conn-tab-${t}`);
        if (btn) {
            if (t === tabName) {
                btn.classList.remove('text-[#8E8E93]', 'bg-transparent');
                btn.classList.add('bg-white', 'text-black');
            } else {
                btn.classList.remove('bg-white', 'text-black');
                btn.classList.add('text-[#8E8E93]', 'bg-transparent');
            }
        }

        // 2. Update Panels
        const panel = document.getElementById(`conn-panel-${t}`);
        if (panel) {
            if (t === tabName) panel.classList.remove('hidden');
            else panel.classList.add('hidden');
        }
    });
}

async function acceptFollowRequest(requestId, targetId) {
    triggerHapticFeedback();
    const btn = event.currentTarget;
    const parentDiv = btn.closest('.request-item-row');

    // Optimistic UI
    if (parentDiv) parentDiv.style.opacity = '0.5';

    const { error } = await supabaseClient
        .from('user_follows')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    if (!error) {
        if (parentDiv) parentDiv.remove();
        loadConnectionsData(); // Refresh all lists
    } else {
        if (parentDiv) parentDiv.style.opacity = '1';
        alert(t('error.acceptFailed'));
    }
}

async function declineFollowRequest(requestId) {
    triggerHapticFeedback();
    const btn = event.currentTarget;
    const parentDiv = btn.closest('.request-item-row');

    // Optimistic UI
    if (parentDiv) parentDiv.style.opacity = '0.5';

    const { error } = await supabaseClient
        .from('user_follows')
        .delete()
        .eq('id', requestId);

    if (!error) {
        if (parentDiv) parentDiv.remove();
        loadConnectionsData(); // Refresh counts
    } else {
        if (parentDiv) parentDiv.style.opacity = '1';
        alert(t('error.declineFailed'));
    }
}

async function loadConnectionsData() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const friendsList = document.getElementById('friends-list-container');
    const followersList = document.getElementById('followers-list-container');
    const followingList = document.getElementById('following-list-container');
    const requestsList = document.getElementById('requests-list-container');

    // 1. Lade eingehende Anfragen & Follower
    const { data: incoming } = await supabaseClient
        .from('user_follows')
        .select(`
            id, status,
            follower:profiles!follower_id(id, username, avatar_url, xp)
        `)
        .eq('following_id', user.id);

    // 2. Lade ausgehende Follows
    const { data: outgoing } = await supabaseClient
        .from('user_follows')
        .select(`
            id, status, following_id,
            following:profiles!following_id(id, username, avatar_url, xp)
        `)
        .eq('follower_id', user.id);

    // Verarbeiten
    const pendingRequests = (incoming || []).filter(c => c.status === 'pending');
    const myFollowers = (incoming || []).filter(c => c.status === 'accepted');
    const iAmFollowing = (outgoing || []).filter(c => c.status === 'accepted');

    // Freunde (Mutuals) = Die, denen ich folge UND die mir folgen
    const myFollowersIds = new Set(myFollowers.map(f => f.follower.id));
    const friends = iAmFollowing.filter(f => myFollowersIds.has(f.following_id));

    // --- RENDER PENDING REQUESTS ---
    const banner = document.getElementById('conn-pending-banner');
    const badge = document.getElementById('conn-requests-badge');
    const countText = document.getElementById('conn-pending-count-text');

    if (pendingRequests.length > 0) {
        banner.classList.remove('hidden');
        badge.classList.remove('hidden');
        countText.innerText = pendingRequests.length === 1
            ? t('connections.followerRequests', { n: pendingRequests.length })
            : t('connections.followerRequestsPlural', { n: pendingRequests.length });

        const reqParts = pendingRequests.map(req => {
            const profile = req.follower;
            if (!profile) return '';
            const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;
            return `
                <div class="request-item-row flex items-center justify-between py-2.5">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[15px] font-semibold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                            <p class="text-[13px] text-[#8E8E93] truncate">${t('connections.wantsToFollow')}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 pl-2">
                        <button onclick="acceptFollowRequest('${req.id}', '${profile.id}')" class="px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-white text-black active:bg-white/90 transition-colors">
                            ${t('connections.confirm')}
                        </button>
                        <button onclick="declineFollowRequest('${req.id}')" class="w-8 h-8 rounded-[10px] bg-[#2C2C2E] text-[#8E8E93] flex items-center justify-center active:bg-[#3A3A3C] transition-colors">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>
            `;
        });
        requestsList.innerHTML = reqParts.join('');
    } else {
        banner.classList.add('hidden');
        badge.classList.add('hidden');
        requestsList.innerHTML = `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noRequests')}</div>`;
    }

    // --- RENDER FRIENDS ---
    friendsList.innerHTML = friends.length > 0
        ? friends.map(f => renderConnectionItem(f.following, 'accepted', f.following_id)).join('')
        : `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noFriends')}</div>`;

    // Erstelle ein Map mit Status der Leute, denen ich folge
    const myOutgoingFollows = new Map();
    (outgoing || []).forEach(f => myOutgoingFollows.set(f.following_id, f.status));

    // --- RENDER FOLLOWERS ---
    followersList.innerHTML = myFollowers.length > 0
        ? myFollowers.map(f => renderConnectionItem(f.follower, myOutgoingFollows.get(f.follower.id) || 'none', f.follower.id)).join('')
        : `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noFollowers')}</div>`;

    // --- RENDER FOLLOWING ---
    followingList.innerHTML = iAmFollowing.length > 0
        ? iAmFollowing.map(f => renderConnectionItem(f.following, 'accepted', f.following_id)).join('')
        : `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noFollowing')}</div>`;
}

// Helper zum Rendern von Profil-Reihen in den Listen
function renderConnectionItem(profile, followStatus, profileId) {
    if (!profile) return '';
    const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;
    const xp = profile.xp || 0;
    const level = Math.floor(xp / 300) + 1;
    const cans = Math.floor(xp / 100);

    let actionBtn = '';
    if (followStatus === 'accepted') {
        actionBtn = `
            <button onclick="triggerHapticFeedback(); toggleFollow('${profileId}', this)" data-status="accepted" class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-[#2C2C2E] text-white active:bg-[#3A3A3C] transition-all flex-shrink-0">
                ${t('connections.following_btn')}
            </button>`;
    } else if (followStatus === 'pending') {
        actionBtn = `
            <button onclick="triggerHapticFeedback(); toggleFollow('${profileId}', this)" data-status="pending" class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-[#2C2C2E] text-white active:bg-[#3A3A3C] transition-all flex-shrink-0">
                ${t('connections.requested')}
            </button>`;
    } else {
        actionBtn = `
            <button onclick="triggerHapticFeedback(); toggleFollow('${profileId}', this)" data-status="none" class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-white text-black active:bg-white/90 transition-all flex-shrink-0">
                ${t('connections.follow')}
            </button>`;
    }

    return `
        <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff'">
                <div class="min-w-0 flex-1">
                    <h4 class="text-white text-[15px] font-semibold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                    <p class="text-[13px] text-[#8E8E93] truncate">${t('profile.level')} ${level} • ${cans} ${t('profile.cans')}</p>
                </div>
            </div>
            ${actionBtn}
        </div>
    `;
}

// Swipe-Logik für die Connections-Seite
let connStartX = 0;
let connStartY = 0;
let connCurrentX = 0;
let isConnDragging = false;
let isHorizontalIntent = null; // Prüft, ob der User scrollt oder wischt

function setupConnectionsSwipe() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    page.addEventListener('touchstart', (e) => {
        // WICHTIG: Ignoriere Swipes, die auf einem Input-Feld starten,
        // da sonst iOS Safari den Fokus-Event abbrechen kann.
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            isConnDragging = false;
            return;
        }

        connStartX = e.touches[0].clientX;
        connStartY = e.touches[0].clientY;
        connCurrentX = connStartX;
        isConnDragging = true;
        isHorizontalIntent = null; // Intent bei jedem neuen Touch zurücksetzen

        page.style.transition = 'none'; // Sofortiges Tracking
    }, { passive: true });

    page.addEventListener('touchmove', (e) => {
        if (!isConnDragging) return;

        connCurrentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = connCurrentX - connStartX;
        const deltaY = currentY - connStartY;

        // 1. Finde heraus, ob der User vertikal oder horizontal wischt (nur beim ersten Bewegen)
        if (isHorizontalIntent === null) {
            // Wenn die Bewegung nach oben/unten größer ist als nach links/rechts -> abbrechen
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isHorizontalIntent = false;
                isConnDragging = false;
                return;
            } else {
                isHorizontalIntent = true;
            }
        }

        // 2. Wenn es ein horizontaler Swipe ist, folge dem Finger (nur nach rechts)
        if (isHorizontalIntent && deltaX > 0) {
            if (e.cancelable) e.preventDefault(); // Verhindert Browser-Back-Swipe Konflikte
            page.style.transform = `translateX(${deltaX}px)`;
        }
    }, { passive: false }); // false, damit wir preventDefault nutzen können

    page.addEventListener('touchend', () => {
        if (!isConnDragging) return;
        isConnDragging = false;

        const deltaX = connCurrentX - connStartX;

        // Die Apple-Bezier-Kurve für das Zurückschnappen
        page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaX > 100) { // Schwellenwert: Wenn mehr als 100px gezogen, dann schließen
            closeConnectionsPage();
        } else {
            // Zurück in die Ausgangsposition
            page.style.transform = 'translateX(0px)';
            setTimeout(() => {
                page.style.transition = '';
            }, 350);
        }
    });
}

// Einmal initialisieren
setupConnectionsSwipe();

function openConnectionsPage() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    // 1. Reset & Lade Daten
    clearConnectionSearch();
    switchConnTab('friends'); // Default Tab
    loadConnectionsData();

    // 2. Setup (Unsichtbar nach rechts schieben)
    page.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    page.style.transition = 'none';
    page.style.transform = 'translateX(100%)';

    // 3. Force Reflow (zwingt den Browser, die Startposition zu übernehmen)
    page.offsetHeight;

    // 4. Animation abspielen
    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(0)';
}

function closeConnectionsPage() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    // 1. Animation nach rechts weg
    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(100%)';

    // 2. Aufräumen nach der Animation
    setTimeout(() => {
        page.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        // Reset Styles für den nächsten Start
        page.style.transform = '';
        page.style.transition = '';
    }, 350);
}

document.addEventListener('DOMContentLoaded', () => {
    const connectionsPage = document.getElementById('connections-page');
    if (!connectionsPage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    connectionsPage.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, {
        passive: true
    });

    connectionsPage.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY) return;

        let touchCurrentX = e.touches[0].clientX;
        let touchCurrentY = e.touches[0].clientY;

        let diffX = touchCurrentX - touchStartX;
        let diffY = Math.abs(touchCurrentY - touchStartY);

        if (diffY > Math.abs(diffX)) {
            return;
        }

        if (diffX > 0) {
            if (e.cancelable) e.preventDefault();
            isSwiping = true;
            connectionsPage.style.transition = 'none';
            connectionsPage.style.transform = `translateX(${diffX}px)`;
        }
    }, {
        passive: false
    });

    connectionsPage.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        let diffX = e.changedTouches[0].clientX - touchStartX;
        connectionsPage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        if (diffX > window.innerWidth / 3 || diffX > 100) {
            closeConnectionsPage();
        } else {
            connectionsPage.style.transform = 'translateX(0)';
        }
        setTimeout(() => {
            connectionsPage.style.transform = '';
            connectionsPage.style.transition = '';
        }, 300);
        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;
    });
});

window.loadActivityHeatmap = async function() {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const { data, error } = await supabaseClient
            .from('daily_consumption')
            .select('date, pouches_taken')
            .eq('user_id', user.id)
            .gte('date', sixMonthsAgo.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error) {
            console.error("Error fetching heatmap data:", error);
            return;
        }

        const consumptionMap = {};
        if (data) {
            data.forEach(row => {
                consumptionMap[row.date] = row.pouches_taken;
            });
        }

        let html = '';
        const monthsStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let globalWeekCount = 0;

        for (let m = 5; m >= 0; m--) {
            const date = new Date(today.getFullYear(), today.getMonth() - m, 1);
            const month = date.getMonth();
            const year = date.getFullYear();
            
            html += `<div class="flex flex-col min-w-[max-content] snap-start">`;
            html += `<span class="text-[10px] text-[#8E8E93] font-semibold mb-2 ml-1">${monthsStr[month]}</span>`;
            
            html += `<div class="grid grid-rows-7 gap-[3px] grid-flow-col">`;
            
            const firstDayDate = new Date(year, month, 1);
            let firstDay = firstDayDate.getDay(); 
            firstDay = firstDay === 0 ? 6 : firstDay - 1;
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for(let i=0; i<firstDay; i++) {
                html += `<div class="w-3 h-3 rounded-[3px] bg-transparent"></div>`;
            }
            
            let currentMonthWeeks = Math.ceil((daysInMonth + firstDay) / 7);
            
            for(let d=1; d<=daysInMonth; d++) {
                const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const amount = consumptionMap[dateStr] || 0;
                
                // Random delay between 0 and 4 seconds for "game of life" / twinkling effect
                let delay = (Math.random() * 4).toFixed(2);
                
                let colorClass = 'heatmap-hole';
                let styleStr = `style="animation-delay: -${delay}s"`;
                
                if (amount > 0) {
                    styleStr = '';
                    if (amount <= 2) colorClass = 'bg-[#4a1c1c]';
                    else if (amount <= 5) colorClass = 'bg-[#7d2020]';
                    else if (amount <= 8) colorClass = 'bg-[#b82323]';
                    else if (amount <= 11) colorClass = 'bg-[#e62e2e]';
                    else colorClass = 'bg-[#FF3B30]';
                }
                
                html += `<div class="w-3 h-3 rounded-[3px] ${colorClass}" ${styleStr}></div>`;
            }
            
            globalWeekCount += currentMonthWeeks;
            html += `</div></div>`;
        }

        container.innerHTML = html;
        
        setTimeout(() => {
            container.scrollLeft = container.scrollWidth;
        }, 100);

    } catch (err) {
        console.error("Heatmap error:", err);
    }
};
