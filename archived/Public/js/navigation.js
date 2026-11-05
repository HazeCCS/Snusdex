let _navAnimRaf = null;
let _navAnimTimer = null;

function switchTab(tabId) {
    const dexTab     = document.getElementById('tab-dex');
    const isDexTarget = tabId === 'dex';

    if (isDexTarget) {
        if (dexTab && dexTab.dataset.tabState === 'visible') return;
    } else {
        const target = document.getElementById(`tab-${tabId}`);
        if (!target || !target.classList.contains('hidden')) return;
    }

    if (_navAnimRaf)   { cancelAnimationFrame(_navAnimRaf); _navAnimRaf = null; }
    if (_navAnimTimer) { clearTimeout(_navAnimTimer);       _navAnimTimer = null; }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isActive = btn.id === `btn-${tabId}`;
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-[#8E8E93]', !isActive);
    });

    if (isDexTarget) {

        document.querySelectorAll('.tab-content').forEach(tab => {
            if (tab.id !== 'tab-dex') tab.classList.add('hidden');
        });

        _showDexTab();

    } else {
        const nextTab = document.getElementById(`tab-${tabId}`);

        if (nextTab) nextTab.classList.remove('hidden');

        document.querySelectorAll('.tab-content').forEach(tab => {
            if (tab.id === 'tab-dex' || tab.id === `tab-${tabId}`) return;
            tab.classList.add('hidden');
        });

        _hideDexTab();

        window.scrollTo(0, 0);
    }

    if (tabId === 'home') {

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
        if (!_socialCacheData) {
            loadTopSnusOfWeek();
        } else {
            renderSocialFromCache();
            if (typeof checkAndReloadSocialSilently === 'function') {
                checkAndReloadSocialSilently();
            }
        }
        loadBadges();
        if (typeof loadActivityHeatmap === 'function') loadActivityHeatmap();

        if (typeof updateCreatorsPickScrollButtons === 'function') {
            updateCreatorsPickScrollButtons();
            setTimeout(updateCreatorsPickScrollButtons, 100);
            setTimeout(updateCreatorsPickScrollButtons, 300);
        }
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
            } catch (e) {  }
        })();
    } else {
        window._profileCache = null;
    }
}

function _showDexTab() {
    const dexTab = document.getElementById('tab-dex');
    if (!dexTab) return;

    dexTab.getAnimations().forEach(a => a.cancel());
    dexTab.classList.remove('tab-dex-entering');
    dexTab.style.willChange = 'opacity, transform';

    window.scrollTo(0, 0);

    dexTab.classList.remove('tab-dex-hidden');
    dexTab.dataset.tabState = 'visible';

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

function _hideDexTab() {
    const dexTab = document.getElementById('tab-dex');
    if (!dexTab) return;

    dexTab.style.transition = '';
    dexTab.style.opacity    = '';
    dexTab.style.transform  = '';
    dexTab.classList.remove('tab-dex-entering');

    dexTab.classList.add('tab-dex-hidden');
    dexTab.dataset.tabState = 'hidden';
}

function switchTabWrapper(tabId) {
    triggerHapticFeedback();
    switchTab(tabId);
}

document.addEventListener('keydown', (e) => {

    if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        const authOverlay = document.getElementById('auth-overlay');
        if (activeEl && activeEl.tagName === 'INPUT' && authOverlay && authOverlay.contains(activeEl)) {
            e.preventDefault();

            const verifyView = document.getElementById('auth-verify-view');
            const mainView = document.getElementById('auth-main-view');
            const birthdateView = document.getElementById('onboarding-birthdate-view');
            const setupView = document.getElementById('onboarding-setup-view');

            if (verifyView && !verifyView.classList.contains('hidden')) {
                if (typeof handleCodeVerification === 'function') handleCodeVerification();
            } else if (mainView && !mainView.classList.contains('hidden')) {
                if (typeof handleLoginWrapper === 'function') handleLoginWrapper();
            } else if (birthdateView && !birthdateView.classList.contains('hidden')) {
                if (typeof Onboarding !== 'undefined') Onboarding.submitBirthdate();
            } else if (setupView && !setupView.classList.contains('hidden')) {
                if (typeof Onboarding !== 'undefined') Onboarding.nextSetupStep();
            }
        }
    }

    if (e.key === 'Escape') {
        const overlays = [
            { id: 'debug-portal-modal', close: () => typeof closeDebugPortal === 'function' && closeDebugPortal() },
            { id: 'badge-unlock-overlay', close: () => typeof closeBadgeUnlock === 'function' && closeBadgeUnlock() },
            { id: 'legality-modal', close: () => typeof closeLegalityModal === 'function' && closeLegalityModal() },
            { id: 'remove-favorite-modal', close: () => typeof closeRemoveFavoriteModal === 'function' && closeRemoveFavoriteModal() },
            { id: 'card-requirements-modal', close: () => typeof closeCardRequirementsModal === 'function' && closeCardRequirementsModal() },
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
                break;
            }
        }
    }
});
