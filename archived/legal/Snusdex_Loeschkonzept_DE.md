# Löschkonzept — Snusdex

**Arbeitsentwurf, Stand: 24. Juli 2026. Internes Dokument. Vor Nutzung als Freigabegrundlage durch Anwalt prüfen.**

Dieses Konzept dokumentiert die tatsächliche Löschlogik der serverseitigen Kontolöschfunktion und ergänzt sie um Fristen für Daten, die außerhalb dieser Funktion liegen.

## 1. Sofortlöschung bei Kontolöschung (Ist-Zustand laut Code)

Bei bestätigter Löschanfrage löscht die serverseitige Löschfunktion folgende Tabellen/Storage-Objekte für die betroffene Nutzer-ID, **bevor** der Auth-Nutzer selbst gelöscht wird:

- Follower-/Following-Beziehungen (als Follower und als Followed)
- Blockierungen (als blockierende und als blockierte Person)
- Creator-Code-Einlösungen
- Creator Picks
- Tägliche Konsumdaten
- Produktvorschläge
- Push-Benachrichtigungs-Token
- Favoriten
- Affiliate-Klickdaten
- Nutzungsprotokolle
- Geburtsdatum-Eintrag
- Abzeichen/Badges
- Sammlung (gescannte Produkte, Bewertungen)
- Profil

Anschließend wird der Nutzer aus der Authentifizierungstabelle gelöscht sowie zugehörige Avatar-Dateien aus dem Datei-Storage entfernt.

## 2. Kaskadierende Löschung über Fremdschlüssel (kein separater Aufruf nötig)

Die MouTrack-Tabelle verweist mit einer Kaskadenregel auf die Authentifizierungstabelle. Beim finalen Löschen des Auth-Nutzers werden MouTrack-Datensätze automatisch mitgelöscht, auch ohne expliziten Eintrag in der Lösch-Funktion. *[Zu verifizieren: alle übrigen Tabellen mit Nutzerbezug sollten dieselbe Kaskadenregel oder eine explizite Löschung in der Löschfunktion haben — Stichprobenprüfung durch Backend empfohlen, insbesondere bei neu hinzugekommenen Tabellen.]*

## 3. Löschfristen außerhalb der Kontolöschung

| Datenkategorie | Frist | Begründung |
| --- | --- | --- |
| Konto- und Nutzungsdaten (siehe oben) | Sofort bei Kontolöschung | Zweckfortfall, Art. 17 DSGVO |
| Transiente IP-Adresse (Geo-Lookup) | Nicht dauerhaft gespeichert; nur abgeleitete Felder (Land, Region, Stadt, Zeitzone) verbleiben bei der zugehörigen Bewertung | Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO |
| Aggregierte, k-anonyme Regionalstatistiken (Modell A) | Unbegrenzt aufbewahrbar | Kein Personenbezug nach vollständiger Anonymisierung |
| Pseudonymisierte Einzeldaten bei Käufern (Modell B) | Löschung durch Käufer bei Widerruf der Nutzereinwilligung oder bei Vertragsende, vertraglich verpflichtend | Vertragliche Pflicht des Käufers, siehe Datenlizenz-/Datenkaufvertrag |
| Backups (Infrastruktur des Hosting-Anbieters) | *[Platzhalter: Backup-Retention mit dem Hosting-Vertrag abgleichen, i. d. R. rollierend über wenige Tage bis Wochen]* | Gelöschte Daten können in Backups für begrenzte Zeit fortbestehen — in der Datenschutzerklärung transparent zu machen |
| Buchungsbelege und Rechnungen (B2B-/Affiliate-Abrechnung) | 10 Jahre | §257 Abs. 1 Nr. 4, Abs. 4 HGB; §147 Abs. 1 Nr. 4, Abs. 3 AO |
| Sonstige Handelsbriefe (z. B. Vertragskorrespondenz mit Käufern/Partnern) | 6 Jahre | §257 Abs. 1 Nr. 2, Abs. 4 HGB; §147 Abs. 1 Nr. 3, Abs. 3 AO |

## 4. Offene Punkte

1. Verifikation, dass **alle** Tabellen mit Nutzerbezug entweder in der Löschfunktion explizit gelöscht werden oder eine Kaskadenregel haben (Stichprobe: Geburtsdatum-Tabelle, MouTrack-Tabelle, ggf. neu hinzugekommene Tabellen seit Erstellung dieses Dokuments).
2. Backup-Retention-Zeitraum beim Hosting-Anbieter mit dem Vertrag abgleichen und hier konkretisieren.
3. Klarstellung in der Datenschutzerklärung, dass gelöschte Daten für die Dauer der Backup-Retention technisch noch in Sicherungskopien vorhanden sein können, aber nicht mehr aktiv verarbeitet werden.
