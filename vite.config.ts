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
    plugins: [react(), tailwindcss()],
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
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
        // Proxy for Submarine Cable Map API (CORS workaround)
        '/api/cables': {
          target: 'https://www.submarinecablemap.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cables/, ''),
        },
        // Proxy for OCEARCH Shark Tracker API (CORS workaround)
        '/api/ocearch': {
          target: 'https://www.ocearch.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ocearch/, ''),
        },
        // Proxy for NASA Fireball API (CORS workaround)
        '/api/nasa-fireball': {
          target: 'https://ssd-api.jpl.nasa.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nasa-fireball/, ''),
        },
        // Proxy for NOAA Tsunami Alerts API (CORS workaround)
        '/api/noaa-tsunami': {
          target: 'https://api.weather.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/noaa-tsunami/, ''),
        },
      },
    },
  };
});
