# Einwilligungstexte — Die 3 Consent-Flows

**Arbeitsentwurf, Stand: 24. Juli 2026. Vor Umsetzung durch Anwalt/UX gemeinsam prüfen.** Dieses Dokument enthält Text-/Copy-Vorlagen für drei getrennte Consent-Flows: (A) allgemeine App-Nutzung, (B) Verkauf von Nutzungsdaten, (C) MouTrack.

## Grundprinzipien (für alle drei Flows verbindlich)

- **Kopplungsverbot beachten** (folgt aus Art. 7 Abs. 4 DSGVO): Flow B (Datenverkauf) und Flow C (MouTrack) dürfen niemals Voraussetzung für die Kernnutzung der App sein. Nur Flow A ist an die Kontoerstellung gekoppelt.
- **Kein Pre-Ticking**: Checkboxen für B und C starten immer deaktiviert (Opt-in, kein Opt-out) — eine vorangehakte Checkbox ist nach der Rechtsprechung des EuGH (Urteil vom 1. Oktober 2019, C-673/17 — Planet49) keine wirksame Einwilligung.
- **Granularität**: B und C sind unabhängig voneinander wähl- und widerrufbar.
- **Ausdrücklichkeit bei B und C**: Da Flow B personenbezogene, re-identifizierbare Daten an Dritte weitergibt und Flow C konsumnahe, potenziell gesundheitsnahe Daten betrifft, wird für beide eine **ausdrückliche** Bestätigung verlangt (aktive Checkbox plus klarer, unmissverständlicher Erklärtext) und nicht nur eine implizite Zustimmung durch Weiternutzung.
- **Widerruf**: Jederzeit unter Einstellungen → Datenschutz & Sicherheit, mit sofortiger Wirkung für die Zukunft.
- **Protokollierung**: Zeitpunkt, Version des Einwilligungstexts und Nutzer-ID jeder erteilten/widerrufenen Einwilligung müssen serverseitig protokolliert werden, um die Nachweispflicht aus Art. 7 Abs. 1 DSGVO zu erfüllen.

## Wichtiger Hinweis zum aktuellen Stand der App (Ist-Zustand-Abgleich)

Der bestehende Onboarding-Schritt "Pouch-Tracking" (`Public/js/onboarding.js`) bündelt aktuell **einen** Schalter für zwei inhaltlich unterschiedliche Dinge: die tägliche Konsumzählung (unkritisch, Art. 6 Abs. 1 lit. b DSGVO) und ein als "Gesundheits-Einblicke" beworbenes Analyse-Feature. Diese Bündelung entspricht **nicht** dem unten beschriebenen Drei-Flow-Modell und sollte vor kommerziellem Start technisch entflochten werden: Die reine Konsumzählung darf weiterhin als einfacher Funktions-Opt-in laufen (Flow A-nah), aber jede Funktion, die gesundheitsnahe Auswertungen aus dem Konsumverhalten erzeugt oder anzeigt, braucht eine eigene, ausdrückliche Einwilligung nach dem Muster von Flow C. Dies ist eine Beobachtung aus dem bestehenden Code, keine bereits umgesetzte Änderung.

---

## Flow A — App-Nutzung (Pflicht zur Kontoerstellung)

Kein "Einwilligungs"-Häkchen im engeren Sinne, sondern Kenntnisnahme im Rahmen des Vertragsschlusses (Art. 6 Abs. 1 lit. b DSGVO).

**UI-Text (Registrierung):**

> Mit der Erstellung deines Kontos akzeptierst du unsere Nutzungsbedingungen und bestätigst, dass du die Datenschutzerklärung gelesen hast.
>
> ☐ Ich habe die Nutzungsbedingungen und die Datenschutzerklärung gelesen und akzeptiere sie. *(Pflichtfeld, muss aktiv angehakt werden — kein Vorauswahl-Häkchen)*

---

## Flow B — Verkauf von Nutzungsdaten (freiwillig, granular)

Wird **nicht** während der Registrierung angezeigt, sondern als separater, klar erklärter Schritt in den Einstellungen — nie im selben Bildschirm wie Flow A.

**UI-Text (Einstellungen → Datenschutz & Sicherheit → Datenverkauf):**

> ### Nutzungsdaten teilen
>
> Snusdex kann anonymisierte und pseudonymisierte Nutzungsdaten (z. B. welche Produkte du scannst und bewertest) an Marktforschungs- und Analysepartner lizenzieren. Das hilft uns, die App kostenlos bzw. günstiger anzubieten.
>
> **Was passiert automatisch, unabhängig von deiner Wahl hier:** Wir erstellen aus Bewertungen aggregierte Regionalstatistiken (z. B. "Durchschnittsbewertung in Bayern"), die erst ab mindestens 10 beitragenden Nutzern gebildet werden und dich nicht identifizierbar machen. Dafür ist keine gesonderte Zustimmung nötig, da diese Statistiken nach vollständiger Anonymisierung keine Rückschlüsse mehr auf dich zulassen.
>
> **Was NUR mit deiner ausdrücklichen Zustimmung passiert:** Mit dem Schalter unten erlaubst du zusätzlich, dass dein individuelles Nutzungsverhalten unter einer zufälligen, nicht auf deinen Namen zurückführbaren Kennung an vertraglich gebundene Partner weitergegeben wird. Diese Partner müssen vertraglich ausschließen, dich zu re-identifizieren oder die Daten an weitere Dritte weiterzugeben.
>
> **MouTrack-Daten sind hiervon immer ausgeschlossen** — unabhängig von dieser Einstellung.
>
> ☐ Ja, ich erlaube ausdrücklich die Weitergabe meiner pseudonymisierten Einzel-Nutzungsdaten an geprüfte Partner. *(deaktiviert per Default)*
>
> Du kannst diese Einstellung jederzeit hier wieder ausschalten. Bereits weitergegebene Daten werden dadurch bei uns nicht automatisch rückwirkend gelöscht — Partner sind aber vertraglich verpflichtet, deine Daten nach deinem Widerruf zu löschen, und wir fordern sie dazu unverzüglich auf.

---

## Flow C — MouTrack (freiwillig, vor Aktivierung der Funktion)

Wird ausschließlich beim ersten Versuch angezeigt, die MouTrack-Funktion zu aktivieren — unabhängig von Flow A und B.

**UI-Text (vor Aktivierung von MouTrack):**

> ### MouTrack aktivieren
>
> MouTrack merkt sich, an welcher Position im Mund du eine Pouch platzierst, damit du eigene Muster über Zeit sehen kannst.
>
> Diese Daten sind sensibler als andere App-Daten, weil sie Rückschlüsse auf deine Konsumgewohnheiten und -intensität zulassen können. Deshalb:
>
> - Nutzen wir MouTrack-Daten **ausschließlich**, um dir deine eigene Statistik anzuzeigen.
> - **Verkaufen oder lizenzieren wir MouTrack-Daten niemals** an Dritte — auch nicht, wenn du der Datenverkauf-Einstellung (siehe oben) zugestimmt hast.
> - Kannst du MouTrack jederzeit deaktivieren; deine bisherigen MouTrack-Daten werden dann gelöscht.
>
> ☐ Ich möchte MouTrack aktivieren und stimme der oben beschriebenen Verarbeitung ausdrücklich zu. *(deaktiviert per Default, Pflicht vor Erstnutzung der Funktion)*

---

## Technische Nachweis-Anforderungen (fachliche Anforderung an Backend, kein Code in diesem Dokument)

Für jede Einwilligung/jeden Widerruf sollte mindestens protokolliert werden: `user_id`, `consent_type` (`terms` | `data_sale` | `moutrack`), `granted` (bool), `text_version`, `timestamp`, `ip_country` (grob, zu Nachweiszwecken). Diese Protokollierung dient dem Nachweis nach Art. 7 Abs. 1 DSGVO und muss so lange aufbewahrt werden, wie die jeweilige Verarbeitung stattfindet, sowie danach für die Dauer möglicher Beweisführungsfristen.
