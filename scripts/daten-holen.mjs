// Holt alle Datenquellen und schreibt data/<ebene>.json und data/status.json.
// Lokal starten: node scripts/daten-holen.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const ORDNER = new URL('../data/', import.meta.url);
const SIEBEN_TAGE = 7 * 24 * 60 * 60 * 1000;
const STUFEN = ['hoch', 'erhoeht', 'beobachtung'];

// Neue Quelle = neue Funktion + ein Eintrag hier.
const QUELLEN = [
  { name: 'USGS Erdbeben', ebene: 'erdbeben', holen: erdbeben },
];

async function json(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`);
  return res.json();
}

async function erdbeben() {
  const daten = await json('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
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
  return json(`https://${owner.toLowerCase()}.github.io/${name}/data/${ebene}.json`);
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
    datei.eintraege = (datei.eintraege || []).filter(e => gueltig(e) && jetzt - Date.parse(e.zeit) <= SIEBEN_TAGE);
    await writeFile(new URL(`${q.ebene}.json`, ORDNER), JSON.stringify(datei));
  }
  status.quellen.push({ name: q.name, ebene: q.ebene, ok: !fehler, anzahl: datei?.eintraege.length ?? 0, fehler });
  console.log(`${fehler ? '✗' : '✓'} ${q.name}: ${datei?.eintraege.length ?? 0} Einträge${fehler ? ` (Fehler: ${fehler})` : ''}`);
}

await writeFile(new URL('status.json', ORDNER), JSON.stringify(status, null, 2));
