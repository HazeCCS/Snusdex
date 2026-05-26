// ============================================================================
// theme.js — Light/Dark/System theme controller
// ----------------------------------------------------------------------------
// Storage key:  'snusTheme'  values: 'light' | 'dark' | 'system'  (default 'system')
//
// Architecture:
//   • An inline script in index.html (`<head>`) calls applyInitialTheme() before
//     paint so there is no flash of the wrong theme. That inline script also
//     defines window.__SNUS_THEME_INIT__ = true so this file knows the early
//     boot already ran.
//   • This file then exposes the public API: setTheme(), getTheme(),
//     getResolvedTheme(), and a `themechange` CustomEvent on document.
// ============================================================================

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
        // Two classes ensure CSS can target either, and removes ambiguity.
        root.classList.toggle('light', resolved === 'light');
        root.classList.toggle('dark',  resolved === 'dark');

        // Tag elements whose inline `style="background:#000"` would otherwise
        // win over theme.css. theme.css uses [data-theme-aware="1"] selectors
        // to override these. We tag them once at load time.
        ['splash-screen', 'auth-overlay', 'preview-card-wrapper'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.hasAttribute('data-theme-aware')) {
                el.setAttribute('data-theme-aware', '1');
            }
        });

        // Sync the browser chrome (status bar / scrollbar) with theme
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = resolved === 'light' ? '#FFFFFF' : '#000000';

        updateThemeBadge();
    }

    // Updates the right-aligned badge on the "Appearance" settings row to show
    // the current preference (Light / Dark / System), translated.
    function updateThemeBadge() {
        const badge = document.getElementById('settings-theme-badge');
        if (!badge) return;
        const pref = getStored();
        const key = pref === 'light'  ? 'appearance.themeLight'
                  : pref === 'dark'   ? 'appearance.themeDark'
                                      : 'appearance.themeSystem';
        badge.textContent = (typeof window.t === 'function') ? window.t(key) : pref;
    }
    // Re-translate the badge when language changes (applyTranslations fires).
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

    // React to system theme changes when the user is on 'system'.
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
        else if (mql.addListener) mql.addListener(onChange);  // Safari < 14 fallback
    }

    // If the inline head-script already ran, just (re-)apply to be safe;
    // otherwise this file is the first to set the theme class.
    apply(resolve(getStored()));

    window.SnusTheme = { setTheme, getTheme, getResolvedTheme, updateThemeBadge };

    // Some elements (the settings badge) only exist after the DOM is parsed.
    // Re-apply once it's ready so the badge populates.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateThemeBadge, { once: true });
    } else {
        updateThemeBadge();
    }
})();
