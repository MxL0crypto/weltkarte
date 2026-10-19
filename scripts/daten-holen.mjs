// Holt alle Datenquellen und schreibt data/<ebene>.json und data/status.json.
// Lokal starten: npm ci (einmal), dann node scripts/daten-holen.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

const ORDNER = new URL('../data/', import.meta.url);
const CONFIG = new URL('../config/', import.meta.url);
const STUNDE = 60 * 60 * 1000;
const SIEBEN_TAGE = 7 * 24 * STUNDE;
const STUFEN = ['hoch', 'erhoeht', 'beobachtung'];
const config = async datei => JSON.parse(await readFile(new URL(datei, CONFIG), 'utf8'));
const ORTE = await config('orte.json');
const LAENDER = new Map(ORTE.laender.map(l => [l.code, l]));

// Neue Quelle = neue Funktion + ein Eintrag hier. Nachrichten (viele Quellen, eine Datei) stehen weiter unten.
const QUELLEN = [
  { name: 'USGS Erdbeben', ebene: 'erdbeben', holen: erdbeben },
  { name: 'NASA EONET Waldbrände', ebene: 'waldbraende', holen: eonet('wildfires') },
  { name: 'NASA EONET Stürme', ebene: 'stuerme', holen: eonet('severeStorms') },
  { name: 'NASA EONET Vulkane', ebene: 'vulkane', holen: eonet('volcanoes') },
  { name: 'NASA EONET Überschwemmungen', ebene: 'ueberschwemmungen', holen: eonet('floods') },
  { name: 'GDACS Katastrophen-Warnungen', ebene: 'gdacs', holen: gdacs },
  { name: 'Konfliktzonen (eigene Liste)', ebene: 'konfliktzonen', holen: konfliktzonen },
];

async function abruf(url, als = 'json') {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  // Schlüssel nie in Fehlermeldungen, die landen öffentlich in status.json
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url.replace(/token=[^&]+/, 'token=***')}`);
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

async function konfliktzonen() {
  return (await config('konfliktzonen.json')).map(k => {
    const l = LAENDER.get(k.land);
    if (!l) throw new Error(`Unbekannter Ländercode "${k.land}" in config/konfliktzonen.json`);
    return {
      id: k.land, titel: k.name, text: k.beschreibung, lat: l.lat, lon: l.lon,
      zeit: new Date(k.stand).toISOString(), stufe: k.stufe, laufend: true, land: k.land, quelle: 'eigene Liste',
    };
  });
}

// Gemeinsames Datenformat prüfen: kaputte Einträge fliegen raus, statt die Karte zu stören.
// ohneOrt: Nachrichten ohne erkannten Ort dürfen lat/lon weglassen (nur Liste, nicht Karte).
function gueltig(e, ohneOrt = false) {
  return e && e.id && e.titel && (Number.isFinite(e.lat) && Number.isFinite(e.lon) || ohneOrt && e.lat == null && e.lon == null)
    && !Number.isNaN(Date.parse(e.zeit)) && STUFEN.includes(e.stufe);
}

// Bisher veröffentlichte Datei: in der Action von der Live-Seite, lokal die letzte eigene Datei.
async function alteDaten(ebene) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return JSON.parse(await readFile(new URL(`${ebene}.json`, ORDNER), 'utf8'));
  const [owner, name] = repo.split('/');
  return abruf(`https://${owner.toLowerCase()}.github.io/${name}/data/${ebene}.json`);
}

// ---- Nachrichten: Ort erkennen ----
// Ein Suchmuster pro Sprache: de/en-Hauptnamen der Länder gelten nur in ihrer Sprache ("Island" ist auf Englisch eine Insel).
function suchmuster(sprache) {
  const eintraege = [];
  const dazu = (woerter, ziel) => { for (const w of woerter || []) eintraege.push([w, ziel]); };
  for (const o of ORTE.orte) dazu([o.name, ...(o.varianten || [])], { rang: 0, land: o.land, lat: o.lat, lon: o.lon });
  for (const l of ORTE.laender) {
    dazu([sprache === 'de' ? l.de : l.en, ...(l.namen || [])], { rang: 1, land: l.code, lat: l.lat, lon: l.lon });
    dazu(l.woerter, { rang: 2, land: l.code, lat: l.lat, lon: l.lon });
  }
  dazu(ORTE.ignorieren, null); // null = Fundstelle verbrauchen, aber nicht werten
  const mehrdeutig = new Set(ORTE.mehrdeutig.map(w => w.toLowerCase()));
  const nurGross = new Set(ORTE.nurGross);
  const ziele = new Map(); // kleingeschrieben -> Ziel
  const teile = { klein: [], gross: [] };
  for (const [w, ziel] of eintraege) {
    const k = w.toLowerCase();
    if (mehrdeutig.has(k) || ziele.has(k)) continue;
    ziele.set(k, ziel);
    const exakt = nurGross.has(w) || (/[A-Z]/.test(w) && w === w.toUpperCase()); // US, UK, IDF … nie klein
    const ende = /sch$/i.test(w) ? '(?:e|en|er|es|em)?' : exakt ? '' : 's?'; // russische, Irans, Putins
    teile[exakt ? 'gross' : 'klein'].push([w.length, w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ende]);
  }
  // Längste zuerst, damit "Südsudan" vor "Sudan" und "Niger Delta" vor "Niger" greift; nur ganze Wörter
  const rx = (liste, flags) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${liste.sort((a, b) => b[0] - a[0]).map(x => x[1]).join('|')})(?![\\p{L}\\p{N}])`, flags);
  return { ziele, muster: [rx(teile.klein, 'giu'), rx(teile.gross, 'gu')] };
}
const SUCHE = { de: suchmuster('de'), en: suchmuster('en') };

// Felder in Reihenfolge der Wichtigkeit (Titel, Text, …). Der Titel zählt zuerst; darin schlägt Stadt/Region das Land
// und das Land das Adjektiv/die Person, dann zählt der erste Treffer. (Stadt im Text vor Land im Titel lag in der Stichprobe öfter falsch.)
function ortFinden(felder, sprache) {
  const { ziele, muster } = SUCHE[sprache === 'de' ? 'de' : 'en'];
  const ziel = wort => {
    const k = wort.toLowerCase();
    for (const v of [k, k.replace(/(?:e|en|er|es|em)$/, ''), k.replace(/s$/, '')]) if (ziele.has(v)) return ziele.get(v);
  };
  const treffer = felder.flatMap((text, f) => muster.flatMap(rx => [...(text || '').matchAll(rx)]
    .map(t => ({ f, pos: t.index, ende: t.index + t[0].length, ziel: ziel(t[0]) }))));
  // Überlappende Treffer (z. B. "New Guinea" ignoriert und "Guinea") nur einmal: der längere gewinnt
  treffer.sort((a, b) => a.f - b.f || a.pos - b.pos || b.ende - a.ende);
  const behalten = treffer.filter((t, i) => !treffer.slice(0, i).some(v => v.f === t.f && v.ende > t.pos && v.pos <= t.pos));
  return behalten.filter(t => t.ziel).sort((a, b) => a.f - b.f || a.ziel.rang - b.ziel.rang || a.pos - b.pos)[0]?.ziel;
}

// Selbsttest der bekannten Fallen, läuft bei jedem Start mit
for (const [text, sprache, land] of [
  ['Georgia votes for governor', 'en'], ['Chad Smith wins award', 'en'], ['Michael Jordan returns', 'en'],
  ['roast turkey recipes', 'en'], ['Island nations meet', 'en'], ['Turkey hosts talks', 'en', 'TUR'],
  ['Niger junta expels envoy', 'en', 'NER'], ['Nigeria floods', 'en', 'NGA'], ['Talks in Washington', 'en', 'USA'],
  ['Russian drones hit Kyiv', 'en', 'UKR'], ['Island: Vulkan bricht aus', 'de', 'ISL'], ['Irans Präsident warnt', 'de', 'IRN'],
  ['russische Angriffe auf Charkiw', 'de', 'UKR'], ['US-Armee verlegt Truppen', 'de', 'USA'], ['Tote im Südsudan', 'de', 'SDS'],
]) console.assert(ortFinden([text], sprache)?.land === land, `Ortserkennung: "${text}" sollte ${land || 'keinen Ort'} ergeben`);

// ---- Nachrichten: Stufe ----
// Nach Sprache getrennt (das deutsche "war" ist kein "war"). Deutsch als Wortteil, damit "Drohnenangriff" zählt.
const STUFE_WORTE = {
  de: [
    ['hoch', /angriff|attacke|luftschlag|rakete|explosion|anschlag|todesopfer|getötet|erschossen|\btote[nr]?\b|krieg|massaker|geisel|bombe|bombard|beschuss|gefecht|terror/i],
    ['erhoeht', /protest|unruhen|sanktion|spannungen|evakuier|putsch|festnahme|festgenommen|verhaft|demonstr|zusammenstö|ausnahmezustand|ausgangssperre|plünder|eskalation/i],
  ],
  en: [
    ['hoch', /\b(attacks?|attacked|air ?strikes?|missiles?|rockets?|explosions?|blasts?|bomb(s|ing|ed)?|kill(s|ed|ing)?|dead|death toll|wars?|massacres?|hostages?|shelling|gunmen|casualties|invasion|terror\w*|beheaded)\b/i],
    ['erhoeht', /\b(protests?|protesters?|unrest|riots?|sanctions?|tensions?|evacuat\w*|coup|arrests?|arrested|detain(s|ed)?|crackdown|clash(es)?|curfew|state of emergency|escalat\w*|demonstrat\w*|looting)\b/i],
  ],
};
const stufeVon = (text, sprache) => STUFE_WORTE[sprache === 'de' ? 'de' : 'en'].find(([, rx]) => rx.test(text))?.[0] || 'beobachtung';

// ---- Nachrichten: einlesen ----
const ENTITAETEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function sauber(s) {
  return String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (z, e) => e[0] !== '#' ? ENTITAETEN[e.toLowerCase()] ?? z
      : String.fromCodePoint(/x/i.test(e[1]) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)))
    .replace(/[​-‏⁠﻿]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
const kurz = (s, n = 300) => s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n) > n / 2 ? s.lastIndexOf(' ', n) : n) + ' …';

// Gemeinsamer Weg für RSS und webz.io: nur Titel, kurzer Anriss, Link, Zeit, Quelle – nie ganze Artikel.
function meldung({ id, titel, text, link, zeit, quelle, sprache, zusatz }) {
  titel = sauber(titel);
  text = sauber(text);
  const ort = ortFinden([titel, text, zusatz], sprache);
  const t = Date.parse(zeit);
  return {
    id: String(id || link), titel, text: kurz(text) || undefined,
    ...(ort && { lat: ort.lat, lon: ort.lon, ...(ort.land && { land: ort.land }) }),
    zeit: Number.isNaN(t) ? '' : new Date(t).toISOString(), // leer = ungültig, fliegt bei gueltig() raus
    stufe: stufeVon(`${titel} ${text}`, sprache),
    link, quelle, sprache,
  };
}

const XML = new XMLParser({ ignoreAttributes: false, parseTagValue: false, isArray: n => n === 'item' || n === 'entry' });
const feld = v => { v = Array.isArray(v) ? v[0] : v; return String((v && typeof v === 'object' ? v['#text'] : v) ?? '').trim(); };

// RSS 2.0, RDF/RSS 1.0 (DW) und Atom
async function rss(q) {
  const xml = XML.parse(await abruf(q.url, 'text'));
  const items = xml.rss?.channel?.item || xml['rdf:RDF']?.item || xml.feed?.entry;
  if (!items) throw new Error('Kein RSS-, RDF- oder Atom-Feed erkannt');
  return items.map(i => {
    const link = typeof i.link === 'object'
      ? [].concat(i.link).find(l => (l['@_rel'] ?? 'alternate') === 'alternate')?.['@_href']
      : feld(i.link);
    return meldung({
      id: feld(i.guid ?? i.id) || link, titel: feld(i.title), text: feld(i.description ?? i.summary ?? i.content),
      link, zeit: feld(i.pubDate ?? i['dc:date'] ?? i.published ?? i.updated), quelle: q.name, sprache: q.sprache,
    });
  });
}

// webz.io (optional): höchstens alle 3 Stunden, dazwischen die alten webz-Meldungen weiterverwenden.
const WEBZ_ABSTAND = 3 * STUNDE;
async function webz(alt) {
  const vorher = alt?.eintraege?.filter(m => m.id.startsWith('webz-')) || [];
  if (Date.now() - Date.parse(alt?.webzAbruf) < WEBZ_ABSTAND) return { abruf: alt.webzAbruf, liste: vorher };
  const q = '(category:"War, Conflict and Unrest" OR category:"Disaster and Accident" OR category:politics)'
    + ` (language:english OR language:german) published:>${Date.now() - 24 * STUNDE}`;
  const daten = await abruf(`https://api.webz.io/api/news?token=${encodeURIComponent(process.env.WEBZ_API_KEY)}&q=${encodeURIComponent(q)}`);
  return {
    abruf: new Date().toISOString(),
    liste: (daten.posts || []).map(p => meldung({
      id: `webz-${p.uuid || p.url}`, titel: p.title, text: p.summary || p.text, link: p.url, zeit: p.published,
      quelle: p.thread?.site || 'webz.io', sprache: p.language === 'german' ? 'de' : 'en',
      // thread.country ist das Land der Website, nicht des Ereignisses; darum nur die erkannten Orte als Notnagel
      zusatz: (p.entities?.locations || []).map(l => l.name).join(', '),
    })).concat(vorher), // ältere webz-Meldungen behalten, die 48-Stunden-Grenze räumt auf
  };
}

// Gleicher Link oder fast gleicher Titel (mind. 80 % gleiche Wörter) = doppelt
const wortmenge = t => new Set(t.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
function ohneDoppelte(liste) {
  const behalten = [];
  for (const m of liste) {
    const w = wortmenge(m.titel);
    const doppelt = behalten.some(b => (m.link && b.link === m.link) || (() => {
      const gleich = [...w].filter(x => b.w.has(x)).length;
      return gleich / (w.size + b.w.size - gleich) >= 0.8;
    })());
    if (!doppelt) behalten.push({ ...m, w });
  }
  return behalten.map(({ w, ...m }) => m);
}

// Länder mit vielen Meldungen in den letzten 24 Stunden, gewichtet nach Stufe
const GEWICHT = { hoch: 3, erhoeht: 2, beobachtung: 1 };
const BRENNPUNKT = { ab: 8, erhoeht: 15, hoch: 30 }; // Punktzahl: ab wann ein Land erscheint, ab wann erhöht/hoch
function brennpunkte(meldungen, jetzt) {
  const proLand = new Map();
  for (const m of meldungen) {
    if (!m.land || jetzt - Date.parse(m.zeit) > 24 * STUNDE) continue;
    const b = proLand.get(m.land) || { wert: 0, anzahl: 0, hoch: 0, neueste: m };
    b.wert += GEWICHT[m.stufe];
    b.anzahl++;
    if (m.stufe === 'hoch') b.hoch++;
    if (m.zeit > b.neueste.zeit) b.neueste = m;
    proLand.set(m.land, b);
  }
  return [...proLand].filter(([, b]) => b.wert >= BRENNPUNKT.ab).map(([code, b]) => {
    const l = LAENDER.get(code);
    return {
      id: code, titel: `${l.de}: ${b.anzahl} Meldungen in 24 Std.`,
      text: `Punktzahl ${b.wert} (hoch zählt 3, erhöht 2, sonst 1), davon ${b.hoch} mit Stufe hoch. Zuletzt: „${b.neueste.titel}“`,
      lat: l.lat, lon: l.lon, zeit: new Date(jetzt).toISOString(), laufend: true,
      stufe: b.wert >= BRENNPUNKT.hoch ? 'hoch' : b.wert >= BRENNPUNKT.erhoeht ? 'erhoeht' : 'beobachtung',
      wert: b.wert, land: code, link: b.neueste.link, quelle: 'Auswertung der Nachrichten',
    };
  });
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
  melden(q.name, q.ebene, fehler, datei?.eintraege.length ?? 0);
}

function melden(name, ebene, fehler, anzahl) {
  status.quellen.push({ name, ebene, ok: !fehler, anzahl, fehler });
  console.log(`${fehler ? '✗' : '✓'} ${name}: ${anzahl} Einträge${fehler ? ` (Fehler: ${fehler})` : ''}`);
}

// ---- Nachrichten: viele Quellen, eine Datei. Fällt eine Quelle aus, kommen ihre Meldungen aus der alten Datei. ----
const alt = await alteDaten('nachrichten').catch(() => null);
const meldungen = [];
const quelleAlt = test => (alt?.eintraege || []).filter(test);
for (const q of await config('nachrichten-quellen.json')) {
  let liste, fehler = null;
  try {
    liste = await rss(q);
  } catch (e) {
    fehler = e.message;
    liste = quelleAlt(m => m.quelle === q.name && !m.id.startsWith('webz-'));
  }
  meldungen.push(...liste);
  melden(q.name, 'nachrichten', fehler, liste.length);
}
let webzAbruf;
if (process.env.WEBZ_API_KEY) { // ohne Schlüssel einfach weglassen
  let liste, fehler = null;
  try {
    ({ abruf: webzAbruf, liste } = await webz(alt));
  } catch (e) {
    fehler = e.message;
    liste = quelleAlt(m => m.id.startsWith('webz-'));
    webzAbruf = alt?.webzAbruf;
  }
  meldungen.push(...liste);
  melden('webz.io', 'nachrichten', fehler, liste.length);
}
const nachrichten = ohneDoppelte(meldungen
  .filter(m => gueltig(m, true) && jetzt - Date.parse(m.zeit) <= 48 * STUNDE)
  .sort((a, b) => Date.parse(b.zeit) - Date.parse(a.zeit)));
await writeFile(new URL('nachrichten.json', ORDNER),
  JSON.stringify({ ebene: 'nachrichten', aktualisiert: status.aktualisiert, ...(webzAbruf && { webzAbruf }), eintraege: nachrichten }));
console.log(`  = ${nachrichten.length} Nachrichten, davon ${nachrichten.filter(m => m.lat != null).length} mit Ort`);

const heiss = brennpunkte(nachrichten, jetzt);
await writeFile(new URL('brennpunkte.json', ORDNER), JSON.stringify({ ebene: 'brennpunkte', aktualisiert: status.aktualisiert, eintraege: heiss }));
melden('Brennpunkte (aus den Nachrichten)', 'brennpunkte', null, heiss.length);

await writeFile(new URL('status.json', ORDNER), JSON.stringify(status, null, 2));
