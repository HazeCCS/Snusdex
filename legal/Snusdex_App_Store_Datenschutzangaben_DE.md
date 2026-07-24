# App-Store-Datenschutzangaben — Apple App Privacy & Google Play Data Safety

**Arbeitsentwurf, Stand: 24. Juli 2026. Internes Mapping-Dokument. Vor Eintragung in App Store Connect/Play Console durch Anwalt/Compliance gegenprüfen.**

## 1. Warum dieses Dokument getrennt von der Datenschutzerklärung existiert

Apple und Google verlangen strukturierte, kategorisierte Selbstauskünfte über Datennutzung, die **zusätzlich** zur eigenen Datenschutzerklärung gepflegt werden müssen und bei Falschangabe zu App-Ablehnung oder -Entfernung führen können — unabhängig davon, ob die Verarbeitung DSGVO-konform ist. Diese Angaben sind rein vertragliche Plattformpflichten gegenüber Apple/Google, keine gesetzliche Anforderung, aber wirtschaftlich existenziell für den Vertrieb der App.

## 2. Zentrales Risiko: Apple App Store Review Guideline 5.1.2

Guideline 5.1.2 ("Data Use and Sharing") verbietet bzw. beschränkt erheblich den Verkauf von Nutzerdaten an Datenbroker oder Dritte zu deren eigenen Zwecken, auch mit Nutzereinwilligung. **Das betrifft Verkaufsmodell B (pseudonymisierte Einzeldaten) direkt.**

**Empfehlung vor Aktivierung von Modell B:**

1. Aktuellen Wortlaut der Guideline 5.1.2 zum Zeitpunkt des Launches erneut prüfen (Apple aktualisiert Guidelines regelmäßig, zuletzt bekannte hier zugrunde gelegte Fassung: Stand Juli 2026).
2. Klären, ob Modell B als "Analytics/Marktforschung durch geprüfte Partner mit strengen Zweckbindungen" formuliert werden kann, ohne unter das Broker-Verbot zu fallen — ggf. vorab Rückfrage/Review-Anfrage bei Apple.
3. Modell A (echte k-anonyme Aggregatstatistik, kein Personenbezug, Mindestgruppengröße 10 Nutzer je Datenpunkt) ist deutlich unkritischer, da es sich nach vollständiger Anonymisierung nicht mehr um "Nutzerdaten" im Sinne der Guideline handelt.
4. Im Zweifel: Modell B zunächst nicht aktivieren bzw. nur nach expliziter rechtlicher und App-Store-Policy-Prüfung.

Eine Verletzung dieser Guideline kann zur Ablehnung von App-Updates oder zur nachträglichen Entfernung der gesamten App führen — unabhängig vom DSGVO-Status der Verarbeitung.

## 3. Apple "App Privacy" — Mapping (Nutrition Label)

| Kategorie (Apple-Taxonomie) | Bei Snusdex zutreffend? | Verknüpft mit Identität? | Zum Tracking genutzt? | Hinweis |
| --- | --- | --- | --- | --- |
| Contact Info (E-Mail) | Ja | Ja | Nein | Für Konto/Login |
| User Content (Fotos/Avatar, Bewertungen/Reviews) | Ja | Ja | Nein | Profilbild, Reviews |
| Identifiers (User ID) | Ja | Ja | Nein | Konto-/Session-Verwaltung |
| Usage Data (Produktinteraktion, Scans, Konsum-Tracking, MouTrack) | Ja | Ja (innerhalb App) | Nein | MouTrack separat kennzeichnen, da sensibler als übrige Nutzungsdaten |
| Location (grobe Region aus IP-Adresse) | Ja (Coarse Location) | Ja, solange nicht k-anonym aggregiert | Nein (kein Drittanbieter-Werbe-Tracking im Sinne Apples) | Bei Verkaufsmodell A nach Anonymisierung kein Personenbezug mehr — für das Label zählt aber die Erhebung selbst |
| Health & Fitness | Konservativ als zutreffend einzustufen | — | — | MouTrack und die als "Gesundheits-Einblicke" beworbene Analysefunktion liegen inhaltlich nahe an "Health & Fitness"; eine zu enge Kategorisierung als reine "Usage Data" birgt das Risiko einer Ablehnung wegen Fehlkategorisierung |
| Purchases (Affiliate-Klicks) | Teilweise | Ja | Nein (kein Ad-Tracking-Framework im Einsatz laut aktuellem Code) | Klick-/Code-Zuordnung für Affiliate-Provisionen |
| Data Used to Track You | Nach aktuellem Code-Stand: Nein, sofern kein Drittanbieter-Werbenetzwerk/-SDK zur geräteübergreifenden Verfolgung eingesetzt wird | — | — | Bei Aktivierung von Verkaufsmodell B **erneut prüfen**, ob dies als "Tracking" im Apple-Sinne gilt |

**Wichtig zu Modell B**: Sollte pseudonymisierte Einzel-Nutzungsdaten-Weitergabe an Dritte umgesetzt werden, ist ernsthaft zu prüfen, ob dies Apples Definition von "Tracking" erfüllt (Verknüpfung von Nutzer-/Gerätedaten mit Daten Dritter zu deren Zwecken) — falls ja, wäre zusätzlich ein App Tracking Transparency (ATT)-Consent-Prompt erforderlich, zusätzlich zu und unabhängig von den in der App implementierten Consent-Flows für Datenverkauf und MouTrack.

## 4. Google Play Data Safety — Mapping (vorsorglich, falls eine Android-Version geplant wird)

Aktuell existiert nur eine iOS-Shell. Falls künftig eine Android-Version erscheint, gilt sinngemäß dieselbe Kategorisierung wie oben, zusätzlich:

- Google verlangt eine explizite Angabe, ob Daten "verkauft" werden (eigene Kategorie "Data sharing/selling").
- Modell B müsste dort wahrheitsgemäß als Datenweitergabe an Dritte gegen Vergütung deklariert werden.

## 5. Vor jedem Store-Submit zu prüfen

1. Stimmen die Store-Angaben mit dem tatsächlich implementierten Stand überein (insbesondere nach Aktivierung von Modell B)?
2. Ist MouTrack im Store-Label nicht als "nicht verkauft/geteilt" fälschlich mit den übrigen Nutzungsdaten vermischt?
3. Wurde die aktuelle Fassung von Apple Guideline 5.1.2 seit letztem Review erneut geprüft?
4. Wurde die Notwendigkeit eines ATT-Prompts bei Aktivierung von Modell B neu bewertet?
