let isLoginMode = true;
let currentUsername = '';

function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;

    const displayIdent = currentUsername || t('home.collectorId');
    const hour = new Date().getHours();
    let message = '';

    if (hour >= 5 && hour < 12) message = t('greeting.morning');
    else if (hour >= 12 && hour < 18) message = t('greeting.afternoon');
    else if (hour >= 18 && hour < 22) message = t('greeting.evening');
    else message = t('greeting.night');

    greetingElement.innerHTML = `${message}, <span style="color:rgba(255,255,255,0.95);font-weight:600;">${displayIdent}</span>`;
}

async function signInWithGoogle() {
    const btnText = document.getElementById('google-btn-text');
    const btn = document.getElementById('google-login-btn');

    if (!supabaseClient || !supabaseClient.auth) {
        console.error("Supabase Client missing!");
        alert("Connecting to server... Please try again in 2 seconds.");
        return;
    }

    try {

        btnText.innerText = t('auth.openingGoogle');
        btn.disabled = true;
        btn.style.opacity = "0.7";
        const redirectUrl = window.location.origin + window.location.pathname;

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    prompt: 'select_account',
                    access_type: 'offline'
                }
            }
        });

        if (error) throw error;

        if (data?.url) {
            window.location.href = data.url;
        }

    } catch (error) {
        console.error("Google Login Error:", error.message);
        alert("Login error: " + error.message);

        btnText.innerText = isLoginMode ? t('auth.signInWithGoogle') : t('auth.registerWithGoogle');
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

async function checkUser() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        const overlay = document.getElementById('auth-overlay');

        if (session) {

            localStorage.setItem('hasCompletedOnboarding', 'true');

            const hasUsername = session.user.user_metadata?.username;

            if (!hasUsername) {
                if (document.getElementById('auth-subtitle')) document.getElementById('auth-subtitle').innerText = t('auth.almostThere');
                if (typeof Onboarding !== 'undefined') Onboarding.enterOAuthFlow();
                return;
            }

            overlay.classList.add('opacity-0');
            setTimeout(() => {
                overlay.classList.add('hidden');
                const nav = document.getElementById('main-nav');
                if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = ''; }
                const tabHome = document.getElementById('tab-home');
                if (tabHome) tabHome.classList.remove('pre-auth');

                if (typeof applyCardAppearance !== 'undefined' && typeof getLocalCardAppearance !== 'undefined') {
                    applyCardAppearance('metal-card-container', getLocalCardAppearance());
                }
                if (typeof CardCanvasRenderer !== 'undefined') {
                    CardCanvasRenderer.destroy(document.getElementById('auth-metal-container'));
                }
            }, 500);

            window.scrollTo(0, 0);

            (async () => {
                try {
                    const { data: profile } = await supabaseClient
                        .from('profiles')
                        .select('username, username_changes, username_last_reset')
                        .eq('id', session.user.id).single();
                    const now = new Date();
                    const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
                    const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
                    const remaining = Math.max(0, 3 - (sameMonth ? (profile?.username_changes || 0) : 0));
                    window._profileCache = { email: session.user.email, username: profile?.username || session.user.user_metadata?.username || '', remaining };
                    window._cachedUsernameChangesRemaining = remaining;
                } catch (e) {  }
            })();

            setupProfile(session.user);

            loadDex();
            loadUsageData();

            updateGreeting();
        } else {
            overlay.classList.remove('hidden', 'opacity-0');
            if (!localStorage.getItem('hasCompletedOnboarding') && typeof Onboarding !== 'undefined') {
                Onboarding.showStart();
            }
        }
    } catch (err) {
        console.error("Session check failed:", err);
        document.getElementById('auth-overlay').classList.remove('hidden', 'opacity-0');
    }
}

function showAuthFieldError(containerId, msgId, message, maxHeight) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (msgId) {
        const msg = document.getElementById(msgId);
        if (msg) msg.textContent = message;
    }
    if (!el.classList.contains('hidden')) return;
    el.classList.remove('hidden');
    el.style.transition = 'none';
    el.style.maxHeight = '0';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.transition = 'max-height 0.38s cubic-bezier(0.34, 1.15, 0.64, 1), opacity 0.28s ease';
            el.style.maxHeight = maxHeight || '80px';
            el.style.opacity = '1';
        });
    });
}

function hideAuthFieldError(containerId) {
    const el = document.getElementById(containerId);
    if (!el || el.classList.contains('hidden')) return;
    el.style.transition = 'max-height 0.22s ease, opacity 0.18s ease';
    el.style.maxHeight = '0';
    el.style.opacity = '0';
    setTimeout(() => el.classList.add('hidden'), 220);
}

function showPwMismatchError() {
    const el = document.getElementById('auth-pw-error');
    if (!el) return;
    if (!el.classList.contains('hidden')) return;
    el.classList.remove('hidden');
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    });
}

function hidePwMismatchError() {
    const el = document.getElementById('auth-pw-error');
    if (!el || el.classList.contains('hidden')) return;
    el.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => el.classList.add('hidden'), 180);
}

window.hidePwGroupError = function() {
    const pwGroup = document.getElementById('auth-pw-group');
    if (pwGroup) pwGroup.style.borderColor = '';
    hidePwMismatchError();
};

const _pwReqs = [
    { id: 'req-length', test: pw => pw.length >= 6 },
    { id: 'req-upper',  test: pw => /[A-Z]/.test(pw) },
    { id: 'req-number', test: pw => /[0-9]/.test(pw) },
];

function setPwReqMet(reqId, met) {
    const row = document.getElementById(reqId);
    if (!row) return;
    const circle = row.querySelector('.req-circle');
    const check  = row.querySelector('.req-check');
    const warn   = row.querySelector('.req-warn');
    const text   = row.querySelector('.req-text');
    if (met) {
        circle.style.backgroundColor = '#30D158';
        circle.style.borderColor = '#30D158';
        check.style.opacity = '1';
        if (warn) warn.style.opacity = '0';
        text.style.color = '#30D158';
    } else {
        circle.style.backgroundColor = '';
        circle.style.borderColor = 'rgba(255,255,255,0.2)';
        check.style.opacity = '0';
        if (warn) warn.style.opacity = '0';
        text.style.color = 'rgba(255,255,255,0.4)';
    }
}

function flashPwReqWarn(reqId) {
    const row = document.getElementById(reqId);
    if (!row) return;
    const circle = row.querySelector('.req-circle');
    const check  = row.querySelector('.req-check');
    const warn   = row.querySelector('.req-warn');
    const text   = row.querySelector('.req-text');
    circle.style.backgroundColor = '#FF9F0A';
    circle.style.borderColor = '#FF9F0A';
    if (check) check.style.opacity = '0';
    if (warn)  warn.style.opacity = '1';
    text.style.color = '#FF9F0A';
    setTimeout(() => setPwReqMet(reqId, false), 700);
}

function updatePwChecklist(pw) {
    const el = document.getElementById('auth-pw-checklist');
    if (!el || el.classList.contains('hidden')) return;
    _pwReqs.forEach(req => setPwReqMet(req.id, req.test(pw)));
}

function showPwChecklist() {
    if (isLoginMode) return;
    expandAuthBlock(document.getElementById('auth-pw-checklist'));
}

function hidePwChecklist() {
    collapseAuthBlock(document.getElementById('auth-pw-checklist'), 0, () => {
        _pwReqs.forEach(req => setPwReqMet(req.id, false));
    });
}

window.onPwFocus = function() {
    showPwChecklist();
    const pw = document.getElementById('auth-password');
    if (pw) updatePwChecklist(pw.value);
};

function checkAndHideAllFieldsError() {
    const email    = (document.getElementById('auth-email')?.value    || '').trim();
    const password = (document.getElementById('auth-password')?.value || '');
    if (email && password) {
        hideAuthFieldError('auth-error');
    }
}
window.checkAndHideAllFieldsError = checkAndHideAllFieldsError;

async function handleLogout(btn) {
    if (btn) {
        btn.innerHTML = `<div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[#FF3B30]/10 flex items-center justify-center"><svg class="animate-spin h-4 w-4 text-[#FF3B30]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div><span class="text-[#FF3B30] text-[17px] font-medium">${t('auth.signingOut')}</span></div>`;
        btn.disabled = true;
    }
    const {
        error
    } = await supabaseClient.auth.signOut();
    if (!error) {

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('supporter_badge_shown_')) {
                localStorage.removeItem(key);
            }
        }
        localStorage.removeItem('cached_badges');
        localStorage.removeItem('cached_user_badges');
        localStorage.removeItem('cached_badge_progress');
        localStorage.removeItem('lastTrackedDate');
        localStorage.removeItem('streakCount');
        localStorage.removeItem('metalCardColorId');
        localStorage.removeItem('metalCardColorHex');
        localStorage.removeItem('metalCardFont');
        localStorage.removeItem('metalCardAnim');
        localStorage.removeItem('metalCardSaturation');
        localStorage.removeItem('metalCardPattern');
        localStorage.removeItem('metalCardIntensity');
        localStorage.removeItem('dexFavoriteBrands');
        localStorage.removeItem('dexFavoriteSnus');
        localStorage.removeItem('creatorUnlockedAnimations');
        localStorage.removeItem('creatorCodesRedeemed');
        window.location.reload();
    }
}

// Shared timing for every block that grows/shrinks in the auth card (register
// fields, confirm-password, password checklist) so they all read as one
// consistent motion language instead of a patchwork of slightly-off durations.
const AUTH_EXPAND_MS = 500;
const AUTH_COLLAPSE_MS = 320;
const AUTH_EASE_BOUNCE = 'cubic-bezier(0.34, 1.15, 0.64, 1)';

// will-change + backface-visibility hint the browser to promote these blocks
// to their own compositor layer up front, instead of discovering mid-transition
// that they need one — this is what removes the jank/lag on lower-power devices.
function _primeAuthBlockLayer(el) {
    el.style.willChange = 'max-height, opacity, transform';
    el.style.backfaceVisibility = 'hidden';
    el.style.webkitBackfaceVisibility = 'hidden';
}

function _clearAuthBlockLayer(el) {
    el.style.willChange = '';
    el.style.backfaceVisibility = '';
    el.style.webkitBackfaceVisibility = '';
}

// Smoothly expands a collapsed ("hidden") block: grows from 0 height while
// fading + sliding in, measuring the block's own natural height so it works
// regardless of its (dynamic) content. The whole #auth-card recenters itself
// automatically each frame since it's just normal layout (margin:auto).
function expandAuthBlock(el, delay, onDone) {
    if (!el || !el.classList.contains('hidden')) return;
    delay = delay || 0;
    el.classList.remove('hidden');
    _primeAuthBlockLayer(el);
    el.style.overflow = 'hidden';
    el.style.transition = 'none';
    el.style.maxHeight = '0px';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px) scaleY(0.95)';
    el.style.transformOrigin = 'top';
    const target = el.scrollHeight;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.transition = `max-height ${AUTH_EXPAND_MS}ms ${delay}s ${AUTH_EASE_BOUNCE}, opacity ${AUTH_EXPAND_MS * 0.8}ms ${delay}s ease, transform ${AUTH_EXPAND_MS}ms ${delay}s ${AUTH_EASE_BOUNCE}`;
            el.style.maxHeight = target + 'px';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0) scaleY(1)';
        });
    });
    setTimeout(() => {
        el.style.maxHeight = 'none';
        el.style.overflow = '';
        el.style.transform = '';
        el.style.transformOrigin = '';
        _clearAuthBlockLayer(el);
        if (onDone) onDone();
    }, (delay * 1000) + AUTH_EXPAND_MS + 20);
}

// Reverse of expandAuthBlock: shrinks + fades the block out, then hides it.
function collapseAuthBlock(el, delay, onDone) {
    if (!el || el.classList.contains('hidden')) return;
    delay = delay || 0;
    const current = el.scrollHeight;
    _primeAuthBlockLayer(el);
    el.style.overflow = 'hidden';
    el.style.transition = 'none';
    el.style.maxHeight = current + 'px';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scaleY(1)';
    el.style.transformOrigin = 'top';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.transition = `max-height ${AUTH_COLLAPSE_MS}ms ${delay}s ease, opacity ${AUTH_COLLAPSE_MS * 0.75}ms ${delay}s ease, transform ${AUTH_COLLAPSE_MS * 0.94}ms ${delay}s ease`;
            el.style.maxHeight = '0px';
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px) scaleY(0.95)';
        });
    });
    setTimeout(() => {
        el.classList.add('hidden');
        el.style.overflow = '';
        el.style.maxHeight = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.style.transformOrigin = '';
        _clearAuthBlockLayer(el);
        if (onDone) onDone();
    }, (delay * 1000) + AUTH_COLLAPSE_MS + 20);
}

let _subtitleTypeTimer = null;

function typewriteSubtitle(el, text) {
    if (!el) return;
    if (_subtitleTypeTimer) {
        clearTimeout(_subtitleTypeTimer);
        _subtitleTypeTimer = null;
    }
    el.classList.add('typewriter-cursor');

    const ERASE_MS = 14;
    const TYPE_MS = 26;

    function typeForward(i) {
        el.textContent = text.slice(0, i);
        if (i < text.length) {
            _subtitleTypeTimer = setTimeout(() => typeForward(i + 1), TYPE_MS);
        } else {
            _subtitleTypeTimer = setTimeout(() => {
                el.classList.remove('typewriter-cursor');
                _subtitleTypeTimer = null;
            }, 550);
        }
    }

    function eraseBackward(remaining) {
        if (remaining > 0) {
            el.textContent = el.textContent.slice(0, remaining - 1);
            _subtitleTypeTimer = setTimeout(() => eraseBackward(remaining - 1), ERASE_MS);
        } else {
            typeForward(0);
        }
    }

    const currentLength = el.textContent.length;
    if (currentLength > 0) {
        eraseBackward(currentLength);
    } else {
        typeForward(0);
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;

    const registerConfirmWrap = document.getElementById('register-confirm-wrap');
    const subtitle = document.getElementById('auth-subtitle');
    const mainBtn = document.getElementById('auth-main-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleBtnText = document.querySelector('#auth-toggle-btn span.font-semibold');
    const googleBtnText = document.getElementById('google-btn-text');
    const appleBtnText = document.getElementById('apple-btn-text');

    hideAuthFieldError('auth-error');
    hidePwGroupError();
    hidePwChecklist();

    if (isLoginMode) {
        collapseAuthBlock(registerConfirmWrap, 0.05);
        subtitle.setAttribute('data-i18n', 'auth.welcomeBack');
        typewriteSubtitle(subtitle, t('auth.welcomeBack'));
        mainBtn.innerText = t('auth.signIn');
        toggleText.innerText = t('auth.dontHaveAccount');
        if (toggleBtnText) toggleBtnText.innerText = t('auth.register');
        if (googleBtnText) googleBtnText.innerText = t('auth.signInWithGoogle');
        if (appleBtnText) appleBtnText.innerText = t('auth.signInWithApple');
        if (typeof _hideProgress === 'function') _hideProgress();
    } else {
        expandAuthBlock(registerConfirmWrap);
        subtitle.setAttribute('data-i18n', 'auth.createAccount');
        typewriteSubtitle(subtitle, t('auth.createAccount'));
        mainBtn.innerText = t('auth.register');
        toggleText.innerText = t('auth.alreadyHaveAccount');
        if (toggleBtnText) toggleBtnText.innerText = t('auth.signIn');
        if (googleBtnText) googleBtnText.innerText = t('auth.registerWithGoogle');
        if (appleBtnText) appleBtnText.innerText = t('auth.registerWithApple');
        if (typeof _updateProgress === 'function') _updateProgress(0, 4);
    }
}

async function handleLoginWrapper() {
    triggerHapticFeedback();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const mainBtn = document.getElementById('auth-main-btn');

    if (!email || !password) {
        showAuthFieldError('auth-error', 'auth-error-msg', t('auth.fillAllFields'));
        triggerHapticFeedback();
        return;
    }

    mainBtn.disabled = true;
    mainBtn.innerHTML = `<div class="flex items-center justify-center h-[26px]"><svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;

    if (isLoginMode) {

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            showAuthFieldError('auth-error', 'auth-error-msg', t('auth.incorrectCredentials'));
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.signIn');
        } else {
            hideAuthFieldError('auth-error');
            checkUser();
        }
    } else {

        const passwordConfirm = document.getElementById('auth-password-confirm').value;

        const unmetReqs = _pwReqs.filter(req => !req.test(password));
        if (unmetReqs.length > 0) {
            showPwChecklist();
            requestAnimationFrame(() => requestAnimationFrame(() => {
                unmetReqs.forEach(req => flashPwReqWarn(req.id));
            }));
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
            return;
        }

        if (password !== passwordConfirm) {
            const pwGroup = document.getElementById('auth-pw-group');
            if (pwGroup) pwGroup.style.borderColor = 'rgba(255,59,48,0.5)';
            showPwMismatchError();
            hideAuthFieldError('auth-error');
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
            return;
        }

        hidePwGroupError();
        mainBtn.disabled = false;
        mainBtn.innerText = t('auth.register');
        Onboarding.goToBirthdateStep({ email, password });
    }
}

function goToSignInFromEmailCheck() {
    const emailInput = document.getElementById('auth-email');
    const emailAddressEl = document.getElementById('email-check-address');

    if (emailInput && emailAddressEl) {
        emailInput.value = emailAddressEl.innerText;
    }

    Onboarding.goToSignIn('back');
}

function handleCodeVerification() {
    const code = document.getElementById('auth-verify-code')?.value?.trim();
    if (!code || code.length < 6) return;
}
window.handleCodeVerification = handleCodeVerification;

function hideVerificationScreen() {
    document.getElementById('auth-verify-view')?.classList.add('hidden');
    document.getElementById('auth-main-view')?.classList.remove('hidden');
}
window.hideVerificationScreen = hideVerificationScreen;
