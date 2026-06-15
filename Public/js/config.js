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

function checkAnimationUnlocked(animId) {
    if (animId === 'none') return true;
    // Creator Code override: always allow if redeemed via a creator code
    try {
        const creatorAnims = JSON.parse(localStorage.getItem('creatorUnlockedAnimations') || '[]');
        if (creatorAnims.includes(animId)) return true;
    } catch(e) {}
    if (typeof actualXp !== 'number') return true; // fallback while loading
    const currentXp = actualXp;
    if (animId === 'sweep') return currentXp >= 300;
    if (animId === 'pulse') return currentXp >= 500;
    if (animId === 'ripple') return currentXp >= 750;
    if (animId === 'gol') return currentXp >= 1000;
    if (animId === 'firework') return currentXp >= 1200;
    if (animId === 'wave') return currentXp >= 2000;
    if (animId === 'mountains') {
        const supporterBadgeId = 'da77f766-3d23-41c3-ab0e-d716cf9bdf7b';
        return typeof globalUserBadges !== 'undefined' && globalUserBadges.has(supporterBadgeId);
    }
    return true;
}

function checkPatternUnlocked(patternId) {
    if (patternId === 'none') return true;
    if (typeof globalSnusData === 'undefined' || typeof globalUserCollection === 'undefined' || !globalSnusData.length) return true; // fallback
    
    // Count collected snus of each rarity
    const countRarity = (rarity) => {
        return globalSnusData.filter(s => 
            globalUserCollection[s.id] && 
            (s.rarity || 'common').toLowerCase().trim() === rarity
        ).length;
    };
    
    if (patternId === 'dots') return countRarity('common') >= 1;
    if (patternId === 'grid') return countRarity('uncommon') >= 1;
    if (patternId === 'lines') return countRarity('rare') >= 1;
    if (patternId === 'carbon') return countRarity('epic') >= 1;
    if (patternId === 'hex') return countRarity('exotic') >= 1;
    if (patternId === 'rings') return countRarity('legendary') >= 1;
    if (patternId === 'cubes') {
        const totalCollected = globalSnusData.filter(s => globalUserCollection[s.id]).length;
        return countRarity('legendary') >= 3 && totalCollected >= 6;
    }
    return true;
}

function getLocalCardAppearance() {
    let anim = localStorage.getItem('metalCardAnim') || 'sweep';
    let pattern = localStorage.getItem('metalCardPattern') || 'none';
    
    if (typeof checkAnimationUnlocked === 'function' && !checkAnimationUnlocked(anim)) {
        anim = 'sweep';
    }
    if (typeof checkPatternUnlocked === 'function' && !checkPatternUnlocked(pattern)) {
        pattern = 'none';
    }

    return {
        colorId: localStorage.getItem('metalCardColorId') || 'white',
        colorHex: localStorage.getItem('metalCardColorHex') || '#ffffff',
        font: localStorage.getItem('metalCardFont') || 'system',
        anim: anim,
        saturation: localStorage.getItem('metalCardSaturation') || '1.3',
        pattern: pattern,
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

                // Compute dynamic columns and rows for cubes pattern
                const cellSize = 8;
                const gap = 2;
                const margin = 10;
                const availW = state.width - 2 * margin;
                const availH = state.height - 2 * margin;
                const newCols = Math.max(4, Math.floor((availW + gap) / (cellSize + gap)));
                const newRows = Math.max(4, Math.floor((availH + gap) / (cellSize + gap)));

                if (newCols !== state.cols || newRows !== state.rows) {
                    state.cols = newCols;
                    state.rows = newRows;
                    state.golGrid = new Uint8Array(newCols * newRows);
                    state.golIntensity = new Float32Array(newCols * newRows);
                    state.fireworkGrid = new Float32Array(newCols * newRows);
                    if (state.reseedGol) {
                        state.reseedGol();
                    }
                }
            }
        };

        state.resize();
        window.addEventListener('resize', state.resize);

        function reseedGol() {
            const size = state.cols * state.rows;
            for (let i = 0; i < size; i++) {
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
                const cellSize = 8;
                const gap = 2;
                const margin = 10;
                const availW = state.width - 2 * margin;
                const availH = state.height - 2 * margin;
                const gridW = state.cols * cellSize + (state.cols - 1) * gap;
                const gridH = state.rows * cellSize + (state.rows - 1) * gap;
                const marginX = margin + (availW - gridW) / 2;
                const marginY = margin + (availH - gridH) / 2;
                const cx = Math.max(0, Math.min(state.cols - 1, Math.floor((state.px - marginX) / (cellSize + gap))));
                const cy = Math.max(0, Math.min(state.rows - 1, Math.floor((state.py - marginY) / (cellSize + gap))));
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

            if (pattern === 'cubes') {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, state.width, state.height);
            }

            const golActive = anim === 'gol' && pattern === 'cubes';
            if (golActive) {
                if (time - state.golLastPhysicsTime > 100) {
                    state.golLastPhysicsTime = time;

                    const nextGrid = new Uint8Array(state.cols * state.rows);
                    let aliveCount = 0;
                    let changes = 0;

                    for (let y = 0; y < state.rows; y++) {
                        for (let x = 0; x < state.cols; x++) {
                            const neighbors = getNeighbors(state.golGrid, x, y, state.cols, state.rows);
                            const idx = y * state.cols + x;
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

            for (let i = 0; i < state.cols * state.rows; i++) {
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
                for (let i = 0; i < state.cols * state.rows; i++) {
                    state.fireworkGrid[i] = Math.max(0.0, state.fireworkGrid[i] - dt * 2.5);
                }

                // Random firework launches
                const now = time;
                if (now - state.lastFireworkLaunch > 1200 + Math.random() * 800) {
                    state.lastFireworkLaunch = now;
                    const rx = Math.floor(Math.random() * state.cols);
                    const ry = Math.floor(Math.random() * (state.rows - 4)) + 2; // avoid outer edges
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

                    if (spark.life <= 0 || spark.x < 0 || spark.x >= state.cols || spark.y < 0 || spark.y >= state.rows) {
                        state.fireworkSparks.splice(i, 1);
                    } else {
                        const cx = Math.floor(spark.x);
                        const cy = Math.floor(spark.y);
                        if (cx >= 0 && cx < state.cols && cy >= 0 && cy < state.rows) {
                            const idx = cy * state.cols + cx;
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
                                if (nx >= 0 && nx < state.cols && ny >= 0 && ny < state.rows) {
                                    const nIdx = ny * state.cols + nx;
                                    state.fireworkGrid[nIdx] = Math.min(1.0, state.fireworkGrid[nIdx] + bleed);
                                }
                            }
                        }
                    }
                }
            } else {
                // If not active, quickly drain firework grid
                if (state.fireworkGrid) {
                    for (let i = 0; i < state.cols * state.rows; i++) {
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
                const cellSize = 8;
                const gap = 2;
                const margin = 10;
                const availW = state.width - 2 * margin;
                const availH = state.height - 2 * margin;
                const gridW = state.cols * cellSize + (state.cols - 1) * gap;
                const gridH = state.rows * cellSize + (state.rows - 1) * gap;
                const marginX = margin + (availW - gridW) / 2;
                const marginY = margin + (availH - gridH) / 2;

                for (let rIdx = 0; rIdx < state.rows; rIdx++) {
                    for (let cIdx = 0; cIdx < state.cols; cIdx++) {
                        // Skip the 4 corner cubes
                        if ((rIdx === 0 || rIdx === state.rows - 1) && (cIdx === 0 || cIdx === state.cols - 1)) {
                            continue;
                        }

                        const cx = marginX + cIdx * (cellSize + gap) + cellSize/2;
                        const cy = marginY + rIdx * (cellSize + gap) + cellSize/2;

                        let f = 0.0;
                        let isSparkling = false;
                        if (anim === 'gol') {
                            f = state.golIntensity[rIdx * state.cols + cIdx];
                        } else if (anim === 'firework') {
                            f = state.fireworkGrid[rIdx * state.cols + cIdx];
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
                        } else if (anim === 'wave') {
                            // Silk ribbon: compute the ribbon's Y position at this column
                            // Amplitude and phase shift slowly over time like fabric fluttering
                            const T = time * 0.001; // time in seconds
                            const nx = cIdx / state.cols;  // 0..1 left to right
                            const ny = rIdx / state.rows;  // 0..1 top to bottom

                            // Amplitude slowly breathes between narrow and wide
                            const amp1 = 0.18 + Math.sin(T * 0.28) * 0.10;
                            const amp2 = 0.07 + Math.cos(T * 0.19) * 0.05;
                            const amp3 = 0.04 + Math.sin(T * 0.41) * 0.03;

                            // Primary ribbon Y: sweeps left-to-right with slow temporal drift
                            const ribbonY1 = 0.5
                                + amp1 * Math.sin(nx * 3.5 - T * 1.4)
                                + amp2 * Math.sin(nx * 5.8 + T * 0.7)
                                + amp3 * Math.cos(nx * 8.0 - T * 2.1);

                            // Secondary ribbon Y: counter-phase for crossing-ribbon look
                            const ribbonY2 = 0.5
                                - amp1 * Math.sin(nx * 3.0 - T * 1.1 + 1.2)
                                + amp2 * Math.cos(nx * 4.5 + T * 0.9)
                                + amp3 * Math.sin(nx * 7.0 - T * 1.8 + 0.5);

                            // Ribbon half-width in normalized Y units (how thick the glowing band is)
                            const ribbonHalf = 0.10;
                            const dist1 = Math.abs(ny - ribbonY1);
                            const dist2 = Math.abs(ny - ribbonY2);

                            // Soft quadratic falloff from ribbon center → bright core, dark edges
                            const g1 = dist1 < ribbonHalf ? Math.pow(1.0 - dist1 / ribbonHalf, 1.8) : 0.0;
                            const g2 = dist2 < ribbonHalf ? Math.pow(1.0 - dist2 / ribbonHalf, 1.8) : 0.0;

                            f = Math.min(1.0, g1 + g2 * 0.7);

                            // Pointer proximity: finger touch creates local bright spot on the ribbon
                            if (state.pointerActive) {
                                const pDist = Math.sqrt((cx - state.px)**2 + (cy - state.py)**2);
                                if (pDist < 70) {
                                    f = Math.min(1.0, f + (1.0 - pDist / 70) * 0.5);
                                }
                            }
                        } else if (anim === 'none') {
                            if (state.pointerActive) {
                                const dist = Math.sqrt((cx - state.px)**2 + (cy - state.py)**2);
                                if (dist < 70) {
                                    f = (1.0 - dist / 70) * 0.8;
                                }
                            }
                        }

                        const x = marginX + cIdx * (cellSize + gap);
                        const y = marginY + rIdx * (cellSize + gap);

                        if (anim === 'mountains') {
                            // ... (unchanged mountains block continues below)
                            const ny = rIdx / state.rows;
                            let baseHue;
                            if (ny < 0.35) {
                                const t = ny / 0.35;
                                baseHue = 205 + t * 25;
                            } else if (ny < 0.68) {
                                const t = (ny - 0.35) / 0.33;
                                baseHue = 230 + t * 60;
                            } else if (ny < 0.88) {
                                const t = (ny - 0.68) / 0.20;
                                baseHue = 290 + t * 55;
                            } else {
                                const t = (ny - 0.88) / 0.12;
                                baseHue = 345 + t * 40;
                            }
                            const hueOffset = Math.sin(cIdx * 0.18 + rIdx * 0.22 + time * 0.0006) * 6;
                            let hue = (baseHue + hueOffset + 360) % 360;
                            let lightness = 44 + Math.sin(cIdx * 0.22 - rIdx * 0.18 + time * 0.0008) * 3;
                            let ripSum = 0;
                            for (let r = 0; r < state.ripples.length; r++) {
                                const rip = state.ripples[r];
                                const dist = Math.sqrt((cx - rip.x)**2 + (cy - rip.y)**2);
                                const wHalf = 28;
                                if (Math.abs(dist - rip.radius) < wHalf) {
                                    ripSum += (1.0 - Math.abs(dist - rip.radius) / wHalf) * rip.opacity;
                                }
                            }
                            lightness += ripSum * 14;
                            hue = (hue + ripSum * 15) % 360;
                            if (state.pointerActive) {
                                const pointerDist = Math.sqrt((cx - state.px)**2 + (cy - state.py)**2);
                                if (pointerDist < 75) {
                                    const factor = 1.0 - pointerDist / 75;
                                    lightness += factor * 22;
                                    hue = (hue - factor * 12 + 360) % 360;
                                }
                            }
                            lightness = Math.max(15, Math.min(95, lightness));
                            ctx.fillStyle = `hsl(${hue}, 95%, ${lightness}%)`;
                        } else if (anim === 'wave') {
                            // Ribbon glow: very dark background, bright glowing ribbon using card color
                            // f=0 → almost invisible cube, f=1 → near-full opacity bright ribbon center
                            const baseOp = 0.04;
                            const op = Math.min(0.95, baseOp + Math.pow(f, 0.75) * intensity * 0.88);
                            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${op})`;
                        } else {
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
                        }
                        drawRoundRect(ctx, x, y, cellSize, cellSize, 1.5);
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
    const anim = appearance.anim || 'sweep';

    // Force cubes pattern for gol, firework, mountains, and wave animations to avoid mismatch
    if (anim === 'gol' || anim === 'firework' || anim === 'mountains' || anim === 'wave') {
        appearance.pattern = 'cubes';
    }

    const colorHex = appearance.colorHex || '#ffffff';
    const intensity = appearance.intensity || '1';
    const font = appearance.font || 'system';
    const saturation = appearance.saturation || '1.3';
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
    const needsCanvas = (anim === 'ripple' || anim === 'gol' || anim === 'firework' || anim === 'mountains' || pattern === 'cubes');
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

