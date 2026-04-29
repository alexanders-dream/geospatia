import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const q = 'conflict OR war OR attack OR crisis OR protest OR killed OR displaced OR ceasefire OR humanitarian';
    
    // Server-side env vars securely loaded
    const NEWSDATA_API = process.env.NEWSDATA_API;
    const CURRENTS_NEWS_API = process.env.CURRENTS_NEWS_API;
    const GUARDIAN_API = process.env.GUARDIAN_API;
    
    const [newsDataRes, currentsRes, guardianRes] = await Promise.allSettled([
      NEWSDATA_API ? fetch(`https://newsdata.io/api/1/news?apikey=${NEWSDATA_API}&q=${encodeURIComponent(q)}&language=en`).then(r => r.json()) : Promise.resolve({}),
      CURRENTS_NEWS_API ? fetch(`https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent('war conflict crisis')}&language=en&apiKey=${CURRENTS_NEWS_API}`).then(r => r.json()) : Promise.resolve({}),
      GUARDIAN_API ? fetch(`https://content.guardianapis.com/search?q=${encodeURIComponent('war OR conflict OR crisis')}&api-key=${GUARDIAN_API}&show-fields=headline,trailText,shortUrl`).then(r => r.json()) : Promise.resolve({})
    ]);

    const newsData = newsDataRes.status === 'fulfilled' ? newsDataRes.value : {};
    const currents = currentsRes.status === 'fulfilled' ? currentsRes.value : {};
    const guardian = guardianRes.status === 'fulfilled' ? guardianRes.value : {};

    res.status(200).json({ newsData, currents, guardian });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch intelligence' });
  }
}
