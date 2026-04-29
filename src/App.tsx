import React, { useState, useEffect } from 'react';
import DeckGLMap from './components/Map';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import TimelineSlider from './components/TimelineSlider';
import TopBar from './components/TopBar';
import FeatureDetailPanel from './components/FeatureDetailPanel';
import IntelligenceDetailPanel from './components/IntelligenceDetailPanel';
import { FlyToInterpolator } from '@deck.gl/core';
import { useIntelligenceData, IntelPoint, IntelCategory } from './components/IntelligenceLayer';

const INITIAL_VIEW_STATE = {
  longitude: 10,
  latitude: 20,
  zoom: 2
};

export default function App() {
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    earthquakes: false,
    satellites: false,
    wildfires: false,
    volcanoes: false,
    airQuality: false,
    weatherRadar: false,
    neos: false,
    aurora: false,
    launches: false,
    cables: false,
    nightLights: false,
    sharks: false,
  });

  // ── Intelligence layer state ──────────────────────────────────────────────
  const [activeIntelCategories, setActiveIntelCategories] = useState<Record<IntelCategory, boolean>>({
    conflict: false,
    advisory: false,
    business: false,
    disease: false,
    news: false,
  });
  const { data: intelPoints, loading: intelLoading, errors: intelErrors, refetch: refetchIntel } = useIntelligenceData(activeIntelCategories);
  const [selectedIntel, setSelectedIntel] = useState<IntelPoint | null>(null);

  const toggleIntelCategory = (cat: IntelCategory) => {
    setActiveIntelCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    if (selectedIntel?.type === cat) setSelectedIntel(null);
  };

  const intelPointCounts: Record<string, number> = {};
  (['conflict', 'advisory', 'business', 'disease', 'news'] as IntelCategory[]).forEach(cat => {
    intelPointCounts[cat] = intelPoints.filter(p => p.type === cat).length;
  });

  // ── Existing state ────────────────────────────────────────────────────────
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [activeNodes, setActiveNodes] = useState(0);
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [timeOffset, setTimeOffset] = useState(0);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const handleApiError = (layer: string, error: string | null) => {
    if (error) {
      setApiErrors(prev => ({ ...prev, [layer]: error }));
      setTimeout(() => {
        setApiErrors(prev => {
          const updated = { ...prev };
          delete updated[layer];
          return updated;
        });
      }, 10000);
    } else {
      setApiErrors(prev => {
        const updated = { ...prev };
        delete updated[layer];
        return updated;
      });
    }
  };

  useEffect(() => {
    const key = localStorage.getItem('googleMapsApiKey');
    if (key) setGoogleMapsApiKey(key);

    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    const zoom = params.get('zoom');
    if (lat && lng) {
      setViewState(prev => ({
        ...prev,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        zoom: zoom ? parseInt(zoom) : 8,
        transitionDuration: 1500,
        transitionInterpolator: new FlyToInterpolator()
      }));
    }
  }, []);

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof prev] }));
  };

  const handleFeatureClick = (info: any) => {
    if (info.object) {
      // Clear any intel selection
      setSelectedIntel(null);
      setSelectedFeature(info.object);

      const nonZoomableLayers = ['satellites', 'neos', 'aurora', 'sharks', 'cables'];
      if (info.layer && !nonZoomableLayers.includes(info.layer.id)) {
        let pos = info.object.position || info.object.geometry?.coordinates;
        if (
          info.object.geometry?.type === 'LineString' ||
          info.object.geometry?.type === 'MultiLineString'
        ) return;
        if (pos && pos.length >= 2) {
          flyTo(pos[0], pos[1], 6);
        }
      }
    } else {
      setSelectedFeature(null);
    }
  };

  const handleIntelClick = (point: IntelPoint) => {
    setSelectedFeature(null);
    setSelectedIntel(point);
    flyTo(point.position[0], point.position[1], 5);
  };

  const flyTo = (lon: number, lat: number, zoom = 6, duration = 1500) => {
    setViewState(prev => ({
      ...prev,
      longitude: lon,
      latitude: lat,
      zoom,
      transitionDuration: duration,
      transitionInterpolator: new FlyToInterpolator()
    }));
  };

  const handleResetView = () => {
    setViewState({
      longitude: INITIAL_VIEW_STATE.longitude,
      latitude: INITIAL_VIEW_STATE.latitude,
      zoom: INITIAL_VIEW_STATE.zoom,
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator()
    } as any);
  };

  const handleZoomIn = () =>
    setViewState(prev => ({ ...prev, zoom: prev.zoom + 1, transitionDuration: 500 }));

  const handleZoomOut = () =>
    setViewState(prev => ({ ...prev, zoom: Math.max(0, prev.zoom - 1), transitionDuration: 500 }));

  // Is any intel category active?
  const anyIntelActive = Object.values(activeIntelCategories).some(Boolean);

  return (
    <div className="flex h-screen bg-[#0a0f14]">
      <Sidebar
        activeLayers={activeLayers}
        toggleLayer={toggleLayer}
        activeNodes={activeNodes}
        layerCounts={layerCounts}
        loadingStates={loadingStates}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeIntelCategories={activeIntelCategories}
        toggleIntelCategory={toggleIntelCategory}
        intelLoading={intelLoading}
        intelErrors={intelErrors}
        intelPointCounts={intelPointCounts}
        onRefetchIntel={refetchIntel}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <TopBar
            onResetView={handleResetView}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <DeckGLMap
            activeLayers={activeLayers}
            onFeatureClick={handleFeatureClick}
            selectedFeature={selectedFeature}
            viewState={viewState}
            onViewStateChange={setViewState}
            onNodeCountChange={setActiveNodes}
            onLayerCountsChange={setLayerCounts}
            onLayerLoading={setLoadingStates}
            onApiError={handleApiError}
            googleMapsApiKey={googleMapsApiKey}
            timeOffset={timeOffset}
            // ── New intel props ──
            intelPoints={intelPoints}
            onIntelClick={handleIntelClick}
            selectedIntelId={selectedIntel?.id}
          />

          {/* API Error Notifications */}
          {Object.keys(apiErrors).length > 0 && (
            <div className="absolute top-6 left-6 z-10">
              <div className="flex flex-col gap-2">
                {Object.entries(apiErrors).map(([layer, error]) => (
                  <div
                    key={layer}
                    className="bg-amber-500/90 backdrop-blur-md text-black px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2 shadow-lg animate-pulse"
                  >
                    <span className="font-bold">⚠ {layer}:</span>
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Intelligence functionality is now in Sidebar */}
        </div>

        <TimelineSlider
          timeOffset={timeOffset}
          onChange={setTimeOffset}
          lat={viewState.latitude}
          lng={viewState.longitude}
          alt={Math.round(6378137 * Math.pow(2, -viewState.zoom) / 1000)}
        />
      </div>

      {/* Feature detail panel (existing) */}
      {selectedFeature && !selectedIntel && (
        <FeatureDetailPanel
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          onTrack={() => {
            const pos = selectedFeature.position || selectedFeature.geometry?.coordinates;
            if (pos?.length >= 2) flyTo(pos[0], pos[1], 8);
          }}
          onHistory={() => setTimeOffset(-3600 * 6)}
          onShare={() => {
            const pos = selectedFeature.position || selectedFeature.geometry?.coordinates;
            if (pos?.length >= 2) {
              const url = `${window.location.origin}${window.location.pathname}?lat=${pos[1]}&lng=${pos[0]}&zoom=8`;
              navigator.clipboard?.writeText(url).catch(() => { });
            }
          }}
        />
      )}

      {/* Intel detail panel (new) */}
      {selectedIntel && (
        <IntelligenceDetailPanel
          point={selectedIntel}
          onClose={() => setSelectedIntel(null)}
          onFlyTo={(lon, lat) => flyTo(lon, lat, 5)}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(key) => setGoogleMapsApiKey(key)}
      />
    </div>
  );
}