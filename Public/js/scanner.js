let html5QrCode = null;
let isProcessingScan = false;
let scanFlashlightOn = false;
let scanCurrentTrack = null; // MediaStreamTrack for torch control
let scanCameraIndex = 0;     // 0=normal, 1=wide, 2=tele
const SCAN_CAMERA_MODES = [
    { label: 'Normal', zoom: null, facingMode: 'environment' },
    { label: 'Weitwinkel', zoom: 0.5, facingMode: 'environment' },
    { label: 'Telelinse', zoom: 2.0, facingMode: 'environment' },
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
    if (flashlightLabel) flashlightLabel.textContent = 'Licht';
    if (cameraLabel) cameraLabel.textContent = SCAN_CAMERA_MODES[0].label;

    scanModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

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
        if (label) label.textContent = scanFlashlightOn ? 'An' : 'Licht';
    } catch (e) {
        console.error('Torch not supported:', e);
    }
}

async function cycleScanCamera() {
    scanCameraIndex = (scanCameraIndex + 1) % SCAN_CAMERA_MODES.length;
    const mode = SCAN_CAMERA_MODES[scanCameraIndex];
    const label = document.getElementById('scan-camera-label');
    if (label) label.textContent = mode.label;

    // If zoom is supported by the current track, use applyConstraints
    if (scanCurrentTrack && typeof scanCurrentTrack.getCapabilities === 'function') {
        const capabilities = scanCurrentTrack.getCapabilities();
        if (capabilities.zoom && mode.zoom !== null) {
            try {
                const clampedZoom = Math.min(Math.max(mode.zoom, capabilities.zoom.min), capabilities.zoom.max);
                await scanCurrentTrack.applyConstraints({ advanced: [{ zoom: clampedZoom }] });
                return;
            } catch (e) {
                console.warn('Zoom constraint failed, ignoring:', e);
            }
        }
    }
    // Fallback: restart scanner with a zoom hint (no-op on unsupported devices)
    console.log(`Camera mode set to: ${mode.label} (hardware zoom not available on this device)`);
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
