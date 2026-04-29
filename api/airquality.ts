import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Securely loaded server-side env vars
    if (process.env.WAQI_API_KEY) {
      const { latlng } = req.query;
      const url = `https://api.waqi.info/v2/map/bounds?latlng=${latlng || '-60,-180,60,180'}&networks=all&token=${process.env.WAQI_API_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      res.status(200).json(data);
    } else {
      res.status(200).json({ status: 'ok', data: [] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch air quality' });
  }
}
