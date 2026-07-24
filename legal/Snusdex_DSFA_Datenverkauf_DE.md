# Datenschutz-Folgenabschätzung (Art. 35 DSGVO) — Verkauf von Nutzungsdaten

**Arbeitsentwurf, Stand: 24. Juli 2026. Internes Dokument. Vor Abschluss durch Anwalt/Datenschutzbeauftragten prüfen und formell freigeben lassen.**

## 1. Warum eine DSFA hier wahrscheinlich Pflicht ist

Nach Art. 35 Abs. 1 DSGVO ist eine DSFA erforderlich, wenn eine Verarbeitung aufgrund ihrer Art, ihres Umfangs, ihrer Umstände und ihrer Zwecke voraussichtlich ein hohes Risiko für die Rechte und Freiheiten natürlicher Personen zur Folge hat. Mehrere Kriterien greifen hier gleichzeitig:

- **Systematische Weitergabe von Nutzungsdaten an Dritte zu deren eigenen Zwecken** (Datenhandel als Geschäftsmodell).
- **Neuartige Anwendung** kombiniert mit Verhaltensdaten rund um ein nikotinhaltiges Produkt.
- **Umfangreiche Verarbeitung** bei wachsender Nutzerbasis.
- **Möglicher Bezug zu besonderen Kategorien personenbezogener Daten**: Konsum- und Suchtmuster sowie die MouTrack-Funktion (Erfassung der Position der Pouch-Platzierung im Mund, verbunden in der App-eigenen Kommunikation mit "Gesundheits-Einblicken") liegen inhaltlich nahe an Gesundheitsdaten im Sinne von Art. 4 Nr. 15, Art. 9 DSGVO. Auch wenn MouTrack-Daten selbst nicht verkauft werden, ist diese Nähe bei der Risikobewertung des Gesamtsystems zu berücksichtigen, da bereits die Konsumhäufigkeit (Modell B) Rückschlüsse auf eine mögliche Nikotinabhängigkeit erlaubt.

## 2. Systembeschreibung

Gegenstand dieser DSFA sind die folgenden drei zusammenhängenden Verarbeitungstätigkeiten:

1. **IP-basierte Geolocation von Bewertungen** als Rohdatenbasis: Die IP-Adresse eines Nutzers wird bei Abgabe einer Bewertung an den Drittanbieter ip-api.com übermittelt, um Land, Region, Stadt und Zeitzone zu ermitteln; diese Felder werden der jeweiligen Bewertung in der Datenbank hinzugefügt.
2. **Aggregierte, k-anonyme Regionalstatistiken (Verkaufsmodell A)**: Aus den Bewertungsdaten werden Durchschnittswerte je Land/Region gebildet und verkauft, sofern mindestens 10 unterschiedliche Nutzer zu einem Datenpunkt beigetragen haben.
3. **Pseudonymisierte Einzel-Nutzungsdaten (Verkaufsmodell B)**: Individuelle Nutzungs- und Bewertungshistorien werden unter einer zufälligen Kennung an vertraglich gebundene Käufer verkauft, aber nur bei ausdrücklicher, widerruflicher Einwilligung des jeweiligen Nutzers.

MouTrack ist ausdrücklich **nicht** Gegenstand eines Verkaufsprozesses und wird hier nur als Kontextfaktor für die allgemeine Risikoeinschätzung des Produkts berücksichtigt.

## 3. Notwendigkeit und Verhältnismäßigkeit

Modell A dient einem legitimen Zweck (Marktforschung, Monetarisierung ohne Personenbezug) und ist bei korrekter technischer Umsetzung (Mindestgruppengröße von 10 Nutzern, kein Städte-Feld) das datenschutzfreundlichere, vorzugswürdige Modell, da es nach Abschluss der Anonymisierung nicht mehr in den Anwendungsbereich der DSGVO fällt.

Modell B ist nur verhältnismäßig, wenn (a) die Einwilligung tatsächlich freiwillig, granular, informiert und ausdrücklich eingeholt wird, (b) Käufer vertraglich zur Zweckbindung und zum Re-Identifikationsverbot verpflichtet werden, und (c) MouTrack-Daten strikt ausgeschlossen bleiben.

## 4. Risikobewertung

| Risiko | Wahrscheinlichkeit (vor Maßnahmen) | Schwere | Betroffene Verarbeitung |
| --- | --- | --- | --- |
| Re-Identifizierung einzelner Nutzer aus vermeintlich anonymen Regionaldaten (kleine Gruppen, seltene Produkte) | Mittel–Hoch | Hoch | Modell A, solange die Mindestgruppengröße von 10 nicht technisch erzwungen ist |
| Re-Identifizierung pseudonymisierter Einzeldaten durch Käufer (Kombination mit anderen Datenquellen) | Mittel | Hoch | Modell B |
| Rückschluss auf Konsum-/Suchtverhalten mit Diskriminierungspotenzial (z. B. gegenüber Versicherungen, Arbeitgebern) bei Re-Identifizierung | Mittel | Sehr hoch | Modell B, indirekt Modell A bei Fehlfunktion |
| Unverschlüsselte, vertraglich nicht abgesicherte Übertragung der IP-Adresse an ip-api.com (Verstoß gegen Art. 32 DSGVO) | Hoch (aktueller Ist-Zustand) | Mittel | Rohdatenbasis |
| Reputationsschaden/aufsichtsrechtliche Maßnahme bei fehlerhafter Kommunikation "anonym" vs. "pseudonym" gegenüber Nutzern | Mittel | Hoch | Alle |
| Ablehnung oder Entfernung der App durch Apple bei Verstoß gegen App-Store-Vorgaben zum Datenverkauf (App Store Review Guideline 5.1.2) | Mittel | Hoch (wirtschaftlich) | Modell B |

## 5. Maßnahmen zur Risikominderung

1. **Mindestgruppengröße von 10 Nutzern technisch erzwingen** (serverseitige Kontrolle, die Datenpunkte mit weniger als 10 unterschiedlichen beitragenden Nutzern vollständig unterdrückt statt sie reduziert anzuzeigen) — Blocker für den kommerziellen Start von Modell A.
2. **Städteebene nicht in Verkaufsdaten aufnehmen** — zu granular für verlässliche Mindestgruppengrößen in kleineren Städten; Verkaufsdaten enden auf Land-/Regionsebene.
3. **ip-api.com ersetzen oder vertraglich/technisch absichern** (verschlüsselte Übertragung, Auftragsverarbeitungsvertrag bzw. gleichwertiger Anbieter mit EU-Serverstandort) vor jeder kommerziellen Nutzung der darauf basierenden Daten.
4. **Getrennte, ausdrückliche Einwilligung** für Modell B, unabhängig von App-Nutzung und MouTrack.
5. **Vertragliche Zweckbindung und Re-Identifikationsverbot** in jedem Vertrag mit Datenkäufern, mit Prüf- und Kündigungsrechten bei Verstoß.
6. **MouTrack strikt ausschließen** aus jeder Verkaufs-Pipeline (organisatorisch: MouTrack-Tabelle nicht Teil des Export-Jobs für Modell A oder B).
7. **Regelmäßige Neubewertung** der Mindestgruppengröße bei wachsender oder schrumpfender Nutzerzahl je Region.
8. **Klare Nutzerkommunikation**, was "anonym" (Modell A) und was "pseudonym, mit Einwilligung" (Modell B) bedeutet — keine Vermischung in der Kommunikation.
9. **Entflechtung des bestehenden Onboarding-Schalters** "Pouch-Tracking", der aktuell reine Konsumzählung und ein als "Gesundheits-Einblicke" beworbenes Analyse-Feature in einem einzigen Schalter bündelt, in getrennte, dem Sensibilitätsgrad entsprechende Einwilligungen.

## 6. Restrisiko und Konsultationspflicht

Nach Umsetzung der Maßnahmen in Ziffer 5 wird das Restrisiko für Modell A als **gering** eingeschätzt, da nach vollständiger Anonymisierung kein Personenbezug mehr besteht (Erwägungsgrund 26 DSGVO). Für Modell B verbleibt ein **mittleres** Restrisiko, das durch informierte, ausdrückliche Einwilligung und vertragliche Absicherung als akzeptabel bewertet werden kann — diese Einschätzung muss von Anwalt/Datenschutzbeauftragtem bestätigt werden. Sollte das Restrisiko trotz Maßnahmen als hoch eingestuft werden, ist vor Verarbeitungsbeginn eine Konsultation der zuständigen Aufsichtsbehörde (Bayerisches Landesamt für Datenschutzaufsicht) nach Art. 36 DSGVO erforderlich.

## 7. Freigabe

| Rolle | Name | Datum | Ergebnis |
| --- | --- | --- | --- |
| Verantwortlicher | Norman Tarayan | [Platzhalter] | [Platzhalter] |
| Datenschutzbeauftragter | [Platzhalter — Bestellung derzeit in Prüfung] | [Platzhalter] | [Platzhalter] |
| Externe Rechtsberatung | [Platzhalter] | [Platzhalter] | [Platzhalter] |

**Modell A und B dürfen erst nach vollständiger Freigabe dieser Tabelle kommerziell live gehen.**
