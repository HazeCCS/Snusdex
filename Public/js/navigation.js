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

    if (tabId === 'home') {
        // Reload the collector card every time the home tab is opened so the
        // canvas loop is always live and correctly sized.
        if (typeof applyCardAppearance !== 'undefined' && typeof getLocalCardAppearance !== 'undefined') {
            applyCardAppearance('metal-card-container', getLocalCardAppearance());
        }

        if (displayedXp !== null && actualXp !== null && displayedXp !== actualXp) {
            setTimeout(() => {
                const level = Math.floor(actualXp / 300) + 1;
                animateXp(displayedXp, actualXp, level);
            }, 200);
        }
    }

    if (tabId === 'social') {
        const now = Date.now();
        if (!_socialCacheData || (now - _socialCacheTime) > SOCIAL_CACHE_TTL) {
            loadTopSnusOfWeek();
        } else {
            renderSocialFromCache();
        }
        loadBadges();
        if (typeof loadActivityHeatmap === 'function') loadActivityHeatmap();
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

    // 1. Laufende Animationen canceln (kein Layout nötig)
    dexTab.getAnimations().forEach(a => a.cancel());
    dexTab.classList.remove('tab-dex-entering');
    dexTab.style.willChange = 'opacity, transform';

    // 2. Scroll auf 0 BEVOR tab-dex-hidden entfernt wird – verhindert dass
    //    CSS Scroll Anchoring den Scroll korrigiert wenn der lange Alpha-Content
    //    in den Flow zurückkehrt.
    window.scrollTo(0, 0);

    // 3. Aus dem hidden-Zustand holen
    dexTab.classList.remove('tab-dex-hidden');
    dexTab.dataset.tabState = 'visible';

    // 4. Web Animations API statt void offsetWidth + CSS-Klasse.
    //    fill:'both' wendet den from-Keyframe (opacity:0) SOFORT synchron an –
    //    kein Reflow nötig, kein schwarzes Frame zwischen Tab-Wechsel und
    //    Animations-Start. commitStyles() schreibt den End-Zustand als
    //    Inline-Style, cancel() gibt die fill-mode-Sperre frei.
    const anim = dexTab.animate(
        [
            { opacity: '0', transform: 'translateY(12px)' },
            { opacity: '1', transform: 'translateY(0)'    }
        ],
        { duration: 280, easing: 'cubic-bezier(0.4,0,0.2,1)', fill: 'both' }
    );

    anim.onfinish = () => {
        anim.commitStyles();
        anim.cancel();
        dexTab.style.willChange = '';
    };

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

// ==========================================
// DESKTOP & PC SHORTCUTS (ENTER & ESCAPE)
// ==========================================

document.addEventListener('keydown', (e) => {
    // 1. Enter key in auth fields -> submit/sign in
    if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        const authOverlay = document.getElementById('auth-overlay');
        if (activeEl && activeEl.tagName === 'INPUT' && authOverlay && authOverlay.contains(activeEl)) {
            e.preventDefault();

            const usernameView = document.getElementById('auth-username-view');
            const verifyView = document.getElementById('auth-verify-view');
            const mainView = document.getElementById('auth-main-view');

            if (usernameView && !usernameView.classList.contains('hidden')) {
                if (typeof saveSetupUsername === 'function') saveSetupUsername();
            } else if (verifyView && !verifyView.classList.contains('hidden')) {
                if (typeof handleCodeVerification === 'function') handleCodeVerification();
            } else if (mainView && !mainView.classList.contains('hidden')) {
                if (typeof handleLoginWrapper === 'function') handleLoginWrapper();
            }
        }
    }

    // 2. Escape key -> close active overlay/modal
    if (e.key === 'Escape') {
        const overlays = [
            { id: 'badge-unlock-overlay', close: () => typeof closeBadgeUnlock === 'function' && closeBadgeUnlock() },
            { id: 'legality-modal', close: () => typeof closeLegalityModal === 'function' && closeLegalityModal() },
            { id: 'remove-favorite-modal', close: () => typeof closeRemoveFavoriteModal === 'function' && closeRemoveFavoriteModal() },
            { id: 'not-found-modal', close: () => typeof closeNotFoundModal === 'function' && closeNotFoundModal() },
            { id: 'scan-help-modal', close: () => typeof closeScanHelpModal === 'function' && closeScanHelpModal() },
            { id: 'snus-modal', close: () => typeof closeSnusDetail === 'function' && closeSnusDetail() },
            { id: 'scan-modal', close: () => typeof closeScanModal === 'function' && closeScanModal() },
            { id: 'all-scans-modal', close: () => typeof closeAllScansModal === 'function' && closeAllScansModal() },
            { id: 'badges-grid-page', close: () => typeof closeBadgesGrid === 'function' && closeBadgesGrid() },
            { id: 'settings-subpage', close: () => typeof closeSettingsSubpage === 'function' && closeSettingsSubpage() },
            { id: 'settings-page', close: () => typeof closeSettingsPage === 'function' && closeSettingsPage() },
            { id: 'github-page', close: () => typeof closeGithubPage === 'function' && closeGithubPage() },
            { id: 'blocked-users-page', close: () => typeof closeBlockedUsersPage === 'function' && closeBlockedUsersPage() },
            { id: 'friend-profile-page', close: () => typeof closeFriendProfilePage === 'function' && closeFriendProfilePage() },
            { id: 'connections-page', close: () => typeof closeConnectionsPage === 'function' && closeConnectionsPage() }
        ];

        for (const overlay of overlays) {
            const el = document.getElementById(overlay.id);
            if (el && !el.classList.contains('hidden')) {
                e.preventDefault();
                overlay.close();
                break; // Only close the topmost active overlay
            }
        }
    }
});

