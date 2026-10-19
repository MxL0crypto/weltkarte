# Schritt 4 – Wirtschaft

> Für die Code-KI. Lies zuerst `CLAUDE.md` und `README.md`. Schritt 1–3 sind gebaut.

## Ziel

Ein Panel **„Märkte“** in der rechten Spalte mit Börsenindizes, Rohstoffen, Krypto und Wechselkursen. Dazu eine kleine Kartenebene **Börsenplätze**, die zeigt, wie die großen Börsen heute laufen.

## Werte

Liste in `config/maerkte.json`, damit Max selbst Werte hinzufügen kann. Pro Wert: `name`, `symbol`, `gruppe`. Startliste:

- **Indizes:** DAX `^GDAXI`, Euro Stoxx 50 `^STOXX50E`, S&P 500 `^GSPC`, Nasdaq `^IXIC`, Dow Jones `^DJI`, FTSE 100 `^FTSE`, Nikkei 225 `^N225`, Hang Seng `^HSI`
- **Rohstoffe:** Gold `GC=F`, Silber `SI=F`, Öl Brent `BZ=F`, Öl WTI `CL=F`, Erdgas `NG=F`, Kupfer `HG=F`
- **Krypto:** Bitcoin `BTC-EUR`, Ethereum `ETH-EUR`, Solana `SOL-EUR`
- **Devisen:** EUR/USD `EURUSD=X`, EUR/GBP `EURGBP=X`, EUR/CHF `EURCHF=X`, EUR/JPY `EURJPY=X`, EUR/CNY `EURCNY=X`

## Quelle: Yahoo Finance (kein Schlüssel, aber inoffiziell)

`https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?range=5d&interval=1h`
(am 19.10.2026 getestet, funktioniert mit gesetztem `User-Agent`-Header)

- Aus `meta`: aktueller Kurs `regularMarketPrice`, Vortagesschluss `chartPreviousClose` bzw. `previousClose`, Währung. Daraus die Veränderung in Prozent berechnen.
- Aus `indicators.quote[0].close`: die letzten ca. 24–48 Werte als Mini-Verlauf (Lücken mit `null` überspringen).
- Abrufe nacheinander mit ca. 300 ms Pause, nicht alle gleichzeitig.
- Ergebnis: `data/maerkte.json` (eigenes Format, im README beschreiben): `{ aktualisiert, werte: [{ name, symbol, gruppe, kurs, waehrung, aenderungProzent, verlauf: [...] }] }`.
- In `status.json` eintragen. Fällt Yahoo aus, die alten Werte von der Live-Seite behalten.
- Kommentar im Code: `// shortcut: Yahoo-Endpunkt ist inoffiziell und kann ohne Vorwarnung wegfallen; dann Krypto auf CoinGecko, Devisen auf frankfurter.app umstellen.`
- **Wenn Yahoo schon jetzt aus der GitHub Action blockt** (z. B. Fehler 429 oder 403), weiche gleich so aus: Krypto über CoinGecko `api.coingecko.com/api/v3/simple/price` und Devisen über `api.frankfurter.app/latest?from=EUR` (beide ohne Schlüssel, am 19.10.2026 getestet). Für Indizes und Rohstoffe gibt es keinen guten kostenlosen Ersatz: Twelve Data hat im Gratis-Plan keine Rohstoffe und kaum Indizes außerhalb der USA, Alpha Vantage nur 25 Abrufe pro Tag. Blende diese Reiter dann mit „keine Daten“ aus und sag Max Bescheid.

## Panel „Märkte“

- Reiter: `Indizes` · `Rohstoffe` · `Krypto` · `Devisen` (der zuletzt gewählte wird in `localStorage` gemerkt).
- Pro Zeile: Name, Kurs (deutsches Zahlenformat, passende Nachkommastellen), Veränderung in % (grün mit ▲ / rot mit ▼) und ein Mini-Verlauf als kleines Inline-SVG (keine Chart-Bibliothek).
- Unten klein: „Kurse verzögert, Stand HH:MM · keine Anlageberatung“.

## Ebene „Börsenplätze“

- Feste Punkte: Frankfurt (DAX), New York (S&P 500), London (FTSE 100), Tokio (Nikkei), Hongkong (Hang Seng).
- Farbe nach Tagesveränderung des jeweiligen Index: grün = plus, rot = minus, grau = keine Daten. Das ist eine eigene Färbung, nicht die Stufen-Farben.
- Popup: Index, Kurs, Veränderung.
- Standardmäßig aus.

## Doku

README: Quellentabelle, „Stand“, wie Max einen Wert hinzufügt (Symbol bei finance.yahoo.com suchen und in `config/maerkte.json` eintragen).

## Fertig, wenn

- `data/maerkte.json` hat für alle Werte Kurse, auch beim Lauf in der GitHub Action (dort prüfen, nicht nur lokal).
- Panel, Reiter, Mini-Verläufe und die Börsenplatz-Ebene funktionieren, auch auf dem Handy.
- Die Konsole ist fehlerfrei und die Action ist grün.
- Zum Schluss erklärst du Max kurz, was neu ist.
