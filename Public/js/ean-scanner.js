(function (global) {
    'use strict';

    function checkDigitEan13(first12) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += first12[i] * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (sum % 10)) % 10;
    }

    function checkDigitEan8(first7) {
        let sum = 0;
        for (let i = 0; i < 7; i++) {
            sum += first7[i] * (i % 2 === 0 ? 3 : 1);
        }
        return (10 - (sum % 10)) % 10;
    }

    function digitsOf(code) {
        const str = String(code == null ? '' : code).trim();
        if (!/^\d+$/.test(str)) return null;
        return str.split('').map(Number);
    }

    function isValidEan13(code) {
        const d = digitsOf(code);
        if (!d || d.length !== 13) return false;
        return checkDigitEan13(d.slice(0, 12)) === d[12];
    }

    function isValidEan8(code) {
        const d = digitsOf(code);
        if (!d || d.length !== 8) return false;
        return checkDigitEan8(d.slice(0, 7)) === d[7];
    }

    function validate(rawText, opts) {
        const acceptEan8 = !opts || opts.acceptEan8 !== false;
        const str = String(rawText == null ? '' : rawText).trim();
        if (!/^\d+$/.test(str)) return null;

        if (str.length === 13 && isValidEan13(str)) {
            return { ean: str, format: 'EAN_13' };
        }
        if (acceptEan8 && str.length === 8 && isValidEan8(str)) {
            return { ean: str, format: 'EAN_8' };
        }
        return null;
    }

    const EanValidator = {
        checkDigitEan13,
        checkDigitEan8,
        isValidEan13,
        isValidEan8,
        validate,
    };

    const DEFAULTS = {
        requiredReads: 3,
        consensusWindowMs: 1500,
        cooldownMs: 3000,
        acceptEan8: true,
        minFrameIntervalMs: 0,
    };

    class EanScanEngine {
        constructor(options) {
            this.cfg = Object.assign({}, DEFAULTS, options || {});
            this.onConfirm = (this.cfg && this.cfg.onConfirm) || null;
            this.reset();
        }

        reset() {
            this._reads = [];
            this._lastConfirm = null;
            this._lastProcessedAt = 0;
            this._stats = {
                pushed: 0,
                processed: 0,
                rejected: 0,
                confirmed: 0,
                lastValidAt: 0,
            };
            return this;
        }

        _pruneWindow(now) {
            const cutoff = now - this.cfg.consensusWindowMs;
            let i = 0;
            while (i < this._reads.length && this._reads[i].t < cutoff) i++;
            if (i > 0) this._reads.splice(0, i);
        }

        _adaptThrottle(now) {
            const inCooldown = this._lastConfirm &&
                (now - this._lastConfirm.t) < this.cfg.cooldownMs;
            this.cfg.minFrameIntervalMs = inCooldown ? 60 : 0;
        }

        push(rawText, formatName, now) {
            now = typeof now === 'number' ? now : Date.now();
            this._stats.pushed++;

            if (now - this._lastProcessedAt < this.cfg.minFrameIntervalMs) {
                return null;
            }
            this._lastProcessedAt = now;
            this._stats.processed++;

            if (this._lastConfirm && (now - this._lastConfirm.t) < this.cfg.cooldownMs) {
                this._adaptThrottle(now);
                return null;
            }

            const valid = validate(rawText, { acceptEan8: this.cfg.acceptEan8 });
            if (!valid) {
                this._stats.rejected++;
                this._adaptThrottle(now);
                return null;
            }

            this._stats.lastValidAt = now;
            this._reads.push({ ean: valid.ean, t: now });
            this._pruneWindow(now);

            let matchCount = 0;
            for (let i = 0; i < this._reads.length; i++) {
                if (this._reads[i].ean === valid.ean) matchCount++;
            }
            const totalValid = this._reads.length;

            if (matchCount < this.cfg.requiredReads) {
                this._adaptThrottle(now);
                return null;
            }

            const confidence = Math.max(0, Math.min(1, matchCount / Math.max(totalValid, 1)));

            this._lastConfirm = { ean: valid.ean, t: now };
            this._reads = [];
            this._stats.confirmed++;
            this._adaptThrottle(now);

            const result = {
                ean: valid.ean,
                format: valid.format,
                confidence: Math.round(confidence * 1000) / 1000,
                timestamp: now,
            };

            if (typeof this.onConfirm === 'function') {
                try { this.onConfirm(result); } catch (e) { }
            }
            return result;
        }

        getStats() {
            return Object.assign({}, this._stats);
        }
    }

    global.EanValidator = EanValidator;
    global.EanScanEngine = EanScanEngine;

})(typeof window !== 'undefined' ? window : this);
