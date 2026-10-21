# Weltkarte – Projektregeln

Live-Weltkarte im Stil von World Monitor. Bauplan in `prompts/` (nicht anfassen). Referenz-Screenshots von World Monitor liegen in `referenz/` (nicht im Repo).

## Zusammenarbeit
- Max kann nicht programmieren: auf Deutsch erklären, einfach, mit Klick-Anleitungen statt Fachbegriffen.
- Oberfläche komplett auf Deutsch.

## Aufbau
- `index.html`: gesamte Oberfläche (HTML, CSS, JS in einer Datei). Ebenen stehen zentral im Array `EBENEN`, Farben als CSS-Variablen in `:root`. Neue Panels der rechten Spalte als weitere `<section class="panel">`.
- `scripts/daten-holen.mjs`: holt alle Quellen (Node 22, eingebautes `fetch`), schreibt `data/<ebene>.json` und `data/status.json`. Neue Quelle = neue Funktion + Eintrag in `QUELLEN`. Nachrichten (viele RSS-Quellen → eine `nachrichten.json`, jede Quelle einzeln im Status) und daraus `brennpunkte.json` stehen als eigener Block am Ende. Ortserkennung (`ortFinden`) und Stufe (`STUFE_WORTE`, nach Sprache getrennt) ebenfalls dort; ein Selbsttest der bekannten Ort-Fallen läuft bei jedem Start (`console.assert`). Danach der Block Märkte: Yahoo Finance (inoffiziell, `User-Agent` nötig, nacheinander mit 300 ms Pause) → `maerkte.json` (eigenes Format) und daraus `boersenplaetze.json`; ein ausgefallener Wert kommt einzeln aus der alten Datei, eine kaputte `config/maerkte.json` lässt beide alten Dateien stehen. Veränderung aus `meta.previousClose`, nie `chartPreviousClose` (bei `range=5d` der Schluss vor 5 Tagen).
- Ebenen-Optionen in `EBENEN`: `form: 'flaeche'` färbt Länder über `land` ein (Umrisse aus `config/laender.geojson`, liegen unter den Ortsnamen), `cluster: true` = Zahlenblasen, `deckkraft` = durchsichtige Kreise, `liste: false` = nicht in „Neueste Ereignisse“. Ein einziger Klick-Handler nimmt das oberste Zeichen.
- `package.json`: einzige Abhängigkeit `fast-xml-parser` (RSS/XML im Skript). Die Action macht `npm ci`.
- Kartenzeichen: SVG-Pfade in `FORMEN` (24er-Raster), Ebene wählt sie mit `form`. `kreis` wird als MapLibre-Kreis gezeichnet, alle anderen als Bild je Stufe. Größe nach `wert` über `skala` in `EBENEN`.
- Schritt 5, Live-TV und Webcams: Beide Panels teilen `playerStarten` (YouTube-iframe stumm, Fehler/offline kommen per `postMessage` zurück und ersetzen den Player durch einen Hinweis mit Link). Live-TV liest `config/sender.json` direkt im Browser (`tvZeichnen`, Wahl in `localStorage`). Webcams: `camsZeichnen` baut die Kacheln nur neu, wenn sich die Liste ändert (laufende Streams überstehen das 5-Minuten-Neuladen); Region-Filter und Raster/Einzeln nur per `hidden`/CSS; höchstens `CAMS_MAX` gleichzeitig (Einzelansicht: 1). Ein Klick auf die Kamera in der Karte ruft `webcamOeffnen` statt eines Popups.
- Schritt 5, Wetter: Ebene `radar` hat `raster: true` und keine Daten-Datei. `radarZeichnen` holt `weather-maps.json` von RainViewer direkt im Browser (nur wenn die Ebene an ist, höchstens alle `RADAR_MIN` Minuten), legt Quelle und Ebene erst dann an und ersetzt sie bei neuem Bild. Kostenloser Zugang seit 2026: `maxzoom: 7`, Farbschema 2, Pflicht-Quellenangabe mit Link (steht als `attribution` an der Quelle). Ebene `temperaturen` (`form: 'temperatur'`, Text statt Symbol, Farbe nach `wert` aus `--kalt` … `--heiss`) kommt aus `temperaturen()` im Skript: ein Open-Meteo-Abruf für alle Einträge mit `"wetter": true` in `config/orte.json`. Ebene `webcams` nutzt `farbe: 'kamera'` (feste Ebenen-Farbe, Bilder dafür entstehen aus `FARBNAMEN`).
- `.github/workflows/aktualisieren.yml`: alle 30 Min., per Knopf und bei Push auf `main` → Skript → GitHub Pages.
- Panel „Märkte“ (`maerkteZeichnen`): Reiter = `gruppe` aus den Daten, gewählter Reiter in `localStorage`, Mini-Verlauf als Inline-SVG.
- `config/`: Listen, die Max selbst ändern kann: `sender.json` (nur der Browser liest sie: `name`, `kanalId` oder `videoId`, `sprache`), `webcams.json` (`name`, `ort`, `land`, `region`, optional `lat`/`lon`, `videoId` oder `kanalId`; das Skript prüft das ID-Format und schreibt `data/webcams.json`, `ohneOrt: true` in `QUELLEN`), `nachrichten-quellen.json`, `konfliktzonen.json`, `maerkte.json` (Yahoo-Symbole; optional `boerse`, `lat`, `lon` = Punkt auf der Ebene Börsenplätze), `orte.json` (Länder mit Hauptstadt-Koordinaten, Städte/Regionen, Fallen-Wörter; Codes = Natural Earth `ADM0_A3`). `laender.geojson` = Natural Earth 110m (Palästina aus 50m, sonst fehlt Gaza), nur `ADM0_A3`, `name`, Geometrie. Wird mit veröffentlicht, die Seite lädt `laender.geojson` direkt. `data/` wird erzeugt und ist nicht im Repo.

## Datenformat (alle Ebenen)
`data/<ebene>.json` = `{ ebene, aktualisiert, eintraege: [{ id, titel, text, lat, lon, zeit, stufe, wert?, laufend?, link, quelle }] }`
- `stufe` ist immer `hoch`, `erhoeht` oder `beobachtung`. `wert` ist optional und bestimmt die Punktgröße.
- `laufend` ist optional: `true` = Ereignis dauert noch an. Zeitfilter blendet es nicht aus, die 7-Tage-Grenze im Skript gilt nicht, Popup zeigt „läuft noch, zuletzt aktualisiert vor …“.
- Seit Schritt 3 optional: `land` (Natural-Earth-Code `ADM0_A3`), `sprache` (`de`/`en`). **Formatänderung:** Nur in `nachrichten.json` dürfen `lat`/`lon` fehlen (kein Ort erkannt → nur Liste). `nachrichten.json` hat optional `webzAbruf` (letzter webz.io-Abruf, für das 3-Stunden-Budget); webz-Meldungen haben eine `id`, die mit `webz-` beginnt.
- Seit Schritt 4 optional: `farbe` (`plus`/`minus`/`grau`, CSS-Variablen) ersetzt auf Karte und im Popup die Stufen-Farbe (Börsenplätze). `stufe` bleibt Pflicht.
- Seit Schritt 5 optional: `region`, `videoId`, `kanalId` (nur `webcams.json`). **Formatänderung:** Auch in `webcams.json` dürfen `lat`/`lon` fehlen (Weltraum-Kameras, nur Panel). Dort ist `land` nicht gesetzt (`land` ist sonst der Ländercode); der Landesname steht im `text`. `temperaturen.json`: `wert` = °C, `stufe` immer `beobachtung` (ohne Bedeutung).
- Eigenes Format `data/maerkte.json` = `{ aktualisiert, werte: [{ name, symbol, gruppe, kurs, waehrung, aenderungProzent, verlauf: [...] }] }` (`kurs`/`waehrung`/`aenderungProzent` können `null` sein).
- `data/status.json` = `{ aktualisiert, quellen: [{ name, ebene, ok, anzahl, fehler }] }`
- Spätere Schritte dürfen nur **optionale** Felder ergänzen. Muss sich das Format ändern: das ausdrücklich sagen und README und CLAUDE.md anpassen.

## Regeln
- **Nie API-Schlüssel in Code oder Repo**, nur GitHub Secrets → Umgebungsvariablen im Skript. Ohne Schlüssel muss alles andere weiterlaufen.
- Jede Quelle darf ausfallen, ohne dass etwas anderes kaputtgeht (alte Daten bleiben stehen).
- Nachrichten: nur Titel, kurzer Anrisstext und Link zum Original, keine ganzen Artikel kopieren.
- Datenquellen auf der Karte (Quellenangabe) und im README nennen. Open-Meteo gilt nur für nicht-kommerzielle Nutzung; RainViewer verlangt „Weather data by Rain Viewer“ mit Link.
- YouTube-Streams nie fest einbauen, sondern nur über `config/`: Livestream-IDs ändern sich. Nie eine ID raten oder aus dem Gedächtnis eintragen; leer lassen und Max erklären, wie er sie füllt.
- Kein Build-Schritt, keine Frameworks, neue Abhängigkeiten nur mit gutem Grund.
- Nach jedem Schritt README (Stand + Quellentabelle) aktualisieren.
- Vor „fertig“ lokal testen (`npm ci`, `node scripts/daten-holen.mjs`, dann `python -m http.server 5190`); die Browser-Konsole muss fehlerfrei sein.
