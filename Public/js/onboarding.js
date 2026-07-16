const MANAGED_ONBOARDING_VIEWS = ['onboarding-start-view', 'auth-main-view', 'onboarding-birthdate-view', 'onboarding-setup-view', 'onboarding-emailcheck-view'];
const STRETCH_ONBOARDING_VIEWS = ['onboarding-birthdate-view', 'onboarding-setup-view', 'onboarding-emailcheck-view'];
const SETUP_STEPS = ['pouch', 'displayname'];

// Shared slide-swipe motion for every step transition in the onboarding flow
// (view swaps AND the pouch <-> displayname content swap within the
// setup view), so the whole flow reads as one consistent left/right "carousel"
// gesture instead of hard cuts. Same curve as the app's existing bottom-sheet
// transitions for visual consistency. Full 100%-of-own-width slide (not a small
// px nudge) — a short distance combined with a simultaneous opacity crossfade
// just double-exposes two very different pieces of text on top of each other
// instead of reading as a swipe.
const ONB_SLIDE_MS = 340;
const ONB_SLIDE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

let _onbState = {
    email: null,
    password: null,
    birthdate: null,
    pouchTracking: false,
    language: (typeof window.currentLang !== 'undefined' ? window.currentLang : (localStorage.getItem('appLang') || 'en')),
    username: '',
    isOAuth: false,
};
let _setupIndex = 0;

// direction: 'forward' | 'back' | undefined (undefined = instant, no animation —
// used for the very first view shown on cold load / after an OAuth redirect
// reload, where an animate-in would just look like a glitch).
function _slideViewTransition(incomingId, direction) {
    const incoming = document.getElementById(incomingId);
    if (!incoming) return;
    const outgoing = MANAGED_ONBOARDING_VIEWS
        .map(v => document.getElementById(v))
        .find(el => el && el !== incoming && !el.classList.contains('hidden'));

    if (!direction || !outgoing) {
        MANAGED_ONBOARDING_VIEWS.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.toggle('hidden', el !== incoming);
        });
        return;
    }

    const outDist = direction === 'forward' ? '-100%' : '100%';
    const inStart = direction === 'forward' ? '100%' : '-100%';

    // Taking the outgoing view out of flow lets the incoming view lay out (and
    // size #auth-card) immediately in its final place, while the outgoing view
    // visually overlays on top of it for the duration of the slide-out. Must
    // freeze its CURRENT offsetTop before going absolute — "top: 0" would jump
    // it to #auth-card's very top edge (behind the logo header) instead of
    // staying where it visually was.
    const outgoingTop = outgoing.offsetTop;
    outgoing.style.position = 'absolute';
    outgoing.style.left = '0';
    outgoing.style.right = '0';
    outgoing.style.top = outgoingTop + 'px';
    outgoing.style.transition = 'none';
    outgoing.style.transform = 'translateX(0)';

    incoming.classList.remove('hidden');
    incoming.style.transition = 'none';
    incoming.style.transform = `translateX(${inStart})`;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            outgoing.style.transition = `transform ${ONB_SLIDE_MS}ms ${ONB_SLIDE_EASE}`;
            outgoing.style.transform = `translateX(${outDist})`;

            incoming.style.transition = `transform ${ONB_SLIDE_MS}ms ${ONB_SLIDE_EASE}`;
            incoming.style.transform = 'translateX(0)';
        });
    });

    setTimeout(() => {
        outgoing.classList.add('hidden');
        outgoing.style.position = '';
        outgoing.style.left = '';
        outgoing.style.right = '';
        outgoing.style.top = '';
        outgoing.style.transition = '';
        outgoing.style.transform = '';

        incoming.style.transition = '';
        incoming.style.transform = '';
    }, ONB_SLIDE_MS + 30);
}

function _showOnboardingView(id, direction) {
    const contentZone = document.getElementById('auth-content-zone');
    const isStretch = STRETCH_ONBOARDING_VIEWS.includes(id);
    if (contentZone) contentZone.classList.toggle('onboarding-active', isStretch);
    if (!isStretch) {
        // Back in the auto-centered login/register screens — release the frozen
        // logo position so it goes back to being fully responsive there, exactly
        // as before any of this stretch-mode stuff existed.
        const logo = document.getElementById('auth-logo-header');
        if (logo) logo.style.marginTop = '';
    }
    if (id === 'onboarding-start-view' || id === 'auth-main-view') _hideProgress();
    _slideViewTransition(id, direction);
}

// Captures wherever the auto-centered register form has naturally left the
// logo (varies by device/screen size and by how many fields are expanded) and
// pins it there via inline style, so every step from here on shares that exact
// spot instead of jumping to the stretch-mode layout's own top position. Must
// run BEFORE _showOnboardingView flips #auth-card into stretch mode.
//
// Uses the logo's VIEWPORT top, not its offset within #auth-card: in stretch
// mode #auth-card's own top always sits flush at the viewport top (margin:0,
// height:100% inside the inset:0 content zone), so a margin-top equal to the
// logo's current viewport position reproduces that exact screen position —
// whereas offset-within-card would measure ~0 (the logo is card's first
// child) and freeze it at the wrong, un-shifted spot.
function _freezeLogoPosition() {
    const logo = document.getElementById('auth-logo-header');
    if (!logo) return;
    const top = logo.getBoundingClientRect().top;
    logo.style.marginTop = Math.max(0, Math.round(top)) + 'px';
}

function _updateProgress(index, total) {
    const bar = document.getElementById('onboarding-progress');
    if (!bar) return;
    bar.classList.remove('hidden');
    bar.innerHTML = Array.from({ length: total }, (_, i) =>
        `<div class="flex-1 h-1 rounded-full ${i <= index ? 'bg-white' : 'bg-white/15'} transition-colors duration-300"></div>`
    ).join('');
}

function _hideProgress() {
    const bar = document.getElementById('onboarding-progress');
    if (bar) { bar.classList.add('hidden'); bar.innerHTML = ''; }
}

function showStart() {
    _onbState = {
        email: null, password: null, birthdate: null,
        pouchTracking: false,
        language: (typeof window.currentLang !== 'undefined' ? window.currentLang : (localStorage.getItem('appLang') || 'en')),
        username: '', isOAuth: false,
    };
    _setupIndex = 0;
    _showOnboardingView('onboarding-start-view');
}

function goToSignIn(direction) {
    _showOnboardingView('auth-main-view', direction);
    if (!isLoginMode) toggleAuthMode();
}

function goToRegister(direction) {
    _onbState.isOAuth = false;
    _showOnboardingView('auth-main-view', direction || 'forward');
    if (isLoginMode) toggleAuthMode();
    _updateProgress(0, 4);
}

function goToBirthdateStep(data) {
    _onbState.isOAuth = false;
    _onbState.email = data.email;
    _onbState.password = data.password;
    _freezeLogoPosition();
    const backBtn = document.getElementById('onboarding-birthdate-back-btn');
    if (backBtn) backBtn.style.visibility = 'visible';
    _showOnboardingView('onboarding-birthdate-view', 'forward');
    _updateProgress(1, 4);
}

function enterOAuthFlow() {
    _onbState.isOAuth = true;
    _onbState.email = null;
    _onbState.password = null;
    _freezeLogoPosition();
    const backBtn = document.getElementById('onboarding-birthdate-back-btn');
    if (backBtn) backBtn.style.visibility = 'hidden';
    _showOnboardingView('onboarding-birthdate-view');
    _updateProgress(0, 3);
}

function showBirthdateError(msg) {
    const group = document.getElementById('onboarding-birthdate-group');
    if (group) group.style.borderColor = 'rgba(255,59,48,0.5)';
    const el = document.getElementById('onboarding-birthdate-error');
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
    const group = document.getElementById('onboarding-birthdate-group');
    if (group) group.style.borderColor = '';
    const el = document.getElementById('onboarding-birthdate-error');
    if (!el || el.classList.contains('hidden')) return;
    el.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => el.classList.add('hidden'), 180);
}

function _calcAge(dateStr) {
    const birthDateObj = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) age--;
    return age;
}

function submitBirthdate() {
    const val = document.getElementById('onboarding-birthdate').value;
    if (!val) {
        showBirthdateError(t('auth.birthdateRequired'));
        return;
    }
    if (_calcAge(val) < 18) {
        showBirthdateError(t('auth.underage'));
        return;
    }
    hideBirthdateError();
    _onbState.birthdate = val;
    _enterSetupFlow('forward');
}

function _enterSetupFlow(direction) {
    _setupIndex = 0;
    _showOnboardingView('onboarding-setup-view', direction);
    _renderSetupStepContent();
    _renderSetupStepChrome();
}

function _renderSetupStepContent() {
    const content = document.getElementById('onboarding-setup-content');
    if (!content) return;
    hideSetupError();
    const step = SETUP_STEPS[_setupIndex];
    if (step === 'pouch') content.innerHTML = _renderPouchStep();
    else if (step === 'displayname') content.innerHTML = _renderDisplaynameStep();
}

function _renderSetupStepChrome() {
    const nextBtn = document.getElementById('onboarding-setup-next-btn');
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.innerText = (_setupIndex === SETUP_STEPS.length - 1) ? t('onboarding.finish') : t('onboarding.next');
    }
    const total = _onbState.isOAuth ? 3 : 4;
    const base = _onbState.isOAuth ? 1 : 2;
    _updateProgress(base + _setupIndex, total);
}

// Swipes the CONTENT of the setup view (not the whole view) left/right when
// moving between its sub-steps (pouch <-> displayname), since those share
// one view container rather than being separate managed views. This one swaps
// sequentially (fade out -> swap innerHTML -> fade in), so — unlike the
// two-element view transition above — there's no double-exposure risk and a
// smaller px distance plus opacity reads fine here.
const ONB_CONTENT_SLIDE_DIST = 48;

function _swapSetupContent(direction) {
    const content = document.getElementById('onboarding-setup-content');
    if (!content) return;

    const outDist = direction === 'forward' ? -ONB_CONTENT_SLIDE_DIST : ONB_CONTENT_SLIDE_DIST;
    const inStart = direction === 'forward' ? ONB_CONTENT_SLIDE_DIST : -ONB_CONTENT_SLIDE_DIST;

    content.style.transition = `transform ${ONB_SLIDE_MS}ms ${ONB_SLIDE_EASE}, opacity ${ONB_SLIDE_MS}ms ease`;
    content.style.opacity = '0';
    content.style.transform = `translateX(${outDist}px)`;

    setTimeout(() => {
        _renderSetupStepContent();
        content.style.transition = 'none';
        content.style.transform = `translateX(${inStart}px)`;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                content.style.transition = `transform ${ONB_SLIDE_MS}ms ${ONB_SLIDE_EASE}, opacity ${ONB_SLIDE_MS}ms ease`;
                content.style.opacity = '1';
                content.style.transform = 'translateX(0)';
            });
        });
    }, ONB_SLIDE_MS);
}

// No card/div wrapper on purpose — the app has no other UI that boxes content
// in a gray panel; everything else sits directly on the plain black
// background, so this matches that instead of introducing a new pattern.
function _renderPouchStep() {
    const on = _onbState.pouchTracking;
    return `
        <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-full bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M8 17v-7m5 7V6m5 11v-8" />
                    </svg>
                </div>
                <h2 class="text-white text-[18px] font-bold tracking-tight">${t('onboarding.pouchTrackingLabel')}</h2>
            </div>
            <div onclick="triggerHapticFeedback(); Onboarding.togglePouch()"
                class="onb-toggle-track w-14 h-8 ${on ? 'bg-[#30D158]' : 'bg-white/15'} rounded-full relative cursor-pointer transition-colors duration-300 flex-shrink-0">
                <div class="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-sm ${on ? 'translate-x-6' : ''}"
                    style="transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
            </div>
        </div>
        <p class="text-white/50 text-[14px] leading-relaxed text-left mb-3">${t('onboarding.pouchTrackingDesc')}</p>
        <p class="text-white/50 text-[14px] leading-relaxed text-left mb-5">${t('onboarding.pouchTrackingMoodDesc')}</p>
        <p class="text-[13px] font-semibold text-left ${on ? 'text-[#30D158]' : 'text-white/30'}">${on ? t('onboarding.enabled') : t('onboarding.disabled')}</p>
    `;
}

function togglePouch() {
    _onbState.pouchTracking = !_onbState.pouchTracking;
    _renderSetupStepContent();
    const track = document.querySelector('#onboarding-setup-content .onb-toggle-track');
    if (track) {
        track.classList.add('onb-toggle-pulse');
        track.addEventListener('animationend', () => track.classList.remove('onb-toggle-pulse'), { once: true });
    }
}

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Matches the real Settings > Edit Profile username field (settings.js) —
// uppercase label above a bordered black input with rounded-14 corners —
// instead of a plain centered placeholder-only field that looked like it
// belonged to a different, mocked-up screen.
function _renderDisplaynameStep() {
    const val = _escapeHtml(_onbState.username || '');
    return `
        <p class="text-white/80 text-[15px] text-center mb-6 leading-relaxed">${t('onboarding.displaynameTitle')}</p>
        <label class="text-[13px] text-[#8E8E93] uppercase tracking-wider font-medium block mb-2 pl-1">${t('editProfile.username')}</label>
        <input type="text" id="onboarding-username" placeholder="${t('auth.usernamePlaceholder')}" value="${val}"
            data-i18n-placeholder="auth.usernamePlaceholder"
            class="w-full bg-black border border-white/10 text-white rounded-[14px] px-4 py-3.5 text-[17px] focus:border-white outline-none transition-all placeholder:text-[#8E8E93]/60"
            oninput="this.value=this.value.replace(/[^a-zA-Z0-9_]/g,''); Onboarding.hideSetupError()">
    `;
}

function showSetupError(msg) {
    showAuthFieldError('onboarding-setup-error', 'onboarding-setup-error-msg', msg);
}

function hideSetupError() {
    hideAuthFieldError('onboarding-setup-error');
}

function nextSetupStep() {
    const step = SETUP_STEPS[_setupIndex];
    if (step === 'displayname') {
        const val = (document.getElementById('onboarding-username')?.value || '').trim();
        if (!val) { showSetupError(t('auth.enterUsername')); return; }
        if (!/^[a-zA-Z0-9_]{2,30}$/.test(val)) { showSetupError(t('auth.usernameFormat')); return; }
        _onbState.username = val;
    }
    if (_setupIndex < SETUP_STEPS.length - 1) {
        _setupIndex++;
        _renderSetupStepChrome();
        _swapSetupContent('forward');
    } else {
        _completeOnboarding();
    }
}

function prevSetupStep() {
    if (_setupIndex > 0) {
        _setupIndex--;
        _renderSetupStepChrome();
        _swapSetupContent('back');
        return;
    }
    const backBtn = document.getElementById('onboarding-birthdate-back-btn');
    if (backBtn) backBtn.style.visibility = _onbState.isOAuth ? 'hidden' : 'visible';
    _showOnboardingView('onboarding-birthdate-view', 'back');
    _updateProgress(_onbState.isOAuth ? 0 : 1, _onbState.isOAuth ? 3 : 4);
}

function showEmailCheck(email) {
    const emailAddressEl = document.getElementById('email-check-address');
    if (emailAddressEl) emailAddressEl.innerText = email;
    _showOnboardingView('onboarding-emailcheck-view', 'forward');
}

async function _completeOnboarding() {
    const nextBtn = document.getElementById('onboarding-setup-next-btn');
    const originalText = nextBtn ? nextBtn.innerText : '';
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.innerHTML = `<div class="flex items-center justify-center h-[26px]"><svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
    }

    try {
        if (_onbState.isOAuth) {
            const { error: updateError } = await supabaseClient.auth.updateUser({
                data: { username: _onbState.username, birthdate: _onbState.birthdate }
            });
            if (updateError) throw updateError;

            const { data: userData } = await supabaseClient.auth.getUser();
            if (userData?.user) {
                await supabaseClient.from('profiles').update({ username: _onbState.username }).eq('id', userData.user.id);
                await supabaseClient.from('user_ages').upsert({ user_id: userData.user.id, birthdate: _onbState.birthdate });
            }
        } else {
            const { error } = await supabaseClient.auth.signUp({
                email: _onbState.email,
                password: _onbState.password,
                options: { data: { username: _onbState.username, birthdate: _onbState.birthdate } }
            });
            if (error) throw error;
        }

        if (typeof setLang === 'function') await setLang(_onbState.language);
        localStorage.setItem('pouchTrackingEnabled', _onbState.pouchTracking ? 'true' : 'false');
        localStorage.setItem('hasCompletedOnboarding', 'true');

        if (_onbState.isOAuth) {
            checkUser();
        } else {
            showEmailCheck(_onbState.email);
            if (nextBtn) { nextBtn.disabled = false; nextBtn.innerText = originalText; }
        }
    } catch (error) {
        showSetupError(error.message.includes('already registered') ? t('auth.emailInUse') : error.message);
        if (nextBtn) { nextBtn.disabled = false; nextBtn.innerText = originalText; }
    }
}

window.Onboarding = {
    showStart, goToSignIn, goToRegister, goToBirthdateStep, enterOAuthFlow,
    submitBirthdate, hideBirthdateError,
    togglePouch, hideSetupError,
    nextSetupStep, prevSetupStep, showEmailCheck,
};
