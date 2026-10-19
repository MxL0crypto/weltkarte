# Schritt 3 – Nachrichten & Krisen

> Für die Code-KI. Lies zuerst `CLAUDE.md` und `README.md`. Schritt 1 und 2 sind gebaut.

## Ziel

- Aktuelle Nachrichten aus deutschen und internationalen Quellen erscheinen als Punkte auf der Karte und als Liste in der rechten Spalte.
- Neue Ebene **Brennpunkte**: Länder, über die gerade besonders viel berichtet wird.
- Neue Ebene **Konfliktzonen**: Länder in bewaffneten Konflikten werden eingefärbt.
- Optional kommt **webz.io** als weitere Quelle dazu (nur wenn Max einen Schlüssel einträgt).

## 1. Nachrichtenquellen (RSS, kein Schlüssel)

Liste in `config/nachrichten-quellen.json`, damit Max selbst Quellen hinzufügen oder entfernen kann. Pro Quelle: `name`, `url`, `sprache` (`de`/`en`). Startliste (alle am 19.10.2026 getestet und erreichbar):

| Name | URL | Sprache |
|---|---|---|
| tagesschau | https://www.tagesschau.de/xml/rss2/ | de |
| DW (Deutsch) | https://rss.dw.com/rdf/rss-de-all | de |
| SPIEGEL Ausland | https://www.spiegel.de/ausland/index.rss | de |
| BBC World | https://feeds.bbci.co.uk/news/world/rss.xml | en |
| Al Jazeera | https://www.aljazeera.com/xml/rss/all.xml | en |
| The Guardian World | https://www.theguardian.com/world/rss | en |
| France 24 | https://www.france24.com/en/rss | en |
| DW (English) | https://rss.dw.com/rdf/rss-en-all | en |
| UN News | https://news.un.org/feed/subscribe/en/news/all/rss.xml | en |

- Der Parser muss RSS 2.0, RDF/RSS 1.0 (DW) und Atom verstehen. Dafür ist `fast-xml-parser` schon vorhanden.
- Pro Meldung nur **Titel, kurzen Anrisstext (max. ca. 300 Zeichen, HTML entfernt), Link, Zeit, Quelle**, nie ganze Artikel.
- Doppelte Meldungen (gleicher Link oder fast gleicher Titel) nur einmal speichern. Nur die letzten 48 Stunden behalten.
- Jede Quelle einzeln in `status.json` aufführen. Fällt eine Quelle aus, laufen die anderen weiter.

## 2. Ort erkennen

RSS-Meldungen haben keine Koordinaten. Ordne sie über eine Ortsliste zu:

- Lege `config/orte.json` an: alle Länder (ISO-3-Code, deutscher und englischer Name, gängige Varianten und Adjektive wie „russisch“, „Russian“, „ukrainische“, „Israeli“) mit Koordinaten (Hauptstadt oder Mittelpunkt). Dazu ca. 200 wichtige Städte und Krisenregionen (z. B. Kiew/Kyiv, Gaza, Westjordanland/West Bank, Donbas, Khartum, Darfur, Taiwanstraße, Rotes Meer) mit Koordinaten und Land.
- Gesucht wird in Titel und Anrisstext, ohne Groß-/Kleinschreibung, nur ganze Wörter. Eine Stadt oder Region schlägt das Land. Bei mehreren Treffern zählt der erste im Titel.
- Bekannte Fallen abfangen: „Georgia“ (US-Staat/Land), „Jordan“ und „Chad“ (Vornamen), „Turkey“ (Truthahn), „Niger“ vs. „Nigeria“, „Washington“ (= USA-Politik, Punkt auf Washington D.C.). Solche Wörter nur werten, wenn sie großgeschrieben sind, oder als mehrdeutig markieren.
- Meldungen ohne erkannten Ort kommen nur in die Liste, nicht auf die Karte.
- Neue Felder pro Eintrag (optional, bitte in README und CLAUDE.md ergänzen): `land` (ISO-3), `sprache`.

## 3. Stufe einer Meldung

Schlagwortlisten auf Deutsch und Englisch (im Skript oder in `config/`):

- **hoch:** Angriff, Luftangriff, Rakete, Explosion, Anschlag, Tote, getötet, Krieg, Massaker, Geiseln … / attack, airstrike, missile, explosion, killed, dead, war, massacre, hostages …
- **erhöht:** Proteste, Unruhen, Sanktionen, Spannungen, Evakuierung, Putsch, Festnahmen … / protest, unrest, sanctions, tensions, evacuation, coup …
- Sonst: **beobachtung**.

## 4. Ebenen auf der Karte

- **Nachrichten:** Punkte mit MapLibre-Clustering (mehrere Meldungen am selben Ort werden zu einer Zahlenblase, Klick zoomt hinein). Das Popup zeigt Titel, Quelle, Zeit, Anrisstext und „Artikel öffnen ↗“.
- **Brennpunkte:** Berechne im Skript pro Land die Meldungen der letzten 24 Stunden, gewichtet nach Stufe (hoch = 3, erhöht = 2, beobachtung = 1). Länder mit hohem Wert bekommen einen großen, halbtransparenten Kreis (`wert` = Punktzahl, Stufe nach Schwellen). Speichern als `data/brennpunkte.json` im normalen Format.
- **Konfliktzonen:**
  - Lege `config/konfliktzonen.json` an mit `land` (ISO-3, Natural-Earth-Feld `ADM0_A3`), `name`, `stufe`, `beschreibung` (1 Satz, neutral formuliert), `stand` (Datum).
  - Fülle die Liste mit den aktuell laufenden bewaffneten Konflikten nach deinem Wissen und schreib Max hinterher die Liste mit dem Hinweis, dass er sie prüfen soll.
  - Ländergrenzen: einmalig das Natural-Earth-110m-Länder-GeoJSON laden, auf `ADM0_A3`, Name und Geometrie kürzen und als `config/laender.geojson` ins Repo legen. Wichtig: `ADM0_A3` nehmen, nicht `ISO_A3`, weil dort z. B. Frankreich und Norwegen `-99` haben.
  - Die Länder werden halbtransparent nach Stufe gefüllt, mit dünnem Rand. Die Ebene liegt unter allen Punkten. Ein Klick zeigt Name, Beschreibung und Stand.

## 5. Panel „Live-Nachrichten“ (rechte Spalte, ganz oben)

- Neueste Meldungen zuerst. Pro Zeile: Stufen-Punkt, Titel, Quelle, „vor 12 Min.“.
- Filter-Knöpfe: `Alle` · `Deutsch` · `International` · `Nur hoch`.
- Klick auf eine Meldung: Hat sie einen Ort, fliegt die Karte dorthin und öffnet das Popup. Der Link zum Artikel öffnet in einem neuen Tab.
- Der Zeitfilter der Karte gilt auch für die Liste.

## 6. Optional: webz.io

Nur aktiv, wenn die Umgebungsvariable `WEBZ_API_KEY` gesetzt ist. Sonst überspringen, ohne Fehler.

- Der kostenlose Plan erlaubt ca. **1.000 Abrufe pro Monat**, liefert nur Anrisstexte und ist nur für nicht-kommerzielle Nutzung.
- Die API hat sich zuletzt geändert. Max' Screenshot zeigt `https://api.webz.io/api/news?q=…`, ältere Doku zeigt `newsApiLite`. **Lies die aktuelle Doku auf docs.webz.io**, bevor du den Abruf baust.
- **Budget:** höchstens alle 3 Stunden ein Abruf (8 pro Tag, ca. 240 pro Monat). Läuft die Action dazwischen, die letzten webz-Daten von der Live-Seite übernehmen (wie bei ausgefallenen Quellen).
- Abfrage zum Beispiel: Kategorien Krieg/Konflikt/Unruhen, Katastrophen, Politik, englisch und deutsch. Der Ort kommt aus dem Länderfeld der Antwort (ISO-2 → über `orte.json` auf ISO-3 und Koordinaten), sonst aus der Ortserkennung.
- Ergebnisse gehen in dieselbe Nachrichten-Ebene, mit `quelle` = Name der Website.
- In der Action `WEBZ_API_KEY: ${{ secrets.WEBZ_API_KEY }}` an das Skript geben.
- **Klick-Anleitung für Max:** webz.io → „Free API Key“ → registrieren → Token kopieren → GitHub-Repo → Settings → Secrets and variables → Actions → „New repository secret“ → Name `WEBZ_API_KEY`, Wert einfügen → speichern → im Tab „Actions“ den Lauf von Hand starten.

## Doku

README: Quellentabelle (inklusive webz.io als optional), „Stand“, wie Max eine Nachrichtenquelle hinzufügt und wie er Konfliktzonen ändert (Beispiel-Eintrag zeigen).

## Fertig, wenn

- `nachrichten.json`, `brennpunkte.json` und `status.json` (mit jeder Quelle einzeln) entstehen, ohne Schlüssel.
- Stichprobe aus 30 Meldungen: Mindestens 2/3 haben einen richtigen Ort, und keine offensichtlich falsche Zuordnung durch die bekannten Fallen.
- Clustering, Popups, Panel-Filter und Konfliktzonen funktionieren in 2D und 3D.
- Die Konsole ist fehlerfrei und die Action ist grün.
- Zum Schluss: Max bekommt die Konfliktzonen-Liste zum Prüfen und die webz.io-Anleitung.
