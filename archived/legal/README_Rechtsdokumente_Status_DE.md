# Snusdex — Rechtsdokumente: Übersicht & Status

**Wer neu hier reinkommt: `TODO_Naechste_Schritte_DE.md` zuerst lesen** — Fazit und priorisierte To-Do-Liste für die Weiterarbeit.

**Stand: 24. Juli 2026. Keine Rechtsberatung.** Alle Dokumente in diesem Ordner (und in `Public/legal/`, siehe unten) sind Arbeitsentwürfe für den kommerziellen Betrieb von Snusdex (App + snusdex.com), erstellt auf Basis des tatsächlichen Datenmodells (Supabase-Schema, Edge Functions), der in `.agents/project_state.md` festgelegten rechtlichen Leitplanken sowie einer bereits im Repository vorhandenen externen Rechtsanalyse (`legal/SDX_legal_analysis.txt`). Jedes Dokument ist inhaltlich eigenständig und für sich lesbar; es verweist nicht mehr auf andere Dateien, sondern enthält die jeweils relevanten Inhalte direkt. **Kein Dokument darf ohne Prüfung durch eine im Datenschutz- und Wettbewerbsrecht spezialisierte Kanzlei live geschaltet oder unterzeichnet werden.**

## Abgleich mit `SDX_legal_analysis.txt`

Diese bereits vorhandene Datei enthält eine externe Rechtsanalyse, die mit den hier erstellten Dokumenten abgeglichen wurde. Übernommene Punkte, die vorher fehlten: technisch robuste Altersverifikation nach der JuSchG-Reform 2021 und Art. 28 DSA (bloße Checkbox/Login genügt nicht), ein HWG-Hinweis zu MouTrack-/Konsum-Formulierungen, l-Diversität als Pflichtprüfung zusätzlich zur Mindestgruppengröße, Ausschluss von Freitext-Reviews aus jedem Verkaufsdatensatz, sowie die Option einer produktbezogenen Lizenzbeschränkung im Datenkaufvertrag. Eine Aussage der Analyse wurde als unzutreffend identifiziert und korrigiert: Es gibt unter der DSGVO **keine** allgemeine Pflicht, sich als Verantwortlicher bei der Aufsichtsbehörde zu "registrieren" — diese frühere BDSG-Meldepflicht wurde 2018 abgeschafft; die tatsächliche Pflicht besteht in der Führung eines auf Anfrage vorzulegenden Verarbeitungsverzeichnisses (siehe Bestellungsdokument Datenschutzbeauftragter, Ziffer 1a). Die übrigen Punkte der Analyse (u. a. zur Einordnung tabakfreier Nicotine Pouches außerhalb von TPD/TabakerzG) betreffen primär Produkt- und Werberecht und sind bei Bedarf gesondert mit einer Kanzlei zu vertiefen.

## Geschäftsmodell, das diesen Entwürfen zugrunde liegt

Zwei getrennte Verkaufsspuren für Nutzungsdaten:

1. **Aggregierte, k-anonyme Regionalstatistiken (Mindestgruppengröße 10 Nutzer).** Kein Personenbezug mehr nach Anonymisierung, daher grundsätzlich frei verkäuflich ohne Einzel-Einwilligung.
2. **Pseudonymisierte Einzel-Nutzungsdaten.** Bleiben personenbezogen, dürfen nur an vertraglich gebundene Käufer und nur mit separater, ausdrücklicher Opt-in-Einwilligung des Nutzers verkauft werden.

**MouTrack-Daten (Pouch-Position im Mund) werden in keinem Modell verkauft.**

## Dokumente

Die vier nutzerseitigen Dokumente liegen in `Public/legal/`, weil sie von der App/Website tatsächlich ausgeliefert werden müssen (nur Inhalte innerhalb von `Public/` sind über snusdex.com erreichbar). Sie sind zusätzlich als echte Seiten in der App hinterlegt, erreichbar über Einstellungen → Rechtliches. Alle internen/B2B-Dokumente bleiben in diesem Ordner (`legal/`), außerhalb des Web-Roots.

| Datei | Ort | Zweck | Nutzerseitig? |
| --- | --- | --- | --- |
| `Snusdex_Datenschutzerklaerung_DE.md` | `Public/legal/` | Art. 13/14 DSGVO Datenschutzerklärung | Ja |
| `Snusdex_AGB_Nutzungsbedingungen_DE.md` | `Public/legal/` | Nutzungsbedingungen | Ja |
| `Snusdex_Impressum_DE.md` | `Public/legal/` | Impressum nach §5 DDG | Ja |
| `Snusdex_Cookie_Tracking_Hinweis_DE.md` | `Public/legal/` | §25 TTDSG Speicherzugriffs-/Tracking-Hinweis | Ja |
| `Snusdex_Einwilligungstexte_Consent_Flows_DE.md` | `legal/` | UI-Textquelle für die 3 Consent-Flows (Nutzung, Datenverkauf, MouTrack) | Textquelle für UI, kein eigener Seitenaufruf |
| `Snusdex_Verarbeitungsverzeichnis_ROPA_DE.md` | `legal/` | Art. 30 DSGVO Verarbeitungsverzeichnis | Nein (intern) |
| `Snusdex_DSFA_Datenverkauf_DE.md` | `legal/` | Art. 35 DSGVO Folgenabschätzung für den Datenverkauf | Nein (intern) |
| `Snusdex_k_Anonymitaet_Spezifikation_DE.md` | `legal/` | Technische/rechtliche Spezifikation der Anonymisierung | Nein (intern) |
| `Snusdex_AVV_Auftragsverarbeitung_DE.md` | `legal/` | Art. 28 AVV-Vorlage für Dienstleister | Nein (B2B) |
| `Snusdex_Data_License_Purchase_Agreement_DE.md` | `legal/` | Vertragsvorlage mit Datenkäufern | Nein (B2B) |
| `Snusdex_Loeschkonzept_DE.md` | `legal/` | Aufbewahrungs-/Löschfristen je Datenkategorie | Nein (intern) |
| `Snusdex_Data_Breach_Response_Plan_DE.md` | `legal/` | Ablaufplan bei Datenschutzvorfällen (Art. 33/34) | Nein (intern) |
| `Snusdex_DSB_Bestellungsdokument_DE.md` | `legal/` | Bestellungsurkunde und Erforderlichkeitsprüfung Datenschutzbeauftragter | Nein (intern) |
| `Snusdex_App_Store_Datenschutzangaben_DE.md` | `legal/` | Apple App Privacy / Google Play Data Safety Mapping | Nein (Store-intern) |
| `SDX_legal_analysis.txt` | `legal/` | Bereits vorhandene externe Rechtsanalyse (Quelle, nicht von mir erstellt) | Nein (intern) |

## Kritische offene Punkte (vor Launch klären)

1. **Anwalt beauftragen** — dieser gesamte Ordner ist Rohmaterial, kein Freigabestatus.
2. **Drittanbieter für IP-Geolocation** — die serverseitige Standortbestimmung sendet die Nutzer-IP derzeit unverschlüsselt an einen externen Geolocation-Dienst, ohne dokumentierten Auftragsverarbeitungsvertrag. Muss vor jedem kommerziellen Datenverkauf behoben werden (siehe Datenschutz-Folgenabschätzung und Verarbeitungsverzeichnis).
3. **Mindestgruppengröße von 10 Nutzern ist in den bestehenden Regionalstatistik-Abfragen noch nicht technisch erzwungen.** Ohne diese Durchsetzung ist die "k-anonyme" Aggregatdaten-Spur rechtlich nicht das, was sie behauptet zu sein (siehe k-Anonymitäts-Spezifikation).
4. **Bestehender Onboarding-Schalter "Pouch-Tracking" bündelt zwei unterschiedlich sensible Dinge** (reine Konsumzählung und ein als "Gesundheits-Einblicke" beworbenes Analyse-Feature) in einem einzigen Opt-in. Sollte vor kommerziellem Start entflochten werden (siehe Einwilligungstexte und Datenschutz-Folgenabschätzung).
5. **Käuferliste & Zweck** — welche konkreten Käufer/Kategorien (Marktforschung, Werbenetzwerke, Hersteller) für das Einzeldaten-Modell vorgesehen sind, ist noch offen und in den Vertragsanlagen zu ergänzen.
6. **Apple-Risiko unabhängig von der DSGVO** — App Store Review Guideline 5.1.2 verbietet Datenverkauf an Broker/Dritte weitgehend; vor Aktivierung des Einzeldaten-Modells gesondert mit den aktuellen Apple-Richtlinien abgleichen (siehe App-Store-Datenschutzangaben).
7. **Pflicht zur Bestellung eines Datenschutzbeauftragten** — nach der hier dargelegten Einschätzung wahrscheinlich ja (§38 Abs. 1 Satz 2 BDSG), verbindlich aber nur durch Anwalt/Berater zu klären.
8. **Unternehmensform** — für kommerziellen Datenverkauf und Haftungsfragen sollte die Rechtsform (Einzelunternehmen/UG/GmbH) mit Steuerberater/Anwalt geklärt werden.
