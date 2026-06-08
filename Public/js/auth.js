// ==========================================
// 2. AUTHENTIFIZIERUNG, UI & GREETING
// ==========================================

let isLoginMode = true;
let currentUsername = ''; // Globaler Cache für den aktuellen Usernamen

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

    greetingElement.innerHTML = `${message}, <span class="text-white font-semibold">${displayIdent}</span>`;
}

// ==========================================
// GOOGLE ANMELDUNG
// ==========================================

async function signInWithGoogle() {
    const btnText = document.getElementById('google-btn-text');
    const btn = document.getElementById('google-login-btn');

    if (!supabaseClient || !supabaseClient.auth) {
        console.error("Supabase Client missing!");
        alert("Connecting to server... Please try again in 2 seconds.");
        return;
    }

    try {
        // UI Feedback
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

        // Reset label depending on current mode
        btnText.innerText = isLoginMode ? t('auth.signInWithGoogle') : t('auth.registerWithGoogle');
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

// ==========================================
// DEINE ALTE CHECK USER LOGIK (Unverändert)
// ==========================================
async function checkUser() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        const overlay = document.getElementById('auth-overlay');

        if (session) {
            // Check if username exists (important for Google Login)
            const hasUsername = session.user.user_metadata?.username;

            if (!hasUsername) {
                const usernameView = document.getElementById('auth-username-view');
                if (!usernameView) {
                    console.error("HTML element 'auth-username-view' missing!");
                    return;
                }

                // Show the auth card (in case email-check screen is showing)
                document.getElementById('auth-card')?.classList.remove('hidden');
                document.getElementById('email-check-screen')?.classList.add('hidden');

                document.getElementById('auth-main-view')?.classList.add('hidden');
                document.getElementById('auth-verify-view')?.classList.add('hidden');
                usernameView.classList.remove('hidden');
                if (document.getElementById('auth-subtitle')) document.getElementById('auth-subtitle').innerText = t('auth.almostThere');
                return;
            }

            overlay.classList.add('opacity-0');
            setTimeout(() => {
                overlay.classList.add('hidden');
                const nav = document.getElementById('main-nav');
                if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = ''; }
                const tabHome = document.getElementById('tab-home');
                if (tabHome) tabHome.classList.remove('pre-auth');
                // Re-apply card appearance now that the card is visible and has real dimensions.
                // Canvas-based animations (ripple, GoL, cubes) size the canvas at init time,
                // so if called while the card was hidden/zero-size they need a fresh init.
                if (typeof applyCardAppearance !== 'undefined' && typeof getLocalCardAppearance !== 'undefined') {
                    applyCardAppearance('metal-card-container', getLocalCardAppearance());
                }
            }, 500);

            // Scroll home to top after login
            window.scrollTo(0, 0);

            // Seed profile cache immediately on login
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
                } catch (e) { /* ignore */ }
            })();

            setupProfile(session.user);

            loadDex();
            loadUsageData();

            updateGreeting();
        } else {
            overlay.classList.remove('hidden', 'opacity-0');
        }
    } catch (err) {
        console.error("Session check failed:", err);
        document.getElementById('auth-overlay').classList.remove('hidden', 'opacity-0');
    }
}

// ==========================================
// AUTH ERROR ANIMATIONS
// ==========================================
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

// ── Password strength checklist ──
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
    const el = document.getElementById('auth-pw-checklist');
    if (!el || !el.classList.contains('hidden')) return;
    el.classList.remove('hidden');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    });
}

function hidePwChecklist() {
    const el = document.getElementById('auth-pw-checklist');
    if (!el || el.classList.contains('hidden')) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => {
        el.classList.add('hidden');
        _pwReqs.forEach(req => setPwReqMet(req.id, false));
    }, 250);
}

window.onPwFocus = function() {
    showPwChecklist();
    const pw = document.getElementById('auth-password');
    if (pw) updatePwChecklist(pw.value);
};

// ── Username field error ──
function showUsernameError(msg) {
    const group = document.getElementById('auth-username-group');
    if (group) group.style.borderColor = 'rgba(255,59,48,0.5)';
    const el = document.getElementById('auth-username-error');
    if (!el) return;
    el.textContent = msg;
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

function hideUsernameError() {
    const group = document.getElementById('auth-username-group');
    if (group) group.style.borderColor = '';
    const el = document.getElementById('auth-username-error');
    if (!el || el.classList.contains('hidden')) return;
    el.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => el.classList.add('hidden'), 180);
}
window.hideUsernameError = hideUsernameError;

function checkAndHideAllFieldsError() {
    const email    = (document.getElementById('auth-email')?.value    || '').trim();
    const password = (document.getElementById('auth-password')?.value || '');
    const username = !isLoginMode
        ? (document.getElementById('auth-username')?.value || '').trim()
        : 'ok';
    const birthdate = !isLoginMode
        ? (document.getElementById('auth-birthdate')?.value || '')
        : 'ok';
    if (email && password && username && birthdate) {
        hideAuthFieldError('auth-error');
        hideBirthdateError();
    }
}
window.checkAndHideAllFieldsError = checkAndHideAllFieldsError;

function showBirthdateError(msg) {
    const group = document.getElementById('auth-birthdate-group');
    if (group) group.style.borderColor = 'rgba(255,59,48,0.5)';
    const el = document.getElementById('auth-birthdate-error');
    if (!el) return;
    el.textContent = msg;
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

function hideBirthdateError() {
    const group = document.getElementById('auth-birthdate-group');
    if (group) group.style.borderColor = '';
    const el = document.getElementById('auth-birthdate-error');
    if (!el || el.classList.contains('hidden')) return;
    el.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => el.classList.add('hidden'), 180);
}
window.hideBirthdateError = hideBirthdateError;

function hideSetupBirthdateError() {
    hideAuthFieldError('setup-username-error');
}
window.hideSetupBirthdateError = hideSetupBirthdateError;

// ==========================================
// NEU: USERNAME SETUP NACH GOOGLE LOGIN
// ==========================================
async function saveSetupUsername() {
    const usernameInput = document.getElementById('setup-username').value.trim();
    const birthdateInput = document.getElementById('setup-birthdate').value;
    const btn = document.getElementById('setup-username-btn');

    if (!usernameInput) {
        showAuthFieldError('setup-username-error', 'setup-username-error-msg', t('auth.enterUsername'));
        return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/;
    if (!usernameRegex.test(usernameInput)) {
        showAuthFieldError('setup-username-error', 'setup-username-error-msg', t('auth.usernameFormat'));
        return;
    }

    if (!birthdateInput) {
        showAuthFieldError('setup-username-error', 'setup-username-error-msg', t('auth.birthdateRequired'));
        return;
    }

    const birthDateObj = new Date(birthdateInput);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }

    if (age < 18) {
        showAuthFieldError('setup-username-error', 'setup-username-error-msg', t('auth.underage'));
        return;
    }

    btn.disabled = true;
    btn.innerText = t('editProfile.saving');

    try {
        const { error: updateError } = await supabaseClient.auth.updateUser({
            data: { 
                username: usernameInput,
                birthdate: birthdateInput
            }
        });
        if (updateError) throw updateError;

        const { data: userData } = await supabaseClient.auth.getUser();
        if (userData?.user) {
            await supabaseClient.from('profiles').update({ username: usernameInput }).eq('id', userData.user.id);
            await supabaseClient.from('user_ages').upsert({ user_id: userData.user.id, birthdate: birthdateInput });
        }

        hideAuthFieldError('setup-username-error');
        checkUser();
    } catch (error) {
        showAuthFieldError('setup-username-error', 'setup-username-error-msg', error.message);
        btn.disabled = false;
        btn.innerText = t('auth.continue');
    }
}

async function handleLogout(btn) {
    if (btn) {
        btn.innerHTML = `<div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-[#FF3B30]/10 flex items-center justify-center"><svg class="animate-spin h-4 w-4 text-[#FF3B30]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div><span class="text-[#FF3B30] text-[17px] font-medium">${t('auth.signingOut')}</span></div>`;
        btn.disabled = true;
    }
    const {
        error
    } = await supabaseClient.auth.signOut();
    if (!error) {
        // Clean up supporter badge overlay shown keys from localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('supporter_badge_shown_')) {
                localStorage.removeItem(key);
            }
        }
        localStorage.removeItem('cached_badges');
        localStorage.removeItem('cached_user_badges');
        localStorage.removeItem('cached_badge_progress');
        window.location.reload();
    }
}

// ==========================================
// NEU: UI TOGGLE (Login <-> Register)
// ==========================================
function toggleAuthMode() {
    isLoginMode = !isLoginMode;

    const registerFields = document.getElementById('register-fields');
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
    hideUsernameError();

    if (isLoginMode) {
        registerFields.classList.add('hidden');
        registerConfirmWrap?.classList.add('hidden');
        subtitle.setAttribute('data-i18n', 'auth.welcomeBack');
        subtitle.innerText = t('auth.welcomeBack');
        mainBtn.innerText = t('auth.signIn');
        toggleText.innerText = t('auth.dontHaveAccount');
        if (toggleBtnText) toggleBtnText.innerText = t('auth.register');
        if (googleBtnText) googleBtnText.innerText = t('auth.signInWithGoogle');
        if (appleBtnText) appleBtnText.innerText = t('auth.signInWithApple');
    } else {
        registerFields.classList.remove('hidden');
        registerConfirmWrap?.classList.remove('hidden');
        subtitle.setAttribute('data-i18n', 'auth.createAccount');
        subtitle.innerText = t('auth.createAccount');
        mainBtn.innerText = t('auth.register');
        toggleText.innerText = t('auth.alreadyHaveAccount');
        if (toggleBtnText) toggleBtnText.innerText = t('auth.signIn');
        if (googleBtnText) googleBtnText.innerText = t('auth.registerWithGoogle');
        if (appleBtnText) appleBtnText.innerText = t('auth.registerWithApple');
    }
}

// ==========================================
// NEU: DER MASTER BUTTON (Login & Register)
// ==========================================
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
        // --- LOGIN ---
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
        // --- REGISTER ---
        const username = document.getElementById('auth-username').value.trim();
        const passwordConfirm = document.getElementById('auth-password-confirm').value;
        const birthdate = document.getElementById('auth-birthdate').value;

        // 1. Username must be present
        if (!username) {
            showAuthFieldError('auth-error', 'auth-error-msg', t('auth.fillAllFields'));
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
            return;
        }
        if (!/^[a-zA-Z0-9_]{2,30}$/.test(username)) {
            showUsernameError(t('auth.usernameFormat'));
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
            return;
        }

        // 1.5 Birthdate must be present and user must be at least 18
        if (!birthdate) {
            const birthGroup = document.getElementById('auth-birthdate-group');
            if (birthGroup) birthGroup.style.borderColor = 'rgba(255,59,48,0.5)';
            showBirthdateError(t('auth.birthdateRequired'));
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
            return;
        }

        const birthDateObj = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const m = today.getMonth() - birthDateObj.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }

        if (age < 18) {
            const birthGroup = document.getElementById('auth-birthdate-group');
            if (birthGroup) birthGroup.style.borderColor = 'rgba(255,59,48,0.5)';
            showBirthdateError(t('auth.underage'));
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
            return;
        }
        hideBirthdateError();

        // 2. Password requirements must all be met
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

        // 3. Passwords must match
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

        // Passwords match → clear any pw error before submit
        hidePwGroupError();

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { data: { username: username, birthdate: birthdate } }
        });

        if (error) {
            showAuthFieldError('auth-error', 'auth-error-msg',
                error.message.includes('already registered')
                    ? t('auth.emailInUse')
                    : error.message
            );
            triggerHapticFeedback();
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
        } else {
            showEmailCheckScreen(email);
            mainBtn.disabled = false;
            mainBtn.innerText = t('auth.register');
        }
    }
}

// Show the email confirmation screen after successful sign-up
function showEmailCheckScreen(email) {
    const authCard = document.getElementById('auth-card');
    const emailCheckScreen = document.getElementById('email-check-screen');
    const emailAddressEl = document.getElementById('email-check-address');

    if (emailAddressEl) emailAddressEl.innerText = email;
    if (authCard) authCard.classList.add('hidden');
    if (emailCheckScreen) emailCheckScreen.classList.remove('hidden');
}

// Return to sign-in form from the email-check screen with email pre-filled
function goToSignInFromEmailCheck() {
    const authCard = document.getElementById('auth-card');
    const emailCheckScreen = document.getElementById('email-check-screen');
    const emailInput = document.getElementById('auth-email');
    const emailAddressEl = document.getElementById('email-check-address');

    // Pre-fill email
    if (emailInput && emailAddressEl) {
        emailInput.value = emailAddressEl.innerText;
    }

    // Switch back to login mode if currently in register mode
    if (!isLoginMode) toggleAuthMode();

    if (emailCheckScreen) emailCheckScreen.classList.add('hidden');
    if (authCard) authCard.classList.remove('hidden');
}

// Legacy OTP-view stubs — the auth-verify-view HTML is kept for compatibility
// but Email Link is the active flow; these prevent JS errors if the view is shown.
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

