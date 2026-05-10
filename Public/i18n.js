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
        'auth.continue': 'Continue',
        'auth.signingOut': 'Signing Out',
        'auth.or': 'or',
        'auth.emailPlaceholder': 'Email',
        'auth.passwordPlaceholder': 'Password',
        'auth.confirmPasswordPlaceholder': 'Confirm Password',
        'auth.usernamePlaceholder': 'Username',
        'auth.passwordsNoMatchInline': 'Passwords do not match',
        'auth.reqLength': 'At least 6 characters',
        'auth.reqUpper': 'At least 1 uppercase letter',
        'auth.reqNumber': 'At least 1 number',
        'auth.confirmCode': 'Confirm Code',
        'auth.resendCode': 'Resend Code',
        'auth.backToSignIn': 'Back to Sign In',
        'auth.verifyDesc': 'We sent you a 6-digit confirmation code. Please enter it below.',
        'auth.chooseUsernameDesc': 'Choose your Dex username.',
        'auth.openingGoogle': 'Opening Google...',
        'auth.enterUsername': 'Please enter a username.',
        'auth.checkEmail': 'Check your email',
        'auth.emailSentDesc': 'We sent a confirmation link to {email}. Open the email and tap the link to activate your account.',
        'auth.openMailApp': 'Open Mail App',
        'auth.goToSignIn': 'Go to Sign In',
        'auth.noEmailReceived': "Didn't receive an email? Check your spam folder or try again.",

        // Common
        'common.loading': 'Loading...',
        'common.unknownSnus': 'Unknown Snus',
        'home.collectorId': 'Collector ID',
        'error.saveFailed': 'Save failed: {msg}',
        'error.acceptFailed': 'Could not accept request.',
        'error.declineFailed': 'Could not decline request.',
        'error.openCanFailed': 'Failed to open can.',
        'favorite.removeTitle': 'Remove Favorite?',
        'favorite.removePrefix': 'Do you really want to remove',
        'favorite.removeSuffix': 'from your favorites?',
        'favorite.cancel': 'Cancel',
        'favorite.remove': 'Remove',

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
        'home.collection': 'Collection',
        'home.totalCans': 'Total Cans (Dex)',
        'home.lifetimeTracked': 'Lifetime Tracked',
        'home.totalNicotine': 'Total Nicotine',
        'home.usage': 'Usage',
        'home.avgPouchesDay': 'Avg Pouches / Day',
        'home.intake': 'Intake',
        'home.avgDailyMg': 'Avg Daily MG',
        'home.exploreBrands': 'Explore Brands',
        'home.activeCan': 'Active Can',
        'home.currentlyUsing': 'Currently Using',
        'home.allClosedCans': 'All closed cans',

        // Active cans
        'activeCan.noActive': 'No active cans.',
        'activeCan.openNext': 'Open next',
        'activeCan.openSince': 'Open since',
        'activeCan.empty': 'Empty',
        'activeCan.pouchesTaken': 'Pouches Taken',

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
        'rating.stepTitle': 'Rating',
        'rating.scale': 'Rating (1-10)',
        'rating.notes': 'Notes (optional)',
        'rating.next': 'Next',
        'rating.save': 'Save',
        'rating.visuals.placeholder': 'How do the pouches look?',
        'rating.smell.placeholder': 'How does it smell?',
        'rating.taste.placeholder': 'How does it taste?',
        'rating.bite.placeholder': 'How strong is the bite?',
        'rating.drip.placeholder': 'How is the drip?',
        'rating.strength.placeholder': 'How strong is the nicotine hit?',

        // Rating category labels
        'rating.visuals': 'Visuals',
        'rating.smell': 'Smell',
        'rating.taste': 'Taste',
        'rating.bite': 'Bite',
        'rating.drip': 'Drip',
        'rating.strength': 'Strength',
        'rating.vis': 'Vis.',
        'rating.str': 'Str.',

        // Dex
        'dex.searchPlaceholder': 'Search Snus...',

        // Social
        'social.badges': 'Badges',
        'social.mostScanned7d': 'Most Scanned (7 days)',
        'social.mostScannedToday': 'Most Scanned (Today)',
        'social.topRated': 'Top Rated (All Time)',
        'social.switchMode': 'SWITCH MODE',
        'social.noData': 'No data yet.',
        'social.rank': 'Rank {n}',
        'social.topRatedCard': 'Top Rated Snus 🏆',
        'social.mostPopularCard': 'Most Popular Today 🔍',
        'social.ratingsLabel': 'Ratings',
        'social.scansLabel': 'Scans',
        'social.scoreLabel': 'Score',
        'social.overallSuffix': '/ 10 Overall',
        'social.errorLoad': 'Could not load social stats.',

        // Rarities
        'rarity.common': 'Common',
        'rarity.uncommon': 'Uncommon',
        'rarity.rare': 'Rare',
        'rarity.epic': 'Epic',
        'rarity.mythic': 'Mythic',
        'rarity.legendary': 'Legendary',

        // Units
        'unit.mg': 'MG',
        'unit.mgPerG': 'MG/G',

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
        'editProfile.saving': 'Saving...',
        'editProfile.saved': 'Saved',
        'editProfile.errorFormat': 'Only letters, numbers and _ allowed (2–30 chars).',
        'editProfile.errorLimitReached': 'Limit reached (3/3). {days} day(s) until reset.',

        // Settings – Stats
        'stats.subtitle': 'Track your collector progress sorted by snus brand.',
        'stats.collected': 'Collected',

        // Settings – Tracking
        'tracking.title': 'Individual Pouch Tracking',
        'tracking.desc': 'Track every single pouch instead of just the whole can at the end.',
        'tracking.modeIndividual': 'Individual',
        'tracking.modeFull': 'Full Tracking',

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
        'notifications.newSnusDrops': 'New Snus Drops (Dex)',
        'notifications.emailSummaries': 'Email Summaries',

        // System Info
        'system.latestUpdate': 'Latest Update',
        'system.fetching': 'Fetching...',
        'system.unavailable': 'Unavailable',
        'system.justNow': 'Just now',
        'system.minutesAgo': '{n} min ago',
        'system.hoursAgo': '{n} hr ago',
        'system.daysAgo': '{n} day ago',
        'system.daysAgoPlural': '{n} days ago',

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
        'scanHelp.title': 'Help Center',
        'scanHelp.subtitle': "Let's get you scanning again.",
        'scanHelp.quickFixes': 'Quick Fixes',
        'scanHelp.restartApp': 'Restart the App',
        'scanHelp.toggleFlashlight': 'Toggle Flashlight',
        'scanHelp.switchCamera': 'Switch Camera',
        'scanHelp.catalogCheck': 'Is it in our catalog?',
        'scanHelp.searchPlaceholder': 'Search brand or flavor...',
        'scanHelp.typeToSearch': 'Type to search our full catalog',
        'scanHelp.stillNeedHelp': 'Still need help?',
        'scanHelp.contactSupport': 'Contact Support',
        'scanHelp.havingTrouble': 'Having trouble?',
        'scanHelp.scanningDesc': 'Been scanning for a while — let us help you out.',
        'scanHelp.noThanks': 'No thanks',
        'scanHelp.getHelp': 'Get help',
        'common.on': 'On',
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
        'auth.continue': 'Weiter',
        'auth.signingOut': 'Abmelden...',
        'auth.or': 'oder',
        'auth.emailPlaceholder': 'E-Mail',
        'auth.passwordPlaceholder': 'Passwort',
        'auth.confirmPasswordPlaceholder': 'Passwort bestätigen',
        'auth.usernamePlaceholder': 'Nutzername',
        'auth.passwordsNoMatchInline': 'Passwörter stimmen nicht überein',
        'auth.reqLength': 'Mindestens 6 Zeichen',
        'auth.reqUpper': 'Mindestens 1 Großbuchstabe',
        'auth.reqNumber': 'Mindestens 1 Zahl',
        'auth.confirmCode': 'Code bestätigen',
        'auth.resendCode': 'Code erneut senden',
        'auth.backToSignIn': 'Zurück zur Anmeldung',
        'auth.verifyDesc': 'Wir haben dir einen 6-stelligen Bestätigungscode gesendet. Bitte gib ihn unten ein.',
        'auth.chooseUsernameDesc': 'Wähle deinen Dex-Nutzernamen.',
        'auth.openingGoogle': 'Google wird geöffnet...',
        'auth.enterUsername': 'Bitte gib einen Nutzernamen ein.',
        'auth.checkEmail': 'Überprüfe deine E-Mail',
        'auth.emailSentDesc': 'Wir haben dir einen Bestätigungslink an {email} gesendet. Öffne die E-Mail und tippe den Link, um dein Konto zu aktivieren.',
        'auth.openMailApp': 'Mail-App öffnen',
        'auth.goToSignIn': 'Zur Anmeldung',
        'auth.noEmailReceived': 'Keine E-Mail erhalten? Überprüfe deinen Spam-Ordner oder versuche es erneut.',

        // Common
        'common.loading': 'Laden...',
        'common.unknownSnus': 'Unbekannter Snus',
        'home.collectorId': 'Sammler-ID',
        'error.saveFailed': 'Speichern fehlgeschlagen: {msg}',
        'error.acceptFailed': 'Anfrage konnte nicht akzeptiert werden.',
        'error.declineFailed': 'Anfrage konnte nicht abgelehnt werden.',
        'error.openCanFailed': 'Dose konnte nicht geöffnet werden.',
        'favorite.removeTitle': 'Favorit entfernen?',
        'favorite.removePrefix': 'Möchtest du',
        'favorite.removeSuffix': 'wirklich aus deinen Favoriten entfernen?',
        'favorite.cancel': 'Abbrechen',
        'favorite.remove': 'Entfernen',

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
        'home.collection': 'Sammlung',
        'home.totalCans': 'Dosen gesamt (Dex)',
        'home.lifetimeTracked': 'Gesamter Verbrauch',
        'home.totalNicotine': 'Nikotin gesamt',
        'home.usage': 'Verbrauch',
        'home.avgPouchesDay': 'Ø Pouches / Tag',
        'home.intake': 'Aufnahme',
        'home.avgDailyMg': 'Ø Tägliches MG',
        'home.exploreBrands': 'Marken entdecken',
        'home.activeCan': 'Aktive Dose',
        'home.currentlyUsing': 'Derzeit in Verwendung',
        'home.allClosedCans': 'Alle geschlossenen Dosen',

        // Active cans
        'activeCan.noActive': 'Keine aktiven Dosen.',
        'activeCan.openNext': 'Nächste öffnen',
        'activeCan.openSince': 'Offen seit',
        'activeCan.empty': 'Leeren',
        'activeCan.pouchesTaken': 'Genommene Pouches',

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
        'rating.stepTitle': 'Bewertung',
        'rating.scale': 'Bewertung (1-10)',
        'rating.notes': 'Notizen (optional)',
        'rating.next': 'Weiter',
        'rating.save': 'Speichern',
        'rating.visuals.placeholder': 'Wie sehen die Pouches aus?',
        'rating.smell.placeholder': 'Wie riecht der Snus?',
        'rating.taste.placeholder': 'Wie schmeckt er?',
        'rating.bite.placeholder': 'Wie stark ist der Bite?',
        'rating.drip.placeholder': 'Wie ist der Drip?',
        'rating.strength.placeholder': 'Wie stark ist der Nikotinkick?',

        // Rating category labels
        'rating.visuals': 'Optik',
        'rating.smell': 'Geruch',
        'rating.taste': 'Geschmack',
        'rating.bite': 'Biss',
        'rating.drip': 'Drip',
        'rating.strength': 'Stärke',
        'rating.vis': 'Opt.',
        'rating.str': 'Stä.',

        // Dex
        'dex.searchPlaceholder': 'Snus suchen...',

        // Social
        'social.badges': 'Badges',
        'social.mostScanned7d': 'Am meisten gescannt (7 Tage)',
        'social.mostScannedToday': 'Am meisten gescannt (Heute)',
        'social.topRated': 'Top Bewertet (Alle Zeit)',
        'social.switchMode': 'MODUS WECHSELN',
        'social.noData': 'Noch keine Daten.',
        'social.rank': 'Platz {n}',
        'social.topRatedCard': 'Top Bewertung 🏆',
        'social.mostPopularCard': 'Beliebteste heute 🔍',
        'social.ratingsLabel': 'Bewertungen',
        'social.scansLabel': 'Scans',
        'social.scoreLabel': 'Score',
        'social.overallSuffix': '/ 10 Gesamt',
        'social.errorLoad': 'Soziale Statistiken konnten nicht geladen werden.',

        // Rarities
        'rarity.common': 'Gewöhnlich',
        'rarity.uncommon': 'Ungewöhnlich',
        'rarity.rare': 'Selten',
        'rarity.epic': 'Episch',
        'rarity.mythic': 'Mythisch',
        'rarity.legendary': 'Legendär',

        // Units
        'unit.mg': 'MG',
        'unit.mgPerG': 'MG/G',

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
        'editProfile.saving': 'Speichern...',
        'editProfile.saved': 'Gespeichert',
        'editProfile.errorFormat': 'Nur Buchstaben, Zahlen und _ erlaubt (2–30 Zeichen).',
        'editProfile.errorLimitReached': 'Limit erreicht (3/3). Noch {days} Tag(e) bis zur Freischaltung.',

        // Settings – Stats
        'stats.subtitle': 'Verfolge deinen Sammler-Fortschritt sortiert nach Snus-Marken.',
        'stats.collected': 'Gesammelt',

        // Settings – Tracking
        'tracking.title': 'Einzelner Pouch-Tracking',
        'tracking.desc': 'Tracke jeden einzelnen Pouch anstatt nur die ganze Dose am Ende.',
        'tracking.modeIndividual': 'Einzeln',
        'tracking.modeFull': 'Vollständiges Tracking',

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
        'notifications.newSnusDrops': 'Neue Snus Drops (Dex)',
        'notifications.emailSummaries': 'E-Mail Zusammenfassungen',

        // System Info
        'system.latestUpdate': 'Letztes Update',
        'system.fetching': 'Lädt...',
        'system.unavailable': 'Nicht verfügbar',
        'system.justNow': 'Gerade eben',
        'system.minutesAgo': 'vor {n} Min',
        'system.hoursAgo': 'vor {n} Std',
        'system.daysAgo': 'vor {n} Tag',
        'system.daysAgoPlural': 'vor {n} Tagen',

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
        'scanHelp.title': 'Help Center',
        'scanHelp.subtitle': 'Lass uns dir beim Scannen helfen.',
        'scanHelp.quickFixes': 'Schnelle Lösungen',
        'scanHelp.restartApp': 'App neu starten',
        'scanHelp.toggleFlashlight': 'Taschenlampe umschalten',
        'scanHelp.switchCamera': 'Kamera wechseln',
        'scanHelp.catalogCheck': 'Ist es in unserem Sortiment?',
        'scanHelp.searchPlaceholder': 'Marke oder Geschmack suchen...',
        'scanHelp.typeToSearch': 'Tippen um das Sortiment zu durchsuchen',
        'scanHelp.stillNeedHelp': 'Noch Hilfe nötig?',
        'scanHelp.contactSupport': 'Support kontaktieren',
        'scanHelp.havingTrouble': 'Probleme beim Scannen?',
        'scanHelp.scanningDesc': 'Du scannst schon eine Weile — wir helfen dir gerne.',
        'scanHelp.noThanks': 'Nein danke',
        'scanHelp.getHelp': 'Hilfe holen',
        'common.on': 'An',
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
        'auth.continue': 'Продолжить',
        'auth.signingOut': 'Выход...',
        'auth.or': 'или',
        'auth.emailPlaceholder': 'Эл. почта',
        'auth.passwordPlaceholder': 'Пароль',
        'auth.confirmPasswordPlaceholder': 'Подтвердите пароль',
        'auth.usernamePlaceholder': 'Имя пользователя',
        'auth.passwordsNoMatchInline': 'Пароли не совпадают',
        'auth.reqLength': 'Минимум 6 символов',
        'auth.reqUpper': 'Минимум 1 заглавная буква',
        'auth.reqNumber': 'Минимум 1 цифра',
        'auth.confirmCode': 'Подтвердить код',
        'auth.resendCode': 'Отправить код снова',
        'auth.backToSignIn': 'Назад ко входу',
        'auth.verifyDesc': 'Мы отправили вам 6-значный код подтверждения. Введите его ниже.',
        'auth.chooseUsernameDesc': 'Выберите имя пользователя Dex.',
        'auth.openingGoogle': 'Открытие Google...',
        'auth.enterUsername': 'Пожалуйста, введите имя пользователя.',
        'auth.checkEmail': 'Проверьте вашу почту',
        'auth.emailSentDesc': 'Мы отправили ссылку подтверждения на {email}. Откройте письмо и нажмите ссылку, чтобы активировать аккаунт.',
        'auth.openMailApp': 'Открыть почту',
        'auth.goToSignIn': 'Перейти ко входу',
        'auth.noEmailReceived': 'Не получили письмо? Проверьте папку со спамом или повторите попытку.',

        // Common
        'common.loading': 'Загрузка...',
        'common.unknownSnus': 'Неизвестный снюс',
        'home.collectorId': 'ID коллекционера',
        'error.saveFailed': 'Ошибка сохранения: {msg}',
        'error.acceptFailed': 'Не удалось принять запрос.',
        'error.declineFailed': 'Не удалось отклонить запрос.',
        'error.openCanFailed': 'Не удалось открыть банку.',
        'favorite.removeTitle': 'Удалить из избранного?',
        'favorite.removePrefix': 'Вы действительно хотите удалить',
        'favorite.removeSuffix': 'из избранного?',
        'favorite.cancel': 'Отмена',
        'favorite.remove': 'Удалить',

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
        'home.collection': 'Коллекция',
        'home.totalCans': 'Всего банок (Dex)',
        'home.lifetimeTracked': 'Всего отслежено',
        'home.totalNicotine': 'Никотин всего',
        'home.usage': 'Потребление',
        'home.avgPouchesDay': 'Ср. пакетиков / день',
        'home.intake': 'Приём',
        'home.avgDailyMg': 'Ср. дневное мг',
        'home.exploreBrands': 'Изучить бренды',
        'home.activeCan': 'Активная банка',
        'home.currentlyUsing': 'Сейчас используется',
        'home.allClosedCans': 'Все закрытые банки',

        // Active cans
        'activeCan.noActive': 'Нет активных банок.',
        'activeCan.openNext': 'Открыть следующую',
        'activeCan.openSince': 'Открыто',
        'activeCan.empty': 'Пусто',
        'activeCan.pouchesTaken': 'Пакетиков взято',

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
        'rating.stepTitle': 'Оценка',
        'rating.scale': 'Оценка (1-10)',
        'rating.notes': 'Заметки (необязательно)',
        'rating.next': 'Далее',
        'rating.save': 'Сохранить',
        'rating.visuals.placeholder': 'Как выглядят пакетики?',
        'rating.smell.placeholder': 'Как пахнет снюс?',
        'rating.taste.placeholder': 'Каков вкус?',
        'rating.bite.placeholder': 'Насколько сильное жжение?',
        'rating.drip.placeholder': 'Как с дрипом?',
        'rating.strength.placeholder': 'Насколько сильный никотиновый удар?',

        // Rating category labels
        'rating.visuals': 'Внешний вид',
        'rating.smell': 'Запах',
        'rating.taste': 'Вкус',
        'rating.bite': 'Жжение',
        'rating.drip': 'Дрип',
        'rating.strength': 'Крепость',
        'rating.vis': 'Вид',
        'rating.str': 'Кр.',

        // Dex
        'dex.searchPlaceholder': 'Поиск снюса...',

        // Social
        'social.badges': 'Значки',
        'social.mostScanned7d': 'Чаще всего сканируют (7 дней)',
        'social.mostScannedToday': 'Чаще всего сканируют (Сегодня)',
        'social.topRated': 'Топ оценок (За всё время)',
        'social.switchMode': 'СМЕНИТЬ РЕЖИМ',
        'social.noData': 'Данных пока нет.',
        'social.rank': 'Место {n}',
        'social.topRatedCard': 'Лучший снюс 🏆',
        'social.mostPopularCard': 'Популярное сегодня 🔍',
        'social.ratingsLabel': 'Оценок',
        'social.scansLabel': 'Сканов',
        'social.scoreLabel': 'Счёт',
        'social.overallSuffix': '/ 10 Итого',
        'social.errorLoad': 'Не удалось загрузить статистику.',

        // Rarities
        'rarity.common': 'Обычный',
        'rarity.uncommon': 'Необычный',
        'rarity.rare': 'Редкий',
        'rarity.epic': 'Эпический',
        'rarity.mythic': 'Мифический',
        'rarity.legendary': 'Легендарный',

        // Units
        'unit.mg': 'мг',
        'unit.mgPerG': 'мг/г',

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
        'editProfile.saving': 'Сохранение...',
        'editProfile.saved': 'Сохранено',
        'editProfile.errorFormat': 'Только буквы, цифры и _ (2–30 символов).',
        'editProfile.errorLimitReached': 'Лимит (3/3). Ещё {days} дн. до сброса.',

        // Settings – Stats
        'stats.subtitle': 'Отслеживайте прогресс коллекции, отсортированной по брендам снюса.',
        'stats.collected': 'Собрано',

        // Settings – Tracking
        'tracking.title': 'Отслеживание пакетиков',
        'tracking.desc': 'Отслеживайте каждый отдельный пакетик, а не только всю банку в конце.',
        'tracking.modeIndividual': 'Поштучно',
        'tracking.modeFull': 'Полное отслеживание',

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
        'notifications.newSnusDrops': 'Новые снюсы (Dex)',
        'notifications.emailSummaries': 'Email-рассылка',

        // Not found modal
        // System Info
        'system.latestUpdate': 'Последнее обновление',
        'system.fetching': 'Загрузка...',
        'system.unavailable': 'Недоступно',
        'system.justNow': 'Только что',
        'system.minutesAgo': '{n} мин назад',
        'system.hoursAgo': '{n} ч назад',
        'system.daysAgo': '{n} день назад',
        'system.daysAgoPlural': '{n} дн. назад',

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
        'scanHelp.title': 'Справочный центр',
        'scanHelp.subtitle': 'Давайте поможем вам сканировать.',
        'scanHelp.quickFixes': 'Быстрые решения',
        'scanHelp.restartApp': 'Перезапустить приложение',
        'scanHelp.toggleFlashlight': 'Включить/выключить фонарик',
        'scanHelp.switchCamera': 'Сменить камеру',
        'scanHelp.catalogCheck': 'Есть ли это в нашем каталоге?',
        'scanHelp.searchPlaceholder': 'Поиск бренда или вкуса...',
        'scanHelp.typeToSearch': 'Введите текст для поиска в каталоге',
        'scanHelp.stillNeedHelp': 'Нужна ещё помощь?',
        'scanHelp.contactSupport': 'Связаться с поддержкой',
        'scanHelp.havingTrouble': 'Проблемы со сканированием?',
        'scanHelp.scanningDesc': 'Вы сканируете уже давно — давайте поможем вам.',
        'scanHelp.noThanks': 'Нет, спасибо',
        'scanHelp.getHelp': 'Получить помощь',
        'common.on': 'Вкл.',
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
    if (typeof window.refreshStatUnits === 'function') window.refreshStatUnits();
    if (typeof window.refreshLevelDisplay === 'function') window.refreshLevelDisplay();
    const subpage = document.getElementById('settings-subpage');
    if (subpage && !subpage.classList.contains('hidden') && window._currentSubpageType && typeof window.openSettingsSubpage === 'function') {
        window.openSettingsSubpage(window._currentSubpageType);
    }
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
