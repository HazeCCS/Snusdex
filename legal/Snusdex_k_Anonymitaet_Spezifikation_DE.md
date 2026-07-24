# k-Anonymitäts-Spezifikation — Regionale Aggregatstatistiken

**Arbeitsentwurf, Stand: 24. Juli 2026. Internes technisches/rechtliches Dokument. Vor Nutzung als Freigabegrundlage durch Anwalt/Datenschutzbeauftragten prüfen.**

Dieses Dokument definiert die Bedingungen, unter denen aggregierte Regionalstatistiken aus den Bewertungsdaten als **nicht mehr personenbezogen** im Sinne von Erwägungsgrund 26 der DSGVO gelten und damit außerhalb des Anwendungsbereichs der DSGVO frei lizenziert/verkauft werden dürfen (Verkaufsmodell A). k-Anonymität ist eine von der Art-29-Datenschutzgruppe (Stellungnahme 05/2014 zu Anonymisierungstechniken, WP216, angenommen am 10. April 2014) anerkannte Anonymisierungstechnik, die jedoch nur zusammen mit ergänzenden Maßnahmen gegen Rückschlussrisiken wirksam ist — daher die zusätzlichen Regeln unten. **Kein Code wird durch dieses Dokument geändert** — die Umsetzung der hier beschriebenen Regeln ist Aufgabe des Backends.

## 1. Definition

k-Anonymität mit **k = 10**: Ein aggregierter Datenpunkt (z. B. "Durchschnittsbewertung Produkt X in Region Y") darf nur veröffentlicht/verkauft werden, wenn mindestens **10 unterschiedliche Nutzer** zu diesem Aggregat beigetragen haben.

## 2. Aktueller Ist-Zustand (Gap)

Die bestehenden Datenbankabfragen für Regionalstatistiken gruppieren aktuell nach Land, Land-Code und Region beziehungsweise zusätzlich nach Produkt, liefern aber **keine Mindestgruppengröße**. Das bedeutet: Aktuell könnte eine Region mit nur 1–2 Bewertungen ausgegeben werden, was De-facto-Personenbezug herstellt (insbesondere in Kombination mit dem konkreten Produkt). **Dies ist der zentrale Blocker, bevor Verkaufsmodell A kommerziell live gehen darf.**

## 3. Anforderungen an die technische Umsetzung (Vorgabe an Backend)

1. Jede zum Verkauf bestimmte Aggregat-Abfrage **muss** eine Mindestgruppengröße von 10 unterschiedlichen Nutzern pro ausgegebener Zeile durchsetzen.
2. Gruppen, die die Schwelle nicht erreichen, werden **nicht** in reduzierter Form ausgegeben, sondern vollständig unterdrückt (kein "k=3, aber wir zeigen es trotzdem klein an").
3. **Städteangaben werden nicht in Verkaufsdaten aufgenommen** — auf Stadtebene ist k=10 bei kleineren/mittleren Städten zu häufig nicht erreichbar bzw. zu leicht durch Kombinationswissen auszuhebeln (z. B. "ich kenne die einzige Person aus Ort X, die Produkt Y bewertet hat"). Verkaufsdaten enden auf Land-/Regionsebene.
4. **l-Diversität als zusätzliche Pflichtprüfung** (nicht nur optional): k-Anonymität allein schützt nicht davor, dass eine ansonsten ausreichend große Gruppe bei einer sensiblen Kennzahl "eintönig" ist — bewerten z. B. alle 10 beitragenden Nutzer einer Region ein Produkt bei Nikotinstärke oder Biss nahezu identisch, lässt sich dieser Wert einer Einzelperson zurechnen, sobald ein Käufer aus anderer Quelle weiß, dass eine bestimmte Person zur Gruppe gehört (Homogenitätsangriff). Für die sensiblen Bewertungsdimensionen (insbesondere Nikotinstärke und Biss) muss daher zusätzlich zur Mindestgruppengröße von 10 eine Mindest-Diversität der Werte innerhalb der Gruppe vorliegen, bevor der Datenpunkt freigegeben wird.
5. **Keine Freitexte in Verkaufsdaten**: Geschriebene Reviews/Freitext-Bewertungen werden nie im Rohtext in ein Verkaufsprodukt (Modell A oder B) übernommen, da Freitext hochgradig re-identifizierend sein kann (individueller Schreibstil, spezifische Details). Falls Freitext-Inhalte künftig in aggregierter Form ausgewertet werden sollen, ist vorher eine Zusammenfassung auf Gruppenebene zu erzeugen, aus der kein einzelner Beitrag mehr rekonstruierbar ist; roher Nutzertext darf dabei zu keinem Zeitpunkt das interne System verlassen.
6. **Keine Kreuztabellierung**, die Gruppen rekonstruierbar unter k=10 drückt (z. B. Region × Produkt × Altersgruppe gleichzeitig, wenn die Kombination einzelne Zeilen auf weniger als 10 Nutzer reduziert).
7. **Periodische Neubewertung**: Die Schwelle k=10 ist ein Ausgangswert für die aktuelle, kleine Nutzerbasis. Bei signifikantem Nutzerwachstum sollte sie regelmäßig, mindestens jährlich, neu bewertet werden — mehr Nutzer erlauben ggf. granularere, aber weiterhin sichere Aggregation.

## 4. Was NICHT unter Modell A fällt

- Rohdaten mit einzelnen Nutzerzuordnungen.
- Aggregate unterhalb der k=10-Schwelle oder ohne ausreichende l-Diversität bei sensiblen Bewertungsdimensionen.
- Rohtext aus geschriebenen Reviews.
- Städteangaben in jeglicher Form.
- MouTrack-Daten in jeglicher aggregierter oder roher Form — absolutes Verkaufsverbot, unabhängig vom Anonymisierungsgrad, da diese Daten Rückschlüsse auf Konsumintensität und -muster eines nikotinhaltigen Produkts erlauben.

## 5. Prüfprotokoll vor jedem Export/Verkauf

| Prüfschritt | Verantwortlich | Status |
| --- | --- | --- |
| Mindestgruppengröße von 10 in allen Verkaufs-Abfragen technisch erzwungen | Backend | [Platzhalter] |
| l-Diversität bei sensiblen Bewertungsdimensionen (Nikotinstärke, Biss) technisch geprüft | Backend | [Platzhalter] |
| Städteangaben nicht im Export enthalten | Backend | [Platzhalter] |
| Keine MouTrack-Tabellen im Export-Join | Backend | [Platzhalter] |
| Kein Freitext aus Reviews im Export enthalten | Backend | [Platzhalter] |
| Stichprobenprüfung: kleinste ausgegebene Gruppengröße tatsächlich ≥10 | Qualitätssicherung/Compliance | [Platzhalter] |
| Freigabe durch Datenschutzbeauftragten/Anwalt vor Erstverkauf | Compliance | [Platzhalter] |

Erst wenn alle Zeilen dieser Tabelle mit "erledigt" markiert sind, darf Verkaufsmodell A als produktiv gelten.
