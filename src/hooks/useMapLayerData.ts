import { useState, useEffect, useCallback, useRef } from 'react';

export function useEarthquakes(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setData(d.features.map((f: any, i: number) => ({
          ...f, id: `eq-${i}`, properties: { ...f.properties, featureType: 'earthquake' },
        }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading(false));
    } else if (!active) {
      setData([]);
    }
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useEonetEvents(activeWildfires: boolean, activeVolcanoes: boolean) {
  const [wildfires, setWildfires] = useState<any[]>([]);
  const [volcanoes, setVolcanoes] = useState<any[]>([]);
  const [loadingWildfires, setLoadingWildfires] = useState(false);
  const [loadingVolcanoes, setLoadingVolcanoes] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const needFetch = (activeWildfires || activeVolcanoes) && !wildfires.length && !volcanoes.length;
    if (needFetch) {
      setLoadingWildfires(true); setLoadingVolcanoes(true);
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
        .finally(() => { setLoadingWildfires(false); setLoadingVolcanoes(false); });
    } else {
      if (!activeWildfires) setWildfires([]);
      if (!activeVolcanoes) setVolcanoes([]);
    }
    return () => ctrl.abort();
  }, [activeWildfires, activeVolcanoes]);

  return { wildfires, volcanoes, loadingWildfires, loadingVolcanoes };
}

export function useAirQuality(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      fetch(`/api/airquality?latlng=-60,-180,60,180`, { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error('WAQI'); return r.json(); })
        .then(d => {
          if (d.status !== 'ok') throw new Error(d.data || 'WAQI error');
          setData(d.data.map((s: any, i: number) => ({
            id: `aqi-${s.uid ?? i}`, location: s.station.name, city: s.station.name,
            position: [s.lon, s.lat, 0],
            measurements: [{ parameter: 'aqi', value: s.aqi, unit: 'AQI' }],
            featureType: 'airQuality',
          })));
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useWeatherRadar(active: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !url) {
      setLoading(true);
      fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => {
          const last = d.radar.past[d.radar.past.length - 1];
          setUrl(`${d.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`);
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading(false));
    } else if (!active) setUrl(null);
    return () => ctrl.abort();
  }, [active]);

  return { url, loading };
}

export function useNeos(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setData((d.near_earth_objects[today] ?? []).map((neo: any) => ({
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
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useAurora(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setData(
          d.coordinates.filter((p: any[]) => p[2] > 10)
            .map((p: any[], i: number) => ({ id: `aurora-${i}`, position: [p[0], p[1], 100000], intensity: p[2], featureType: 'aurora' }))
        ))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useLaunches(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setData(d.results.map((l: any) => ({
          id: l.id, name: l.name, provider: l.launch_service_provider?.name,
          position: [Number(l.pad.longitude), Number(l.pad.latitude), 0],
          pad: l.pad.name, window_start: l.window_start, featureType: 'launch',
        }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useIss(active: boolean) {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (active) {
      const fetch_ = () =>
        fetch('https://api.wheretheiss.at/v1/satellites/25544')
          .then(r => r.json())
          .then(d => setData({
            id: 'iss-live', name: 'International Space Station (ISS)',
            position: [d.longitude, d.latitude, d.altitude * 1000],
            latitude: d.latitude, longitude: d.longitude, altitude: d.altitude,
            velocity: d.velocity, visibility: d.visibility,
            featureType: 'iss', lastUpdated: new Date().toISOString(),
          }))
          .catch(() => { });
      fetch_();
      timer = setInterval(fetch_, 5000);
    } else setData(null);
    return () => { if (timer) clearInterval(timer); };
  }, [active]);

  return { data };
}

export function useFireballs(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      const since = new Date(Date.now() - 2 * 365 * 864e5).toISOString().split('T')[0];
      fetch(`/api/nasa-fireball/fireball.api?date-min=${since}&limit=500`, { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
        .then(d => {
          if (!d?.data) return;
          const f = d.fields as string[];
          setData(d.data.map((row: any[], i: number) => {
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
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useTsunami(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      fetch('/api/noaa-tsunami/alerts/active?event=Tsunami', { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => setData((d.features ?? []).map((f: any, i: number) => ({
          ...f, id: f.id ?? `tsunami-${i}`, properties: { ...f.properties, featureType: 'tsunami' },
        }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useCables(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      fetch('/api/cables/api/v3/cable/cable-geo.json', { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error('cables'); return r.json(); })
        .then(d => setData(d.features.map((f: any) => ({ ...f, properties: { ...f.properties, featureType: 'cable' } }))))
        .catch(e => { if (e.name !== 'AbortError') console.error(e); })
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}

export function useSharks(active: boolean) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    if (active && !data.length) {
      setLoading(true);
      fetch('/api/ocearch/tracker/ajax/filter-sharks', { signal: ctrl.signal })
        .then(r => {
          if (!r.headers.get('content-type')?.includes('application/json')) throw new Error('non-JSON');
          return r.json();
        })
        .then(d => setData(d.map((s: any) => ({
          id: `shark-${s.id}`, name: s.name, species: s.species,
          position: [parseFloat(s.longitude), parseFloat(s.latitude), 0],
          weight: s.weight, length: s.length, featureType: 'shark',
        })).filter((s: any) => !isNaN(s.position[0]) && !isNaN(s.position[1]))))
        .catch(() =>
          import('../data/mockSharks').then(m => setData(m.mockSharkData.map((s: any) => ({
            id: `shark-${s.id}`, name: s.name, species: s.species,
            position: [parseFloat(s.longitude), parseFloat(s.latitude), 0],
            weight: s.weight, length: s.length, featureType: 'shark',
          }))))
        )
        .finally(() => setLoading(false));
    } else if (!active) setData([]);
    return () => ctrl.abort();
  }, [active]);

  return { data, loading };
}
