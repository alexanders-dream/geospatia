import React, { useState } from 'react';

interface FeatureDetailPanelProps {
  feature: any | null;
  onClose: () => void;
  onTrack: () => void;
}

// Type configuration for different feature types
interface TypeConfig {
  badge: string;
  badgeColor: string;
  getName: (feature: any) => string;
  getRows: (feature: any) => { key: string; value: string; accent?: boolean }[];
  getChartData?: () => number[]; // Array of data points for the mini chart
  getChartLabel?: () => string; // Label for the chart
}

const typeConfigs: Record<string, TypeConfig> = {
  satellite: {
    badge: 'Satellite',
    badgeColor: 'bg-teal-900/30 text-teal-400',
    getName: (f) => f.name || f.properties?.name || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      const rows: { key: string; value: string; accent?: boolean }[] = [];
      if (props.altitude != null) rows.push({ key: 'Altitude', value: `${props.altitude} km`, accent: true });
      if (props.velocity != null) rows.push({ key: 'Velocity', value: `${props.velocity} km/s` });
      if (props.inclination != null) rows.push({ key: 'Inclination', value: `${props.inclination}°` });
      if (props.period != null) rows.push({ key: 'Period', value: `${props.period} min` });
      if (props.apogee != null) rows.push({ key: 'Apogee', value: `${props.apogee} km` });
      if (props.perigee != null) rows.push({ key: 'Perigee', value: `${props.perigee} km` });
      if (props.eccentricity != null) rows.push({ key: 'Eccentricity', value: props.eccentricity.toString() });
      if (props.noradId != null || props.norad_id != null) rows.push({ key: 'NORAD ID', value: String(props.noradId || props.norad_id) });
      if (props.status != null) rows.push({ key: 'Status', value: props.status, accent: true });
      if (rows.length === 0) rows.push({ key: 'Data', value: 'N/A' });
      return rows;
    },
    getChartData: () => null, // No real data source
    getChartLabel: () => 'Altitude track (6h)',
  },
  neo: {
    badge: 'NEO',
    badgeColor: 'bg-stone-900/30 text-stone-400',
    getName: (f) => f.name || f.properties?.name || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Distance', value: props.missDistance ? `${Math.round(props.missDistance).toLocaleString()} km` : 'N/A', accent: true },
        { key: 'Velocity', value: props.velocity ? `${Math.round(props.velocity).toLocaleString()} km/h` : 'N/A' },
        { key: 'Diameter', value: props.diameter ? `${Math.round(props.diameter)} m` : 'N/A' },
        { key: 'Approach', value: props.closeApproachDate || props.approach_date || 'N/A' },
        { key: 'Hazard', value: props.isPotentiallyHazardous ? 'Yes' : 'No', accent: !props.isPotentiallyHazardous },
      ];
    },
    getChartData: () => null, // No real time-series data source
    getChartLabel: () => 'Distance trend (24h)',
  },
  earthquake: {
    badge: 'Earthquake',
    badgeColor: 'bg-orange-900/30 text-orange-400',
    getName: (f) => f.properties?.place || f.place || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Magnitude', value: props.mag?.toString() || 'N/A', accent: true },
        { key: 'Depth', value: props.depth ? `${props.depth} km` : 'N/A' },
        { key: 'Location', value: props.place || 'N/A' },
        { key: 'Time', value: props.time ? new Date(props.time).toLocaleString() : 'N/A' },
      ];
    },
    getChartData: () => null,
    getChartLabel: () => 'Magnitude history',
  },
  wildfire: {
    badge: 'Wildfire',
    badgeColor: 'bg-red-900/30 text-red-400',
    getName: (f) => f.title || f.properties?.title || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Area', value: props.area ? `${props.area} ha` : 'N/A', accent: true },
        { key: 'Confidence', value: props.confidence ? `${props.confidence}%` : 'N/A' },
        { key: 'Detected', value: props.date ? new Date(props.date).toLocaleString() : 'N/A' },
      ];
    },
    getChartData: () => null,
    getChartLabel: () => 'Area growth (ha)',
  },
  volcano: {
    badge: 'Volcano',
    badgeColor: 'bg-red-900/30 text-red-400',
    getName: (f) => f.title || f.properties?.title || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Event', value: props.title || 'N/A' },
        { key: 'Date', value: props.date ? new Date(props.date).toLocaleDateString() : 'N/A' },
      ];
    },
  },
  wildlife: {
    badge: 'Wildlife',
    badgeColor: 'bg-emerald-900/30 text-emerald-400',
    getName: (f) => f.name || f.properties?.name || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Scientific Name', value: props.scientificName || 'N/A' },
        { key: 'Class', value: props.iconicTaxon || 'N/A', accent: true },
        { key: 'Observer', value: props.user || 'N/A' },
        { key: 'Date', value: props.date || 'N/A' },
        { key: 'Source', value: props.url ? 'iNaturalist' : 'N/A' },
      ];
    },
    getChartData: () => null,
    getChartLabel: () => '',
  },
  airQuality: {
    badge: 'Air Quality',
    badgeColor: 'bg-yellow-900/30 text-yellow-400',
    getName: (f) => f.city || f.location || f.properties?.city || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      const measurement = props.measurements?.[0] || {};
      return [
        { key: 'Location', value: props.city || props.location || 'N/A' },
        { key: 'Parameter', value: measurement.parameter?.toUpperCase() || 'N/A' },
        { key: 'Value', value: measurement.value ? `${measurement.value} ${measurement.unit}` : 'N/A', accent: true },
      ];
    },
    getChartData: () => null,
    getChartLabel: () => 'AQI trend (24h)',
  },
  aurora: {
    badge: 'Aurora',
    badgeColor: 'bg-emerald-900/30 text-emerald-400',
    getName: (f) => 'Aurora Activity',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Intensity', value: props.intensity ? `${props.intensity}%` : 'N/A', accent: true },
      ];
    },
  },
  launch: {
    badge: 'Launch',
    badgeColor: 'bg-orange-900/30 text-orange-400',
    getName: (f) => f.name || f.properties?.name || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Mission', value: props.name || 'N/A' },
        { key: 'Provider', value: props.provider || 'N/A' },
        { key: 'Time', value: props.window_start ? new Date(props.window_start).toLocaleString() : 'N/A' },
      ];
    },
  },
  iss: {
    badge: 'ISS',
    badgeColor: 'bg-yellow-900/30 text-yellow-400',
    getName: (f) => f.name || 'International Space Station (ISS)',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Latitude', value: props.latitude != null ? `${Number(props.latitude).toFixed(4)}°` : 'N/A', accent: true },
        { key: 'Longitude', value: props.longitude != null ? `${Number(props.longitude).toFixed(4)}°` : 'N/A', accent: true },
        { key: 'Altitude', value: props.altitude != null ? `${Number(props.altitude).toFixed(1)} km` : 'N/A' },
        { key: 'Velocity', value: props.velocity != null ? `${Number(props.velocity).toFixed(1)} km/h` : 'N/A' },
        { key: 'Visibility', value: props.visibility || 'N/A' },
        { key: 'Last Updated', value: props.lastUpdated ? new Date(props.lastUpdated).toLocaleString() : 'N/A' },
      ];
    },
    getChartData: () => null,
    getChartLabel: () => 'Altitude trend (km)',
  },
  fireball: {
    badge: 'Fireball',
    badgeColor: 'bg-orange-900/30 text-orange-400',
    getName: (f) => 'Fireball Event',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Date/Time', value: props.date || 'N/A' },
        { key: 'Latitude', value: props.latitude != null ? `${Number(props.latitude).toFixed(4)}°` : 'N/A', accent: true },
        { key: 'Longitude', value: props.longitude != null ? `${Number(props.longitude).toFixed(4)}°` : 'N/A', accent: true },
        { key: 'Energy', value: props.energy != null ? `${props.energy} kt TNT` : 'N/A' },
        { key: 'Energy Range', value: (props.energyMin != null && props.energyMax != null) ? `${props.energyMin} - ${props.energyMax} kt TNT` : 'N/A' },
        { key: 'Altitude', value: props.altitude != null ? `${props.altitude} km` : 'N/A' },
        { key: 'Velocity', value: props.velocity != null ? `${props.velocity} km/s` : 'N/A' },
      ];
    },
  },
  cable: {
    badge: 'Cable',
    badgeColor: 'bg-indigo-900/30 text-indigo-400',
    getName: (f) => f.properties?.name || 'Unknown',
    getRows: (f) => {
      const props = f.properties || f;
      return [
        { key: 'Name', value: props.name || 'N/A' },
        { key: 'Type', value: 'Submarine Cable' },
      ];
    },
  },
  tsunami: {
    badge: 'Tsunami',
    badgeColor: 'bg-cyan-900/30 text-cyan-400',
    getName: (f) => f.properties?.headline || f.properties?.event || 'Tsunami Alert',
    getRows: (f) => {
      const props = f.properties || f;
      const rows: { key: string; value: string; accent?: boolean }[] = [];
      if (props.event) rows.push({ key: 'Event Type', value: props.event, accent: true });
      if (props.headline) rows.push({ key: 'Headline', value: props.headline });
      if (props.description) rows.push({ key: 'Description', value: props.description });
      if (props.severity) rows.push({ key: 'Severity', value: props.severity, accent: true });
      if (props.urgency) rows.push({ key: 'Urgency', value: props.urgency });
      if (props.certainty) rows.push({ key: 'Certainty', value: props.certainty });
      if (props.effective) rows.push({ key: 'Effective', value: new Date(props.effective).toLocaleString() });
      if (props.expires) rows.push({ key: 'Expires', value: new Date(props.expires).toLocaleString() });
      if (props.affectedZones) rows.push({ key: 'Affected Zones', value: Array.isArray(props.affectedZones) ? props.affectedZones.join(', ') : props.affectedZones });
      if (rows.length === 0) rows.push({ key: 'Data', value: 'N/A' });
      return rows;
    },
  },
};

const defaultConfig: TypeConfig = {
  badge: 'Feature',
  badgeColor: 'bg-gray-900/30 text-gray-400',
  getName: (f) => f.name || f.properties?.name || f.title || 'Unknown',
  getRows: (f) => {
    const props = f.properties || f;
    return [
      { key: 'Type', value: f.featureType || props.featureType || 'Unknown' },
      { key: 'Coordinates', value: f.position ? `${Number(f.position[0] || 0).toFixed(2)}, ${Number(f.position[1] || 0).toFixed(2)}` : 'N/A' },
    ];
  },
  getChartData: () => null,
  getChartLabel: () => 'Trend',
};

function getTypeConfig(feature: any): TypeConfig {
  const type = feature?.featureType || feature?.properties?.featureType;
  return typeConfigs[type] || defaultConfig;
}

// Mini chart component with gradient fill and grid lines
function MiniChart({ data, label }: { data: number[] | null; label: string }) {
  if (!data || data.length < 2) return null;

  const width = 192;
  const height = 52;
  const padding = 4;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  const pointsStr = points.join(' ');

  // Area fill path
  const firstPt = points[0].split(',');
  const lastPt = points[points.length - 1].split(',');
  const areaPath = `${pointsStr} ${lastPt[0]},${height} ${firstPt[0]},${height}`;

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75].map((pct) => {
    const y = padding + chartH * (1 - pct);
    return { y, label: (min + range * pct).toFixed(0) };
  });

  return (
    <div className="mt-5">
      <div className="text-[9px] uppercase tracking-wider text-gray-600 mb-2">
        {label}
      </div>
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col justify-between text-[7px] text-gray-700 font-mono py-1 pointer-events-none">
          <span>{max.toFixed(0)}</span>
          <span>{((max + min) / 2).toFixed(0)}</span>
          <span>{min.toFixed(0)}</span>
        </div>
        <svg
          className="w-full ml-5"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d9e75" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1d9e75" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {gridLines.map((line, i) => (
            <line
              key={i}
              x1={padding}
              y1={line.y}
              x2={width - padding}
              y2={line.y}
              stroke="#1e2e40"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
          ))}

          {/* Area fill */}
          <polygon points={areaPath} fill="url(#chartGrad)" />

          {/* Base line */}
          <polyline
            points={pointsStr}
            fill="none"
            stroke="#0f6e56"
            strokeWidth="1.2"
            opacity="0.5"
          />

          {/* Dashed overlay */}
          <polyline
            points={pointsStr}
            fill="none"
            stroke="#1d9e75"
            strokeWidth="1"
            strokeDasharray="3 2"
          />

          {/* Endpoint circle */}
          {(() => {
            const endPt = points[points.length - 1].split(',');
            return (
              <>
                <circle cx={endPt[0]} cy={endPt[1]} r="4" fill="#1d9e75" opacity="0.2" />
                <circle cx={endPt[0]} cy={endPt[1]} r="2" fill="#1d9e75" />
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

export default function FeatureDetailPanel({
  feature,
  onClose,
  onTrack,
}: FeatureDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const config = feature ? getTypeConfig(feature) : null;
  const name = config ? config.getName(feature) : '';
  const rows = config ? config.getRows(feature) : [];
  const chartData = config?.getChartData?.();
  const chartLabel = config?.getChartLabel?.();

  const handleCopyCoords = () => {
    if (!feature) return;
    const pos = feature.position || feature.properties?.position || feature.geometry?.coordinates;
    if (pos && pos.length >= 2) {
      navigator.clipboard.writeText(`${Number(pos[1] || 0).toFixed(4)}, ${Number(pos[0] || 0).toFixed(4)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full h-full md:w-[260px] md:min-w-[260px] bg-[#0d1520] border-t md:border-t-0 md:border-l border-[#1e2e40]/50 flex flex-col rounded-t-2xl md:rounded-none">
      {/* Mobile Drag Handle */}
      <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden shrink-0 cursor-pointer" onClick={onClose}>
        <div className="w-10 h-1.5 bg-gray-700/50 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-3.5 py-3 border-b border-[#1e2e40]/50 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">
          Feature Details
        </span>
        <div className="flex items-center gap-1.5">
          {config && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.badgeColor}`}>
              {config.badge}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3.5 flex-1 overflow-y-auto">
        {feature ? (
          <>
            {/* Object name */}
            <div className="text-[18px] font-medium text-[#e0eef8] mb-4 truncate">
              {name}
            </div>

            {/* Wildlife Photo */}
            {(feature.photoUrl || feature.properties?.photoUrl) && (
              <div className="mb-4 -mt-2">
                <a href={feature.url || feature.properties?.url || '#'} target="_blank" rel="noreferrer">
                  <img 
                    src={feature.photoUrl || feature.properties?.photoUrl} 
                    alt={name}
                    className="w-full h-40 object-cover rounded border border-[#1e2e40] shadow-sm hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}

            {/* Key/value rows */}
            <div className="space-y-0">
              {rows.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center mb-2.5">
                  <span className="text-[11px] text-[#8aabbf]">{row.key}</span>
                  {row.value.startsWith('http://') || row.value.startsWith('https://') ? (
                    <a
                      href={row.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs tabular-nums text-[#3b82f6] hover:text-[#60a5fa] truncate max-w-[120px] underline"
                    >
                      {row.value.length > 30 ? row.value.substring(0, 30) + '...' : row.value}
                    </a>
                  ) : (
                    <span
                      className={`text-xs tabular-nums ${
                        row.accent ? 'text-[#e0eef8]' : 'text-[#c8d8e8]'
                      }`}
                    >
                      {row.value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Mini chart */}
            {chartData && chartLabel && (
              <MiniChart data={chartData} label={chartLabel} />
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full border border-dashed border-[#1e2e40] flex items-center justify-center mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3d5568] animate-ping" />
            </div>
            <p className="text-[11px] text-[#8aabbf] font-mono tracking-wider uppercase leading-relaxed">
              Select an object on the map<br />
              to view details
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3.5 py-2.5 border-t border-[#1e2e40]/50 flex gap-1.5">
        <button
          onClick={onTrack}
          className="flex-1 py-1.5 rounded-md border border-[#0f6e56] bg-transparent text-teal-400 text-[11px] cursor-pointer hover:bg-teal-900/30 transition-colors font-medium"
        >
          Fly To
        </button>
        <button
          onClick={handleCopyCoords}
          className="flex-1 py-1.5 rounded-md border border-[#1e3a50] bg-transparent text-gray-400 text-[11px] cursor-pointer hover:bg-[#111e2a] transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Coords'}
        </button>
      </div>
    </div>
  );
}
