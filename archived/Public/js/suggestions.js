function renderSuggestions() {
    const container = document.getElementById('suggestions-container');
    if (!container || globalSnusData.length === 0) return;

    const uncollected = globalSnusData.filter(snus => !globalUserCollection[snus.id]);

    if (uncollected.length === 0) {
        container.innerHTML = '<p class="text-[13px] text-[#8E8E93] text-center w-full">Du hast bereits alle Snus im Dex gesammelt!</p>';
        return;
    }

    const shuffled = uncollected.sort(() => 0.5 - Math.random());
    const suggestions = shuffled.slice(0, 9);

    const glowActive = localStorage.getItem('dexGlow') === 'true';

    container.innerHTML = suggestions.map(snus => {
        const formattedId = '#' + String(snus.id).padStart(3, '0');
        const rarity = (snus.rarity || 'common').toLowerCase().trim();
        const boxShadow = glowActive ? `box-shadow: 0 0px 20px -8px var(--${rarity}, var(--common));` : '';
        const rarityIndicator = `<div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: var(--${rarity}, var(--common)); box-shadow: 0 0 6px var(--${rarity}, var(--common));"></div>`;

        return `
            <div onclick="openSnusDetail(${snus.id})" class="suggestion-card cursor-pointer group flex-shrink-0 w-[28vw] snap-center transition-transform duration-200 ease-out origin-center" style="touch-action: pan-x;">
                <div class="relative flex flex-col h-full bg-[#2A2A2E] rounded-[20px] shadow-md overflow-hidden" style="border: 1px solid rgba(255,255,255,0.05); ${boxShadow}">
                    <div class="flex justify-between items-center w-full px-2.5 pt-2.5 z-10">
                        <span class="text-[10px] font-medium text-[#8E8E93] tracking-wide">${formattedId}</span>
                        ${rarityIndicator}
                    </div>
                    <div class="w-full aspect-square flex items-center justify-center relative mt-1 overflow-hidden">
                        <div class="sk absolute inset-0 opacity-10"></div>
                        <img src="${GITHUB_BASE}${snus.image}" class="w-full h-full object-contain scale-[1.1] drop-shadow-xl z-10 relative" loading="lazy" onerror="this.src='https://via.placeholder.com/150/000000/FFFFFF?text=?'">
                    </div>
                    <div class="px-2 pt-1 pb-3 text-center flex-1 flex items-center justify-center z-10">
                        <h5 class="text-[12px] font-semibold leading-tight line-clamp-2 text-white">${snus.name}</h5>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    setTimeout(initSuggestionsScrollAnimation, 50);
}

function initSuggestionsScrollAnimation() {
    const container = document.getElementById('suggestions-container');
    if (!container) return;

    const cards = container.querySelectorAll('.suggestion-card');

    const updateScale = () => {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        const focusZoneHalfWidth = containerRect.width * 0.35;

        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;

            const distanceToCenter = Math.abs(containerCenter - cardCenter);

            let scale = 1.0;
            let opacity = 1.0;

            if (distanceToCenter > focusZoneHalfWidth) {
                const distancePastZone = distanceToCenter - focusZoneHalfWidth;

                let progress = distancePastZone / (containerRect.width * 0.15);
                if (progress > 1) progress = 1;

                scale = 1.0 - (0.15 * progress);
                opacity = 1.0 - (0.6 * progress);
            }

            card.style.transform = `scale(${scale})`;
            card.style.opacity = opacity;
        });
    };

    updateScale();

    container.addEventListener('scroll', () => {
        requestAnimationFrame(updateScale);
    }, {
        passive: true
    });
}
