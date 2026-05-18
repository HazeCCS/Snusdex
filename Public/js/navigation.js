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
// ─────────────────────────────────────────────────────────────────────────────
function _showDexTab() {
    const dexTab = document.getElementById('tab-dex');
    if (!dexTab) return;

    // Sofort aus dem "hidden" Zustand nehmen – aber noch transparent
    dexTab.classList.remove('tab-dex-hidden');
    dexTab.dataset.tabState = 'visible';

    // Transition-Startpunkt erzwingen (synchron, vor RAF)
    dexTab.style.opacity    = '0';
    dexTab.style.transform  = 'scale(0.98)';
    dexTab.style.transition = 'none';   // Keine Transition beim Setzen von 0

    // Scroll sofort zurück (kein Ruckeln durch scroll nach transition)
    window.scrollTo(0, 0);

    // Einen Frame warten damit der Browser den Startzustand rendert,
    // dann Transition starten
    _navAnimRaf = requestAnimationFrame(() => {
        _navAnimRaf = null;

        dexTab.style.transition = 'opacity 0.26s cubic-bezier(0.4, 0, 0.2, 1), transform 0.26s cubic-bezier(0.4, 0, 0.2, 1)';
        dexTab.style.opacity    = '1';
        dexTab.style.transform  = 'scale(1)';

        // Scale-Animation für Dex-Karten aktualisieren
        updateDexScale();

        // Inline-Styles nach Abschluss der Transition aufräumen
        _navAnimTimer = setTimeout(() => {
            _navAnimTimer = null;
            // Nur aufräumen wenn wir noch Dex aktiv sind
            if (dexTab.dataset.tabState === 'visible') {
                dexTab.style.transition = '';
                dexTab.style.opacity    = '';
                dexTab.style.transform  = '';
            }
        }, 300);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERN: Dex Tab layout-erhaltend verstecken
// ─────────────────────────────────────────────────────────────────────────────
function _hideDexTab() {
    const dexTab = document.getElementById('tab-dex');
    if (!dexTab) return;

    // Alle inline-Styles resetten, dann class setzen
    dexTab.style.transition = '';
    dexTab.style.opacity    = '';
    dexTab.style.transform  = '';

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
