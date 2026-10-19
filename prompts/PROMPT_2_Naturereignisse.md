# Schritt 2 – Naturereignisse

> Für die Code-KI. Lies zuerst `CLAUDE.md` und `README.md`. Schritt 1 (Grundgerüst mit Erdbeben) ist gebaut und läuft auf GitHub Pages.

## Ziel

Neue Ebenen auf der Karte: **Waldbrände, Stürme, Vulkane, Überschwemmungen** und **Katastrophen-Warnungen (GDACS)**. Erdbeben gibt es schon. Alles läuft über das bestehende Daten-Skript und das einheitliche Datenformat.

## Erlaubte Abhängigkeit

`fast-xml-parser` zum Lesen von RSS/XML. Lege dafür `package.json` an, falls es sie noch nicht gibt, und lass die Action `npm ci` ausführen.

## Quellen

**1. NASA EONET** (kein Schlüssel)
`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30`

- Kategorien → Ebenen: `wildfires` → **Waldbrände**, `severeStorms` → **Stürme**, `volcanoes` → **Vulkane**, `floods` → **Überschwemmungen**. Andere Kategorien weglassen.
- Ein Ereignis hat oft mehrere Punkte (z. B. die Zugbahn eines Sturms). Nimm den **neuesten Punkt** als Position und dessen Datum als `zeit`.
- Ist die Geometrie ein Polygon, nimm dessen Mittelpunkt.
- Bei Stürmen steht die Windstärke oft in `magnitudeValue` (in kts). Diese als `wert` übernehmen und im `text` in km/h umrechnen.
- Stufe: Stürme ab 64 kts → `hoch`, ab 34 kts → `erhoeht`, sonst `beobachtung`. Vulkane → `erhoeht`. Waldbrände und Überschwemmungen → `beobachtung`. Die schweren Fälle zeigt ohnehin die GDACS-Ebene.
- `link`: die erste Quelle aus `sources`, sonst die EONET-Seite des Ereignisses.

**2. GDACS** (Katastrophen-Warnsystem von UN und EU, kein Schlüssel)
`https://www.gdacs.org/xml/rss.xml`

- Felder pro Eintrag: `geo:Point` (`geo:lat`, `geo:long`), `gdacs:alertlevel` (Green/Orange/Red), `gdacs:eventtype` (EQ, TC, FL, VO, DR, WF), Titel, Beschreibung, Link, Datum.
- Ebene **Katastrophen-Warnungen**. Stufe: Red → `hoch`, Orange → `erhoeht`, Green → `beobachtung`.
- Im `text` die Art auf Deutsch nennen (Erdbeben, Tropensturm, Überschwemmung, Vulkan, Dürre, Waldbrand).

## Neues optionales Feld `laufend`

EONET-Ereignisse mit Status „open“ dauern oft Wochen (z. B. Vulkane). Sie bekommen `"laufend": true`. Für sie gilt:

- Der Zeitfilter blendet sie **nicht** aus.
- Die 7-Tage-Grenze im Skript gilt nicht für sie.
- Im Popup steht „läuft noch, zuletzt aktualisiert vor …“.

Ergänze das Feld in der Format-Beschreibung in README und CLAUDE.md.

## Karte

- Jede neue Ebene kommt als Eintrag in `EBENEN`, mit eigenem Symbol oder eigener Form (z. B. Flamme, Wirbel, Dreieck, Tropfen, Warnschild). Die Farbe kommt weiterhin aus der Stufe. Einfache Formen oder Unicode-Symbole reichen, keine Bildbibliothek.
- Standardmäßig an: Erdbeben, Katastrophen-Warnungen, Stürme, Vulkane. Waldbrände (oft sehr viele) und Überschwemmungen sind standardmäßig aus.
- „i“-Texte für jede Ebene: was sie zeigt und woher die Daten kommen.
- Quellenangabe unten rechts um NASA EONET und GDACS ergänzen.

## Doku

README: Quellentabelle und „Stand“ aktualisieren.

## Fertig, wenn

- Das Skript erzeugt `waldbraende.json`, `stuerme.json`, `vulkane.json`, `ueberschwemmungen.json` und `gdacs.json`, und alle stehen in `status.json`.
- Alle Ebenen lassen sich an- und ausschalten, die Popups stimmen, laufende Ereignisse bleiben bei „1h“ sichtbar.
- Die Konsole ist fehlerfrei, die Action ist grün und die Online-Seite zeigt die neuen Ebenen.
- Zum Schluss erklärst du Max kurz, was neu ist.
