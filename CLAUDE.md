# Weltkarte – Projektregeln

Live-Weltkarte im Stil von World Monitor. Bauplan in `prompts/` (nicht anfassen). Referenz-Screenshots von World Monitor liegen in `referenz/` (nicht im Repo).

## Zusammenarbeit
- Max kann nicht programmieren: auf Deutsch erklären, einfach, mit Klick-Anleitungen statt Fachbegriffen.
- Oberfläche komplett auf Deutsch.

## Aufbau
- `index.html`: gesamte Oberfläche (HTML, CSS, JS in einer Datei). Ebenen stehen zentral im Array `EBENEN`, Farben als CSS-Variablen in `:root`. Neue Panels der rechten Spalte als weitere `<section class="panel">`.
- `scripts/daten-holen.mjs`: holt alle Quellen (Node 22, eingebautes `fetch`), schreibt `data/<ebene>.json` und `data/status.json`. Neue Quelle = neue Funktion + Eintrag in `QUELLEN`. Nachrichten (viele RSS-Quellen → eine `nachrichten.json`, jede Quelle einzeln im Status) und daraus `brennpunkte.json` stehen als eigener Block am Ende. Ortserkennung (`ortFinden`) und Stufe (`STUFE_WORTE`, nach Sprache getrennt) ebenfalls dort; ein Selbsttest der bekannten Ort-Fallen läuft bei jedem Start (`console.assert`).
- Ebenen-Optionen in `EBENEN`: `form: 'flaeche'` färbt Länder über `land` ein (Umrisse aus `config/laender.geojson`, liegen unter den Ortsnamen), `cluster: true` = Zahlenblasen, `deckkraft` = durchsichtige Kreise, `liste: false` = nicht in „Neueste Ereignisse“. Ein einziger Klick-Handler nimmt das oberste Zeichen.
- `package.json`: einzige Abhängigkeit `fast-xml-parser` (RSS/XML im Skript). Die Action macht `npm ci`.
- Kartenzeichen: SVG-Pfade in `FORMEN` (24er-Raster), Ebene wählt sie mit `form`. `kreis` wird als MapLibre-Kreis gezeichnet, alle anderen als Bild je Stufe. Größe nach `wert` über `skala` in `EBENEN`.
- `.github/workflows/aktualisieren.yml`: alle 30 Min., per Knopf und bei Push auf `main` → Skript → GitHub Pages.
- `config/`: Listen, die Max selbst ändern kann: `nachrichten-quellen.json`, `konfliktzonen.json`, `orte.json` (Länder mit Hauptstadt-Koordinaten, Städte/Regionen, Fallen-Wörter; Codes = Natural Earth `ADM0_A3`). `laender.geojson` = Natural Earth 110m (Palästina aus 50m, sonst fehlt Gaza), nur `ADM0_A3`, `name`, Geometrie. Wird mit veröffentlicht, die Seite lädt `laender.geojson` direkt. `data/` wird erzeugt und ist nicht im Repo.

## Datenformat (alle Ebenen)
`data/<ebene>.json` = `{ ebene, aktualisiert, eintraege: [{ id, titel, text, lat, lon, zeit, stufe, wert?, laufend?, link, quelle }] }`
- `stufe` ist immer `hoch`, `erhoeht` oder `beobachtung`. `wert` ist optional und bestimmt die Punktgröße.
- `laufend` ist optional: `true` = Ereignis dauert noch an. Zeitfilter blendet es nicht aus, die 7-Tage-Grenze im Skript gilt nicht, Popup zeigt „läuft noch, zuletzt aktualisiert vor …“.
- Seit Schritt 3 optional: `land` (Natural-Earth-Code `ADM0_A3`), `sprache` (`de`/`en`). **Formatänderung:** Nur in `nachrichten.json` dürfen `lat`/`lon` fehlen (kein Ort erkannt → nur Liste). `nachrichten.json` hat optional `webzAbruf` (letzter webz.io-Abruf, für das 3-Stunden-Budget); webz-Meldungen haben eine `id`, die mit `webz-` beginnt.
- `data/status.json` = `{ aktualisiert, quellen: [{ name, ebene, ok, anzahl, fehler }] }`
- Spätere Schritte dürfen nur **optionale** Felder ergänzen. Muss sich das Format ändern: das ausdrücklich sagen und README und CLAUDE.md anpassen.

## Regeln
- **Nie API-Schlüssel in Code oder Repo**, nur GitHub Secrets → Umgebungsvariablen im Skript. Ohne Schlüssel muss alles andere weiterlaufen.
- Jede Quelle darf ausfallen, ohne dass etwas anderes kaputtgeht (alte Daten bleiben stehen).
- Nachrichten: nur Titel, kurzer Anrisstext und Link zum Original, keine ganzen Artikel kopieren.
- Datenquellen auf der Karte (Quellenangabe) und im README nennen.
- Kein Build-Schritt, keine Frameworks, neue Abhängigkeiten nur mit gutem Grund.
- Nach jedem Schritt README (Stand + Quellentabelle) aktualisieren.
- Vor „fertig“ lokal testen (`npm ci`, `node scripts/daten-holen.mjs`, dann `python -m http.server 5190`); die Browser-Konsole muss fehlerfrei sein.
