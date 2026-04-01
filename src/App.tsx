import React, { useState, useEffect } from 'react';
import DeckGLMap from './components/Map';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import TimelineSlider from './components/TimelineSlider';
import TopBar from './components/TopBar';
import FeatureDetailPanel from './components/FeatureDetailPanel';
import { FlyToInterpolator } from '@deck.gl/core';

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

  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [activeNodes, setActiveNodes] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [timeOffset, setTimeOffset] = useState(0); // in seconds
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const handleApiError = (layer: string, error: string | null) => {
    if (error) {
      setApiErrors(prev => ({ ...prev, [layer]: error }));
      // Auto-clear after 10 seconds
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

    // Load shared URL parameters
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
      setSelectedFeature(info.object);
      
      // Fly to the selected feature ONLY if it's a land-based object
      const nonZoomableLayers = [
        'satellites', 'neos', 'aurora', 'sharks', 'cables'
      ];
      
      if (info.layer && !nonZoomableLayers.includes(info.layer.id)) {
        let pos = info.object.position || info.object.geometry?.coordinates;
        
        // Handle GeoJSON features where coordinates might be nested
        if (info.object.geometry?.type === 'LineString' || info.object.geometry?.type === 'MultiLineString') {
           // Don't zoom to lines for now, or pick the first point
           return;
        }

        if (pos && pos.length >= 2) {
          setViewState(prev => ({
            ...prev,
            longitude: pos[0],
            latitude: pos[1],
            zoom: 6,
            transitionDuration: 1500,
            transitionInterpolator: new FlyToInterpolator()
          }));
        }
      }
    } else {
      setSelectedFeature(null);
    }
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

  const handleZoomIn = () => {
    setViewState(prev => ({
      ...prev,
      zoom: prev.zoom + 1,
      transitionDuration: 500
    }));
  };

  const handleZoomOut = () => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0, prev.zoom - 1),
      transitionDuration: 500
    }));
  };

  return (
    <div className="flex h-screen bg-[#0a0f14]">
      <Sidebar
        activeLayers={activeLayers}
        toggleLayer={toggleLayer}
        activeNodes={activeNodes}
        loadingStates={loadingStates}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
            onLayerLoading={setLoadingStates}
            onApiError={handleApiError}
            googleMapsApiKey={googleMapsApiKey}
            timeOffset={timeOffset}
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
        </div>

        <TimelineSlider
          timeOffset={timeOffset}
          onChange={setTimeOffset}
          lat={viewState.latitude}
          lng={viewState.longitude}
          alt={Math.round(6378137 * Math.pow(2, -viewState.zoom) / 1000)}
        />
      </div>
      
      {selectedFeature && (
        <FeatureDetailPanel
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          onTrack={() => {
            const pos = selectedFeature.position || selectedFeature.geometry?.coordinates;
            if (pos && pos.length >= 2) {
              setViewState(prev => ({
                ...prev,
                longitude: pos[0],
                latitude: pos[1],
                zoom: 8,
                transitionDuration: 1500,
                transitionInterpolator: new FlyToInterpolator()
              }));
            }
          }}
          onHistory={() => {
            // Set time offset to show historical position
            setTimeOffset(-3600 * 6); // 6 hours ago
          }}
          onShare={() => {
            const pos = selectedFeature.position || selectedFeature.geometry?.coordinates;
            if (pos && pos.length >= 2) {
              const url = `${window.location.origin}${window.location.pathname}?lat=${pos[1]}&lng=${pos[0]}&zoom=8`;
              navigator.clipboard?.writeText(url).catch(() => {});
            }
          }}
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
