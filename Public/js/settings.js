function toggleSetting(element) {
    const isActive = element.classList.contains('bg-white');
    if (isActive) {
        element.classList.remove('bg-white');
        element.classList.add('bg-[#3A3A3C]');
        element.children[0].classList.remove('translate-x-5');
        element.children[0].classList.remove('bg-black');
        element.children[0].classList.add('bg-white');
    } else {
        element.classList.remove('bg-[#3A3A3C]');
        element.classList.add('bg-white');
        element.children[0].classList.add('translate-x-5');
        element.children[0].classList.remove('bg-white');
        element.children[0].classList.add('bg-black');
    }
}

function toggleGridColumns(element) {
    toggleSetting(element);
    const is2Cols = element.classList.contains('bg-white');
    const grid = document.getElementById('dex-grid');
    if (grid) {
        if (is2Cols) {
            grid.classList.remove('grid-cols-3');
            grid.classList.add('grid-cols-2');
            localStorage.setItem('dexColumns', '2');
        } else {
            grid.classList.remove('grid-cols-2');
            grid.classList.add('grid-cols-3');
            localStorage.setItem('dexColumns', '3');
        }
        if (globalSnusData.length > 0) filterDex();
    }
}

function toggleGridGlow(element) {
    toggleSetting(element);
    const isActive = element.classList.contains('bg-white');
    localStorage.setItem('dexGlow', isActive ? 'true' : 'false');
    if (globalSnusData.length > 0) filterDex();
}

function toggleDefaultSort(element) {
    toggleSetting(element);
    const isActive = element.classList.contains('bg-white'); // true = Nach Marke, false = Nach ID
    localStorage.setItem('dexDefaultSort', isActive ? 'alpha' : 'id');
}

function toggleTrackingMode(element) {
    toggleSetting(element);
    const isActive = element.classList.contains('bg-white');
    localStorage.setItem('snusTrackingMode', isActive ? 'individual' : 'full');
    const preview = document.getElementById('tracking-mode-preview');
    if (preview) preview.innerText = isActive ? 'Individual' : 'Full Tracking';
    renderActiveCansUI();
}

function openSettingsSubpage(type) {
    const subpage = document.getElementById('settings-subpage');
    const titleObj = document.getElementById('subpage-title');
    const contentObj = document.getElementById('subpage-content');

    titleObj.innerText = type;
    let html = '';

    if (type === 'Edit Profile') {
        const cache = window._profileCache;

        // Use cached username as placeholder, cached email as value – both instant
        const cachedRemaining = cache?.remaining ?? window._cachedUsernameChangesRemaining ?? null;
        const cachedEmail = cache?.email || '';
        // Always read the username directly from the profile card in the DOM – it's always correct
        const liveUsername = document.getElementById('profile-email')?.innerText?.trim() || '';
        const cachedUsername = liveUsername || cache?.username || '';

        // Default avatar: Merz photo
        const defaultAvatarSvg = `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <rect width="96" height="96" fill="#3A3A3C"/>
            <circle cx="48" cy="38" r="16" fill="#636366"/>
            <path d="M16 80c0-17.673 14.327-32 32-32s32 14.327 32 32" fill="#636366"/>
        </svg>`;

        // Changes badge: shows "X/3" format – grey=3, orange=1, red=0
        const changesLabel = cachedRemaining === null
            ? ''
            : cachedRemaining === 0
                ? `<span class="text-[11px] text-[#FF3B30] font-semibold">0/3</span>`
                : cachedRemaining === 1
                    ? `<span class="text-[11px] text-[#FF9500] font-medium">1/3</span>`
                    : `<span class="text-[11px] text-[#8E8E93] font-medium">${cachedRemaining}/3</span>`;

        html = `
            <div class="flex flex-col items-center mb-6 mt-2">
                <div class="relative">
                    <input type="file" id="profile-image-upload" accept="image/*" class="hidden" onchange="previewProfileImage(event)">
                    <div class="w-24 h-24 rounded-full flex-shrink-0 shadow-lg border-2 border-white/5 overflow-hidden bg-[#3A3A3C]">
                        <img id="edit-profile-image-preview" src="merz.jpg" alt="Profile photo" class="w-full h-full object-cover">
                        <div id="edit-profile-avatar-placeholder" class="w-full h-full hidden">${defaultAvatarSvg}</div>
                    </div>
                    <button onclick="triggerHapticFeedback(); document.getElementById('profile-image-upload').click()" class="absolute bottom-0 right-0 w-8 h-8 bg-[#1C1C1E] border border-white/20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10">
                        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
            </div>

            <div class="w-full mb-4">
                <p class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium mb-3 px-1">Featured Badge</p>
                <div id="badge-selector-scroll" class="flex gap-3 overflow-x-auto pb-1 px-1" style="scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;">
                    <div onclick="triggerHapticFeedback();selectFeaturedBadge(null,this)" data-badge-id="none"
                        class="badge-sel-item flex-shrink-0 flex flex-col items-center gap-2">
                        <div class="sel-ring w-14 h-14 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-[#1C1C1E] transition-all duration-200">
                            <svg class="w-5 h-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </div>
                        <span class="text-[11px] text-[#8E8E93]">Keins</span>
                    </div>
                </div>
            </div>

            <div class="bg-[#1C1C1E] rounded-[24px] border border-white/10 shadow-sm w-full overflow-hidden mb-4">
                <!-- Username -->
                <div class="px-5 pt-4 pb-3">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium">Username</label>
                        <span id="username-changes-left">${changesLabel}</span>
                    </div>
                    <input type="text" id="edit-username" value=""
                        class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all placeholder:text-[#8E8E93]/60"
                        placeholder="${cachedUsername || 'Username'}"
                        oninput="this.value=this.value.replace(/[^a-zA-Z0-9_]/g,'')">
                    <p id="edit-username-error" class="hidden text-[#FF3B30] text-[13px] mt-2"></p>
                    <p class="text-[11px] text-[#8E8E93] mt-2">3 changes per month</p>
                </div>

                <!-- Email -->
                <div class="px-5 py-4">
                    <label class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium block mb-2">Email</label>
                    <input type="email" id="edit-email" value="${cachedEmail}" disabled class="w-full bg-black/50 text-[#8E8E93] border border-white/5 rounded-[14px] px-4 py-3.5 text-[17px] outline-none cursor-not-allowed">
                </div>

                <!-- Save Changes inside the card -->
                <div class="px-5 pb-4">
                    <button id="save-profile-btn" onclick="triggerHapticFeedback(); handleProfileSave(this)" class="w-full bg-white text-black font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-all duration-300 shadow-[0_4px_14px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2">
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        `;

        // Always fetch fresh from server to ensure username + changes badge are up-to-date
        setTimeout(async () => {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return;

                const emailInput = document.getElementById('edit-email');
                if (emailInput) emailInput.value = user.email;

                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('username, username_changes, username_last_reset')
                    .eq('id', user.id).single();

                // Use user_metadata.username – same source as setupProfile – always correct
                const correctUsername = user.user_metadata?.username || profile?.username || '';

                const usernameInput = document.getElementById('edit-username');
                if (usernameInput && correctUsername) usernameInput.placeholder = correctUsername;

                const now = new Date();
                const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
                const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
                const changesThisMonth = sameMonth ? (profile?.username_changes || 0) : 0;
                const remaining = Math.max(0, 3 - changesThisMonth);

                window._cachedUsernameChangesRemaining = remaining;
                window._profileCache = { email: user.email, username: correctUsername, remaining };

                const changesLeftEl = document.getElementById('username-changes-left');
                if (changesLeftEl) {
                    changesLeftEl.innerHTML = remaining === 0
                        ? `<span class="text-[11px] text-[#FF3B30] font-semibold">0/3</span>`
                        : remaining === 1
                            ? `<span class="text-[11px] text-[#FF9500] font-medium">1/3</span>`
                            : `<span class="text-[11px] text-[#8E8E93] font-medium">${remaining}/3</span>`;
                }
            } catch (e) { /* ignore */ }
        }, 100);
    } else if (type === 'Stats') {
        const brandStats = getBrandStats();

        let gridHTML = '<div class="grid grid-cols-2 gap-4 pb-6">';

        brandStats.forEach(stat => {
            const percentage = stat.total > 0 ? (stat.unlocked / stat.total) : 0;
            const radius = 32;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (percentage * circumference);

            let favoriteBrands = [];
            try { favoriteBrands = JSON.parse(localStorage.getItem('dexFavoriteBrands') || '[]'); } catch (e) { }
            const isFav = favoriteBrands.includes(stat.name);
            const safeBrandName = stat.name.replace(/'/g, "\\'");

            const starIcon = isFav
                ? `<svg class="w-4 h-4 text-yellow-500 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
                : `<svg class="w-4 h-4 text-[#8E8E93]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`;

            const strokeColor = `var(--${stat.dominantRarity}, var(--common))`;

            gridHTML += `
                <div class="bg-[#1C1C1E] rounded-[24px] p-4 border border-white/10 flex flex-col items-center text-center shadow-sm relative">
                    <!-- Name & Star Header -->
                    <div class="flex items-center justify-between w-full mb-4 px-1 gap-2">
                        <h3 class="text-[15px] font-bold text-white tracking-tight leading-tight line-clamp-1 text-left flex-1">
                            ${stat.name}
                        </h3>
                        <button onclick="handleStatsFavoriteClick('${safeBrandName}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-[#8E8E93] transition-all duration-200 active:scale-90 shadow-sm flex-shrink-0">
                            ${starIcon}
                        </button>
                    </div>

                    <!-- Circular Chart -->
                    <div class="relative w-[80px] h-[80px] mb-3 flex items-center justify-center">
                        <svg class="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="${radius}" stroke="${strokeColor}" opacity="0.15" stroke-width="6" fill="none" />
                            <circle cx="40" cy="40" r="${radius}" stroke="${strokeColor}" stroke-width="6" fill="none"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${offset}"
                                stroke-linecap="round"
                                class="transition-all duration-1000 ease-out" />
                        </svg>
                        <div class="flex flex-col items-center justify-center absolute">
                            <span class="text-[14px] font-bold text-white">
                                ${Math.round(percentage * 100)}%
                            </span>
                        </div>
                    </div>

                    <!-- Footer Info -->
                    <div class="w-full bg-white/5 rounded-xl py-1.5 px-3 flex justify-between items-center mt-auto">
                        <span class="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">Collected</span>
                        <span class="text-[13px] font-semibold text-white">
                            ${stat.unlocked} <span class="text-[#8E8E93] font-normal">/ ${stat.total}</span>
                        </span>
                    </div>
                </div>
            `;
        });

        gridHTML += '</div>';

        html = `
            <p class="text-[#8E8E93] text-[15px] mb-6 leading-relaxed">
                Verfolge deinen Sammler-Fortschritt sortiert nach Snus-Marken.
            </p>
            ${gridHTML}
        `;
    } else if (type === 'Notifications') {
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Push Notifications</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">New Snus Drops (Dex)</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Email Summaries</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Privacy & Security') {
        html = `
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">Profile Visibility</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 mb-8">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Private Profile</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">Data</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">Share Analytics</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Tracking') {
        const trackingMode = localStorage.getItem('snusTrackingMode') || 'full';
        const isIndividual = trackingMode === 'individual';
        const trackToggleBg = isIndividual ? 'bg-white' : 'bg-[#3A3A3C]';
        const trackHandleTransform = isIndividual ? 'translate-x-5' : '';
        const trackHandleBg = isIndividual ? 'bg-black' : 'bg-white';

        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">Individual Pouch Tracking</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">Tracke jeden einzelnen Pouch anstatt nur die ganze Dose am Ende.</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleTrackingMode(this)" class="w-12 h-7 ${trackToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${trackHandleBg} rounded-full transition-transform duration-300 ${trackHandleTransform} shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Language') {
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div onclick="triggerHapticFeedback()" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">English</span>
                    <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div onclick="triggerHapticFeedback()" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">Deutsch</span>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div onclick="triggerHapticFeedback()" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">Svenska</span>
                </div>
            </div>
        `;
    } else if (type === 'Darstellung') {
        const cols = localStorage.getItem('dexColumns') || '3';
        const is2Cols = cols === '2';

        const toggleBg = is2Cols ? 'bg-white' : 'bg-[#3A3A3C]';
        const handleTransform = is2Cols ? 'translate-x-5' : '';
        const handleBg = is2Cols ? 'bg-black' : 'bg-white';

        const glow = localStorage.getItem('dexGlow') === 'true';
        const glowToggleBg = glow ? 'bg-white' : 'bg-[#3A3A3C]';
        const glowHandleTransform = glow ? 'translate-x-5' : '';
        const glowHandleBg = glow ? 'bg-black' : 'bg-white';

        // NEU: Status für Standard-Sortierung auslesen
        const defaultSort = localStorage.getItem('dexDefaultSort') || 'id';
        const isAlphaDefault = defaultSort === 'alpha';
        const sortToggleBg = isAlphaDefault ? 'bg-white' : 'bg-[#3A3A3C]';
        const sortHandleTransform = isAlphaDefault ? 'translate-x-5' : '';
        const sortHandleBg = isAlphaDefault ? 'bg-black' : 'bg-white';

        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex flex-col p-5">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex flex-col pr-4">
                            <span class="text-white text-[17px]">Standard-Sortierung: Marke</span>
                            <span class="text-[#8E8E93] text-[13px] mt-0.5">Startet den Dex nach Marke statt ID sortiert.</span>
                        </div>
                        <div onclick="triggerHapticFeedback(); toggleDefaultSort(this)" class="w-12 h-7 ${sortToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${sortHandleBg} rounded-full transition-transform duration-300 ${sortHandleTransform} shadow-sm"></div></div>
                    </div>
                    <p class="text-[12px] text-[#FF3B30] font-semibold leading-tight">⚠️ Vorsicht beim Aktivieren: Dieses Feature verursacht Lags und könnte zu Abstürzen führen. Bitte nur auf eigenes Risiko verwenden.</p>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>

                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">Große Kacheln</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">Zeigt 2 statt 3 Spalten im Dex an</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleGridColumns(this)" class="w-12 h-7 ${toggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${handleBg} rounded-full transition-transform duration-300 ${handleTransform} shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">Kachel Glow</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">Farbiger Hintergrund-Glow der Seltenheit</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleGridGlow(this)" class="w-12 h-7 ${glowToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${glowHandleBg} rounded-full transition-transform duration-300 ${glowHandleTransform} shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Help Center & FAQ') {
        html = `
            <div class="space-y-4">
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">How does the Dex work?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">Every time you scan a new can, it gets added to your permanent Snusdex collection. You earn XP for rarities.</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">Can I manually add a Snus?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">Currently, scanning the barcode is required to verify the product and maintain the integrity of the Dex.</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">How do I level up?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">Your Collector Level increases as you gain XP. Rarer Snus (like Epic or Mythic) yield significantly more XP than Common ones.</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">How is my usage calculated?</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">When you mark a can as 'Active' and later 'Empty', we calculate your daily average pouches and nicotine intake based on the time it took to finish it.</p>
                </div>

                <div class="mt-10 flex justify-center pb-8">
                    <button onclick="triggerHapticFeedback()" class="text-[#8E8E93] hover:text-white text-[14px] font-medium underline decoration-white/30 underline-offset-4 active:opacity-50 transition-all">
                        Contact Support
                    </button>
                </div>
            </div>
        `;
    } else if (type === 'Delete Account') {
        html = `
            <div class="text-center mt-6 mb-8">
                <div class="w-16 h-16 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <h2 class="text-white text-[22px] font-bold tracking-tight mb-2">Delete Account?</h2>
                <p class="text-[#8E8E93] text-[15px] px-4 leading-relaxed">This action is permanent and cannot be undone. All your Dex collections and stats will be lost forever.</p>
            </div>
            <button onclick="triggerHapticFeedback()" class="w-full bg-[#FF3B30] text-white font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-transform mb-3 shadow-[0_4px_14px_rgba(255,59,48,0.2)]">
                Yes, delete my account
            </button>
            <button onclick="triggerHapticFeedback(); closeSettingsSubpage()" class="w-full bg-[#1C1C1E] border border-white/10 text-white font-medium text-[17px] py-4 rounded-[14px] active:bg-white/5 transition-colors">
                Cancel
            </button>
        `;
    }

    contentObj.innerHTML = html;

    if (type === 'Edit Profile') {
        renderBadgeSelectorItems();
    }

    subpage.classList.remove('hidden');

    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
        subpage.classList.remove('translate-x-full');
        subpage.classList.add('translate-x-0');
    }, 10);
}

function closeSettingsSubpage() {
    const subpage = document.getElementById('settings-subpage');
    if (!subpage) return;

    subpage.style.transform = '';
    subpage.style.transition = '';

    subpage.classList.remove('translate-x-0');
    subpage.classList.add('translate-x-full');

    setTimeout(() => {
        subpage.classList.add('hidden');

        document.body.classList.remove('overflow-hidden');
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    const settingsSubpage = document.getElementById('settings-subpage');
    if (!settingsSubpage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    settingsSubpage.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, {
        passive: true
    });

    settingsSubpage.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY) return;

        let touchCurrentX = e.touches[0].clientX;
        let touchCurrentY = e.touches[0].clientY;

        let diffX = touchCurrentX - touchStartX;
        let diffY = Math.abs(touchCurrentY - touchStartY);

        if (diffY > Math.abs(diffX)) {
            return;
        }

        if (diffX > 0) {
            isSwiping = true;
            settingsSubpage.style.transition = 'none';
            settingsSubpage.style.transform = `translateX(${diffX}px)`;
        }
    }, {
        passive: true
    });

    settingsSubpage.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        let touchEndX = e.changedTouches[0].clientX;
        let diffX = touchEndX - touchStartX;

        settingsSubpage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

        if (diffX > window.innerWidth / 3 || diffX > 100) {
            closeSettingsSubpage();
        } else {
            settingsSubpage.style.transform = 'translateX(0)';
        }

        setTimeout(() => {
            settingsSubpage.style.transform = '';
            settingsSubpage.style.transition = '';
        }, 300);

        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;
    });
});

// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const splashVideo = document.getElementById('splash-video');
    const splashSound = document.getElementById('splash-sound');

    function removeSplashScreen() {
        if (!splashScreen.classList.contains('opacity-0')) {
            splashScreen.classList.remove('opacity-100');
            splashScreen.classList.add('opacity-0');

            if (splashSound) {
                const fadeAudio = setInterval(() => {
                    if (splashSound.volume > 0.1) {
                        splashSound.volume -= 0.1;
                    } else {
                        splashSound.pause();
                        splashSound.currentTime = 0;
                        clearInterval(fadeAudio);
                    }
                }, 50);
            }

            setTimeout(() => {
                splashScreen.classList.add('hidden');
            }, 500);
        }
    }

    /**
     * Prüft ob gerade externe Musik läuft.
     * Methode: AudioContext kurz öffnen und einen winzigen PCM-Buffer analysieren.
     * Auf iOS/WebKit gibt die AudioContext-State Auskunft über Audio-Aktivität.
     * Falls Musik läuft → Jingle überspringen.
     */
    async function isMusicPlaying() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Wenn iOS die Session bereits aktiv hat (Musik spielt),
            // ist der ctx.state direkt 'running' und wir können einen kurzen
            // AnalyserNode nutzen, um nach echten Samples zu suchen.
            await ctx.resume();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const data = new Uint8Array(analyser.frequencyBinCount);
            // Kurz warten damit der Analyser befüllt wird
            await new Promise(resolve => setTimeout(resolve, 100));
            analyser.getByteFrequencyData(data);
            const sum = data.reduce((a, b) => a + b, 0);
            await ctx.close();
            return sum > 0;
        } catch (e) {
            // Kein AudioContext verfügbar → sicherheitshalber abspielen
            return false;
        }
    }

    if (splashScreen && splashVideo) {
        splashVideo.play().then(async () => {
            if (splashSound) {
                const musicActive = await isMusicPlaying();
                if (!musicActive) {
                    splashSound.play().catch(e => console.log("Audio-Autoplay blockiert"));
                } else {
                    console.log("Musik läuft – Jingle übersprungen.");
                }
            }
        }).catch(e => console.log("Video-Autoplay blockiert:", e));

        splashVideo.addEventListener('ended', removeSplashScreen);
        setTimeout(removeSplashScreen, 2500);
    }
});
