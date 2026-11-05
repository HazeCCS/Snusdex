# Cookie- und Tracking-Hinweis (§25 TTDSG) — Snusdex

**Arbeitsentwurf, Stand: 24. Juli 2026. Vor Veröffentlichung durch Anwalt prüfen.**

## 1. Warum dieses Dokument

§25 des Telekommunikation-Telemedien-Datenschutz-Gesetzes (TTDSG) verlangt eine Einwilligung für jeden Zugriff auf oder jede Speicherung von Informationen auf dem Endgerät des Nutzers — nicht nur für klassische Browser-Cookies, sondern auch für `localStorage` in der WKWebView-App und vergleichbare Speichermechanismen. Ausnahme: technisch unbedingt notwendige Speicherung zur Erbringung eines vom Nutzer ausdrücklich gewünschten Telemediendienstes (§25 Abs. 2 Nr. 2 TTDSG).

## 2. Aktueller Stand der technisch genutzten Speicherzugriffe

Nach Durchsicht des Frontend-Codes identifizierte Speicherzugriffe:

| Zweck | Speicherort | Einordnung |
| --- | --- | --- |
| Theme-Präferenz (Hell/Dunkel/System) | `localStorage` | Technisch notwendig für Kernfunktion (Darstellung), einwilligungsfrei nach §25 Abs. 2 Nr. 2 TTDSG |
| Supabase-Auth-Session-Token | `localStorage` (über den Supabase-JS-Client) | Technisch notwendig zur Aufrechterhaltung der Anmeldung, einwilligungsfrei |
| App-Einstellungen (z. B. Tracking-Modus, Haptik, Spaltenanzahl) | `localStorage` | Technisch notwendig zur Bereitstellung der vom Nutzer gewählten Funktion, einwilligungsfrei |

Nach aktueller Durchsicht des Codes werden **keine** Analytics-, Werbe- oder Tracking-SDKs Dritter eingesetzt, die eine Einwilligungspflicht nach §25 TTDSG auslösen würden. Sollte sich das ändern — etwa durch Integration eines Analytics-Anbieters, A/B-Testing-Tools oder Werbenetzwerks — ist **vor** dem Rollout ein Cookie-/Consent-Banner mit granularer Opt-in-Möglichkeit erforderlich. Dieses Dokument muss bei jeder neuen SDK-Integration erneut geprüft und aktualisiert werden, bevor diese live geht.

## 3. IP-Geolocation für Regionalstatistiken — datenschutzrechtlich, nicht TTDSG-relevant

Für die Bildung regionaler Aggregatstatistiken wird die IP-Adresse serverseitig ausgewertet, um Land, Region, Stadt und Zeitzone zu ermitteln. Das ist kein clientseitiger Speicherzugriff und fällt daher nicht unter §25 TTDSG, sondern unter die DSGVO. Die IP-Adresse ist nach der Rechtsprechung des EuGH (Urteil vom 19. Oktober 2016, C-582/14 — Breyer) personenbezogenes Datum, weshalb hierfür eine Rechtsgrundlage nach Art. 6 DSGVO erforderlich ist; diese Verarbeitung wird in unserer Datenschutzerklärung offengelegt.

## 4. Falls künftig Tracking/Analytics hinzukommt — Vorlage für Consent-Banner-Text

> Wir nutzen [Tool] zur Analyse der App-Nutzung, um Snusdex zu verbessern. Dies erfordert deine Einwilligung.
>
> ☐ Analyse-Tools zulassen *(deaktiviert per Default)*
> ☐ Nur technisch notwendige Speicherung zulassen *(vorausgewählt)*
>
> Mehr dazu in unserer Datenschutzerklärung.

## 5. Zusammenfassung für Compliance-Zwecke

Aktuell besteht keine Handlungspflicht für ein sichtbares Cookie-Banner, da nur technisch notwendige Speicherung erfolgt. Diese Einschätzung gilt nur für den zum Stand dieses Dokuments geprüften Code-Stand und ist bei jeder neuen SDK-Integration neu zu bewerten.
