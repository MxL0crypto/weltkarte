# Schritt 5 – Live-TV, Webcams, Wetter

> Für die Code-KI. Lies zuerst `CLAUDE.md` und `README.md`. Schritt 1–4 sind gebaut.

## Ziel

- Panel **„Live-TV“**: Nachrichtensender als YouTube-Livestream.
- Panel **„Live-Webcams“**: Webcams aus aller Welt, nach Region filterbar, dazu eine Kartenebene.
- Ebenen **Regenradar** und **Temperaturen**.

## 1. Live-TV

Liste in `config/sender.json`. Pro Sender: `name`, `kanalId`, `sprache` und optional `videoId`. Die Kanal-IDs unten sind am 19.10.2026 geprüft:

| Sender | YouTube-Kanal-ID |
|---|---|
| tagesschau | UC5NOEUbkLheQcaaRldYW5GA |
| WELT | UCZMsvbAhhRblVGXmEXW8TSA |
| DW News | UCknLrEdhRCp1aegoMqRaCZg |
| euronews | UCSrZ3UV4jOidv8ppoVuvW9Q |
| Al Jazeera English | UCNye-wNBqNL5ZzHSJj3l8Bg |
| FRANCE 24 English | UCQfwfsi5VrQ8yKZ-UWmAEFg |
| Sky News | UCoMdktPbSTixAyNGwb-UYkQ |
| Bloomberg Television | UCIALMKvObZNtJ6AmdCLP7Lg |

- Einbetten über `https://www.youtube.com/embed/live_stream?channel=<kanalId>`. Ist `videoId` gesetzt, wird stattdessen `https://www.youtube.com/embed/<videoId>` genommen. Das ist für Sender, bei denen die Kanal-Variante nicht klappt.
- **Teste jeden Sender im Browser.** Manche erlauben kein Einbetten oder haben gerade keinen Livestream. Such dann die aktuelle Livestream-Video-ID und trag sie als `videoId` ein, oder entferne den Sender und sag Max, welcher nicht ging.
- Panel: Sender-Knöpfe oben (wie auf dem World-Monitor-Screenshot), darunter ein 16:9-Player.
- Erst ein Klick auf „Live abspielen“ lädt den Player (spart Datenvolumen). Gestartet wird stumm, mit Knopf für Ton und Vollbild. Der zuletzt gewählte Sender wird in `localStorage` gemerkt.

## 2. Live-Webcams

Liste in `config/webcams.json`. Pro Webcam: `name`, `ort`, `land`, `region` (Europa · Nahost · Amerika · Asien · Afrika · Ozeanien · Weltraum), `lat`, `lon` und `videoId` oder `kanalId`.

- Startliste: ca. 12–16 bekannte 24/7-Livestreams auf YouTube, verteilt über alle Regionen. Zum Beispiel die Klagemauer in Jerusalem, die Skyline von Taipeh, Times Square, Shibuya in Tokio, Venedig, ein Hafen, die ISS (Weltraum). **Such die aktuellen Video-IDs im Web** und prüfe, ob sie laufen. Kannst du nicht suchen, lass `videoId` leer und erklär Max, wie er sie füllt: Livestream auf YouTube öffnen, in der Adresse den Teil nach `v=` kopieren.
- Panel: Regions-Filter `Alle · Nahost · Europa · Amerika · Asien · Afrika · Ozeanien · Weltraum`, darunter ein Raster mit 2 Spalten.
  - Jede Kachel zeigt Name und Ort mit Knopf „Abspielen“ (click-to-play). Höchstens 4 laufen gleichzeitig; startet eine fünfte, stoppt die älteste.
  - Ein Umschalter wechselt zwischen Raster und Einzelansicht.
- Ist ein Stream offline, zeigt die Kachel „Stream gerade offline“. Die Seite darf dadurch nicht kaputtgehen.
- **Ebene „Webcams“:** Kamera-Symbol an der Position. Ein Klick öffnet die Webcam im Panel und scrollt dorthin. Standardmäßig aus.

Hinweis: YouTube-Einbettungen gehen nicht über `file://`. Teste nur über den lokalen Webserver oder online.

## 3. Regenradar

- Quelle: RainViewer (kein Schlüssel). Abruf direkt im Browser: `https://api.rainviewer.com/public/weather-maps.json`. Nimm den neuesten Eintrag aus `radar.past`, Kachel-URL: `{host}{path}/256/{z}/{x}/{y}/<farbschema>/1_1.png`.
- Seit 01.01.2026 gilt für die kostenlose Nutzung: **maximal Zoom 7**, nur ein Farbschema, nur PNG, nur vergangene Radarbilder (keine Vorhersage), ca. 100 Abrufe pro Minute und IP. Pflicht ist eine sichtbare Quellenangabe „Weather data by Rain Viewer“ mit Link auf rainviewer.com. Lies trotzdem kurz rainviewer.com/api.html, ob sich etwas geändert hat. Setze `maxzoom: 7` an der Quelle; MapLibre vergrößert die Kacheln darüber hinaus automatisch.
- Raster-Ebene, halbtransparent (ca. 60 %), unter allen Punkten. Alle 10 Minuten auf den neuesten Stand bringen.
- „i“-Text: Radar gibt es nur dort, wo es Wetterradar gibt (v. a. Europa, Nordamerika, Teile Asiens/Ozeaniens). Quellenangabe „RainViewer“.
- Standardmäßig aus.

## 4. Temperaturen

- Quelle: Open-Meteo (kein Schlüssel, nur nicht-kommerziell). Ein einziger Abruf im Daten-Skript für ca. 50 Städte weltweit, mit mehreren Koordinaten kommagetrennt:
  `https://api.open-meteo.com/v1/forecast?latitude=<lat1>,<lat2>,…&longitude=<lon1>,<lon2>,…&current=temperature_2m,weather_code,wind_speed_10m`
- Welche Städte: Markiere in `config/orte.json` ca. 50 Großstädte über alle Kontinente mit `"wetter": true`.
- Speichern als `data/temperaturen.json`, im normalen Format. `wert` = Temperatur, `text` = Wetterlage auf Deutsch (aus `weather_code`) und Wind in km/h. Die Stufe ist hier unwichtig, also immer `beobachtung`.
- Ebene **Temperaturen:** Beschriftung „18°“ an der Stadt, gefärbt nach Temperatur (blau = kalt bis rot = heiß). Eigene Färbung, nicht die Stufen-Farben. Standardmäßig aus.

## Doku

README: Quellentabelle, „Stand“, wie Max einen Sender oder eine Webcam hinzufügt (Beispiel-Eintrag zeigen).

## Fertig, wenn

- Alle Sender in `sender.json` spielen (oder sind mit Begründung entfernt), und die Webcams laufen oder zeigen sauber „offline“.
- Regenradar und Temperaturen funktionieren in 2D und 3D.
- Auf dem Handy sind die Player bedienbar und nicht abgeschnitten.
- Die Konsole ist fehlerfrei und die Action ist grün.
- Zum Schluss erklärst du Max kurz, was neu ist und welche Sender oder Webcams nicht gingen.
