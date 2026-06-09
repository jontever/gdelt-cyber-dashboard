/**
 * Fetches recent cyber events from GDELT's free raw CSV feed.
 * GDELT publishes new GKG files every 15 minutes at data.gdeltproject.org.
 * No BigQuery, no cost.
 */

import { CyberEvent } from './queries';

const LAST_UPDATE_URL = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';

const CYBER_THEMES = [
  'CYBER_ATTACK',
  'WB_2318_CYBERSECURITY',
  'HACKING',
  'TAX_FNCACT_HACKER',
  'DISINFORMATION',
  'PROPAGANDA',
];

function isCyberArticle(themes: string): boolean {
  return CYBER_THEMES.some((t) => themes.includes(t));
}

function parseLocation(raw: string): string {
  // GDELT location format: TYPE#NAME#COUNTRY#ADM1#LAT#LON#ID;...
  const first = raw.split(';')[0];
  return first?.split('#')[1] ?? '';
}

function parseTone(raw: string): number {
  // V2Tone format: tone,positive,negative,polarity,...
  return parseFloat(raw.split(',')[0]) || 0;
}

function parseThemes(raw: string): string[] {
  return raw.split(';').filter((t) => CYBER_THEMES.some((c) => t.startsWith(c)));
}

/**
 * GKG v2 TSV column indices (0-based).
 * Full spec: http://data.gdeltproject.org/documentation/GDELT-Global_Knowledge_Graph_Codebook-V2.1.pdf
 */
const COL = {
  DATE: 1,
  SOURCE_NAME: 3,
  URL: 4,
  THEMES: 7,
  LOCATIONS: 9,
  ORGANIZATIONS: 13,
  TONE: 15,
};

export async function getRecentCyberEventsFromCSV(): Promise<CyberEvent[]> {
  // Step 1: get the URL of the latest GKG file
  const listRes = await fetch(LAST_UPDATE_URL, { cache: 'no-store' });
  if (!listRes.ok) throw new Error(`Failed to fetch GDELT update list: ${listRes.status}`);

  const listText = await listRes.text();

  // Each line: size hash url — the GKG line contains "gkg"
  const gkgLine = listText.split('\n').find((l) => l.includes('.gkg.'));
  if (!gkgLine) throw new Error('No GKG file found in GDELT update list');

  const gkgUrl = gkgLine.trim().split(' ')[2];
  if (!gkgUrl) throw new Error('Could not parse GKG URL');

  // Step 2: download the zip
  const zipRes = await fetch(gkgUrl, { cache: 'no-store' });
  if (!zipRes.ok) throw new Error(`Failed to fetch GKG zip: ${zipRes.status}`);

  const buffer = await zipRes.arrayBuffer();

  // Step 3: decompress — use DecompressionStream (available in Node 18+ / Edge)
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  // GKG zips use DEFLATE. We need to skip the ZIP local file header first.
  const view = new Uint8Array(buffer);
  // Find start of compressed data (after local file header)
  // Local file header: PK\x03\x04, filename length at offset 26, extra length at offset 28
  const headerOffset = 30 + view[26] + (view[27] << 8) + view[28] + (view[29] << 8);

  writer.write(view.slice(headerOffset));
  writer.close();

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const tsv = new TextDecoder().decode(merged);

  // Step 4: parse TSV and filter for cyber articles
  const events: CyberEvent[] = [];
  for (const line of tsv.split('\n')) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    const themes = cols[COL.THEMES] ?? '';
    if (!isCyberArticle(themes)) continue;

    const dateRaw = cols[COL.DATE] ?? '';
    events.push({
      date: dateRaw.slice(0, 8),
      time: dateRaw.slice(8, 14),
      source: cols[COL.SOURCE_NAME] ?? 'Unknown',
      url: cols[COL.URL] ?? '',
      tone: parseTone(cols[COL.TONE] ?? ''),
      locations: parseLocation(cols[COL.LOCATIONS] ?? ''),
      organizations: cols[COL.ORGANIZATIONS] ?? '',
      themes: parseThemes(themes),
    });
  }

  return events.slice(0, 50);
}
