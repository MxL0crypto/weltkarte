# Weltkarte

Eine eigene Live-Weltkarte im Lagezentrum-Look: Naturereignisse, Krisen und mehr auf einer dunklen Karte, in 2D oder als Globus.

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
| eigene Liste `config/konfliktzonen.json` | Konfliktzonen | nein | von Hand |
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

Dann im Browser `http://localhost:5190` öffnen. Ein Doppelklick auf `index.html` reicht nicht, weil der Browser die Daten dann nicht laden darf.

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

`data/status.json` zeigt, welche Quelle zuletzt geklappt hat: `{ aktualisiert, quellen: [{ name, ebene, ok, anzahl, fehler }] }`

## Wichtig

GitHub pausiert zeitgesteuerte Actions in öffentlichen Repos nach 60 Tagen ohne Änderung. Dann bleiben die Daten stehen. Lösung: Im Repo auf den Tab **Actions** gehen und den Workflow wieder aktivieren.

## Stand

- [x] Schritt 1: Grundgerüst (Karte 2D/3D, Zeitfilter, Ebenen-Panel, Neueste Ereignisse, Erdbeben, GitHub Action)
- [x] Schritt 2: Naturereignisse (Waldbrände, Stürme, Vulkane, Überschwemmungen, Katastrophen-Warnungen)
- [x] Schritt 3: Nachrichten und Krisen (Nachrichten mit Zahlenblasen, Brennpunkte, Konfliktzonen, Panel Live-Nachrichten, webz.io optional)
- [ ] Schritt 4: Wirtschaft
- [ ] Schritt 5: TV, Webcams, Wetter
