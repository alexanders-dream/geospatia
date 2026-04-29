import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { _GlobeView as GlobeView, COORDINATE_SYSTEM } from '@deck.gl/core';
import {
  ScatterplotLayer, GeoJsonLayer, PointCloudLayer,
  BitmapLayer, TextLayer, PathLayer,
} from '@deck.gl/layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { Tile3DLayer, TileLayer } from '@deck.gl/geo-layers';
import { Tiles3DLoader } from '@loaders.gl/3d-tiles';
import { SphereGeometry } from '@luma.gl/engine';
import * as satellite from 'satellite.js';
import { IntelPoint, severityColor } from './IntelligenceLayer';

const EARTH_GEOJSON =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';
const earthSphere = new SphereGeometry({ radius: 6.3e6 * 0.999, nlat: 72, nlong: 144 });

interface MapProps {
  activeLayers: Record<string, boolean>;
  onFeatureClick: (info: any) => void;
  selectedFeature: any;
  viewState: any;
  onViewStateChange: (vs: any) => void;
  onNodeCountChange: (n: number) => void;
  onLayerCountsChange?: (counts: Record<string, number>) => void;
  onLayerLoading?: (s: Record<string, boolean>) => void;
  onApiError?: (layer: string, err: string | null) => void;
  googleMapsApiKey?: string;
  timeOffset?: number;
  intelPoints?: IntelPoint[];
  onIntelClick?: (p: IntelPoint) => void;
  selectedIntelId?: string;
}

export default function DeckGLMap({
  activeLayers, onFeatureClick, selectedFeature, viewState, onViewStateChange,
  onNodeCountChange, onLayerCountsChange, onLayerLoading, onApiError, googleMapsApiKey, timeOffset = 0,
  intelPoints = [], onIntelClick, selectedIntelId,
}: MapProps) {

  // ── State ─────────────────────────────────────────────────────────────────
  const [earthquakes, setEarthquakes] = useState<any[]>([]);
  const [satellites, setSatellites] = useState<any[]>([]);
  const [satellitePositions, setSatellitePositions] = useState<any[]>([]);
  const [wildfires, setWildfires] = useState<any[]>([]);
  const [volcanoes, setVolcanoes] = useState<any[]>([]);
  const [airQuality, setAirQuality] = useState<any[]>([]);
  const [weatherRadarUrl, setWeatherRadarUrl] = useState<string | null>(null);
  const [neos, setNeos] = useState<any[]>([]);
  const [aurora, setAurora] = useState<any[]>([]);
  const [launches, setLaunches] = useState<any[]>([]);
  const [issData, setIssData] = useState<any | null>(null);
  const [fireballData, setFireballData] = useState<any[]>([]);
  const [tsunamiData, setTsunamiData] = useState<any[]>([]);
  const [cables, setCables] = useState<any[]>([]);
  const [sharks, setSharks] = useState<any[]>([]);
  const [countryLabels, setCountryLabels] = useState<any[]>([]);

  const loadingRef = useRef<Record<string, boolean>>({});
  const setLoading = useCallback((id: string, v: boolean) => {
    loadingRef.current[id] = v;
    onLayerLoading?.({ ...loadingRef.current });
  }, [onLayerLoading]);

  // ── Country label data (loaded once) ─────────────────────────────────────
  useEffect(() => {
    fetch(EARTH_GEOJSON)
      .then(r => r.json())
      .then(data => {
        const labels = (data.features ?? []).map((f: any) => {
          const iso = f.properties.iso_a3;
          const name = f.properties.name || f.properties.sovereignt || f.properties.NAME || '';
          
          let pos: [number, number] | undefined = undefined;
          if (iso && import('./IntelligenceLayer').then(m => pos = m.ISO3_COORDS[iso])) {}
          // For synchronous evaluation, we just duplicate the imports or parse them:
          return { f, iso, name };
        });
        
        import('./IntelligenceLayer').then(m => {
           const processed = labels.map(({ f, iso, name }) => {
              const pos = m.ISO3_COORDS[iso] || m.COUNTRY_COORDS[name.toUpperCase()];
              if (!pos) return null;
              return { position: [pos[1], pos[0], 0], name };
           }).filter(Boolean);
           setCountryLabels(processed);
        });
      })
      .catch(() => { });
  }, []);

  // ── Earthquake fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.earthquakes && !earthquakes.length) {
      setLoading('earthquakes', true);
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setEarthquakes(d.features.map((f: any, i: number) => ({
          ...f, id: `eq-${i}`, properties: { ...f.properties, featureType: 'earthquake' },
        }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('earthquakes', false));
    } else if (!activeLayers.earthquakes) setEarthquakes([]);
    return () => ctrl.abort();
  }, [activeLayers.earthquakes]);

  // ── EONET: wildfires + volcanoes ──────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    const needFetch = (activeLayers.wildfires || activeLayers.volcanoes) && !wildfires.length && !volcanoes.length;
    if (needFetch) {
      setLoading('wildfires', true); setLoading('volcanoes', true);
      fetch('/api/eonet/api/v3/events?status=open&limit=200', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => {
          const fires: any[] = [], volcs: any[] = [];
          d.events.forEach((ev: any) => {
            const g = ev.geometry[0];
            if (!g || g.type !== 'Point') return;
            const base = { id: ev.id, title: ev.title, position: [...g.coordinates, 0], date: g.date };
            if (ev.categories.some((c: any) => c.id === 'wildfires')) fires.push({ ...base, featureType: 'wildfire' });
            if (ev.categories.some((c: any) => c.id === 'volcanoes')) volcs.push({ ...base, featureType: 'volcano' });
          });
          setWildfires(fires); setVolcanoes(volcs);
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => { setLoading('wildfires', false); setLoading('volcanoes', false); });
    } else {
      if (!activeLayers.wildfires) setWildfires([]);
      if (!activeLayers.volcanoes) setVolcanoes([]);
    }
    return () => ctrl.abort();
  }, [activeLayers.wildfires, activeLayers.volcanoes]);

  // ── Air quality ───────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.airQuality && !airQuality.length) {
      setLoading('airQuality', true);
      fetch(`/api/airquality?latlng=-60,-180,60,180`, { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error('WAQI'); return r.json(); })
        .then(d => {
          if (d.status !== 'ok') throw new Error(d.data || 'WAQI error');
          setAirQuality(d.data.map((s: any, i: number) => ({
            id: `aqi-${s.uid ?? i}`, location: s.station.name, city: s.station.name,
            position: [s.lat, s.lon, 0],
            measurements: [{ parameter: 'aqi', value: s.aqi, unit: 'AQI' }],
            featureType: 'airQuality',
          })));
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('airQuality', false));
    } else if (!activeLayers.airQuality) setAirQuality([]);
    return () => ctrl.abort();
  }, [activeLayers.airQuality]);

  // ── Weather radar ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.weatherRadar && !weatherRadarUrl) {
      setLoading('weatherRadar', true);
      fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => {
          const last = d.radar.past[d.radar.past.length - 1];
          setWeatherRadarUrl(`${d.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`);
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('weatherRadar', false));
    } else if (!activeLayers.weatherRadar) setWeatherRadarUrl(null);
    return () => ctrl.abort();
  }, [activeLayers.weatherRadar]);

  // ── NEOs ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.neos && !neos.length) {
      setLoading('neos', true);
      const today = new Date().toISOString().split('T')[0];
      fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setNeos((d.near_earth_objects[today] ?? []).map((neo: any) => ({
          id: neo.id, name: neo.name,
          position: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 5e5 + Math.random() * 2e6],
          diameter: neo.estimated_diameter.meters.estimated_diameter_max,
          velocity: neo.close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour,
          missDistance: neo.close_approach_data?.[0]?.miss_distance?.kilometers,
          closeApproachDate: neo.close_approach_data?.[0]?.close_approach_date,
          isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
          featureType: 'neo',
        }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('neos', false));
    } else if (!activeLayers.neos) setNeos([]);
    return () => ctrl.abort();
  }, [activeLayers.neos]);

  // ── Aurora ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.aurora && !aurora.length) {
      setLoading('aurora', true);
      fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setAurora(
          d.coordinates.filter((p: any[]) => p[2] > 10)
            .map((p: any[], i: number) => ({ id: `aurora-${i}`, position: [p[0], p[1], 100000], intensity: p[2], featureType: 'aurora' }))
        ))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('aurora', false));
    } else if (!activeLayers.aurora) setAurora([]);
    return () => ctrl.abort();
  }, [activeLayers.aurora]);

  // ── Launches ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.launches && !launches.length) {
      setLoading('launches', true);
      fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setLaunches(d.results.map((l: any) => ({
          id: l.id, name: l.name, provider: l.launch_service_provider?.name,
          position: [Number(l.pad.longitude), Number(l.pad.latitude), 0],
          pad: l.pad.name, window_start: l.window_start, featureType: 'launch',
        }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('launches', false));
    } else if (!activeLayers.launches) setLaunches([]);
    return () => ctrl.abort();
  }, [activeLayers.launches]);

  // ── ISS live ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (activeLayers.iss) {
      const fetch_ = () =>
        fetch('https://api.wheretheiss.at/v1/satellites/25544')
          .then(r => r.json())
          .then(d => setIssData({
            id: 'iss-live', name: 'International Space Station (ISS)',
            position: [d.longitude, d.latitude, d.altitude * 1000],
            latitude: d.latitude, longitude: d.longitude, altitude: d.altitude,
            velocity: d.velocity, visibility: d.visibility,
            featureType: 'iss', lastUpdated: new Date().toISOString(),
          }))
          .catch(() => { });
      fetch_();
      timer = setInterval(fetch_, 5000);
    } else setIssData(null);
    return () => { if (timer) clearInterval(timer); };
  }, [activeLayers.iss]);

  // ── Fireballs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.fireball && !fireballData.length) {
      setLoading('fireball', true);
      const since = new Date(Date.now() - 2 * 365 * 864e5).toISOString().split('T')[0];
      fetch(`/api/nasa-fireball/fireball.api?date-min=${since}&limit=500`, { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
        .then(d => {
          if (!d?.data) return;
          const f = d.fields as string[];
          setFireballData(d.data.map((row: any[], i: number) => {
            const obj: any = Object.fromEntries(f.map((k, j) => [k, row[j]]));
            let lon = parseFloat(obj.lon), lat = parseFloat(obj.lat);
            if ((obj['lon-dir'] ?? 'E').toUpperCase() === 'W') lon = -lon;
            if ((obj['lat-dir'] ?? 'N').toUpperCase() === 'S') lat = -lat;
            return {
              id: `fb-${i}`, date: obj.date, energy: parseFloat(obj.energy) || 0,
              energyMin: parseFloat(obj['impact-e']) || 0,
              position: [isNaN(lon) ? 0 : lon, isNaN(lat) ? 0 : lat, 0],
              latitude: lat, longitude: lon,
              altitude: parseFloat(obj.alt) || 0, velocity: parseFloat(obj.vel) || 0,
              featureType: 'fireball',
            };
          }).filter((x: any) => !isNaN(x.position[0]) && !isNaN(x.position[1])));
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('fireball', false));
    } else if (!activeLayers.fireball) setFireballData([]);
    return () => ctrl.abort();
  }, [activeLayers.fireball]);

  // ── Tsunami ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.tsunami && !tsunamiData.length) {
      setLoading('tsunami', true);
      fetch('/api/noaa-tsunami/alerts/active?event=Tsunami', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setTsunamiData((d.features ?? []).map((f: any, i: number) => ({
          ...f, id: f.id ?? `tsunami-${i}`, properties: { ...f.properties, featureType: 'tsunami' },
        }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('tsunami', false));
    } else if (!activeLayers.tsunami) setTsunamiData([]);
    return () => ctrl.abort();
  }, [activeLayers.tsunami]);

  // ── Cables ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.cables && !cables.length) {
      setLoading('cables', true);
      fetch('/api/cables/api/v3/cable/cable-geo.json', { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error('cables'); return r.json(); })
        .then(d => setCables(d.features.map((f: any) => ({ ...f, properties: { ...f.properties, featureType: 'cable' } }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('cables', false));
    } else if (!activeLayers.cables) setCables([]);
    return () => ctrl.abort();
  }, [activeLayers.cables]);

  // ── Sharks ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.sharks && !sharks.length) {
      setLoading('sharks', true);
      fetch('/api/ocearch/tracker/ajax/filter-sharks', { signal: ctrl.signal })
        .then(r => {
          if (!r.headers.get('content-type')?.includes('application/json')) throw new Error('non-JSON');
          return r.json();
        })
        .then(d => setSharks(d.map((s: any) => ({
          id: `shark-${s.id}`, name: s.name, species: s.species,
          position: [parseFloat(s.longitude), parseFloat(s.latitude), 0],
          weight: s.weight, length: s.length, featureType: 'shark',
        })).filter((s: any) => !isNaN(s.position[0]) && !isNaN(s.position[1]))))
        .catch(() =>
          import('../data/mockSharks').then(m => setSharks(m.mockSharkData.map((s: any) => ({
            id: `shark-${s.id}`, name: s.name, species: s.species,
            position: [parseFloat(s.longitude), parseFloat(s.latitude), 0],
            weight: s.weight, length: s.length, featureType: 'shark',
          }))))
        )
        .finally(() => setLoading('sharks', false));
    } else if (!activeLayers.sharks) setSharks([]);
    return () => ctrl.abort();
  }, [activeLayers.sharks]);

  // ── Satellites TLE ────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    if (activeLayers.satellites && !satellites.length) {
      setLoading('satellites', true);
      fetch('/api/celestrak/NORAD/elements/stations.txt', { signal: ctrl.signal })
        .then(r => r.text())
        .then(text => {
          const lines = text.split('\n');
          const sats: any[] = [];
          for (let i = 0; i < lines.length - 2; i += 3) {
            const name = lines[i].trim(), tle1 = lines[i + 1]?.trim(), tle2 = lines[i + 2]?.trim();
            if (name && tle1 && tle2) sats.push({ id: `sat-${i}`, name, satrec: satellite.twoline2satrec(tle1, tle2), featureType: 'satellite' });
          }
          setSatellites(sats);
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading('satellites', false));
    } else if (!activeLayers.satellites) { setSatellites([]); setSatellitePositions([]); }
    return () => ctrl.abort();
  }, [activeLayers.satellites]);

  // ── Satellite position tick ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!activeLayers.satellites || !satellites.length) return;
      const date = new Date(Date.now() + timeOffset * 1000);
      setSatellitePositions(
        satellites.map(sat => {
          try {
            const pv = satellite.propagate(sat.satrec, date);
            const pos = pv.position;
            if (typeof pos === 'boolean') return null;
            const gmst = satellite.gstime(date);
            const gd = satellite.eciToGeodetic(pos, gmst);
            return { ...sat, position: [satellite.degreesLong(gd.longitude), satellite.degreesLat(gd.latitude), gd.height * 1000] };
          } catch { return null; }
        }).filter(Boolean)
      );
    }, 1000);
    return () => clearInterval(id);
  }, [activeLayers.satellites, satellites, timeOffset]);

  // ── Node count ────────────────────────────────────────────────────────────
  useEffect(() => {
    const counts: Record<string, number> = {
      earthquakes: earthquakes.length,
      satellites: satellitePositions.length,
      wildfires: wildfires.length,
      volcanoes: volcanoes.length,
      airQuality: airQuality.length,
      neos: neos.length,
      aurora: aurora.length,
      launches: launches.length,
      cables: cables.length,
      sharks: sharks.length,
      iss: issData ? 1 : 0,
      fireball: fireballData.length,
      tsunami: tsunamiData.length,
      weatherRadar: weatherRadarUrl ? 1 : 0,
      nightLights: activeLayers.nightLights ? 1 : 0,
    };
    const n = Object.values(counts).reduce((a, b) => a + b, 0) + intelPoints.length;
    
    // Fix: wrap in setTimeout to avoid updating App during render phase
    const timer = setTimeout(() => {
      onNodeCountChange(n);
      onLayerCountsChange?.(counts);
    }, 0);
    
    return () => clearTimeout(timer);
  }, [
    activeLayers, earthquakes.length, satellitePositions.length, wildfires.length,
    volcanoes.length, airQuality.length, neos.length, aurora.length, launches.length,
    cables.length, sharks.length, fireballData.length, tsunamiData.length,
    issData, weatherRadarUrl, intelPoints.length, onNodeCountChange, onLayerCountsChange
  ]);

  // ── Orbit path ────────────────────────────────────────────────────────────
  const orbitPath = useMemo(() => {
    if (!activeLayers.satellites || !satellitePositions.length) return [];
    const pts: number[][] = [];
    for (let i = 0; i <= 180; i++) {
      pts.push([(i / 180) * 360 - 180, Math.sin((i / 180) * Math.PI * 2) * 51.6, 400000]);
    }
    return [pts];
  }, [activeLayers.satellites, satellitePositions.length]);

  const intelKey = intelPoints.map(p => `${p.id}${p.severity}`).join(',');

  // ── Hover state for country labels ────────────────────────────────────────
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // ── Layers ────────────────────────────────────────────────────────────────
  const layers = [
    // Base
    googleMapsApiKey
      ? new Tile3DLayer({ id: 'google-3d', data: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleMapsApiKey}`, loader: Tiles3DLoader })
      : null,

    activeLayers.nightLights ? new TileLayer({
      id: 'night-lights',
      data: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
      minZoom: 0, maxZoom: 8,
      renderSubLayers: (props: any) => {
        const bb = props.tile?.boundingBox;
        if (!bb) return null;
        return new BitmapLayer({ id: props.id, image: props.data, bounds: [bb[0][0], bb[0][1], bb[1][0], bb[1][1]] });
      },
    }) : null,

    !googleMapsApiKey && !activeLayers.nightLights && new SimpleMeshLayer({
      id: 'earth-sphere', data: [0], mesh: earthSphere,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: () => [0, 0, 0], getColor: () => [10, 15, 25],
    }),

    !googleMapsApiKey && !activeLayers.nightLights && new GeoJsonLayer({
      id: 'earth-land', data: EARTH_GEOJSON, stroked: true, filled: true,
      getFillColor: (d: any) =>
        (d.properties?.name || d.properties?.NAME) === hoveredCountry ? [55, 75, 90] : [35, 45, 55],
      getLineColor: [100, 115, 125], lineWidthMinPixels: 1,
      pickable: true,
      onHover: (info: any) => {
        setHoveredCountry(info.object?.properties?.name ?? info.object?.properties?.NAME ?? null);
      },
      updateTriggers: { getFillColor: hoveredCountry },
    }),

    // Country label on hover
    hoveredCountry && countryLabels.length > 0 && new TextLayer({
      id: 'country-hover-label',
      data: countryLabels.filter((l: any) => l.name === hoveredCountry),
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.name,
      getSize: 16,
      getColor: [255, 255, 255, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'monospace',
      fontWeight: 600,
      billboard: true,
      background: true,
      getBackgroundColor: [10, 20, 30, 220],
      backgroundPadding: [6, 3, 6, 3],
    }),

    // Weather radar
    activeLayers.weatherRadar && weatherRadarUrl && new TileLayer({
      id: 'weather-radar', data: weatherRadarUrl, minZoom: 0, maxZoom: 12,
      renderSubLayers: (props: any) => {
        const bbox = props.tile?.bbox;
        if (!bbox) return null;
        let bounds: [number, number, number, number];
        if (Array.isArray(bbox[0])) bounds = [bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1]];
        else if (bbox.x0 !== undefined) bounds = [bbox.x0, bbox.y0, bbox.x1, bbox.y1];
        else if (bbox.left !== undefined) bounds = [bbox.left, bbox.bottom, bbox.right, bbox.top];
        else return null;
        return new BitmapLayer({ id: props.id, image: props.data, bounds, transparentColor: [0, 0, 0, 0] });
      },
    }),

    // Cables
    activeLayers.cables && new GeoJsonLayer({
      id: 'cables', data: cables, stroked: true, filled: false,
      getLineColor: [99, 102, 241, 150], lineWidthMinPixels: 1, getLineWidth: 2,
      pickable: true, onClick: onFeatureClick,
    }),

    // Aurora
    activeLayers.aurora && new PointCloudLayer({
      id: 'aurora', data: aurora, getPosition: (d: any) => d.position,
      getNormal: [0, 1, 0],
      getColor: (d: any) => [52, 211, 153, Math.min(255, d.intensity * 2)],
      pointSize: 50000, pickable: true, onClick: onFeatureClick,
    }),

    // Air quality
    activeLayers.airQuality && new ScatterplotLayer({
      id: 'air-quality', data: airQuality, getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        const v = d.measurements[0]?.value ?? 0;
        return v < 50 ? [52, 211, 153, 200] : v < 100 ? [250, 204, 21, 200] : v < 150 ? [249, 115, 22, 200] : [239, 68, 68, 200];
      },
      getRadius: 20000, pickable: true, onClick: onFeatureClick,
    }),

    // Earthquakes
    activeLayers.earthquakes && new ScatterplotLayer({
      id: 'earthquakes', data: earthquakes, pickable: true, opacity: 0.8,
      stroked: true, filled: true, radiusScale: 6, radiusMinPixels: 2, radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.geometry.coordinates,
      getRadius: (d: any) => Math.pow(2, d.properties.mag) * 1000,
      getFillColor: (d: any) => d.id === selectedFeature?.id ? [255, 255, 255, 255] : [255, 100, 80, 200],
      getLineColor: (d: any) => d.id === selectedFeature?.id ? [255, 255, 255] : [0, 0, 0],
      onClick: onFeatureClick,
      updateTriggers: { getFillColor: selectedFeature?.id, getLineColor: selectedFeature?.id },
    }),

    // Wildfires
    activeLayers.wildfires && new ScatterplotLayer({
      id: 'wildfires', data: wildfires, getPosition: (d: any) => d.position,
      getFillColor: [255, 140, 0, 255], getRadius: 15000, pickable: true, onClick: onFeatureClick,
    }),

    // Volcanoes
    activeLayers.volcanoes && new ScatterplotLayer({
      id: 'volcanoes', data: volcanoes, getPosition: (d: any) => d.position,
      getFillColor: [217, 119, 6, 255], getRadius: 20000, pickable: true, onClick: onFeatureClick,
    }),

    // Launches
    activeLayers.launches && new ScatterplotLayer({
      id: 'launches', data: launches, getPosition: (d: any) => d.position,
      getFillColor: [251, 146, 60, 255], getRadius: 25000, pickable: true, onClick: onFeatureClick,
    }),

    // Fireballs
    activeLayers.fireball && new ScatterplotLayer({
      id: 'fireball', data: fireballData, getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        const e = d.energy ?? 0;
        return e > 10 ? [255, 60, 30, 255] : e > 1 ? [255, 140, 0, 255] : [255, 200, 50, 255];
      },
      getRadius: (d: any) => Math.max(8000, Math.sqrt(d.energy ?? 1) * 15000),
      pickable: true, onClick: onFeatureClick,
    }),

    // Sharks
    activeLayers.sharks && new ScatterplotLayer({
      id: 'sharks', data: sharks, getPosition: (d: any) => d.position,
      getFillColor: [59, 130, 246, 255], getRadius: 15000, pickable: true, onClick: onFeatureClick,
    }),

    // NEOs
    activeLayers.neos && new ScatterplotLayer({
      id: 'neos', data: neos, getPosition: (d: any) => d.position,
      getFillColor: [239, 159, 39, 255], getRadius: (d: any) => d.diameter * 1000,
      pickable: true, onClick: onFeatureClick,
    }),

    // Satellites glow + dots + labels + orbit
    activeLayers.satellites && new ScatterplotLayer({
      id: 'satellites-glow', data: satellitePositions, pickable: false,
      opacity: 0.4, stroked: false, filled: true, radiusMinPixels: 8, radiusMaxPixels: 30,
      getPosition: (d: any) => d.position, getFillColor: [29, 158, 117, 100], getRadius: 1,
    }),
    activeLayers.satellites && new ScatterplotLayer({
      id: 'satellites', data: satellitePositions, pickable: true, opacity: 1,
      stroked: true, filled: true, radiusMinPixels: 3, radiusMaxPixels: 15,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => d.id === selectedFeature?.id ? [0, 255, 255, 255] : [29, 158, 117, 255],
      getLineColor: (d: any) => d.id === selectedFeature?.id ? [0, 255, 255] : [0, 0, 0, 0],
      lineWidthMinPixels: 2, getLineWidth: (d: any) => d.id === selectedFeature?.id ? 2 : 0,
      onClick: onFeatureClick,
      updateTriggers: { getFillColor: selectedFeature?.id, getLineColor: selectedFeature?.id },
    }),
    activeLayers.satellites && new TextLayer({
      id: 'sat-labels', data: satellitePositions.slice(0, 20),
      getPosition: (d: any) => d.position, getText: (d: any) => d.name,
      getSize: 12, getColor: [29, 158, 117, 180], getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom', pixelOffset: [0, -8], fontFamily: 'monospace',
    }),
    activeLayers.satellites && orbitPath.length > 0 && new PathLayer({
      id: 'orbit-path', data: orbitPath, getPath: (d: any) => d,
      getColor: [29, 158, 117, 120], getWidth: 2, widthMinPixels: 1, widthMaxPixels: 3,
      jointRounded: true, capRounded: true,
    }),

    // ISS
    activeLayers.iss && issData && new ScatterplotLayer({
      id: 'iss-glow', data: [issData], pickable: false, opacity: 0.5,
      stroked: false, filled: true, radiusMinPixels: 12, radiusMaxPixels: 40,
      getPosition: (d: any) => d.position, getFillColor: [255, 200, 50, 120], getRadius: 1,
    }),
    activeLayers.iss && issData && new ScatterplotLayer({
      id: 'iss', data: [issData], pickable: true, opacity: 1, stroked: true, filled: true,
      radiusMinPixels: 5, radiusMaxPixels: 20, getPosition: (d: any) => d.position,
      getFillColor: [255, 220, 100, 255], getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 2, onClick: onFeatureClick,
    }),
    activeLayers.iss && issData && new TextLayer({
      id: 'iss-label', data: [issData], getPosition: (d: any) => d.position,
      getText: () => 'ISS', getSize: 14, getColor: [255, 220, 100, 220],
      getTextAnchor: 'middle', getAlignmentBaseline: 'bottom',
      pixelOffset: [0, -10], fontFamily: 'monospace', fontWeight: 700,
    }),

    // Tsunami
    activeLayers.tsunami && tsunamiData.length > 0 && new GeoJsonLayer({
      id: 'tsunami-poly',
      data: { type: 'FeatureCollection', features: tsunamiData.filter((f: any) => /Polygon/i.test(f.geometry?.type ?? '')) },
      stroked: true, filled: true,
      getFillColor: (d: any) => {
        const s = (d.properties?.severity ?? '').toLowerCase();
        return s.includes('severe') || s.includes('extreme') ? [255, 50, 50, 100] : s.includes('moderate') ? [255, 140, 0, 100] : [255, 200, 50, 100];
      },
      getLineColor: (d: any) => {
        const s = (d.properties?.severity ?? '').toLowerCase();
        return s.includes('severe') || s.includes('extreme') ? [255, 50, 50, 255] : s.includes('moderate') ? [255, 140, 0, 255] : [255, 200, 50, 255];
      },
      getLineWidth: 2, lineWidthMinPixels: 2, pickable: true, onClick: onFeatureClick,
    }),
    activeLayers.tsunami && tsunamiData.length > 0 && new ScatterplotLayer({
      id: 'tsunami-pts', data: tsunamiData.filter((f: any) => f.geometry?.type === 'Point'),
      getPosition: (d: any) => d.geometry.coordinates,
      getFillColor: (d: any) => {
        const e = (d.properties?.event ?? '').toLowerCase();
        return e.includes('warning') ? [255, 50, 50, 220] : e.includes('watch') ? [255, 140, 0, 220] : [255, 200, 50, 220];
      },
      getRadius: 30000, radiusMinPixels: 5, radiusMaxPixels: 20,
      pickable: true, onClick: onFeatureClick,
    }),

    // ── Intel layers (always on top) ─────────────────────────────────────────

    intelPoints.length > 0 && new ScatterplotLayer({
      id: 'intel-glow', data: intelPoints,
      getPosition: (d: IntelPoint) => d.position,
      getFillColor: (d: IntelPoint) => { const [r, g, b] = severityColor(d.severity); return [r, g, b, 35]; },
      getRadius: 130000, radiusMinPixels: 18, radiusMaxPixels: 52,
      pickable: false, stroked: false,
      updateTriggers: { getFillColor: intelKey },
    }),

    intelPoints.length > 0 && new ScatterplotLayer({
      id: 'intel-ring', data: intelPoints,
      getPosition: (d: IntelPoint) => d.position,
      getFillColor: [0, 0, 0, 0],
      getLineColor: (d: IntelPoint) => { const [r, g, b] = severityColor(d.severity); return [r, g, b, 150]; },
      getRadius: 88000, radiusMinPixels: 12, radiusMaxPixels: 32,
      stroked: true, filled: true, lineWidthMinPixels: 1.5,
      pickable: false,
      updateTriggers: { getLineColor: intelKey },
    }),

    intelPoints.length > 0 && new ScatterplotLayer({
      id: 'intel-core', data: intelPoints,
      getPosition: (d: IntelPoint) => d.position,
      getFillColor: (d: IntelPoint) =>
        d.id === selectedIntelId ? [255, 255, 255, 255] : severityColor(d.severity),
      getLineColor: (d: IntelPoint) =>
        d.id === selectedIntelId ? severityColor(d.severity) : [0, 0, 0, 0],
      getRadius: 45000, radiusMinPixels: 6, radiusMaxPixels: 18,
      stroked: true, filled: true, lineWidthMinPixels: 2,
      pickable: true,
      onClick: (info: any) => { if (info.object) onIntelClick?.(info.object as IntelPoint); },
      updateTriggers: {
        getFillColor: [selectedIntelId, intelKey],
        getLineColor: [selectedIntelId, intelKey],
      },
    }),

    intelPoints.length > 0 && new TextLayer({
      id: 'intel-icons', data: intelPoints,
      getPosition: (d: IntelPoint) => d.position,
      getText: (d: IntelPoint) => ({ conflict: '⚔', advisory: '⚠', business: '◆', disease: '⬡', news: '◉' }[d.type] ?? '●'),
      getSize: 10,
      getColor: (d: IntelPoint) => { const [r, g, b] = severityColor(d.severity); return [r, g, b, 220]; },
      getTextAnchor: 'middle', getAlignmentBaseline: 'center',
      fontFamily: 'sans-serif', pickable: false,
      updateTriggers: { getColor: intelKey },
    }),

  ].filter(Boolean);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const getTooltip = ({ object }: any) => {
    if (!object) return null;
    const t = object.featureType ?? object.properties?.featureType ?? object.type;
    switch (t) {
      case 'earthquake': return `M${object.properties?.mag} – ${object.properties?.place}`;
      case 'wildfire': return `🔥 ${object.title}`;
      case 'volcano': return `🌋 ${object.title}`;
      case 'airQuality': return `AQI ${object.measurements?.[0]?.value} – ${object.city}`;
      case 'neo': return `☄ ${object.name} — ⌀${Math.round(object.diameter)}m`;
      case 'aurora': return `Aurora: ${object.intensity}%`;
      case 'launch': return `🚀 ${object.name}\n${object.provider}`;
      case 'cable': return `🔌 ${object.properties?.name}`;
      case 'shark': return `🦈 ${object.name} (${object.species})`;
      case 'satellite': return `🛰 ${object.name}`;
      case 'iss': return `ISS — Alt: ${object.altitude?.toFixed(1)} km`;
      case 'fireball': return `💥 Fireball — ${object.energy} kt TNT\n${object.date}`;
      case 'tsunami': return `🌊 ${object.properties?.event ?? 'Alert'}`;
      case 'conflict': return `⚔ ${object.title}\n${object.description?.slice(0, 80)}`;
      case 'advisory': return `⚠ ${object.title}`;
      case 'business': return `◆ ${object.title}`;
      case 'news': return `◉ ${object.source ? `${object.source}: ` : ''}${object.title}`;
      default: return null;
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden">
      <DeckGL
        views={[new GlobeView()]}
        layers={layers}
        viewState={viewState}
        onViewStateChange={e => onViewStateChange(e.viewState)}
        controller={true}
        getTooltip={getTooltip}
        getCursor={({ isDragging }) => isDragging ? 'grabbing' : 'crosshair'}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      />

      {/* Atmospheric SVG overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}
        viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="atmosGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="85%" stopColor="#0f6e56" stopOpacity="0.08" />
            <stop offset="95%" stopColor="#0f6e56" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f6e56" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="500" r="480" fill="url(#atmosGlow)" />
        <circle cx="500" cy="500" r="440" fill="none" stroke="#0f6e56" strokeWidth="1.5" opacity="0.25" />
        <circle cx="500" cy="500" r="440" fill="none" stroke="#1d9e75" strokeWidth="0.5" opacity="0.4" />
        <g opacity="0.15">
          {[-60, -30, 30, 60].map((lat, i) => {
            const y = 500 - (lat / 90) * 440;
            const hw = Math.sqrt(Math.max(0, 440 * 440 - (lat / 90 * 440) ** 2));
            return <line key={i} x1={500 - hw} y1={y} x2={500 + hw} y2={y} stroke="#1a3a28" strokeWidth="0.5" />;
          })}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon, i) => (
            <ellipse key={i} cx="500" cy="500" rx={Math.abs(Math.cos((lon / 180) * Math.PI)) * 440}
              ry="440" fill="none" stroke="#1a3a28" strokeWidth="0.5" />
          ))}
          <line x1="60" y1="500" x2="940" y2="500" stroke="#1a3a28" strokeWidth="0.8" opacity="0.3" />
        </g>
      </svg>
    </div>
  );
}