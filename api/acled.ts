import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0];
    
    // Use env vars if available, otherwise fallback to demo
    const ACLED_KEY = process.env.ACLED_KEY || 'DEMO';
    const ACLED_EMAIL = process.env.ACLED_EMAIL || 'demo@acleddata.com';

    const url = `https://api.acleddata.com/acled/read.csv?limit=100&event_date=${since}&event_date_where=>=&fields=event_id_cnty|event_date|event_type|country|latitude|longitude|notes|fatalities|actor1|actor2&key=${ACLED_KEY}&email=${ACLED_EMAIL}`;

    const fetchRes = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!fetchRes.ok) {
      throw new Error(`ACLED returned ${fetchRes.status}`);
    }

    const text = await fetchRes.text();
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(text);
  } catch (error: any) {
    console.error('ACLED error:', error.message);
    res.status(500).json({ error: 'Failed to fetch ACLED data' });
  }
}
