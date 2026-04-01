import React, { useState, useEffect, useMemo, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { _GlobeView as GlobeView, COORDINATE_SYSTEM } from '@deck.gl/core';
import { ScatterplotLayer, GeoJsonLayer, PointCloudLayer, BitmapLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { Tile3DLayer, TileLayer } from '@deck.gl/geo-layers';
import { Tiles3DLoader } from '@loaders.gl/3d-tiles';
import { SphereGeometry } from '@luma.gl/engine';
import * as satellite from 'satellite.js';

const EARTH_GEOJSON = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson';

const earthSphereGeometry = new SphereGeometry({radius: 6.3e6 * 0.999, nlat: 72, nlong: 144});

interface MapProps {
  activeLayers: any;
  onFeatureClick: (info: any) => void;
  selectedFeature: any;
  viewState: any;
  onViewStateChange: (vs: any) => void;
  onNodeCountChange: (count: number) => void;
  onLayerLoading?: (layers: Record<string, boolean>) => void;
  onApiError?: (layer: string, error: string | null) => void;
  googleMapsApiKey?: string;
  timeOffset?: number;
}

export default function DeckGLMap({ activeLayers, onFeatureClick, selectedFeature, viewState, onViewStateChange, onNodeCountChange, onLayerLoading, onApiError, googleMapsApiKey, timeOffset = 0 }: MapProps) {
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
  const [gdeltData, setGdeltData] = useState<any[]>([]);
  
  // Simple in-memory cache with TTL
  const apiCache = useRef<{
    satellites?: { data: any[]; timestamp: number };
    aurora?: { data: any[]; timestamp: number };
  }>({});
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCachedData = <T,>(key: keyof typeof apiCache.current): T[] | null => {
    const cached = apiCache.current[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T[];
    }
    return null;
  };

  const setCachedData = <T,>(key: keyof typeof apiCache.current, data: T[]) => {
    apiCache.current[key] = { data, timestamp: Date.now() };
  };

  const [cables, setCables] = useState<any[]>([]);
  const [sharks, setSharks] = useState<any[]>([]);
  const [isMapIdle, setIsMapIdle] = useState(true);
  const loadingStatesRef = useRef<Record<string, boolean>>({});

  const setLoading = (layerId: string, isLoading: boolean) => {
    loadingStatesRef.current[layerId] = isLoading;
    if (onLayerLoading) {
      onLayerLoading({ ...loadingStatesRef.current });
    }
  };

  // Earthquakes (USGS)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.earthquakes && earthquakes.length === 0) {
      setLoading('earthquakes', true);
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
           const features = data.features.map((f: any, i: number) => ({...f, id: `eq-${i}`, properties: {...f.properties, featureType: 'earthquake'}}));
           setEarthquakes(features);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch earthquakes:', err);
        })
        .finally(() => setLoading('earthquakes', false));
    } else if (!activeLayers.earthquakes) {
      setEarthquakes([]);
    }
    return () => controller.abort();
  }, [activeLayers.earthquakes]);

  // Wildfires and Volcanoes (EONET)
  useEffect(() => {
    const controller = new AbortController();
    if ((activeLayers.wildfires || activeLayers.volcanoes) && (wildfires.length === 0 && volcanoes.length === 0)) {
      setLoading('wildfires', true);
      setLoading('volcanoes', true);
      fetch('/api/eonet/api/v3/events?status=open&limit=200', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const fires: any[] = [];
          const volcs: any[] = [];
          data.events.forEach((event: any) => {
            const geom = event.geometry[0];
            if (!geom || geom.type !== 'Point') return;
            const feature = {
              id: event.id,
              title: event.title,
              position: [geom.coordinates[0], geom.coordinates[1], 0],
              date: geom.date
            };
            if (activeLayers.wildfires && event.categories.some((c: any) => c.id === 'wildfires')) fires.push({...feature, featureType: 'wildfire'});
            if (activeLayers.volcanoes && event.categories.some((c: any) => c.id === 'volcanoes')) volcs.push({...feature, featureType: 'volcano'});
          });
          setWildfires(fires);
          setVolcanoes(volcs);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch EONET events:', err);
        })
        .finally(() => {
          setLoading('wildfires', false);
          setLoading('volcanoes', false);
        });
    } else {
      if (!activeLayers.wildfires) setWildfires([]);
      if (!activeLayers.volcanoes) setVolcanoes([]);
    }
    return () => controller.abort();
  }, [activeLayers.wildfires, activeLayers.volcanoes]);

  // Air Quality (WAQI - World Air Quality Index)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.airQuality && airQuality.length === 0) {
      setLoading('airQuality', true);
      // WAQI API - using demo token (limited) or user-provided token
      const waqiToken = import.meta.env.VITE_WAQI_API_KEY || 'demo';
      fetch(`https://api.waqi.info/v2/map/bounds?latlng=-60,-180,60,180&networks=all&token=${waqiToken}`, { signal: controller.signal })
        .then(res => { if (!res.ok) throw new Error('WAQI failed'); return res.json(); })
        .then(data => {
          if (data.status !== 'ok') throw new Error(data.data || 'WAQI returned unknown status');
          const aqiData = data.data.map((station: any, i: number) => ({
            id: `aqi-${station.uid || i}`,
            location: station.station.name,
            city: station.station.name,
            country: station.station.country || 'Unknown',
            position: [station.lat, station.lon, 0],
            measurements: [{ parameter: 'aqi', value: station.aqi, unit: 'AQI' }],
            featureType: 'airQuality'
          }));
          setAirQuality(aqiData);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch real Air Quality data:', err);
        })
        .finally(() => setLoading('airQuality', false));
    } else if (!activeLayers.airQuality) {
      setAirQuality([]);
    }
    return () => controller.abort();
  }, [activeLayers.airQuality]);

  // Weather Radar (RainViewer)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.weatherRadar && !weatherRadarUrl) {
      setLoading('weatherRadar', true);
      fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const latest = data.radar.past[data.radar.past.length - 1];
          setWeatherRadarUrl(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch Weather Radar:', err);
        })
        .finally(() => setLoading('weatherRadar', false));
    } else if (!activeLayers.weatherRadar) {
      setWeatherRadarUrl(null);
    }
    return () => controller.abort();
  }, [activeLayers.weatherRadar]);

  // Near-Earth Objects (NASA NeoWs)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.neos && neos.length === 0) {
      setLoading('neos', true);
      const today = new Date().toISOString().split('T')[0];
      fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const neosToday = data.near_earth_objects[today] || [];
          const neoFeatures = neosToday.map((neo: any) => {
            // NASA NeoWs API doesn't provide sky coordinates, only miss distances
            // Position is set to a fixed offset point for visualization purposes
            const baseLon = (Math.random() - 0.5) * 60; // Limited spread for visual grouping
            const baseLat = (Math.random() - 0.5) * 60;
            return {
              id: neo.id,
              name: neo.name,
              position: [baseLon, baseLat, 500000 + Math.random() * 2000000],
              diameter: neo.estimated_diameter.meters.estimated_diameter_max,
              velocity: neo.close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour,
              missDistance: neo.close_approach_data?.[0]?.miss_distance?.kilometers,
              closeApproachDate: neo.close_approach_data?.[0]?.close_approach_date,
              isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
              featureType: 'neo'
            };
          });
          setNeos(neoFeatures);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch NEOs:', err);
        })
        .finally(() => setLoading('neos', false));
    } else if (!activeLayers.neos) {
      setNeos([]);
    }
    return () => controller.abort();
  }, [activeLayers.neos]);

  // Aurora Forecast (NOAA SWPC)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.aurora && aurora.length === 0) {
      setLoading('aurora', true);
      fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const auroraPoints = data.coordinates
            .filter((p: any[]) => p[2] > 10)
            .map((p: any[], i: number) => ({
              id: `aurora-${i}`,
              position: [p[0], p[1], 100000],
              intensity: p[2],
              featureType: 'aurora'
            }));
          setAurora(auroraPoints);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch Aurora Forecast:', err);
        })
        .finally(() => setLoading('aurora', false));
    } else if (!activeLayers.aurora) {
      setAurora([]);
    }
    return () => controller.abort();
  }, [activeLayers.aurora]);

  // Spacecraft Launches (Launch Library 2)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.launches && launches.length === 0) {
      setLoading('launches', true);
      fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const launchFeatures = data.results.map((l: any) => ({
            id: l.id,
            name: l.name,
            provider: l.launch_service_provider?.name,
            position: [Number(l.pad.longitude), Number(l.pad.latitude), 0],
            pad: l.pad.name,
            window_start: l.window_start,
            featureType: 'launch'
          }));
          setLaunches(launchFeatures);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch Launches:', err);
        })
        .finally(() => setLoading('launches', false));
    } else if (!activeLayers.launches) {
      setLaunches([]);
    }
    return () => controller.abort();
  }, [activeLayers.launches]);

  // ISS Live Position (Where The ISS At)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeLayers.iss) {
      const fetchISSData = () => {
        fetch('https://api.wheretheiss.at/v1/satellites/25544')
          .then(res => res.json())
          .then(data => {
            const issFeature = {
              id: 'iss-live',
              name: 'International Space Station (ISS)',
              position: [data.longitude, data.latitude, data.altitude * 1000], // convert km to m
              latitude: data.latitude,
              longitude: data.longitude,
              altitude: data.altitude,
              velocity: data.velocity,
              visibility: data.visibility,
              featureType: 'iss',
              lastUpdated: new Date().toISOString()
            };
            setIssData(issFeature);
          })
          .catch(err => {
            console.error('Failed to fetch ISS position:', err);
          });
      };
      fetchISSData();
      interval = setInterval(fetchISSData, 5000);
    } else {
      setIssData(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeLayers.iss]);

  // NASA Fireball/Meteor Data
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.fireball && fireballData.length === 0) {
      setLoading('fireball', true);
      // Use date-min parameter to get recent fireballs (last 2 years)
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      fetch(`/api/nasa-fireball/fireball.api?date-min=${twoYearsAgo}&limit=500`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`NASA Fireball API error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!data || !data.data || !Array.isArray(data.data)) {
            console.warn('Invalid fireball data received');
            return;
          }
          // Fields: ["date","energy","impact-e","lat","lat-dir","lon","lon-dir","alt","vel"]
          const fields = data.fields;
          const fireballs = data.data.map((row: any[], i: number) => {
            const obj: any = {};
            fields.forEach((field: string, idx: number) => {
              obj[field] = row[idx];
            });
            // Parse longitude direction (E/W)
            const lonDir = (obj['lon-dir'] || 'E').toUpperCase();
            const latDir = (obj['lat-dir'] || 'N').toUpperCase();
            let lon = parseFloat(obj.lon);
            let lat = parseFloat(obj.lat);
            // Apply direction
            if (lonDir === 'W') lon = -lon;
            if (latDir === 'S') lat = -lat;
            return {
              id: `fireball-${i}`,
              date: obj.date,
              energy: parseFloat(obj.energy) || 0,
              energyMin: parseFloat(obj['impact-e']) || 0,
              energyMax: 0,
              position: [isNaN(lon) ? 0 : lon, isNaN(lat) ? 0 : lat, 0],
              latitude: isNaN(lat) ? 0 : lat,
              longitude: isNaN(lon) ? 0 : lon,
              altitude: parseFloat(obj.alt) || 0,
              velocity: parseFloat(obj.vel) || 0,
              featureType: 'fireball'
            };
          }).filter((f: any) => !isNaN(f.position[0]) && !isNaN(f.position[1]));
          setFireballData(fireballs);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch NASA Fireball data:', err);
          setFireballData([]);
        })
        .finally(() => setLoading('fireball', false));
    } else if (!activeLayers.fireball) {
      setFireballData([]);
    }
    return () => controller.abort();
  }, [activeLayers.fireball]);

  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.tsunami && tsunamiData.length === 0) {
      setLoading('tsunami', true);
      fetch('/api/noaa-tsunami/alerts/active?event=Tsunami', { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const features = (data.features || []).map((f: any, i: number) => ({
            ...f,
            id: f.id || `tsunami-${i}`,
            properties: {
              ...f.properties,
              featureType: 'tsunami'
            }
          }));
          setTsunamiData(features);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to fetch NOAA Tsunami alerts:', err);
        })
        .finally(() => setLoading('tsunami', false));
    } else if (!activeLayers.tsunami) {
      setTsunamiData([]);
    }
    return () => controller.abort();
  }, [activeLayers.tsunami]);

  // GDELT Global Events
  // Note: The GDELT Geo API (api/v2/geo/geo) endpoint has been deprecated and returns 404.
  // The layer is disabled until a replacement geotagged news API is available.
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.gdelt && gdeltData.length === 0) {
      setLoading('gdelt', true);
      console.warn('GDELT Geo API is currently unavailable. The layer has been disabled.');
      setGdeltData([]);
      setLoading('gdelt', false);
    } else if (!activeLayers.gdelt) {
      setGdeltData([]);
    }
    return () => controller.abort();
  }, [activeLayers.gdelt]);

  // Submarine Cables (TeleGeography)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.cables && cables.length === 0) {
      setLoading('cables', true);
      // Use the official API endpoint via Vite proxy (CORS workaround)
      fetch('/api/cables/api/v3/cable/cable-geo.json', { signal: controller.signal })
        .then(res => { if (!res.ok) throw new Error('Network error'); return res.json(); })
        .then(data => {
          setCables(data.features.map((f: any) => ({...f, properties: {...f.properties, featureType: 'cable'}})));
          setLoading('cables', false);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Failed to fetch cables:', err);
          }
          setLoading('cables', false);
        });
    } else if (!activeLayers.cables) {
      setCables([]);
    }
    return () => controller.abort();
  }, [activeLayers.cables]);

  // Sharks (OCEARCH) - with fallback to mock data
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.sharks && sharks.length === 0) {
      setLoading('sharks', true);
      // Try to fetch from OCEARCH API first, fallback to mock data
      fetch('/api/ocearch/tracker/ajax/filter-sharks', { signal: controller.signal })
        .then(res => {
          // Check if response is actually JSON (not HTML error page)
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON (CORS proxy may have failed)');
          }
          if (!res.ok) throw new Error('OCEARCH fetch failed: ' + res.status);
          return res.json();
        })
        .then(data => {
          const sharkData = data.map((s: any) => ({
            id: `shark-${s.id}`,
            name: s.name,
            species: s.species,
            position: [parseFloat(s.longitude), parseFloat(s.latitude), 0],
            weight: s.weight,
            length: s.length,
            featureType: 'shark'
          })).filter((s: any) => !isNaN(s.position[0]) && !isNaN(s.position[1]));
          setSharks(sharkData);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.warn('OCEARCH API unavailable, using mock data:', err.message);
            // Use mock data as fallback
            import('../data/mockSharks').then(module => {
              const mockData = module.mockSharkData.map((s: any) => ({
                id: `shark-${s.id}`,
                name: s.name,
                species: s.species,
                position: [parseFloat(s.longitude), parseFloat(s.latitude), 0],
                weight: s.weight,
                length: s.length,
                featureType: 'shark'
              }));
              setSharks(mockData);
            });
          }
        })
        .finally(() => setLoading('sharks', false));
    } else if (!activeLayers.sharks) {
      setSharks([]);
    }
    return () => controller.abort();
  }, [activeLayers.sharks]);

  // Real Satellites (CelesTrak)
  useEffect(() => {
    const controller = new AbortController();
    if (activeLayers.satellites && satellites.length === 0) {
      setLoading('satellites', true);
      fetch('/api/celestrak/NORAD/elements/stations.txt', { signal: controller.signal })
        .then(res => res.text())
        .then(text => {
          const lines = text.split('\n');
          const sats = [];
          for (let i = 0; i < lines.length - 2; i += 3) {
            const name = lines[i].trim();
            const tle1 = lines[i + 1].trim();
            const tle2 = lines[i + 2].trim();
            if (name && tle1 && tle2) {
              const satrec = satellite.twoline2satrec(tle1, tle2);
              sats.push({ id: `sat-${i}`, name, satrec, featureType: 'satellite' });
            }
          }
          setSatellites(sats);
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error(err);
        })
        .finally(() => setLoading('satellites', false));
    } else if (!activeLayers.satellites) {
      setSatellites([]);
      setSatellitePositions([]);
    }
    return () => controller.abort();
  }, [activeLayers.satellites]);

  // Satellite positions
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeLayers.satellites && satellites.length > 0) {
        const date = new Date(Date.now() + timeOffset * 1000);
        const positions = satellites.map(sat => {
          try {
            const positionAndVelocity = satellite.propagate(sat.satrec, date);
            const positionEci = positionAndVelocity.position;
            if (typeof positionEci !== 'boolean' && positionEci) {
              const gmst = satellite.gstime(date);
              const positionGd = satellite.eciToGeodetic(positionEci, gmst);
              const longitude = satellite.degreesLong(positionGd.longitude);
              const latitude = satellite.degreesLat(positionGd.latitude);
              const height = positionGd.height * 1000;
              return { ...sat, position: [longitude, latitude, height] };
            }
          } catch (e) { }
          return null;
        }).filter(Boolean);
        setSatellitePositions(positions);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLayers.satellites, satellites, timeOffset]);

  useEffect(() => {
    let count = 0;
    if (activeLayers.earthquakes) count += earthquakes.length;
    if (activeLayers.satellites) count += satellitePositions.length;
    if (activeLayers.wildfires) count += wildfires.length;
    if (activeLayers.volcanoes) count += volcanoes.length;
    if (activeLayers.airQuality) count += airQuality.length;
    if (activeLayers.neos) count += neos.length;
    if (activeLayers.aurora) count += aurora.length;
    if (activeLayers.launches) count += launches.length;
    if (activeLayers.cables) count += cables.length;
    if (activeLayers.sharks) count += sharks.length;
    if (activeLayers.iss && issData) count += 1;
    if (activeLayers.fireball) count += fireballData.length;
    if (activeLayers.tsunami) count += tsunamiData.length;
    if (activeLayers.gdelt) count += gdeltData.length;

    // Defer the state update to avoid updating parent during child render
    const frameId = requestAnimationFrame(() => {
      onNodeCountChange(count);
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    activeLayers, earthquakes.length,
    satellitePositions.length,
    wildfires.length, volcanoes.length, airQuality.length, neos.length,
    aurora.length, launches.length, cables.length, sharks.length,
    fireballData.length, tsunamiData.length, gdeltData.length,
    onNodeCountChange, issData
  ]);

  // Generate orbit path for satellites (approximate circular orbit at typical altitude)
  const orbitPathData = useMemo(() => {
    if (!activeLayers.satellites || satellitePositions.length === 0) return [];
    // Create a circular orbit path at ~400km altitude (ISS-like)
    const orbitAltitude = 400000; // meters
    const points: number[][] = [];
    const numPoints = 180;
    for (let i = 0; i <= numPoints; i++) {
      const lon = (i / numPoints) * 360 - 180;
      // Inclined orbit (~51.6 degrees for ISS)
      const lat = Math.sin((i / numPoints) * Math.PI * 2) * 51.6;
      points.push([lon, lat, orbitAltitude]);
    }
    return [points];
  }, [activeLayers.satellites, satellitePositions]);

  const layers = [
    googleMapsApiKey ? new Tile3DLayer({
      id: 'google-3d-tiles',
      data: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleMapsApiKey}`,
      loader: Tiles3DLoader
    }) : null,

    activeLayers.nightLights ? new TileLayer({
      id: 'night-lights',
      data: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
      minZoom: 0,
      maxZoom: 8,
      renderSubLayers: (props: any) => {
        const { tile } = props;
        if (!tile || !tile.boundingBox) return null;
        const { boundingBox } = tile;
        return new BitmapLayer({
          id: props.id,
          image: props.data,
          bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
        });
      }
    }) : null,

    (!googleMapsApiKey && !activeLayers.nightLights) && new SimpleMeshLayer({
      id: 'earth-sphere',
      data: [0],
      mesh: earthSphereGeometry,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: d => [0, 0, 0],
      getColor: d => [10, 15, 25]
    }),

    (!googleMapsApiKey && !activeLayers.nightLights) && new GeoJsonLayer({
      id: 'earth-land',
      data: EARTH_GEOJSON,
      stroked: true,
      filled: true,
      getFillColor: [35, 45, 55],
      getLineColor: [100, 115, 125],
      lineWidthMinPixels: 1,
    }),

    activeLayers.weatherRadar && weatherRadarUrl && new TileLayer({
      id: 'weather-radar',
      data: weatherRadarUrl,
      minZoom: 0,
      maxZoom: 12,
      renderSubLayers: (props: any) => {
        const { tile } = props;
        if (!tile || !tile.bbox) return null;
        
        // Handle different bbox formats from deck.gl TileLayer
        // bbox can be {x0, y0, x1, y1} or [[x0, y0], [x1, y1]]
        let bounds: [number, number, number, number];
        if (Array.isArray(tile.bbox[0])) {
          // Format: [[x0, y0], [x1, y1]]
          bounds = [tile.bbox[0][0], tile.bbox[0][1], tile.bbox[1][0], tile.bbox[1][1]];
        } else if (tile.bbox.x0 !== undefined) {
          // Format: {x0, y0, x1, y1}
          bounds = [tile.bbox.x0, tile.bbox.y0, tile.bbox.x1, tile.bbox.y1];
        } else if (tile.bbox.left !== undefined) {
          // Format: {left, top, right, bottom}
          bounds = [tile.bbox.left, tile.bbox.bottom, tile.bbox.right, tile.bbox.top];
        } else {
          return null;
        }
        
        return new BitmapLayer({
          id: props.id,
          image: props.data,
          bounds: bounds,
          transparentColor: [0, 0, 0, 0]
        });
      }
    }),

    activeLayers.cables && new GeoJsonLayer({
      id: 'cables',
      data: cables,
      stroked: true,
      filled: false,
      getLineColor: [99, 102, 241, 150],
      lineWidthMinPixels: 1,
      getLineWidth: 2,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.aurora && new PointCloudLayer({
      id: 'aurora',
      data: aurora,
      getPosition: (d: any) => d.position,
      getNormal: [0, 1, 0],
      getColor: (d: any) => [52, 211, 153, Math.min(255, d.intensity * 2)],
      pointSize: 50000,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.airQuality && new ScatterplotLayer({
      id: 'air-quality',
      data: airQuality,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        const val = d.measurements[0]?.value || 0;
        if (val < 50) return [52, 211, 153, 200];
        if (val < 100) return [250, 204, 21, 200];
        if (val < 150) return [249, 115, 22, 200];
        return [239, 68, 68, 200];
      },
      getRadius: 20000,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.earthquakes && new ScatterplotLayer({
      id: 'earthquakes',
      data: earthquakes,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 2,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.geometry.coordinates,
      getRadius: (d: any) => Math.pow(2, d.properties.mag) * 1000,
      getFillColor: (d: any) => d.id === selectedFeature?.id ? [255, 255, 255, 255] : [255, 100, 80, 200], // coral/red
      getLineColor: (d: any) => d.id === selectedFeature?.id ? [255, 255, 255] : [0, 0, 0],
      onClick: onFeatureClick,
      updateTriggers: {
        getFillColor: selectedFeature?.id,
        getLineColor: selectedFeature?.id
      }
    }),

    activeLayers.wildfires && new ScatterplotLayer({
      id: 'wildfires',
      data: wildfires,
      getPosition: (d: any) => d.position,
      getFillColor: [255, 140, 0, 255], // orange
      getRadius: 15000,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.volcanoes && new ScatterplotLayer({
      id: 'volcanoes',
      data: volcanoes,
      getPosition: (d: any) => d.position,
      getFillColor: [217, 119, 6, 255],
      getRadius: 20000,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.launches && new ScatterplotLayer({
      id: 'launches',
      data: launches,
      getPosition: (d: any) => d.position,
      getFillColor: [251, 146, 60, 255],
      getRadius: 25000,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.fireball && new ScatterplotLayer({
      id: 'fireball',
      data: fireballData,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => {
        const energy = d.energy || 0;
        if (energy > 10) return [255, 60, 30, 255]; // bright red for high energy
        if (energy > 1) return [255, 140, 0, 255];  // orange for medium energy
        return [255, 200, 50, 255];                  // yellow for low energy
      },
      getRadius: (d: any) => Math.max(8000, Math.sqrt(d.energy || 1) * 15000),
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.sharks && new ScatterplotLayer({
      id: 'sharks',
      data: sharks,
      getPosition: (d: any) => d.position,
      getFillColor: [59, 130, 246, 255],
      getRadius: 15000,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.neos && new ScatterplotLayer({
      id: 'neos',
      data: neos,
      getPosition: (d: any) => d.position,
      getFillColor: [239, 159, 39, 255], // amber
      getRadius: (d: any) => d.diameter * 1000,
      pickable: true,
      onClick: onFeatureClick
    }),

    // Satellite glow (larger semi-transparent circles behind dots)
    activeLayers.satellites && new ScatterplotLayer({
      id: 'satellites-glow',
      data: satellitePositions,
      pickable: false,
      opacity: 0.4,
      stroked: false,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 30,
      getPosition: (d: any) => d.position,
      getFillColor: [29, 158, 117, 100], // teal glow
      getRadius: 1,
    }),

    // Satellite markers (enhanced with teal color)
    activeLayers.satellites && new ScatterplotLayer({
      id: 'satellites',
      data: satellitePositions,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 15,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => d.id === selectedFeature?.id ? [0, 255, 255, 255] : [29, 158, 117, 255], // teal
      getLineColor: (d: any) => d.id === selectedFeature?.id ? [0, 255, 255, 255] : [0, 0, 0, 0],
      lineWidthMinPixels: 2,
      getLineWidth: (d: any) => d.id === selectedFeature?.id ? 2 : 0,
      onClick: onFeatureClick,
      updateTriggers: {
        getFillColor: selectedFeature?.id,
        getLineColor: selectedFeature?.id,
        lineWidthMinPixels: selectedFeature?.id
      }
    }),

    // Satellite labels
    activeLayers.satellites && new TextLayer({
      id: 'satellites-labels',
      data: satellitePositions.filter((_: any, i: number) => i < 20), // Only label first 20 to avoid clutter
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.name || '',
      getSize: 12,
      getColor: [29, 158, 117, 180], // teal with transparency
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      pixelOffset: [0, -8],
      fontFamily: 'monospace',
      fontWeight: 500,
    }),

    // Orbit path visualization
    activeLayers.satellites && orbitPathData.length > 0 && new PathLayer({
      id: 'orbit-path',
      data: orbitPathData,
      getPath: d => d,
      getColor: [29, 158, 117, 120], // teal
      getWidth: 2,
      widthMinPixels: 1,
      widthMaxPixels: 3,
      jointRounded: true,
      capRounded: true,
    }),

    // ISS Live Position marker with glow
    activeLayers.iss && issData && new ScatterplotLayer({
      id: 'iss-glow',
      data: [issData],
      pickable: false,
      opacity: 0.5,
      stroked: false,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 12,
      radiusMaxPixels: 40,
      getPosition: (d: any) => d.position,
      getFillColor: [255, 200, 50, 120], // golden glow
      getRadius: 1,
    }),

    activeLayers.iss && issData && new ScatterplotLayer({
      id: 'iss-marker',
      data: [issData],
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 5,
      radiusMaxPixels: 20,
      getPosition: (d: any) => d.position,
      getFillColor: [255, 220, 100, 255], // bright golden center
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 2,
      onClick: onFeatureClick,
    }),

    activeLayers.iss && issData && new TextLayer({
      id: 'iss-label',
      data: [issData],
      getPosition: (d: any) => d.position,
      getText: () => 'ISS',
      getSize: 14,
      getColor: [255, 220, 100, 220], // golden label
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      pixelOffset: [0, -10],
      fontFamily: 'monospace',
      fontWeight: 700,
    }),

    // NOAA Tsunami Alerts
    activeLayers.tsunami && tsunamiData.length > 0 && new GeoJsonLayer({
      id: 'tsunami-polygons',
      data: {
        type: 'FeatureCollection',
        features: tsunamiData.filter((f: any) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
      },
      stroked: true,
      filled: true,
      getFillColor: (d: any) => {
        const severity = (d.properties?.severity || '').toLowerCase();
        if (severity === 'severe' || severity === 'extreme') return [255, 50, 50, 100]; // red for warnings
        if (severity === 'moderate') return [255, 140, 0, 100]; // orange for watches
        return [255, 200, 50, 100]; // yellow for advisories
      },
      getLineColor: (d: any) => {
        const severity = (d.properties?.severity || '').toLowerCase();
        if (severity === 'severe' || severity === 'extreme') return [255, 50, 50, 255];
        if (severity === 'moderate') return [255, 140, 0, 255];
        return [255, 200, 50, 255];
      },
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      pickable: true,
      onClick: onFeatureClick
    }),

    activeLayers.tsunami && tsunamiData.length > 0 && new ScatterplotLayer({
      id: 'tsunami-points',
      data: tsunamiData.filter((f: any) => f.geometry?.type === 'Point'),
      getPosition: (d: any) => d.geometry.coordinates,
      getFillColor: (d: any) => {
        const event = (d.properties?.event || '').toLowerCase();
        if (event.includes('warning')) return [255, 50, 50, 220]; // red for warnings
        if (event.includes('watch')) return [255, 140, 0, 220]; // orange for watches
        return [255, 200, 50, 220]; // yellow for advisories
      },
      getRadius: 30000,
      radiusMinPixels: 5,
      radiusMaxPixels: 20,
      pickable: true,
      onClick: onFeatureClick
    }),

    // GDELT Global Events
    activeLayers.gdelt && new ScatterplotLayer({
      id: 'gdelt-events',
      data: gdeltData,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => d.color,
      getRadius: (d: any) => {
        const title = (d.title || '').toLowerCase();
        if (title.includes('conflict') || title.includes('disaster') || title.includes('war') || title.includes('attack')) {
          return 25000; // larger for conflict/disaster
        }
        return 18000;
      },
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
      onClick: onFeatureClick
    }),
  ].filter(Boolean);

  useEffect(() => {
    setIsMapIdle(false);
    const timeoutId = setTimeout(() => {
      setIsMapIdle(true);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [viewState]);

  const getTooltip = ({ object }: any) => {
    if (!object) return null;
    const fType = object.featureType || object.properties?.featureType;
    switch(fType) {
      case 'earthquake': return `Earthquake M${object.properties?.mag}\nLocation: ${object.properties?.place}`;
      case 'wildfire': return `Wildfire: ${object.title}`;
      case 'volcano': return `Volcano: ${object.title}`;
      case 'airQuality': return `AQI: ${object.measurements?.[0]?.value} ${object.measurements?.[0]?.unit}\nCity: ${object.city}`;
      case 'neo': return `NEO: ${object.name}\nDiameter: ${Math.round(object.diameter)}m`;
      case 'aurora': return `Aurora Intensity: ${object.intensity}%`;
      case 'launch': return `Launch: ${object.name}\nProvider: ${object.provider}`;
      case 'cable': return `Cable: ${object.properties?.name}`;
      case 'shark': return `Shark: ${object.name}\nSpecies: ${object.species}`;
      case 'satellite': return `Satellite: ${object.name}`;
      case 'iss': return `ISS\nLat: ${object.latitude?.toFixed(2)}°\nLon: ${object.longitude?.toFixed(2)}°\nAlt: ${object.altitude?.toFixed(1)} km`;
      case 'fireball': return `Fireball\nEnergy: ${object.energy} kt TNT\nDate: ${object.date}`;
      case 'tsunami': return `Tsunami: ${object.properties?.event || 'Alert'}\n${object.properties?.headline || ''}`;
      case 'gdelt': return `Event: ${object.title}\nSource: ${object.source}\nDate: ${object.date}`;
      default: return null;
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050505] overflow-hidden">
      <DeckGL
        views={[new GlobeView()]}
        layers={layers}
        initialViewState={viewState}
        onViewStateChange={e => {
          onViewStateChange(e.viewState);
        }}
        controller={true}
        getTooltip={getTooltip}
        getCursor={({ isDragging }) => (isDragging ? 'grabbing' : 'crosshair')}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      />
      
      {/* Atmospheric glow and lat/lon grid SVG overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Atmospheric glow gradient */}
          <radialGradient id="atmosGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="85%" stopColor="#0f6e56" stopOpacity="0.08" />
            <stop offset="95%" stopColor="#0f6e56" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f6e56" stopOpacity="0" />
          </radialGradient>
          {/* Globe edge glow */}
          <radialGradient id="edgeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="88%" stopColor="transparent" />
            <stop offset="95%" stopColor="#0f6e56" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0f6e56" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Atmospheric glow background */}
        <circle cx="500" cy="500" r="480" fill="url(#atmosGlow)" />
        
        {/* Globe edge ring */}
        <circle cx="500" cy="500" r="440" fill="none" stroke="#0f6e56" strokeWidth="1.5" opacity="0.25" />
        <circle cx="500" cy="500" r="440" fill="none" stroke="#1d9e75" strokeWidth="0.5" opacity="0.4" />
        
        {/* Lat/Lon grid lines */}
        <g opacity="0.15">
          {/* Latitude lines */}
          {[-60, -30, 30, 60].map((lat, i) => {
            const y = 500 - (lat / 90) * 440;
            const halfWidth = Math.sqrt(Math.max(0, 440 * 440 - (lat / 90 * 440) ** 2));
            return (
              <line
                key={`lat-${i}`}
                x1={500 - halfWidth}
                y1={y}
                x2={500 + halfWidth}
                y2={y}
                stroke="#1a3a28"
                strokeWidth="0.5"
              />
            );
          })}
          {/* Longitude lines */}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon, i) => {
            const x = 500 + (lon / 180) * 440;
            return (
              <ellipse
                key={`lon-${i}`}
                cx="500"
                cy="500"
                rx={Math.abs(Math.cos((lon / 180) * Math.PI)) * 440}
                ry="440"
                fill="none"
                stroke="#1a3a28"
                strokeWidth="0.5"
              />
            );
          })}
          {/* Equator */}
          <line x1="60" y1="500" x2="940" y2="500" stroke="#1a3a28" strokeWidth="0.8" opacity="0.3" />
        </g>
      </svg>
    </div>
  );
}
