import { useEffect, useState, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntelPoint {
  id: string;
  type: 'conflict' | 'advisory' | 'business' | 'disease' | 'news';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'opportunity';
  position: [number, number, number]; // [lon, lat, alt]
  title: string;
  description: string;
  country?: string;
  source?: string;
  date?: string;
  url?: string;
  meta?: Record<string, any>;
}

export type IntelCategory = 'conflict' | 'advisory' | 'business' | 'disease' | 'news';

export const INTEL_COLORS: Record<string, [number, number, number, number]> = {
  critical: [239, 68, 68, 235],
  high: [249, 115, 22, 225],
  medium: [234, 179, 8, 215],
  low: [148, 163, 184, 185],
  opportunity: [34, 197, 94, 225],
};

export function severityColor(s: string): [number, number, number, number] {
  return INTEL_COLORS[s] ?? INTEL_COLORS.low;
}

// ─── Coordinate tables ────────────────────────────────────────────────────────
// [lat, lon]

export const COUNTRY_COORDS: Record<string, [number, number]> = {
  GLOBAL: [20, 0],
  AFGHANISTAN: [33.9, 67.7], ALBANIA: [41.2, 20.2], ALGERIA: [28.0, 1.7],
  ANGOLA: [-11.2, 17.9], ARGENTINA: [-38.4, -63.6], ARMENIA: [40.1, 45.0],
  AUSTRALIA: [-25.3, 133.8], AUSTRIA: [47.5, 14.6], AZERBAIJAN: [40.1, 47.6],
  BANGLADESH: [23.7, 90.4], BELARUS: [53.7, 28.0], BELGIUM: [50.5, 4.5],
  BENIN: [9.3, 2.3], BOLIVIA: [-16.3, -63.6], BOSNIA: [44.2, 17.7],
  BOTSWANA: [-22.3, 24.7], BRAZIL: [-14.2, -51.9], 'BURKINA FASO': [12.4, -1.6],
  BURUNDI: [-3.4, 29.9], CAMBODIA: [12.6, 104.9], CAMEROON: [3.8, 11.5],
  CANADA: [56.1, -106.3], 'CENTRAL AFRICAN REPUBLIC': [6.6, 20.9], CHAD: [15.5, 18.7],
  CHILE: [-35.7, -71.5], CHINA: [35.9, 104.2], COLOMBIA: [4.6, -74.3],
  CONGO: [-0.2, 15.8], 'DEMOCRATIC REPUBLIC OF CONGO': [-4.0, 21.8], DRC: [-4.0, 21.8],
  'COSTA RICA': [9.7, -83.8], CROATIA: [45.1, 15.2], CUBA: [21.5, -79.5],
  'CZECH REPUBLIC': [49.8, 15.5], DENMARK: [56.3, 9.5],
  'DOMINICAN REPUBLIC': [18.7, -70.2], ECUADOR: [-1.8, -78.2], EGYPT: [26.8, 30.8],
  'EL SALVADOR': [13.8, -88.9], ERITREA: [15.2, 39.8], ETHIOPIA: [9.1, 40.5],
  FINLAND: [64.0, 25.7], FRANCE: [46.2, 2.2], GABON: [-0.8, 11.6],
  GEORGIA: [42.3, 43.4], GERMANY: [51.2, 10.5], GHANA: [7.9, -1.0],
  GREECE: [39.1, 21.8], GUATEMALA: [15.8, -90.2], GUINEA: [11.0, -10.9],
  HAITI: [18.9, -72.3], HONDURAS: [15.2, -86.2], HUNGARY: [47.2, 19.5],
  INDIA: [20.6, 79.1], INDONESIA: [-0.8, 113.9], IRAN: [32.4, 53.7],
  IRAQ: [33.2, 43.7], IRELAND: [53.4, -8.2], ISRAEL: [31.5, 34.8],
  ITALY: [41.9, 12.6], JAMAICA: [18.1, -77.3], JAPAN: [36.2, 138.3],
  JORDAN: [31.2, 36.5], KAZAKHSTAN: [48.0, 67.0], KENYA: [0.0, 37.9],
  KUWAIT: [29.3, 47.5], KYRGYZSTAN: [41.2, 74.8], LAOS: [19.9, 102.5],
  LATVIA: [56.9, 24.6], LEBANON: [33.9, 35.5], LIBERIA: [6.4, -9.4],
  LIBYA: [26.3, 17.2], LITHUANIA: [55.2, 24.0], MADAGASCAR: [-18.8, 46.9],
  MALAWI: [-13.3, 34.3], MALAYSIA: [4.2, 108.0], MALI: [17.6, -2.0],
  MAURITANIA: [21.0, -10.9], MEXICO: [23.6, -102.6], MOLDOVA: [47.4, 28.4],
  MONGOLIA: [46.9, 103.8], MOROCCO: [31.8, -7.1], MOZAMBIQUE: [-18.7, 35.5],
  MYANMAR: [21.9, 95.9], NAMIBIA: [-22.9, 18.5], NEPAL: [28.4, 84.1],
  NETHERLANDS: [52.1, 5.3], 'NEW ZEALAND': [-40.9, 174.9], NICARAGUA: [12.9, -85.2],
  NIGER: [17.6, 8.1], NIGERIA: [9.1, 8.7], 'NORTH KOREA': [40.3, 127.5],
  NORWAY: [60.5, 8.5], OMAN: [21.5, 55.9], PAKISTAN: [30.4, 69.3],
  PALESTINE: [31.9, 35.2], 'PALESTINIAN TERRITORIES': [31.9, 35.2],
  GAZA: [31.35, 34.3], 'WEST BANK': [31.9, 35.3],
  PANAMA: [8.5, -80.8], PERU: [-9.2, -75.0], PHILIPPINES: [12.9, 121.8],
  POLAND: [51.9, 19.1], PORTUGAL: [39.4, -8.2], QATAR: [25.4, 51.2],
  ROMANIA: [45.9, 24.9], RUSSIA: [61.5, 105.3], RWANDA: [-1.9, 29.9],
  'SAUDI ARABIA': [23.9, 45.1], SENEGAL: [14.5, -14.5], SERBIA: [44.0, 21.0],
  'SIERRA LEONE': [8.5, -11.8], SINGAPORE: [1.4, 103.8], SOMALIA: [5.2, 46.2],
  'SOUTH AFRICA': [-30.6, 22.9], 'SOUTH KOREA': [35.9, 127.8],
  'SOUTH SUDAN': [7.9, 29.7], SPAIN: [40.5, -3.7], 'SRI LANKA': [7.9, 80.8],
  SUDAN: [12.9, 30.2], SWEDEN: [60.1, 18.6], SWITZERLAND: [46.8, 8.2],
  SYRIA: [34.8, 38.9], TAIWAN: [23.7, 120.9], TAJIKISTAN: [38.9, 71.3],
  TANZANIA: [-6.4, 34.9], THAILAND: [15.9, 100.9], TOGO: [8.6, 0.8],
  TURKEY: [38.9, 35.2], TURKMENISTAN: [39.0, 59.6], UGANDA: [1.4, 32.3],
  UKRAINE: [48.4, 31.2], 'UNITED ARAB EMIRATES': [24.0, 54.0], UAE: [24.0, 54.0],
  'UNITED KINGDOM': [55.4, -3.4], UK: [55.4, -3.4],
  'UNITED STATES': [37.1, -95.7], USA: [37.1, -95.7],
  URUGUAY: [-32.5, -55.8], UZBEKISTAN: [41.4, 64.6], VENEZUELA: [6.4, -66.6],
  VIETNAM: [14.1, 108.3], YEMEN: [15.6, 48.5], ZAMBIA: [-13.1, 27.8],
  ZIMBABWE: [-19.0, 29.2],
};

export const ISO3_COORDS: Record<string, [number, number]> = {
  AFG: [33.9, 67.7], AGO: [-11.2, 17.9], ALB: [41.2, 20.2], ARE: [24.0, 54.0],
  ARG: [-38.4, -63.6], ARM: [40.1, 45.0], AUS: [-25.3, 133.8], AZE: [40.1, 47.6],
  BDI: [-3.4, 29.9], BEN: [9.3, 2.3], BFA: [12.4, -1.6], BGD: [23.7, 90.4],
  BGR: [42.7, 25.5], BIH: [44.2, 17.7], BLR: [53.7, 28.0], BOL: [-16.3, -63.6],
  BRA: [-14.2, -51.9], BWA: [-22.3, 24.7], CAF: [6.6, 20.9], CAN: [56.1, -106.3],
  CHE: [46.8, 8.2], CHL: [-35.7, -71.5], CHN: [35.9, 104.2], CIV: [7.5, -5.5],
  CMR: [3.8, 11.5], COD: [-4.0, 21.8], COG: [-0.2, 15.8], COL: [4.6, -74.3],
  DEU: [51.2, 10.5], DNK: [56.3, 9.5], DZA: [28.0, 1.7], ECU: [-1.8, -78.2],
  EGY: [26.8, 30.8], ERI: [15.2, 39.8], ESP: [40.5, -3.7], ETH: [9.1, 40.5],
  FIN: [64.0, 25.7], FRA: [46.2, 2.2], GAB: [-0.8, 11.6], GBR: [55.4, -3.4],
  GEO: [42.3, 43.4], GHA: [7.9, -1.0], GIN: [11.0, -10.9], GRC: [39.1, 21.8],
  GTM: [15.8, -90.2], HTI: [18.9, -72.3], HUN: [47.2, 19.5], IDN: [-0.8, 113.9],
  IND: [20.6, 79.1], IRN: [32.4, 53.7], IRQ: [33.2, 43.7], ISR: [31.5, 34.8],
  ITA: [41.9, 12.6], JOR: [31.2, 36.5], JPN: [36.2, 138.3], KAZ: [48.0, 67.0],
  KEN: [0.0, 37.9], KGZ: [41.2, 74.8], KHM: [12.6, 104.9], KOR: [35.9, 127.8],
  KWT: [29.3, 47.5], LAO: [19.9, 102.5], LBN: [33.9, 35.5], LBR: [6.4, -9.4],
  LBY: [26.3, 17.2], LKA: [7.9, 80.8], MAR: [31.8, -7.1], MDA: [47.4, 28.4],
  MDG: [-18.8, 46.9], MEX: [23.6, -102.6], MLI: [17.6, -2.0], MMR: [21.9, 95.9],
  MNG: [46.9, 103.8], MOZ: [-18.7, 35.5], MRT: [21.0, -10.9], MWI: [-13.3, 34.3],
  MYS: [4.2, 108.0], NAM: [-22.9, 18.5], NER: [17.6, 8.1], NGA: [9.1, 8.7],
  NLD: [52.1, 5.3], NOR: [60.5, 8.5], NPL: [28.4, 84.1], OMN: [21.5, 55.9],
  PAK: [30.4, 69.3], PER: [-9.2, -75.0], PHL: [12.9, 121.8], POL: [51.9, 19.1],
  PRT: [39.4, -8.2], PSE: [31.9, 35.2], QAT: [25.4, 51.2], ROU: [45.9, 24.9],
  RUS: [61.5, 105.3], RWA: [-1.9, 29.9], SAU: [23.9, 45.1], SDN: [12.9, 30.2],
  SEN: [14.5, -14.5], SLE: [8.5, -11.8], SOM: [5.2, 46.2], SRB: [44.0, 21.0],
  SSD: [7.9, 29.7], SYR: [34.8, 38.9], TCD: [15.5, 18.7], TGO: [8.6, 0.8],
  THA: [15.9, 100.9], TJK: [38.9, 71.3], TUR: [38.9, 35.2], TZA: [-6.4, 34.9],
  UGA: [1.4, 32.3], UKR: [48.4, 31.2], URY: [-32.5, -55.8], USA: [37.1, -95.7],
  UZB: [41.4, 64.6], VEN: [6.4, -66.6], VNM: [14.1, 108.3], YEM: [15.6, 48.5],
  ZAF: [-30.6, 22.9], ZMB: [-13.1, 27.8], ZWE: [-19.0, 29.2],
};

export const ISO2_COORDS: Record<string, [number, number]> = {
  AF: [33.9, 67.7], AO: [-11.2, 17.9], AL: [41.2, 20.2], AE: [24.0, 54.0],
  AR: [-38.4, -63.6], AM: [40.1, 45.0], AU: [-25.3, 133.8], AZ: [40.1, 47.6],
  BD: [23.7, 90.4], BY: [53.7, 28.0], BE: [50.5, 4.5], BJ: [9.3, 2.3],
  BO: [-16.3, -63.6], BA: [44.2, 17.7], BW: [-22.3, 24.7], BR: [-14.2, -51.9],
  BF: [12.4, -1.6], BI: [-3.4, 29.9], KH: [12.6, 104.9], CM: [3.8, 11.5],
  CA: [56.1, -106.3], CF: [6.6, 20.9], TD: [15.5, 18.7], CL: [-35.7, -71.5],
  CN: [35.9, 104.2], CO: [4.6, -74.3], CD: [-4.0, 21.8], CG: [-0.2, 15.8],
  DE: [51.2, 10.5], DK: [56.3, 9.5], DZ: [28.0, 1.7], EC: [-1.8, -78.2],
  EG: [26.8, 30.8], ER: [15.2, 39.8], ES: [40.5, -3.7], ET: [9.1, 40.5],
  FI: [64.0, 25.7], FR: [46.2, 2.2], GA: [-0.8, 11.6], GB: [55.4, -3.4],
  GE: [42.3, 43.4], GH: [7.9, -1.0], GN: [11.0, -10.9], GR: [39.1, 21.8],
  GT: [15.8, -90.2], HT: [18.9, -72.3], HU: [47.2, 19.5], ID: [-0.8, 113.9],
  IN: [20.6, 79.1], IR: [32.4, 53.7], IQ: [33.2, 43.7], IL: [31.5, 34.8],
  IT: [41.9, 12.6], JO: [31.2, 36.5], JP: [36.2, 138.3], KZ: [48.0, 67.0],
  KE: [0.0, 37.9], KG: [41.2, 74.8], KR: [35.9, 127.8], KW: [29.3, 47.5],
  LA: [19.9, 102.5], LB: [33.9, 35.5], LR: [6.4, -9.4], LY: [26.3, 17.2],
  LK: [7.9, 80.8], MA: [31.8, -7.1], MD: [47.4, 28.4], MG: [-18.8, 46.9],
  MX: [23.6, -102.6], ML: [17.6, -2.0], MM: [21.9, 95.9], MN: [46.9, 103.8],
  MZ: [-18.7, 35.5], MR: [21.0, -10.9], MW: [-13.3, 34.3], MY: [4.2, 108.0],
  NA: [-22.9, 18.5], NE: [17.6, 8.1], NG: [9.1, 8.7], NL: [52.1, 5.3],
  NO: [60.5, 8.5], NP: [28.4, 84.1], OM: [21.5, 55.9], PK: [30.4, 69.3],
  PE: [-9.2, -75.0], PH: [12.9, 121.8], PL: [51.9, 19.1], PT: [39.4, -8.2],
  PS: [31.9, 35.2], QA: [25.4, 51.2], RO: [45.9, 24.9], RU: [61.5, 105.3],
  RW: [-1.9, 29.9], SA: [23.9, 45.1], SD: [12.9, 30.2], SN: [14.5, -14.5],
  SL: [8.5, -11.8], SG: [1.4, 103.8], SO: [5.2, 46.2], RS: [44.0, 21.0],
  SS: [7.9, 29.7], SY: [34.8, 38.9], CH: [46.8, 8.2], TW: [23.7, 120.9],
  TJ: [38.9, 71.3], TZ: [-6.4, 34.9], TH: [15.9, 100.9], TG: [8.6, 0.8],
  TR: [38.9, 35.2], TM: [39.0, 59.6], UG: [1.4, 32.3], UA: [48.4, 31.2],
  UY: [-32.5, -55.8], US: [37.1, -95.7], UZ: [41.4, 64.6], VE: [6.4, -66.6],
  VN: [14.1, 108.3], YE: [15.6, 48.5], ZA: [-30.6, 22.9], ZM: [-13.1, 27.8],
  ZW: [-19.0, 29.2],
};

function extractCountryFromTitle(title: string): string {
  const t = title.toLowerCase();
  for (const key of Object.keys(COUNTRY_COORDS)) {
    if (key === 'GLOBAL') continue;
    const regex = new RegExp(`\\b${key.toLowerCase()}\\b`, 'i');
    if (regex.test(t)) return key;
  }
  return '';
}

function jitter(n: number, amount = 1.5): number {
  return n + (Math.random() - 0.5) * amount;
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchWithProxy(url: string, asXml = false): Promise<any> {
  try {
    const pUrl = `/api/proxy?url=${encodeURIComponent(url)}&asXml=${asXml}`;
    const res = await fetch(pUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('Proxy failed');
    if (asXml) return await res.text();
    return await res.json();
  } catch (err) {
    throw new Error('Proxy fetch failed for ' + url);
  }
}

async function fetchACLEDConflicts(): Promise<IntelPoint[]> {
  try {
    const res = await fetch('/api/acled', { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('ACLED failed');
    const text = await res.text();
    
    if (!text || text.startsWith('<') || text.startsWith('{')) throw new Error('non-CSV');
    const [header, ...rows] = text.trim().split('\n');
    const cols = header.split(',').map((h: string) => h.replace(/"/g, '').trim());
    return rows.map((line: string, i: number) => {
      const vals = line.split(',').map((v: string) => v.replace(/"/g, '').trim());
      const row: Record<string, string> = Object.fromEntries(cols.map((c: string, j: number) => [c, vals[j] ?? '']));
      const lat = parseFloat(row.latitude), lon = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lon)) return null;
      const f = parseInt(row.fatalities || '0');
      const severity: IntelPoint['severity'] =
        f > 100 ? 'critical' : f > 20 ? 'high' : f > 5 ? 'medium' : 'low';
      return {
        id: `acled-${row.event_id_cnty || i}`, type: 'conflict', severity,
        position: [lon, lat, 0],
        title: `${row.event_type || 'Conflict'} – ${row.country}`,
        description: row.notes?.slice(0, 200) || `${row.actor1} vs ${row.actor2}`.trim(),
        country: row.country, source: 'ACLED', date: row.event_date,
        meta: { fatalities: f, actor1: row.actor1, actor2: row.actor2, eventType: row.event_type },
      } as IntelPoint;
    }).filter(Boolean) as IntelPoint[];
  } catch {
    return [];
  }
}

async function fetchGDELTNews(): Promise<IntelPoint[]> {
  try {
    const q = 'conflict OR war OR attack OR crisis OR protest OR killed OR displaced OR ceasefire OR humanitarian';
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=50&format=json&timespan=24h&sort=DateDesc`;
    const data = await fetchWithProxy(url);
    if (!data.articles?.length) throw new Error('empty');
    const seen = new Set<string>();
    return (data.articles as any[]).map((a, i) => {
      const country = (a.sourcecountry ?? '').toUpperCase();
      const coords = COUNTRY_COORDS[country];
      if (!coords || seen.has(country)) return null;
      seen.add(country);
      const tone = parseFloat(a.tone ?? '0');
      const severity: IntelPoint['severity'] =
        tone < -8 ? 'critical' : tone < -4 ? 'high' : tone < -1 ? 'medium' : 'low';
      return {
        id: `gdelt-${i}`, type: 'news', severity,
        position: [coords[1], coords[0], 0],
        title: a.title?.slice(0, 80) ?? 'News',
        description: a.title ?? '',
        country: a.sourcecountry ?? '', source: a.domain ?? 'GDELT',
        date: a.seendate?.slice(0, 8) ?? new Date().toISOString().slice(0, 10),
        url: a.url,
        meta: { tone, language: a.language },
      } as IntelPoint;
    }).filter(Boolean) as IntelPoint[];
  } catch { return []; }
}

async function fetchPremiumNews(): Promise<IntelPoint[]> {
  try {
    const res = await fetch('/api/intelligence', { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('API');
    const { newsData, currents, guardian } = await res.json();
    const points: IntelPoint[] = [];
    const seen = new Set<string>();

    if (newsData?.results) {
      for (const item of newsData.results) {
        const countryName = item.country?.[0] || extractCountryFromTitle(item.title) || extractCountryFromTitle(item.description || '');
        if (!countryName) continue;
        const coords = COUNTRY_COORDS[countryName.toUpperCase()];
        if (!coords || seen.has(item.title)) continue;
        seen.add(item.title);
        points.push({
          id: `nd-${item.source_id}-${Math.random()}`, type: 'news', severity: 'medium',
          position: [jitter(coords[1]), jitter(coords[0]), 0],
          title: item.title?.slice(0, 80), description: item.description?.slice(0, 200) || '',
          country: countryName, source: item.source_name || 'NewsData.io',
          date: item.pubDate?.slice(0, 10), url: item.link || '', meta: {}
        });
      }
    }

    if (currents?.news) {
      for (const item of currents.news) {
        const countryName = extractCountryFromTitle(item.title) || extractCountryFromTitle(item.description || '');
        if (!countryName) continue;
        const coords = COUNTRY_COORDS[countryName.toUpperCase()];
        if (!coords || seen.has(item.title)) continue;
        seen.add(item.title);
        points.push({
          id: `cur-${item.id}`, type: 'news', severity: 'medium',
          position: [jitter(coords[1]), jitter(coords[0]), 0],
          title: item.title?.slice(0, 80), description: item.description?.slice(0, 200) || '',
          country: countryName, source: 'Currents API',
          date: item.published?.slice(0, 10), url: item.url || '', meta: {}
        });
      }
    }

    if (guardian?.response?.results) {
      for (const item of guardian.response.results) {
        const title = item.fields?.headline || item.webTitle;
        const desc = item.fields?.trailText || '';
        const countryName = extractCountryFromTitle(title) || extractCountryFromTitle(desc);
        if (!countryName) continue;
        const coords = COUNTRY_COORDS[countryName.toUpperCase()];
        if (!coords || seen.has(title)) continue;
        seen.add(title);
        points.push({
          id: `grd-${item.id}`, type: 'news', severity: 'medium',
          position: [jitter(coords[1]), jitter(coords[0]), 0],
          title: title.slice(0, 80), description: desc.slice(0, 200) || '',
          country: countryName, source: 'The Guardian',
          date: item.webPublicationDate?.slice(0, 10), url: item.webUrl || '', meta: {}
        });
      }
    }

    return points;
  } catch {
    return [];
  }
}

async function fetchGlobalNewsRSS(): Promise<IntelPoint[]> {
  try {
    const feeds = [
      { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
      { url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', source: 'UN News' },
    ];
    
    const results: IntelPoint[] = [];
    for (const feed of feeds) {
      try {
        const xml = await fetchWithProxy(feed.url, true);
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
        
        let count = 0;
        for (const item of items) {
          if (count >= 15) break;
          const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
          const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ?? item.match(/<description>(.*?)<\/description>/)?.[1] ?? '';
          const desc = descMatch.replace(/<[^>]+>/g, '').trim();
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
          const dateStr = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? new Date().toISOString();
          
          const titleClean = title.toLowerCase();
          const descClean = desc.toLowerCase();
          
          let country = extractCountryFromTitle(title) || extractCountryFromTitle(desc);
          
          // Fallbacks for specific conflicts
          if (!country && (titleClean.includes('palestine') || titleClean.includes('gaza') || descClean.includes('gaza') || descClean.includes('palestine'))) {
             country = 'PALESTINE';
          }
          if (!country && (titleClean.includes('iran') || descClean.includes('iran'))) {
             country = 'IRAN';
          }
          
          if (country) {
            const coords = COUNTRY_COORDS[country];
            if (coords) {
              let severity: IntelPoint['severity'] = 'medium';
              let type: IntelPoint['type'] = 'news';
              const text = `${titleClean} ${descClean}`;
              
              if (/genocide|massacre|killed|dead|bomb|airstrike|war|conflict/i.test(text)) {
                 severity = 'critical';
                 type = 'conflict';
              } else if (/crisis|protest|clash|attack/i.test(text)) {
                 severity = 'high';
              }

              results.push({
                id: `rss-${feed.source.replace(/\s+/g, '')}-${count}`,
                type,
                severity,
                position: [jitter(coords[1], 1.5), jitter(coords[0], 1.5), 0],
                title: title.slice(0, 80),
                description: desc.slice(0, 200),
                country,
                source: feed.source,
                date: new Date(dateStr).toISOString().slice(0, 10),
                url: link,
              });
              count++;
            }
          }
        }
      } catch (e) {}
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchWHOOutbreaks(): Promise<IntelPoint[]> {
  try {
    const rssUrl = 'https://www.who.int/rss-feeds/news-english.xml';
    const xml = await fetchWithProxy(rssUrl, true);
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    const seen = new Set<string>();
    const results: IntelPoint[] = [];
    for (const item of items.slice(0, 30)) {
      const title =
        item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
        item.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
      const tl = title.toLowerCase();
      const isHealth = /outbreak|disease|virus|mpox|ebola|cholera|dengue|avian|flu|epidemic|pandemic/i.test(tl);
      if (!isHealth) continue;
      const country = extractCountryFromTitle(title);
      const coords = country ? COUNTRY_COORDS[country] : null;
      if (!coords || seen.has(country)) continue;
      seen.add(country);
      results.push({
        id: `who-${results.length}`, type: 'disease', severity: 'high',
        position: [jitter(coords[1]), jitter(coords[0]), 0],
        title: title.slice(0, 80), description: title,
        country, source: 'WHO',
        date: new Date().toISOString().slice(0, 10),
        url: link,
      });
    }
    return results;
  } catch { return []; }
}

async function fetchTravelAdvisories(): Promise<IntelPoint[]> {
  try {
    const rssUrl = 'https://travel.state.gov/_res/rss/TAsTWs.xml';
    const xml = await fetchWithProxy(rssUrl, true);
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    return items.slice(0, 50).map((item, i) => {
      const title = item.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/&amp;/g, '&') ?? '';
      const desc = item.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<[^>]+>/g, '') ?? '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
      const m = title.match(/Level\s+(\d)/i);
      const level = m ? parseInt(m[1]) : 1;
      if (level < 2) return null;
      const country = (title.split(/[-–]/)[0] ?? '').trim().toUpperCase();
      const coords = COUNTRY_COORDS[country];
      if (!coords) return null;
      const severity: IntelPoint['severity'] =
        level === 4 ? 'critical' : level === 3 ? 'high' : 'medium';
      return {
        id: `adv-${i}`, type: 'advisory', severity,
        position: [coords[1], coords[0], 0],
        title: title.slice(0, 80), description: desc.slice(0, 200),
        country, source: 'US State Dept',
        date: new Date().toISOString().slice(0, 10),
        url: link, meta: { level },
      } as IntelPoint;
    }).filter(Boolean) as IntelPoint[];
  } catch { return []; }
}

async function fetchBusinessOpportunities(): Promise<IntelPoint[]> {
  try {
    const res = await fetch(
      'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=200&mrv=1',
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`WB ${res.status}`);
    const json = await res.json();
    return (json[1] ?? [])
      .filter((r: any) => r.value != null && r.value > 3.5 && !['1W', 'XC', 'XD', 'XE', 'XF', 'XG', 'XH', 'XI', 'XJ', 'XL', 'XM', 'XN', 'XO', 'XP', 'XQ', 'XT', 'XU', 'XY', 'Z4', 'Z7', 'ZB', 'ZF', 'ZG', 'ZH', 'ZI', 'ZJ', 'ZQ', 'ZT'].includes(r.country?.id))
      .slice(0, 30)
      .map((r: any) => {
        const iso2 = r.country?.id ?? '';
        const name = r.country?.value ?? '';
        const coords = ISO2_COORDS[iso2] ?? COUNTRY_COORDS[name.toUpperCase()];
        if (!coords) return null;
        const g = parseFloat(r.value.toFixed(1));
        return {
          id: `wb-${iso2}`, type: 'business', severity: 'opportunity',
          position: [coords[1], coords[0], 0],
          title: `${name} — ${g}% GDP Growth`,
          description: `World Bank: ${g}% GDP growth (${r.date}). Strong economic performance — potential investment opportunity.`,
          country: name, source: 'World Bank', date: r.date,
          meta: { gdpGrowth: `${g}%`, iso2 },
        } as IntelPoint;
      }).filter(Boolean) as IntelPoint[];
  } catch { return []; }
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export interface IntelState {
  data: IntelPoint[];
  loading: Record<IntelCategory, boolean>;
  errors: Record<IntelCategory, string | null>;
  pointCounts: Record<string, number>;
  refetch: (cat: IntelCategory) => void;
}

const EMPTY_LOADING: Record<IntelCategory, boolean> =
  { conflict: false, advisory: false, business: false, disease: false, news: false };
const EMPTY_ERRORS: Record<IntelCategory, string | null> =
  { conflict: null, advisory: null, business: null, disease: null, news: null };

export function useIntelligenceData(
  activeCategories: Record<IntelCategory, boolean>
): IntelState {
  const [data, setData] = useState<IntelPoint[]>([]);
  const [loading, setLoading] = useState<Record<IntelCategory, boolean>>(EMPTY_LOADING);
  const [errors, setErrors] = useState<Record<IntelCategory, string | null>>(EMPTY_ERRORS);
  const abortRef = useRef<Partial<Record<IntelCategory, AbortController>>>({});

  const fetchCategory = useCallback(async (cat: IntelCategory) => {
    abortRef.current[cat]?.abort();
    abortRef.current[cat] = new AbortController();
    setLoading(prev => ({ ...prev, [cat]: true }));
    setErrors(prev => ({ ...prev, [cat]: null }));
    try {
      let points: IntelPoint[] = [];
      switch (cat) {
        case 'conflict': points = await fetchACLEDConflicts(); break;
        case 'advisory': points = await fetchTravelAdvisories(); break;
        case 'business': points = await fetchBusinessOpportunities(); break;
        case 'disease': points = await fetchWHOOutbreaks(); break;
        case 'news':
          points = (await Promise.allSettled([fetchPremiumNews(), fetchGDELTNews(), fetchGlobalNewsRSS()]))
            .flatMap(r => r.status === 'fulfilled' ? r.value : []);
          break;
      }
      setData(prev => [...prev.filter(p => p.type !== cat), ...points]);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [cat]: err?.message ?? 'Failed to load' }));
    } finally {
      setLoading(prev => ({ ...prev, [cat]: false }));
    }
  }, []);

  useEffect(() => {
    (Object.keys(activeCategories) as IntelCategory[]).forEach(cat => {
      if (activeCategories[cat]) {
        fetchCategory(cat);
      } else {
        abortRef.current[cat]?.abort();
        setData(prev => prev.filter(p => p.type !== cat));
        setErrors(prev => ({ ...prev, [cat]: null }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeCategories.conflict, activeCategories.advisory,
    activeCategories.business, activeCategories.disease, activeCategories.news,
  ]);

  useEffect(() => () => Object.values(abortRef.current).forEach(c => c?.abort()), []);

  const pointCounts = data.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});

  return { data, loading, errors, pointCounts, refetch: fetchCategory };
}