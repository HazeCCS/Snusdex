# Auftragsverarbeitungsvertrag (AVV) — Vorlage nach Art. 28 DSGVO

**Arbeitsentwurf, Stand: 24. Juli 2026. Vor Unterzeichnung durch eine im Datenschutzrecht zugelassene Kanzlei prüfen lassen.**

zwischen

**Norman Tarayan, Hauptstraße 12 1/2, 84416 Taufkirchen (Vils)** ("Verantwortlicher")

und

**[Platzhalter: Name/Firma des Dienstleisters, z. B. Supabase Inc. / der jeweilige Supabase-Vertragsrechtsträger]** ("Auftragsverarbeiter")

## Hinweis zur Nutzung dieser Vorlage

Diese Vorlage ist als **Fallback/Prüfraster** gedacht. Viele Anbieter (u. a. Supabase) stellen eigene, bereits ausformulierte AVV/DPA-Dokumente zur Unterzeichnung bereit (häufig online abrufbar/self-service). In diesem Fall: **primär das Anbieter-DPA nutzen**, mit dieser Vorlage nur gegenprüfen, ob alle Pflichtinhalte nach Art. 28 Abs. 3 DSGVO enthalten sind. Diese Vorlage selbst ersetzt kein rechtsverbindlich abgeschlossenes Anbieter-DPA.

## 1. Gegenstand und Dauer

1.1 Der Auftragsverarbeiter verarbeitet personenbezogene Daten von Snusdex-Nutzern ausschließlich nach Weisung des Verantwortlichen im Rahmen der Bereitstellung von [Datenbank-, Auth-, Storage- und Edge-Function-Hosting / IP-Geolocation-Lookup / weiterer Dienst].

1.2 Die Dauer entspricht der Laufzeit des zugrundeliegenden Hauptvertrags (z. B. Supabase-Nutzungsbedingungen, ip-api.com-Nutzungsbedingungen).

## 2. Gegenstand, Art und Zweck der Verarbeitung, Kategorien betroffener Personen und Datenarten

Betroffen sind Nutzer der Snusdex-App. Je nach Dienstleister umfasst die Verarbeitung:

- **Supabase**: sämtliche Konto-, Sammlungs-, Bewertungs-, Konsum-, Sozial-, Push- und Affiliate-Daten sowie die Export- und Löschfunktionen der App (vollständiges Hosting sämtlicher App-Daten in einer PostgreSQL-Datenbank, Authentifizierung, Datei-Storage und serverseitige Funktionen).
- **ip-api.com**: transiente IP-Adresse zur Ermittlung von Land, Region, Stadt und Zeitzone bei Abgabe einer Bewertung.
- *[Platzhalter: weitere Dienstleister ergänzen, z. B. E-Mail-Versand, falls nicht direkt über Apple/Supabase abgewickelt.]*

## 3. Pflichten des Auftragsverarbeiters (Art. 28 Abs. 3 DSGVO)

Der Auftragsverarbeiter verpflichtet sich:

a) personenbezogene Daten nur auf dokumentierte Weisung des Verantwortlichen zu verarbeiten, einschließlich bei Datenübermittlungen an Drittländer, es sei denn, dies ist nach geltendem Recht vorgeschrieben;
b) sicherzustellen, dass zur Verarbeitung befugte Personen zur Vertraulichkeit verpflichtet sind;
c) angemessene technische und organisatorische Maßnahmen nach Art. 32 DSGVO zu treffen;
d) die Bedingungen für die Hinzuziehung weiterer Auftragsverarbeiter (Subprozessoren) nach Art. 28 Abs. 2 und 4 DSGVO einzuhalten und den Verantwortlichen über beabsichtigte Änderungen zu informieren;
e) den Verantwortlichen bei der Erfüllung von Betroffenenrechten (Art. 12–23 DSGVO) angemessen zu unterstützen;
f) den Verantwortlichen bei der Einhaltung der Pflichten nach Art. 32–36 DSGVO (Sicherheit, Meldepflichten, Datenschutz-Folgenabschätzung) zu unterstützen;
g) nach Abschluss der Erbringung der Verarbeitungsleistungen alle personenbezogenen Daten nach Wahl des Verantwortlichen zu löschen oder zurückzugeben, sofern keine gesetzliche Aufbewahrungspflicht entgegensteht;
h) dem Verantwortlichen alle zum Nachweis der Einhaltung dieser Pflichten erforderlichen Informationen zur Verfügung zu stellen und Prüfungen zu ermöglichen.

## 4. Subprozessoren

4.1 Der Auftragsverarbeiter darf weitere Auftragsverarbeiter nur mit vorheriger Zustimmung (allgemein oder spezifisch) des Verantwortlichen einsetzen und muss deren Datenschutzpflichten vertraglich gleichwertig auferlegen.

4.2 *[Platzhalter: Liste der bekannten Subprozessoren je Dienstleister — bei Supabase u. a. abhängig vom gewählten Hosting-Provider und dessen Serverregion; bei ip-api.com aktuell unklar.]*

## 5. Internationale Übermittlung

Soweit Verarbeitung außerhalb der EU/des EWR erfolgt, ist eine der folgenden Grundlagen zugrunde zu legen: Standardvertragsklauseln der EU-Kommission (Art. 46 DSGVO), ein gültiger Angemessenheitsbeschluss — für Übermittlungen in die USA insbesondere das EU-US Data Privacy Framework, sofern der Empfänger dort zertifiziert ist (Angemessenheitsbeschluss der EU-Kommission vom 10. Juli 2023) — oder eine andere zulässige Grundlage nach Art. 44 ff. DSGVO. *[Platzhalter: konkrete Grundlage je Anbieter ergänzen, sobald Serverstandort und Zertifizierungsstatus feststehen.]*

## 6. Technische und organisatorische Maßnahmen (TOM)

*[Platzhalter: TOM-Anlage des jeweiligen Anbieters beifügen bzw. bei ip-api.com eigene Mindestanforderungen definieren, insbesondere durchgängige Verschlüsselung der Übertragung — die aktuelle Verbindung erfolgt unverschlüsselt und muss vor produktivem Einsatz behoben werden.]*

## 7. Haftung und Meldepflichten

7.1 Der Auftragsverarbeiter informiert den Verantwortlichen unverzüglich, spätestens innerhalb von [Platzhalter, z. B. 24 Stunden] nach Kenntniserlangung von einer Verletzung des Schutzes personenbezogener Daten.

7.2 Im Übrigen gelten die gesetzlichen Haftungsregelungen der DSGVO.

## 8. Status je Dienstleister

| Dienstleister | Eigenes AVV/DPA vorhanden? | Status |
| --- | --- | --- |
| Supabase | Ja, in der Regel self-service verfügbar | [Platzhalter: abschließen und Ablagepfad hier vermerken] |
| ip-api.com | Unbekannt/vermutlich nein (kostenloser Dienst ohne Enterprise-Vertrag) | **Offen — vor kommerziellem Einsatz zu klären** |
| Apple (Push) | Eigene Entwicklervereinbarung, kein klassischer AVV nötig (eigenständig Verantwortlicher) | Zur Kenntnis genommen |
