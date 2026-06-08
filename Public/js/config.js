// Neuer Commit 15:26:42


// ==========================================
// 1. SETUP & KONFIGURATION
// ==========================================
const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/';
const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';

// Hier definieren wir den Client (darf nicht 'supabase' heißen, da das CDN dies blockiert)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Globale Caches für Dex-Views & Performance
window._dexCache = {};

const CARD_FONT_MAP = {
    system:      '-apple-system, sans-serif',
    rounded:     'ui-rounded, -apple-system, sans-serif',
    futura:      'Futura, -apple-system, sans-serif',
    serif:       'Georgia, serif',
    baskerville: 'Baskerville, serif',
    display:     'Didot, serif',
    copperplate: 'Copperplate, serif',
    mono:        'Menlo, monospace',
};

function getLocalCardAppearance() {
    return {
        colorId: localStorage.getItem('metalCardColorId') || 'white',
        colorHex: localStorage.getItem('metalCardColorHex') || '#ffffff',
        font: localStorage.getItem('metalCardFont') || 'system',
        anim: localStorage.getItem('metalCardAnim') || 'sweep',
        saturation: localStorage.getItem('metalCardSaturation') || '1.3',
        pattern: localStorage.getItem('metalCardPattern') || 'none',
        intensity: localStorage.getItem('metalCardIntensity') || '1'
    };
}

// ==========================================
// 1.2. CANVAS-BASED RENDER ENGINE FOR PREMIUM VISUALS
// ==========================================
const CardCanvasRenderer = {
    init(container, appearance) {
        this.destroy(container);

        const cardEl = container.querySelector('.metal-collector-card');
        if (!cardEl) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'metal-card-canvas';
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.borderRadius = '24px';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '0';

        cardEl.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const state = {
            canvas,
            ctx,
            cardEl,
            container,
            appearance,
            animationFrameId: null,
            lastTime: performance.now(),
            lastInteractionTime: performance.now(),
            pointerActive: false,
            px: 0,
            py: 0,
            lastSpawnX: 0,
            lastSpawnY: 0,
            lastSpawnTime: 0,
            ripples: [],
            golGrid: null,
            golIntensity: null,
            golLastPhysicsTime: 0,
            golStaticFramesCount: 0,
            fireworkSparks: [],
            fireworkGrid: null,
            lastFireworkLaunch: 0,
            // Topography peaks
            topoPeaks: [
                { x: 50, y: 50, tx: 50, ty: 50, speed: 0.008 },
                { x: 150, y: 100, tx: 150, ty: 100, speed: 0.005 },
                { x: 250, y: 150, tx: 250, ty: 150, speed: 0.012 }
            ],
            resize() {
                const rect = cardEl.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.resetTransform();
                ctx.scale(dpr, dpr);
                state.width = rect.width;
                state.height = rect.height;

                // Randomize peak targets and positions
                state.topoPeaks.forEach(peak => {
                    if (peak.x === 50 && peak.y === 50) {
                        peak.x = Math.random() * rect.width;
                        peak.y = Math.random() * rect.height;
                    }
                    peak.tx = Math.random() * rect.width;
                    peak.ty = Math.random() * rect.height;
                });
            }
        };

        state.resize();
        window.addEventListener('resize', state.resize);

        const cols = 36;
        const rows = 18;
        state.cols = cols;
        state.rows = rows;
        state.golGrid = new Uint8Array(cols * rows);
        state.golIntensity = new Float32Array(cols * rows);
        state.fireworkGrid = new Float32Array(cols * rows);

        function reseedGol() {
            for (let i = 0; i < cols * rows; i++) {
                state.golGrid[i] = Math.random() < 0.22 ? 1 : 0;
            }
            state.golStaticFramesCount = 0;
        }
        reseedGol();
        state.reseedGol = reseedGol;

        function spawnFireworkExplosion(state, cx, cy) {
            const sparkCount = 20 + Math.floor(Math.random() * 15);
            for (let i = 0; i < sparkCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 12;
                state.fireworkSparks.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0,
                    decay: 0.6 + Math.random() * 0.9
                });
            }
        }
        state.spawnFireworkExplosion = spawnFireworkExplosion;

        const onPointerMove = (e) => {
            state.pointerActive = true;
            state.lastInteractionTime = performance.now();
            const rect = cardEl.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            state.px = clientX - rect.left;
            state.py = clientY - rect.top;

            const anim = appearance.anim || 'sweep';
            const pattern = appearance.pattern || 'none';
            if (anim === 'ripple' || pattern === 'cubes') {
                const now = performance.now();
                const dx = state.px - state.lastSpawnX;
                const dy = state.py - state.lastSpawnY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 15 || now - state.lastSpawnTime > 150) {
                    state.ripples.push({
                        x: state.px,
                        y: state.py,
                        radius: 0,
                        maxRadius: 220,
                        opacity: 1.0,
                        speed: 140
                    });
                    state.lastSpawnX = state.px;
                    state.lastSpawnY = state.py;
                    state.lastSpawnTime = now;
                }
            }
        };

        const onPointerLeave = () => {
            state.pointerActive = false;
        };

        const onPointerDown = (e) => {
            state.pointerActive = true;
            state.lastInteractionTime = performance.now();
            const rect = cardEl.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            state.px = clientX - rect.left;
            state.py = clientY - rect.top;

            const anim = appearance.anim || 'sweep';
            const pattern = appearance.pattern || 'none';
            if (anim === 'firework' && pattern === 'cubes') {
                const margin = 10;
                const gap = 2;
                const availW = state.width - 2 * margin;
                const availH = state.height - 2 * margin;
                const cellW = (availW - (cols - 1) * gap) / cols;
                const cellH = (availH - (rows - 1) * gap) / rows;
                const cx = Math.max(0, Math.min(cols - 1, Math.floor((state.px - margin) / (cellW + gap))));
                const cy = Math.max(0, Math.min(rows - 1, Math.floor((state.py - margin) / (cellH + gap))));
                spawnFireworkExplosion(state, cx, cy);
            } else if (anim === 'ripple' || pattern === 'cubes') {
                state.ripples.push({
                    x: state.px,
                    y: state.py,
                    radius: 0,
                    maxRadius: 220,
                    opacity: 1.0,
                    speed: 140
                });
                state.lastSpawnX = state.px;
                state.lastSpawnY = state.py;
                state.lastSpawnTime = performance.now();
            }
        };

        cardEl.addEventListener('mousemove', onPointerMove);
        cardEl.addEventListener('touchmove', onPointerMove, { passive: true });
        cardEl.addEventListener('mousedown', onPointerDown);
        cardEl.addEventListener('touchstart', onPointerDown, { passive: true });
        cardEl.addEventListener('mouseleave', onPointerLeave);
        cardEl.addEventListener('touchend', onPointerLeave);

        state.cleanupEvents = () => {
            cardEl.removeEventListener('mousemove', onPointerMove);
            cardEl.removeEventListener('touchmove', onPointerMove);
            cardEl.removeEventListener('mousedown', onPointerDown);
            cardEl.removeEventListener('touchstart', onPointerDown);
            cardEl.removeEventListener('mouseleave', onPointerLeave);
            cardEl.removeEventListener('touchend', onPointerLeave);
            window.removeEventListener('resize', state.resize);
        };

        const loop = (time) => {
            const dt = (time - state.lastTime) / 1000;
            state.lastTime = time;

            ctx.clearRect(0, 0, state.width, state.height);

            const anim = appearance.anim || 'sweep';
            const pattern = appearance.pattern || 'none';
            const intensity = parseFloat(appearance.intensity || '1');
            const colorHex = appearance.colorHex || '#ffffff';

            let r = 255, g = 255, b = 255;
            const hex = (colorHex.match(/#([0-9a-fA-F]{6})/) || [])[1];
            if (hex) {
                r = parseInt(hex.slice(0,2), 16);
                g = parseInt(hex.slice(2,4), 16);
                b = parseInt(hex.slice(4,6), 16);
            }

            // Clip all canvas rendering to card border radius (24px)
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, state.width, state.height, 24);
            ctx.clip();

            if (anim === 'landscape') {
                // macOS Sonoma Wavy Gradient Landscape
                const forceX = state.pointerActive ? (state.px - state.width / 2) * 0.12 : 0;
                const forceY = state.pointerActive ? (state.py - state.height / 2) * 0.12 : 0;

                // 1. Sky/Background Gradient (Blue-Purple)
                const bgGrad = ctx.createLinearGradient(0, 0, state.width, state.height);
                bgGrad.addColorStop(0, '#5A62FF');
                bgGrad.addColorStop(0.5, '#A044FF');
                bgGrad.addColorStop(1, '#FF3B30');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, state.width, state.height);

                // 2. Wave Layer 1 (Red/Pink)
                ctx.beginPath();
                ctx.moveTo(0, state.height);
                const y1 = state.height * 0.38 + Math.sin(time * 0.0006) * 15 + forceY * 0.5;
                const cp1x = state.width * 0.4 + Math.cos(time * 0.0004) * 30 + forceX;
                const cp1y = state.height * 0.28 + Math.sin(time * 0.0005) * 20 + forceY;
                const cp2x = state.width * 0.7 + Math.sin(time * 0.0007) * 20 + forceX;
                const cp2y = state.height * 0.78 + Math.cos(time * 0.0006) * 15 + forceY;
                const end1y = state.height * 0.58 + Math.cos(time * 0.0005) * 10 + forceY * 0.5;
                ctx.lineTo(0, y1);
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, state.width, end1y);
                ctx.lineTo(state.width, state.height);
                ctx.closePath();
                const grad1 = ctx.createLinearGradient(0, y1, state.width, state.height);
                grad1.addColorStop(0, '#FF4B72');
                grad1.addColorStop(1, '#9C27B0');
                ctx.fillStyle = grad1;
                ctx.fill();

                // 3. Wave Layer 2 (Green/Teal)
                ctx.beginPath();
                ctx.moveTo(0, state.height);
                const y2 = state.height * 0.68 + Math.cos(time * 0.0005) * 12 + forceY * 0.6;
                const cp3x = state.width * 0.3 + Math.sin(time * 0.0006) * 25 + forceX * 0.8;
                const cp3y = state.height * 0.48 + Math.cos(time * 0.0007) * 15 + forceY * 0.8;
                const cp4x = state.width * 0.65 + Math.cos(time * 0.0005) * 20 + forceX * 0.8;
                const cp4y = state.height * 0.88 + Math.sin(time * 0.0004) * 10 + forceY * 0.8;
                const end2y = state.height * 0.73 + Math.sin(time * 0.0006) * 12 + forceY * 0.6;
                ctx.lineTo(0, y2);
                ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, state.width, end2y);
                ctx.lineTo(state.width, state.height);
                ctx.closePath();
                const grad2 = ctx.createLinearGradient(0, y2, state.width, state.height);
                grad2.addColorStop(0, '#00CDAC');
                grad2.addColorStop(1, '#02AAB0');
                ctx.fillStyle = grad2;
                ctx.fill();

                // 4. Wave Layer 3 (Vibrant Lime Green/Yellow)
                ctx.beginPath();
                ctx.moveTo(0, state.height);
                const y3 = state.height * 0.83 + Math.sin(time * 0.0007) * 10 + forceY * 0.7;
                const cp5x = state.width * 0.25 + Math.cos(time * 0.0005) * 20 + forceX * 0.6;
                const cp5y = state.height * 0.72 + Math.sin(time * 0.0006) * 12 + forceY * 0.7;
                const cp6x = state.width * 0.65 + Math.sin(time * 0.0004) * 15 + forceX * 0.6;
                const cp6y = state.height * 0.92 + Math.cos(time * 0.0007) * 8 + forceY * 0.7;
                const end3y = state.height * 0.88 + Math.cos(time * 0.0005) * 8 + forceY * 0.7;
                ctx.lineTo(0, y3);
                ctx.bezierCurveTo(cp5x, cp5y, cp6x, cp6y, state.width, end3y);
                ctx.lineTo(state.width, state.height);
                ctx.closePath();
                const grad3 = ctx.createLinearGradient(0, y3, state.width, state.height);
                grad3.addColorStop(0, '#D4FC79');
                grad3.addColorStop(1, '#96E6A1');
                ctx.fillStyle = grad3;
                ctx.fill();
            } else if (anim === 'mountains') {
                // macOS Big Sur Mountains Gradient Wallpaper
                const forceX = state.pointerActive ? (state.px - state.width / 2) * 0.12 : 0;
                const forceY = state.pointerActive ? (state.py - state.height / 2) * 0.12 : 0;

                // 1. Sky/Sunset Background (Cyan/Blue to Pink)
                const bgGrad = ctx.createLinearGradient(0, 0, state.width, state.height);
                bgGrad.addColorStop(0, '#00C6FF');
                bgGrad.addColorStop(0.5, '#0072FF');
                bgGrad.addColorStop(1, '#FF758C');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, state.width, state.height);

                // 2. Mountain Layer 1 (Orange/Yellow)
                ctx.beginPath();
                ctx.moveTo(0, state.height);
                const y1 = state.height * 0.48 + Math.sin(time * 0.0005) * 15 + forceY * 0.5;
                const cp1x = state.width * 0.35 + Math.cos(time * 0.0006) * 25 + forceX;
                const cp1y = state.height * 0.38 + Math.sin(time * 0.0004) * 18 + forceY;
                const cp2x = state.width * 0.7 + Math.sin(time * 0.0005) * 20 + forceX;
                const cp2y = state.height * 0.73 + Math.cos(time * 0.0006) * 15 + forceY;
                const end1y = state.height * 0.63 + Math.cos(time * 0.0004) * 10 + forceY * 0.5;
                ctx.lineTo(0, y1);
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, state.width, end1y);
                ctx.lineTo(state.width, state.height);
                ctx.closePath();
                const grad1 = ctx.createLinearGradient(0, y1, state.width, state.height);
                grad1.addColorStop(0, '#FAD961');
                grad1.addColorStop(1, '#F76B1C');
                ctx.fillStyle = grad1;
                ctx.fill();

                // 3. Mountain Layer 2 (Vibrant Red/Pink)
                ctx.beginPath();
                ctx.moveTo(0, state.height);
                const y2 = state.height * 0.63 + Math.cos(time * 0.0006) * 12 + forceY * 0.6;
                const cp3x = state.width * 0.3 + Math.sin(time * 0.0005) * 20 + forceX * 0.8;
                const cp3y = state.height * 0.53 + Math.cos(time * 0.0006) * 15 + forceY * 0.8;
                const cp4x = state.width * 0.65 + Math.cos(time * 0.0004) * 15 + forceX * 0.8;
                const cp4y = state.height * 0.83 + Math.sin(time * 0.0005) * 10 + forceY * 0.8;
                const end2y = state.height * 0.73 + Math.sin(time * 0.0006) * 12 + forceY * 0.6;
                ctx.lineTo(0, y2);
                ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, state.width, end2y);
                ctx.lineTo(state.width, state.height);
                ctx.closePath();
                const grad2 = ctx.createLinearGradient(0, y2, state.width, state.height);
                grad2.addColorStop(0, '#FF3B30');
                grad2.addColorStop(1, '#FF2D55');
                ctx.fillStyle = grad2;
                ctx.fill();

                // 4. Mountain Layer 3 (Deep Purple/Lila/Blue)
                ctx.beginPath();
                ctx.moveTo(0, state.height);
                const y3 = state.height * 0.78 + Math.sin(time * 0.0006) * 10 + forceY * 0.7;
                const cp5x = state.width * 0.25 + Math.cos(time * 0.0005) * 15 + forceX * 0.6;
                const cp5y = state.height * 0.7 + Math.sin(time * 0.0007) * 12 + forceY * 0.7;
                const cp6x = state.width * 0.6 + Math.sin(time * 0.0004) * 15 + forceX * 0.6;
                const cp6y = state.height * 0.93 + Math.cos(time * 0.0006) * 8 + forceY * 0.7;
                const end3y = state.height * 0.85 + Math.cos(time * 0.0005) * 8 + forceY * 0.7;
                ctx.lineTo(0, y3);
                ctx.bezierCurveTo(cp5x, cp5y, cp6x, cp6y, state.width, end3y);
                ctx.lineTo(state.width, state.height);
                ctx.closePath();
                const grad3 = ctx.createLinearGradient(0, y3, state.width, state.height);
                grad3.addColorStop(0, '#B06AB3');
                grad3.addColorStop(1, '#4568DC');
                ctx.fillStyle = grad3;
                ctx.fill();
            }

            if (pattern === 'cubes' && anim !== 'landscape' && anim !== 'mountains') {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, state.width, state.height);
            }

            const golActive = anim === 'gol' && pattern === 'cubes';
            if (golActive) {
                if (time - state.golLastPhysicsTime > 100) {
                    state.golLastPhysicsTime = time;

                    const nextGrid = new Uint8Array(cols * rows);
                    let aliveCount = 0;
                    let changes = 0;

                    for (let y = 0; y < rows; y++) {
                        for (let x = 0; x < cols; x++) {
                            const neighbors = getNeighbors(state.golGrid, x, y, cols, rows);
                            const idx = y * cols + x;
                            const isAlive = state.golGrid[idx] > 0;
                            if (isAlive) {
                                if (neighbors === 2 || neighbors === 3) {
                                    nextGrid[idx] = 1;
                                    aliveCount++;
                                } else {
                                    nextGrid[idx] = 0;
                                    changes++;
                                }
                            } else {
                                if (neighbors === 3) {
                                    nextGrid[idx] = 1;
                                    aliveCount++;
                                    changes++;
                                } else {
                                    nextGrid[idx] = 0;
                                }
                            }
                        }
                    }

                    if (changes === 0) {
                        state.golStaticFramesCount++;
                    } else {
                        state.golStaticFramesCount = 0;
                    }

                    state.golGrid.set(nextGrid);

                    if (aliveCount < 5 || state.golStaticFramesCount > 10) {
                        reseedGol();
                    }
                }
            }

            for (let i = 0; i < cols * rows; i++) {
                const target = state.golGrid[i];
                if (target > 0) {
                    state.golIntensity[i] = Math.min(1.0, state.golIntensity[i] + dt * 4.0);
                } else {
                    state.golIntensity[i] = Math.max(0.0, state.golIntensity[i] - dt * 1.5);
                }
            }

            // --- FIREWORK ANIMATION PHYSICS ---
            const fireworkActive = anim === 'firework' && pattern === 'cubes';
            if (fireworkActive) {
                // Decay the entire grid intensity
                for (let i = 0; i < cols * rows; i++) {
                    state.fireworkGrid[i] = Math.max(0.0, state.fireworkGrid[i] - dt * 2.5);
                }

                // Random firework launches
                const now = time;
                if (now - state.lastFireworkLaunch > 1200 + Math.random() * 800) {
                    state.lastFireworkLaunch = now;
                    const rx = Math.floor(Math.random() * cols);
                    const ry = Math.floor(Math.random() * (rows - 4)) + 2; // avoid outer edges
                    spawnFireworkExplosion(state, rx, ry);
                }

                // Update sparks
                for (let i = state.fireworkSparks.length - 1; i >= 0; i--) {
                    const spark = state.fireworkSparks[i];
                    spark.vy += 4.5 * dt; // gravity
                    spark.vx *= 0.95;    // friction
                    spark.vy *= 0.95;
                    spark.x += spark.vx * dt;
                    spark.y += spark.vy * dt;
                    spark.life -= spark.decay * dt;

                    if (spark.life <= 0 || spark.x < 0 || spark.x >= cols || spark.y < 0 || spark.y >= rows) {
                        state.fireworkSparks.splice(i, 1);
                    } else {
                        const cx = Math.floor(spark.x);
                        const cy = Math.floor(spark.y);
                        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
                            const idx = cy * cols + cx;
                            state.fireworkGrid[idx] = Math.min(1.0, state.fireworkGrid[idx] + spark.life * 0.95);
                            
                            // Light bleed to 4-way neighbors
                            const bleed = spark.life * 0.35;
                            const neighbors = [
                                { x: cx - 1, y: cy },
                                { x: cx + 1, y: cy },
                                { x: cx, y: cy - 1 },
                                { x: cx, y: cy + 1 }
                            ];
                            for (let n = 0; n < neighbors.length; n++) {
                                const nx = neighbors[n].x;
                                const ny = neighbors[n].y;
                                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                                    const nIdx = ny * cols + nx;
                                    state.fireworkGrid[nIdx] = Math.min(1.0, state.fireworkGrid[nIdx] + bleed);
                                }
                            }
                        }
                    }
                }
            } else {
                // If not active, quickly drain firework grid
                if (state.fireworkGrid) {
                    for (let i = 0; i < cols * rows; i++) {
                        if (state.fireworkGrid[i] > 0) {
                            state.fireworkGrid[i] = Math.max(0.0, state.fireworkGrid[i] - dt * 5.0);
                        }
                    }
                }
                if (state.fireworkSparks && state.fireworkSparks.length > 0) {
                    state.fireworkSparks = [];
                }
            }

            for (let i = state.ripples.length - 1; i >= 0; i--) {
                const rip = state.ripples[i];
                rip.radius += rip.speed * dt;
                rip.opacity = 1.0 - (rip.radius / rip.maxRadius);
                if (rip.radius >= rip.maxRadius || rip.opacity <= 0) {
                    state.ripples.splice(i, 1);
                }
            }

            if (anim === 'ripple' || (pattern === 'cubes' && anim !== 'firework' && anim !== 'gol')) {
                if (!state._nextBgRippleTime) {
                    state._nextBgRippleTime = time + 500 + Math.random() * 1500;
                }
                if (time > state._nextBgRippleTime) {
                    state._nextBgRippleTime = time + 600 + Math.random() * 1400;
                    state.ripples.push({
                        x: Math.random() * state.width,
                        y: Math.random() * state.height,
                        radius: 0,
                        maxRadius: 100 + Math.random() * 120,
                        opacity: 0.2 + Math.random() * 0.35,
                        speed: 60 + Math.random() * 60
                    });
                }
            }

            if (pattern === 'cubes') {
                const margin = 10;
                const gap = 2;
                const availW = state.width - 2 * margin;
                const availH = state.height - 2 * margin;
                const cellW = (availW - (cols - 1) * gap) / cols;
                const cellH = (availH - (rows - 1) * gap) / rows;

                for (let rIdx = 0; rIdx < rows; rIdx++) {
                    for (let cIdx = 0; cIdx < cols; cIdx++) {
                        // Skip the 4 corner cubes
                        if ((rIdx === 0 || rIdx === rows - 1) && (cIdx === 0 || cIdx === cols - 1)) {
                            continue;
                        }

                        const cx = margin + cIdx * (cellW + gap) + cellW/2;
                        const cy = margin + rIdx * (cellH + gap) + cellH/2;

                        let f = 0.0;
                        let isSparkling = false;
                        if (anim === 'gol') {
                            f = state.golIntensity[rIdx * cols + cIdx];
                        } else if (anim === 'firework') {
                            f = state.fireworkGrid[rIdx * cols + cIdx];
                            if (f > 0.04) {
                                isSparkling = true;
                            }
                        } else if (anim === 'ripple') {
                            let ripSum = 0;
                            for (let r = 0; r < state.ripples.length; r++) {
                                const rip = state.ripples[r];
                                const dist = Math.sqrt((cx - rip.x)**2 + (cy - rip.y)**2);
                                const wHalf = 24;
                                if (Math.abs(dist - rip.radius) < wHalf) {
                                    ripSum += (1.0 - Math.abs(dist - rip.radius) / wHalf) * rip.opacity;
                                }
                            }
                            f = Math.min(1.0, ripSum);
                        } else if (anim === 'sweep') {
                            const pos = cx + cy * 0.4;
                            const sweepPos = (time * 0.15) % (state.width * 1.5) - state.width * 0.25;
                            const dist = Math.abs(pos - sweepPos);
                            if (dist < 60) {
                                f = 1.0 - dist / 60;
                            }
                        } else if (anim === 'pulse') {
                            const centerDist = Math.sqrt((cx - state.width/2)**2 + (cy - state.height/2)**2);
                            f = Math.sin(time * 0.003 - centerDist * 0.015) * 0.45 + 0.55;
                        } else if (anim === 'none') {
                            if (state.pointerActive) {
                                const dist = Math.sqrt((cx - state.px)**2 + (cy - state.py)**2);
                                if (dist < 70) {
                                    f = (1.0 - dist / 70) * 0.8;
                                }
                            }
                        }

                        const x = margin + cIdx * (cellW + gap);
                        const y = margin + rIdx * (cellH + gap);
                        const baseOpacity = 0.06;
                        let op = Math.min(0.95, baseOpacity + f * intensity * 0.22);
                        if (isSparkling) {
                            if (Math.random() < 0.45) {
                                op = baseOpacity + (Math.random() < 0.2 ? 0.01 : 0.06);
                            } else {
                                op = Math.min(0.95, baseOpacity + f * intensity * 0.5);
                            }
                        }
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${op})`;
                        drawRoundRect(ctx, x, y, cellW, cellH, 1.5);
                    }
                }
            } else {
                if (anim === 'ripple') {
                    for (let rIdx = 0; rIdx < state.ripples.length; rIdx++) {
                        const rip = state.ripples[rIdx];
                        const grad = ctx.createRadialGradient(rip.x, rip.y, Math.max(0, rip.radius - 24), rip.x, rip.y, rip.radius + 24);
                        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
                        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${rip.opacity * 0.25 * intensity})`);
                        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(rip.x, rip.y, rip.radius + 24, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${rip.opacity * 0.4 * intensity})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (anim === 'topography') {
                    state.topoPeaks.forEach((peak, idx) => {
                        // Update position
                        if (idx === 2 && state.pointerActive) {
                            peak.x += (state.px - peak.x) * 0.05;
                            peak.y += (state.py - peak.y) * 0.05;
                        } else {
                            if (Math.random() < 0.005) {
                                peak.tx = Math.random() * state.width;
                                peak.ty = Math.random() * state.height;
                            }
                            peak.x += (peak.tx - peak.x) * peak.speed;
                            peak.y += (peak.ty - peak.y) * peak.speed;
                        }

                        // Draw concentric contours
                        const contourCount = 8;
                        const spacing = 22;
                        for (let c = 1; c <= contourCount; c++) {
                            const baseR = c * spacing;
                            ctx.beginPath();
                            const steps = 72;
                            for (let j = 0; j <= steps; j++) {
                                const theta = (j / steps) * Math.PI * 2;
                                const def = 14 * Math.sin(2 * theta + time * 0.0008 + idx) +
                                            9 * Math.cos(3 * theta - time * 0.0012 + idx * 2) +
                                            4 * Math.sin(5 * theta + time * 0.002 + idx * 3);
                                const radius = Math.max(5, baseR + def);
                                const x = peak.x + radius * Math.cos(theta);
                                const y = peak.y + radius * Math.sin(theta);
                                if (j === 0) {
                                    ctx.moveTo(x, y);
                                } else {
                                    ctx.lineTo(x, y);
                                }
                            }
                            ctx.closePath();

                            const maxR = contourCount * spacing;
                            const distToEdge = 1.0 - (baseR / maxR);
                            const op = Math.max(0, distToEdge * 0.35);

                            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${op * intensity})`;
                            ctx.lineWidth = 1.2;
                            ctx.stroke();

                            if (c % 3 === 0) {
                                const textAngle = time * 0.0001 + idx + c;
                                const textDef = 14 * Math.sin(2 * textAngle + time * 0.0008 + idx) +
                                                9 * Math.cos(3 * textAngle - time * 0.0012 + idx * 2) +
                                                4 * Math.sin(5 * textAngle + time * 0.002 + idx * 3);
                                const textR = baseR + textDef;
                                const tx = peak.x + textR * Math.cos(textAngle);
                                const ty = peak.y + textR * Math.sin(textAngle);

                                ctx.save();
                                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${op * 0.6 * intensity})`;
                                ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(`${c * 100}m`, tx, ty);
                                ctx.restore();
                            }
                        }
                    });
                }
            }

            ctx.restore();
            state.animationFrameId = requestAnimationFrame(loop);
        };

        state.animationFrameId = requestAnimationFrame(loop);
        container._cardCanvasState = state;
    },

    destroy(container) {
        if (container._cardCanvasState) {
            const state = container._cardCanvasState;
            if (state.animationFrameId) {
                cancelAnimationFrame(state.animationFrameId);
            }
            if (state.cleanupEvents) {
                state.cleanupEvents();
            }
            if (state.canvas && state.canvas.parentNode) {
                state.canvas.parentNode.removeChild(state.canvas);
            }
            container._cardCanvasState = null;
        }
    }
};

function getNeighbors(grid, x, y, cols, rows) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + cols) % cols;
            const ny = (y + dy + rows) % rows;
            if (grid[ny * cols + nx] > 0) {
                count++;
            }
        }
    }
    return count;
}

function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

function applyCardAppearance(container, appearance) {
    if (!container) return;
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    if (!appearance) appearance = {};
    const colorHex = appearance.colorHex || '#ffffff';
    const intensity = appearance.intensity || '1';
    const font = appearance.font || 'system';
    const saturation = appearance.saturation || '1.3';
    const anim = appearance.anim || 'sweep';
    const pattern = appearance.pattern || 'none';

    container.style.setProperty('--card-glow-color', colorHex);
    container.style.setProperty('--card-glow-intensity', intensity);
    container.style.setProperty('--card-font', CARD_FONT_MAP[font] || CARD_FONT_MAP.system);
    container.style.setProperty('--card-saturation', saturation);

    const hex = (colorHex.match(/#([0-9a-fA-F]{6})/) || [])[1];
    if (hex) {
        const r = parseInt(hex.slice(0,2), 16);
        const g = parseInt(hex.slice(2,4), 16);
        const b = parseInt(hex.slice(4,6), 16);
        container.style.setProperty('--card-border-color', `rgba(${r},${g},${b},0.45)`);
        container.style.setProperty('--card-outer-glow', `rgba(${r},${g},${b},0.25)`);
    } else {
        container.style.setProperty('--card-border-color', 'rgba(255,255,255,0.15)');
        container.style.setProperty('--card-outer-glow', 'rgba(255,255,255,0.08)');
    }

    container.dataset.anim = anim;
    container.dataset.pattern = pattern;

    const patternEl = container.querySelector('.metal-card-pattern');
    if (patternEl) {
        patternEl.className = 'metal-card-pattern';
        if (pattern !== 'none') patternEl.classList.add('p-' + pattern);
    }

    // Canvas support check
    const needsCanvas = (anim === 'ripple' || anim === 'gol' || anim === 'firework' || anim === 'landscape' || anim === 'mountains' || pattern === 'cubes');
    if (needsCanvas) {
        CardCanvasRenderer.init(container, appearance);
    } else {
        CardCanvasRenderer.destroy(container);
    }
}

// ==========================================
// 1.5. SPLASH SCREEN / LOADING
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const video  = document.getElementById('splash-video');
    const splash = document.getElementById('splash-screen');

    function dismissSplash() {
        if (!splash || splash.dataset.dismissed) return;
        splash.dataset.dismissed = '1';
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; }, 600);
    }

    if (video) {
        video.play().catch(err => {
            console.log("Video-Autoplay blocked:", err);
            // Autoplay blockiert → sofort dimmen (kurze Pause für UX)
            setTimeout(dismissSplash, 400);
        });

        video.addEventListener('ended', dismissSplash, { once: true });

        // Sicherheitsnetz: Splash spätestens nach 5s schließen
        setTimeout(dismissSplash, 5000);
    } else {
        dismissSplash();
    }

    loadLatestGitHubCommit();
    checkUser();
    initDexScrollAnimation();
    loadBadgesFromCache();

    // Initialize metal card glow color + border + font locally on the container
    applyCardAppearance('metal-card-container', getLocalCardAppearance());

    // Initialize tracking mode preview label
    const trackingModeEl = document.getElementById('tracking-mode-preview');
    if (trackingModeEl) {
        const storedMode = localStorage.getItem('snusTrackingMode') || 'full';
        const key = storedMode === 'individual' ? 'tracking.modeIndividual' : 'tracking.modeFull';
        trackingModeEl.setAttribute('data-i18n', key);
        trackingModeEl.innerText = t(key);
    }
});

// Open camera from native bridge (sdx-open-camera custom event)
window.addEventListener('sdx-open-camera', function () {
    if (typeof openScanModal === 'function') openScanModal();
});

