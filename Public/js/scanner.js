let html5QrCode = null;
let isProcessingScan = false;
let scanFlashlightOn = false;
let scanCurrentTrack = null; // MediaStreamTrack for torch control
let scanCameraIndex = 0;     // 0=normal, 1=wide, 2=tele
const SCAN_CAMERA_MODES = [
    { label: 'Normal', labelKey: 'scan.cameraNormal', zoom: null, facingMode: 'environment' },
    { label: 'Weitwinkel', labelKey: 'scan.cameraWide', zoom: 0.5, facingMode: 'environment' },
    { label: 'Telelinse', labelKey: 'scan.cameraTele', zoom: 2.0, facingMode: 'environment' },
];

const scanModal = document.getElementById('scan-modal');
const scanModalCard = document.getElementById('scan-modal-card');
const scanModalBackdrop = document.getElementById('scan-modal-backdrop');

if (scanModal) {
    scanModal.addEventListener('touchmove', (e) => {
        if (!isScanDragging) {
            e.preventDefault();
        }
    }, {
        passive: false
    });
}


async function openScanModal() {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    isProcessingScan = false;
    scanFlashlightOn = false;
    scanCurrentTrack = null;
    scanCameraIndex = 0;

    // Reset button states
    const flashlightBtn = document.getElementById('scan-flashlight-btn');
    const flashlightLabel = document.getElementById('scan-flashlight-label');
    const cameraLabel = document.getElementById('scan-camera-label');
    if (flashlightBtn) {
        flashlightBtn.classList.remove('bg-white/20', 'border-white/40');
        flashlightBtn.classList.add('bg-[#1C1C1E]', 'border-white/10');
    }
    if (flashlightLabel) flashlightLabel.textContent = t('scan.flashlight');
    if (cameraLabel) cameraLabel.textContent = t(SCAN_CAMERA_MODES[0].labelKey);

    scanModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    startScanHelpTimer();

    setTimeout(() => {
        scanModalBackdrop.classList.remove('opacity-0');
        scanModalBackdrop.classList.add('opacity-100');

        scanModalCard.classList.remove('translate-y-full');
        scanModalCard.classList.add('translate-y-0');
    }, 10);

    setTimeout(() => {
        const loadingBar = document.getElementById('loading-bar-fill');

        if (loadingBar) {
            loadingBar.style.transition = 'width 750ms cubic-bezier(0.4, 0, 0.2, 1)';
            loadingBar.style.width = '100%';
        }
    }, 300);

    setTimeout(async () => {
        try {
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("scanner-reader");
            }

            await html5QrCode.start({
                facingMode: "environment"
            }, {
                fps: 60,
            },
                (decodedText, decodedResult) => {
                    if (isProcessingScan) return;
                    isProcessingScan = true;
                    clearScanHelpTimer();
                    dismissScanHelpPrompt();

                    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
                    closeScanModal();

                    setTimeout(() => {
                        const foundSnus = globalSnusData.find(s => String(s.barcode) === decodedText);
                        if (foundSnus) {
                            openSnusDetail(foundSnus.id, true);
                        } else {
                            openNotFoundModal();
                        }
                    }, 400);
                },
                (errorMessage) => { }
            );

            // Grab the active camera track for torch/zoom control
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                const tracks = stream.getVideoTracks();
                if (tracks.length > 0) {
                    scanCurrentTrack = tracks[0];
                    // Hide flashlight button if torch not supported
                    const capabilities = scanCurrentTrack.getCapabilities ? scanCurrentTrack.getCapabilities() : {};
                    const flashBtn = document.getElementById('scan-flashlight-btn');
                    if (flashBtn && !capabilities.torch) {
                        flashBtn.style.opacity = '0.3';
                        flashBtn.style.pointerEvents = 'none';
                    }
                }
            } catch (e) { /* torch not available */ }

            document.getElementById('camera-loading').classList.add('opacity-0', 'pointer-events-none');

            const scannerReader = document.getElementById('scanner-reader');
            if (scannerReader) {
                scannerReader.classList.remove('opacity-0');
                scannerReader.classList.add('opacity-100');
            }
        } catch (err) {
            console.error("Kamera-Zugriff verweigert:", err);
            const loadingScreen = document.getElementById('camera-loading');
            if (loadingScreen) {
                loadingScreen.innerHTML = '<p class="text-[#FF453A] text-sm font-medium">Kamera nicht verfügbar</p>';
            }
        }
    }, 300);
}


function closeScanModal(isDragging = false) {
    clearScanHelpTimer();
    dismissScanHelpPrompt();
    // Turn off flashlight when closing
    if (scanFlashlightOn && scanCurrentTrack) {
        try { scanCurrentTrack.applyConstraints({ advanced: [{ torch: false }] }); } catch (e) { }
        scanFlashlightOn = false;
    }
    scanCurrentTrack = null;

    scanModalCard.classList.remove('translate-y-0');
    scanModalCard.classList.add('translate-y-full');

    scanModalBackdrop.classList.remove('opacity-100');
    scanModalBackdrop.classList.add('opacity-0');

    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    if (!isDragging) {
        scanModalCard.style.transform = '';
        scanModalCard.style.transition = '';
    }

    setTimeout(async () => {
        scanModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        if (isDragging) {
            scanModalCard.style.transform = '';
            scanModalCard.style.transition = '';
        }

        if (html5QrCode) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (err) {
                console.log("Scanner war nicht aktiv oder konnte nicht gestoppt werden:", err);
            }
        }

        const loadingScreen = document.getElementById('camera-loading');
        const loadingBar = document.getElementById('loading-bar-fill');

        if (loadingScreen) loadingScreen.classList.remove('opacity-0', 'pointer-events-none');

        if (loadingBar) {
            loadingBar.style.transition = 'none';
            loadingBar.style.width = '0%';
        }

        const scannerReader = document.getElementById('scanner-reader');
        if (scannerReader) {
            scannerReader.classList.remove('opacity-100');
            scannerReader.classList.add('opacity-0');
        }

        // Reset flashlight button visual state
        const flashBtn = document.getElementById('scan-flashlight-btn');
        if (flashBtn) {
            flashBtn.style.opacity = '';
            flashBtn.style.pointerEvents = '';
        }

    }, 400);
}

// ==========================================
// NOT-FOUND MODAL
// ==========================================
function openNotFoundModal() {
    const modal = document.getElementById('not-found-modal');
    const backdrop = document.getElementById('not-found-backdrop');
    const card = document.getElementById('not-found-card');
    if (!modal || !backdrop || !card) return;

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    // Force reflow then animate in
    void modal.offsetWidth;
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    card.classList.remove('scale-95', 'opacity-0');
    card.classList.add('scale-100', 'opacity-100');
}

function closeNotFoundModal() {
    const modal = document.getElementById('not-found-modal');
    const backdrop = document.getElementById('not-found-backdrop');
    const card = document.getElementById('not-found-card');
    if (!modal || !backdrop || !card) return;

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    card.classList.remove('scale-100', 'opacity-100');
    card.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }, 300);
}

function retryScan() {
    closeNotFoundModal();
    setTimeout(() => openScanModal(), 350);
}

function reportMissingSnus() {
    closeNotFoundModal();
}

async function toggleScanFlashlight() {
    if (!scanCurrentTrack) return;
    try {
        const capabilities = scanCurrentTrack.getCapabilities ? scanCurrentTrack.getCapabilities() : {};
        if (!capabilities.torch) return;

        scanFlashlightOn = !scanFlashlightOn;
        await scanCurrentTrack.applyConstraints({ advanced: [{ torch: scanFlashlightOn }] });

        const btn = document.getElementById('scan-flashlight-btn');
        const label = document.getElementById('scan-flashlight-label');
        if (btn) {
            if (scanFlashlightOn) {
                btn.classList.remove('bg-[#1C1C1E]', 'border-white/10');
                btn.classList.add('bg-white/20', 'border-white/40');
            } else {
                btn.classList.add('bg-[#1C1C1E]', 'border-white/10');
                btn.classList.remove('bg-white/20', 'border-white/40');
            }
        }
        if (label) label.textContent = scanFlashlightOn ? t('scan.flashlightOn') : t('scan.flashlight');
    } catch (e) {
        console.error('Torch not supported:', e);
    }
}

async function cycleScanCamera() {
    scanCameraIndex = (scanCameraIndex + 1) % SCAN_CAMERA_MODES.length;
    const mode = SCAN_CAMERA_MODES[scanCameraIndex];
    const label = document.getElementById('scan-camera-label');
    if (label) label.textContent = t(mode.labelKey);

    // If zoom is supported by the current track, use applyConstraints
    if (scanCurrentTrack && typeof scanCurrentTrack.getCapabilities === 'function') {
        const capabilities = scanCurrentTrack.getCapabilities();
        if (capabilities.zoom) {
            try {
                // null = Normal = 1.0x; always apply so switching Tele→Normal resets zoom
                const targetZoom = mode.zoom !== null ? mode.zoom : 1.0;
                const clampedZoom = Math.min(Math.max(targetZoom, capabilities.zoom.min), capabilities.zoom.max);
                await scanCurrentTrack.applyConstraints({ advanced: [{ zoom: clampedZoom }] });
                return;
            } catch (e) {
                console.warn('Zoom constraint failed, ignoring:', e);
            }
        }
    }
    console.log(`Camera mode set to: ${mode.labelKey} (hardware zoom not available on this device)`);
}

let scanStartY = 0;
let scanCurrentY = 0;
let isScanDragging = false;

if (scanModalCard) {
    scanModalCard.addEventListener('touchstart', (e) => {
        scanStartY = e.touches[0].clientY;
        isScanDragging = true;
        scanModalCard.style.transition = 'none';
    }, {
        passive: true
    });

    scanModalCard.addEventListener('touchmove', (e) => {
        if (!isScanDragging) return;
        scanCurrentY = e.touches[0].clientY;
        const deltaY = scanCurrentY - scanStartY;

        if (deltaY > 0) {
            scanModalCard.style.transform = `translateY(${deltaY}px)`;
        }
    }, {
        passive: true
    });

    scanModalCard.addEventListener('touchend', (e) => {
        if (!isScanDragging) return;
        isScanDragging = false;

        const deltaY = scanCurrentY - scanStartY;
        scanModalCard.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';

        if (deltaY > 100) {
            scanModalCard.style.transform = 'translateY(100%)';
            closeScanModal(true);
        } else {
            scanModalCard.style.transform = 'translateY(0px)';
            setTimeout(() => {
                scanModalCard.style.transform = '';
                scanModalCard.style.transition = '';
            }, 400);
        }
    });
}

// ==========================================
// SCAN HELP SYSTEM (20-second prompt + Help Center)
// ==========================================
let _scanHelpTimer = null;

function startScanHelpTimer() {
    clearScanHelpTimer();
    _scanHelpTimer = setTimeout(showScanHelpPrompt, 20000);
}

function clearScanHelpTimer() {
    if (_scanHelpTimer) { clearTimeout(_scanHelpTimer); _scanHelpTimer = null; }
}

function showScanHelpPrompt() {
    const el = document.getElementById('scan-help-prompt');
    const inner = document.getElementById('scan-help-inner');
    if (!el || !inner) return;
    inner.style.transition = 'none';
    inner.style.transform = 'translateY(20px)';
    inner.style.opacity = '0';
    el.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        inner.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1), opacity 0.3s ease';
        inner.style.transform = 'translateY(0)';
        inner.style.opacity = '1';
    }));
}

function dismissScanHelpPrompt() {
    const el = document.getElementById('scan-help-prompt');
    const inner = document.getElementById('scan-help-inner');
    if (!el || el.classList.contains('hidden')) return;
    inner.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.25s ease';
    inner.style.transform = 'translateY(20px)';
    inner.style.opacity = '0';
    setTimeout(() => el.classList.add('hidden'), 350);
}
window.dismissScanHelpPrompt = dismissScanHelpPrompt;

// visualViewport keyboard handler: keeps modal at fixed inset-0, pads scrollable area
// by keyboard height instead of shrinking the modal. WebKit bug #237851: read values
// inside requestAnimationFrame as visualViewport fires before values update.
let _scanHelpVVListening = false;
let _scanHelpVVRafId = null;

function _onScanHelpVVResize() {
    if (_scanHelpVVRafId) cancelAnimationFrame(_scanHelpVVRafId);
    _scanHelpVVRafId = requestAnimationFrame(() => {
        _scanHelpVVRafId = null;
        const modal = document.getElementById('scan-help-modal');
        if (!modal || modal.classList.contains('hidden')) return;
        const vv = window.visualViewport;
        const visH = vv ? vv.height : window.innerHeight;
        const kbHeight = Math.max(0, window.innerHeight - visH);
        const scrollArea = document.getElementById('scan-help-scroll');
        if (scrollArea) scrollArea.style.paddingBottom = kbHeight > 0 ? kbHeight + 'px' : '';
    });
}

function _resetScanHelpVV() {
    if (_scanHelpVVRafId) { cancelAnimationFrame(_scanHelpVVRafId); _scanHelpVVRafId = null; }
    const scrollArea = document.getElementById('scan-help-scroll');
    if (scrollArea) scrollArea.style.paddingBottom = '';
}

function _attachScanHelpVV() {
    if (_scanHelpVVListening) return;
    _scanHelpVVListening = true;
    if (window.visualViewport) window.visualViewport.addEventListener('resize', _onScanHelpVVResize);
    window.addEventListener('resize', _onScanHelpVVResize);
    // iOS 17+: vv.height stays stale after keyboard dismissal; re-read after focusout settles
    const card = document.getElementById('scan-help-card');
    if (card && !card._focusOutBound) {
        card._focusOutBound = true;
        card.addEventListener('focusout', () => setTimeout(_onScanHelpVVResize, 300));
    }
}

function openScanHelpModal() {
    dismissScanHelpPrompt();
    const modal = document.getElementById('scan-help-modal');
    const backdrop = document.getElementById('scan-help-backdrop');
    const card = document.getElementById('scan-help-card');
    if (!modal || !backdrop || !card) return;
    const searchInput = document.getElementById('scan-help-search');
    const results = document.getElementById('scan-help-results');
    if (searchInput) searchInput.value = '';
    if (results) results.innerHTML = `<p class="text-[#8E8E93] text-[14px] text-center py-5 px-4">${t('scanHelp.typeToSearch')}</p>`;
    _resetScanHelpVV();
    card.style.transition = 'none';
    card.style.transform = 'translateY(100%)';
    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
    _attachScanHelpVV();
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        card.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';
        card.style.transform = 'translateY(0)';
    }, 10);
    initScanHelpGestures();
}
window.openScanHelpModal = openScanHelpModal;

function closeScanHelpModal() {
    const modal = document.getElementById('scan-help-modal');
    const backdrop = document.getElementById('scan-help-backdrop');
    const card = document.getElementById('scan-help-card');
    if (!modal || !backdrop || !card) return;
    card.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';
    card.style.transform = 'translateY(100%)';
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        _resetScanHelpVV();
        card.style.transition = 'none';
        document.body.style.overflow = '';
    }, 420);
}
window.closeScanHelpModal = closeScanHelpModal;

function initScanHelpGestures() {
    const handle = document.getElementById('scan-help-handle');
    const card = document.getElementById('scan-help-card');
    if (!handle || !card || handle._helpGestureInit) return;
    handle._helpGestureInit = true;
    let startY = 0, startTime = 0, dragging = false;
    handle.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY;
        startTime = Date.now();
        dragging = true;
        card.style.transition = 'none';
    }, { passive: true });
    handle.addEventListener('touchmove', e => {
        if (!dragging) return;
        const dy = e.touches[0].clientY - startY;
        if (dy < 0) return;
        card.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    handle.addEventListener('touchend', e => {
        if (!dragging) return;
        dragging = false;
        const dy = e.changedTouches[0].clientY - startY;
        const velocity = dy / Math.max(1, Date.now() - startTime);
        if (dy > 100 || velocity > 0.5) {
            closeScanHelpModal();
        } else {
            card.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
            card.style.transform = 'translateY(0)';
        }
    }, { passive: true });
}

// ==========================================
// SCAN HELP MODAL — Search & Request
// ==========================================

function onScanHelpSearch(query) {
    const container = document.getElementById('scan-help-results');
    if (!container) return;
    const q = query.trim().toLowerCase();
    if (!q) {
        container.innerHTML = `<p class="text-[#8E8E93] text-[14px] text-center py-5 px-4">${t('scanHelp.typeToSearch')}</p>`;
        return;
    }
    const matches = (globalSnusData || []).filter(s =>
        (s.brand || '').toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q)
    ).slice(0, 30);
    if (!matches.length) {
        container.innerHTML = `
            <div class="px-4 pt-4 pb-5">
                <p class="text-[#8E8E93] text-[14px] text-center mb-4 leading-snug">${t('scanHelp.notFound')}</p>
                <div class="space-y-2 mb-3">
                    <input id="req-brand" type="text" placeholder="${t('scanHelp.brandPlaceholder')}"
                        class="w-full bg-[#3A3A3C] text-white text-[15px] px-4 py-3 rounded-[12px] focus:outline-none placeholder-white/25" autocomplete="off">
                    <input id="req-flavor" type="text" placeholder="${t('scanHelp.flavorPlaceholder')}"
                        class="w-full bg-[#3A3A3C] text-white text-[15px] px-4 py-3 rounded-[12px] focus:outline-none placeholder-white/25" autocomplete="off">
                </div>
                <button onclick="submitProductRequest()"
                    class="w-full py-3 bg-white text-black text-[15px] font-semibold rounded-[12px] active:scale-95 transition-transform">
                    ${t('scanHelp.submitRequest')}
                </button>
            </div>`;
        return;
    }
    container.innerHTML = matches.map((s, i) =>
        `<div class="flex items-center px-4 py-3${i < matches.length - 1 ? ' border-b border-white/5' : ''}">
            <div class="flex-1 min-w-0">
                <span class="text-white text-[15px] font-medium">${s.brand}</span>
                <span class="text-[#8E8E93] text-[15px]"> · ${s.name}</span>
            </div>
            <span class="text-[#8E8E93] text-[13px] ml-3 flex-shrink-0">${s.nicotine} mg/g</span>
        </div>`
    ).join('');
}
window.onScanHelpSearch = onScanHelpSearch;

function submitProductRequest() {
    triggerHapticFeedback();
    // TODO: implement submission feature
}
window.submitProductRequest = submitProductRequest;
