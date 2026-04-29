import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, asXml } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const fetchRes = await fetch(decodeURIComponent(url), {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'GeoSpatia-Server/1.0'
      }
    });

    if (!fetchRes.ok) {
      throw new Error(`Upstream returned ${fetchRes.status}`);
    }

    if (asXml === 'true') {
      const text = await fetchRes.text();
      res.setHeader('Content-Type', 'text/xml');
      res.status(200).send(text);
    } else {
      const json = await fetchRes.json();
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(json);
    }
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy failed to fetch data' });
  }
}
