# Fazit & To-Do für die Weiterarbeit

**Stand: 24. Juli 2026.** Diese Datei ist der Übergabepunkt für alle, die als Nächstes an der Rechts-/Datenverkauf-Seite von Snusdex weiterarbeiten — egal ob Entwickler, Anwalt oder der Betreiber selbst in ein paar Wochen. Keine Rechtsberatung.

## Fazit in drei Sätzen

Die Papierlage (14 Rechtsdokumente in `legal/` und `Public/legal/`) ist inhaltlich solide, in sich stimmig und deckt die relevanten Risiken ab — aber sie ist vollständig ungeprüftes Arbeitsmaterial ohne jede anwaltliche Freigabe. Vier nutzerseitige Dokumente (Datenschutzerklärung, AGB, Impressum, Cookie-Hinweis) sind bereits als echte Seiten in der App eingebaut. Das eigentliche Geschäftsmodell — Verkauf von Nutzungsdaten — existiert im Code aber noch nicht: mehrere Dinge, die die Dokumente voraussetzen (robuste Altersverifikation, getrennte Consent-Flows, durchgesetzte k-Anonymität), sind bisher nur beschrieben, nicht gebaut.

## Warum das wichtig ist

Wenn der Datenverkauf startet, bevor die Blocker unten behoben sind, drohen drei unabhängige Risiken gleichzeitig: DSGVO-Bußgelder (bis 20 Mio. € oder 4 % des weltweiten Jahresumsatzes), Entfernung der App aus dem Apple App Store (Guideline 5.1.2 verbietet Datenverkauf an Dritte weitgehend, unabhängig von DSGVO-Konformität), und Reputationsschaden speziell wegen der Kombination aus Nikotinprodukt-Bezug und Gamification, die junge Nutzer anspricht.

## Blocker vor jeglichem Live-Gang mit Datenverkauf (in dieser Reihenfolge abarbeiten)

1. **Anwalt beauftragen** (Datenschutz- und Wettbewerbsrecht) und den gesamten `legal/`-Ordner gegenlesen lassen, bevor irgendetwas veröffentlicht oder unterschrieben wird.
2. **Rechtsform und USt-ID klären** (Steuerberater) — betrifft Impressum und alle Verträge mit Datenkäufern.
3. **Pflicht zur Bestellung eines Datenschutzbeauftragten verbindlich klären**, siehe `Snusdex_DSB_Bestellungsdokument_DE.md`, und bei Bedarf bestellen.
4. **Technisch robuste Altersverifikation bauen.** Aktuell wird beim Onboarding nur ein Geburtsdatum abgefragt (`Public/js/onboarding.js`) — das reicht nach JuSchG/DSA nicht aus. Braucht ein echtes Verifikationsverfahren.
5. **Die drei Consent-Flows tatsächlich als UI bauen.** Aktuell gibt es nur den einen bestehenden „Pouch-Tracking"-Schalter im Onboarding, der reine Konsumzählung und ein als „Gesundheits-Einblicke" beworbenes Analyse-Feature bündelt. Die Texte dafür liegen fertig in `Snusdex_Einwilligungstexte_Consent_Flows_DE.md` — es fehlt die Umsetzung als getrennte, granulare Schalter (Nutzung / Datenverkauf / MouTrack) inklusive serverseitiger Protokollierung jeder Einwilligung.
6. **k-Anonymität technisch erzwingen**, siehe `Snusdex_k_Anonymitaet_Spezifikation_DE.md`: Mindestgruppengröße von 10 Nutzern in den Regionalstatistik-Abfragen einbauen, Städteangaben aus Verkaufsdaten ausschließen, l-Diversität bei Nikotinstärke/Biss prüfen, Freitext-Reviews nie in Verkaufsdaten aufnehmen.
7. **ip-api.com absichern oder ersetzen.** Aktuell wird die Nutzer-IP unverschlüsselt an diesen Drittanbieter gesendet, ohne dokumentierten Auftragsverarbeitungsvertrag (`supabase/functions/rating-geo-lookup/index.ts`).
8. **Datenschutz-Folgenabschätzung formal abschließen** (`Snusdex_DSFA_Datenverkauf_DE.md`) und von Anwalt/Datenschutzbeauftragtem freigeben lassen.
9. **Erst danach**: Export-Pipeline und Käufer-Schnittstelle für Verkaufsmodell A/B tatsächlich bauen — die gibt es bisher nicht, nur die Vertragsvorlage (`Snusdex_Data_License_Purchase_Agreement_DE.md`).
10. **Vor jeder App-Store-Einreichung** die aktuelle Fassung von Apple Guideline 5.1.2 und das App-Privacy-Label gegen `Snusdex_App_Store_Datenschutzangaben_DE.md` prüfen — Apple aktualisiert diese Regeln regelmäßig.

## Nice-to-have / kann warten

- Die drei zusätzlichen UI-Sprachen (en/nl/ru) für die neuen Rechts-Menüpunkte von Muttersprachlern gegenlesen lassen — aktuell von mir übersetzt, nicht fachlich geprüft.
- Backup-Retention-Zeitraum beim Hosting-Anbieter konkret dokumentieren (aktuell Platzhalter im Löschkonzept).
- Falls der Markdown-Renderer (`_ghMarkdown` in `Public/js/settings.js`) je nicht mehr ausschließlich statische, entwicklerkontrollierte Dateien rendert: DOMPurify oder vergleichbare Sanitisierung ergänzen.
- Prüfen, ob die exakte Aufbewahrungsfrist für Buchungsbelege/Handelsbriefe (§257 HGB, §147 AO) für die konkret gewählte Rechtsform noch passt.

## Wo man reinschaut

- `README_Rechtsdokumente_Status_DE.md` ist der Einstiegspunkt und listet alle Dokumente mit Ablageort.
- Jedes Dokument markiert offene Punkte explizit mit `[Platzhalter: ...]` — Volltextsuche danach zeigt alles, was noch entschieden werden muss.
- Noch nichts von alldem ist committet (`git status` zeigt alle Dateien als untracked) — vor dem Commit noch einmal bewusst durchgehen, was tatsächlich ins Repo soll.
