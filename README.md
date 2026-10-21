# Weltkarte

Eine eigene Live-Weltkarte im Lagezentrum-Look: Naturereignisse, Krisen, Märkte und mehr auf einer dunklen Karte, in 2D oder als Globus.

**Seite:** https://mxl0crypto.github.io/weltkarte/

## So funktioniert es

Eine GitHub Action läuft alle 30 Minuten und holt mit `scripts/daten-holen.mjs` die Daten aller Quellen als JSON-Dateien nach `data/`. Danach veröffentlicht sie `index.html` zusammen mit den Daten auf GitHub Pages. Die Seite lädt die Daten alle 5 Minuten neu und zeichnet sie auf die Karte.

## Datenquellen

| Quelle | Ebene | Schlüssel nötig? | Aktualisierung |
|---|---|---|---|
| [USGS](https://earthquake.usgs.gov/earthquakes/feed/) | Erdbeben (ab M 2,5, 7 Tage) | nein | alle 30 Min. |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Waldbrände, Stürme, Überschwemmungen (offen, letzte 30 Tage), Vulkane (alle aktiven) | nein | alle 30 Min. |
| [GDACS](https://www.gdacs.org/) (UN und EU) | Katastrophen-Warnungen (ohne grüne Waldbrand-Meldungen) | nein | alle 30 Min. |
| [tagesschau](https://www.tagesschau.de/xml/rss2/), [DW Deutsch](https://rss.dw.com/rdf/rss-de-all), [SPIEGEL Ausland](https://www.spiegel.de/ausland/index.rss) | Nachrichten (Deutsch) | nein | alle 30 Min. |
| [BBC World](https://feeds.bbci.co.uk/news/world/rss.xml), [Al Jazeera](https://www.aljazeera.com/xml/rss/all.xml), [The Guardian](https://www.theguardian.com/world/rss), [France 24](https://www.france24.com/en/rss), [DW English](https://rss.dw.com/rdf/rss-en-all), [UN News](https://news.un.org/feed/subscribe/en/news/all/rss.xml) | Nachrichten (International) | nein | alle 30 Min. |
| [webz.io](https://webz.io) (optional) | Nachrichten aus vielen weiteren Quellen | ja, `WEBZ_API_KEY` (kostenlos, ca. 1.000 Abrufe/Monat, nur nicht-kommerziell) | alle 3 Std. |
| eigene Auswertung der Nachrichten | Brennpunkte | nein | alle 30 Min. |
| [Yahoo Finance](https://finance.yahoo.com) (inoffizielle Schnittstelle) | Panel Märkte (Indizes, Rohstoffe, Krypto, Devisen), Ebene Börsenplätze | nein | alle 30 Min., Kurse verzögert |
| eigene Liste `config/konfliktzonen.json` | Konfliktzonen | nein | von Hand |
| [Open-Meteo](https://open-meteo.com/) (nur nicht-kommerzielle Nutzung) | Ebene Temperaturen (aktuelle Temperatur, Wetterlage und Wind in ca. 50 Großstädten) | nein | alle 30 Min. |
| [RainViewer](https://www.rainviewer.com/) | Ebene Regenradar (Weather data by Rain Viewer) | nein | alle 10 Min., direkt im Browser |
| [YouTube](https://www.youtube.com) (eingebettete Livestreams) | Panels Live-TV und Live-Webcams, Ebene Webcams | nein | live |
| eigene Listen `config/sender.json`, `config/webcams.json` | Senderliste, Webcam-Liste | nein | von Hand |
| [Natural Earth](https://www.naturalearthdata.com/) | Ländergrenzen und Hauptstädte (`config/laender.geojson`, `config/orte.json`) | nein | einmalig |
| [OpenFreeMap](https://openfreemap.org) / OpenMapTiles / OpenStreetMap | Grundkarte | nein | – |

Von Nachrichten werden nur Titel, ein kurzer Anrisstext (höchstens ca. 300 Zeichen) und der Link zum Original gespeichert, nie ganze Artikel. Gespeichert werden die letzten 48 Stunden.

## Nachrichten: so funktioniert die Zuordnung

- **Ort:** Die Meldungen haben keine Koordinaten. Das Skript sucht in Titel und Anrisstext nach Ländern, Städten und Regionen aus `config/orte.json`. Der Titel zählt zuerst; darin schlägt eine Stadt das Land und das Land ein Adjektiv („russisch“) oder eine Person („Putin“). Meldungen ohne erkannten Ort stehen nur in der Liste, nicht auf der Karte. Bekannte Fallen wie „Georgia“, „Jordan“ oder „Chad“ (auch Vornamen) werden ignoriert, „Turkey“ zählt nur großgeschrieben.
- **Stufe:** Wörter wie Angriff, Rakete, Tote, Krieg / attack, missile, killed, war → **hoch**. Proteste, Sanktionen, Festnahmen, Putsch / protest, sanctions, arrest, coup → **erhöht**. Sonst **Beobachtung**.
- **Brennpunkte:** Pro Land zählen die Meldungen der letzten 24 Stunden (hoch = 3 Punkte, erhöht = 2, sonst 1). Ab 8 Punkten erscheint ein Kreis, ab 15 ist er orange, ab 30 rot.

### Nachrichtenquelle hinzufügen oder entfernen

1. Im Repo die Datei `config/nachrichten-quellen.json` öffnen und auf den Stift (Bearbeiten) klicken.
2. Eine Zeile kopieren und anpassen, z. B.:
   `{ "name": "ZDF heute", "url": "https://www.zdf.de/rss/zdf/nachrichten", "sprache": "de" },`
   `sprache` ist `de` oder `en`. Zwischen zwei Zeilen muss ein Komma stehen, hinter der letzten nicht.
3. „Commit changes“ klicken. Nach ein paar Minuten ist die Quelle dabei. Ob sie klappt, steht in `data/status.json` auf der Seite.

Zum Entfernen die ganze Zeile löschen.

### Konfliktzonen ändern

Die Liste steht in `config/konfliktzonen.json`, ein Land pro Zeile:

```json
{ "land": "SDN", "name": "Sudan", "stufe": "hoch", "beschreibung": "Bürgerkrieg zwischen Armee und RSF-Miliz seit April 2023.", "stand": "2026-10-19" },
```

- `land`: Ländercode aus `config/orte.json` (Feld `code`, z. B. UKR, ISR, SDS für Südsudan, PSX für Palästina).
- `stufe`: `hoch`, `erhoeht` oder `beobachtung` (Farbe auf der Karte).
- `beschreibung`: ein neutraler Satz. `stand`: Datum, an dem du den Eintrag zuletzt geprüft hast.

Bearbeiten wie oben: Stift, ändern, „Commit changes“. Ein falscher Ländercode zeigt sich in `data/status.json` als Fehler, die alten Konfliktzonen bleiben dann stehen.

## Märkte

Das Panel **Märkte** in der rechten Spalte zeigt Börsenindizes, Rohstoffe, Krypto und Wechselkurse: Kurs, Veränderung zum Vortagesschluss (grün ▲ / rot ▼) und den Verlauf der letzten ca. 48 Stunden-Werte. Die Kurse sind verzögert und keine Anlageberatung.

Die Ebene **Börsenplätze** (standardmäßig aus) zeigt Frankfurt, New York, London, Tokio und Hongkong: grün = Index im Plus, rot = im Minus, grau = keine Daten. Diese Farben sind keine Warnstufen.

Yahoo Finance hat keine offizielle Schnittstelle. Fällt sie weg, bleiben die letzten Kurse stehen, und in `data/status.json` steht bei „Yahoo Finance“ ein Fehler.

### Wert hinzufügen oder entfernen

1. Auf [finance.yahoo.com](https://finance.yahoo.com) oben den Namen suchen (z. B. „MDAX“) und das Kürzel in Klammern merken, z. B. `^MDAXI`. (Beispiele: Aktie Apple `AAPL`, Wechselkurs Euro/Polnischer Złoty `EURPLN=X`, Krypto in Euro `XRP-EUR`.)
2. Im Repo die Datei `config/maerkte.json` öffnen und auf den Stift (Bearbeiten) klicken.
3. Eine Zeile kopieren und anpassen, z. B.:
   `{ "name": "MDAX", "symbol": "^MDAXI", "gruppe": "Indizes" },`
   `gruppe` ist der Reiter im Panel (`Indizes`, `Rohstoffe`, `Krypto`, `Devisen`). Ein neuer Name ergibt einen neuen Reiter. Zwischen zwei Zeilen muss ein Komma stehen, hinter der letzten nicht.
4. „Commit changes“ klicken. Nach ein paar Minuten ist der Wert dabei.

Soll ein Index auch als Börsenplatz auf der Karte erscheinen, kommen Ort und Koordinaten dazu:
`{ "name": "DAX", "symbol": "^GDAXI", "gruppe": "Indizes", "boerse": "Frankfurt", "lat": 50.11, "lon": 8.68 },`

Zum Entfernen die ganze Zeile löschen.

## Live-TV und Webcams

Beide Panels laden erst nach einem Klick auf „Abspielen“ etwas von YouTube und starten **stumm**. Beim Live-TV gibt es Knöpfe für Ton und Vollbild, beim Wechsel des Senders merkt sich die Seite die Wahl. Bei den Webcams laufen höchstens 4 gleichzeitig (die älteste stoppt, wenn eine fünfte startet), „Einzeln“ zeigt eine große Kamera nach der anderen. Meldet YouTube, dass ein Stream offline ist oder nicht eingebettet werden darf, steht in der Kachel „Stream gerade offline“ mit einem Link zu YouTube.

Die Ebene **Webcams** (standardmäßig aus) zeigt ein Kamera-Symbol an jedem Ort. Ein Klick öffnet die Webcam im Panel und startet sie.

### Sender hinzufügen oder entfernen

1. Im Repo `config/sender.json` öffnen, Stift (Bearbeiten) klicken.
2. Eine Zeile kopieren und anpassen, z. B.:
   `{ "name": "ZDF heute", "kanalId": "UC_HIER_24_ZEICHEN_KANAL_ID", "sprache": "de" },`
   Die `kanalId` (beginnt mit `UC`): Kanal auf YouTube öffnen, auf den Kanalnamen → „Mehr zu diesem Kanal“ → „Kanal teilen“ → „Kanal-ID kopieren“. Sie funktioniert nur, solange der Kanal gerade live ist.
3. Klappt der Kanal nicht, die **Video-ID** des Livestreams eintragen: Livestream auf YouTube öffnen, in der Adresse den Teil nach `v=` kopieren (11 Zeichen) und statt `kanalId` als `"videoId": "..."` eintragen.
4. „Commit changes“ klicken. Nach ein paar Minuten ist der Sender dabei. Zum Entfernen die ganze Zeile löschen.

### Webcams hinzufügen oder entfernen

Die Liste steht in `config/webcams.json`, eine Webcam pro Zeile:

```json
{ "name": "Times Square", "ort": "New York", "land": "USA", "region": "Amerika", "lat": 40.76, "lon": -73.99, "videoId": "HIER_11_ZEICHEN" },
```

- `region`: Nahost, Europa, Amerika, Asien, Afrika, Ozeanien oder Weltraum (ein neuer Name ergibt einen neuen Filter). `lat`/`lon` sind der Ort auf der Karte; ohne beide erscheint die Webcam nur im Panel (z. B. die ISS).
- `videoId`: Livestream auf YouTube öffnen, in der Adresse den Teil nach `v=` kopieren (genau 11 Zeichen, keine ganze Adresse). Statt `videoId` geht auch `kanalId`, solange der Kanal live ist.
- **Webcams mit leerer `videoId` zeigen „Noch keine Video-ID eingetragen“.** In der mitgelieferten Liste sind alle `videoId` noch leer, die Livestream-Adressen ändern sich zu oft, um sie hier fest zu verdrahten. Zum Befüllen auf YouTube nach dem Namen suchen (z. B. „Times Square live“), einen Stream mit rotem „LIVE“ öffnen und die ID eintragen.
- Eine falsch eingetragene ID (z. B. die ganze Adresse) meldet das Daten-Skript in `data/status.json` bei „Webcams (eigene Liste)“, die alte Liste bleibt dann stehen.

## Regenradar und Temperaturen

Die Ebene **Regenradar** (standardmäßig aus) legt das aktuelle Radarbild von RainViewer halbdurchsichtig unter alle Zeichen der Karte, in 2D und auf dem Globus. Es wird nur geholt, wenn die Ebene an ist, und alle 10 Minuten erneuert. Radar gibt es nur dort, wo es Wetterradar gibt (vor allem Europa, Nordamerika, Teile von Asien und Ozeanien). Seit 2026 gilt für den kostenlosen Zugang: höchstens Zoomstufe 7 (näher heran wird das Bild vergrößert), ein Farbschema, nur vergangene Bilder. Die Quellenangabe „Weather data by Rain Viewer“ mit Link steht unten rechts an der Karte, solange das Radar an ist.

Die Ebene **Temperaturen** (standardmäßig aus) zeigt „18°“ an ca. 50 Großstädten, gefärbt von blau (kalt) bis rot (heiß). Im Popup stehen Wetterlage und Wind. Die Werte sind Modelldaten von Open-Meteo, keine Messwerte der Stadt. Welche Städte dabei sind, steht in `config/orte.json`: Alle Einträge mit `"wetter": true` zählen. Zum Hinzufügen bei einer Stadt in der Liste `orte` `,"wetter":true` vor die schließende Klammer setzen.

### webz.io einschalten (optional)

1. Auf [webz.io](https://webz.io) „Free API Key“ wählen, registrieren und den Token (Schlüssel) kopieren.
2. Im Repo auf **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: `WEBZ_API_KEY`, Wert: den Token einfügen, **Add secret** klicken.
4. Im Tab **Actions** den Workflow „Daten aktualisieren und veröffentlichen“ öffnen und **Run workflow** klicken.

Das Skript fragt webz.io höchstens alle 3 Stunden ab (ca. 240 Abrufe im Monat). Ohne Schlüssel wird webz.io einfach übersprungen.

## Lokal testen

```
npm ci
node scripts/daten-holen.mjs
python -m http.server 5190
```

`npm ci` ist nur einmal nötig (installiert `fast-xml-parser` zum Lesen der GDACS- und Nachrichten-Feeds).

Dann im Browser `http://localhost:5190` öffnen. Ein Doppelklick auf `index.html` reicht nicht, weil der Browser die Daten dann nicht laden darf (und YouTube-Videos lassen sich über `file://` auch nicht einbetten).

## Datenformat

Jede Ebene ist eine Datei `data/<ebene>.json`:
`{ ebene, aktualisiert, eintraege: [{ id, titel, text, lat, lon, zeit, stufe, wert?, laufend?, link, quelle }] }`

- `stufe`: `hoch`, `erhoeht` oder `beobachtung` (bestimmt die Farbe).
- `wert` (optional): bestimmt die Größe des Zeichens, z. B. Erdbeben-Stärke oder Sturm-Wind in Knoten.
- `laufend` (optional): `true` bei Ereignissen, die noch andauern (z. B. Vulkane). Sie bleiben bei jedem Zeitraum sichtbar und fallen nicht nach 7 Tagen heraus.
- `land` (optional): Ländercode (Natural-Earth-Feld `ADM0_A3`, z. B. `UKR`). Brennpunkte und Konfliktzonen brauchen ihn.
- `sprache` (optional): `de` oder `en`, bei Nachrichten.
- Nur bei Nachrichten dürfen `lat` und `lon` fehlen (kein Ort erkannt). Diese Meldungen stehen nur in der Liste.
- `data/nachrichten.json` hat zusätzlich `webzAbruf` (optional): Zeitpunkt des letzten webz.io-Abrufs.
- `farbe` (optional, seit Schritt 4): eigene Farbe statt der Stufen-Farbe, `plus`, `minus` oder `grau` (Ebene Börsenplätze). `stufe` muss trotzdem gesetzt sein.
- Seit Schritt 5: **Formatänderung** – auch in `data/webcams.json` dürfen `lat` und `lon` fehlen (Kameras im Weltraum, nur im Panel). Optional dort: `region`, `videoId`, `kanalId`. `land` ist in den Daten wie sonst der Ländercode und bei Webcams nicht gesetzt (Land steht im `text`).
- `data/temperaturen.json` hat das normale Format: `wert` = Temperatur in °C, `text` = Wetterlage und Wind, `stufe` immer `beobachtung` (ohne Bedeutung).

Die Märkte haben ein eigenes Format, `data/maerkte.json`:
`{ aktualisiert, werte: [{ name, symbol, gruppe, kurs, waehrung, aenderungProzent, verlauf: [...] }] }`

- `kurs` ist `null`, wenn es für den Wert noch nie Daten gab. `waehrung` kann `null` sein (Yahoo liefert sie nicht für jeden Index).
- `aenderungProzent`: Veränderung zum Vortagesschluss in Prozent (`null` = unbekannt).
- `verlauf`: die letzten bis zu 48 Stundenkurse, älteste zuerst.

`data/status.json` zeigt, welche Quelle zuletzt geklappt hat: `{ aktualisiert, quellen: [{ name, ebene, ok, anzahl, fehler }] }`

## Wichtig

GitHub pausiert zeitgesteuerte Actions in öffentlichen Repos nach 60 Tagen ohne Änderung. Dann bleiben die Daten stehen. Lösung: Im Repo auf den Tab **Actions** gehen und den Workflow wieder aktivieren.

## Stand

- [x] Schritt 1: Grundgerüst (Karte 2D/3D, Zeitfilter, Ebenen-Panel, Neueste Ereignisse, Erdbeben, GitHub Action)
- [x] Schritt 2: Naturereignisse (Waldbrände, Stürme, Vulkane, Überschwemmungen, Katastrophen-Warnungen)
- [x] Schritt 3: Nachrichten und Krisen (Nachrichten mit Zahlenblasen, Brennpunkte, Konfliktzonen, Panel Live-Nachrichten, webz.io optional)
- [x] Schritt 4: Wirtschaft (Panel Märkte mit Indizes, Rohstoffen, Krypto, Devisen und Mini-Verläufen, Ebene Börsenplätze)
- [x] Schritt 5: TV, Webcams, Wetter (Panels Live-TV und Live-Webcams, Ebenen Webcams, Regenradar, Temperaturen). **Noch zu tun von Hand:** die Video-IDs der Webcams in `config/webcams.json` eintragen (siehe „Webcams hinzufügen oder entfernen“).
