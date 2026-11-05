export type Heading = { lead: string; em: string };

export const content = {
  meta: {
    title: "Snusdex App: Nicotine Pouches scannen, bewerten, sammeln",
    description:
      "Snusdex ist deine iPhone App für Nicotine Pouches. Dosen scannen, Produkte bewerten, deine Sammlung im Dex aufbauen und dich mit Freunden vergleichen. Kostenlos im App Store.",
  },
  nav: [
    { label: "Dex", href: "#dex" },
    { label: "Bewertungen", href: "#bewertungen" },
    { label: "App", href: "#app" },
    { label: "FAQ", href: "#faq" },
  ],
  hero: {
    lines: ["Check it.", "Review it.", "Collect it."] as const,
    text: "Dein persönlicher Begleiter für Nicotine Pouches.",
    download: "Im App Store laden",
    explore: "Funktionen ansehen",
    meta: ["Kostenlos", "iOS 18 oder neuer", "8 Sprachen", "14 Länder"],
  },
  dex: {
    eyebrow: "Dex",
    title: { lead: "Sammle sie", em: "alle." } satisfies Heading,
    text: "Jede Dose, die du scannst, bekommt ihren Platz im Dex. Neue Sorten schalten sich frei, unbekannte Felder bleiben als Fragezeichen stehen, bis du sie gefunden hast.",
    unknown: "?",
    tiles: [
      { key: "ice-watermelon", name: "Ice Watermelon", color: "#ff6b6b" },
      { key: "cactus-lemon", name: "Cactus Lemon", color: "#4ade80" },
      { key: "blue-raspberry", name: "Blue Raspberry", color: "#6b83ff" },
      null,
      { key: "banana-blast", name: "Banana Blast", color: "#fbbf24" },
      null,
      { key: "strawberry", name: "Strawberry", color: "#ff7eb0" },
      { key: "menthol", name: "Menthol", color: "#c9c3d1" },
      null,
      { key: "spearmint", name: "Spearmint", color: "#5eead4" },
      { key: "wild-berries", name: "Wild Berries", color: "#d946ef" },
      { key: "blueberry", name: "Blueberry", color: "#3b5bff" },
    ],
    rarityLabel: "Sieben Seltenheitsstufen",
    rarityAlt: "Sieben Dosen in den Farben der Seltenheitsstufen",
    rarities: [
      { name: "Common", color: "#c9c3d1", at: 9.8 },
      { name: "Uncommon", color: "#4ade80", at: 23.1 },
      { name: "Rare", color: "#6b83ff", at: 36.5 },
      { name: "Epic", color: "#d946ef", at: 50 },
      { name: "Exotic", color: "#ff5c8a", at: 63.3 },
      { name: "Legendary", color: "#fbbf24", at: 76.8 },
      { name: "Mythic", color: "#5eead4", at: 90.2 },
    ],
  },
  scan: {
    eyebrow: "Scanner",
    title: { lead: "Dose scannen,", em: "Sorte finden." } satisfies Heading,
    text: "Dose scannen und sofort im Snusdex finden.",
    imageAlt: "iPhone scannt eine Snusdex Dose",
  },
  reviews: {
    eyebrow: "Bewertungen",
    title: { lead: "Bewerte es", em: "sechsfach." } satisfies Heading,
    text: "Statt einer einzigen Zahl bewertest du jedes Produkt nach sechs Kriterien. So erinnerst du dich später genau, was dir gefallen hat und was nicht.",
    picksTitle: "Community Picks",
    picksText: "Sieh, was die Community am besten bewertet und was heute am häufigsten gescannt wird.",
    items: [
      { key: "look", name: "Look", tint: "#d6d6ea", alt: "Dose im Lichtkegel" },
      { key: "smell", name: "Smell", tint: "#3ddc84", alt: "Dose zwischen Minzblättern" },
      { key: "taste", name: "Taste", tint: "#ff5c6c", alt: "Dose zwischen Erdbeeren" },
      { key: "bite", name: "Bite", tint: "#6ec6ff", alt: "Dose zwischen Eiskristallen" },
      { key: "drip", name: "Drip", tint: "#4a6bff", alt: "Dose mit Wassertropfen" },
      { key: "power", name: "Power", tint: "#ff3fd0", alt: "Dose mit Blitz und Funken" },
    ],
  },
  app: {
    eyebrow: "In der App",
    items: [
      {
        key: "stats",
        image: "app-stats",
        alt: "Snusdex Statistik mit Level, Tagesserie und Sammlungsverlauf",
        eyebrow: "Statistik",
        title: { lead: "Deine Zahlen", em: "auf einen Blick." } satisfies Heading,
        text: "Level, XP, Serie und Fortschritt im Dex. Deine Collector ID zeigt, wie aktiv du sammelst, und lässt sich nach deinem Geschmack anpassen.",
        points: [
          { title: "Level und XP", text: "Mit jedem Scan und jeder Bewertung steigst du auf." },
          { title: "Tagesserie", text: "Bleib dran und sichere dir Bonus XP an Meilensteintagen." },
          { title: "Sammlungsverlauf", text: "Verfolge, wie dein Dex über die Wochen wächst." },
        ],
      },
      {
        key: "social",
        image: "app-friend",
        alt: "Snusdex Freundesprofil mit Vergleich der Sammlungen",
        eyebrow: "Freunde",
        title: { lead: "Vergleiche dich", em: "mit Freunden." } satisfies Heading,
        text: "Schick eine Anfrage, und sobald sie angenommen ist, seid ihr Freunde. Auf dem Profil siehst du Seltenheiten, Abzeichen und einen Vergleich mit deiner eigenen Sammlung.",
        points: [
          { title: "Gemeinsam und exklusiv", text: "Sieh, welche Dosen ihr beide habt und was nur einer von euch kennt." },
          { title: "Rangliste", text: "Miss dich mit anderen Sammlern und steige im Ranking auf." },
        ],
      },
      {
        key: "badges",
        image: "app-badges",
        alt: "Snusdex Abzeichen mit Collector Leveln",
        eyebrow: "Abzeichen",
        title: { lead: "Verdiene", em: "jedes Abzeichen." } satisfies Heading,
        text: "Vom ersten Sammler Level bis ganz nach oben. Mit jeder neuen Sorte kommst du dem nächsten Abzeichen näher.",
        points: [{ title: "6 von 11", text: "freigeschaltet" }],
      },
    ],
  },
  more: {
    eyebrow: "Und mehr",
    title: { lead: "Alles, was dein Dex", em: "braucht." } satisfies Heading,
    scanner: { title: "Scanner", text: "Dose scannen und sofort im Snusdex finden." },
    search: { title: "Suche", text: "Nach Produkt, Marke oder Geschmack suchen." },
    quick: {
      title: "Schnellzugriff",
      text: "Einen Pouch direkt zählen.",
      chips: ["Action Button", "Kontrollzentrum", "Sperrbildschirm"],
    },
    cans: { title: "Dosen im Blick", text: "Offene und leere Dosen verwalten und Verbrauch im Überblick behalten." },
    photos: { title: "Produktfotos", text: "Fehlende Produkte und Bilder vorschlagen und die Datenbank mitgestalten." },
    languages: {
      title: "Acht Sprachen",
      chips: ["Deutsch", "English", "Español", "Français", "Italiano", "Nederlands", "Polski", "Русский"],
    },
  },
  faq: {
    eyebrow: "FAQ",
    title: { lead: "Häufige", em: "Fragen." } satisfies Heading,
    items: [
      {
        question: "Was ist Snusdex?",
        answer:
          "Snusdex ist eine iPhone App für Nicotine Pouches. Du scannst Dosen, bewertest Produkte, baust deine Sammlung im Dex auf und vergleichst dich mit Freunden.",
      },
      {
        question: "Ist Snusdex kostenlos?",
        answer: "Ja, du kannst Snusdex kostenlos im App Store laden und sofort mit deiner Sammlung starten.",
      },
      {
        question: "Für welche Geräte gibt es Snusdex?",
        answer: "Snusdex läuft auf dem iPhone mit iOS 18 oder neuer. Eine Version für Android ist für später in diesem Jahr geplant.",
      },
      {
        question: "Wie bewerte ich Nicotine Pouches in der App?",
        answer:
          "Jedes Produkt bewertest du nach sechs Kriterien: Look, Smell, Taste, Bite, Drip und Power. So erinnerst du dich später genau, was dir gefallen hat.",
      },
      {
        question: "Wie funktioniert der Dex?",
        answer:
          "Jede gescannte Dose bekommt ihren Platz im Dex. Neue Sorten schalten sich frei und sind in sieben Seltenheitsstufen von Common bis Mythic eingeteilt.",
      },
      {
        question: "Kann ich über Snusdex Nicotine Pouches kaufen?",
        answer:
          "Snusdex ist selbst kein Onlineshop. Über die App gelangst du aber direkt zu unseren Partnershops und kannst dort Nicotine Pouches bestellen.",
      },
      {
        question: "In welchen Ländern ist Snusdex verfügbar?",
        answer:
          "Snusdex ist in Deutschland, Österreich, der Schweiz, Dänemark, Schweden, Polen, Tschechien, Italien, Kroatien, Montenegro, Griechenland, Irland, im Vereinigten Königreich und in den USA verfügbar. Die Verfügbarkeit kann sich ändern.",
      },
      {
        question: "Ab welchem Alter darf ich Snusdex nutzen?",
        answer:
          "Snusdex richtet sich ausschließlich an Erwachsene ab 18 Jahren. Nikotin macht abhängig, und die App ersetzt keine medizinische oder gesundheitliche Beratung.",
      },
    ],
  },
  partner: {
    title: { lead: "Du bist Marke oder", em: "Händler?" } satisfies Heading,
    text: "Wenn du mit uns zusammenarbeiten oder mehr über die Erkenntnisse aus der Community erfahren möchtest, sprich uns an.",
    cta: "Kooperation anfragen",
  },
  end: {
    title: { lead: "Your Dex", em: "at your hands." } satisfies Heading,
    text: "Lade Snusdex kostenlos im App Store und starte deine Sammlung mit der ersten Dose.",
    appStore: "App Store",
    googlePlay: "Google Play",
    later: "Später in diesem Jahr",
    imageAlt: "Viele bunte Snusdex Dosen, gestapelt und aufgereiht",
  },
  footer: {
    privacy: "Datenschutz",
    imprint: "Impressum",
    contact: "Kontakt",
    legal: "Eine App der SDX Solutions UG (haftungsbeschränkt)",
    health: "Nikotin macht abhängig. Nur für Erwachsene ab 18.",
  },
};
