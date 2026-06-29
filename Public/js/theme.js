(function () {
    'use strict';

    const STORAGE_KEY = 'snusTheme';
    const VALID = ['light', 'dark', 'system'];

    function getStored() {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            return VALID.includes(v) ? v : 'system';
        } catch (_) { return 'system'; }
    }

    function systemPrefersLight() {
        return typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-color-scheme: light)').matches;
    }

    function resolve(pref) {
        if (pref === 'light') return 'light';
        if (pref === 'dark')  return 'dark';
        return systemPrefersLight() ? 'light' : 'dark';
    }

    function apply(resolved) {
        const root = document.documentElement;

        root.classList.toggle('light', resolved === 'light');
        root.classList.toggle('dark',  resolved === 'dark');

        ['splash-screen', 'auth-overlay', 'preview-card-wrapper'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.hasAttribute('data-theme-aware')) {
                el.setAttribute('data-theme-aware', '1');
            }
        });

        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = resolved === 'light' ? '#F2F2F7' : '#000000';

        updateThemeBadge();
    }

    function updateThemeBadge() {
        const badge = document.getElementById('settings-theme-badge');
        if (!badge) return;
        const pref = getStored();
        const key = pref === 'light'  ? 'appearance.themeLight'
                  : pref === 'dark'   ? 'appearance.themeDark'
                                      : 'appearance.themeSystem';
        badge.textContent = (typeof window.t === 'function') ? window.t(key) : pref;
    }

    document.addEventListener('i18n:applied', updateThemeBadge);

    function setTheme(pref) {
        if (!VALID.includes(pref)) pref = 'system';
        try { localStorage.setItem(STORAGE_KEY, pref); } catch (_) {}
        const resolved = resolve(pref);
        apply(resolved);
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { preference: pref, resolved }
        }));
    }

    function getTheme()         { return getStored(); }
    function getResolvedTheme() { return resolve(getStored()); }

    if (typeof window.matchMedia === 'function') {
        const mql = window.matchMedia('(prefers-color-scheme: light)');
        const onChange = () => {
            if (getStored() === 'system') {
                const resolved = resolve('system');
                apply(resolved);
                document.dispatchEvent(new CustomEvent('themechange', {
                    detail: { preference: 'system', resolved }
                }));
            }
        };
        if (mql.addEventListener) mql.addEventListener('change', onChange);
        else if (mql.addListener) mql.addListener(onChange);
    }

    apply(resolve(getStored()));

    window.SnusTheme = { setTheme, getTheme, getResolvedTheme, updateThemeBadge };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateThemeBadge, { once: true });
    } else {
        updateThemeBadge();
    }
})();
