// ==========================================
// 8. HELPER & INITIALISIERUNG
// ==========================================

async function setupProfile(user) {
    // Sofort mit user_metadata rendern (kein DB-Wait nötig)
    const emailEl = document.getElementById('profile-email');
    const initialsEl = document.getElementById('user-initials');
    const idEl = document.getElementById('profile-id');
    const adminEl = document.getElementById('admin-panel');

    const immediateUsername = user.user_metadata?.username || user.email.split('@')[0];
    currentUsername = immediateUsername;

    if (emailEl) {
        emailEl.innerText = currentUsername;
        emailEl.removeAttribute('data-i18n'); // verhindert dass applyTranslations() den Username überschreibt
    }
    if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();
    if (idEl) idEl.innerText = `ID #${user.id.split('-')[0].toUpperCase()}`;
    if (user.email === 'tarayannorman@gmail.com' && adminEl) adminEl.classList.remove('hidden');

    updateGreeting();
    loadUserStats(user.id);

    // Vollständiges Profil im Hintergrund nachladen (featured badge + korrekter username aus DB + card design & streak)
    try {
        // Sync creator code from DB first so the animation/badge benefits are known before loading appearance
        try {
            const { data: redemption } = await supabaseClient
                .from('creator_code_redemptions')
                .select('code_id, creator_codes(code, activates_animation, credits, text)')
                .eq('user_id', user.id)
                .maybeSingle();

            if (redemption && redemption.creator_codes) {
                const codeData = redemption.creator_codes;
                if (codeData.activates_animation) {
                    localStorage.setItem('creatorUnlockedAnimations', JSON.stringify([codeData.activates_animation]));
                } else {
                    localStorage.removeItem('creatorUnlockedAnimations');
                }
                const redeemed = [{
                    code: codeData.code,
                    credits: codeData.credits || null,
                    text: codeData.text || null,
                    redeemedAt: new Date().toISOString()
                }];
                localStorage.setItem('creatorCodesRedeemed', JSON.stringify(redeemed));
            } else {
                localStorage.removeItem('creatorUnlockedAnimations');
                localStorage.removeItem('creatorCodesRedeemed');
            }
        } catch (e) { /* ignore */ }

        let profileData = null;
        let res = await supabaseClient
            .from('profiles')
            .select('username, featured_badge_id, card_appearance, streak_count, last_tracked_date, avatar_url')
            .eq('id', user.id)
            .single();

        if (res.error && res.error.code === '42703') {
            console.warn("Retrying profile fetch without new sync columns...");
            res = await supabaseClient
                .from('profiles')
                .select('username, featured_badge_id, avatar_url')
                .eq('id', user.id)
                .single();
            if (res.error && res.error.code === '42703') {
                res = await supabaseClient
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .single();
            }
        }
        profileData = res.data;

        if (profileData?.avatar_url) {
            const mainAvatarImg = document.getElementById('profile-image');
            const mainAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
            if (mainAvatarImg && mainAvatarPlaceholder) {
                mainAvatarImg.src = profileData.avatar_url;
                mainAvatarImg.classList.remove('hidden');
                mainAvatarPlaceholder.classList.add('hidden');
            }
        } else {
            const mainAvatarImg = document.getElementById('profile-image');
            const mainAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
            if (mainAvatarImg && mainAvatarPlaceholder) {
                mainAvatarImg.classList.add('hidden');
                mainAvatarPlaceholder.classList.remove('hidden');
            }
        }

        if (profileData?.username && profileData.username !== currentUsername) {
            currentUsername = profileData.username;
            if (emailEl) emailEl.innerText = currentUsername;
            if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();
            updateGreeting();
        }

        window._featuredBadgeId = profileData?.featured_badge_id || null;
        renderFeaturedBadgeOverlay();

        // Sync card appearance from DB
        if (profileData?.card_appearance && Object.keys(profileData.card_appearance).length > 0) {
            const app = profileData.card_appearance;
            if (app.colorId) localStorage.setItem('metalCardColorId', app.colorId);
            if (app.colorHex) localStorage.setItem('metalCardColorHex', app.colorHex);
            if (app.font) localStorage.setItem('metalCardFont', app.font);
            if (app.anim) localStorage.setItem('metalCardAnim', app.anim);
            if (app.saturation) localStorage.setItem('metalCardSaturation', app.saturation);
            if (app.pattern) localStorage.setItem('metalCardPattern', app.pattern);
            if (app.intensity) localStorage.setItem('metalCardIntensity', app.intensity);
            
            // Apply immediately to own profile card — read back from localStorage so the
            // canvas renderer captures a fresh object and isn't bound to a stale snapshot.
            applyCardAppearance('metal-card-container', getLocalCardAppearance());

            // If the Darstellung subpage is open when cloud sync arrives, refresh
            // the preview card and button states so they don't show stale values.
            if (window._currentSubpageType === 'Darstellung') {
                applyCardAppearance('preview-metal-card-container', getLocalCardAppearance());
                if (typeof _refreshAppearanceButtonStates === 'function') {
                    _refreshAppearanceButtonStates();
                }
            }
        }

        // Sync daily streak from DB
        if (profileData?.last_tracked_date) {
            localStorage.setItem('lastTrackedDate', profileData.last_tracked_date);
            localStorage.setItem('streakCount', profileData.streak_count || 0);
        } else {
            localStorage.removeItem('lastTrackedDate');
            localStorage.setItem('streakCount', 0);
        }
        
        // Re-validate and render streak UI
        if (typeof validateAndRenderStreak === 'function') {
            validateAndRenderStreak();
        }

        // Render creator code if function is available
        try {
            if (typeof renderCreatorCodeRedeemed === 'function') {
                renderCreatorCodeRedeemed();
            } else if (typeof window.renderCreatorCodeRedeemed === 'function') {
                window.renderCreatorCodeRedeemed();
            }
        } catch (e) { /* ignore */ }

        // Load badges at startup to sync achievements and trigger new unlock animations
        if (typeof loadBadges === 'function') {
            loadBadges();
        }
    } catch (e) { /* ignore */ }
}

function previewProfileImage(event) {
    console.log("previewProfileImage called", event);
    const file = event.target.files[0];
    if (file) {
        console.log("File selected:", file.name, file.size, file.type);
        const reader = new FileReader();
        reader.onload = function (e) {
            console.log("FileReader onload complete, length:", e.target.result.length);
            openCropModal(e.target.result);
        };
        reader.onerror = function (err) {
            console.error("FileReader error:", err);
        };
        reader.readAsDataURL(file);
    } else {
        console.warn("No file selected.");
    }
}

async function handleProfileSave(btn) {
    if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

    const newUsername = (document.getElementById('edit-username')?.value || '').trim();
    const errorEl = document.getElementById('edit-username-error');

    // Validierung: nur Buchstaben, Zahlen, Unterstriche
    const usernameRegex = /^[a-zA-Z0-9_]{2,30}$/;
    if (!usernameRegex.test(newUsername)) {
        if (errorEl) { errorEl.innerText = t('editProfile.errorFormat'); errorEl.classList.remove('hidden'); }
        return;
    }
    if (errorEl) errorEl.classList.add('hidden');

    if (newUsername === currentUsername) {
        btn.disabled = false; btn.innerHTML = `<span>${t('editProfile.saveChanges')}</span>`; return;
    }

    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${t('editProfile.saving')}`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Nicht eingeloggt.');

        // Aktuelles Profil laden (Rate-Limit Check)
        const { data: profile } = await supabaseClient
            .from('profiles').select('username, username_changes, username_last_reset').eq('id', user.id).single();

        const now = new Date();
        const lastReset = profile?.username_last_reset ? new Date(profile.username_last_reset) : null;
        const sameMonth = lastReset && lastReset.getMonth() === now.getMonth() && lastReset.getFullYear() === now.getFullYear();
        const changesThisMonth = sameMonth ? (profile.username_changes || 0) : 0;

        if (changesThisMonth >= 3) {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const daysLeft = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));
            if (errorEl) { errorEl.innerText = t('editProfile.errorLimitReached', { days: daysLeft }); errorEl.classList.remove('hidden'); }
            btn.disabled = false;
            btn.innerHTML = `<span>${t('editProfile.saveChanges')}</span>`;
            return;
        }

        // Supabase auth metadata updaten
        const { error: authError } = await supabaseClient.auth.updateUser({ data: { username: newUsername } });
        if (authError) throw authError;

        // profiles Tabelle updaten inkl. Rate-Limit Counter
        const { error: dbError } = await supabaseClient.from('profiles').update({
            username: newUsername,
            username_changes: changesThisMonth + 1,
            username_last_reset: sameMonth ? profile.username_last_reset : now.toISOString()
        }).eq('id', user.id);
        if (dbError) throw dbError;

        // Update global cache + all UI spots
        currentUsername = newUsername;
        const emailEl = document.getElementById('profile-email');
        const initialsEl = document.getElementById('user-initials');
        if (emailEl) emailEl.innerText = currentUsername;
        if (initialsEl) initialsEl.innerText = currentUsername[0].toUpperCase();
        updateGreeting();

        // Update the remaining-changes badge and cache
        const newRemaining = Math.max(0, 3 - (changesThisMonth + 1));
        window._cachedUsernameChangesRemaining = newRemaining;
        // Also update profileCache so next open of Edit Profile shows correct values
        window._profileCache = { ...(window._profileCache || {}), username: newUsername, remaining: newRemaining };
        const changesLeftEl = document.getElementById('username-changes-left');
        if (changesLeftEl) {
            changesLeftEl.innerHTML = newRemaining === 0
                ? `<span class="text-[11px] text-[#FF3B30] font-semibold">0/3</span>`
                : newRemaining === 1
                    ? `<span class="text-[11px] text-[#FF9500] font-medium">1/3</span>`
                    : `<span class="text-[11px] text-[#8E8E93] font-medium">${newRemaining}/3</span>`;
        }

        btn.classList.remove('bg-white', 'text-black');
        btn.classList.add('bg-[#34C759]', 'text-white');
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg> ${t('editProfile.saved')}`;
        if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();

        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('bg-[#34C759]', 'text-white');
            btn.classList.add('bg-white', 'text-black');
            btn.innerHTML = `<span>${t('editProfile.saveChanges')}</span>`;
        }, 2500);

    } catch (err) {
        if (errorEl) { errorEl.innerText = err.message; errorEl.classList.remove('hidden'); }
        btn.disabled = false;
        btn.innerHTML = `<span>${t('editProfile.saveChanges')}</span>`;
    }
}

// ── CUSTOM PROFILE PICTURE CROP & UPLOAD FLOW ──────────────────────────────

let cropState = {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    fitWidth: 0,
    fitHeight: 0,
    isDragging: false,
    startX: 0,
    startY: 0
};

function openCropModal(imageSrc) {
    console.log("openCropModal called, imageSrc length:", imageSrc ? imageSrc.length : 0);
    const modal = document.getElementById('avatar-crop-modal');
    const cropImg = document.getElementById('crop-image');
    const slider = document.getElementById('crop-zoom');
    if (!modal) {
        console.error("avatar-crop-modal not found in DOM!");
        return;
    }
    if (!cropImg) {
        console.error("crop-image not found in DOM!");
        return;
    }

    if (slider) slider.value = 1;

    // Reset crop state
    cropState.zoom = 1;
    cropState.offsetX = 0;
    cropState.offsetY = 0;
    cropState.isDragging = false;

    // Show modal
    modal.classList.remove('hidden');
    console.log("Modal classList after remove hidden:", modal.className);
    
    // Animate scale/opacity
    setTimeout(() => {
        const card = modal.querySelector('div');
        if (card) {
            card.classList.remove('scale-95', 'opacity-0');
            card.classList.add('scale-100', 'opacity-100');
            console.log("Card animation triggered.");
        } else {
            console.warn("Inner card div of modal not found for animation.");
        }
    }, 10);

    cropImg.onload = function () {
        console.log("cropImg onload triggered. naturalWidth:", cropImg.naturalWidth, "naturalHeight:", cropImg.naturalHeight);
        const imgNaturalW = cropImg.naturalWidth;
        const imgNaturalH = cropImg.naturalHeight;

        if (!imgNaturalW || !imgNaturalH) {
            console.error("Image natural dimensions are 0 or invalid!");
            return;
        }

        // Scale to fit 220px viewport container
        const scaleToFit = Math.max(220 / imgNaturalW, 220 / imgNaturalH);
        cropState.fitWidth = imgNaturalW * scaleToFit;
        cropState.fitHeight = imgNaturalH * scaleToFit;
        console.log("Fitted dimensions calculated:", cropState.fitWidth, "x", cropState.fitHeight, "scaleToFit:", scaleToFit);

        cropImg.style.width = cropState.fitWidth + 'px';
        cropImg.style.height = cropState.fitHeight + 'px';
        cropImg.style.left = '50%';
        cropImg.style.top = '50%';
        cropImg.style.marginLeft = -cropState.fitWidth / 2 + 'px';
        cropImg.style.marginTop = -cropState.fitHeight / 2 + 'px';

        updateCropTransform();
        initCropEvents();
        console.log("Crop transform and events successfully initialized.");
    };

    cropImg.onerror = function (err) {
        console.error("cropImg load error:", err);
    };

    cropImg.src = imageSrc;
}

function closeCropModal() {
    const modal = document.getElementById('avatar-crop-modal');
    if (!modal) return;

    const card = modal.querySelector('div');
    if (card) {
        card.classList.remove('scale-100', 'opacity-100');
        card.classList.add('scale-95', 'opacity-0');
    }

    setTimeout(() => {
        modal.classList.add('hidden');
        // Clear file input
        const fileInput = document.getElementById('profile-image-upload');
        if (fileInput) fileInput.value = '';
    }, 300);
}

function updateCropTransform() {
    const cropImg = document.getElementById('crop-image');
    if (cropImg) {
        cropImg.style.transform = `translate(${cropState.offsetX}px, ${cropState.offsetY}px) scale(${cropState.zoom})`;
    }
}

function initCropEvents() {
    const viewport = document.getElementById('crop-viewport');
    const slider = document.getElementById('crop-zoom');
    if (!viewport || !slider) return;

    if (viewport._cropEventsBound) return;
    viewport._cropEventsBound = true;

    function getPointerPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function startDrag(e) {
        e.preventDefault();
        const pos = getPointerPos(e);
        cropState.isDragging = true;
        cropState.startX = pos.x - cropState.offsetX;
        cropState.startY = pos.y - cropState.offsetY;
    }

    function drag(e) {
        if (!cropState.isDragging) return;
        const pos = getPointerPos(e);
        cropState.offsetX = pos.x - cropState.startX;
        cropState.offsetY = pos.y - cropState.startY;

        const maxOffsetX = Math.max(0, (cropState.fitWidth * cropState.zoom) / 2 - 110);
        cropState.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, cropState.offsetX));

        const maxOffsetY = Math.max(0, (cropState.fitHeight * cropState.zoom) / 2 - 110);
        cropState.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, cropState.offsetY));

        updateCropTransform();
    }

    function endDrag() {
        cropState.isDragging = false;
    }

    viewport.addEventListener('mousedown', startDrag);
    viewport.addEventListener('touchstart', startDrag, { passive: false });

    window.addEventListener('mousemove', drag);
    window.addEventListener('touchmove', drag, { passive: true });

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    slider.addEventListener('input', () => {
        cropState.zoom = parseFloat(slider.value);
        
        const maxOffsetX = Math.max(0, (cropState.fitWidth * cropState.zoom) / 2 - 110);
        cropState.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, cropState.offsetX));

        const maxOffsetY = Math.max(0, (cropState.fitHeight * cropState.zoom) / 2 - 110);
        cropState.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, cropState.offsetY));

        updateCropTransform();
    });
}

async function saveCroppedAvatar() {
    const saveBtn = document.getElementById('crop-save-btn');
    if (!saveBtn || saveBtn.disabled) return;

    saveBtn.disabled = true;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>Speichern...</span>`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Nicht eingeloggt.');

        // 1. 240x240 Canvas erstellen und Ausschnitt zeichnen
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 240, 240);

        // Skalierung von 220px Viewport auf 240px Zielgröße abbilden
        const ratio = 240 / 220;
        const fitW240 = cropState.fitWidth * ratio;
        const fitH240 = cropState.fitHeight * ratio;
        const offX240 = cropState.offsetX * ratio;
        const offY240 = cropState.offsetY * ratio;
        const zoom = cropState.zoom;

        const cropImg = document.getElementById('crop-image');

        ctx.save();
        ctx.translate(120, 120);
        ctx.translate(offX240, offY240);
        ctx.scale(zoom, zoom);
        ctx.drawImage(cropImg, -fitW240 / 2, -fitH240 / 2, fitW240, fitH240);
        ctx.restore();

        // 2. In Blob konvertieren (JPEG für beste Performance & Speichergröße)
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Canvas conversion failed'));
            }, 'image/jpeg', 0.9);
        });

        // 3. In Supabase Storage hochladen
        const fileName = `${user.id}-${Date.now()}.jpg`;
        const filePath = `${user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Öffentliche URL abrufen
        const { data: urlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        const newAvatarUrl = urlData.publicUrl;

        // 4. Aktuelles Profil holen zwecks Löschen des alten Bildes
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

        // 5. In DB speichern
        const { error: dbError } = await supabaseClient
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', user.id);

        if (dbError) throw dbError;

        // 6. Altes Bild aus Storage löschen
        if (profile?.avatar_url) {
            try {
                const bucketPrefix = '/storage/v1/object/public/avatars/';
                const prefixIdx = profile.avatar_url.indexOf(bucketPrefix);
                if (prefixIdx !== -1) {
                    const oldFilePath = profile.avatar_url.substring(prefixIdx + bucketPrefix.length);
                    if (oldFilePath) {
                        await supabaseClient.storage.from('avatars').remove([oldFilePath]);
                    }
                }
            } catch (e) {
                console.warn("Failed to delete old avatar file:", e);
            }
        }

        // 7. UI-Elemente direkt updaten
        const mainAvatarImg = document.getElementById('profile-image');
        const mainAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
        if (mainAvatarImg && mainAvatarPlaceholder) {
            mainAvatarImg.src = newAvatarUrl;
            mainAvatarImg.classList.remove('hidden');
            mainAvatarPlaceholder.classList.add('hidden');
        }

        const editAvatarImg = document.getElementById('edit-profile-image-preview');
        const editAvatarPlaceholder = document.getElementById('edit-profile-avatar-placeholder');
        if (editAvatarImg && editAvatarPlaceholder) {
            editAvatarImg.src = newAvatarUrl;
            editAvatarImg.classList.remove('hidden');
            editAvatarPlaceholder.classList.add('hidden');
        }

        // Cache synchronisieren
        window._profileCache = {
            ...(window._profileCache || {}),
            avatar_url: newAvatarUrl
        };

        if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
        
        closeCropModal();

    } catch (err) {
        console.error("Failed to save cropped avatar:", err);
        alert(t('editProfile.errorUpload') || 'Fehler beim Hochladen des Bildes: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

let displayedXp = null;
let actualXp = null;

async function loadUserStats(userId) {
    const {
        count
    } = await supabaseClient.from('user_collections').select('*', {
        count: 'exact',
        head: true
    }).eq('user_id', userId);

    let badgeXp = 0;
    try {
        const { data } = await supabaseClient
            .from('profiles')
            .select('badge_xp')
            .eq('id', userId)
            .single();
        if (data) {
            badgeXp = data.badge_xp || 0;
        }
    } catch (e) {
        console.error("Error loading badge_xp:", e);
    }

    const xp = ((count || 0) * 100) + badgeXp;
    const level = Math.floor(xp / 300) + 1;

    actualXp = xp;

    const profileXpEl = document.getElementById('profile-xp');
    const profileLevelEl = document.getElementById('profile-level');
    window._currentUserLevel = level;

    if (profileXpEl) profileXpEl.innerText = `${xp} XP`;
    if (profileLevelEl) profileLevelEl.innerText = `${t('profile.level')} ${level}`;

    if (displayedXp === null) {
        displayedXp = xp;
        const scoreEl = document.getElementById('score');
        const homeLevelEl = document.getElementById('home-level');
        if (scoreEl) scoreEl.innerHTML = `${xp} <span style="font-weight:500;font-size:20px;color:rgba(255,255,255,0.55);">XP</span>`;
        if (homeLevelEl) homeLevelEl.innerText = `${t('profile.level').toUpperCase()} ${level}`;
    } else if (displayedXp !== actualXp) {
        const homeTab = document.getElementById('tab-home');
        if (!homeTab.classList.contains('hidden')) {
            animateXp(displayedXp, actualXp, level);
        }
    }
}

function animateXp(startValue, endValue, newLevel) {
    const scoreEl = document.getElementById('score');
    const homeLevelEl = document.getElementById('home-level');
    if (!scoreEl) return;

    const duration = 1500;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const currentVal = Math.floor(startValue + (endValue - startValue) * easeProgress);

        scoreEl.innerHTML = `${currentVal} <span style="font-weight:500;font-size:20px;color:rgba(255,255,255,0.55);">XP</span>`;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            displayedXp = endValue;
            if (homeLevelEl) homeLevelEl.innerText = `${t('profile.level').toUpperCase()} ${newLevel}`;

            if (typeof triggerHapticFeedback === 'function') {
                triggerHapticFeedback();
            }
        }
    }

    requestAnimationFrame(updateCounter);
}

let currentDashboardStats = {
    count: 0,
    flow: 0,
    avgPouches: 0,
    avgMg: 0
};

function animateNumber(elementId, startValue, endValue, duration = 1500, suffix = "", isFloat = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;

        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentVal = startValue + (endValue - startValue) * easeProgress;

        let displayStr = "";
        if (isFloat) {
            displayStr = currentVal.toFixed(1).replace('.', ',');
        } else {
            displayStr = Math.floor(currentVal).toLocaleString('de-DE');
        }

        el.innerText = `${displayStr}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            let finalStr = isFloat ? endValue.toFixed(1).replace('.', ',') : Math.floor(endValue).toLocaleString('de-DE');
            el.innerText = `${finalStr}${suffix}`;
        }
    }
    requestAnimationFrame(update);
}

// ==========================================
// I18N REFRESH HELPERS
// ==========================================

window.refreshStatUnits = function () {
    const unit = ' ' + t('unit.mg');
    ['stat-flow', 'stat-avg-mg'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const raw = el.innerText.replace(/[^0-9.,]/g, '').trim();
        if (raw) el.innerText = raw + unit;
    });
};

window.refreshLevelDisplay = function () {
    const level = window._currentUserLevel;
    if (!level) return;
    const homeLevelEl = document.getElementById('home-level');
    const profileLevelEl = document.getElementById('profile-level');
    if (homeLevelEl) homeLevelEl.innerText = `${t('profile.level').toUpperCase()} ${level}`;
    if (profileLevelEl) profileLevelEl.innerText = `${t('profile.level')} ${level}`;
};

// ==========================================
// 11. DEBUGGING & DEV COMMANDS
// ==========================================
window.unlock = function (id) {
    const foundSnus = globalSnusData.find(s => s.id === id);
    if (foundSnus) {
        console.log(`[Dev] Unlocking Snus #${id}: ${foundSnus.name} for rating...`);
        openSnusDetail(foundSnus.id, true);
    } else {
        console.error(`[Dev] Snus mit ID ${id} nicht gefunden!`);
    }
    return "Dev command executed.";
};

// Global bindings for profile picture crop functions
window.previewProfileImage = previewProfileImage;
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
window.saveCroppedAvatar = saveCroppedAvatar;
