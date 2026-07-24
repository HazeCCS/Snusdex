# Datenschutzerklärung — Snusdex

**Arbeitsentwurf, Stand: 24. Juli 2026. Vor Veröffentlichung durch eine im Datenschutzrecht spezialisierte Kanzlei prüfen lassen.**

## 1. Verantwortlicher

Norman Tarayan
Hauptstraße 12 1/2
84416 Taufkirchen (Vils)
E-Mail: tarayannorman@gmail.com

nachfolgend **"wir"** oder **"Snusdex"**. Diese Erklärung gilt für die Snusdex-App (iOS) und die Web-App unter snusdex.com.

Ein Datenschutzbeauftragter ist für Snusdex derzeit nicht bestellt; die Bestellpflicht wird aktuell geprüft, insbesondere weil Snusdex Nutzungsdaten geschäftsmäßig zum Zweck der Übermittlung an Dritte verarbeiten will (§38 Abs. 1 Satz 2 BDSG) und die geplante Verarbeitung voraussichtlich einer Datenschutz-Folgenabschätzung unterliegt. Bis zur Klärung ist Norman Tarayan (Kontakt oben) Ansprechpartner für alle Datenschutzanfragen. Sobald ein Datenschutzbeauftragter bestellt ist, werden dessen Kontaktdaten hier ergänzt.

## 2. Übersicht: Welche Daten wir verarbeiten

| Kategorie | Beispiele | Quelle |
| --- | --- | --- |
| Konto & Profil | E-Mail-Adresse, Passwort (gehasht, verwaltet über Supabase Auth), Benutzername, Geburtsdatum, Profilbild | Registrierung/Einstellungen |
| Sammlung & Bewertungen | gescannte Produkte, Bewertungen (Geschmack, Geruch, Biss, Drip, Optik, Stärke), schriftliche Reviews | App-Nutzung |
| Konsum-Tracking | täglich erfasste Pouch-Anzahl, Nutzungs-Streak, Aktivitäts-Heatmap | App-Nutzung (freiwillige Funktion, separat aktivierbar) |
| MouTrack | Position der Pouch-Platzierung im Mund pro Tag, Häufigkeit je Position | App-Nutzung (separat aktivierbare, sensiblere Funktion, siehe Ziffer 6) |
| Sozial | Follower-/Following-Beziehungen, Blockierungen, Freundschaftsanfragen | App-Nutzung |
| Standort (grob) | Land, Region, Stadt, Zeitzone — abgeleitet aus der IP-Adresse zum Zeitpunkt einer Bewertung | Automatisch bei Bewertungsabgabe |
| Geräte-/Push-Daten | Push-Benachrichtigungs-Token, Plattform (iOS) | App-Installation |
| Affiliate-/Klickdaten | Klicks auf Partner-Shop-Links, genutzte Rabattcodes | App-Nutzung |
| B2B-Zugang | interne Kennzeichnung als Geschäftskunde für ein separates B2B-Dashboard | Manuell durch uns gesetzt |

Wir verarbeiten **keine** Postadressen oder Zahlungsdaten unserer Endnutzer über die oben genannten Kontodaten hinaus.

## 3. Zwecke und Rechtsgrundlagen

| Zweck | Rechtsgrundlage |
| --- | --- |
| Bereitstellung der Kernfunktionen (Konto, Scannen, Sammlung, Bewertungen) | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| Konsum-Tracking, Streaks, Heatmap | Art. 6 Abs. 1 lit. b DSGVO, freiwillige Funktion |
| MouTrack | Art. 6 Abs. 1 lit. a DSGVO, vorsorglich zusätzlich behandelt wie Art. 9 Abs. 2 lit. a DSGVO — **ausdrückliche, separate Einwilligung erforderlich**, siehe Ziffer 6 |
| Regionale Aggregatstatistiken (k-anonym) | Art. 6 Abs. 1 lit. f DSGVO für die zugrunde liegende Erhebung/Aggregation; das aggregierte Endergebnis selbst ist nach vollständiger Anonymisierung keine personenbezogene Verarbeitung mehr, siehe Ziffer 7 |
| Verkauf pseudonymisierter Einzel-Nutzungsdaten an Dritte | Art. 6 Abs. 1 lit. a DSGVO — **ausdrückliche, separate Einwilligung erforderlich**, siehe Ziffer 7 |
| Betrugsprävention, Missbrauchserkennung, Sicherheit | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) |
| Altersverifikation | Art. 6 Abs. 1 lit. c DSGVO i. V. m. gesetzlichen Jugendschutzpflichten |
| Push-Benachrichtigungen | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung bei Aktivierung) |

Für die Verarbeitung der groben IP-Standortdaten (Ziffer 2, "Standort") stützen wir uns auf ein berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) an regionaler Marktanalyse. Weil diese Daten in Kombination mit Konsum- und Bewertungsverhalten zu einem sensiblen Produkt stehen, führen wir dazu eine dokumentierte Interessenabwägung; sollte diese ergeben, dass eine Einwilligung vorzugswürdig ist, stellen wir um.

## 4. Empfänger und Auftragsverarbeiter

| Empfänger | Rolle | Zweck | Status |
| --- | --- | --- | --- |
| Supabase (Datenbank, Auth, Storage, Edge Functions) | Auftragsverarbeiter (Art. 28 DSGVO) | Hosting sämtlicher App-Daten | Auftragsverarbeitungsvertrag erforderlich und vor Launch abzuschließen; Serverstandort und Subprozessoren von Supabase sind mit dem jeweils aktuellen Supabase-Vertrag abzugleichen |
| ip-api.com | Auftragsverarbeiter / Drittanbieter | Grobe Standortbestimmung anhand der IP-Adresse für Regionalstatistiken | **Ungeklärt.** Die Übertragung erfolgt derzeit technisch unverschlüsselt (`http://`), was einen Verstoß gegen die Pflicht zu angemessener Sicherheit der Verarbeitung (Art. 32 DSGVO) darstellt. Vor jedem kommerziellen Einsatz der daraus abgeleiteten Daten muss entweder eine verschlüsselte Verbindung samt vertraglicher Absicherung hergestellt oder der Dienst durch einen DSGVO-konformen Anbieter mit EU-Serverstandort ersetzt werden. Die IP-Adresse selbst ist nach ständiger Rechtsprechung des EuGH (Urteil vom 19. Oktober 2016, C-582/14 — Breyer) personenbezogenes Datum. |
| Apple (Push-Zustellung, App Store) | Eigenständig Verantwortlicher | Zustellung von Push-Benachrichtigungen | Unterliegt Apples eigenen Datenschutzbedingungen |
| Käufer aggregierter Regionalstatistiken | Empfänger nicht-personenbezogener Daten | Marktforschung/Analyse | Kein Personenbezug nach Anonymisierung (siehe Ziffer 7), daher kein Auftragsverarbeitungsvertrag nötig, aber ein Lizenzvertrag mit Zweckbindungsklauseln |
| Käufer pseudonymisierter Einzeldaten | Eigenständig Verantwortliche | Nur bei ausdrücklicher Einwilligung des jeweiligen Nutzers, siehe Ziffer 7 | Vertraglich zu Re-Identifikationsverbot, Weitergabeverbot und Löschung bei Widerruf verpflichtet; Prüfrechte für Snusdex |

## 5. Internationale Datenübermittlung

Soweit Supabase, ip-api.com oder andere Dienstleister bzw. Datenkäufer personenbezogene Daten außerhalb der EU/des EWR verarbeiten, erfolgt dies nur auf Grundlage von Standardvertragsklauseln der EU-Kommission (Art. 46 DSGVO), eines gültigen Angemessenheitsbeschlusses — für in die USA übermittelte Daten insbesondere auf Grundlage des EU-US Data Privacy Framework, sofern der jeweilige Empfänger dort zertifiziert ist (Angemessenheitsbeschluss der EU-Kommission vom 10. Juli 2023) — oder einer anderen zulässigen Übermittlungsgrundlage nach Art. 44 ff. DSGVO. Serverstandort und Übermittlungsgrundlage je Dienstleister sind vor Launch abschließend zu dokumentieren.

## 6. MouTrack — besonderer Hinweis

MouTrack erfasst, an welcher Position im Mund eine Pouch platziert wird, inklusive Häufigkeit je Position und Tag. Diese Daten lassen Rückschlüsse auf Konsumgewohnheiten und -intensität eines nikotinhaltigen Produkts zu und können damit mittelbar auf eine Nikotinabhängigkeit hindeuten, die als Gesundheitszustand gilt. Ob dies im Einzelfall als "Gesundheitsdatum" im Sinne von Art. 4 Nr. 15, Art. 9 DSGVO einzuordnen ist, ist rechtlich nicht abschließend geklärt. Aus Vorsichtsgründen behandeln wir MouTrack-Daten wie besondere Kategorien personenbezogener Daten:

- Aktivierung nur nach separater, **ausdrücklicher** Einwilligung (getrennt von der allgemeinen App-Nutzung und getrennt von der Einwilligung zum Datenverkauf).
- **MouTrack-Daten werden niemals verkauft, lizenziert oder zu deren eigenen Zwecken an Dritte weitergegeben** — unabhängig davon, ob der Nutzer der allgemeinen Datenverkauf-Einwilligung (Ziffer 7) zugestimmt hat.
- Nutzung ausschließlich zur Anzeige persönlicher Statistiken innerhalb der App.
- Löschung: MouTrack-Daten werden zusammen mit dem Konto gelöscht (über eine Datenbank-Kaskadenregel, die beim Löschen des Kontos automatisch mitgreift) sowie sofort bei Widerruf der MouTrack-Einwilligung in den Einstellungen.

## 7. Verkauf von Nutzungsdaten — zwei getrennte Modelle

**a) Aggregierte, k-anonyme Regionalstatistiken.** Wir erstellen aus Bewertungs- und Nutzungsdaten Statistiken auf Landkreis-/Regionsebene (z. B. "Durchschnittsbewertung Produkt X in Bayern"). Ein solcher Datenpunkt wird nur dann gebildet und weitergegeben, wenn mindestens **10 unterschiedliche Nutzer** zu ihm beigetragen haben (k-Anonymität mit k=10). Städteebene wird dabei nie einbezogen, da dort die Mindestgruppengröße zu leicht unterschritten werden kann; es werden ausschließlich Land- und Regionsebene sowie ggf. das bewertete Produkt selbst kombiniert. Solche Aggregate lassen keinen Rückschluss auf einzelne Personen zu und gelten daher gemäß Erwägungsgrund 26 der DSGVO nicht mehr als personenbezogene Daten. Für die zugrundeliegende Erhebung und Aggregation ist Art. 6 Abs. 1 lit. f DSGVO die Rechtsgrundlage; für den Verkauf des anonymen Ergebnisses selbst ist danach keine gesonderte Einwilligung mehr erforderlich, da die DSGVO auf anonyme Daten keine Anwendung findet.

Hinweis zum aktuellen technischen Umsetzungsstand: Die Mindestgruppengröße von 10 muss durch eine technische Kontrolle in der Datenbank (Mindestanzahl unterschiedlicher Nutzer je ausgegebenem Datenpunkt) sichergestellt sein, bevor Aggregatstatistiken kommerziell verkauft werden. Solange diese Kontrolle nicht nachweislich aktiv ist, sind auch vermeintlich aggregierte Regionaldaten wie personenbezogene, pseudonyme Daten im Sinne von Buchstabe b) zu behandeln.

**b) Pseudonymisierte Einzel-Nutzungsdaten.** Nur wenn ein Nutzer über einen separaten, granularen Consent-Schalter in den Einstellungen ausdrücklich zugestimmt hat, geben wir mit einer zufälligen, nicht auf den Klarnamen zurückführbaren Kennung versehene Nutzungsdaten (z. B. Scan-/Bewertungsverhalten, Produktvorlieben) an vertraglich gebundene Käufer weiter. Diese Daten bleiben personenbezogen im Sinne der DSGVO, da eine Re-Identifizierung durch Verknüpfung mit anderen Datenquellen nicht ausgeschlossen werden kann. Käufer werden vertraglich verpflichtet, keine Re-Identifizierung vorzunehmen, die Daten nicht an weitere Dritte weiterzugeben und sie bei Widerruf der Einwilligung oder Vertragsende zu löschen; Snusdex behält sich Prüfrechte vor. Diese Einwilligung ist jederzeit mit Wirkung für die Zukunft widerrufbar (Einstellungen → Datenschutz). Ein Widerruf führt nicht automatisch zur rückwirkenden Löschung bereits an Käufer übermittelter Daten, sondern verpflichtet den Käufer vertraglich zur Löschung.

**MouTrack-Daten sind von beiden Modellen ausgenommen (siehe Ziffer 6).**

## 8. Speicherdauer

Wir speichern personenbezogene Daten grundsätzlich, solange ein Konto besteht. Nach Kontolöschung, die jederzeit über die App-Einstellungen ausgelöst werden kann, werden Konto-, Sammlungs-, Bewertungs-, Konsum-, MouTrack-, Sozial- und Push-Daten unverzüglich gelöscht. Gelöschte Daten können für die Dauer der routinemäßigen Backup-Aufbewahrung unserer Infrastrukturanbieter technisch noch in Sicherungskopien enthalten sein, werden aber nicht mehr aktiv verarbeitet und nach Ablauf der Backup-Rotation ebenfalls entfernt. Bereits erzeugte, echt-anonyme Aggregatstatistiken (Ziffer 7 Buchstabe a) bleiben von einer Kontolöschung unberührt, da sie keine personenbezogenen Daten mehr enthalten.

## 9. Rechte der betroffenen Personen

Sie haben das Recht auf:

- **Auskunft** (Art. 15 DSGVO) über die zu Ihnen gespeicherten Daten,
- **Berichtigung** (Art. 16 DSGVO),
- **Löschung** (Art. 17 DSGVO) — in der App unter Einstellungen → Konto löschen jederzeit selbst auslösbar,
- **Einschränkung der Verarbeitung** (Art. 18 DSGVO),
- **Datenübertragbarkeit** (Art. 20 DSGVO) — vollständiger Datenexport als strukturierte JSON-Datei jederzeit über Einstellungen → Datenschutz & Sicherheit möglich,
- **Widerspruch** (Art. 21 DSGVO) gegen auf berechtigtem Interesse beruhende Verarbeitung, insbesondere gegen die IP-basierte Standortbestimmung,
- **Widerruf erteilter Einwilligungen** (Art. 7 Abs. 3 DSGVO) mit Wirkung für die Zukunft, insbesondere für MouTrack und den Datenverkauf, jederzeit über Einstellungen → Datenschutz.

Beschwerden können Sie bei einer Datenschutzaufsichtsbehörde einreichen. Zuständig für uns als nicht-öffentliche Stelle mit Sitz in Bayern ist das Bayerische Landesamt für Datenschutzaufsicht (BayLDA), Promenade 27, 91522 Ansbach. Sie können sich auch an die für Ihren Wohnort zuständige Aufsichtsbehörde wenden.

## 10. Keine automatisierte Entscheidungsfindung mit Rechtswirkung

Das Rarity-/XP-/Badge-System dient ausschließlich der spielerischen Darstellung innerhalb der App und entfaltet keine rechtliche oder ähnlich erhebliche Wirkung im Sinne von Art. 22 DSGVO.

## 11. Minderjährigenschutz

Snusdex verlangt vor Zugriff auf Inhalte eine technische Altersverifikation; ein Zugang ohne diese Prüfung ist nicht vorgesehen. Unabhängig davon gilt: Kinder unter 16 Jahren können nach deutschem Recht (Art. 8 Abs. 1 DSGVO, das die Altersgrenze für die wirksame eigene Einwilligung zu Diensten der Informationsgesellschaft nicht abgesenkt hat) keine wirksame eigene Einwilligung erteilen; für sie wäre die Zustimmung der personensorgeberechtigten Person erforderlich. *[Platzhalter: konkrete Mindestaltersgrenze für die App insgesamt final mit Anwalt festlegen und hier eintragen — angesichts des Produktbezugs zu Nicotine Pouches ist ein Mindestalter von 18 Jahren naheliegend, wodurch die Art.-8-Frage in der Praxis regelmäßig nicht mehr relevant wird.]*

## 12. Änderungen dieser Erklärung

Wir passen diese Erklärung an, wenn sich Verarbeitungstätigkeiten ändern, insbesondere bei Erweiterung der Datenverkauf-Modelle. Die jeweils aktuelle Fassung ist in der App unter Einstellungen sowie unter snusdex.com abrufbar.

*Letzte Aktualisierung: [Platzhalter: Veröffentlichungsdatum].*
