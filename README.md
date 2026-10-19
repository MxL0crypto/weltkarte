# Weltkarte

Eine eigene Live-Weltkarte im Lagezentrum-Look: Naturereignisse, Krisen und mehr auf einer dunklen Karte, in 2D oder als Globus.

**Seite:** https://mxl0crypto.github.io/weltkarte/

## So funktioniert es

Eine GitHub Action läuft alle 30 Minuten und holt mit `scripts/daten-holen.mjs` die Daten aller Quellen als JSON-Dateien nach `data/`. Danach veröffentlicht sie `index.html` zusammen mit den Daten auf GitHub Pages. Die Seite lädt die Daten alle 5 Minuten neu und zeichnet sie auf die Karte.

## Datenquellen

| Quelle | Ebene | Schlüssel nötig? | Aktualisierung |
|---|---|---|---|
| [USGS](https://earthquake.usgs.gov/earthquakes/feed/) | Erdbeben (ab M 2,5, 7 Tage) | nein | alle 30 Min. |
| [OpenFreeMap](https://openfreemap.org) / OpenMapTiles / OpenStreetMap | Grundkarte | nein | – |

## Lokal testen

```
node scripts/daten-holen.mjs
python -m http.server 5190
```

Dann im Browser `http://localhost:5190` öffnen. Ein Doppelklick auf `index.html` reicht nicht, weil der Browser die Daten dann nicht laden darf.

## Wichtig

GitHub pausiert zeitgesteuerte Actions in öffentlichen Repos nach 60 Tagen ohne Änderung. Dann bleiben die Daten stehen. Lösung: Im Repo auf den Tab **Actions** gehen und den Workflow wieder aktivieren.

## Stand

- [x] Schritt 1: Grundgerüst (Karte 2D/3D, Zeitfilter, Ebenen-Panel, Neueste Ereignisse, Erdbeben, GitHub Action)
- [ ] Schritt 2: Naturereignisse
- [ ] Schritt 3: Nachrichten und Krisen
- [ ] Schritt 4: Wirtschaft
- [ ] Schritt 5: TV, Webcams, Wetter
