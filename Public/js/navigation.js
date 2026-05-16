// ==========================================
// 3. NAVIGATION (TABS)
// ==========================================

function switchTab(tabId) {
    const dexTab = document.getElementById('tab-dex');
    const isDexTarget = tabId === 'dex';

    // Früh-Abbruch: Tab schon aktiv?
    if (isDexTarget) {
        if (!dexTab.classList.contains('tab-dex-hidden')) return;
    } else {
        const activeTab = document.getElementById(`tab-${tabId}`);
        if (!activeTab || !activeTab.classList.contains('hidden')) return;
    }

    if (isDexTarget) {
        // 1. Alte Tabs sofort ausblenden
        document.querySelectorAll('.tab-content').forEach(tab => {
            if (tab.id === 'tab-dex') return;
            tab.classList.add('hidden');
        });

        // 2. Dex einblenden – opacity wird via CSS-Animation gehandhabt
        dexTab.classList.remove('tab-dex-hidden');

        // 3. Forced reflow so animation fires fresh every time
        void dexTab.offsetWidth;

        // 4. Fade-in Animation forcieren: Klasse kurz entfernen + neu setzen
        dexTab.style.opacity = '0';
        dexTab.style.transform = 'scale(0.98)';
        dexTab.style.transition = 'opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                dexTab.style.opacity = '1';
                dexTab.style.transform = 'scale(1)';
                window.scrollTo(0, 0);
                updateDexScale();
                // Clean up inline styles after animation completes
                setTimeout(() => {
                    dexTab.style.transition = '';
                    dexTab.style.opacity = '';
                    dexTab.style.transform = '';
                }, 320);
            });
        });
    } else {
        // Nicht-Dex: Dex layout-erhaltend ausblenden, neuen Tab einblenden.
        // Reihenfolge: neuen Tab zuerst zeigen → kein schwarzes Frame.
        const nextTab = document.getElementById(`tab-${tabId}`);
        if (nextTab) nextTab.classList.remove('hidden');

        // Alle anderen Tabs (außer Dex und Ziel) ausblenden
        document.querySelectorAll('.tab-content').forEach(tab => {
            if (tab.id === 'tab-dex' || tab.id === `tab-${tabId}`) return;
            tab.classList.add('hidden');
        });

        // Dex layout-erhaltend verstecken (kein display:none → kein Reflow)
        // Reset any leftover inline styles first
        dexTab.style.transition = '';
        dexTab.style.opacity = '';
        dexTab.style.transform = '';
        dexTab.classList.add('tab-dex-hidden');

        // Scroll nach oben
        window.scrollTo(0, 0);
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const isActive = btn.id === `btn-${tabId}`;
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-[#8E8E93]', !isActive);
    });


    if (tabId === 'home' && displayedXp !== null && actualXp !== null && displayedXp !== actualXp) {
        setTimeout(() => {
            const level = Math.floor(actualXp / 300) + 1;
            animateXp(displayedXp, actualXp, level);
        }, 200);
    }

    if (tabId === 'social') {
        // Nur neu laden wenn Cache abgelaufen oder leer
        const now = Date.now();
        if (!_socialCacheData || (now - _socialCacheTime) > SOCIAL_CACHE_TTL) {
            loadTopSnusOfWeek();
        } else {
            // Cache-Daten sofort rendern (kein Netzwerk-Wait)
            renderSocialFromCache();
        }
        // Badges immer aus Cache laden (sehr schnell)
        loadBadges();
    }

    if (tabId === 'profile') {
        // Pre-fetch profile data so Edit Profile opens instantly with real values
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
        // Clear cache when leaving profile tab
        window._profileCache = null;
    }
}
