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
import { IntelPoint, severityColor, COUNTRY_COORDS, ISO3_COORDS } from './IntelligenceLayer';
import {
  useEarthquakes, useEonetEvents, useAirQuality, useWeatherRadar,
  useNeos, useAurora, useLaunches, useIss, useFireballs, useTsunami,
  useCables, useWildlife
} from '../hooks/useMapLayerData';
import { useSatellites } from '../hooks/useSatellites';
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
  timeOffset?: number;
  intelPoints?: IntelPoint[];
  onIntelClick?: (p: IntelPoint) => void;
  selectedIntelId?: string;
  selectedIntelCountry?: string | null;
  onCountryClick?: (country: string, coord: number[]) => void;
}

export default function DeckGLMap({
  activeLayers, onFeatureClick, selectedFeature, viewState, onViewStateChange,
  onNodeCountChange, onLayerCountsChange, onLayerLoading, onApiError, timeOffset = 0,
  intelPoints = [], onIntelClick, selectedIntelId, selectedIntelCountry, onCountryClick,
}: MapProps) {

  // ── State via Custom Hooks ────────────────────────────────────────────────
  const [countryLabels, setCountryLabels] = useState<any[]>([]);

  // ── Country label data (loaded once) ─────────────────────────────────────
  useEffect(() => {
    fetch(EARTH_GEOJSON)
      .then(r => r.json())
      .then(data => {
        const labels = (data.features ?? []).map((f: any) => {
          const iso = f.properties.iso_a3;
          const name = f.properties.name || f.properties.sovereignt || f.properties.NAME || '';
          const pos = ISO3_COORDS[iso] || COUNTRY_COORDS[name.toUpperCase()];
          if (!pos) return null;
          return { position: [pos[1], pos[0], 0], name };
        }).filter(Boolean);
        setCountryLabels(labels);
      })
      .catch(() => { });
  }, []);

  const { data: earthquakes, loading: eqLoading } = useEarthquakes(activeLayers.earthquakes);
  const { wildfires, volcanoes, loadingWildfires: wfLoading, loadingVolcanoes: voLoading } = useEonetEvents(activeLayers.wildfires, activeLayers.volcanoes);
  const { data: airQuality, loading: aqLoading } = useAirQuality(activeLayers.airQuality);
  const { url: weatherRadarUrl, loading: wrLoading } = useWeatherRadar(activeLayers.weatherRadar);
  const { data: neos, loading: neoLoading } = useNeos(activeLayers.neos);
  const { data: aurora, loading: auLoading } = useAurora(activeLayers.aurora);
  const { data: launches, loading: lnLoading } = useLaunches(activeLayers.launches);
  const { data: issData } = useIss(activeLayers.iss);
  const { data: fireballData, loading: fbLoading } = useFireballs(activeLayers.fireball);
  const { data: tsunamiData, loading: tsLoading } = useTsunami(activeLayers.tsunami);
  const { data: cables, loading: cbLoading } = useCables(activeLayers.cables);
  const { data: wildlife, loading: wlLoading } = useWildlife(activeLayers.wildlife);
  const { satellitePositions, loading: satLoading } = useSatellites(activeLayers.satellites, timeOffset);

  useEffect(() => {
    if (onLayerLoading) {
      onLayerLoading({
        earthquakes: eqLoading,
        wildfires: wfLoading,
        volcanoes: voLoading,
        airQuality: aqLoading,
        weatherRadar: wrLoading,
        neos: neoLoading,
        aurora: auLoading,
        launches: lnLoading,
        fireball: fbLoading,
        tsunami: tsLoading,
        cables: cbLoading,
        wildlife: wlLoading,
        satellites: satLoading,
      });
    }
  }, [
    onLayerLoading, eqLoading, wfLoading, voLoading, aqLoading, wrLoading,
    neoLoading, auLoading, lnLoading, fbLoading, tsLoading, cbLoading,
    wlLoading, satLoading
  ]);

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
      wildlife: wildlife.length,
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
    cables.length, wildlife.length, fireballData.length, tsunamiData.length,
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

  const intelKey = `${intelPoints.length}`;

  const countriesWithIntel = useMemo(() => {
    return new Set(intelPoints.map(p => p.country?.toUpperCase()).filter(Boolean));
  }, [intelPoints]);

  const countryAggregates = useMemo(() => {
    const map = new Map<string, any>();
    const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, opportunity: 1, low: 0 };
    
    for (const p of intelPoints) {
      if (!p.country) continue;
      const c = p.country.toUpperCase();
      const existing = map.get(c);
      
      const baseCoord = COUNTRY_COORDS[c];
      const targetPos = baseCoord ? [baseCoord[1], baseCoord[0], 0] : p.position;
      
      if (!existing) {
         map.set(c, {
           id: `agg-${c}`,
           country: c,
           position: targetPos,
           severity: p.severity,
           type: p.type,
           count: 1,
           featureType: 'intel-aggregate'
         });
      } else {
         existing.count++;
         if (severityRank[p.severity] > severityRank[existing.severity]) {
           existing.severity = p.severity;
           existing.type = p.type;
         }
      }
    }
    return Array.from(map.values());
  }, [intelPoints]);

  // ── Hover state for country labels ────────────────────────────────────────
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // ── Layers ────────────────────────────────────────────────────────────────
  const layers = [
    // Base

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

    !activeLayers.nightLights && new SimpleMeshLayer({
      id: 'earth-sphere', data: [0], mesh: earthSphere,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: () => [0, 0, 0], getColor: () => [10, 15, 25],
    }),

    !activeLayers.nightLights && new GeoJsonLayer({
      id: 'earth-land', data: EARTH_GEOJSON, stroked: true, filled: true,
      getFillColor: (d: any) => {
        const name = (d.properties?.name || d.properties?.NAME || '').toUpperCase();
        const hoverName = (hoveredCountry || '').toUpperCase();
        if (name === hoverName || name === selectedIntelCountry) return [65, 85, 100];
        if (countriesWithIntel.has(name)) return [45, 60, 75];
        return [35, 45, 55];
      },
      getLineColor: (d: any) => {
        const name = (d.properties?.name || d.properties?.NAME || '').toUpperCase();
        if (name === selectedIntelCountry) return [200, 220, 230, 255];
        if (countriesWithIntel.has(name)) return [120, 140, 155, 200];
        return [100, 115, 125];
      },
      lineWidthMinPixels: 1,
      pickable: true,
      onHover: (info: any) => {
        setHoveredCountry(info.object?.properties?.name ?? info.object?.properties?.NAME ?? null);
      },
      onClick: (info: any) => {
        if (info.object) {
          const name = (info.object.properties?.name || info.object.properties?.NAME || '').toUpperCase();
          if (countriesWithIntel.has(name) && onCountryClick) {
            onCountryClick(name, info.coordinate);
            return;
          }
        }
        onFeatureClick(info);
      },
      updateTriggers: { getFillColor: [hoveredCountry, selectedIntelCountry, countriesWithIntel], getLineColor: [selectedIntelCountry, countriesWithIntel] },
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

    // (Wildlife layer is rendered further down)

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

    activeLayers.wildlife && new ScatterplotLayer({
      id: 'wildlife-layer',
      data: wildlife,
      getPosition: (d: any) => d.position,
      getFillColor: [74, 222, 128, 220],
      getLineColor: [255, 255, 255, 200],
      getRadius: 15000,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      pickable: true,
      onClick: onFeatureClick,
    }),

    // ── Intel layers (always on top) ─────────────────────────────────────────

    countryAggregates.length > 0 && new ScatterplotLayer({
      id: 'intel-glow', data: countryAggregates,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => { const [r, g, b] = severityColor(d.severity); return [r, g, b, 35]; },
      getRadius: 130000, radiusMinPixels: 18, radiusMaxPixels: 52,
      pickable: false, stroked: false,
      updateTriggers: { getFillColor: intelKey },
    }),

    countryAggregates.length > 0 && new ScatterplotLayer({
      id: 'intel-ring', data: countryAggregates,
      getPosition: (d: any) => d.position,
      getFillColor: [0, 0, 0, 0],
      getLineColor: (d: any) => { const [r, g, b] = severityColor(d.severity); return [r, g, b, 150]; },
      getRadius: 88000, radiusMinPixels: 12, radiusMaxPixels: 32,
      stroked: true, filled: true, lineWidthMinPixels: 1.5,
      pickable: false,
      updateTriggers: { getLineColor: intelKey },
    }),

    countryAggregates.length > 0 && new ScatterplotLayer({
      id: 'intel-core', data: countryAggregates,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) =>
        (d.country === hoveredCountry || d.country === selectedIntelCountry) ? [255, 255, 255, 255] : severityColor(d.severity),
      getLineColor: (d: any) =>
        (d.country === hoveredCountry || d.country === selectedIntelCountry) ? severityColor(d.severity) : [0, 0, 0, 0],
      getRadius: 45000, radiusMinPixels: 6, radiusMaxPixels: 18,
      stroked: true, filled: true, lineWidthMinPixels: 2,
      pickable: true,
      onClick: (info: any) => { 
        if (info.object && onCountryClick) {
          onCountryClick(info.object.country, info.object.position);
        }
      },
      updateTriggers: {
        getFillColor: [hoveredCountry, selectedIntelCountry, intelKey],
        getLineColor: [hoveredCountry, selectedIntelCountry, intelKey],
      },
    }),

    countryAggregates.length > 0 && new TextLayer({
      id: 'intel-icons', data: countryAggregates,
      getPosition: (d: any) => d.position,
      getText: (d: any) => ({ conflict: '⚔', advisory: '⚠', business: '◆', disease: '⬡', news: '◉' }[d.type as string] ?? '●'),
      getSize: 10,
      getColor: (d: any) => { const [r, g, b] = severityColor(d.severity); return [r, g, b, 220]; },
      getTextAnchor: 'middle', getAlignmentBaseline: 'center',
      fontFamily: 'sans-serif', pickable: false,
      updateTriggers: { getColor: intelKey },
    }),

    countryAggregates.length > 0 && new TextLayer({
      id: 'intel-counts', data: countryAggregates.filter((d: any) => d.count > 1),
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.count.toString(),
      getSize: 10,
      getColor: [255, 255, 255, 255],
      getTextAnchor: 'middle', getAlignmentBaseline: 'center',
      pixelOffset: [12, -12],
      fontFamily: 'monospace', fontWeight: 600, pickable: false,
      updateTriggers: { getText: intelKey },
    }),

  ].filter(Boolean);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  const getTooltipContent = (object: any) => {
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
      case 'wildlife': return `🌿 ${object.name}${object.scientificName ? `\n(${object.scientificName})` : ''}\nObserver: ${object.user || 'Unknown'}`;
      case 'satellite': return `🛰 ${object.name}`;
      case 'iss': return `ISS — Alt: ${object.altitude?.toFixed(1)} km`;
      case 'fireball': return `💥 Fireball — ${object.energy} kt TNT\n${object.date}`;
      case 'tsunami': return `🌊 ${object.properties?.event ?? 'Alert'}`;
      case 'conflict': return `⚔ ${object.title}\n${object.description?.slice(0, 80)}`;
      case 'advisory': return `⚠ ${object.title}`;
      case 'business': return `◆ ${object.title}`;
      case 'news': return `◉ ${object.source ? `${object.source}: ` : ''}${object.title}`;
      case 'intel-aggregate': return `${object.count} intel report${object.count > 1 ? 's' : ''} in ${object.country}\nSeverity: ${object.severity.toUpperCase()}`;
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
        onHover={setHoverInfo}
        getCursor={({ isDragging }) => isDragging ? 'grabbing' : 'crosshair'}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      />

      {/* Custom Tooltip Overlay */}
      {hoverInfo && hoverInfo.object && (
        <div
          className="absolute pointer-events-none z-50 bg-[#0a1018]/95 border border-[#1e2e40] rounded shadow-xl backdrop-blur-sm px-3 py-2"
          style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}
        >
          <div className="text-[11px] text-[#e0eef8] whitespace-pre-wrap font-sans leading-relaxed">
            {getTooltipContent(hoverInfo.object)}
          </div>
        </div>
      )}

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