<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GeoSpatia: Global Intelligence

A 3D geospatial dashboard integrating Google 3D Tiles, satellite orbits, seismic activity, and environmental monitoring. Built with [deck.gl](https://deck.gl), React, and TypeScript.

## Features

### Space & Astronomy
- **Satellite Tracking** — Real-time ISS and space station positions via CelesTrak TLE data
- **Near-Earth Objects** — Asteroid tracking using NASA NeoWs API
- **Aurora Forecast** — Northern/southern lights visualization via NOAA SWPC
- **Spacecraft Launches** — Upcoming rocket launches from Launch Library 2

### Natural Disasters & Environment
- **Seismic Activity** — Live earthquake data from USGS
- **Active Wildfires** — Fire detection via NASA EONET / FIRMS
- **Volcano Eruptions** — Volcanic activity monitoring
- **Global Air Quality** — AQI readings from WAQI
- **Live Weather Radar** — Precipitation radar via RainViewer

### Human Infrastructure & Maritime
- **Submarine Cables** — Global undersea cable network (TeleGeography)
- **Global Night Lights** — Earth at night visualization

### Wildlife Tracking
- **Shark & Marine Life** — Shark tracking via OCEARCH (with mock data fallback)

### Geographic Zones
- **Red Zones** — Danger/alert areas from NASA EONET events

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Visualization:** deck.gl 9.x, luma.gl, loaders.gl (3D Tiles)
- **Styling:** Tailwind CSS 4, lucide-react icons
- **Satellite Math:** satellite.js for TLE propagation

## Run Locally

**Prerequisites:** Node.js 18+

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys:
   - `GEMINI_API_KEY` — Gemini AI API key
   - `VITE_WAQI_API_KEY` — World Air Quality Index token (use `demo` or get a free token at [aqicn.org](https://aqicn.org/data-platform/token/))

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |

## Project Structure

```
geospatia/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Entry point
│   ├── components/
│   │   ├── Map.tsx             # deck.gl globe with all data layers
│   │   ├── Sidebar.tsx         # Layer toggle controls
│   │   ├── SettingsModal.tsx   # API key settings
│   │   └── TimelineSlider.tsx  # Time offset control
│   └── data/
│       └── mockSharks.ts       # Fallback shark data
├── .env.example                # Environment variable template
├── vite.config.ts              # Vite configuration with API proxies
├── cors.json                   # CORS configuration for storage
└── package.json
```

## API Integrations

| Service | Purpose | Auth Required |
|---------|---------|---------------|
| [USGS Earthquakes](https://earthquake.usgs.gov/) | Seismic data | No |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Wildfires, volcanoes, alerts | No |
| [WAQI](https://aqicn.org/) | Air quality index | Free token |
| [RainViewer](https://www.rainviewer.com/) | Weather radar | No |
| [NASA NeoWs](https://api.nasa.gov/) | Near-Earth objects | Demo key |
| [NOAA SWPC](https://services.swpc.noaa.gov/) | Aurora forecast | No |
| [Launch Library 2](https://thespacedevs.com/) | Space launches | No |
| [CelesTrak](https://celestrak.org/) | Satellite TLE data | No |
| [TeleGeography](https://www.submarinecablemap.com/) | Submarine cables | No |
| [OCEARCH](https://www.ocearch.org/) | Shark tracking | No |

## License

MIT
