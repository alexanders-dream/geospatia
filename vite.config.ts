import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'vercel-api-dev',
        configureServer(server) {
          // Dev middleware for /api/airquality
          server.middlewares.use('/api/airquality', async (req, res) => {
            try {
              if (env.WAQI_API_KEY) {
                const url = new URL(req.url || '/', `http://${req.headers.host}`);
                const latlng = url.searchParams.get('latlng') || '-60,-180,60,180';
                const waqiUrl = `https://api.waqi.info/v2/map/bounds?latlng=${latlng}&networks=all&token=${env.WAQI_API_KEY}`;
                const fetchRes = await fetch(waqiUrl);
                const data = await fetchRes.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: 'ok', data: [] }));
              }
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to fetch air quality' }));
            }
          });

          // Dev middleware for /api/intelligence
          server.middlewares.use('/api/intelligence', async (req, res) => {
            try {
              const q = 'conflict OR war OR attack OR crisis OR protest OR killed OR displaced OR ceasefire OR humanitarian';
              const [newsDataRes, currentsRes, guardianRes] = await Promise.allSettled([
                env.NEWSDATA_API ? fetch(`https://newsdata.io/api/1/news?apikey=${env.NEWSDATA_API}&q=${encodeURIComponent(q)}&language=en`).then(r => r.json()) : Promise.resolve({}),
                env.CURRENTS_NEWS_API ? fetch(`https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent('war conflict crisis')}&language=en&apiKey=${env.CURRENTS_NEWS_API}`).then(r => r.json()) : Promise.resolve({}),
                env.GUARDIAN_API ? fetch(`https://content.guardianapis.com/search?q=${encodeURIComponent('war OR conflict OR crisis')}&api-key=${env.GUARDIAN_API}&show-fields=headline,trailText,shortUrl`).then(r => r.json()) : Promise.resolve({})
              ]);

              const newsData = newsDataRes.status === 'fulfilled' ? newsDataRes.value : {};
              const currents = currentsRes.status === 'fulfilled' ? currentsRes.value : {};
              const guardian = guardianRes.status === 'fulfilled' ? guardianRes.value : {};

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ newsData, currents, guardian }));
            } catch (error) {
              console.error(error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to fetch intelligence' }));
            }
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/eonet': {
          target: 'https://eonet.gsfc.nasa.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/eonet/, ''),
        },
        '/api/celestrak': {
          target: 'https://celestrak.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/celestrak/, ''),
        },
        '/api/cables': {
          target: 'https://www.submarinecablemap.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cables/, ''),
        },
        '/api/ocearch': {
          target: 'https://www.ocearch.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ocearch/, ''),
        },
        '/api/nasa-fireball': {
          target: 'https://ssd-api.jpl.nasa.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nasa-fireball/, ''),
        },
        '/api/noaa-tsunami': {
          target: 'https://api.weather.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/noaa-tsunami/, ''),
        },
      },
    },
  };
});
