/* ============================================================================
   landing.js — SNUSDEX® Landing Page
   Handles: cubes-wave hero canvas, nav scroll state, smooth scroll,
            reveal animations
   Canvas rendering ported from Public/js/config.js — CardCanvasRenderer
   ============================================================================ */

(function () {
    'use strict';

    // ── Utility ───────────────────────────────────────────────────────────────
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

    // ── Wave colour state ─────────────────────────────────────────────────
    // Current target colour (r, g, b) — smoothly lerped each frame
    var waveColor   = { r: 255, g: 255, b: 255 };  // rendered (lerped)
    var waveTarget  = { r: 255, g: 255, b: 255 };  // target from picker

    // Ported directly from config.js CardCanvasRenderer (wave anim + cubes pattern)
    // adapted for a full-viewport background canvas instead of a card element.

    var heroCanvas = document.getElementById('hero-canvas');

    if (heroCanvas) {
        var ctx = heroCanvas.getContext('2d');
        var cols = 64;
        var rows = 30;
        var lastTime = performance.now();
        var rafId = null;

        // Mouse tracking for interactive glow spot
        var px = -999, py = -999, pointerActive = false;

        function resize() {
            var dpr = window.devicePixelRatio || 1;
            heroCanvas.width = window.innerWidth * dpr;
            heroCanvas.height = window.innerHeight * dpr;
            ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }

        window.addEventListener('resize', resize, { passive: true });
        resize();

        document.addEventListener('mousemove', function (e) {
            pointerActive = true;
            px = e.clientX;
            py = e.clientY;
        }, { passive: true });

        document.addEventListener('mouseleave', function () {
            pointerActive = false;
        });

        document.addEventListener('touchmove', function (e) {
            if (e.touches && e.touches.length > 0) {
                pointerActive = true;
                px = e.touches[0].clientX;
                py = e.touches[0].clientY;
            }
        }, { passive: true });

        function loop(time) {
            rafId = requestAnimationFrame(loop);

            var W = window.innerWidth;
            var H = window.innerHeight;

            // Smooth lerp wave colour toward target
            var lerpSpeed = 0.08;
            waveColor.r += (waveTarget.r - waveColor.r) * lerpSpeed;
            waveColor.g += (waveTarget.g - waveColor.g) * lerpSpeed;
            waveColor.b += (waveTarget.b - waveColor.b) * lerpSpeed;

            var r = Math.round(waveColor.r);
            var g = Math.round(waveColor.g);
            var b = Math.round(waveColor.b);

            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, W, H);

            var T = time * 0.001;
            var margin = 0;
            var gap = 2;
            var availW = W - 2 * margin;
            var availH = H - 2 * margin;
            var cellW = (availW - (cols - 1) * gap) / cols;
            var cellH = (availH - (rows - 1) * gap) / rows;

            for (var rIdx = 0; rIdx < rows; rIdx++) {
                for (var cIdx = 0; cIdx < cols; cIdx++) {
                    var cx = margin + cIdx * (cellW + gap) + cellW / 2;
                    var cy = margin + rIdx * (cellH + gap) + cellH / 2;

                    var nx = cIdx / cols;
                    var ny = rIdx / rows;

                    // Two silk ribbon waves — exactly from config.js wave anim
                    var amp1 = 0.18 + Math.sin(T * 0.28) * 0.10;
                    var amp2 = 0.07 + Math.cos(T * 0.19) * 0.05;
                    var amp3 = 0.04 + Math.sin(T * 0.41) * 0.03;

                    var ribbonY1 = 0.5
                        + amp1 * Math.sin(nx * 3.5 - T * 1.4)
                        + amp2 * Math.sin(nx * 5.8 + T * 0.7)
                        + amp3 * Math.cos(nx * 8.0 - T * 2.1);

                    var ribbonY2 = 0.5
                        - amp1 * Math.sin(nx * 3.0 - T * 1.1 + 1.2)
                        + amp2 * Math.cos(nx * 4.5 + T * 0.9)
                        + amp3 * Math.sin(nx * 7.0 - T * 1.8 + 0.5);

                    var ribbonHalf = 0.10;
                    var dist1 = Math.abs(ny - ribbonY1);
                    var dist2 = Math.abs(ny - ribbonY2);

                    var g1 = dist1 < ribbonHalf ? Math.pow(1.0 - dist1 / ribbonHalf, 1.8) : 0.0;
                    var g2 = dist2 < ribbonHalf ? Math.pow(1.0 - dist2 / ribbonHalf, 1.8) : 0.0;

                    var f = Math.min(1.0, g1 + g2 * 0.7);

                    // Mouse proximity brightening
                    if (pointerActive) {
                        var pDist = Math.sqrt((cx - px) * (cx - px) + (cy - py) * (cy - py));
                        if (pDist < 90) {
                            f = Math.min(1.0, f + (1.0 - pDist / 90) * 0.6);
                        }
                    }

                    var baseOp = 0.03;
                    var op = Math.min(0.80, baseOp + Math.pow(f, 0.75) * 0.75);

                    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + op + ')';

                    var x = margin + cIdx * (cellW + gap);
                    var y = margin + rIdx * (cellH + gap);
                    drawRoundRect(ctx, x, y, cellW, cellH, 1.5);
                }
            }
        }

        rafId = requestAnimationFrame(loop);

        // Pause when tab is hidden — saves battery
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
            } else {
                lastTime = performance.now();
                rafId = requestAnimationFrame(loop);
            }
        });
    }

    // ── Wave colour picker ─────────────────────────────────────────────────
    var swatches = document.querySelectorAll('.wave-swatch');

    swatches.forEach(function (swatch) {
        swatch.addEventListener('click', function () {
            // Parse "r,g,b" from data-color attribute
            var parts = swatch.getAttribute('data-color').split(',');
            waveTarget.r = parseInt(parts[0], 10);
            waveTarget.g = parseInt(parts[1], 10);
            waveTarget.b = parseInt(parts[2], 10);

            // Update active state
            swatches.forEach(function (s) { s.classList.remove('active'); });
            swatch.classList.add('active');
        });
    });

    // ── Nav scroll behaviour ─────────────────────────────────────────────────
    var nav = document.getElementById('main-nav');

    function updateNav() {
        if (window.scrollY > 40) {
            nav.style.background = 'rgba(0, 0, 0, 0.92)';
            nav.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
        } else {
            nav.style.background = 'rgba(0, 0, 0, 0.0)';
            nav.style.borderBottom = '1px solid transparent';
        }
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    // ── Smooth scroll for anchor links ────────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var href = anchor.getAttribute('href');
            if (href === '#') return;
            var target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            var navHeight = nav ? nav.offsetHeight : 64;
            var top = target.getBoundingClientRect().top + window.scrollY - navHeight;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });

    // ── Reveal on scroll (Intersection Observer) ──────────────────────────────
    var revealSelectors = [
        '.step-card',
        '.feature-card-item',
        '.tracking-card',
        '.aeo-item',
        '.pricing-card',
        '.section-label',
        '.section-title',
        '.section-sub'
    ].join(', ');

    var revealTargets = document.querySelectorAll(revealSelectors);

    revealTargets.forEach(function (el) {
        el.classList.add('reveal');
    });

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    revealTargets.forEach(function (el) {
        revealObserver.observe(el);
    });

    // ── Stagger grid children ─────────────────────────────────────────────────
    function staggerChildren(parentSelector) {
        var parent = document.querySelector(parentSelector);
        if (!parent) return;
        var children = parent.querySelectorAll('.reveal');
        children.forEach(function (child, i) {
            child.style.transitionDelay = (i * 60) + 'ms';
        });
    }

    staggerChildren('.steps-grid');
    staggerChildren('.features-carousel');
    staggerChildren('.tracking-grid');
    staggerChildren('.aeo-block');
    staggerChildren('.pricing-grid');

    // ── Features Carousel Navigation ──────────────────────────────────────────
    var carousel = document.getElementById('features-carousel');
    var btnPrev = document.getElementById('feat-carousel-prev');
    var btnNext = document.getElementById('feat-carousel-next');

    if (carousel && btnPrev && btnNext) {
        var card = carousel.querySelector('.feature-card-item');

        function updateButtons() {
            var scrollLeft = carousel.scrollLeft;
            var maxScroll = carousel.scrollWidth - carousel.clientWidth;
            
            // Allow 2px tolerance for fractional subpixel rendering
            btnPrev.disabled = scrollLeft <= 2;
            btnNext.disabled = scrollLeft >= maxScroll - 2;
        }

        btnPrev.addEventListener('click', function () {
            var cardWidth = card ? card.offsetWidth : 380;
            var gap = 24; // Gap from styles
            if (window.innerWidth <= 768) gap = 16;
            carousel.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' });
        });

        btnNext.addEventListener('click', function () {
            var cardWidth = card ? card.offsetWidth : 380;
            var gap = 24;
            if (window.innerWidth <= 768) gap = 16;
            carousel.scrollBy({ left: cardWidth + gap, behavior: 'smooth' });
        });

        carousel.addEventListener('scroll', updateButtons, { passive: true });
        window.addEventListener('resize', updateButtons, { passive: true });
        
        // Initial button check
        setTimeout(updateButtons, 150);
    }

})();
