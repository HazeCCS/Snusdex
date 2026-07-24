# Data Breach Response Plan (Art. 33/34 DSGVO) — Snusdex

**Arbeitsentwurf, Stand: 24. Juli 2026. Internes Dokument. Vor Inkraftsetzung durch Anwalt/Datenschutzbeauftragten prüfen.**

## 1. Was als meldepflichtiger Vorfall gilt

Jede Verletzung des Schutzes personenbezogener Daten (Art. 4 Nr. 12 DSGVO): unbefugter Zugriff, Verlust, Veränderung oder Offenlegung von Konto-, Sammlungs-, Bewertungs-, Konsum-, MouTrack-, Sozial-, Push- oder Affiliate-Daten — inklusive Vorfällen bei Auftragsverarbeitern (z. B. dem Hosting-Anbieter oder dem Geolocation-Drittanbieter) oder bei Datenkäufern (Vertragsverstoß gegen den Datenlizenz-/Datenkaufvertrag, z. B. Re-Identifikation oder unerlaubte Weitergabe).

## 2. Sofortmaßnahmen (0–24 Stunden nach Kenntniserlangung)

1. Vorfall intern dokumentieren: Zeitpunkt der Entdeckung, betroffene Systeme/Tabellen, vermutete Ursache, geschätzte Anzahl betroffener Nutzer.
2. Zugriff eindämmen (z. B. betroffene API-Schlüssel rotieren, Zugriffsregeln prüfen, betroffenen Auftragsverarbeiter kontaktieren).
3. Verantwortlichen (Norman Tarayan) und, falls bestellt, den Datenschutzbeauftragten informieren.
4. Ersteinschätzung: Handelt es sich um ein Risiko für die Rechte und Freiheiten der betroffenen Personen? (Kriterium für Meldepflicht nach Art. 33 DSGVO.)

## 3. Meldung an die Aufsichtsbehörde (Art. 33 DSGVO)

- **Frist**: unverzüglich, möglichst binnen **72 Stunden** nach Kenntniserlangung, es sei denn, die Verletzung führt voraussichtlich nicht zu einem Risiko für die Rechte und Freiheiten natürlicher Personen.
- **Zuständige Behörde**: Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 27, 91522 Ansbach, als zuständige Aufsichtsbehörde für nicht-öffentliche Stellen mit Sitz in Bayern.
- **Mindestinhalt der Meldung**: Art der Verletzung, Kategorien und ungefähre Zahl betroffener Personen/Datensätze, Name/Kontakt des Ansprechpartners, wahrscheinliche Folgen, ergriffene/vorgeschlagene Abhilfemaßnahmen.
- Ist eine vollständige Meldung binnen 72 Stunden nicht möglich, erfolgt eine gestufte Meldung mit Nachreichung.

## 4. Benachrichtigung der betroffenen Nutzer (Art. 34 DSGVO)

- **Auslöser**: voraussichtlich **hohes** Risiko für die Rechte und Freiheiten der betroffenen Personen.
- **Form**: In-App-Benachrichtigung und/oder E-Mail, klar und in einfacher Sprache, mit Beschreibung des Vorfalls, wahrscheinlichen Folgen und empfohlenen Maßnahmen.
- **Besonderheit bei Snusdex**: Bei Vorfällen, die Konsum- oder MouTrack-Daten oder pseudonymisierte Verkaufsdaten (Modell B) betreffen, ist die Schwelle für "hohes Risiko" wegen des sensiblen, konsumnahen Charakters dieser Daten eher niedriger anzusetzen als bei rein technischen Metadaten.

## 5. Besonderer Fall: Vertragsverstoß eines Datenkäufers

1. Sobald Snusdex Kenntnis von einem Verstoß gegen den Datenlizenz-/Datenkaufvertrag (z. B. Re-Identifikationsversuch, unerlaubte Weitergabe) erlangt, ist dies wie ein eigener Sicherheitsvorfall zu behandeln.
2. Sofortige Kontaktaufnahme mit dem Käufer, Aufforderung zur Löschung/Unterlassung, Prüfung außerordentlicher Kündigung nach den Kündigungsregeln des Vertrags.
3. Parallel Prüfung, ob eine Meldepflicht nach Art. 33/34 DSGVO gegenüber Aufsichtsbehörde/Nutzern ausgelöst wird — bei Modell-A-Daten (echt anonym) besteht keine Meldepflicht, da kein Personenbezug; bei Modell-B-Daten ist die Meldepflicht wie bei jedem anderen Vorfall zu prüfen.

## 6. Dokumentationspflicht

Jeder Vorfall — unabhängig davon, ob er meldepflichtig war — wird in einem internen Vorfallsregister dokumentiert (Art. 33 Abs. 5 DSGVO): Sachverhalt, Auswirkungen, ergriffene Abhilfemaßnahmen, Entscheidung zur (Nicht-)Meldung mit Begründung.

## 7. Ansprechpartner

| Rolle | Name/Kontakt |
| --- | --- |
| Verantwortlicher | Norman Tarayan, tarayannorman@gmail.com |
| Datenschutzbeauftragter | [Platzhalter — Bestellung derzeit in Prüfung] |
| Technischer Ansprechpartner (Hosting/Backend) | [Platzhalter] |
| Externe Rechtsberatung | [Platzhalter] |

## 8. Testlauf

Dieser Plan sollte vor dem ersten kommerziellen Datenverkauf mindestens einmal simuliert (Tabletop-Übung) werden, insbesondere für den Fall "Datenkäufer-Vertragsverstoß" aus Ziffer 5, da dieser Fall spezifisch für das Snusdex-Geschäftsmodell ist und nicht durch generische Vorlagen abgedeckt wird.
