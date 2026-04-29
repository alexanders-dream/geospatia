import React, { useState, useEffect } from 'react';
import DeckGLMap from './components/Map';
import Sidebar from './components/Sidebar';
import TimelineSlider from './components/TimelineSlider';
import TopBar from './components/TopBar';
import FeatureDetailPanel from './components/FeatureDetailPanel';
import IntelligenceDetailPanel from './components/IntelligenceDetailPanel';
import { FlyToInterpolator } from '@deck.gl/core';
import { useIntelligenceData, IntelPoint, IntelCategory } from './components/IntelligenceLayer';
import { Analytics } from "@vercel/analytics/react"
import { Globe } from 'lucide-react';

const INITIAL_VIEW_STATE = {
  longitude: 10,
  latitude: 20,
  zoom: 2
};

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);

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
    iss: false,
    fireball: false,
    tsunami: false,
  });

  // ── Intelligence layer state ──────────────────────────────────────────────
  const [activeIntelCategories, setActiveIntelCategories] = useState<Record<IntelCategory, boolean>>({
    conflict: false,
    advisory: false,
    business: false,
    disease: false,
    news: true,
  });
  const { data: intelPoints, loading: intelLoading, errors: intelErrors, refetch: refetchIntel } = useIntelligenceData(activeIntelCategories);
  const [selectedIntel, setSelectedIntel] = useState<IntelPoint | null>(null);
  const [selectedIntelCountry, setSelectedIntelCountry] = useState<string | null>(null);

  const toggleIntelCategory = (cat: IntelCategory) => {
    setActiveIntelCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    if (selectedIntel?.type === cat) {
      setSelectedIntel(null);
    }
    // Also clear country selection if all intel categories are turned off
    if (selectedIntelCountry && Object.values({ ...activeIntelCategories, [cat]: !activeIntelCategories[cat] }).every(v => !v)) {
      setSelectedIntelCountry(null);
    }
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
      setSelectedIntelCountry(null);
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
    setSelectedIntelCountry(null);
    setSelectedIntel(point);
    flyTo(point.position[0], point.position[1], 5);
  };

  const handleCountryClick = (country: string, coord: number[]) => {
    setSelectedFeature(null);
    setSelectedIntel(null);
    setSelectedIntelCountry(country);
    flyTo(coord[0], coord[1], 4);
  };

  const flyTo = (lon: number, lat: number, zoom = 6, duration = 3000) => {
    setViewState(prev => ({
      ...prev,
      longitude: lon,
      latitude: lat,
      zoom,
      transitionDuration: duration,
      transitionInterpolator: new FlyToInterpolator({ curve: 1.2 })
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
            apiErrors={apiErrors}
            zoom={viewState.zoom}
          />

          <DeckGLMap
            activeLayers={activeLayers}
            onFeatureClick={handleFeatureClick}
            onCountryClick={handleCountryClick}
            selectedFeature={selectedFeature}
            viewState={viewState}
            onViewStateChange={setViewState}
            onNodeCountChange={setActiveNodes}
            onLayerCountsChange={setLayerCounts}
            onLayerLoading={setLoadingStates}
            onApiError={handleApiError}
            timeOffset={timeOffset}
            // ── New intel props ──
            intelPoints={intelPoints}
            onIntelClick={handleIntelClick}
            selectedIntelId={selectedIntel?.id}
            selectedIntelCountry={selectedIntelCountry}
          />

          {/* Intelligence functionality is now in Sidebar */}
        </div>

        <TimelineSlider
          timeOffset={timeOffset}
          onChange={setTimeOffset}
          lat={viewState.latitude}
          lng={viewState.longitude}
          zoom={viewState.zoom}
          activeLayers={activeLayers}
        />
      </div>

      {/* Feature detail panel (existing) */}
      {selectedFeature && !selectedIntel && (
        <FeatureDetailPanel
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          onTrack={() => {
            const pos = selectedFeature.position || selectedFeature.geometry?.coordinates;
            if (pos) {
              flyTo(pos[0], pos[1], 5);
            }
          }}
        />
      )}

      {/* Intel detail panel (new) */}
      {(selectedIntel || selectedIntelCountry) && (
        <IntelligenceDetailPanel
          point={selectedIntel}
          countryPoints={selectedIntelCountry ? intelPoints.filter(p => p.country?.toUpperCase() === selectedIntelCountry) : null}
          countryName={selectedIntelCountry}
          onClose={() => { setSelectedIntel(null); setSelectedIntelCountry(null); }}
          onFlyTo={(lon, lat) => flyTo(lon, lat, 5)}
          onSelectPoint={(p) => setSelectedIntel(p)}
          onBackToList={() => setSelectedIntel(null)}
        />
      )}

      {/* Welcome / Onboarding Panel */}
      {showWelcome && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="bg-[#0d1520] border border-[#1e2e40] rounded-lg shadow-2xl w-[480px] max-w-[90vw] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                <Globe className="w-6 h-6 text-[#1d9e75]" />
                Welcome to GeoSpatia
              </h2>
              <p className="text-[#8aabbf] text-sm mb-6 leading-relaxed">
                A live, 3D interactive intelligence dashboard connecting planetary data with global events.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded bg-[#111e2a] flex items-center justify-center shrink-0 border border-[#1e2e40]">
                    <span className="text-[#3b82f6] font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-medium mb-1">Toggle Data Layers</h3>
                    <p className="text-xs text-[#8aabbf] leading-relaxed">Use the left sidebar to activate physical layers like satellites, weather radar, natural disasters, or the global wildlife feed.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded bg-[#111e2a] flex items-center justify-center shrink-0 border border-[#1e2e40]">
                    <span className="text-[#3b82f6] font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-medium mb-1">Explore Intelligence</h3>
                    <p className="text-xs text-[#8aabbf] leading-relaxed">Turn on intelligence categories (like Global News) at the bottom of the sidebar. Click the glowing nodes on the globe to read regional reports.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded bg-[#111e2a] flex items-center justify-center shrink-0 border border-[#1e2e40]">
                    <span className="text-[#3b82f6] font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-medium mb-1">Navigate Time</h3>
                    <p className="text-xs text-[#8aabbf] leading-relaxed">Use the timeline slider at the bottom of the screen to scrub satellite orbits backward and forward in time.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowWelcome(false)}
                className="w-full py-2.5 bg-[#1d9e75] hover:bg-[#157a5a] text-white rounded font-medium text-sm transition-colors"
              >
                Start Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}