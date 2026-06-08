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

function toggleHapticGlobal(element) {
    toggleSetting(element);
    const isOn = element.classList.contains('bg-white');
    localStorage.setItem('hapticGlobal', isOn ? 'on' : 'off');
    // direkt am element arbeiten statt ganzen subpage neu rendern — so läuft die transition
    const dexToggle = document.getElementById('haptic-dex-toggle');
    if (dexToggle) {
        dexToggle.classList.toggle('opacity-40', !isOn);
        dexToggle.classList.toggle('pointer-events-none', !isOn);
    }
}

function toggleHapticDex(element) {
    toggleSetting(element);
    const isOn = element.classList.contains('bg-white');
    localStorage.setItem('hapticDex', isOn ? 'on' : 'off');
}

async function exportUserData() {
    const btn = document.getElementById('export-data-btn');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> <span>${t('privacy.exportLoading')}</span>`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('not logged in');

        const [profileRes, collectionRes, usageRes, followsRes] = await Promise.all([
            supabaseClient.from('profiles').select('*').eq('id', user.id).single(),
            supabaseClient.from('user_collections').select('*').eq('user_id', user.id),
            supabaseClient.from('usage_logs').select('*').eq('user_id', user.id),
            supabaseClient.from('user_follows').select('*').eq('follower_id', user.id),
        ]);

        const payload = {
            exported_at: new Date().toISOString(),
            profile: profileRes.data || {},
            collection: collectionRes.data || [],
            usage_logs: usageRes.data || [],
            following: followsRes.data || [],
        };

        const filename = `snusdex-data-${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const file = new File([blob], filename, { type: 'application/json' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Snusdex Daten' });
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        btn.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> <span>${t('privacy.exportDone')}</span>`;
        btn.classList.replace('bg-white', 'bg-[#34C759]');
        btn.classList.replace('text-black', 'text-white');

        setTimeout(() => {
            btn.disabled = false;
            btn.classList.replace('bg-[#34C759]', 'bg-white');
            btn.classList.replace('text-white', 'text-black');
            btn.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> <span>${t('privacy.exportBtn')}</span>`;
        }, 3000);

    } catch (err) {
        console.warn('Export failed:', err.message);
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> <span>${t('privacy.exportBtn')}</span>`;
    }
}

function toggleTrackingMode(element) {
    toggleSetting(element);
    const isActive = element.classList.contains('bg-white');
    localStorage.setItem('snusTrackingMode', isActive ? 'individual' : 'full');
    const preview = document.getElementById('tracking-mode-preview');
    if (preview) {
        const key = isActive ? 'tracking.modeIndividual' : 'tracking.modeFull';
        preview.setAttribute('data-i18n', key);
        preview.innerText = t(key);
    }
    renderActiveCansUI();
}

const _CARD_FONT_MAP = {
    system:      '-apple-system, sans-serif',
    rounded:     'ui-rounded, -apple-system, sans-serif',
    futura:      'Futura, -apple-system, sans-serif',
    serif:       'Georgia, serif',
    baskerville: 'Baskerville, serif',
    display:     'Didot, serif',
    copperplate: 'Copperplate, serif',
    mono:        'Menlo, monospace',
};

async function syncCardAppearanceToCloud() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const appearance = getLocalCardAppearance();

        const { error } = await supabaseClient
            .from('profiles')
            .update({ card_appearance: appearance })
            .eq('id', user.id);

        if (error) {
            console.error("Error syncing card appearance to cloud:", error);
        }
    } catch (e) {
        console.error("Failed to sync card appearance:", e);
    }
}

function _applyCardBorderColor(colorHex) {
    const hex = (colorHex.match(/#([0-9a-fA-F]{6})/) || [])[1];
    if (hex) {
        const r = parseInt(hex.slice(0,2), 16);
        const g = parseInt(hex.slice(2,4), 16);
        const b = parseInt(hex.slice(4,6), 16);
        const container = document.getElementById('metal-card-container');
        if (container) {
            container.style.setProperty('--card-border-color', `rgba(${r},${g},${b},0.45)`);
            container.style.setProperty('--card-outer-glow', `rgba(${r},${g},${b},0.25)`);
        }
    } else {
        const container = document.getElementById('metal-card-container');
        if (container) {
            container.style.setProperty('--card-border-color', 'rgba(255,255,255,0.15)');
            container.style.setProperty('--card-outer-glow', 'rgba(255,255,255,0.08)');
        }
    }
}

function setMetalCardColor(colorId, colorHex) {
    localStorage.setItem('metalCardColorId', colorId);
    localStorage.setItem('metalCardColorHex', colorHex);
    applyCardAppearance('metal-card-container', getLocalCardAppearance());
    applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
    _refreshAppearanceButtonStates();
    syncCardAppearanceToCloud();
}

function setMetalCardFont(fontId) {
    localStorage.setItem('metalCardFont', fontId);
    applyCardAppearance('metal-card-container', getLocalCardAppearance());
    applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
    _refreshAppearanceButtonStates();
    syncCardAppearanceToCloud();
}

function setMetalCardAnim(type) {
    localStorage.setItem('metalCardAnim', type);
    if (type === 'gol' || type === 'firework' || type === 'mountains' || type === 'wave') {
        localStorage.setItem('metalCardPattern', 'cubes');
    }
    applyCardAppearance('metal-card-container', getLocalCardAppearance());
    applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
    _refreshAppearanceButtonStates();
    syncCardAppearanceToCloud();
}

function setMetalCardSaturation(val) {
    localStorage.setItem('metalCardSaturation', val);
    applyCardAppearance('metal-card-container', getLocalCardAppearance());
    applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
    const el = document.getElementById('saturation-val');
    if (el) el.innerText = parseFloat(val).toFixed(1) + 'x';
}

function setMetalCardPattern(id) {
    localStorage.setItem('metalCardPattern', id);
    const currentAnim = localStorage.getItem('metalCardAnim') || 'sweep';
    if ((currentAnim === 'gol' || currentAnim === 'firework' || currentAnim === 'mountains' || currentAnim === 'wave') && id !== 'cubes') {
        localStorage.setItem('metalCardAnim', 'none');
    }
    applyCardAppearance('metal-card-container', getLocalCardAppearance());
    applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
    _refreshAppearanceButtonStates();
    syncCardAppearanceToCloud();
}

// Refreshes button active states and pattern classes in the Darstellung subpage
// without re-rendering the whole page (which would push history and reset canvas)
function _refreshAppearanceButtonStates() {
    if (window._currentSubpageType !== 'Darstellung') return;

    const app = getLocalCardAppearance();

    // Update animation buttons
    document.querySelectorAll('[onclick*="setMetalCardAnim"]').forEach(btn => {
        const match = btn.getAttribute('onclick').match(/setMetalCardAnim\('([^']+)'\)/);
        if (!match) return;
        const id = match[1];
        if (id === app.anim) {
            btn.classList.add('bg-white', 'text-black');
            btn.classList.remove('bg-white/10', 'text-white/70');
        } else {
            btn.classList.remove('bg-white', 'text-black');
            btn.classList.add('bg-white/10', 'text-white/70');
        }
    });

    // Update pattern buttons
    document.querySelectorAll('[onclick*="setMetalCardPattern"]').forEach(btn => {
        const match = btn.getAttribute('onclick').match(/setMetalCardPattern\('([^']+)'\)/);
        if (!match) return;
        const id = match[1];
        if (id === app.pattern) {
            btn.classList.add('bg-white', 'text-black');
            btn.classList.remove('bg-white/10', 'text-white/70');
        } else {
            btn.classList.remove('bg-white', 'text-black');
            btn.classList.add('bg-white/10', 'text-white/70');
        }
    });

    // Update font buttons
    document.querySelectorAll('[onclick*="setMetalCardFont"]').forEach(btn => {
        const match = btn.getAttribute('onclick').match(/setMetalCardFont\('([^']+)'\)/);
        if (!match) return;
        const id = match[1];
        if (id === app.font) {
            btn.classList.add('bg-white', 'text-black', 'font-semibold');
            btn.classList.remove('bg-white/10', 'text-white/70');
        } else {
            btn.classList.remove('bg-white', 'text-black', 'font-semibold');
            btn.classList.add('bg-white/10', 'text-white/70');
        }
    });

    // Update color ring highlights
    document.querySelectorAll('[onclick*="setMetalCardColor"]').forEach(btn => {
        const match = btn.getAttribute('onclick').match(/setMetalCardColor\('([^']+)'/);
        if (!match) return;
        const id = match[1];
        const ring = btn.querySelector('div');
        if (ring) {
            ring.classList.toggle('border-white', id === app.colorId);
            ring.classList.toggle('border-transparent', id !== app.colorId);
        }
    });
}

function setMetalCardIntensity(val) {
    localStorage.setItem('metalCardIntensity', val);
    applyCardAppearance('metal-card-container', getLocalCardAppearance());
    applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
    const valEl = document.getElementById('glow-intensity-val');
    if (valEl) valEl.innerText = parseFloat(val).toFixed(1) + 'x';
}

function toggleCardPin() {
    const wrapper = document.getElementById('preview-card-wrapper');
    if (!wrapper) return;
    wrapper.dataset.pinned = wrapper.dataset.pinned === '1' ? '0' : '1';
}

// ── GitHub subpage helpers ─────────────────────────────────────────────────

function _ghRelTime(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    return d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'just now';
}

function _ghMarkdown(md) {
    let h = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    h = h.replace(/```[\w]*\n([\s\S]*?)```/g, (_,c) =>
        `<pre style="background:#1C1C1E;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;overflow-x:auto;font-family:Menlo,monospace;font-size:12px;color:#e2e2e2;margin:8px 0;white-space:pre-wrap">${c.trim()}</pre>`);
    h = h.replace(/^### (.+)$/gm, '<h3 style="color:#fff;font-size:15px;font-weight:700;margin:14px 0 4px">$1</h3>');
    h = h.replace(/^## (.+)$/gm,  '<h2 style="color:#fff;font-size:18px;font-weight:700;margin:18px 0 6px">$1</h2>');
    h = h.replace(/^# (.+)$/gm,   '<h1 style="color:#fff;font-size:21px;font-weight:800;margin:0 0 8px">$1</h1>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em style="color:#ddd">$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff">$1</strong>');
    h = h.replace(/\*(.+?)\*/g,    '<em style="color:#ccc">$1</em>');
    h = h.replace(/`([^`\n]+)`/g,  '<code style="background:#2a2a35;color:#e2e2e2;padding:1px 6px;border-radius:4px;font-family:Menlo,monospace;font-size:12px">$1</code>');
    h = h.replace(/^[\-\*\+] (.+)$/gm, '<li style="color:#8E8E93;font-size:15px;line-height:1.5;margin:2px 0;margin-left:16px;list-style-type:disc">$1</li>');
    h = h.replace(/^\d+\. (.+)$/gm,    '<li style="color:#8E8E93;font-size:15px;line-height:1.5;margin:2px 0;margin-left:16px;list-style-type:decimal">$1</li>');
    h = h.replace(/^---+$/gm,      '<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:14px 0">');
    h = h.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    h = h.replace(/\[([^\]]+)\]\([^)]+\)/g, '<span style="color:#0A84FF">$1</span>');
    h = h.replace(/\n\n/g, '</p><p style="color:#8E8E93;font-size:15px;line-height:1.6;margin:8px 0">');
    h = h.replace(/\n/g, '<br>');
    return `<p style="color:#8E8E93;font-size:15px;line-height:1.6;margin:0 0 8px">${h}</p>`;
}

// ─────────────────────────────────────────────────────────────────────────────

function openSettingsSubpage(type, _pushHistory) {
    // Destroy previous preview canvas if any to prevent memory leaks
    const previewContainer = document.getElementById('preview-metal-card-container');
    if (previewContainer && typeof CardCanvasRenderer !== 'undefined') {
        CardCanvasRenderer.destroy(previewContainer);
    }

    if (_pushHistory !== false) {
        if (!window._subpageHistory) window._subpageHistory = [];
        if (window._currentSubpageType) window._subpageHistory.push(window._currentSubpageType);
    }
    const subpage = document.getElementById('settings-subpage');
    const titleObj = document.getElementById('subpage-title');
    const contentObj = document.getElementById('subpage-content');
    contentObj.className = 'flex-1 overflow-y-auto px-5 py-6 pb-24';

    const _subpageTitleMap = {
        'Edit Profile': 'settings.editProfile', 'Stats': 'settings.stats',
        'Notifications': 'settings.notifications', 'Privacy & Security': 'settings.privacy',
        'Language': 'settings.language', 'Darstellung': 'settings.appearance',
        'Theme': 'settings.theme',
        'Tracking': 'settings.tracking', 'Help Center & FAQ': 'settings.helpCenter',
        'Delete Account': 'settings.deleteAccount',
        'README': 'README', 'Architecture Map': 'Architecture Map',
    };
    titleObj.innerText = t(_subpageTitleMap[type] || type);
    window._currentSubpageType = type;
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
                <p class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium mb-3 px-1">${t('editProfile.featuredBadge')}</p>
                <div id="badge-selector-scroll" class="flex gap-3 overflow-x-auto pb-1 px-1" style="scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;">
                    <div onclick="triggerHapticFeedback();selectFeaturedBadge(null,this)" data-badge-id="none"
                        class="badge-sel-item flex-shrink-0 flex flex-col items-center gap-2">
                        <div class="sel-ring w-14 h-14 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-[#1C1C1E] transition-all duration-200">
                            <svg class="w-5 h-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </div>
                        <span class="text-[11px] text-[#8E8E93]">${t('editProfile.none')}</span>
                    </div>
                </div>
            </div>

            <div class="bg-[#1C1C1E] rounded-[24px] border border-white/10 shadow-sm w-full overflow-hidden mb-4">
                <div class="px-5 pt-4 pb-3">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium">${t('editProfile.username')}</label>
                        <span id="username-changes-left">${changesLabel}</span>
                    </div>
                    <input type="text" id="edit-username" value=""
                        class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all placeholder:text-[#8E8E93]/60"
                        placeholder="${cachedUsername || t('editProfile.username')}"
                        oninput="this.value=this.value.replace(/[^a-zA-Z0-9_]/g,'')">
                    <p id="edit-username-error" class="hidden text-[#FF3B30] text-[13px] mt-2"></p>
                    <p class="text-[11px] text-[#8E8E93] mt-2">${t('editProfile.changesPerMonth')}</p>
                </div>

                <div class="px-5 py-4">
                    <label class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium block mb-2">${t('editProfile.email')}</label>
                    <input type="email" id="edit-email" value="${cachedEmail}" disabled class="w-full bg-black/50 text-[#8E8E93] border border-white/5 rounded-[14px] px-4 py-3.5 text-[17px] outline-none cursor-not-allowed">
                </div>

                <div class="px-5 pb-4">
                    <button id="save-profile-btn" onclick="triggerHapticFeedback(); handleProfileSave(this)" class="w-full bg-white text-black font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-all duration-300 shadow-[0_4px_14px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2">
                        <span>${t('editProfile.saveChanges')}</span>
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
                        <span class="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">${t('stats.collected')}</span>
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
                ${t('stats.subtitle')}
            </p>
            ${gridHTML}
        `;
    } else if (type === 'Notifications') {
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">${t('notifications.pushNotifications')}</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">${t('notifications.newSnusDrops')}</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">${t('notifications.emailSummaries')}</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Privacy & Security') {
        html = `
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">${t('privacy.profileVisibility')}</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 mb-8">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">${t('privacy.privateProfile')}</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-[#3A3A3C] rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm"></div></div>
                </div>
            </div>
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">${t('privacy.data')}</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 mb-8">
                <div class="flex items-center justify-between p-5">
                    <span class="text-white text-[17px]">${t('privacy.shareAnalytics')}</span>
                    <div onclick="triggerHapticFeedback(); toggleSetting(this)" class="w-12 h-7 bg-white rounded-full relative cursor-pointer transition-colors duration-300"><div class="absolute left-1 top-1 w-5 h-5 bg-black rounded-full transition-transform duration-300 translate-x-5 shadow-sm"></div></div>
                </div>
            </div>
            <p class="text-[#8E8E93] text-[13px] mb-2 pl-2 uppercase tracking-wider font-medium">${t('privacy.exportSection')}</p>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="p-5">
                    <p class="text-[#8E8E93] text-[14px] leading-relaxed mb-4">${t('privacy.exportDesc')}</p>
                    <button id="export-data-btn" onclick="triggerHapticFeedback(); exportUserData()" class="w-full bg-white text-black font-semibold text-[17px] py-3.5 rounded-[14px] active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        <span>${t('privacy.exportBtn')}</span>
                    </button>
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
                        <span class="text-white text-[17px]">${t('tracking.title')}</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">${t('tracking.desc')}</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleTrackingMode(this)" class="w-12 h-7 ${trackToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${trackHandleBg} rounded-full transition-transform duration-300 ${trackHandleTransform} shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Haptics') {
        const globalOn = localStorage.getItem('hapticGlobal') !== 'off';
        const dexOn = localStorage.getItem('hapticDex') !== 'off';

        const gBg = globalOn ? 'bg-white' : 'bg-[#3A3A3C]';
        const gT  = globalOn ? 'translate-x-5' : '';
        const gHBg = globalOn ? 'bg-black' : 'bg-white';

        const dBg = dexOn ? 'bg-white' : 'bg-[#3A3A3C]';
        const dT  = dexOn ? 'translate-x-5' : '';
        const dHBg = dexOn ? 'bg-black' : 'bg-white';

        const dexToggleClass = !globalOn ? 'opacity-40 pointer-events-none' : '';

        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">${t('haptics.globalLabel')}</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">${t('haptics.globalDesc')}</span>
                    </div>
                    <div onclick="toggleHapticGlobal(this)" class="w-12 h-7 ${gBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${gHBg} rounded-full transition-transform duration-300 ${gT} shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">${t('haptics.dexLabel')}</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">${t('haptics.dexDesc')}</span>
                    </div>
                    <div id="haptic-dex-toggle" onclick="triggerHapticFeedback(); toggleHapticDex(this)" class="w-12 h-7 ${dBg} rounded-full relative cursor-pointer transition-[colors,opacity] duration-200 flex-shrink-0 ${dexToggleClass}"><div class="absolute left-1 top-1 w-5 h-5 ${dHBg} rounded-full transition-transform duration-300 ${dT} shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Language') {
        const lang = localStorage.getItem('appLang') || 'en';
        const checkIcon = (l) => lang === l
            ? `<svg class="lang-check-icon w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
            : `<svg class="lang-check-icon w-5 h-5 text-white flex-shrink-0 invisible" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
        const langEntries = Object.entries(LANG_NAMES);
        const langRows = langEntries.map(([code, name], i) => `
                <div onclick="triggerHapticFeedback(); setLang('${code}').then(() => refreshLangPage())" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                    <span class="text-white text-[17px]">${name}</span>
                    ${checkIcon(code)}
                </div>
                ${i < langEntries.length - 1 ? '<div class="h-[1px] bg-white/5 mx-5"></div>' : ''}
        `).join('');
        html = `
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                ${langRows}
            </div>
        `;
    } else if (type === 'Theme') {
        // Light / Dark / System theme selector (moved out of Personalisierung
        // so users find it under its own top-level "Darstellung" entry).
        const currentTheme = (window.SnusTheme && window.SnusTheme.getTheme())
            || localStorage.getItem('snusTheme') || 'system';
        const themeOptions = [
            { id: 'light',  labelKey: 'appearance.themeLight',  icon: 'sun'    },
            { id: 'dark',   labelKey: 'appearance.themeDark',   icon: 'moon'   },
            { id: 'system', labelKey: 'appearance.themeSystem', icon: 'system' },
        ];
        const themeIcon = (kind) => kind === 'sun'
            ? `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`
            : kind === 'moon'
            ? `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`
            : `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="13" rx="2" ry="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 21h8M12 17v4"/></svg>`;
        const themeButtonsHTML = themeOptions.map(o => {
            const active = currentTheme === o.id;
            return `<button onclick="triggerHapticFeedback(); setAppTheme('${o.id}')"
                class="theme-opt-btn flex-1 flex flex-col items-center gap-2 px-2 py-5 rounded-[18px] transition-all active:scale-95 ${active ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white/70'}"
                data-theme-id="${o.id}">
                ${themeIcon(o.icon)}
                <span class="text-[14px]">${t(o.labelKey)}</span>
            </button>`;
        }).join('');

        html = `
            <h3 class="text-[#8E8E93] text-[13px] uppercase tracking-wider font-medium mb-2 pl-2">${t('appearance.themeSection')}</h3>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 p-3 mb-3">
                <div class="flex gap-2">${themeButtonsHTML}</div>
            </div>
            <p class="text-[13px] text-[#8E8E93] px-2 leading-relaxed">${t('appearance.themeDesc')}</p>
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

        // Get actual user credentials for the preview card
        const homeLevelVal = document.getElementById('home-level')?.innerText || 'LVL 1';
        const scoreVal = document.getElementById('score')?.innerHTML || '0 <span class="font-medium text-[20px] text-white/50">XP</span>';
        const greetingVal = document.getElementById('greeting')?.innerHTML || 'COLLECTOR';

        // --- NEW ---
        const metalColors = [
            { id: 'white', name: 'White', color: '#ffffff', reqRarity: null },
            { id: 'gray', name: 'Gray', color: '#8e8e93', reqRarity: null },
            { id: 'green', name: 'Green', color: 'var(--uncommon, #34c759)', reqRarity: 'uncommon' },
            { id: 'blue', name: 'Blue', color: 'var(--rare, #0a84ff)', reqRarity: 'rare' },
            { id: 'purple', name: 'Purple', color: 'var(--epic, #bf5af2)', reqRarity: 'epic' },
            { id: 'red', name: 'Red', color: 'var(--exotic, #ff375f)', reqRarity: 'exotic' },
            { id: 'gold', name: 'Gold', color: 'var(--legendary, #ff9f0a)', reqRarity: 'legendary' }
        ];

        const activeColorId = localStorage.getItem('metalCardColorId') || 'white';
        
        const colorOptionsHTML = metalColors.map(c => {
            let isUnlocked = true;
            if (c.reqRarity) {
                isUnlocked = typeof globalSnusData !== 'undefined' && typeof globalUserCollection !== 'undefined' && globalSnusData.some(s => 
                    globalUserCollection[s.id] && 
                    (s.rarity || 'common').toLowerCase().trim() === c.reqRarity
                );
            }
            
            const isActive = activeColorId === c.id;
            const ringClass = isActive ? 'border-white' : 'border-transparent';
            
            if (isUnlocked) {
                return `
                    <div onclick="triggerHapticFeedback(); setMetalCardColor('${c.id}', '${c.color}')" class="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center border-2 ${ringClass} transition-colors">
                            <div class="w-10 h-10 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" style="background-color: ${c.color}; box-shadow: 0 0 10px ${c.color}"></div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="flex flex-col items-center gap-1 opacity-40 grayscale cursor-not-allowed flex-shrink-0">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center border-2 border-transparent">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background-color: ${c.color}">
                                <svg class="w-5 h-5 text-black/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-9V7a6 6 0 10-12 0v1H5v14h14V8h-1zm-4 0H10V7a2 2 0 114 0v1z"/></svg>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        const activeIntensity = localStorage.getItem('metalCardIntensity') || '1';

        html = `
            <!-- Live Preview Card -->
            <div id="preview-card-wrapper" class="mb-6 animate-fade-in" data-theme-aware="1">
                <div class="metal-card-container" id="preview-metal-card-container" data-anim="sweep" style="padding: 0 0 20px 0;">
                    <div class="metal-collector-card">
                        <div class="metal-card-ambient"></div>
                        <div class="metal-card-pattern"></div>
                        <div class="metal-card-glow"></div>
                        <div class="metal-card-glow metal-card-glow-2"></div>
                        <div class="flex justify-between items-start relative z-10">
                            <span class="engraved-text font-medium uppercase tracking-widest" style="font-size: 13px;">${t('home.collectorId')}</span>
                            <span id="preview-home-level" class="engraved-text font-semibold" style="font-size: 14px;">${homeLevelVal}</span>
                        </div>
                        <div class="relative z-10">
                            <p id="preview-greeting" class="engraved-text uppercase tracking-wide" style="font-size: 13px; margin-bottom: 2px;">${greetingVal}</p>
                            <p id="preview-score" class="engraved-text font-semibold tracking-tight leading-none" style="font-size: 38px; margin: 0;">${scoreVal}</p>
                        </div>
                    </div>
                    <button id="card-pin-btn" onclick="triggerHapticFeedback(); toggleCardPin()">
                        <svg id="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="17" x2="12" y2="22"/>
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <h3 class="text-[#8E8E93] text-[13px] uppercase tracking-wider font-medium mb-2 pl-2">${t('appearance.cardGlow')}</h3>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 p-5 mb-6">
                <div class="flex flex-wrap gap-4 pb-2">
                    ${colorOptionsHTML}
                </div>
                <div class="mt-4 border-t border-white/5 pt-4">
                    <span class="text-white text-[15px] block mb-3">${t('appearance.animation')}</span>
                    <div class="flex gap-2 flex-wrap">
                        ${[
                            { id: 'sweep', label: t('appearance.animSweep'), reqRarities: null },
                            { id: 'pulse', label: t('appearance.animPulse'), reqRarities: null },
                            { id: 'ripple', label: t('appearance.animRipple'), reqRarities: null },
                            { id: 'wave', label: t('appearance.animWave') || 'Wave', reqRarities: null },
                            { id: 'mountains', label: t('appearance.animMountains') || 'Mountains', reqRarities: ['exotic', 'legendary'] },
                            { id: 'gol', label: t('appearance.animGol'), reqRarities: null },
                            { id: 'firework', label: t('appearance.animFirework'), reqRarities: null },
                            { id: 'none',  label: t('appearance.animNone'), reqRarities: null },
                        ].map(a => {
                            let isUnlocked = true;
                            if (a.reqRarities) {
                                isUnlocked = a.reqRarities.every(req => {
                                    return typeof globalSnusData !== 'undefined' && typeof globalUserCollection !== 'undefined' && globalSnusData.some(s => 
                                        globalUserCollection[s.id] && 
                                        (s.rarity || 'common').toLowerCase().trim() === req
                                    );
                                });
                            }
                            const active = (localStorage.getItem('metalCardAnim') || 'sweep') === a.id;
                            if (isUnlocked) {
                                return `<button onclick="triggerHapticFeedback(); setMetalCardAnim('${a.id}')"
                                    class="px-4 py-2 rounded-[12px] text-[15px] font-medium transition-all active:scale-95 ${active ? 'bg-white text-black' : 'bg-white/10 text-white/70'}">
                                    ${a.label}
                                </button>`;
                            } else {
                                return `<button class="px-4 py-2 rounded-[12px] text-[15px] font-medium bg-white/5 text-white/30 cursor-not-allowed opacity-50 flex items-center gap-1.5" disabled>
                                    <svg class="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-9V7a6 6 0 10-12 0v1H5v14h14V8h-1zm-4 0H10V7a2 2 0 114 0v1z"/></svg>
                                    ${a.label}
                                </button>`;
                            }
                        }).join('')}
                    </div>
                </div>
                <div class="mt-4 border-t border-white/5 pt-4">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-white text-[15px]">${t('appearance.intensity')}</span>
                        <span id="glow-intensity-val" class="text-[#8E8E93] text-[13px] font-medium">${parseFloat(activeIntensity).toFixed(1)}x</span>
                    </div>
                    <input type="range" min="1" max="4" step="0.1" id="glow-intensity" value="${activeIntensity}" oninput="setMetalCardIntensity(this.value)" onchange="syncCardAppearanceToCloud()" class="w-full h-1.5 bg-[#3A3A3C] rounded-full appearance-none outline-none accent-white">
                </div>
                <div class="mt-4 border-t border-white/5 pt-4">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-white text-[15px]">${t('appearance.saturation')}</span>
                        <span id="saturation-val" class="text-[#8E8E93] text-[13px] font-medium">${parseFloat(localStorage.getItem('metalCardSaturation') || '1.3').toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.5" max="3" step="0.1" value="${localStorage.getItem('metalCardSaturation') || '1.3'}" oninput="setMetalCardSaturation(this.value)" onchange="syncCardAppearanceToCloud()" class="w-full h-1.5 bg-[#3A3A3C] rounded-full appearance-none outline-none accent-white">
                </div>
                <p class="text-[12px] text-[#8E8E93] mt-4">${t('appearance.cardGlowDesc')}</p>
            </div>

            <h3 class="text-[#8E8E93] text-[13px] uppercase tracking-wider font-medium mb-2 pl-2">${t('appearance.cardFont')}</h3>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 p-5 mb-6">
                <div class="flex gap-3 flex-wrap">
                    ${[
                        { id: 'system',      label: 'Default',     style: '-apple-system, sans-serif' },
                        { id: 'rounded',     label: 'Rounded',     style: 'ui-rounded, -apple-system, sans-serif' },
                        { id: 'futura',      label: 'Futura',      style: 'Futura, sans-serif' },
                        { id: 'serif',       label: 'Georgia',     style: 'Georgia, serif' },
                        { id: 'baskerville', label: 'Baskerville', style: 'Baskerville, serif' },
                        { id: 'display',     label: 'Didot',       style: 'Didot, serif' },
                        { id: 'copperplate', label: 'Copper',      style: 'Copperplate, serif' },
                        { id: 'mono',        label: 'Mono',        style: 'Menlo, monospace' },
                    ].map(f => {
                        const active = (localStorage.getItem('metalCardFont') || 'system') === f.id;
                        return `<button onclick="triggerHapticFeedback(); setMetalCardFont('${f.id}')"
                            style="font-family: ${f.style}"
                            class="px-4 py-2 rounded-[12px] text-[16px] transition-all ${active ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white/70'} active:scale-95">
                            ${f.label}
                        </button>`;
                    }).join('')}
                </div>
            </div>

            <h3 class="text-[#8E8E93] text-[13px] uppercase tracking-wider font-medium mb-2 pl-2">${t('appearance.pattern')}</h3>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10 p-5 mb-6">
                <div class="flex gap-2 flex-wrap">
                    ${[
                        { id: 'none',   label: t('appearance.patternNone')   },
                        { id: 'dots',   label: t('appearance.patternDots')   },
                        { id: 'grid',   label: t('appearance.patternGrid')   },
                        { id: 'lines',  label: t('appearance.patternLines')  },
                        { id: 'carbon', label: t('appearance.patternCarbon') },
                        { id: 'hex',    label: t('appearance.patternHex')    },
                        { id: 'rings',  label: t('appearance.patternRings')  },
                        { id: 'cubes',  label: t('appearance.patternCubes')  },
                    ].map(p => {
                        const active = (localStorage.getItem('metalCardPattern') || 'none') === p.id;
                        return `<button onclick="triggerHapticFeedback(); setMetalCardPattern('${p.id}')"
                            class="px-4 py-2 rounded-[12px] text-[15px] font-medium transition-all active:scale-95 ${active ? 'bg-white text-black' : 'bg-white/10 text-white/70'}">
                            ${p.label}
                        </button>`;
                    }).join('')}
                </div>
            </div>

            <h3 class="text-[#8E8E93] text-[13px] uppercase tracking-wider font-medium mb-2 pl-2">${t('appearance.dexSettings')}</h3>
            <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
                <div class="flex flex-col p-5">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex flex-col pr-4">
                            <span class="text-white text-[17px]">${t('appearance.defaultSort')}</span>
                            <span class="text-[#8E8E93] text-[13px] mt-0.5">${t('appearance.defaultSortDesc')}</span>
                        </div>
                        <div onclick="triggerHapticFeedback(); toggleDefaultSort(this)" class="w-12 h-7 ${sortToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${sortHandleBg} rounded-full transition-transform duration-300 ${sortHandleTransform} shadow-sm"></div></div>
                    </div>
                    <p class="text-[12px] text-[#FF3B30] font-semibold leading-tight">${t('appearance.warning')}</p>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>

                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">${t('appearance.largeTiles')}</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">${t('appearance.largeTilesDesc')}</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleGridColumns(this)" class="w-12 h-7 ${toggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${handleBg} rounded-full transition-transform duration-300 ${handleTransform} shadow-sm"></div></div>
                </div>
                <div class="h-[1px] bg-white/5 mx-5"></div>
                <div class="flex items-center justify-between p-5">
                    <div class="flex flex-col pr-4">
                        <span class="text-white text-[17px]">${t('appearance.tileGlow')}</span>
                        <span class="text-[#8E8E93] text-[13px] mt-0.5">${t('appearance.tileGlowDesc')}</span>
                    </div>
                    <div onclick="triggerHapticFeedback(); toggleGridGlow(this)" class="w-12 h-7 ${glowToggleBg} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0"><div class="absolute left-1 top-1 w-5 h-5 ${glowHandleBg} rounded-full transition-transform duration-300 ${glowHandleTransform} shadow-sm"></div></div>
                </div>
            </div>
        `;
    } else if (type === 'Help Center & FAQ') {
        html = `
            <div class="space-y-4">
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">${t('helpCenter.q1')}</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">${t('helpCenter.a1')}</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">${t('helpCenter.q2')}</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">${t('helpCenter.a2')}</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">${t('helpCenter.q3')}</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">${t('helpCenter.a3')}</p>
                </div>
                <div class="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 shadow-sm">
                    <h3 class="text-white font-medium mb-1">${t('helpCenter.q4')}</h3>
                    <p class="text-[#8E8E93] text-[15px] leading-relaxed">${t('helpCenter.a4')}</p>
                </div>

                <div class="mt-10 flex justify-center pb-8">
                    <button onclick="triggerHapticFeedback()" class="text-[#8E8E93] hover:text-white text-[14px] font-medium underline decoration-white/30 underline-offset-4 active:opacity-50 transition-all">
                        ${t('helpCenter.contactSupport')}
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
                <h2 class="text-white text-[22px] font-bold tracking-tight mb-2">${t('deleteAccount.title')}</h2>
                <p class="text-[#8E8E93] text-[15px] px-4 leading-relaxed">${t('deleteAccount.desc')}</p>
            </div>
            <button onclick="triggerHapticFeedback()" class="w-full bg-[#FF3B30] text-white font-semibold text-[17px] py-4 rounded-[14px] active:scale-95 transition-transform mb-3 shadow-[0_4px_14px_rgba(255,59,48,0.2)]">
                ${t('deleteAccount.confirm')}
            </button>
            <button onclick="triggerHapticFeedback(); closeSettingsSubpage()" class="w-full bg-[#1C1C1E] border border-white/10 text-white font-medium text-[17px] py-4 rounded-[14px] active:bg-white/5 transition-colors">
                ${t('deleteAccount.cancel')}
            </button>
        `;

    } else if (type === 'README') {
        const _spinnerSvg = `<svg class="animate-spin w-4 h-4 text-[#8E8E93]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
        html = `
            <div id="gh-readme-container" class="flex items-center justify-center py-8 gap-2">
                ${_spinnerSvg}<span class="text-[#8E8E93] text-[14px]">Loading README…</span>
            </div>
        `;
        setTimeout(async () => {
            const el = document.getElementById('gh-readme-container');
            if (!el) return;
            try {
                const res = await fetch('https://raw.githubusercontent.com/HazeCCS/Snusdex/main/README.md');
                if (!res.ok) throw new Error('not found');
                const md = await res.text();
                el.className = 'pb-8';
                el.style.wordBreak = 'break-word';
                el.style.opacity = '0';
                el.innerHTML = _ghMarkdown(md);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    el.style.transition = 'opacity 0.55s ease';
                    el.style.opacity = '1';
                }));
            } catch(e) {
                el.innerHTML = `<div class="flex items-center gap-2 px-1 py-4"><svg class="w-4 h-4 text-[#FFD60A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg><span class="text-[#8E8E93] text-[14px]">README not found or repository is private.</span></div>`;
            }
        }, 0);

    } else if (type === 'Architecture Map') {
        contentObj.className = 'flex-1 overflow-hidden p-0 relative';
        html = `
            <div id="arch-map-loader" style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;transition:opacity 0.4s ease">
                <p style="color:rgba(255,255,255,.7);font-size:17px;font-weight:600;letter-spacing:-.3px;margin-bottom:20px">Architecture Map</p>
                <div style="width:200px;height:3px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden">
                    <div id="arch-map-bar" style="height:100%;width:0%;background:rgba(255,255,255,.85);border-radius:999px;transition:width 1.6s cubic-bezier(0.4,0,0.2,1)"></div>
                </div>
            </div>
            <iframe id="arch-map-iframe" src="architecture-map.html"
                style="width:100%;height:100%;border:none;display:block;position:absolute;inset:0"
                allow="fullscreen">
            </iframe>`;
    }

    contentObj.innerHTML = html;

    if (type === 'Architecture Map') {
        let _barDone = false, _iframeLoaded = false;
        function _tryDismissLoader() {
            if (!_barDone || !_iframeLoaded) return;
            const l = document.getElementById('arch-map-loader');
            if (l) { l.style.opacity = '0'; setTimeout(() => l.remove(), 400); }
        }
        requestAnimationFrame(() => {
            const bar = document.getElementById('arch-map-bar');
            if (bar) {
                bar.style.width = '100%';
                bar.addEventListener('transitionend', () => { _barDone = true; _tryDismissLoader(); }, { once: true });
            }
        });
        const iframe = document.getElementById('arch-map-iframe');
        if (iframe) {
            iframe.addEventListener('load', () => { _iframeLoaded = true; _tryDismissLoader(); });
        }
    }

    if (type === 'Edit Profile') {
        renderBadgeSelectorItems();
    }

    subpage.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    if (window._skipSubpageAnimation) {
        window._skipSubpageAnimation = false;
        subpage.classList.remove('translate-x-full');
        subpage.classList.add('translate-x-0');
    } else {
        setTimeout(() => {
            subpage.classList.remove('translate-x-full');
            subpage.classList.add('translate-x-0');
        }, 10);
    }

    // Apply card appearance after hidden is removed so getBoundingClientRect()
    // returns real dimensions (canvas patterns initialize at 0x0 on hidden elements).
    if (type === 'Darstellung') {
        requestAnimationFrame(() => {
            applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
        });
    }
}

function refreshLangPage() {
    const contentObj = document.getElementById('subpage-content');
    const titleObj = document.getElementById('subpage-title');
    if (!contentObj || !titleObj) return;
    titleObj.innerText = t('settings.language');
    const lang = localStorage.getItem('appLang') || 'en';
    const checkIcon = (l) => lang === l
        ? `<svg class="lang-check-icon w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
        : `<svg class="lang-check-icon w-5 h-5 text-white flex-shrink-0 invisible" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    const langEntries = Object.entries(LANG_NAMES);
    const langRows = langEntries.map(([code, name], i) => `
            <div onclick="triggerHapticFeedback(); setLang('${code}').then(() => refreshLangPage())" class="flex items-center justify-between p-5 active:bg-white/5 cursor-pointer">
                <span class="text-white text-[17px]">${name}</span>
                ${checkIcon(code)}
            </div>
            ${i < langEntries.length - 1 ? '<div class="h-[1px] bg-white/5 mx-5"></div>' : ''}
    `).join('');
    contentObj.innerHTML = `
        <div class="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/10">
            ${langRows}
        </div>
    `;
}
window.refreshLangPage = refreshLangPage;

// ── Theme switch handler ───────────────────────────────────────────────────
// Called from the Light/Dark/System buttons in the Appearance subpage.
// Updates the visual selection in-place to avoid a full re-render of the page
// (the appearance page contains a canvas preview that would flicker).
function setAppTheme(pref) {
    if (window.SnusTheme && typeof window.SnusTheme.setTheme === 'function') {
        window.SnusTheme.setTheme(pref);
    } else {
        try { localStorage.setItem('snusTheme', pref); } catch (_) {}
    }
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-theme-id') === pref;
        btn.classList.toggle('bg-white', isActive);
        btn.classList.toggle('text-black', isActive);
        btn.classList.toggle('font-semibold', isActive);
        btn.classList.toggle('bg-white/10', !isActive);
        btn.classList.toggle('text-white/70', !isActive);
    });
}
window.setAppTheme = setAppTheme;

function closeSettingsSubpage() {
    if (window._subpageHistory && window._subpageHistory.length > 0) {
        const prev = window._subpageHistory.pop();
        openSettingsSubpage(prev, false);
        return;
    }

    const wasAppearancePage = window._currentSubpageType === 'Darstellung';

    window._subpageHistory = [];
    window._currentSubpageType = null;

    const subpage = document.getElementById('settings-subpage');
    if (!subpage) return;

    subpage.style.transform = '';
    subpage.style.transition = '';

    subpage.classList.remove('translate-x-0');
    subpage.classList.add('translate-x-full');

    // Hide subpage after slide-out animation (300ms)
    setTimeout(() => {
        subpage.classList.add('hidden');
        // Keep body scroll-locked if a parent page (settings/github) is still open behind us
        if (!_isOverlayPageOpen()) {
            document.body.classList.remove('overflow-hidden');
        }
    }, 300);

    // Destroy preview canvas and refresh homepage card 500ms after closing —
    // after the subpage is fully out of view and homepage card has real dimensions.
    setTimeout(() => {
        const previewContainer = document.getElementById('preview-metal-card-container');
        if (previewContainer && typeof CardCanvasRenderer !== 'undefined') {
            CardCanvasRenderer.destroy(previewContainer);
        }
        if (wasAppearancePage && typeof applyCardAppearance !== 'undefined') {
            applyCardAppearance('metal-card-container', getLocalCardAppearance());
        }
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    const settingsSubpage = document.getElementById('settings-subpage');
    if (!settingsSubpage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let _swipeLock = false;

    settingsSubpage.addEventListener('touchstart', (e) => {
        if (_swipeLock) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, { passive: true });

    settingsSubpage.addEventListener('touchmove', (e) => {
        if (_swipeLock || !touchStartX || !touchStartY) return;

        const touchCurrentX = e.touches[0].clientX;
        const touchCurrentY = e.touches[0].clientY;
        const diffX = touchCurrentX - touchStartX;
        const diffY = Math.abs(touchCurrentY - touchStartY);

        if (isSwiping) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0) settingsSubpage.style.transform = `translateX(${diffX}px)`;
            return;
        }

        if (diffY > Math.abs(diffX)) return;

        if (diffX > 0) {
            if (e.cancelable) e.preventDefault();
            isSwiping = true;
            settingsSubpage.style.transition = 'none';
            settingsSubpage.style.transform = `translateX(${diffX}px)`;
        }
    }, { passive: false });

    settingsSubpage.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        const shouldClose = diffX > window.innerWidth / 3 || diffX > 100;

        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;

        if (!shouldClose) {
            settingsSubpage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            settingsSubpage.style.transform = 'translateX(0)';
            setTimeout(() => {
                settingsSubpage.style.transform = '';
                settingsSubpage.style.transition = '';
            }, 300);
            return;
        }

        // Lock gestures during exit animation
        _swipeLock = true;
        const hasHistory = !!(window._subpageHistory?.length);

        // Animate fully off-screen (user may have already dragged partway)
        settingsSubpage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        settingsSubpage.style.transform = `translateX(${window.innerWidth}px)`;

        setTimeout(() => {
            // Kill inline styles — element is off-screen, safe to reset
            settingsSubpage.style.transition = 'none';
            settingsSubpage.style.transform = '';

            if (hasHistory) {
                // Load previous page without slide-in animation (element is at translate-x-0 CSS class)
                const prev = window._subpageHistory.pop();
                window._currentSubpageType = null;
                window._skipSubpageAnimation = true;
                openSettingsSubpage(prev, false);
                // Re-enable CSS transitions after one paint frame
                requestAnimationFrame(() => {
                    settingsSubpage.style.transition = '';
                    _swipeLock = false;
                });
            } else {
                window._subpageHistory = [];
                window._currentSubpageType = null;
                settingsSubpage.classList.remove('translate-x-0');
                settingsSubpage.classList.add('translate-x-full', 'hidden');
                // Keep body scroll-locked if a parent page (settings/github) is still open behind us
                if (!_isOverlayPageOpen()) {
                    document.body.classList.remove('overflow-hidden');
                }
                settingsSubpage.style.transition = '';
                _swipeLock = false;
            }
        }, 300);
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

// ── Profile Sub-Tab ────────────────────────────────────────────────────────
function switchProfileSubtab(tab) {
    const overviewEl  = document.getElementById('prof-tab-overview');
    const settingsEl  = document.getElementById('prof-tab-settings');
    const overviewBtn = document.getElementById('prof-tab-btn-overview');
    const settingsBtn = document.getElementById('prof-tab-btn-settings');
    if (!overviewEl || !settingsEl) return;

    const showOverview = tab === 'overview';
    overviewEl.classList.toggle('hidden', !showOverview);
    settingsEl.classList.toggle('hidden', showOverview);

    overviewBtn.classList.toggle('bg-white', showOverview);
    overviewBtn.classList.toggle('text-black', showOverview);
    overviewBtn.classList.toggle('text-[#8E8E93]', !showOverview);

    settingsBtn.classList.toggle('bg-white', !showOverview);
    settingsBtn.classList.toggle('text-black', !showOverview);
    settingsBtn.classList.toggle('text-[#8E8E93]', showOverview);

    if (!showOverview) {
        const inp = document.getElementById('settings-search-input');
        if (inp) { inp.value = ''; filterSettingsItems(''); }
    }
}
window.switchProfileSubtab = switchProfileSubtab;

// ── Settings Search Filter ─────────────────────────────────────────────────
function filterSettingsItems(query) {
    const q        = query.trim().toLowerCase();
    const sections = document.querySelectorAll('.settings-search-section');
    const empty    = document.getElementById('settings-search-empty');
    const danger   = document.getElementById('settings-danger-zone');
    let anyVisible = false;

    sections.forEach(section => {
        const rows = section.querySelectorAll('.settings-row');
        let sectionVisible = false;
        let lastVisible    = null;

        rows.forEach(row => {
            const keywords = (row.dataset.search || '').toLowerCase();
            const visible  = !q || keywords.includes(q);
            row.style.display = visible ? '' : 'none';
            if (visible) { sectionVisible = true; lastVisible = row; }
        });

        // Hide the bottom divider of the last visible row to avoid orphan line
        rows.forEach(row => {
            const divider = row.querySelector('.settings-divider');
            if (divider) divider.style.display = (row === lastVisible) ? 'none' : '';
        });

        section.style.display = sectionVisible ? '' : 'none';
        if (sectionVisible) anyVisible = true;
    });

    if (empty)  empty.classList.toggle('hidden', anyVisible || !q);
    if (danger) danger.style.display = q ? 'none' : '';
}
window.filterSettingsItems = filterSettingsItems;

// ── Settings Page open / close ─────────────────────────────────────────────
function openSettingsPage() {
    const page = document.getElementById('settings-page');
    if (!page) return;

    const searchInput = document.getElementById('settings-search-input');
    if (searchInput) { searchInput.value = ''; filterSettingsItems(''); }

    // Freeze background: profile tab becomes non-interactive while settings is open
    const profileTab = document.getElementById('tab-profile');
    if (profileTab) profileTab.style.pointerEvents = 'none';

    page.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    setTimeout(() => {
        page.classList.remove('translate-x-full');
        page.classList.add('translate-x-0');
    }, 10);
}
window.openSettingsPage = openSettingsPage;

function closeSettingsPage() {
    const page = document.getElementById('settings-page');
    if (!page) return;

    page.classList.remove('translate-x-0');
    page.classList.add('translate-x-full');
    setTimeout(() => {
        page.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        const profileTab = document.getElementById('tab-profile');
        if (profileTab) profileTab.style.pointerEvents = '';
    }, 300);
}
window.closeSettingsPage = closeSettingsPage;

// ── Settings Page swipe-to-close ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const settingsPage = document.getElementById('settings-page');
    if (!settingsPage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let _pageSwipeLock = false;

    settingsPage.addEventListener('touchstart', (e) => {
        if (_pageSwipeLock) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, { passive: true });

    settingsPage.addEventListener('touchmove', (e) => {
        if (_pageSwipeLock || !touchStartX || !touchStartY) return;

        const touchCurrentX = e.touches[0].clientX;
        const touchCurrentY = e.touches[0].clientY;
        const diffX = touchCurrentX - touchStartX;
        const diffY = Math.abs(touchCurrentY - touchStartY);

        if (isSwiping) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0) settingsPage.style.transform = `translateX(${diffX}px)`;
            return;
        }

        if (diffY > Math.abs(diffX)) return;

        if (diffX > 0) {
            if (e.cancelable) e.preventDefault();
            isSwiping = true;
            settingsPage.style.transition = 'none';
            settingsPage.style.transform = `translateX(${diffX}px)`;
        }
    }, { passive: false });

    settingsPage.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        const shouldClose = diffX > window.innerWidth / 3 || diffX > 100;

        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;

        if (!shouldClose) {
            settingsPage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            settingsPage.style.transform = 'translateX(0)';
            setTimeout(() => {
                settingsPage.style.transform = '';
                settingsPage.style.transition = '';
            }, 300);
            return;
        }

        _pageSwipeLock = true;
        settingsPage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        settingsPage.style.transform = `translateX(${window.innerWidth}px)`;

        setTimeout(() => {
            settingsPage.style.transition = 'none';
            settingsPage.style.transform = '';
            settingsPage.classList.remove('translate-x-0');
            settingsPage.classList.add('translate-x-full', 'hidden');
            document.body.classList.remove('overflow-hidden');
            const profileTab = document.getElementById('tab-profile');
            if (profileTab) profileTab.style.pointerEvents = '';
            settingsPage.style.transition = '';
            _pageSwipeLock = false;
        }, 300);
    });
});

// ── Overlay page helper ────────────────────────────────────────────────────
// True if a persistent full-screen page (settings/github) is still open behind
// a closing subpage — so we keep the body scroll-lock instead of releasing it.
function _isOverlayPageOpen() {
    return ['settings-page', 'github-page'].some(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
    });
}

// ── GitHub Page open / close ───────────────────────────────────────────────
function _loadGithubCommits() {
    const el = document.getElementById('gh-commits-container');
    if (!el) return;
    const _spinnerSvg = `<svg class="animate-spin w-4 h-4 text-[#8E8E93]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
    const _errRow = `<div class="flex items-center gap-2 px-5 py-5"><svg class="w-4 h-4 text-[#FFD60A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg><span class="text-[#8E8E93] text-[14px]">Repository is private or rate limit reached.</span></div>`;
    el.className = 'flex items-center justify-center py-8 gap-2';
    el.style.opacity = '';
    el.style.transition = '';
    el.innerHTML = `${_spinnerSvg}<span class="text-[#8E8E93] text-[14px]">Loading commits…</span>`;
    (async () => {
        try {
            const res = await fetch('https://api.github.com/repos/HazeCCS/Snusdex/commits?per_page=20');
            if (!res.ok) throw new Error('private');
            const data = await res.json();
            el.className = '';
            el.style.opacity = '0';
            el.innerHTML = data.map((c, i) => {
                const msg = c.commit.message.split('\n')[0];
                const sha = c.sha.substring(0, 7);
                const author = c.commit.author.name;
                const time = _ghRelTime(c.commit.author.date);
                const div = i > 0 ? '<div class="h-[1px] bg-white/5 mx-5"></div>' : '';
                return `${div}
                <div class="px-5 py-4">
                    <p class="text-white text-[15px] font-medium leading-snug">${msg.length > 72 ? msg.substring(0,72)+'…' : msg}</p>
                    <p class="text-[#8E8E93] text-[13px] mt-1.5"><span style="font-family:Menlo,monospace;color:rgba(255,255,255,.35)">${sha}</span> · ${author} · ${time}</p>
                </div>`;
            }).join('');
            requestAnimationFrame(() => requestAnimationFrame(() => {
                el.style.transition = 'opacity 0.55s ease';
                el.style.opacity = '1';
            }));
        } catch (e) {
            el.className = '';
            el.innerHTML = _errRow;
        }
    })();
}

function openGithubPage() {
    const page = document.getElementById('github-page');
    if (!page) return;

    // README / Architecture open as subpages above this page — start with a clean
    // stack so their back-swipe reveals the GitHub page, not a stale subpage.
    window._subpageHistory = [];
    window._currentSubpageType = null;

    const profileTab = document.getElementById('tab-profile');
    if (profileTab) profileTab.style.pointerEvents = 'none';

    page.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    _loadGithubCommits();
    setTimeout(() => {
        page.classList.remove('translate-x-full');
        page.classList.add('translate-x-0');
    }, 10);
}
window.openGithubPage = openGithubPage;

function closeGithubPage() {
    const page = document.getElementById('github-page');
    if (!page) return;

    page.classList.remove('translate-x-0');
    page.classList.add('translate-x-full');
    setTimeout(() => {
        page.classList.add('hidden');
        if (!_isOverlayPageOpen()) document.body.classList.remove('overflow-hidden');
        const profileTab = document.getElementById('tab-profile');
        if (profileTab) profileTab.style.pointerEvents = '';
    }, 300);
}
window.closeGithubPage = closeGithubPage;

// ── GitHub Page swipe-to-close ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const githubPage = document.getElementById('github-page');
    if (!githubPage) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let _pageSwipeLock = false;

    githubPage.addEventListener('touchstart', (e) => {
        if (_pageSwipeLock) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, { passive: true });

    githubPage.addEventListener('touchmove', (e) => {
        if (_pageSwipeLock || !touchStartX || !touchStartY) return;

        const diffX = e.touches[0].clientX - touchStartX;
        const diffY = Math.abs(e.touches[0].clientY - touchStartY);

        if (isSwiping) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0) githubPage.style.transform = `translateX(${diffX}px)`;
            return;
        }

        if (diffY > Math.abs(diffX)) return;

        if (diffX > 0) {
            if (e.cancelable) e.preventDefault();
            isSwiping = true;
            githubPage.style.transition = 'none';
            githubPage.style.transform = `translateX(${diffX}px)`;
        }
    }, { passive: false });

    githubPage.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        const diffX = e.changedTouches[0].clientX - touchStartX;
        const shouldClose = diffX > window.innerWidth / 3 || diffX > 100;

        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;

        if (!shouldClose) {
            githubPage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            githubPage.style.transform = 'translateX(0)';
            setTimeout(() => {
                githubPage.style.transform = '';
                githubPage.style.transition = '';
            }, 300);
            return;
        }

        _pageSwipeLock = true;
        githubPage.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        githubPage.style.transform = `translateX(${window.innerWidth}px)`;

        setTimeout(() => {
            githubPage.style.transition = 'none';
            githubPage.style.transform = '';
            githubPage.classList.remove('translate-x-0');
            githubPage.classList.add('translate-x-full', 'hidden');
            if (!_isOverlayPageOpen()) document.body.classList.remove('overflow-hidden');
            const profileTab = document.getElementById('tab-profile');
            if (profileTab) profileTab.style.pointerEvents = '';
            githubPage.style.transition = '';
            _pageSwipeLock = false;
        }, 300);
    });
});
