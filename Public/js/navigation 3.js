// ==========================================
// 3. NAVIGATION (TABS) — REWRITE v2
// ==========================================
//
// DESIGN PRINCIPLES:
// - Exakt EINE Wahrheitsquelle für Tab-Sichtbarkeit: data-tab-state Attribut
// - KEIN opacity 0 !important Konflikt mehr: tab-dex-hidden nur visibility+pointer-events
// - Dex-Fade läuft ausschließlich via CSS-Transition auf dem Element selbst
// - Alle async Guards: cancelAnimationFrame + clearTimeout vor jedem State-Wechsel
// - filterDex() wird NICHT beim Tab-Switch nochmals aufgerufen wenn Daten schon geladen
// ==========================================

let _navAnimRaf = null;       // Laufende RAF für Dex-Fade
let _navAnimTimer = null;     // Laufender Cleanup-Timer

function switchTab(tabId) {
    const dexTab     = document.getElementById('tab-dex');
    const isDexTarget = tabId === 'dex';

    // ── Früh-Abbruch: Tab bereits aktiv ──────────────────────────────────────
    if (isDexTarget) {
        if (dexTab && dexTab.dataset.tabState === 'visible') return;
    } else {
        const target = document.getElementById(`tab-${tabId}`);
        if (!target || !target.classList.contains('hidden')) return;
    }

    // ── Laufende Animationen canceln ─────────────────────────────────────────
    if (_navAnimRaf)   { cancelAnimationFrame(_navAnimRaf); _navAnimRaf = null; }
    if (_navAnimTimer) { clearTimeout(_navAnimTimer);       _navAnimTimer = null; }

    // ── Nav-Button Aktiv-State ────────────────────────────────────────────────
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isActive = btn.id === `btn-${tabId}`;
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-[#8E8E93]', !isActive);
    });

    // =========================================================================
    // DEX-TAB → einblenden
    // =========================================================================
    if (isDexTarget) {
        // 1. Alle anderen Tabs sofort ausblenden (kein flash)
        document.querySelectorAll('.tab-content').forEach(tab => {
            if (tab.id !== 'tab-dex') tab.classList.add('hidden');
        });

        // 2. Dex aus dem versteckten Zustand holen
        _showDexTab();

    // =========================================================================
    // ANDERER TAB → Dex layout-erhaltend verstecken, neuen Tab zeigen
    // =========================================================================
    } else {
        const nextTab = document.getElementById(`tab-${tabId}`);

        // Neuen Tab zuerst sichtbar machen (kein schwarzes Frame)
        if (nextTab) nextTab.classList.remove('hidden');

        // Alle anderen (außer Dex + Ziel) ausblenden
        document.querySelectorAll('.tab-content').forEach(tab => {
            if (tab.id === 'tab-dex' || tab.id === `tab-${tabId}`) return;
            tab.classList.add('hidden');
        });

        // Dex layout-erhaltend verstecken
        _hideDexTab();

        window.scrollTo(0, 0);
    }

    // ── Seiteneffekte ────────────────────────────────────────────────────────

    if (tabId === 'home' && displayedXp !== null && actualXp !== null && displayedXp !== actualXp) {
        setTimeout(() => {
            const level = Math.floor(actualXp / 300) + 1;
            animateXp(displayedXp, actualXp, level);
        }, 200);
    }

    if (tabId === 'social') {
        const now = Date.now();
        if (!_socialCacheData || (now - _socialCacheTime) > SOCIAL_CACHE_TTL) {
            loadTopSnusOfWeek();
        } else {
            renderSocialFromCache();
        }
        loadBadges();
    }

    if (tabId === 'profile') {
        (async () => {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return;
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('username, username_changes, username_last_reset')
                    .eq('id', user.id).single();

                const now = new Date();
                const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
                const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
                const changesThisMonth = sameMonth ? (profile?.username_changes || 0) : 0;
                const remaining = Math.max(0, 3 - changesThisMonth);

                window._profileCache = {
                    email: user.email,
                    username: profile?.username || user.user_metadata?.username || '',
                    remaining
                };
                window._cachedUsernameChangesRemaining = remaining;
            } catch (e) { /* ignore */ }
        })();
    } else {
        window._profileCache = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERN: Dex Tab einblenden
// Verwendet dieselbe CSS-Animation wie alle anderen Tabs (tabFadeIn),
// damit sich der Öffnungs-Feel identisch anfühlt. Kein extra RAF-Delay.
// ─────────────────────────────────────────────────────────────────────────────
function _showDexTab() {
    const dexTab = document.getElementById('tab-dex');
    if (!dexTab) return;

    // 1. Inline-Styles cleanen (könnten von altem Lauf übrig sein)
    dexTab.style.transition = '';
    dexTab.style.opacity    = '';
    dexTab.style.transform  = '';

    // 2. Animation-Klasse vorab entfernen (damit sie frisch startet)
    dexTab.classList.remove('tab-dex-entering');

    // 3. Aus dem hidden-Zustand holen
    dexTab.classList.remove('tab-dex-hidden');
    dexTab.dataset.tabState = 'visible';

    // 4. Forced Reflow: Browser muss den alten Zustand commiten
    //    bevor die Animation-Klasse gesetzt wird → Animation spielt sauber ab
    void dexTab.offsetWidth;

    // 5. Animation-Klasse → identische tabFadeIn wie andere Tabs
    dexTab.classList.add('tab-dex-entering');

    // 6. Scroll + Scale (ohne zusätzlichen RAF)
    window.scrollTo(0, 0);
    updateDexScale();
}


// ─────────────────────────────────────────────────────────────────────────────
// INTERN: Dex Tab layout-erhaltend verstecken
// ─────────────────────────────────────────────────────────────────────────────
function _hideDexTab() {
    const dexTab = document.getElementById('tab-dex');
    if (!dexTab) return;

    // Alle inline-Styles + Animation-Klasse resetten, dann hidden-Class setzen
    dexTab.style.transition = '';
    dexTab.style.opacity    = '';
    dexTab.style.transform  = '';
    dexTab.classList.remove('tab-dex-entering');

    dexTab.classList.add('tab-dex-hidden');
    dexTab.dataset.tabState = 'hidden';
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper: Haptic + switchTab (wird von nav-Buttons aufgerufen)
// ─────────────────────────────────────────────────────────────────────────────
function switchTabWrapper(tabId) {
    triggerHapticFeedback();
    switchTab(tabId);
}
