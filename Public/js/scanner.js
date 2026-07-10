let html5QrCode = null;
let isProcessingScan = false;
let scanFlashlightOn = false;
let scanCameraIndex = 0;
const SCAN_CAMERA_MODES = [
    { label: 'Normal', labelKey: 'scan.cameraNormal', zoom: null, facingMode: 'environment' },
    { label: 'Weitwinkel', labelKey: 'scan.cameraWide', zoom: 0.5, facingMode: 'environment' },
    { label: 'Telelinse', labelKey: 'scan.cameraTele', zoom: 2.0, facingMode: 'environment' },
];

const scanEngine = (typeof EanScanEngine !== 'undefined')
    ? new EanScanEngine({
        requiredReads: 3,
        consensusWindowMs: 1500,
        cooldownMs: 3000,
        acceptEan8: true,
        onConfirm: onEanConfirmed,
    })
    : null;

function onEanConfirmed(result) {
    if (isProcessingScan) return;
    isProcessingScan = true;
    clearScanHelpTimer();
    dismissScanHelpPrompt();

    playAppSound('scan');
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    console.log('[EAN] confirmed', result);
    closeScanModal();

    setTimeout(() => {
        simulateScan(result.ean);
    }, 400);
}

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

async function openScanModal(onReady) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    const hasNativeSound = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.soundHandler;
    if (!hasNativeSound) {
        const scanSound = document.getElementById('scan-sound');
        if (scanSound) {
            scanSound.play().then(() => {
                scanSound.pause();
                scanSound.currentTime = 0;
            }).catch(e => {
                console.log("Audio priming skipped or not allowed:", e);
            });
        }
    }

    isProcessingScan = false;
    scanFlashlightOn = false;
    scanCameraIndex = 0;

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
        if (typeof initModalCubes === 'function') initModalCubes('scan-modal-cubes-container');
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
                html5QrCode = new Html5Qrcode("scanner-reader", {
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8
                    ],
                    verbose: false,
                    useBarCodeDetectorIfSupported: true
                });
            }

            if (scanEngine) scanEngine.reset();

            await html5QrCode.start({
                facingMode: "environment"
            }, {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const width = Math.min(256, Math.floor(viewfinderWidth * 0.8));
                    const height = Math.min(128, Math.floor(viewfinderHeight * 0.4));
                    return { width, height };
                },
                disableFlip: true
            },
                (decodedText, decodedResult) => {
                    if (isProcessingScan) return;

                    const fmt = decodedResult && decodedResult.result && decodedResult.result.format
                        ? decodedResult.result.format.formatName
                        : undefined;

                    if (scanEngine) {
                        scanEngine.push(decodedText, fmt);
                    } else {
                        if (typeof EanValidator !== 'undefined' &&
                            EanValidator.validate(decodedText)) {
                            onEanConfirmed({ ean: String(decodedText).trim(), confidence: 1, timestamp: Date.now() });
                        }
                    }
                },
                (errorMessage) => { }
            );

            try {
                await html5QrCode.applyVideoConstraints({ advanced: [{ focusMode: 'continuous' }] });
            } catch (e) { }

            try {
                const capabilities = html5QrCode.getRunningTrackCapabilities();
                const flashBtn = document.getElementById('scan-flashlight-btn');
                if (flashBtn) {
                    if (!capabilities.torch) {
                        flashBtn.style.opacity = '0.3';
                        flashBtn.style.pointerEvents = 'none';
                    } else {
                        flashBtn.style.opacity = '';
                        flashBtn.style.pointerEvents = '';
                    }
                }
            } catch (e) {  }

            document.getElementById('camera-loading').classList.add('opacity-0', 'pointer-events-none');

            const scannerReader = document.getElementById('scanner-reader');
            if (scannerReader) {
                scannerReader.classList.remove('opacity-0');
                scannerReader.classList.add('opacity-100');
            }

            if (typeof onReady === 'function') onReady();
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
    if (scanEngine) scanEngine.reset();

    if (scanFlashlightOn && html5QrCode) {
        try { html5QrCode.applyVideoConstraints({ advanced: [{ torch: false }] }); } catch (e) { }
        scanFlashlightOn = false;
    }

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

        const flashBtn = document.getElementById('scan-flashlight-btn');
        if (flashBtn) {
            flashBtn.style.opacity = '';
            flashBtn.style.pointerEvents = '';
        }

    }, 400);
}

let lastScannedBarcode = "";

function openNotFoundModal(barcode) {
    lastScannedBarcode = barcode || "";
    const modal = document.getElementById('not-found-modal');
    const backdrop = document.getElementById('not-found-backdrop');
    const card = document.getElementById('not-found-card');
    if (!modal || !backdrop || !card) return;

    const barcodeInput = document.getElementById('missing-snus-barcode');
    if (barcodeInput) barcodeInput.value = lastScannedBarcode;

    const nameInput = document.getElementById('missing-snus-name');
    if (nameInput) nameInput.value = "";

    const nicotineInput = document.getElementById('missing-snus-nicotine');
    if (nicotineInput) nicotineInput.value = "";

    const successView = document.getElementById('not-found-success-view');
    if (successView) successView.classList.add('hidden');

    showNotFoundMainView();

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

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

function showNotFoundMainView() {
    const mainView = document.getElementById('not-found-main-view');
    const reportView = document.getElementById('not-found-report-view');
    const successView = document.getElementById('not-found-success-view');
    if (mainView && reportView) {
        mainView.classList.remove('hidden');
        reportView.classList.add('hidden');
    }
    if (successView) successView.classList.add('hidden');
}
window.showNotFoundMainView = showNotFoundMainView;

function showNotFoundReportView() {
    const mainView = document.getElementById('not-found-main-view');
    const reportView = document.getElementById('not-found-report-view');
    const successView = document.getElementById('not-found-success-view');
    if (mainView && reportView) {
        mainView.classList.add('hidden');
        reportView.classList.remove('hidden');
    }
    if (successView) successView.classList.add('hidden');
}
window.showNotFoundReportView = showNotFoundReportView;

function showNotFoundSuccessView() {
    const mainView = document.getElementById('not-found-main-view');
    const reportView = document.getElementById('not-found-report-view');
    const successView = document.getElementById('not-found-success-view');
    if (mainView && reportView && successView) {
        mainView.classList.add('hidden');
        reportView.classList.add('hidden');
        successView.classList.remove('hidden');

        const svg = successView.querySelector('.success-checkmark-svg');
        if (svg) {
            const newSvg = svg.cloneNode(true);
            svg.parentNode.replaceChild(newSvg, svg);
        }
    }
}
window.showNotFoundSuccessView = showNotFoundSuccessView;

async function submitMissingSnus() {
    const nameInput = document.getElementById('missing-snus-name');
    const nicotineInput = document.getElementById('missing-snus-nicotine');
    const barcodeInput = document.getElementById('missing-snus-barcode');
    if (!nameInput || !nicotineInput || !barcodeInput) return;

    const name = nameInput.value.trim();
    const nicotineVal = nicotineInput.value.trim();
    const barcode = barcodeInput.value.trim();

    if (!name) {
        alert(t('auth.fillAllFields'));
        return;
    }
    if (!nicotineVal || isNaN(parseFloat(nicotineVal))) {
        alert(t('auth.fillAllFields'));
        return;
    }

    const nicotine = parseFloat(nicotineVal);

    const submitBtn = document.getElementById('missing-snus-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = t('common.loading');
    }

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data, error } = await supabaseClient.from('product_suggestions').insert({
            name,
            nicotine,
            barcode,
            user_id: user ? user.id : null
        });

        if (error) throw error;

        showNotFoundSuccessView();
    } catch (err) {
        console.error("Error submitting product suggestion:", err);
        alert(t('error.saveFailed', { msg: err.message }));
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = t('notFound.reportSubmit');
        }
    }
}
window.submitMissingSnus = submitMissingSnus;

function _shouldAutoOpen() {
    const val = localStorage.getItem('scanAutoOpen');
    return val === null ? true : val === 'on';
}

function _openOrToast(snus) {
    if (_shouldAutoOpen()) {
        openSnusDetail(snus.id, true);
    } else {
        showScanFoundToast(snus);
    }
}

let _scanFoundToastTimer = null;
let _scanFoundSnusId = null;

function showScanFoundToast(snus) {
    _scanFoundSnusId = snus.id;
    const toast = document.getElementById('scan-found-toast');
    const nameEl = document.getElementById('scan-found-toast-name');
    if (!toast || !nameEl) return;
    if (_scanFoundToastTimer) clearTimeout(_scanFoundToastTimer);
    nameEl.textContent = snus.name || '';
    toast.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
    _scanFoundToastTimer = setTimeout(closeScanFoundToast, 3500);
}

function closeScanFoundToast() {
    const toast = document.getElementById('scan-found-toast');
    if (!toast) return;
    toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    toast.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
    if (_scanFoundToastTimer) { clearTimeout(_scanFoundToastTimer); _scanFoundToastTimer = null; }
}

function openScanFoundResult() {
    closeScanFoundToast();
    if (_scanFoundSnusId !== null) openSnusDetail(_scanFoundSnusId, true);
}
window.openScanFoundResult = openScanFoundResult;
window.closeScanFoundToast = closeScanFoundToast;

function normalizeBarcode(code) {
    if (code === null || code === undefined) return '';
    const digits = String(code).replace(/\D/g, '');
    return digits.replace(/^0+/, '');
}

function findSnusByBarcode(code) {
    const raw = String(code == null ? '' : code).trim();
    if (!raw) return null;
    const exact = globalSnusData.find(s => String(s.barcode).trim() === raw);
    if (exact) return exact;
    const norm = normalizeBarcode(raw);
    if (!norm) return null;
    return globalSnusData.find(s => normalizeBarcode(s.barcode) === norm) || null;
}

async function simulateScan(text) {
    console.log("Simulating scan for:", text);
    const trimmed = String(text).trim();

    if (trimmed.startsWith('unlock ID ')) {
        const idStr = trimmed.replace('unlock ID ', '').trim();
        const id = parseInt(idStr);
        if (!isNaN(id)) {
            openSnusDetail(id, true);
            return;
        }
    }

    if (!globalSnusData.length && typeof loadDex === 'function') {
        try { await loadDex(); } catch (e) { console.error("Katalog-Reload vor Scan fehlgeschlagen:", e); }
    }

    if (trimmed.startsWith('unlock EAN ')) {
        const eanStr = trimmed.replace('unlock EAN ', '').trim();
        const foundSnus = findSnusByBarcode(eanStr);
        if (foundSnus) {
            _openOrToast(foundSnus);
        } else {
            openNotFoundModal(eanStr);
        }
        return;
    }

    const foundSnus = findSnusByBarcode(trimmed);
    if (foundSnus) {
        _openOrToast(foundSnus);
    } else {
        openNotFoundModal(trimmed);
    }
}
window.simulateScan = simulateScan;

window.unlock = function(type, value) {
    if (type === undefined || value === undefined) {
        console.error("Usage: unlock('ID', <ID>) or unlock('EAN', '<EAN>')");
        return;
    }
    const t = String(type).toUpperCase().trim();
    if (t === 'ID') {
        simulateScan('unlock ID ' + value);
    } else if (t === 'EAN') {
        simulateScan('unlock EAN ' + value);
    } else {
        console.error("Unknown type. Use 'ID' or 'EAN'.");
    }
};

async function toggleScanFlashlight() {
    if (!html5QrCode) return;
    try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (!capabilities.torch) return;

        scanFlashlightOn = !scanFlashlightOn;
        await html5QrCode.applyVideoConstraints({ advanced: [{ torch: scanFlashlightOn }] });

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
        console.error('Torch error:', e);
    }
}

async function cycleScanCamera() {
    if (!html5QrCode) return;
    scanCameraIndex = (scanCameraIndex + 1) % SCAN_CAMERA_MODES.length;
    const mode = SCAN_CAMERA_MODES[scanCameraIndex];
    const label = document.getElementById('scan-camera-label');
    if (label) label.textContent = t(mode.labelKey);

    try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities.zoom) {

            const targetZoom = mode.zoom !== null ? mode.zoom : 1.0;
            const clampedZoom = Math.min(Math.max(targetZoom, capabilities.zoom.min), capabilities.zoom.max);
            await html5QrCode.applyVideoConstraints({ advanced: [{ zoom: clampedZoom }] });
            return;
        }
    } catch (e) {
        console.warn('Zoom constraint failed, ignoring:', e);
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
    if (scanModal && !scanModal.classList.contains('hidden')) closeScanModal();
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        card.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';
        card.style.transform = 'translateY(0)';
        if (typeof initModalCubes === 'function') initModalCubes('scan-help-cubes-container');
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

function onScanHelpSearch(query) {
    const container = document.getElementById('scan-help-results');
    if (!container) return;
    const q = query.trim().toLowerCase();
    if (!q) {
        container.innerHTML = `<p class="text-[#8E8E93] text-[15px] text-center py-5 px-4">${t('scanHelp.typeToSearch')}</p>`;
        return;
    }
    const matches = (globalSnusData || []).filter(s =>
        (s.brand || '').toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q)
    ).slice(0, 30);
    if (!matches.length) {
        container.innerHTML = `
            <div class="px-4 pt-4 pb-5">
                <p class="text-[#8E8E93] text-[15px] text-center mb-4 leading-snug">${t('scanHelp.notFound')}</p>
                <div class="space-y-2 mb-3">
                    <input id="req-brand" type="text" placeholder="${t('scanHelp.brandPlaceholder')}"
                        class="w-full bg-[#2C2C2E] border border-white/10 text-white text-[15px] px-4 py-3 rounded-[14px] focus:outline-none placeholder-[#636366]" autocomplete="off">
                    <input id="req-flavor" type="text" placeholder="${t('scanHelp.flavorPlaceholder')}"
                        class="w-full bg-[#2C2C2E] border border-white/10 text-white text-[15px] px-4 py-3 rounded-[14px] focus:outline-none placeholder-[#636366]" autocomplete="off">
                </div>
                <button onclick="submitProductRequest()"
                    class="w-full py-3 bg-white text-black text-[15px] font-semibold rounded-[14px] active:scale-95 transition-transform">
                    ${t('scanHelp.submitRequest')}
                </button>
            </div>`;
        return;
    }
    container.innerHTML = matches.map((s, i) =>
        `<div class="flex items-center px-4 py-3${i < matches.length - 1 ? ' border-b border-white/5' : ''}">
            <div class="flex-1 min-w-0">
                <span class="text-white text-[17px] font-medium">${s.brand}</span>
                <span class="text-[#8E8E93] text-[15px]"> · ${s.name}</span>
            </div>
            <span class="text-[#8E8E93] text-[13px] ml-3 flex-shrink-0">${s.nicotine} mg/g</span>
        </div>`
    ).join('');
}
window.onScanHelpSearch = onScanHelpSearch;

function submitProductRequest() {
    triggerHapticFeedback();

}
window.submitProductRequest = submitProductRequest;

function openDebugPortal() {
    console.log("openDebugPortal called");
    const modal = document.getElementById('debug-portal-modal');
    const backdrop = document.getElementById('debug-portal-backdrop');
    const card = document.getElementById('debug-portal-card');
    if (!modal || !backdrop || !card) {
        console.error("Debug Portal elements missing from DOM:", { modal, backdrop, card });
        return;
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    ['debug-unlock-id', 'debug-unlock-ean', 'debug-raw-scan'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });

    void modal.offsetWidth;
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    card.classList.remove('scale-95', 'opacity-0');
    card.classList.add('scale-100', 'opacity-100');

    populateDebugBadgesMenu();
}
window.openDebugPortal = openDebugPortal;

async function populateDebugBadgesMenu() {
    const container = document.getElementById('debug-badges-menu');
    if (!container) return;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            container.innerHTML = '<p class="text-[#FF3B30] text-[12px] text-center">No user logged in</p>';
            return;
        }

        if (!globalBadges || globalBadges.length === 0) {
            const { data: allBadges } = await supabaseClient.from('badges').select('*').order('level', { ascending: true });
            if (allBadges) globalBadges = allBadges;
        }

        if (!globalBadges || globalBadges.length === 0) {
            container.innerHTML = '<p class="text-[#8E8E93] text-[12px] text-center">No badges available</p>';
            return;
        }

        let html = '';
        globalBadges.forEach(badge => {
            const hasBadge = globalUserBadges.has(badge.id);
            const btnClass = hasBadge
                ? "bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] px-2.5 py-1 rounded-[8px] text-[11px] font-semibold"
                : "bg-white text-black px-2.5 py-1 rounded-[8px] text-[11px] font-semibold";
            const btnText = hasBadge ? "Remove" : "Unlock";
            const badgeImg = badge.image_url.startsWith('http') ? badge.image_url : (typeof GITHUB_BASE !== 'undefined' ? GITHUB_BASE + badge.image_url : badge.image_url);

            html += `
                <div class="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div class="flex items-center gap-2 min-w-0">
                        <img src="${badgeImg}" class="w-6 h-6 object-contain flex-shrink-0" onerror="this.src='https://via.placeholder.com/50'">
                        <div class="min-w-0">
                            <p class="text-white text-[12px] font-medium truncate leading-tight">${badge.name}</p>
                            <p class="text-[#8E8E93] text-[10px] truncate leading-none mt-0.5">${badge.category} (Lvl ${badge.level})</p>
                        </div>
                    </div>
                    <button onclick="triggerHapticFeedback(); toggleDebugBadge('${badge.id}', ${hasBadge}, this)"
                        class="${btnClass} active:scale-95 transition-transform flex-shrink-0">
                        ${btnText}
                    </button>
                </div>
            `;
        });

        container.innerHTML = html || '<p class="text-[#8E8E93] text-[12px] text-center">No badges found</p>';
    } catch (err) {
        console.error("Error populating debug badges:", err);
        container.innerHTML = '<p class="text-[#FF3B30] text-[12px] text-center">Failed to load badges</p>';
    }
}
window.populateDebugBadgesMenu = populateDebugBadgesMenu;

async function toggleDebugBadge(badgeId, hasBadge, btn) {
    btn.disabled = true;
    btn.innerText = "...";

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return alert("No user session");

        if (hasBadge) {

            const { data, error } = await supabaseClient
                .from('user_badges')
                .delete()
                .eq('user_id', user.id)
                .eq('badge_id', badgeId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("No rows deleted. Check if DELETE policy is missing on user_badges table in Supabase RLS.");
            }

            globalUserBadges.delete(badgeId);
        } else {

            const { error } = await supabaseClient
                .from('user_badges')
                .insert([{ user_id: user.id, badge_id: badgeId }]);

            if (error) throw error;

            globalUserBadges.add(badgeId);
        }

        localStorage.setItem('cached_user_badges', JSON.stringify([...globalUserBadges]));

        if (typeof updateBadgesStrip === 'function') updateBadgesStrip();
        if (typeof renderFeaturedBadgeOverlay === 'function') renderFeaturedBadgeOverlay();

        await populateDebugBadgesMenu();
    } catch (err) {
        console.error("Error toggling badge:", err);
        alert("Action failed: " + err.message);
        btn.disabled = false;
        btn.innerText = hasBadge ? "Remove" : "Unlock";
    }
}
window.toggleDebugBadge = toggleDebugBadge;

function closeDebugPortal() {
    const modal = document.getElementById('debug-portal-modal');
    const backdrop = document.getElementById('debug-portal-backdrop');
    const card = document.getElementById('debug-portal-card');
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
window.closeDebugPortal = closeDebugPortal;

function debugUnlockByID() {
    const val = document.getElementById('debug-unlock-id').value.trim();
    if (!val) return alert("Please enter a valid Snus ID.");
    const id = parseInt(val);
    if (isNaN(id)) return alert("ID must be a number.");

    simulateScan('unlock ID ' + id);
    closeDebugPortal();
}
window.debugUnlockByID = debugUnlockByID;

function debugUnlockByEAN() {
    const val = document.getElementById('debug-unlock-ean').value.trim();
    if (!val) return alert("Please enter a valid EAN.");

    simulateScan('unlock EAN ' + val);
    closeDebugPortal();
}
window.debugUnlockByEAN = debugUnlockByEAN;

function debugRawScan() {
    const val = document.getElementById('debug-raw-scan').value.trim();
    if (!val) return alert("Please enter command text.");

    simulateScan(val);
    closeDebugPortal();
}
window.debugRawScan = debugRawScan;

async function debugAddXP() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return alert("No active user session. Please log in first.");

        const { error } = await supabaseClient.rpc('increment_badge_xp', { uid: user.id, xp_amount: 1000 });
        if (error) throw error;

        if (typeof loadUserStats === 'function') await loadUserStats(user.id);
        if (typeof updateLivePerformance === 'function') updateLivePerformance();

        alert("Successfully added 1000 XP!");
    } catch (err) {
        console.error("Error adding debug XP:", err);
        alert("XP Addition Failed: " + err.message);
    }
}
window.debugAddXP = debugAddXP;

async function debugResetUsernameChanges() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return alert("No active user session. Please log in first.");

        const { error } = await supabaseClient.from('profiles').update({ username_changes: 0 }).eq('id', user.id);
        if (error) throw error;

        alert("Username changes successfully reset to 0!");
    } catch (err) {
        console.error("Error resetting username changes:", err);
        alert("Reset failed: " + err.message);
    }
}
window.debugResetUsernameChanges = debugResetUsernameChanges;

function debugEvaluateBadges() {
    if (typeof evaluateBadges === 'function') {
        evaluateBadges();
        alert("Badge threshold checks evaluated!");
    } else {
        alert("evaluateBadges() function is not available.");
    }
}
window.debugEvaluateBadges = debugEvaluateBadges;

function debugClearCache() {
    localStorage.clear();
    location.reload();
}
window.debugClearCache = debugClearCache;

const debugPortalFn = function() {
    openDebugPortal();
    return "Opening Debug Portal...";
};

try {
    Object.defineProperty(window, 'debugportal', {
        get: function() {
            openDebugPortal();
            return debugPortalFn;
        },
        configurable: true
    });
} catch (e) {
    window.debugportal = debugPortalFn;
    console.warn("Failed to define debugportal getter", e);
}
