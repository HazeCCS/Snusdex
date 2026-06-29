const SYSTEM_INFO_PASSCODE = '6441';

(function () {
    'use strict';

    const CODE_LENGTH = SYSTEM_INFO_PASSCODE.length;

    const KEYPAD = [
        { n: '1', l: '' },        { n: '2', l: 'ABC' },  { n: '3', l: 'DEF' },
        { n: '4', l: 'GHI' },     { n: '5', l: 'JKL' },  { n: '6', l: 'MNO' },
        { n: '7', l: 'PQRS' },    { n: '8', l: 'TUV' },  { n: '9', l: 'WXYZ' },
        { n: '',  l: '' },        { n: '0', l: '' },     { n: 'del', l: '' },
    ];

    let _input = '';
    let _locked = false;
    let _built = false;
    let _el, _dotsEl, _delEl;

    function build() {
        if (_built) return;
        _built = true;

        const style = document.createElement('style');
        style.textContent = `
        /* Colors come from the app's theme tokens (theme.css) so the whole
           screen flips automatically between light & dark mode. */
        #passcode-lock {
            position: fixed; inset: 0; z-index: 170;
            background: var(--app-bg, #000);
            color: var(--app-fg, #fff);
            display: flex; flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif;
            -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
            transform: translateX(100%);
            transition: transform .3s cubic-bezier(.32,.72,0,1);
            -webkit-tap-highlight-color: transparent;
            touch-action: pan-y; user-select: none; -webkit-user-select: none;
        }
        #passcode-lock.pc-hidden { display: none; }
        #passcode-lock.pc-in { transform: translateX(0); }
        #passcode-lock.pc-fade { opacity: 0; transition: opacity .24s ease; }

        /* App-style page header — matches the other overlay pages */
        .pc-header { flex-shrink: 0; padding: 56px 20px 8px; display: flex; align-items: center; justify-content: space-between; }
        .pc-back {
            width: 40px; height: 40px; border-radius: 50%;
            background: var(--surface-1, #1C1C1E); border: 1px solid var(--hairline, rgba(255,255,255,.1));
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: transform .15s ease;
        }
        .pc-back:active { transform: scale(.92); }
        .pc-back svg { width: 20px; height: 20px; color: var(--app-fg, #fff); }
        .pc-htitle { font-size: 20px; font-weight: 600; color: var(--app-fg, #fff); letter-spacing: -.3px; margin: 0; }
        .pc-hspacer { width: 40px; }

        .pc-body { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; padding-bottom: env(safe-area-inset-bottom, 0px); }

        /* Top-aligned like the iOS screen: title near the top, keypad in the
           upper-middle with empty space below (NOT anchored to the bottom). */
        .pc-head { margin-top: 5vh; display: flex; flex-direction: column; align-items: center; }
        .pc-prompt { color: var(--app-fg, #fff); font-size: 22px; font-weight: 400; letter-spacing: .2px; margin: 0; }

        .pc-dots { display: flex; gap: 24px; height: 16px; align-items: center; margin-top: 28px; }
        .pc-dot {
            width: 15px; height: 15px; border-radius: 50%;
            border: 1.5px solid var(--app-fg, #fff); background: transparent;
            transition: background-color .12s ease, transform .12s ease;
        }
        .pc-dot.filled { background: var(--app-fg, #fff); transform: scale(1.05); }

        @keyframes pc-shake {
            0%,100% { transform: translateX(0); }
            18% { transform: translateX(-11px); }
            36% { transform: translateX(11px); }
            54% { transform: translateX(-8px); }
            72% { transform: translateX(8px); }
            88% { transform: translateX(-3px); }
        }
        .pc-shake { animation: pc-shake .42s linear; }

        .pc-keypad {
            margin-top: 8vh;
            display: grid; grid-template-columns: repeat(3, 78px);
            column-gap: 24px; row-gap: 16px; justify-content: center;
        }
        /* Frosted, slightly-glossy keys like the iOS keypad. The translucent
           fill uses --fg-aXX tokens, which flip from white-on-black (dark) to
           black-on-white (light) automatically. */
        .pc-key {
            width: 78px; height: 78px; border-radius: 50%;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: linear-gradient(180deg, var(--fg-a20, rgba(255,255,255,.2)), var(--fg-a05, rgba(255,255,255,.05)));
            border: .5px solid var(--fg-a15, rgba(255,255,255,.15));
            box-shadow: inset 0 .5px 0 var(--fg-a20, rgba(255,255,255,.2));
            cursor: pointer; -webkit-tap-highlight-color: transparent;
            transition: background .12s ease, transform .06s ease;
        }
        .pc-key:active { background: linear-gradient(180deg, var(--fg-a40, rgba(255,255,255,.4)), var(--fg-a20, rgba(255,255,255,.2))); }
        .pc-key-empty { background: none !important; border: none !important; box-shadow: none !important; pointer-events: none; }
        .pc-key-num { font-size: 38px; font-weight: 300; line-height: 1; color: var(--app-fg, #fff); }
        .pc-key-letters {
            height: 12px; margin-top: 4px;
            font-size: 11px; font-weight: 600; line-height: 1; color: var(--app-fg, #fff);
            letter-spacing: 2.5px; text-indent: 2.5px;
        }
        .pc-key-del { background: none; border: none; box-shadow: none; }
        .pc-key-del:active { background: var(--fg-a10, rgba(255,255,255,.1)); }
        .pc-key-del svg { width: 32px; height: 32px; color: var(--app-fg, #fff); }
        .pc-key-del.pc-hide { opacity: 0; pointer-events: none; }

        `;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.id = 'passcode-lock';
        root.className = 'pc-hidden';

        const header = document.createElement('div');
        header.className = 'pc-header';
        const back = document.createElement('div');
        back.className = 'pc-back';
        back.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`;
        back.addEventListener('pointerdown', triggerHapticFeedback);
        back.addEventListener('click', close);
        const htitle = document.createElement('h1');
        htitle.className = 'pc-htitle';
        htitle.textContent = 'System Info';
        const hspacer = document.createElement('div');
        hspacer.className = 'pc-hspacer';
        header.appendChild(back);
        header.appendChild(htitle);
        header.appendChild(hspacer);

        const body = document.createElement('div');
        body.className = 'pc-body';

        const head = document.createElement('div');
        head.className = 'pc-head';
        head.innerHTML = `<p class="pc-prompt">Code eingeben</p>`;

        _dotsEl = document.createElement('div');
        _dotsEl.className = 'pc-dots';
        for (let i = 0; i < CODE_LENGTH; i++) {
            const d = document.createElement('div');
            d.className = 'pc-dot';
            _dotsEl.appendChild(d);
        }
        head.appendChild(_dotsEl);

        const pad = document.createElement('div');
        pad.className = 'pc-keypad';
        KEYPAD.forEach((k) => {
            const btn = document.createElement('div');
            if (k.n === 'del') {
                btn.className = 'pc-key pc-key-del pc-hide';
                btn.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z"/></svg>`;
                btn.addEventListener('pointerdown', triggerHapticFeedback);
                btn.addEventListener('click', onDelete);
                _delEl = btn;
            } else if (k.n === '') {
                btn.className = 'pc-key pc-key-empty';
            } else {
                btn.className = 'pc-key';
                btn.innerHTML = `<span class="pc-key-num">${k.n}</span><span class="pc-key-letters">${k.l}</span>`;
                btn.addEventListener('pointerdown', triggerHapticFeedback);
                btn.addEventListener('click', () => onDigit(k.n));
            }
            pad.appendChild(btn);
        });

        body.appendChild(head);
        body.appendChild(pad);

        root.appendChild(header);
        root.appendChild(body);
        document.body.appendChild(root);
        _el = root;

        bindSwipeToClose(root);
    }

    function bindSwipeToClose(el) {
        let startX = 0, startY = 0, swiping = false, lock = false;

        el.addEventListener('touchstart', (e) => {
            if (lock) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            swiping = false;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (lock || !startX) return;
            const diffX = e.touches[0].clientX - startX;
            const diffY = Math.abs(e.touches[0].clientY - startY);

            if (swiping) {
                if (e.cancelable) e.preventDefault();
                if (diffX > 0) el.style.transform = `translateX(${diffX}px)`;
                return;
            }
            if (diffY > Math.abs(diffX)) return;
            if (diffX > 0) {
                if (e.cancelable) e.preventDefault();
                swiping = true;
                el.style.transition = 'none';
                el.style.transform = `translateX(${diffX}px)`;
            }
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            if (!swiping) return;
            const diffX = e.changedTouches[0].clientX - startX;
            const shouldClose = diffX > window.innerWidth / 3 || diffX > 100;
            startX = 0; startY = 0; swiping = false;

            if (!shouldClose) {
                el.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)';
                el.style.transform = 'translateX(0)';
                setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 300);
                return;
            }

            lock = true;
            triggerHapticFeedback();
            el.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)';
            el.style.transform = `translateX(${window.innerWidth}px)`;
            document.body.classList.remove('overflow-hidden');
            setTimeout(() => {
                el.style.transition = 'none';
                el.style.transform = '';
                el.classList.remove('pc-in');
                el.classList.add('pc-hidden');
                _input = '';
                renderDots();
                el.style.transition = '';
                lock = false;
            }, 300);
        });
    }

    function renderDots() {
        const dots = _dotsEl.children;
        for (let i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('filled', i < _input.length);
        }
        if (_delEl) _delEl.classList.toggle('pc-hide', _input.length === 0);
    }

    function onDigit(n) {
        if (_locked || _input.length >= CODE_LENGTH) return;
        _input += n;
        renderDots();
        if (_input.length === CODE_LENGTH) {

            setTimeout(validate, 130);
        }
    }

    function onDelete() {
        if (_locked || _input.length === 0) return;
        _input = _input.slice(0, -1);
        renderDots();
    }

    function validate() {
        if (_input === SYSTEM_INFO_PASSCODE) {
            success();
        } else {
            reject();
        }
    }

    function reject() {
        _locked = true;
        triggerHapticFeedback();
        _dotsEl.classList.add('pc-shake');
        setTimeout(() => {
            _dotsEl.classList.remove('pc-shake');
            _input = '';
            renderDots();
            _locked = false;
        }, 430);
    }

    function success() {

        if (typeof openGithubPage === 'function') openGithubPage();
        _el.classList.add('pc-fade');
        setTimeout(() => {
            _el.classList.remove('pc-in', 'pc-fade');
            _el.classList.add('pc-hidden');
            _el.style.opacity = '';
            _input = '';
            renderDots();
        }, 260);
    }

    function open() {
        build();
        _input = '';
        _locked = false;
        renderDots();
        _el.classList.remove('pc-hidden', 'pc-fade');
        _el.style.opacity = '';
        document.body.classList.add('overflow-hidden');
        void _el.offsetWidth;
        _el.classList.add('pc-in');
    }

    function close() {
        _el.classList.remove('pc-in');
        document.body.classList.remove('overflow-hidden');
        setTimeout(() => {
            _el.classList.add('pc-hidden');
            _input = '';
            renderDots();
        }, 300);
    }

    window.requestSystemInfoAccess = open;
})();
