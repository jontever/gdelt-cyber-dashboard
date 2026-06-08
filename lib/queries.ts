/**
 * GDELT BigQuery query library — cybersecurity focus.
 *
 * All queries are designed to stay well within:
 *   - Vercel Hobby 10-second function timeout
 *   - BigQuery free tier (1 TB/month query processing)
 *
 * Cost-control rules applied throughout:
 *   1. Always filter on DATE first (integer partition key) to prune scan size.
 *   2. Use LIMIT aggressively on live queries.
 *   3. Heavier trend queries are only called server-side with ISR caching.
 */

import { getBigQueryClient } from './bigquery';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CyberEvent {
  date: string;        // YYYYMMDD
  time: string;        // HHMMSS
  source: string;
  url: string;
  tone: number;        // negative = hostile coverage, positive = positive framing
  locations: string;
  organizations: string;
  themes: string[];
}

export interface DayTrend {
  day: string;         // YYYYMMDD
  cyber_attacks: number;
  hacking: number;
  info_ops: number;
  avg_tone: number;
}

export interface TopActor {
  name: string;
  mentions: number;
  avg_tone: number;
}

// ─── Theme filter ─────────────────────────────────────────────────────────────

// GDELT GKG theme codes relevant to cybersecurity.
// THEMES column is semicolon-delimited, so LIKE '%THEME%' is the right approach.
const CYBER_THEME_FILTER = `
  (
    THEMES LIKE '%CYBER_ATTACK%'
    OR THEMES LIKE '%WB_2318_CYBERSECURITY%'
    OR THEMES LIKE '%HACKING%'
    OR THEMES LIKE '%INFORMATION_OPERATIONS%'
    OR THEMES LIKE '%TAX_FNCACT_HACKER%'
  )
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Recent cyber events — last 24 hours, up to 50 rows.
 * Designed for a live API route: fast scan, small result set.
 * Typical BigQuery scan: ~200–400 MB. Well within free tier.
 */
export async function getRecentCyberEvents(): Promise<CyberEvent[]> {
  const query = `
    SELECT
      SUBSTR(CAST(DATE AS STRING), 1, 8)  AS date,
      SUBSTR(CAST(DATE AS STRING), 9, 6)  AS time,
      COALESCE(SourceCommonName, 'Unknown') AS source,
      DocumentIdentifier                   AS url,
      CAST(SPLIT(Tone, ',')[OFFSET(0)] AS FLOAT64) AS tone,
      COALESCE(Locations, '')              AS locations,
      COALESCE(Organizations, '')          AS organizations,
      THEMES                               AS themes_raw
    FROM \`gdelt-bq.gdeltv2.gkg\`
    WHERE
      DATE >= CAST(
        CONCAT(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)), '000000')
        AS INT64
      )
      AND ${CYBER_THEME_FILTER}
    ORDER BY DATE DESC
    LIMIT 50
  `;

  const bigquery = await getBigQueryClient();
  const [rows] = await bigquery.query({ query, useLegacySql: false });

  return rows.map((r: Record<string, unknown>) => ({
    date: String(r.date),
    time: String(r.time),
    source: String(r.source),
    url: String(r.url),
    tone: typeof r.tone === 'number' ? r.tone : 0,
    locations: String(r.locations),
    organizations: String(r.organizations),
    themes: String(r.themes_raw)
      .split(';')
      .filter((t) => t.startsWith('CYBER') || t.startsWith('WB_2318') || t.startsWith('HACKING') || t.startsWith('INFORMATION') || t.startsWith('TAX_FNCACT_HACKER')),
  }));
}

/**
 * 7-day daily trend — event counts by theme category + average tone.
 * Heavier scan (~1–2 GB). Cache this with ISR (revalidate: 3600).
 * Do NOT call this from a live API route.
 */
export async function getCyberTrends(): Promise<DayTrend[]> {
  const bigquery = await getBigQueryClient();
  const query = `
    SELECT
      SUBSTR(CAST(DATE AS STRING), 1, 8)                   AS day,
      COUNTIF(THEMES LIKE '%CYBER_ATTACK%')                AS cyber_attacks,
      COUNTIF(THEMES LIKE '%HACKING%' OR THEMES LIKE '%TAX_FNCACT_HACKER%') AS hacking,
      COUNTIF(THEMES LIKE '%INFORMATION_OPERATIONS%')      AS info_ops,
      ROUND(AVG(CAST(SPLIT(Tone, ',')[OFFSET(0)] AS FLOAT64)), 2) AS avg_tone
    FROM \`gdelt-bq.gdeltv2.gkg\`
    WHERE
      DATE >= CAST(
        CONCAT(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)), '000000')
        AS INT64
      )
      AND ${CYBER_THEME_FILTER}
    GROUP BY day
    ORDER BY day ASC
  `;

  const [rows] = await bigquery.query({ query, useLegacySql: false });

  return rows.map((r: Record<string, unknown>) => ({
    day: String(r.day),
    cyber_attacks: Number(r.cyber_attacks) || 0,
    hacking: Number(r.hacking) || 0,
    info_ops: Number(r.info_ops) || 0,
    avg_tone: Number(r.avg_tone) || 0,
  }));
}

/**
 * Top organizations mentioned in cyber coverage — last 48 hours.
 * Uses UNNEST on semicolon-split to count per-org mentions.
 * Moderate scan. Cache with ISR (revalidate: 3600).
 */
export async function getTopActors(): Promise<TopActor[]> {
  const bigquery = await getBigQueryClient();
  const query = `
    SELECT
      TRIM(actor)                                                     AS name,
      COUNT(*)                                                        AS mentions,
      ROUND(AVG(CAST(SPLIT(Tone, ',')[OFFSET(0)] AS FLOAT64)), 2)    AS avg_tone
    FROM \`gdelt-bq.gdeltv2.gkg\`,
    UNNEST(SPLIT(Organizations, ';')) AS actor
    WHERE
      DATE >= CAST(
        CONCAT(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)), '000000')
        AS INT64
      )
      AND ${CYBER_THEME_FILTER}
      AND TRIM(actor) != ''
      AND LENGTH(TRIM(actor)) > 2
    GROUP BY name
    ORDER BY mentions DESC
    LIMIT 20
  `;

  const [rows] = await bigquery.query({ query, useLegacySql: false });

  return rows.map((r: Record<string, unknown>) => ({
    name: String(r.name),
    mentions: Number(r.mentions) || 0,
    avg_tone: Number(r.avg_tone) || 0,
  }));
}
