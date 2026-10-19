# Schritt 1 – Grundgerüst: Weltkarte, Daten-Pipeline, GitHub Pages

> Für die Code-KI. Max hängt die Screenshots von World Monitor (worldmonitor.app) an: Daran soll sich der Look orientieren, ohne es 1:1 zu kopieren.

## Wer und was

Max kann nicht programmieren. Er baut mit dir eine eigene **Live-Weltkarte** im Stil von World Monitor: eine dunkle Karte mit vielen Informationen (Naturereignisse, Nachrichten und Krisen, Wirtschaft, Live-TV, Webcams, Wetter). Das kommt in mehreren Schritten. **In diesem Schritt entsteht nur das Grundgerüst** mit einer ersten Datenebene (Erdbeben), damit die ganze Kette einmal komplett funktioniert.

Sprich mit Max auf Deutsch, einfach und Schritt für Schritt. Wenn er etwas klicken muss, gib eine Klick-Anleitung statt Fachbegriffen.

## So funktioniert das Ganze

1. Eine **GitHub Action** läuft alle 30 Minuten (und bei jedem Push). Sie startet ein Node-Skript, das alle Datenquellen abruft und als JSON-Dateien nach `data/` schreibt.
2. Danach veröffentlicht dieselbe Action die Seite auf **GitHub Pages**.
3. Die Seite ist **eine einzige `index.html`** (HTML, CSS und JS in einer Datei). Sie lädt die JSON-Dateien und zeichnet sie auf die Karte.
4. API-Schlüssel (kommen erst später) liegen nur als **GitHub Secrets** vor und landen nie im Code oder auf der Seite.

## Ordner (Projekt liegt in `E:\Weltkarte`, das wird das Git-Repo)

```
index.html                         ← gesamte Oberfläche
scripts/daten-holen.mjs            ← holt alle Quellen, schreibt data/*.json
config/                            ← Listen, die Max selbst ändern kann (ab späteren Schritten)
data/                              ← wird erzeugt, NICHT im Repo
.github/workflows/aktualisieren.yml
package.json                       ← nur falls nötig (in diesem Schritt keine Abhängigkeiten)
README.md, CLAUDE.md
prompts/                           ← diese Prompt-Dateien (nicht anfassen)
.gitignore                         ← node_modules/, data/, _site/
```

## Technik (fest vorgegeben)

- **Kein Framework, kein Build-Schritt.** Die Oberfläche ist reines HTML, CSS und JavaScript in `index.html`.
- **MapLibre GL JS 5.x** per CDN (jsDelivr oder unpkg) mit **fester Versionsnummer**. 2D und 3D über `map.setProjection({ type: 'mercator' })` bzw. `{ type: 'globe' }`.
- **Grundkarte:** OpenFreeMap, Stil „dark“: `https://tiles.openfreemap.org/styles/dark` (kostenlos, kein Schlüssel). Ortsnamen auf Deutsch, wo vorhanden: `name:de`, sonst `name`.
- **Daten-Skript:** Node 22, eingebautes `fetch`, ES-Module. Keine Abhängigkeiten, außer ein späterer Schritt erlaubt es ausdrücklich.

## Einheitliches Datenformat (alle Ebenen)

`data/<ebene>.json`:

```json
{
  "ebene": "erdbeben",
  "aktualisiert": "2026-10-19T18:00:00Z",
  "eintraege": [
    {
      "id": "us7000abcd",
      "titel": "M 5.8 - 120 km SW of Neiafu, Tonga",
      "text": "Tiefe 35 km",
      "lat": -21.3,
      "lon": -175.6,
      "zeit": "2026-10-19T16:42:00Z",
      "stufe": "erhoeht",
      "wert": 5.8,
      "link": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
      "quelle": "USGS"
    }
  ]
}
```

- `stufe` ist immer eines von `"hoch"`, `"erhoeht"`, `"beobachtung"`.
- `wert` ist optional (z. B. Stärke). Die Punktgröße richtet sich danach.
- Spätere Schritte dürfen **optionale** Felder ergänzen, aber nichts umbenennen oder entfernen.

`data/status.json`:

```json
{ "aktualisiert": "…", "quellen": [ { "name": "USGS Erdbeben", "ebene": "erdbeben", "ok": true, "anzahl": 312, "fehler": null } ] }
```

## Daten-Skript `scripts/daten-holen.mjs`

- Jede Quelle ist eine eigene Funktion mit 20 Sekunden Timeout und eigenem try/catch.
- **Fällt eine Quelle aus, bleiben die alten Daten stehen:** Lade dann die bisher veröffentlichte Datei von der Live-Seite. Die URL ergibt sich aus der Umgebungsvariable `GITHUB_REPOSITORY` (`owner/repo` → `https://owner.github.io/repo/data/<ebene>.json`). In `status.json` als Fehler markieren. Das Skript bricht nie komplett ab.
- Nur Einträge der letzten 7 Tage speichern.
- Läuft auch lokal ohne Schlüssel: `node scripts/daten-holen.mjs`.

**Erste Quelle: Erdbeben (USGS)**
`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson`
- `titel` = `properties.title`, `wert` = Magnitude, `link` = `properties.url`, `text` = Tiefe in km und gegebenenfalls „Tsunami-Hinweis“ (`properties.tsunami === 1`).
- Stufe: ab M 6 → `hoch`, ab M 5 → `erhoeht`, sonst `beobachtung`.

## GitHub Action `.github/workflows/aktualisieren.yml`

- Auslöser: `schedule` mit `*/30 * * * *`, `workflow_dispatch` (Knopf zum Starten von Hand) und `push` auf `main`.
- Ablauf: checkout → setup-node 22 → (npm ci, nur wenn es Abhängigkeiten gibt) → Skript ausführen → `index.html`, `config/` und `data/` nach `_site/` kopieren → `actions/upload-pages-artifact` → `actions/deploy-pages`.
- `permissions`: `contents: read`, `pages: write`, `id-token: write`. Dazu eine `concurrency`-Gruppe, damit sich zwei Läufe nicht in die Quere kommen.
- Secrets werden später als `env` an das Skript übergeben. Lege die Stelle schon an (auskommentiert), aber noch keine Schlüssel.

## Oberfläche `index.html`

**Look:** dunkle Lagezentrum-Optik wie auf den Screenshots. Fast schwarzer Hintergrund, dunkle Panels mit dünnen Rändern, Monospace-Schrift (z. B. JetBrains Mono über Google Fonts, sonst Systemschrift). Akzente: Grün für „LIVE“ und aktive Knöpfe, Rot für `hoch`, Orange für `erhoeht`, Gelb für `beobachtung`. Alle Farben als CSS-Variablen.

**Kopfzeile:** Titel „WELTKARTE“, LIVE-Punkt (grün; grau, wenn die Daten älter als 90 Minuten sind), „Daten von vor X Min.“ aus `status.json`, Uhr in UTC und Ortszeit.

**Karte** (nimmt den größten Teil ein):
- Oben links ein Zeitfilter: `1h 6h 24h 48h 7d Alle`, Standard `24h`.
- Oben rechts: 2D/3D-Umschalter, Zoom +/−, „Weltansicht“-Knopf.
- Unten links ein einklappbares **Ebenen-Panel**. Pro Ebene: Checkbox, Name, Anzahl der gerade sichtbaren Einträge und ein kleines „i“ mit Erklärung und Quelle. Die Auswahl wird in `localStorage` gemerkt.
- Unten eine Legende: Hoch / Erhöht / Beobachtung.
- Klick auf einen Punkt öffnet ein Popup mit Titel, Zeit („vor 2 Std.“ und genaue Uhrzeit), Text, Quelle und dem Link „Quelle öffnen ↗“.
- Quellenangaben unten rechts in der Karte (OpenFreeMap, OpenMapTiles, OpenStreetMap, USGS).

**Rechte Spalte:** Panel „Neueste Ereignisse“ mit den 30 neuesten Einträgen aller eingeschalteten Ebenen im gewählten Zeitraum. Ein Klick fliegt zur Stelle und öffnet das Popup. Die Spalte ist so gebaut, dass spätere Schritte weitere Panels einfach darunter setzen können (untereinander, jedes einklappbar).

**Ebenen zentral definieren:** ein JS-Array `EBENEN` oben im Skript, z. B. `{ id, name, datei, farbe/symbol, standardAn, info }`. Eine neue Ebene ist dann nur ein neuer Eintrag.

**Weiteres:**
- Alle 5 Minuten die Daten neu laden, ohne die Seite neu zu laden (Cache umgehen).
- Fehlt eine Datei, wird die Ebene grau mit „keine Daten“ angezeigt. Der Rest läuft weiter.
- Handy (unter 800 px Breite): Karte oben (ca. 60 % der Höhe), Panels darunter, Ebenen-Panel als aufklappbarer Knopf.
- Alle Knöpfe haben eine Beschriftung oder ein `aria-label` und sind per Tastatur bedienbar.

## GitHub einrichten (zusammen mit Max)

1. Prüfe, ob `git` und die GitHub-CLI `gh` installiert sind und `gh` angemeldet ist. Falls nicht: Erkläre Max, wie er es installiert und sich mit `gh auth login` anmeldet (er macht das selbst, du tippst keine Passwörter).
2. Lege das Repo `weltkarte` als **öffentlich** an. GitHub Pages ist nur bei öffentlichen Repos kostenlos. Schlüssel sind trotzdem sicher, weil sie in Secrets liegen.
3. Klick-Anleitung für Max: Repo → Settings → Pages → Source: **GitHub Actions**.
4. Pushen, im Tab „Actions“ prüfen, ob der Lauf grün ist, dann Max die Seiten-URL nennen (`https://<name>.github.io/weltkarte/`).

## Doku

- **README.md** (kurz): was das ist, Link zur Seite, wie es funktioniert (3 Sätze), Tabelle der Datenquellen (Quelle | Ebene | Schlüssel nötig? | Aktualisierung), „Lokal testen“, Abschnitt „Stand“ (welche Schritte gebaut sind).
  Dazu dieser Hinweis: GitHub pausiert zeitgesteuerte Actions in öffentlichen Repos nach 60 Tagen ohne Änderung. Dann im Tab „Actions“ wieder aktivieren.
- **CLAUDE.md** mit diesen Projektregeln (für alle späteren Schritte):
  - Max kann nicht programmieren: auf Deutsch erklären, einfach, mit Klick-Anleitungen.
  - Oberfläche komplett auf Deutsch.
  - Aufbau und Datenformat wie oben. Muss sich das Format ändern, das ausdrücklich sagen und README und CLAUDE.md anpassen.
  - **Nie API-Schlüssel in Code oder Repo**, nur GitHub Secrets → Umgebungsvariablen im Skript. Ohne Schlüssel muss alles andere weiterlaufen.
  - Jede Quelle darf ausfallen, ohne dass etwas anderes kaputtgeht.
  - Nachrichten: nur Titel, kurzer Anrisstext und Link zum Original, keine ganzen Artikel kopieren.
  - Datenquellen auf der Karte und im README nennen.
  - Kein Build-Schritt, keine Frameworks, neue Abhängigkeiten nur mit gutem Grund.
  - Nach jedem Schritt README (Stand + Quellentabelle) aktualisieren.
  - Vor „fertig“ lokal testen; die Browser-Konsole muss fehlerfrei sein.

## Fertig, wenn

- Lokal läuft `node scripts/daten-holen.mjs` und erzeugt `data/erdbeben.json` und `data/status.json`.
- `index.html` über einen lokalen Webserver (z. B. `npx serve .`; über `file://` geht `fetch` nicht) zeigt die Erdbeben. Getestet und funktionierend: 2D/3D, Zeitfilter, Ebenen-Panel, Popup, „Neueste Ereignisse“ und die Handy-Ansicht.
- Online: Die Action ist grün und die Seite unter github.io zeigt Daten.
- Zum Schluss erklärst du Max in 5–8 einfachen Sätzen, was jetzt da ist und wo er was findet.
