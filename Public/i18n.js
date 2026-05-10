// ==========================================
// i18n — Translation Engine
// ==========================================

const TRANSLATIONS = {
    en: {
        // Greeting
        'greeting.morning': 'Good morning',
        'greeting.afternoon': 'Good afternoon',
        'greeting.evening': 'Good evening',
        'greeting.night': 'Good night',

        // Auth
        'auth.welcomeBack': 'Welcome back',
        'auth.createAccount': 'Create your account',
        'auth.signIn': 'Sign In',
        'auth.register': 'Register',
        'auth.dontHaveAccount': "Don't have an account? ",
        'auth.alreadyHaveAccount': 'Already have an account? ',
        'auth.signInWithGoogle': 'Sign in with Google',
        'auth.registerWithGoogle': 'Register with Google',
        'auth.signInWithApple': 'Sign in with Apple',
        'auth.registerWithApple': 'Register with Apple',
        'auth.fillAllFields': 'Please fill in all fields.',
        'auth.incorrectCredentials': 'Incorrect email or password.',
        'auth.usernameFormat': '2–30 chars: letters, numbers and _',
        'auth.passwordsNoMatch': 'Passwords do not match.',
        'auth.emailInUse': 'This email is already in use.',
        'auth.almostThere': 'Almost there',
        'auth.chooseUsername': 'Choose a username',
        'auth.save': 'Save',
        'auth.verifyEmail': 'Verify your email',
        'auth.checkInbox': 'Check your inbox',
        'auth.emailSent': 'We sent a verification link to:',

        // Navigation
        'nav.home': 'Home',
        'nav.dex': 'Dex',
        'nav.social': 'Social',
        'nav.profile': 'Profile',

        // Home tab
        'home.activeCans': 'Active Cans',
        'home.closedCans': 'Closed cans',
        'home.showAll': 'Show all',
        'home.noScans': 'No scans yet.',
        'home.canEmpty': 'Can Empty',

        // Active cans
        'activeCan.noActive': 'No active cans.',
        'activeCan.openNext': 'Open next',

        // Modal – snus detail (info view)
        'modal.scanCan': 'Scan Can',
        'modal.orderSnus': 'Order Snus',
        'modal.rate': 'Rate',
        'modal.unlockedAt': 'Unlocked at',
        'modal.opened': 'Opened',
        'modal.order': 'Order',
        'modal.viewRating': 'View Rating',
        'modal.changeRating': 'Change Rating',
        'modal.openNewCan': 'Open New Can',

        // Rating wizard
        'rating.notes': 'Notes (optional)',
        'rating.next': 'Next',
        'rating.save': 'Save',
        'rating.visuals.placeholder': 'How do the pouches look?',
        'rating.smell.placeholder': 'How does it smell?',
        'rating.taste.placeholder': 'How does it taste?',
        'rating.bite.placeholder': 'How strong is the bite?',
        'rating.drip.placeholder': 'How is the drip?',
        'rating.strength.placeholder': 'How strong is the nicotine hit?',

        // Dex
        'dex.searchPlaceholder': 'Search Snus...',

        // Social
        'social.mostScanned7d': 'Most Scanned (7 days)',
        'social.mostScannedToday': 'Most Scanned (Today)',
        'social.topRated': 'Top Rated (All Time)',
        'social.switchMode': 'SWITCH MODE',
        'social.noData': 'No data yet.',
        'social.rank': 'Rank {n}',

        // Badges
        'badges.title': 'Your Badges',
        'badges.subtitle': 'Your collected achievements.',
        'badges.noBadges': 'No badges unlocked yet.',
        'badges.unlocked': 'Unlocked',
        'badges.progress': 'Progress',
        'badges.wasUnlocked': 'was unlocked',

        // Connections
        'connections.title': 'Connections',
        'connections.searchPlaceholder': 'Search username...',
        'connections.newRequests': 'New Requests',
        'connections.followerRequests': '{n} follower request',
        'connections.followerRequestsPlural': '{n} follower requests',
        'connections.friends': 'Friends',
        'connections.followers': 'Followers',
        'connections.following': 'Following',
        'connections.requests': 'Requests',
        'connections.loading': 'Loading...',
        'connections.noFriends': 'Add friends to see them here.',
        'connections.noFollowers': 'You have no followers yet.',
        'connections.noFollowing': "You aren't following anyone yet.",
        'connections.noRequests': 'No pending requests.',
        'connections.wantsToFollow': 'Wants to follow you',
        'connections.confirm': 'Confirm',
        'connections.follow': 'Follow',
        'connections.following_btn': 'Following',
        'connections.requested': 'Requested',
        'connections.noCollectorFound': 'No collectors found.',
        'connections.typeMore': 'Please enter at least 2 characters...',
        'connections.searching': 'Searching...',

        // Scanner
        'scan.title': 'Scan Can',
        'scan.instruction': 'Center the barcode in the frame,<br>to scan it.',
        'scan.loading': 'Camera loading...',
        'scan.flashlight': 'Light',
        'scan.camera': 'Normal',
        'scan.openHelp': 'Open Help Center',
        'scan.noCameraAccess': 'No camera access',
        'scan.noCameraDesc': 'Please allow camera access in your device settings.',
        'scan.close': 'Close',
        'scan.settings': 'Settings',
        'scan.troubleTitle': 'Having trouble?',
        'scan.troubleDesc': 'Been scanning for a while — let us help you out.',
        'scan.noThanks': 'No thanks',
        'scan.getHelp': 'Get help',

        // Profile
        'profile.title': 'Profile',
        'profile.loading': 'Loading...',
        'profile.level': 'Lvl',
        'profile.cans': 'Cans',
        'profile.editProfile': 'Edit Profile',
        'profile.settings': 'Settings',

        // Settings section headers
        'settings.sectionAccount': 'Account',
        'settings.sectionPreferences': 'Preferences',
        'settings.sectionAbout': 'About',
        'settings.sectionSystem': 'System Info',

        // Settings menu
        'settings.editProfile': 'Edit Profile',
        'settings.stats': 'Stats',
        'settings.notifications': 'Notifications',
        'settings.privacy': 'Privacy & Security',
        'settings.tracking': 'Tracking',
        'settings.appearance': 'Appearance',
        'settings.language': 'Language',
        'settings.helpCenter': 'Help Center & FAQ',
        'settings.deleteAccount': 'Delete Account',
        'settings.signOut': 'Sign Out',

        // Settings – Edit Profile
        'editProfile.featuredBadge': 'Featured Badge',
        'editProfile.none': 'None',
        'editProfile.username': 'Username',
        'editProfile.changesPerMonth': '3 changes per month',
        'editProfile.email': 'Email',
        'editProfile.saveChanges': 'Save Changes',

        // Settings – Stats
        'stats.subtitle': 'Track your collector progress sorted by snus brand.',

        // Settings – Tracking
        'tracking.title': 'Individual Pouch Tracking',
        'tracking.desc': 'Track every single pouch instead of just the whole can at the end.',

        // Settings – Appearance
        'appearance.defaultSort': 'Default Sort: Brand',
        'appearance.defaultSortDesc': 'Starts the Dex sorted by brand instead of ID.',
        'appearance.warning': '⚠️ Caution when enabling: This feature causes lag and could lead to crashes. Use at your own risk.',
        'appearance.largeTiles': 'Large Tiles',
        'appearance.largeTilesDesc': 'Shows 2 instead of 3 columns in the Dex',
        'appearance.tileGlow': 'Tile Glow',
        'appearance.tileGlowDesc': 'Colored background glow based on rarity',

        // Settings – Language
        'language.title': 'Language',

        // Settings – Help Center
        'helpCenter.q1': 'How does the Dex work?',
        'helpCenter.a1': 'Every time you scan a new can, it gets added to your permanent Snusdex collection. You earn XP for rarities.',
        'helpCenter.q2': 'Can I manually add a Snus?',
        'helpCenter.a2': 'Currently, scanning the barcode is required to verify the product and maintain the integrity of the Dex.',
        'helpCenter.q3': 'How do I level up?',
        'helpCenter.a3': 'Your Collector Level increases as you gain XP. Rarer Snus (like Epic or Mythic) yield significantly more XP than Common ones.',
        'helpCenter.q4': 'How is my usage calculated?',
        'helpCenter.a4': "When you mark a can as 'Active' and later 'Empty', we calculate your daily average pouches and nicotine intake based on the time it took to finish it.",
        'helpCenter.contactSupport': 'Contact Support',

        // Settings – Delete Account
        'deleteAccount.title': 'Delete Account?',
        'deleteAccount.desc': 'This action is permanent and cannot be undone. All your Dex collections and stats will be lost forever.',
        'deleteAccount.confirm': 'Yes, delete my account',
        'deleteAccount.cancel': 'Cancel',

        // Privacy
        'privacy.profileVisibility': 'Profile Visibility',
        'privacy.privateProfile': 'Private Profile',
        'privacy.data': 'Data',
        'privacy.shareAnalytics': 'Share Analytics',

        // Notifications
        'notifications.pushNotifications': 'Push Notifications',
        'notifications.newFollower': 'New Follower',
        'notifications.friendActivity': 'Friend Activity',

        // Not found modal
        'notFound.title': 'Not Found',
        'notFound.desc': 'This barcode is not in the Snusdex yet.',
        'notFound.retryScan': 'Scan again',
        'notFound.report': 'Which Snus is this? Let us know',
        'notFound.close': 'Close',

        // All scans modal
        'allScans.title': 'All Scans',
        'allScans.noScans': 'No scans yet.',

        // Remove favorite modal
        'removeFav.confirm': 'Remove',
        'removeFav.cancel': 'Cancel',

        // Misc dynamic strings
        'social.noData': 'No data yet.',
        'home.noClosedCans': 'No closed cans yet.',
        'scan.flashlightOn': 'On',
        'scan.normal': 'Normal',
        'scan.wide': 'Wide',
        'scan.tele': 'Tele',

        // Scan help search
        'scanHelp.notFound': "Not in our catalog yet.<br>Want us to add it?",
        'scanHelp.brandPlaceholder': 'Brand (e.g. Lyft)',
        'scanHelp.flavorPlaceholder': 'Flavor / Name (e.g. Ice Cool)',
        'scanHelp.submitRequest': 'Submit Request',
    },

    de: {
        // Greeting
        'greeting.morning': 'Guten Morgen',
        'greeting.afternoon': 'Guten Tag',
        'greeting.evening': 'Guten Abend',
        'greeting.night': 'Gute Nacht',

        // Auth
        'auth.welcomeBack': 'Willkommen zurück',
        'auth.createAccount': 'Konto erstellen',
        'auth.signIn': 'Anmelden',
        'auth.register': 'Registrieren',
        'auth.dontHaveAccount': 'Noch kein Konto? ',
        'auth.alreadyHaveAccount': 'Bereits ein Konto? ',
        'auth.signInWithGoogle': 'Mit Google anmelden',
        'auth.registerWithGoogle': 'Mit Google registrieren',
        'auth.signInWithApple': 'Mit Apple anmelden',
        'auth.registerWithApple': 'Mit Apple registrieren',
        'auth.fillAllFields': 'Bitte alle Felder ausfüllen.',
        'auth.incorrectCredentials': 'Falsche E-Mail oder Passwort.',
        'auth.usernameFormat': '2–30 Zeichen: Buchstaben, Zahlen und _',
        'auth.passwordsNoMatch': 'Passwörter stimmen nicht überein.',
        'auth.emailInUse': 'Diese E-Mail wird bereits verwendet.',
        'auth.almostThere': 'Fast geschafft',
        'auth.chooseUsername': 'Wähle einen Nutzernamen',
        'auth.save': 'Speichern',
        'auth.verifyEmail': 'E-Mail bestätigen',
        'auth.checkInbox': 'Posteingang prüfen',
        'auth.emailSent': 'Wir haben einen Bestätigungslink gesendet an:',

        // Navigation
        'nav.home': 'Home',
        'nav.dex': 'Dex',
        'nav.social': 'Social',
        'nav.profile': 'Profil',

        // Home tab
        'home.activeCans': 'Aktive Dosen',
        'home.closedCans': 'Geschlossene Dosen',
        'home.showAll': 'Alle zeigen',
        'home.noScans': 'Noch keine Scans vorhanden.',
        'home.canEmpty': 'Dose leeren',

        // Active cans
        'activeCan.noActive': 'Keine aktiven Dosen.',
        'activeCan.openNext': 'Nächste öffnen',

        // Modal – snus detail (info view)
        'modal.scanCan': 'Dose scannen',
        'modal.orderSnus': 'Snus bestellen',
        'modal.rate': 'Bewerten',
        'modal.unlockedAt': 'Freigeschaltet am',
        'modal.opened': 'Geöffnet',
        'modal.order': 'Bestellen',
        'modal.viewRating': 'Rating ansehen',
        'modal.changeRating': 'Rating ändern',
        'modal.openNewCan': 'Neue Dose öffnen',

        // Rating wizard
        'rating.notes': 'Notizen (optional)',
        'rating.next': 'Weiter',
        'rating.save': 'Speichern',
        'rating.visuals.placeholder': 'Wie sehen die Pouches aus?',
        'rating.smell.placeholder': 'Wie riecht der Snus?',
        'rating.taste.placeholder': 'Wie schmeckt er?',
        'rating.bite.placeholder': 'Wie stark ist der Bite?',
        'rating.drip.placeholder': 'Wie ist der Drip?',
        'rating.strength.placeholder': 'Wie stark ist der Nikotinkick?',

        // Dex
        'dex.searchPlaceholder': 'Snus suchen...',

        // Social
        'social.mostScanned7d': 'Am meisten gescannt (7 Tage)',
        'social.mostScannedToday': 'Am meisten gescannt (Heute)',
        'social.topRated': 'Top Bewertet (Alle Zeit)',
        'social.switchMode': 'MODUS WECHSELN',
        'social.noData': 'Noch keine Daten.',
        'social.rank': 'Platz {n}',

        // Badges
        'badges.title': 'Deine Badges',
        'badges.subtitle': 'Deine gesammelten Errungenschaften.',
        'badges.noBadges': 'Noch keine Badges freigeschaltet.',
        'badges.unlocked': 'Freigeschaltet',
        'badges.progress': 'Fortschritt',
        'badges.wasUnlocked': 'wurde freigeschaltet',

        // Connections
        'connections.title': 'Connections',
        'connections.searchPlaceholder': 'Username suchen...',
        'connections.newRequests': 'Neue Anfragen',
        'connections.followerRequests': '{n} Follower-Anfrage',
        'connections.followerRequestsPlural': '{n} Follower-Anfragen',
        'connections.friends': 'Freunde',
        'connections.followers': 'Follower',
        'connections.following': 'Folge ich',
        'connections.requests': 'Anfragen',
        'connections.loading': 'Laden...',
        'connections.noFriends': 'Füge Freunde hinzu, um sie hier zu sehen.',
        'connections.noFollowers': 'Du hast noch keine Follower.',
        'connections.noFollowing': 'Du folgst noch niemandem.',
        'connections.noRequests': 'Keine offenen Anfragen.',
        'connections.wantsToFollow': 'Möchte dir folgen',
        'connections.confirm': 'Bestätigen',
        'connections.follow': 'Folgen',
        'connections.following_btn': 'Folge ich',
        'connections.requested': 'Angefragt',
        'connections.noCollectorFound': 'Keine Collector gefunden.',
        'connections.typeMore': 'Bitte mindestens 2 Zeichen eingeben...',
        'connections.searching': 'Suche...',

        // Scanner
        'scan.title': 'Dose Scannen',
        'scan.instruction': 'Zentriere den Barcode im Rahmen,<br>um ihn zu erfassen.',
        'scan.loading': 'Kamera wird geladen...',
        'scan.flashlight': 'Licht',
        'scan.camera': 'Normal',
        'scan.openHelp': 'Help Center öffnen',
        'scan.noCameraAccess': 'Kein Kamerazugriff',
        'scan.noCameraDesc': 'Bitte erlaube den Kamerazugriff in den Einstellungen deines Geräts.',
        'scan.close': 'Schließen',
        'scan.settings': 'Einstellungen',
        'scan.troubleTitle': 'Probleme beim Scannen?',
        'scan.troubleDesc': 'Du scannst schon eine Weile — lass uns dir helfen.',
        'scan.noThanks': 'Nein danke',
        'scan.getHelp': 'Hilfe erhalten',

        // Profile
        'profile.title': 'Profil',
        'profile.loading': 'Lade...',
        'profile.level': 'Lvl',
        'profile.cans': 'Dosen',
        'profile.editProfile': 'Profil bearbeiten',
        'profile.settings': 'Einstellungen',

        // Settings section headers
        'settings.sectionAccount': 'Konto',
        'settings.sectionPreferences': 'Einstellungen',
        'settings.sectionAbout': 'Über',
        'settings.sectionSystem': 'Systeminfo',

        // Settings menu
        'settings.editProfile': 'Profil bearbeiten',
        'settings.stats': 'Statistiken',
        'settings.notifications': 'Benachrichtigungen',
        'settings.privacy': 'Datenschutz & Sicherheit',
        'settings.tracking': 'Tracking',
        'settings.appearance': 'Darstellung',
        'settings.language': 'Sprache',
        'settings.helpCenter': 'Hilfe & FAQ',
        'settings.deleteAccount': 'Konto löschen',
        'settings.signOut': 'Abmelden',

        // Settings – Edit Profile
        'editProfile.featuredBadge': 'Featured Badge',
        'editProfile.none': 'Keins',
        'editProfile.username': 'Nutzername',
        'editProfile.changesPerMonth': '3 Änderungen pro Monat',
        'editProfile.email': 'E-Mail',
        'editProfile.saveChanges': 'Änderungen speichern',

        // Settings – Stats
        'stats.subtitle': 'Verfolge deinen Sammler-Fortschritt sortiert nach Snus-Marken.',

        // Settings – Tracking
        'tracking.title': 'Einzelner Pouch-Tracking',
        'tracking.desc': 'Tracke jeden einzelnen Pouch anstatt nur die ganze Dose am Ende.',

        // Settings – Appearance
        'appearance.defaultSort': 'Standard-Sortierung: Marke',
        'appearance.defaultSortDesc': 'Startet den Dex nach Marke statt ID sortiert.',
        'appearance.warning': '⚠️ Vorsicht beim Aktivieren: Dieses Feature verursacht Lags und könnte zu Abstürzen führen. Bitte nur auf eigenes Risiko verwenden.',
        'appearance.largeTiles': 'Große Kacheln',
        'appearance.largeTilesDesc': 'Zeigt 2 statt 3 Spalten im Dex an',
        'appearance.tileGlow': 'Kachel Glow',
        'appearance.tileGlowDesc': 'Farbiger Hintergrund-Glow der Seltenheit',

        // Settings – Language
        'language.title': 'Sprache',

        // Settings – Help Center
        'helpCenter.q1': 'Wie funktioniert der Dex?',
        'helpCenter.a1': 'Jedes Mal, wenn du eine neue Dose scannst, wird sie deiner permanenten Snusdex-Sammlung hinzugefügt. Du verdienst XP für Seltenheiten.',
        'helpCenter.q2': 'Kann ich einen Snus manuell hinzufügen?',
        'helpCenter.a2': 'Derzeit ist das Scannen des Barcodes erforderlich, um das Produkt zu verifizieren und die Integrität des Dex zu wahren.',
        'helpCenter.q3': 'Wie steige ich auf?',
        'helpCenter.a3': 'Dein Collector-Level steigt mit jedem XP-Gewinn. Seltenere Snus (wie Epic oder Mythic) bringen deutlich mehr XP als Common-Snus.',
        'helpCenter.q4': 'Wie wird mein Verbrauch berechnet?',
        'helpCenter.a4': "Wenn du eine Dose als 'Aktiv' markierst und später als 'Leer', berechnen wir deinen täglichen Durchschnitt an Pouches und Nikotinaufnahme.",
        'helpCenter.contactSupport': 'Support kontaktieren',

        // Settings – Delete Account
        'deleteAccount.title': 'Konto löschen?',
        'deleteAccount.desc': 'Diese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden. Alle deine Dex-Sammlungen und Statistiken gehen für immer verloren.',
        'deleteAccount.confirm': 'Ja, Konto löschen',
        'deleteAccount.cancel': 'Abbrechen',

        // Privacy
        'privacy.profileVisibility': 'Profil-Sichtbarkeit',
        'privacy.privateProfile': 'Privates Profil',
        'privacy.data': 'Daten',
        'privacy.shareAnalytics': 'Analysen teilen',

        // Notifications
        'notifications.pushNotifications': 'Push-Benachrichtigungen',
        'notifications.newFollower': 'Neuer Follower',
        'notifications.friendActivity': 'Freundesaktivität',

        // Not found modal
        'notFound.title': 'Nicht gefunden',
        'notFound.desc': 'Dieser Barcode ist noch nicht im Snusdex.',
        'notFound.retryScan': 'Nochmal scannen',
        'notFound.report': 'Welcher Snus ist das? Uns mitteilen',
        'notFound.close': 'Schließen',

        // All scans modal
        'allScans.title': 'Alle Scans',
        'allScans.noScans': 'Noch keine Scans vorhanden.',

        // Remove favorite modal
        'removeFav.confirm': 'Entfernen',
        'removeFav.cancel': 'Abbrechen',

        // Misc dynamic strings
        'social.noData': 'Noch keine Daten.',
        'home.noClosedCans': 'Noch keine Dosen geschlossen.',
        'scan.flashlightOn': 'An',
        'scan.normal': 'Normal',
        'scan.wide': 'Weitwinkel',
        'scan.tele': 'Telelinse',

        // Scan help search
        'scanHelp.notFound': "Noch nicht in unserem Sortiment.<br>Sollen wir es hinzufügen?",
        'scanHelp.brandPlaceholder': 'Marke (z.B. Lyft)',
        'scanHelp.flavorPlaceholder': 'Geschmack / Name (z.B. Ice Cool)',
        'scanHelp.submitRequest': 'Anfrage senden',
    },

    ru: {
        // Greeting
        'greeting.morning': 'Доброе утро',
        'greeting.afternoon': 'Добрый день',
        'greeting.evening': 'Добрый вечер',
        'greeting.night': 'Спокойной ночи',

        // Auth
        'auth.welcomeBack': 'С возвращением',
        'auth.createAccount': 'Создать аккаунт',
        'auth.signIn': 'Войти',
        'auth.register': 'Зарегистрироваться',
        'auth.dontHaveAccount': 'Нет аккаунта? ',
        'auth.alreadyHaveAccount': 'Уже есть аккаунт? ',
        'auth.signInWithGoogle': 'Войти через Google',
        'auth.registerWithGoogle': 'Регистрация через Google',
        'auth.signInWithApple': 'Войти через Apple',
        'auth.registerWithApple': 'Регистрация через Apple',
        'auth.fillAllFields': 'Пожалуйста, заполните все поля.',
        'auth.incorrectCredentials': 'Неверный email или пароль.',
        'auth.usernameFormat': '2–30 символов: буквы, цифры и _',
        'auth.passwordsNoMatch': 'Пароли не совпадают.',
        'auth.emailInUse': 'Этот email уже используется.',
        'auth.almostThere': 'Почти готово',
        'auth.chooseUsername': 'Выберите имя пользователя',
        'auth.save': 'Сохранить',
        'auth.verifyEmail': 'Подтвердите email',
        'auth.checkInbox': 'Проверьте почту',
        'auth.emailSent': 'Мы отправили ссылку для подтверждения на:',

        // Navigation
        'nav.home': 'Главная',
        'nav.dex': 'Декс',
        'nav.social': 'Соцсеть',
        'nav.profile': 'Профиль',

        // Home tab
        'home.activeCans': 'Активные банки',
        'home.closedCans': 'Закрытые банки',
        'home.showAll': 'Показать все',
        'home.noScans': 'Сканирований ещё нет.',
        'home.canEmpty': 'Банка пуста',

        // Active cans
        'activeCan.noActive': 'Нет активных банок.',
        'activeCan.openNext': 'Открыть следующую',

        // Modal – snus detail (info view)
        'modal.scanCan': 'Сканировать банку',
        'modal.orderSnus': 'Заказать снюс',
        'modal.rate': 'Оценить',
        'modal.unlockedAt': 'Разблокировано',
        'modal.opened': 'Открыто',
        'modal.order': 'Заказать',
        'modal.viewRating': 'Посмотреть оценку',
        'modal.changeRating': 'Изменить оценку',
        'modal.openNewCan': 'Открыть новую банку',

        // Rating wizard
        'rating.notes': 'Заметки (необязательно)',
        'rating.next': 'Далее',
        'rating.save': 'Сохранить',
        'rating.visuals.placeholder': 'Как выглядят пакетики?',
        'rating.smell.placeholder': 'Как пахнет снюс?',
        'rating.taste.placeholder': 'Каков вкус?',
        'rating.bite.placeholder': 'Насколько сильное жжение?',
        'rating.drip.placeholder': 'Как с дрипом?',
        'rating.strength.placeholder': 'Насколько сильный никотиновый удар?',

        // Dex
        'dex.searchPlaceholder': 'Поиск снюса...',

        // Social
        'social.mostScanned7d': 'Чаще всего сканируют (7 дней)',
        'social.mostScannedToday': 'Чаще всего сканируют (Сегодня)',
        'social.topRated': 'Топ оценок (За всё время)',
        'social.switchMode': 'СМЕНИТЬ РЕЖИМ',
        'social.noData': 'Данных пока нет.',
        'social.rank': 'Место {n}',

        // Badges
        'badges.title': 'Ваши значки',
        'badges.subtitle': 'Ваши собранные достижения.',
        'badges.noBadges': 'Значков ещё нет.',
        'badges.unlocked': 'Разблокировано',
        'badges.progress': 'Прогресс',
        'badges.wasUnlocked': 'разблокировано',

        // Connections
        'connections.title': 'Контакты',
        'connections.searchPlaceholder': 'Поиск пользователя...',
        'connections.newRequests': 'Новые заявки',
        'connections.followerRequests': '{n} заявка на подписку',
        'connections.followerRequestsPlural': '{n} заявки на подписку',
        'connections.friends': 'Друзья',
        'connections.followers': 'Подписчики',
        'connections.following': 'Подписки',
        'connections.requests': 'Заявки',
        'connections.loading': 'Загрузка...',
        'connections.noFriends': 'Добавьте друзей, чтобы видеть их здесь.',
        'connections.noFollowers': 'У вас ещё нет подписчиков.',
        'connections.noFollowing': 'Вы ни на кого не подписаны.',
        'connections.noRequests': 'Нет входящих заявок.',
        'connections.wantsToFollow': 'Хочет подписаться на вас',
        'connections.confirm': 'Принять',
        'connections.follow': 'Подписаться',
        'connections.following_btn': 'Вы подписаны',
        'connections.requested': 'Заявка отправлена',
        'connections.noCollectorFound': 'Коллекционеры не найдены.',
        'connections.typeMore': 'Введите не менее 2 символов...',
        'connections.searching': 'Поиск...',

        // Scanner
        'scan.title': 'Сканировать банку',
        'scan.instruction': 'Поместите штрихкод в рамку,<br>чтобы отсканировать.',
        'scan.loading': 'Загрузка камеры...',
        'scan.flashlight': 'Свет',
        'scan.camera': 'Обычная',
        'scan.openHelp': 'Открыть справку',
        'scan.noCameraAccess': 'Нет доступа к камере',
        'scan.noCameraDesc': 'Пожалуйста, разрешите доступ к камере в настройках устройства.',
        'scan.close': 'Закрыть',
        'scan.settings': 'Настройки',
        'scan.troubleTitle': 'Возникли трудности?',
        'scan.troubleDesc': 'Вы уже давно сканируете — давайте поможем.',
        'scan.noThanks': 'Нет, спасибо',
        'scan.getHelp': 'Получить помощь',

        // Profile
        'profile.title': 'Профиль',
        'profile.loading': 'Загрузка...',
        'profile.level': 'Ур.',
        'profile.cans': 'Банок',
        'profile.editProfile': 'Редактировать профиль',
        'profile.settings': 'Настройки',

        // Settings section headers
        'settings.sectionAccount': 'Аккаунт',
        'settings.sectionPreferences': 'Настройки',
        'settings.sectionAbout': 'О приложении',
        'settings.sectionSystem': 'Системная информация',

        // Settings menu
        'settings.editProfile': 'Редактировать профиль',
        'settings.stats': 'Статистика',
        'settings.notifications': 'Уведомления',
        'settings.privacy': 'Конфиденциальность',
        'settings.tracking': 'Отслеживание',
        'settings.appearance': 'Внешний вид',
        'settings.language': 'Язык',
        'settings.helpCenter': 'Справка и FAQ',
        'settings.deleteAccount': 'Удалить аккаунт',
        'settings.signOut': 'Выйти',

        // Settings – Edit Profile
        'editProfile.featuredBadge': 'Значок профиля',
        'editProfile.none': 'Нет',
        'editProfile.username': 'Имя пользователя',
        'editProfile.changesPerMonth': '3 изменения в месяц',
        'editProfile.email': 'Email',
        'editProfile.saveChanges': 'Сохранить изменения',

        // Settings – Stats
        'stats.subtitle': 'Отслеживайте прогресс коллекции, отсортированной по брендам снюса.',

        // Settings – Tracking
        'tracking.title': 'Отслеживание пакетиков',
        'tracking.desc': 'Отслеживайте каждый отдельный пакетик, а не только всю банку в конце.',

        // Settings – Appearance
        'appearance.defaultSort': 'Сортировка по умолчанию: Бренд',
        'appearance.defaultSortDesc': 'Запускает Декс с сортировкой по бренду вместо ID.',
        'appearance.warning': '⚠️ Осторожно: эта функция может вызывать лаги и сбои. Используйте на свой страх и риск.',
        'appearance.largeTiles': 'Крупные плитки',
        'appearance.largeTilesDesc': 'Показывает 2 вместо 3 столбцов в Дексе',
        'appearance.tileGlow': 'Свечение плиток',
        'appearance.tileGlowDesc': 'Цветное фоновое свечение в зависимости от редкости',

        // Settings – Language
        'language.title': 'Язык',

        // Settings – Help Center
        'helpCenter.q1': 'Как работает Декс?',
        'helpCenter.a1': 'Каждый раз при сканировании новой банки она добавляется в вашу постоянную коллекцию Snusdex. Вы получаете XP за редкость.',
        'helpCenter.q2': 'Можно ли добавить снюс вручную?',
        'helpCenter.a2': 'В настоящее время для подтверждения продукта необходимо сканировать штрихкод.',
        'helpCenter.q3': 'Как повысить уровень?',
        'helpCenter.a3': 'Уровень коллекционера растёт вместе с XP. Более редкий снюс (Epic или Mythic) даёт значительно больше XP.',
        'helpCenter.q4': 'Как рассчитывается потребление?',
        'helpCenter.a4': "Когда вы помечаете банку как «Активную» и затем «Пустую», мы рассчитываем среднее количество пакетиков в день и потребление никотина.",
        'helpCenter.contactSupport': 'Связаться с поддержкой',

        // Settings – Delete Account
        'deleteAccount.title': 'Удалить аккаунт?',
        'deleteAccount.desc': 'Это действие необратимо. Все ваши коллекции и статистика будут удалены навсегда.',
        'deleteAccount.confirm': 'Да, удалить аккаунт',
        'deleteAccount.cancel': 'Отмена',

        // Privacy
        'privacy.profileVisibility': 'Видимость профиля',
        'privacy.privateProfile': 'Закрытый профиль',
        'privacy.data': 'Данные',
        'privacy.shareAnalytics': 'Делиться аналитикой',

        // Notifications
        'notifications.pushNotifications': 'Push-уведомления',
        'notifications.newFollower': 'Новый подписчик',
        'notifications.friendActivity': 'Активность друзей',

        // Not found modal
        'notFound.title': 'Не найдено',
        'notFound.desc': 'Этого штрихкода ещё нет в Snusdex.',
        'notFound.retryScan': 'Сканировать снова',
        'notFound.report': 'Что это за снюс? Сообщите нам',
        'notFound.close': 'Закрыть',

        // All scans modal
        'allScans.title': 'Все сканы',
        'allScans.noScans': 'Сканирований ещё нет.',

        // Remove favorite modal
        'removeFav.confirm': 'Удалить',
        'removeFav.cancel': 'Отмена',

        // Misc dynamic strings
        'social.noData': 'Данных пока нет.',
        'home.noClosedCans': 'Закрытых банок пока нет.',
        'scan.flashlightOn': 'Вкл',
        'scan.normal': 'Обычная',
        'scan.wide': 'Широкий угол',
        'scan.tele': 'Телеобъектив',

        // Scan help search
        'scanHelp.notFound': "Ещё нет в каталоге.<br>Добавить?",
        'scanHelp.brandPlaceholder': 'Бренд (например, Lyft)',
        'scanHelp.flavorPlaceholder': 'Вкус / Название (например, Ice Cool)',
        'scanHelp.submitRequest': 'Отправить заявку',
    }
};

let currentLang = localStorage.getItem('appLang') || 'en';
let _t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];

function t(key, params) {
    const str = (_t && _t[key]) ? _t[key] : (TRANSLATIONS['en'][key] || key);
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : '{' + k + '}'));
}

function setLang(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem('appLang', lang);
    _t = TRANSLATIONS[lang];
    document.documentElement.lang = lang;
    window.currentLang = lang;
    applyTranslations();
    const badge = document.getElementById('settings-lang-badge');
    if (badge) badge.textContent = { en: 'English', de: 'Deutsch', ru: 'Русский' }[lang] || '';
    if (typeof window.updateGreeting === 'function') window.updateGreeting();
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    const badge = document.getElementById('settings-lang-badge');
    if (badge) badge.textContent = { en: 'English', de: 'Deutsch', ru: 'Русский' }[currentLang] || '';
}

window.t = t;
window.setLang = setLang;
window.applyTranslations = applyTranslations;
window.currentLang = currentLang;

document.addEventListener('DOMContentLoaded', applyTranslations);
