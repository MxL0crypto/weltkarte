// Holt alle Datenquellen und schreibt data/<ebene>.json und data/status.json.
// Lokal starten: npm ci (einmal), dann node scripts/daten-holen.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

const ORDNER = new URL('../data/', import.meta.url);
const SIEBEN_TAGE = 7 * 24 * 60 * 60 * 1000;
const STUFEN = ['hoch', 'erhoeht', 'beobachtung'];

// Neue Quelle = neue Funktion + ein Eintrag hier.
const QUELLEN = [
  { name: 'USGS Erdbeben', ebene: 'erdbeben', holen: erdbeben },
  { name: 'NASA EONET Waldbrände', ebene: 'waldbraende', holen: eonet('wildfires') },
  { name: 'NASA EONET Stürme', ebene: 'stuerme', holen: eonet('severeStorms') },
  { name: 'NASA EONET Vulkane', ebene: 'vulkane', holen: eonet('volcanoes') },
  { name: 'NASA EONET Überschwemmungen', ebene: 'ueberschwemmungen', holen: eonet('floods') },
  { name: 'GDACS Katastrophen-Warnungen', ebene: 'gdacs', holen: gdacs },
];

async function abruf(url, als = 'json') {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`);
  return res[als]();
}

async function erdbeben() {
  const daten = await abruf('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
  return daten.features.map(f => {
    const p = f.properties;
    const [lon, lat, tiefe] = f.geometry.coordinates;
    const m = p.mag == null ? undefined : Math.round(p.mag * 10) / 10;
    return {
      id: f.id,
      titel: p.title,
      text: `Tiefe ${Math.round(tiefe)} km` + (p.tsunami === 1 ? ' · Tsunami-Hinweis' : ''),
      lat,
      lon,
      zeit: new Date(p.time).toISOString(),
      stufe: m >= 6 ? 'hoch' : m >= 5 ? 'erhoeht' : 'beobachtung',
      wert: m,
      link: p.url,
      quelle: 'USGS',
    };
  });
}

function eonet(kategorie) {
  // Vulkane ohne Tage-Grenze: EONET aktualisiert sie nur alle paar Monate, mit days=30 wäre die Ebene immer leer.
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=${kategorie}`
    + (kategorie === 'volcanoes' ? '' : '&days=30');
  return async () => (await abruf(url)).events.map(ev => {
    const p = ev.geometry.reduce((a, b) => (Date.parse(b.date) > Date.parse(a.date) ? b : a)); // neuester Punkt
    // Polygon: Mittelwert der Eckpunkte. shortcut: falsch bei Flächen über die Datumsgrenze, dann Längen vorher verschieben.
    const [lon, lat] = p.type === 'Polygon'
      ? p.coordinates[0].reduce((s, [x, y]) => [s[0] + x, s[1] + y], [0, 0]).map(v => v / p.coordinates[0].length)
      : p.coordinates;
    const kts = p.magnitudeUnit === 'kts' ? p.magnitudeValue : undefined;
    return {
      id: ev.id,
      titel: ev.title,
      text: kts ? `Wind bis ${Math.round(kts * 1.852)} km/h` : ev.description || undefined,
      lat,
      lon,
      zeit: new Date(p.date).toISOString(),
      stufe: kategorie === 'volcanoes' ? 'erhoeht' : kts >= 64 ? 'hoch' : kts >= 34 ? 'erhoeht' : 'beobachtung',
      wert: kts,
      link: ev.sources[0]?.url || ev.link,
      quelle: 'NASA EONET',
      laufend: !ev.closed,
    };
  });
}

const GDACS_ART = { EQ: 'Erdbeben', TC: 'Tropensturm', FL: 'Überschwemmung', VO: 'Vulkan', DR: 'Dürre', WF: 'Waldbrand' };
const GDACS_STUFE = { Red: 'hoch', Orange: 'erhoeht', Green: 'beobachtung' };
const GDACS_FARBE = { Red: 'Rot', Orange: 'Orange', Green: 'Grün' };

async function gdacs() {
  const xml = new XMLParser({ isArray: name => name === 'item' }).parse(await abruf('https://www.gdacs.org/xml/rss.xml', 'text'));
  return (xml.rss.channel.item || [])
    // Grüne Waldbrände (oft über 150) weglassen: sie würden die Warnungen zudecken und stehen in der Ebene Waldbrände.
    .filter(i => !(i['gdacs:eventtype'] === 'WF' && i['gdacs:alertlevel'] === 'Green'))
    .map(i => {
      const typ = i['gdacs:eventtype'];
      const art = GDACS_ART[typ] || typ;
      const stufe = i['gdacs:alertlevel'];
      const name = typ === 'TC' && i['gdacs:eventname'];
      return {
        id: String(i.guid),
        titel: `${art}${name ? ` ${name}` : ''} – ${i['gdacs:country'] || 'unbekannter Ort'}`,
        text: `${art}, Warnstufe ${GDACS_FARBE[stufe] || stufe}. ${i['gdacs:severity'] || ''}`.trim(),
        lat: Number(i['geo:Point']?.['geo:lat']),
        lon: Number(i['geo:Point']?.['geo:long']),
        zeit: new Date(i['gdacs:todate'] || i.pubDate).toISOString(),
        stufe: GDACS_STUFE[stufe] || 'beobachtung',
        link: i.link,
        quelle: 'GDACS',
      };
    });
}

// Gemeinsames Datenformat prüfen: kaputte Einträge fliegen raus, statt die Karte zu stören.
function gueltig(e) {
  return e && e.id && e.titel && Number.isFinite(e.lat) && Number.isFinite(e.lon)
    && !Number.isNaN(Date.parse(e.zeit)) && STUFEN.includes(e.stufe);
}

// Bisher veröffentlichte Datei von der Live-Seite (GITHUB_REPOSITORY gibt es nur in der Action).
async function alteDaten(ebene) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('lokal: alte Datei bleibt einfach liegen');
  const [owner, name] = repo.split('/');
  return abruf(`https://${owner.toLowerCase()}.github.io/${name}/data/${ebene}.json`);
}

const jetzt = Date.now();
const status = { aktualisiert: new Date(jetzt).toISOString(), quellen: [] };
await mkdir(ORDNER, { recursive: true });

for (const q of QUELLEN) {
  let datei = null;
  let fehler = null;
  try {
    datei = { ebene: q.ebene, aktualisiert: status.aktualisiert, eintraege: await q.holen() };
  } catch (e) {
    fehler = e.message;
    try {
      datei = await alteDaten(q.ebene);
    } catch (e2) {
      console.warn(`  Keine alten Daten für ${q.ebene}: ${e2.message}`);
    }
  }
  if (datei) {
    // Laufende Ereignisse (z. B. Vulkane) dürfen älter als 7 Tage sein.
    datei.eintraege = (datei.eintraege || []).filter(e => gueltig(e) && (e.laufend || jetzt - Date.parse(e.zeit) <= SIEBEN_TAGE));
    await writeFile(new URL(`${q.ebene}.json`, ORDNER), JSON.stringify(datei));
  }
  status.quellen.push({ name: q.name, ebene: q.ebene, ok: !fehler, anzahl: datei?.eintraege.length ?? 0, fehler });
  console.log(`${fehler ? '✗' : '✓'} ${q.name}: ${datei?.eintraege.length ?? 0} Einträge${fehler ? ` (Fehler: ${fehler})` : ''}`);
}

await writeFile(new URL('status.json', ORDNER), JSON.stringify(status, null, 2));
