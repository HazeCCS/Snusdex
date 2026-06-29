function renderSocialFromCache() {
    const container = document.getElementById('top-snus-container');
    if (!container || !_socialCacheData) return;
    container.innerHTML = _socialCacheData;
}

async function loadTopSnusOfWeek() {
    const container = document.getElementById('top-snus-container');
    if (!container) return;

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

    container.innerHTML = '';

    if (!data || (!data.top_rated && !data.most_popular_today)) {

    } else {
        const {
            top_rated,
            most_popular_today
        } = data;

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

    await loadCreatorsPicks();

    await loadMostScannedThisWeek();
}

let _creatorPicksData = [];

function getBarColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '#636366';
    if (n <= 3.9) return '#FF3B30';
    if (n <= 5.9) return '#FF9F0A';
    if (n <= 7.9) return '#34C759';
    if (n <= 8.9) return '#30D158';
    return '#32ADE6';
}

function renderCreatorsPickCard(pick, index = 0) {
    const snus = globalSnusData.find(s => String(s.id) === String(pick.snus_id));
    if (!snus) return '';

    const imgUrl = snus.image ? `${GITHUB_BASE}${snus.image}` : '';
    const rarity = (snus.rarity || 'common').toLowerCase().trim();

    const ratingsVal = [
        parseFloat(pick.rating_visuals),
        parseFloat(pick.rating_smell),
        parseFloat(pick.rating_taste),
        parseFloat(pick.rating_bite),
        parseFloat(pick.rating_drip),
        parseFloat(pick.rating_strength)
    ];
    const validRatings = ratingsVal.filter(v => !isNaN(v));
    const overall = validRatings.length > 0
        ? (validRatings.reduce((sum, v) => sum + v, 0) / validRatings.length).toFixed(1)
        : 'N/A';

    const avatarStyle = pick.creator_avatar_url
        ? `background-image:url('${pick.creator_avatar_url}');background-size:cover;background-position:center;`
        : `background: linear-gradient(135deg, #2C2C2E, #3A3A3C);`;

    const avatarContent = pick.creator_avatar_url
        ? ''
        : `<span class="text-[12px] font-bold text-white/85">${(pick.creator_name || '?').charAt(0).toUpperCase()}</span>`;

    const creatorName = pick.creator_name || 'Creator';
    const handleText = pick.creator_handle
        ? (pick.creator_handle.startsWith('@') ? pick.creator_handle : '@' + pick.creator_handle)
        : '';

    const createCircle = (label, val) => `
        <div class="flex flex-col items-center">
            <div class="w-10 h-10 rounded-full border-2 ${getScoreRingColor(val)} flex items-center justify-center bg-black/20 mb-1">
                <span class="text-[13px] font-bold ${getScoreColor(val)}">${val != null ? parseFloat(val).toFixed(1) : '—'}</span>
            </div>
            <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-medium">${label}</span>
        </div>
    `;

    return `
        <div class="cp-card opacity-0" style="animation: fadeViewIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards ${index * 0.08}s" onclick="openSnusDetail(${snus.id})">
            <!-- Card inner -->
            <div class="cp-card-inner">
                <!-- Layer 1: Profile (avatar + name) and Heading -->
                <div class="flex items-center justify-between mb-4 cp-profile-row">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-full border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0" style="${avatarStyle}">
                            ${avatarContent}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="text-[14px] font-semibold text-white leading-tight truncate">${creatorName}</span>
                            ${handleText ? `<span class="text-[11px] text-[#8E8E93] font-medium leading-none mt-0.5 truncate">${handleText}</span>` : ''}
                        </div>
                    </div>
                    ${pick.custom_headline ? `
                        <h4 class="text-white text-[16px] font-bold tracking-tight leading-snug max-w-[50%] truncate text-right">&ldquo;${pick.custom_headline}&rdquo;</h4>
                    ` : ''}
                </div>

                <!-- Expandable details container -->
                <div class="cp-card-details">
                    <!-- Layer 3: Rating & Product Info -->
                    <div class="flex items-center gap-4 mb-5">
                        <div class="w-20 h-20 flex-shrink-0 flex items-center justify-center relative">
                            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full z-0" style="box-shadow: 0 0 20px 2px var(--${rarity}, var(--common)); opacity: 0.3;"></div>
                            ${imgUrl ? `<img src="${imgUrl}" class="w-full h-full object-contain drop-shadow-xl z-10 relative" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">` : ''}
                        </div>

                        <div class="flex-1 flex flex-col justify-center">
                            <h3 class="text-[17px] font-bold text-white tracking-tight leading-tight line-clamp-1 mb-0.5">${snus.name}</h3>
                            <p class="text-[11px] text-[#8E8E93] font-medium mb-1.5">${snus.nicotine} ${t('unit.mgPerG')} • <span style="color: var(--${rarity}, var(--common)); text-shadow: 0 0 8px var(--${rarity}, var(--common));" class="uppercase text-[10px]">${tRarity(snus.rarity)}</span></p>

                            <div class="flex items-end gap-1">
                                <span class="text-[22px] font-bold ${getScoreColor(overall)} leading-none">${overall}</span>
                                <span class="text-[11px] text-[#8E8E93] font-medium pb-0.5">${t('social.overallSuffix')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Circles for the 6 sub-ratings -->
                    <div class="pt-3.5 border-t border-white/5 grid grid-cols-6 gap-1 mb-3.5">
                        ${createCircle(t('rating.vis'), pick.rating_visuals)}
                        ${createCircle(t('rating.smell'), pick.rating_smell)}
                        ${createCircle(t('rating.taste'), pick.rating_taste)}
                        ${createCircle(t('rating.bite'), pick.rating_bite)}
                        ${createCircle(t('rating.drip'), pick.rating_drip)}
                        ${createCircle(t('rating.str'), pick.rating_strength)}
                    </div>

                    <!-- Review text -->
                    ${pick.review_text ? `
                    <div class="pt-3 border-t border-white/5">
                        <p class="text-[12px] text-[#8E8E93] italic leading-relaxed">&ldquo;${pick.review_text}&rdquo;</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderCreatorsPickCarousel(picks) {
    const wrapper = document.getElementById('creators-pick-wrapper');
    const carousel = document.getElementById('creators-pick-carousel');
    if (!wrapper || !carousel) return;

    if (!picks || picks.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = '';

    const cardsHTML = picks.map((p, idx) => renderCreatorsPickCard(p, idx)).filter(Boolean).join('');
    if (!cardsHTML) {
        wrapper.style.display = 'none';
        return;
    }

    carousel.innerHTML = cardsHTML;

    const isCompact = localStorage.getItem('creatorsPickCompact') === 'true';
    if (isCompact) {
        carousel.classList.add('compact');
        wrapper.classList.add('compact-active');
    } else {
        carousel.classList.remove('compact');
        wrapper.classList.remove('compact-active');
    }

    updateCreatorsPickScrollButtons();
    setTimeout(updateCreatorsPickScrollButtons, 100);
    setTimeout(updateCreatorsPickScrollButtons, 300);

    if (!carousel.dataset.scrollObserved) {
        carousel.dataset.scrollObserved = 'true';
        carousel.addEventListener('scroll', () => {
            updateCreatorsPickScrollButtons();
        }, { passive: true });
        window.addEventListener('resize', () => {
            updateCreatorsPickScrollButtons();
        }, { passive: true });
    }
}

window.scrollCreatorsPick = function (direction) {
    const carousel = document.getElementById('creators-pick-carousel');
    if (!carousel) return;
    const card = carousel.querySelector('.cp-card');
    if (!card) return;

    const cardWidth = card.offsetWidth;
    const gap = 16;
    const scrollAmount = cardWidth + gap;

    if (direction === 'left') {
        carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

window.updateCreatorsPickScrollButtons = function () {
    const carousel = document.getElementById('creators-pick-carousel');
    const btnLeft = document.getElementById('creators-pick-scroll-left');
    const btnRight = document.getElementById('creators-pick-scroll-right');
    if (!carousel || !btnLeft || !btnRight) return;

    const cards = carousel.querySelectorAll('.cp-card');
    if (cards.length <= 1) {
        btnLeft.classList.add('hidden');
        btnRight.classList.add('hidden');
        return;
    }

    btnLeft.classList.remove('hidden');
    btnRight.classList.remove('hidden');

    const scrollLeft = carousel.scrollLeft;
    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;

    if (scrollLeft > 15) {
        btnLeft.classList.remove('opacity-0', 'pointer-events-none');
        btnLeft.classList.add('opacity-100');
    } else {
        btnLeft.classList.add('opacity-0', 'pointer-events-none');
        btnLeft.classList.remove('opacity-100');
    }

    if (scrollLeft < maxScrollLeft - 35) {
        btnRight.classList.remove('opacity-0', 'pointer-events-none');
        btnRight.classList.add('opacity-100');
    } else {
        btnRight.classList.add('opacity-0', 'pointer-events-none');
        btnRight.classList.remove('opacity-100');
    }
}

window.toggleCreatorsPickCompact = function () {
    const wrapper = document.getElementById('creators-pick-wrapper');
    const carousel = document.getElementById('creators-pick-carousel');
    if (wrapper && carousel) {
        const isCurrentlyCompact = carousel.classList.contains('compact');
        if (isCurrentlyCompact) {
            carousel.classList.remove('compact');
            wrapper.classList.remove('compact-active');
            localStorage.setItem('creatorsPickCompact', 'false');
        } else {
            carousel.classList.add('compact');
            wrapper.classList.add('compact-active');
            localStorage.setItem('creatorsPickCompact', 'true');
        }
    }
    triggerHapticFeedback();
};

async function loadCreatorsPicks() {
    const wrapper = document.getElementById('creators-pick-wrapper');
    const carousel = document.getElementById('creators-pick-carousel');
    if (wrapper && carousel) {
        carousel.innerHTML = skeletonHTML('creator-pick', 2);
        wrapper.style.display = '';
    }

    try {
        const { data, error } = await supabaseClient.rpc('get_creator_picks');
        if (error || !data || data.length === 0) {
            if (wrapper) wrapper.style.display = 'none';
            return;
        }
        _creatorPicksData = data;
        renderCreatorsPickCarousel(data);
    } catch (e) {
        console.warn('Creator picks load error:', e);
        if (wrapper) wrapper.style.display = 'none';
    }
}

let _socialListMode = 0;
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
        const isHidden = detailsDiv.classList.contains('hidden') || window.getComputedStyle(detailsDiv).display === 'none';

        if (isHidden) {

            detailsDiv.classList.remove('hidden');
            detailsDiv.style.display = 'block';

            detailsDiv.style.transition = 'none';
            detailsDiv.style.height = '0px';
            detailsDiv.style.borderTopWidth = '0px';
            detailsDiv.style.opacity = '0';
            detailsDiv.style.transform = 'translateY(-10px)';

            void detailsDiv.offsetHeight;

            const targetHeight = detailsDiv.scrollHeight;

            detailsDiv.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-top-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            detailsDiv.style.height = targetHeight + 'px';
            detailsDiv.style.borderTopWidth = '1px';
            detailsDiv.style.opacity = '1';
            detailsDiv.style.transform = 'translateY(0)';
        } else {

            const currentHeight = detailsDiv.offsetHeight;
            detailsDiv.style.height = currentHeight + 'px';
            detailsDiv.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-top-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

            void detailsDiv.offsetHeight;

            detailsDiv.style.height = '0px';
            detailsDiv.style.borderTopWidth = '0px';
            detailsDiv.style.opacity = '0';
            detailsDiv.style.transform = 'translateY(-10px)';

            setTimeout(() => {

                if (detailsDiv.style.height === '0px') {
                    detailsDiv.style.display = 'none';
                    detailsDiv.classList.add('hidden');
                }
            }, 300);
        }

        const svg = btn.querySelector('svg');
        if (svg) {
            svg.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            svg.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }

        setTimeout(() => {
            const topContainer = document.getElementById('top-snus-container');
            if (topContainer) _socialCacheData = topContainer.innerHTML;
        }, 320);
    }
};

async function loadMostScannedThisWeek() {
    const container = document.getElementById('top-snus-container');
    if (!container) return;

    if (!document.getElementById('social-dynamic-list-wrapper')) {
        container.innerHTML += `<div id="social-dynamic-list-wrapper"></div>`;
    }

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
                    <div id="score-details-${snus.id}_${i}" class="hidden bg-black/20 border-t border-white/5 overflow-hidden">
                        <div class="p-3">
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

    const topContainer = document.getElementById('top-snus-container');
    if (topContainer) {
        _socialCacheData = topContainer.innerHTML;
        _socialCacheTime = Date.now();

        if (typeof getSocialDbMetadata === 'function') {
            getSocialDbMetadata().then(meta => {
                if (meta) {
                    _lastSocialMetadata = meta;
                }
            });
        }
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

async function getSocialDbMetadata() {
    try {
        const collectionsPromise = supabaseClient
            .from('user_collections')
            .select('collected_at', { count: 'exact' })
            .order('collected_at', { ascending: false })
            .limit(1);

        const picksPromise = supabaseClient
            .from('creator_picks')
            .select('created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(1);

        const [collectionsRes, picksRes] = await Promise.all([collectionsPromise, picksPromise]);

        const collectionsCount = collectionsRes.count || 0;
        const collectionsMaxTime = collectionsRes.data && collectionsRes.data[0]
            ? collectionsRes.data[0].collected_at
            : null;

        const picksCount = picksRes.count || 0;
        const picksMaxTime = picksRes.data && picksRes.data[0]
            ? picksRes.data[0].created_at
            : null;

        return {
            collectionsCount,
            collectionsMaxTime,
            picksCount,
            picksMaxTime
        };
    } catch (e) {
        console.warn("[Social] Error fetching social DB metadata:", e);
        return null;
    }
}

async function checkAndReloadSocialSilently() {
    if (_isCheckingSocialDb) return;
    _isCheckingSocialDb = true;

    try {
        const currentMeta = await getSocialDbMetadata();
        if (!currentMeta) {
            _isCheckingSocialDb = false;
            return;
        }

        const hasChanged = !_lastSocialMetadata ||
            currentMeta.collectionsCount !== _lastSocialMetadata.collectionsCount ||
            currentMeta.collectionsMaxTime !== _lastSocialMetadata.collectionsMaxTime ||
            currentMeta.picksCount !== _lastSocialMetadata.picksCount ||
            currentMeta.picksMaxTime !== _lastSocialMetadata.picksMaxTime;

        if (!hasChanged) {
            console.log("[Social] Silent check: No new ratings or picks. No reload needed.");
            _isCheckingSocialDb = false;
            return;
        }

        console.log("[Social] Silent check: New data detected. Loading silently in background...");

        const [statsRes, picksRes, listStatsRes] = await Promise.all([
            supabaseClient.rpc('get_social_stats'),
            supabaseClient.rpc('get_creator_picks'),
            supabaseClient.rpc('get_social_list_stats')
        ]);

        if (statsRes.error) throw statsRes.error;
        if (picksRes.error) throw picksRes.error;
        if (listStatsRes.error) throw listStatsRes.error;

        renderSocialTabFromData(statsRes.data, picksRes.data, listStatsRes.data);

        _lastSocialMetadata = currentMeta;
        console.log("[Social] Silent reload complete. UI and cache updated.");
    } catch (err) {
        console.warn("[Social] Silent reload failed:", err);
    } finally {
        _isCheckingSocialDb = false;
    }
}

function renderSocialTabFromData(statsData, picksData, listStatsData) {
    const container = document.getElementById('top-snus-container');
    if (!container) return;

    let featuredHTML = '';
    if (statsData) {
        const { top_rated, most_popular_today } = statsData;

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
                featuredHTML += renderSocialCard(t('social.topRatedCard'), snusInfo, ratings, overall, count, t('social.ratingsLabel'));
            }
        }

        if (most_popular_today && most_popular_today.snus_id) {
            const snusInfo = globalSnusData.find(s => s.id == most_popular_today.snus_id);
            if (snusInfo) {
                let popOverall = 'N/A';
                let popAvgRatings = { taste: 'N/A', smell: 'N/A', bite: 'N/A', drip: 'N/A', visuals: 'N/A', strength: 'N/A' };

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

                featuredHTML += renderSocialCard(t('social.mostPopularCard'), snusInfo, popAvgRatings, popOverall, most_popular_today.scan_count, t('social.scansLabel'));
            }
        }
    }

    const carousel = document.getElementById('creators-pick-carousel');
    const scrollPos = carousel ? carousel.scrollLeft : 0;

    if (picksData) {
        _creatorPicksData = picksData;
        renderCreatorsPickCarousel(picksData);
        if (carousel) {

            carousel.scrollLeft = scrollPos;
        }
    }

    if (listStatsData) {
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

        _socialListData.days7 = mapToSnus(listStatsData.most_scanned_7d, 'scan_count');
        _socialListData.today = mapToSnus(listStatsData.most_scanned_today, 'scan_count');
        _socialListData.topRated = mapToSnus(listStatsData.top_rated_all_time, 'rating_count');
    }

    container.innerHTML = featuredHTML + `<div id="social-dynamic-list-wrapper"></div>`;
    renderSocialListUI();

    _socialCacheData = container.innerHTML;
    _socialCacheTime = Date.now();
}

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

    const [{ data: allBadges }, { data: userBadges }, { data: collections }] = await Promise.all([
        supabaseClient.from('badges').select('*').order('level', { ascending: true }),
        supabaseClient.from('user_badges').select('badge_id').eq('user_id', user.id),
        supabaseClient.from('user_collections').select('snus_id').eq('user_id', user.id)
    ]);

    if (allBadges) globalBadges = allBadges;
    globalUserBadges = new Set(userBadges ? userBadges.map(ub => ub.badge_id) : []);
    globalBadgeProgress = collections ? new Set(collections.map(c => c.snus_id)).size : 0;

    localStorage.setItem('cached_badges', JSON.stringify(globalBadges));
    localStorage.setItem('cached_user_badges', JSON.stringify([...globalUserBadges]));
    localStorage.setItem('cached_badge_progress', globalBadgeProgress);

    updateBadgesStrip();
    renderFeaturedBadgeOverlay();
    preloadBadgeImages();

    const supporterBadgeId = 'da77f766-3d23-41c3-ab0e-d716cf9bdf7b';
    if (globalUserBadges.has(supporterBadgeId)) {
        const shownKey = `supporter_badge_shown_${user.id}`;
        if (localStorage.getItem(shownKey) !== 'true') {
            const badge = globalBadges.find(b => b.id === supporterBadgeId);
            if (badge) {

                localStorage.setItem(shownKey, 'true');

                setTimeout(() => {
                    showBadgeUnlock(badge, 1000);
                }, 800);
            }
        }
    }
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
                    <div class="w-full bg-[#34C759]/20 rounded-full py-1.5 flex items-center justify-center mt-auto border border-[#34C759]/30">
                        <span class="text-[#34C759] text-[12px] font-bold uppercase tracking-wider">${t('badges.unlocked')}</span>
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
                        ${badge.category === 'collector' ? `
                            <div class="flex justify-between items-end mb-1">
                                <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider font-semibold">${t('badges.progress')}</span>
                                <span class="text-[11px] font-bold text-white">${progressPercent}%</span>
                            </div>
                            <div class="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                <div class="h-full bg-white/30 rounded-full" style="width: ${progressPercent}%"></div>
                            </div>
                        ` : `
                            <div class="w-full bg-white/5 rounded-full py-1.5 flex items-center justify-center border border-white/10">
                                <span class="text-[#8E8E93] text-[12px] font-bold uppercase tracking-wider">${t('badges.locked')}</span>
                            </div>
                        `}
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
    } catch (e) {  }
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
    const statusText = document.getElementById('badge-unlock-status');

    if (!overlay || !img || !nameText) return;

    const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : GITHUB_BASE + badge.image_url;
    img.src = imgUrl;

    if (badge.id === 'da77f766-3d23-41c3-ab0e-d716cf9bdf7b') {
        nameText.innerText = (typeof window.t === 'function') ? window.t('badges.supporterUnlockMsg') : "Vielen Dank für deinen Support am Snusdex-Projekt! Hier ist deine Supporter Badge.";
        nameText.style.fontSize = '20px';
        nameText.style.lineHeight = '1.4';
        if (statusText) statusText.style.display = 'none';
    } else {
        nameText.innerText = badge.name;
        nameText.style.fontSize = '';
        nameText.style.lineHeight = '';
        if (statusText) {
            statusText.style.display = 'block';
            statusText.innerText = (typeof window.t === 'function') ? window.t('badges.wasUnlocked') : 'was unlocked';
        }
    }

    if (xpText && xp) {
        xpText.style.display = 'block';
        xpText.innerText = '+' + xp + ' XP';
    } else if (xpText) {
        xpText.style.display = 'none';
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback('success');

    overlay.onclick = () => closeBadgeUnlock();
}

function closeBadgeUnlock() {
    const overlay = document.getElementById('badge-unlock-overlay');
    if (!overlay) return;

    overlay.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.classList.remove('flex');
        overlay.classList.add('hidden');
        overlay.style.transition = '';
        overlay.style.opacity = '';
        overlay.onclick = null;

        const nameText = document.getElementById('badge-unlock-name');
        const statusText = document.getElementById('badge-unlock-status');
        if (nameText) {
            nameText.style.fontSize = '';
            nameText.style.lineHeight = '';
        }
        if (statusText) {
            statusText.style.display = 'block';
        }
    }, 400);

    if (typeof loadUserStats === 'function') {
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) loadUserStats(user.id);
        });
    }
}

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

        clearConnectionSearch();
        return;
    }

    if (query.length < 2) {

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
                    <div class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onclick="triggerHapticFeedback(); openFriendProfile('${profile.id}')">
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

    const originalText = btnElement.innerText;
    const originalClass = btnElement.className;
    btnElement.innerText = "...";

    if (currentStatus === 'accepted' || currentStatus === 'pending') {

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

        const { error } = await supabaseClient
            .from('user_follows')
            .insert([{
                follower_id: user.id,
                following_id: targetId,
                status: 'pending'
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

    const searchPanel = document.getElementById('connections-search-panel');
    if (searchPanel && searchPanel.classList.contains('hidden')) {
        loadConnectionsData();
    }
}

function switchConnTab(tabName) {

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

    if (parentDiv) parentDiv.style.opacity = '0.5';

    const { error } = await supabaseClient
        .from('user_follows')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    if (!error) {
        if (parentDiv) parentDiv.remove();
        loadConnectionsData();
    } else {
        if (parentDiv) parentDiv.style.opacity = '1';
        alert(t('error.acceptFailed'));
    }
}

async function declineFollowRequest(requestId) {
    triggerHapticFeedback();
    const btn = event.currentTarget;
    const parentDiv = btn.closest('.request-item-row');

    if (parentDiv) parentDiv.style.opacity = '0.5';

    const { error } = await supabaseClient
        .from('user_follows')
        .delete()
        .eq('id', requestId);

    if (!error) {
        if (parentDiv) parentDiv.remove();
        loadConnectionsData();
    } else {
        if (parentDiv) parentDiv.style.opacity = '1';
        alert(t('error.declineFailed'));
    }
}

async function loadConnectionsData() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const friendsList = document.getElementById('friends-list-container');
        const followersList = document.getElementById('followers-list-container');
        const followingList = document.getElementById('following-list-container');
        const requestsList = document.getElementById('requests-list-container');

        const { data: incoming, error: incomingError } = await supabaseClient
            .from('user_follows')
            .select(`
                id, status,
                follower:profiles!follower_id(id, username, avatar_url, xp)
            `)
            .eq('following_id', user.id);

        if (incomingError) throw incomingError;

        const { data: outgoing, error: outgoingError } = await supabaseClient
            .from('user_follows')
            .select(`
                id, status, following_id,
                following:profiles!following_id(id, username, avatar_url, xp)
            `)
            .eq('follower_id', user.id);

        if (outgoingError) throw outgoingError;

        const validIncoming = (incoming || []).filter(c => c && c.follower);
        const validOutgoing = (outgoing || []).filter(c => c && c.following);

        const pendingRequests = validIncoming.filter(c => c.status === 'pending');
        const myFollowers = validIncoming.filter(c => c.status === 'accepted');
        const iAmFollowing = validOutgoing.filter(c => c.status === 'accepted');

        const myFollowersIds = new Set(myFollowers.map(f => f.follower.id));
        const friends = iAmFollowing.filter(f => myFollowersIds.has(f.following_id));

        const banner = document.getElementById('conn-pending-banner');
        const badge = document.getElementById('conn-requests-badge');
        const countText = document.getElementById('conn-pending-count-text');

        if (pendingRequests.length > 0) {
            if (banner) banner.classList.remove('hidden');
            if (badge) badge.classList.remove('hidden');
            if (countText) {
                countText.innerText = pendingRequests.length === 1
                    ? t('connections.followerRequests', { n: pendingRequests.length })
                    : t('connections.followerRequestsPlural', { n: pendingRequests.length });
            }

            const reqParts = pendingRequests.map(req => {
                const profile = req.follower;
                if (!profile) return '';
                const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;
                return `
                    <div class="request-item-row flex items-center justify-between py-2.5">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff'">
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
            if (requestsList) requestsList.innerHTML = reqParts.join('');
        } else {
            if (banner) banner.classList.add('hidden');
            if (badge) badge.classList.add('hidden');
            if (requestsList) requestsList.innerHTML = `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noRequests')}</div>`;
        }

        if (friendsList) {
            friendsList.innerHTML = friends.length > 0
                ? friends.map(f => renderConnectionItem(f.following, 'accepted', f.following_id)).join('')
                : `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noFriends')}</div>`;
        }

        const myOutgoingFollows = new Map();
        validOutgoing.forEach(f => myOutgoingFollows.set(f.following_id, f.status));

        if (followersList) {
            followersList.innerHTML = myFollowers.length > 0
                ? myFollowers.map(f => renderConnectionItem(f.follower, myOutgoingFollows.get(f.follower.id) || 'none', f.follower.id)).join('')
                : `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noFollowers')}</div>`;
        }

        if (followingList) {
            followingList.innerHTML = iAmFollowing.length > 0
                ? iAmFollowing.map(f => renderConnectionItem(f.following, 'accepted', f.following_id)).join('')
                : `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noFollowing')}</div>`;
        }
    } catch (err) {
        console.error("Error in loadConnectionsData:", err);
        const errorHtml = `<div class="py-10 text-center text-[#FF3B30] text-[14px]">${t('social.errorLoad')}</div>`;
        const friendsList = document.getElementById('friends-list-container');
        const followersList = document.getElementById('followers-list-container');
        const followingList = document.getElementById('following-list-container');
        const requestsList = document.getElementById('requests-list-container');
        if (friendsList) friendsList.innerHTML = errorHtml;
        if (followersList) followersList.innerHTML = errorHtml;
        if (followingList) followingList.innerHTML = errorHtml;
        if (requestsList) requestsList.innerHTML = errorHtml;
    }
}

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
            <div class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onclick="triggerHapticFeedback(); openFriendProfile('${profileId}')">
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

let connStartX = 0;
let connStartY = 0;
let connCurrentX = 0;
let isConnDragging = false;
let isHorizontalIntent = null;

function setupConnectionsSwipe() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    page.addEventListener('touchstart', (e) => {

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            isConnDragging = false;
            return;
        }

        connStartX = e.touches[0].clientX;
        connStartY = e.touches[0].clientY;
        connCurrentX = connStartX;
        isConnDragging = true;
        isHorizontalIntent = null;

        page.style.transition = 'none';
    }, { passive: true });

    page.addEventListener('touchmove', (e) => {
        if (!isConnDragging) return;

        connCurrentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = connCurrentX - connStartX;
        const deltaY = currentY - connStartY;

        if (isHorizontalIntent === null) {

            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isHorizontalIntent = false;
                isConnDragging = false;
                return;
            } else {
                isHorizontalIntent = true;
            }
        }

        if (isHorizontalIntent && deltaX > 0) {
            if (e.cancelable) e.preventDefault();
            page.style.transform = `translateX(${deltaX}px)`;
        }
    }, { passive: false });

    page.addEventListener('touchend', () => {
        if (!isConnDragging) return;
        isConnDragging = false;

        const deltaX = connCurrentX - connStartX;

        page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaX > 100) {
            closeConnectionsPage();
        } else {

            page.style.transform = 'translateX(0px)';
            setTimeout(() => {
                page.style.transition = '';
            }, 350);
        }
    });
}

setupConnectionsSwipe();
setupFriendProfileSwipe();
setupBlockedUsersSwipe();

function openConnectionsPage() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    clearConnectionSearch();
    switchConnTab('friends');
    loadConnectionsData();

    page.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    page.style.transition = 'none';
    page.style.transform = 'translateX(100%)';

    page.offsetHeight;

    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(0)';
}

function closeConnectionsPage() {
    const page = document.getElementById('connections-page');
    if (!page) return;

    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(100%)';

    setTimeout(() => {
        page.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

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

let currentFriendProfileId = null;

async function openFriendProfile(friendId) {
    currentFriendProfileId = friendId;

    const spinner = document.getElementById('friend-profile-spinner');
    const blockedState = document.getElementById('friend-profile-blocked-state');
    const infoSection = document.getElementById('friend-profile-info-section');
    const page = document.getElementById('friend-profile-page');
    const actionsMenu = document.getElementById('friend-actions-menu');

    if (!page) return;

    if (spinner) spinner.classList.remove('hidden');
    if (blockedState) blockedState.classList.add('hidden');
    if (infoSection) infoSection.classList.add('hidden');
    if (actionsMenu) actionsMenu.classList.add('hidden');

    page.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    page.style.transition = 'none';
    page.style.transform = 'translateX(100%)';
    page.offsetHeight;
    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(0)';

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        let profile = null;
        let error = null;

        const profileRes = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url, xp, featured_badge_id, card_appearance')
            .eq('id', friendId)
            .single();

        profile = profileRes.data;
        error = profileRes.error;

        if (error && error.code === '42703') {
            console.warn("Column featured_badge_id or card_appearance doesn't exist on profiles, retrying with fallback...");
            const retryRes = await supabaseClient
                .from('profiles')
                .select('id, username, avatar_url, xp, featured_badge_id')
                .eq('id', friendId)
                .single();
            profile = retryRes.data;
            error = retryRes.error;

            if (error && error.code === '42703') {
                const finalRetry = await supabaseClient
                    .from('profiles')
                    .select('id, username, avatar_url, xp')
                    .eq('id', friendId)
                    .single();
                profile = finalRetry.data;
                error = finalRetry.error;
            }
        }

        if (error) {
            console.error("Error loading friend profile details:", error);
        }

        const { data: blockData } = await supabaseClient
            .from('user_blocks')
            .select('id')
            .eq('blocker_id', user.id)
            .eq('blocked_id', friendId)
            .maybeSingle();

        const weBlockedThem = !!blockData;

        if (error || !profile) {

            if (spinner) spinner.classList.add('hidden');
            if (blockedState) blockedState.classList.remove('hidden');
            return;
        }

        if (spinner) spinner.classList.add('hidden');
        if (infoSection) infoSection.classList.remove('hidden');

        const usernameEl = document.getElementById('friend-username');
        if (usernameEl) usernameEl.innerText = profile.username || 'Unknown';

        const avatarImg = document.getElementById('friend-avatar');
        const avatarPlaceholder = document.getElementById('friend-avatar-placeholder');

        if (avatarImg && avatarPlaceholder) {
            if (profile.avatar_url) {
                avatarImg.src = profile.avatar_url;
                avatarImg.classList.remove('hidden');
                avatarPlaceholder.classList.add('hidden');
            } else {
                avatarImg.classList.add('hidden');
                avatarPlaceholder.classList.remove('hidden');
                avatarPlaceholder.innerText = (profile.username || 'U').substring(0, 1).toUpperCase();
            }
        }

        const badgeOverlay = document.getElementById('friend-badge-overlay');
        const badgeImg = document.getElementById('friend-badge-img');
        if (badgeOverlay && badgeImg) {
            if (profile.featured_badge_id && typeof globalBadges !== 'undefined') {
                const badge = globalBadges.find(b => b.id === profile.featured_badge_id);
                if (badge) {
                    const base = typeof GITHUB_BASE !== 'undefined' ? GITHUB_BASE : '';
                    const imgUrl = badge.image_url.startsWith('http') ? badge.image_url : base + badge.image_url;
                    badgeImg.src = (window.badgeImageCache && window.badgeImageCache.get(imgUrl)) || imgUrl;
                    badgeOverlay.classList.remove('hidden');
                } else {
                    badgeOverlay.classList.add('hidden');
                }
            } else {
                badgeOverlay.classList.add('hidden');
            }
        }

        const xpVal = weBlockedThem ? 0 : (profile.xp || 0);
        const lvlVal = weBlockedThem ? 1 : (Math.floor(xpVal / 300) + 1);

        const cardLvlEl = document.getElementById('friend-card-level');
        const cardUserEl = document.getElementById('friend-card-username');
        const cardScoreEl = document.getElementById('friend-card-score');

        if (cardLvlEl) cardLvlEl.innerText = weBlockedThem ? 'LVL --' : `LVL ${lvlVal}`;
        if (cardUserEl) cardUserEl.innerHTML = `COLLECTOR, <span class="text-white font-semibold">${profile.username || 'Unknown'}</span>`;
        if (cardScoreEl) cardScoreEl.innerHTML = weBlockedThem ? `- <span class="font-medium text-[20px] text-white/50">XP</span>` : `${xpVal} <span class="font-medium text-[20px] text-white/50">XP</span>`;

        const cardContainer = document.getElementById('friend-metal-card-container');
        if (cardContainer) {
            applyCardAppearance(cardContainer, profile.card_appearance || {
                colorId: 'white',
                colorHex: '#ffffff',
                font: 'system',
                anim: 'sweep',
                saturation: '1.3',
                pattern: 'none',
                intensity: '1'
            });
        }

        const xpEl = document.getElementById('friend-stat-xp');
        if (xpEl) xpEl.innerText = weBlockedThem ? '-' : xpVal;

        let followStatus = 'none';
        if (!weBlockedThem) {
            const { data: followRel } = await supabaseClient
                .from('user_follows')
                .select('status')
                .eq('follower_id', user.id)
                .eq('following_id', friendId)
                .maybeSingle();
            followStatus = followRel ? followRel.status : 'none';
        }

        const followBtn = document.getElementById('friend-follow-btn');
        if (followBtn) {
            followBtn.setAttribute('data-status', followStatus);
            followBtn.disabled = false;
            if (weBlockedThem) {
                followBtn.innerText = t('connections.unblock');
                followBtn.className = "mt-2 px-6 py-2 rounded-xl text-[14px] font-bold transition-all shadow-md bg-[#FF3B30] text-white active:bg-[#FF3B30]/90";
                followBtn.onclick = () => { triggerHapticFeedback(); handleFriendBlockAction(); };
            } else {
                followBtn.onclick = () => { triggerHapticFeedback(); handleFriendProfileFollowToggle(); };
                if (followStatus === 'accepted') {
                    followBtn.innerText = t('connections.following_btn');
                    followBtn.className = "mt-2 px-6 py-2 rounded-xl text-[14px] font-bold transition-all shadow-md bg-[#2C2C2E] text-white active:bg-[#3A3A3C]";
                } else if (followStatus === 'pending') {
                    followBtn.innerText = t('connections.requested');
                    followBtn.className = "mt-2 px-6 py-2 rounded-xl text-[14px] font-bold transition-all shadow-md bg-[#2C2C2E] text-white active:bg-[#3A3A3C]";
                } else {
                    followBtn.innerText = t('connections.follow');
                    followBtn.className = "mt-2 px-6 py-2 rounded-xl text-[14px] font-bold transition-all shadow-md bg-white text-black active:bg-white/90";
                }
            }
        }

        const blockBtn = document.getElementById('friend-block-btn');
        if (blockBtn) {
            if (weBlockedThem) {
                blockBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>${t('connections.unblock')}</span>
                `;
                blockBtn.classList.remove('text-[#FF3B30]');
                blockBtn.classList.add('text-white');
            } else {
                blockBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>${t('connections.block')}</span>
                `;
                blockBtn.classList.remove('text-white');
                blockBtn.classList.add('text-[#FF3B30]');
            }
        }

        const cansCountEl = document.getElementById('friend-stat-cans');
        const cansGrid = document.getElementById('friend-cans-grid');

        if (weBlockedThem) {
            if (cansCountEl) cansCountEl.innerText = '-';
            if (cansGrid) {
                cansGrid.innerHTML = `
                    <div class="col-span-3 text-center text-[#8E8E93] text-[13px] py-6 px-4">
                        ${t('connections.profileUnavailableDesc')}
                    </div>
                `;
            }
        } else {

            const { data: collections } = await supabaseClient
                .from('user_collections')
                .select('snus_id, collected_at')
                .eq('user_id', friendId);

            const cansCount = collections ? collections.length : 0;
            if (cansCountEl) cansCountEl.innerText = cansCount;

            if (cansGrid) {
                if (typeof globalSnusData !== 'undefined' && globalSnusData.length > 0) {
                    const friendCollection = {};
                    if (collections) {
                        collections.forEach(col => {
                            friendCollection[col.snus_id] = true;
                        });
                    }

                    const sortedSnus = globalSnusData.slice()
                        .filter(snus => !!friendCollection[snus.id])
                        .sort((a, b) => parseInt(a.id) - parseInt(b.id));
                    const base = typeof GITHUB_BASE !== 'undefined' ? GITHUB_BASE : 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/';
                    const glowActive = localStorage.getItem('dexGlow') === 'true';

                    if (sortedSnus.length > 0) {
                        cansGrid.innerHTML = sortedSnus.map(snus => {
                            const formattedId = '#' + String(snus.id).padStart(3, '0');
                            const rarity = (snus.rarity || 'common').toLowerCase().trim();
                            const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
                            const imgUrl = snus.image ? `${base}${snus.image}` : 'placeholder.png';

                            const rarityIndicator = `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;

                            return `
                                <div onclick="triggerHapticFeedback(); openSnusDetail(${snus.id})" class="dex-anim-card cursor-pointer group h-full w-full origin-center">
                                    <div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] transition-transform duration-200 group-active:scale-95 shadow-md overflow-hidden" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}">
                                        <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                                            <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                                            ${rarityIndicator}
                                        </div>
                                        <div class="dex-image-container w-full aspect-square flex items-center justify-center relative mt-1 overflow-hidden">
                                            <img src="${imgUrl}" class="w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10 transition-opacity duration-300">
                                        </div>
                                        <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                                            <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 text-white">${snus.name}</h5>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                    } else {
                        cansGrid.innerHTML = `<div class="col-span-3 text-center text-[#8E8E93] text-[13px] py-4">No cans found.</div>`;
                    }
                }
            }
        }

    } catch (err) {
        console.error("Error opening friend profile:", err);
        if (spinner) spinner.classList.add('hidden');
        if (blockedState) blockedState.classList.remove('hidden');
    }
}

function closeFriendProfilePage() {
    const page = document.getElementById('friend-profile-page');
    if (!page) return;

    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(100%)';

    setTimeout(() => {
        page.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        page.style.transform = '';
        page.style.transition = '';
    }, 350);
}

function toggleFriendActionsMenu() {
    const menu = document.getElementById('friend-actions-menu');
    if (!menu) return;

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.offsetHeight;
        menu.classList.remove('scale-95', 'opacity-0');
        menu.classList.add('scale-100', 'opacity-100');
    } else {
        menu.classList.remove('scale-100', 'opacity-100');
        menu.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            menu.classList.add('hidden');
        }, 200);
    }
}

async function handleFriendBlockAction() {
    const friendId = currentFriendProfileId;
    if (!friendId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: blockData } = await supabaseClient
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', friendId)
        .maybeSingle();

    if (blockData) {

        const { error } = await supabaseClient
            .from('user_blocks')
            .delete()
            .eq('blocker_id', user.id)
            .eq('blocked_id', friendId);

        if (!error) {
            alert(t('connections.unblockedSuccess'));
            toggleFriendActionsMenu();
            openFriendProfile(friendId);
            loadConnectionsData();
        } else {
            alert("Error unblocking user: " + error.message);
        }
    } else {

        const confirmBlock = confirm("Are you sure you want to block this user?");
        if (!confirmBlock) return;

        const { error } = await supabaseClient
            .from('user_blocks')
            .insert([{ blocker_id: user.id, blocked_id: friendId }]);

        if (!error) {
            alert(t('connections.blockedSuccess'));
            toggleFriendActionsMenu();
            openFriendProfile(friendId);
            loadConnectionsData();
        } else {
            alert("Error blocking user: " + error.message);
        }
    }
}

async function handleFriendProfileFollowToggle() {
    const friendId = currentFriendProfileId;
    if (!friendId) return;

    const btn = document.getElementById('friend-follow-btn');
    if (!btn) return;

    const currentStatus = btn.getAttribute('data-status');
    btn.disabled = true;
    btn.innerText = "...";

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        btn.disabled = false;
        return;
    }

    if (currentStatus === 'accepted' || currentStatus === 'pending') {
        const { error } = await supabaseClient
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', friendId);

        if (!error) {
            btn.setAttribute('data-status', 'none');
            btn.className = "mt-2 px-6 py-2 rounded-xl text-[14px] font-bold transition-all shadow-md bg-white text-black active:bg-white/90";
            btn.innerText = t('connections.follow');
        } else {
            openFriendProfile(friendId);
        }
    } else {
        const { error } = await supabaseClient
            .from('user_follows')
            .insert([{
                follower_id: user.id,
                following_id: friendId,
                status: 'pending'
            }]);

        if (!error) {
            btn.setAttribute('data-status', 'pending');
            btn.className = "mt-2 px-6 py-2 rounded-xl text-[14px] font-bold transition-all shadow-md bg-[#2C2C2E] text-white active:bg-[#3A3A3C]";
            btn.innerText = t('connections.requested');
        } else {
            openFriendProfile(friendId);
        }
    }
    btn.disabled = false;
    loadConnectionsData();
}

function openBlockedUsersPage() {
    const page = document.getElementById('blocked-users-page');
    if (!page) return;

    loadBlockedUsers();

    page.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    page.style.transition = 'none';
    page.style.transform = 'translateX(100%)';
    page.offsetHeight;
    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(0)';
}

function closeBlockedUsersPage() {
    const page = document.getElementById('blocked-users-page');
    if (!page) return;

    page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    page.style.transform = 'translateX(100%)';

    setTimeout(() => {
        page.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        page.style.transform = '';
        page.style.transition = '';
    }, 350);
}

async function loadBlockedUsers() {
    const container = document.getElementById('blocked-list-container');
    if (!container) return;

    container.innerHTML = `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.loading')}</div>`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: blocks, error } = await supabaseClient
            .from('user_blocks')
            .select(`
                id, blocked_id,
                blocked:profiles!blocked_id(id, username, avatar_url)
            `)
            .eq('blocker_id', user.id);

        if (error || !blocks || blocks.length === 0) {
            container.innerHTML = `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noBlocked')}</div>`;
            return;
        }

        container.innerHTML = blocks.map(block => {
            const profile = block.blocked;
            if (!profile) return '';
            const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff`;

            return `
                <div class="flex items-center justify-between py-2.5 border-b border-white/5">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <img src="${avatar}" class="w-12 h-12 rounded-full object-cover bg-[#2C2C2E] flex-shrink-0" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=1C1C1E&color=fff'">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-white text-[15px] font-semibold tracking-tight truncate">${profile.username || 'Unknown'}</h4>
                        </div>
                    </div>
                    <button onclick="triggerHapticFeedback(); quickUnblockUser('${profile.id}')"
                            class="ml-3 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold bg-[#2C2C2E] text-white active:bg-[#3A3A3C] transition-all flex-shrink-0">
                        ${t('connections.unblock')}
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Error loading blocked users:", err);
        container.innerHTML = `<div class="py-10 text-center text-[#8E8E93] text-[14px]">${t('connections.noBlocked')}</div>`;
    }
}

async function quickUnblockUser(userId) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { error } = await supabaseClient
            .from('user_blocks')
            .delete()
            .eq('blocker_id', user.id)
            .eq('blocked_id', userId);

        if (!error) {
            alert(t('connections.unblockedSuccess'));
            loadBlockedUsers();
            loadConnectionsData();
        } else {
            alert("Error unblocking user: " + error.message);
        }
    } catch (err) {
        console.error("Error quick unblocking user:", err);
    }
}

function setupFriendProfileSwipe() {
    const page = document.getElementById('friend-profile-page');
    if (!page) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;
    let isHorizontal = null;

    page.addEventListener('touchstart', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            isDragging = false;
            return;
        }

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isDragging = true;
        isHorizontal = null;

        page.style.transition = 'none';
    }, { passive: true });

    page.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (isHorizontal === null) {
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isHorizontal = false;
                isDragging = false;
                return;
            } else {
                isHorizontal = true;
            }
        }

        if (isHorizontal && deltaX > 0) {
            if (e.cancelable) e.preventDefault();
            page.style.transform = `translateX(${deltaX}px)`;
        }
    }, { passive: false });

    page.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;

        const deltaX = currentX - startX;

        page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaX > 100) {
            closeFriendProfilePage();
        } else {
            page.style.transform = 'translateX(0px)';
            setTimeout(() => {
                page.style.transition = '';
            }, 350);
        }
    });
}

function setupBlockedUsersSwipe() {
    const page = document.getElementById('blocked-users-page');
    if (!page) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;
    let isHorizontal = null;

    page.addEventListener('touchstart', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            isDragging = false;
            return;
        }

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isDragging = true;
        isHorizontal = null;

        page.style.transition = 'none';
    }, { passive: true });

    page.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (isHorizontal === null) {
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isHorizontal = false;
                isDragging = false;
                return;
            } else {
                isHorizontal = true;
            }
        }

        if (isHorizontal && deltaX > 0) {
            if (e.cancelable) e.preventDefault();
            page.style.transform = `translateX(${deltaX}px)`;
        }
    }, { passive: false });

    page.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;

        const deltaX = currentX - startX;

        page.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

        if (deltaX > 100) {
            closeBlockedUsersPage();
        } else {
            page.style.transform = 'translateX(0px)';
            setTimeout(() => {
                page.style.transition = '';
            }, 350);
        }
    });
}
