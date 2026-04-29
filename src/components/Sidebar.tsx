import React, { useState } from 'react';
import {
  Globe, Satellite, Activity, Settings, Search,
  Flame, Mountain, Wind, CloudRain, Rocket, Cable,
  Lightbulb, Fish, Crosshair, Star, Waves, ChevronDown,
  Swords, AlertTriangle, TrendingUp, HeartPulse, Newspaper,
  RefreshCw, Bird
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { IntelCategory } from './IntelligenceLayer';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayerDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

interface LayerGroup {
  id: string;
  name: string;
  layers: LayerDef[];
}

interface IntelLayerDef {
  id: IntelCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  desc: string;
  severityColor: string;
}

interface SidebarProps {
  activeLayers: Record<string, boolean>;
  toggleLayer: (layer: string) => void;
  activeNodes: number;
  layerCounts?: Record<string, number>;
  loadingStates?: Record<string, boolean>;
  // Intel props
  activeIntelCategories: Record<IntelCategory, boolean>;
  toggleIntelCategory: (cat: IntelCategory) => void;
  intelLoading: Record<IntelCategory, boolean>;
  intelErrors: Record<IntelCategory, string | null>;
  intelPointCounts: Record<string, number>;
  onRefetchIntel: (cat: IntelCategory) => void;
}

// ─── Layer definitions ────────────────────────────────────────────────────────

const LAYER_GROUPS: LayerGroup[] = [
  {
    id: 'disasters',
    name: 'Natural Disasters',
    layers: [
      { id: 'earthquakes', label: 'Seismic Activity', icon: Activity, iconColor: 'text-amber-400', iconBg: 'bg-amber-900/30' },
      { id: 'wildfires', label: 'Active Wildfires', icon: Flame, iconColor: 'text-red-400', iconBg: 'bg-red-900/30' },
      { id: 'volcanoes', label: 'Volcano Eruptions', icon: Mountain, iconColor: 'text-gray-400', iconBg: 'bg-gray-800/30' },
      { id: 'tsunami', label: 'Tsunami Warnings', icon: Waves, iconColor: 'text-cyan-400', iconBg: 'bg-cyan-900/30' },
      { id: 'weatherRadar', label: 'Weather Radar', icon: CloudRain, iconColor: 'text-sky-400', iconBg: 'bg-sky-900/30' },
    ],
  },
  {
    id: 'space',
    name: 'Space & Astronomy',
    layers: [
      { id: 'satellites', label: 'Satellite Tracking', icon: Satellite, iconColor: 'text-teal-400', iconBg: 'bg-teal-900/30' },
      { id: 'iss', label: 'ISS Live Position', icon: Satellite, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-900/30' },
      { id: 'neos', label: 'Near-Earth Objects', icon: Crosshair, iconColor: 'text-blue-400', iconBg: 'bg-blue-900/30' },
      { id: 'aurora', label: 'Aurora Forecast', icon: Globe, iconColor: 'text-purple-400', iconBg: 'bg-purple-900/30' },
      { id: 'launches', label: 'Spacecraft Launches', icon: Rocket, iconColor: 'text-gray-400', iconBg: 'bg-gray-800/30' },
      { id: 'fireball', label: 'Fireball / Meteors', icon: Star, iconColor: 'text-orange-400', iconBg: 'bg-orange-900/30' },
    ],
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    layers: [
      { id: 'cables', label: 'Submarine Cables', icon: Cable, iconColor: 'text-blue-400', iconBg: 'bg-blue-900/30' },
      { id: 'nightLights', label: 'Global Night Lights', icon: Lightbulb, iconColor: 'text-amber-400', iconBg: 'bg-amber-900/30' },
      { id: 'airQuality', label: 'Air Quality Index', icon: Wind, iconColor: 'text-green-400', iconBg: 'bg-green-900/30' },
    ],
  },
  {
    id: 'wildlife',
    name: 'Ocean & Wildlife',
    layers: [
      { id: 'wildlife', label: 'Wildlife & Flora', icon: Bird, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-900/30' },
    ],
  },
];

const INTEL_LAYERS: IntelLayerDef[] = [
  {
    id: 'conflict',
    label: 'Armed Conflicts',
    icon: Swords,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-950/40',
    desc: 'ACLED + UN OCHA live events',
    severityColor: '#ef4444',
  },
  {
    id: 'advisory',
    label: 'Travel Advisories',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-950/40',
    desc: 'US State Dept Levels 2–4',
    severityColor: '#f97316',
  },
  {
    id: 'business',
    label: 'Business Opportunities',
    icon: TrendingUp,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-950/40',
    desc: 'World Bank high-growth markets',
    severityColor: '#22c55e',
  },
  {
    id: 'disease',
    label: 'Health Alerts',
    icon: HeartPulse,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-950/40',
    desc: 'WHO disease outbreak news',
    severityColor: '#a855f7',
  },
  {
    id: 'news',
    label: 'Global News',
    icon: Newspaper,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-950/40',
    desc: 'GDELT + ReliefWeb live feed',
    severityColor: '#38bdf8',
  },
];

// ─── Small reusable Toggle component ─────────────────────────────────────────

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={cn('w-7 h-4 rounded-full relative shrink-0 transition-colors duration-200',
      on ? 'bg-[#0f6e56]' : 'bg-[#1e2e40]')}>
      <div className={cn('absolute w-3 h-3 rounded-full top-0.5 transition-all duration-200',
        on ? 'left-[14px] bg-white' : 'left-0.5 bg-[#6a8898]')} />
    </div>
  );
}

// ─── Layer row ────────────────────────────────────────────────────────────────

function LayerRow({
  layer, isActive, isLoading, count, onClick,
}: {
  layer: LayerDef;
  isActive: boolean;
  isLoading: boolean;
  count?: number;
  onClick: () => void;
}) {
  const Icon = layer.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-4 py-[7px] cursor-pointer transition-colors duration-100',
        isActive ? 'bg-[#0d1e2c]' : 'hover:bg-[#111e2a]',
      )}
    >
      <div className={cn('w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0', layer.iconBg)}>
        <Icon className={cn('w-[11px] h-[11px]', layer.iconColor)} />
      </div>
      <span className={cn('flex-1 text-left text-[12px] truncate',
        isActive ? 'text-[#e0eef8]' : 'text-[#8aabbf]')}>
        {layer.label}
      </span>
      {isLoading && isActive ? (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2e40] text-[#8aabbf] shrink-0">
          ...
        </span>
      ) : (
        !isLoading && isActive && count !== undefined && count > 0 && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2e40] text-[#8aabbf] shrink-0">
            {count}
          </span>
        )
      )}
      <Toggle on={isActive} />
    </button>
  );
}

// ─── Intel layer row ──────────────────────────────────────────────────────────

function IntelRow({
  layer, isActive, isLoading, error, count, onToggle, onRefetch,
}: {
  layer: IntelLayerDef;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  count: number;
  onToggle: () => void;
  onRefetch: () => void;
}) {
  const Icon = layer.icon;
  return (
    <div className={cn(
      'mx-2 mb-1 rounded-lg border transition-all duration-150',
      isActive
        ? 'border-[#1e3a50] bg-[#0a1620]'
        : 'border-transparent hover:border-[#1e2e40] hover:bg-[#0d1520]',
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 cursor-pointer"
      >
        <div className={cn('w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0', layer.iconBg)}>
          <Icon className={cn('w-[11px] h-[11px]', layer.iconColor)} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className={cn('text-[12px] leading-none mb-0.5',
            isActive ? 'text-[#e0eef8]' : 'text-[#8aabbf]')}>
            {layer.label}
          </div>
          <div className="text-[10px] text-[#5b7a90] truncate">{layer.desc}</div>
        </div>

        {/* State indicators */}
        {isLoading && isActive ? (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2e40] text-[#8aabbf] shrink-0">
            ...
          </span>
        ) : (
          !isLoading && isActive && count > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2e40] text-[#8aabbf] shrink-0">
              {count}
            </span>
          )
        )}
        {error && !isLoading && (
          <button
            onClick={e => { e.stopPropagation(); onRefetch(); }}
            className="shrink-0 text-amber-500 hover:text-amber-400"
            title={`Error: ${error}. Click to retry.`}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}

        <Toggle on={isActive} />
      </button>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  id, title, children, defaultOpen = true, badge,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-4 pt-2.5 pb-1.5 hover:bg-white/[0.02] transition-colors group"
      >
        <span className="text-[11px] uppercase tracking-widest text-[#8aabbf] font-medium flex-1 text-left">
          {title}
        </span>
        {badge != null && badge > 0 && (
          <span className="text-[10px] bg-[#1e2e40] text-[#8aabbf] px-1.5 py-0.5 rounded font-mono">
            {badge}
          </span>
        )}
        <ChevronDown
          className={cn(
            'w-3 h-3 text-gray-700 group-hover:text-gray-500 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>
      <div className={cn(
        'overflow-hidden transition-all duration-200',
        open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
      )}>
        {children}
      </div>
    </div>
  );
}

// ─── Severity legend ──────────────────────────────────────────────────────────

function SeverityLegend() {
  const items = [
    { color: '#ef4444', label: 'Critical' },
    { color: '#f97316', label: 'High' },
    { color: '#eab308', label: 'Moderate' },
    { color: '#94a3b8', label: 'Low' },
    { color: '#22c55e', label: 'Opportunity' },
  ];
  return (
    <div className="mx-4 mt-1 mb-2 p-2.5 rounded-lg bg-[#0a1018] border border-[#1e2e40]/50">
      <div className="text-[8px] uppercase tracking-widest text-gray-700 mb-2 font-mono">Severity Scale</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-[9px] text-gray-600">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="text-[7px] text-gray-700 mt-2 leading-relaxed font-mono">
        Sources: ACLED · UN OCHA · WHO · World Bank · US State Dept · GDELT
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({
  activeLayers, toggleLayer, activeNodes, layerCounts = {}, loadingStates = {},
  activeIntelCategories, toggleIntelCategory, intelLoading, intelErrors,
  intelPointCounts, onRefetchIntel,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const sq = searchQuery.toLowerCase();

  const filteredGroups = LAYER_GROUPS.map(group => ({
    ...group,
    layers: group.layers.filter(l =>
      !sq || l.label.toLowerCase().includes(sq) || group.name.toLowerCase().includes(sq)
    ),
  })).filter(g => g.layers.length > 0);

  const filteredIntel = INTEL_LAYERS.filter(l =>
    !sq || l.label.toLowerCase().includes(sq) || 'intelligence'.includes(sq)
  );

  const totalIntelActive = Object.values(activeIntelCategories).filter(Boolean).length;
  const totalIntelPoints = Object.values(intelPointCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="w-[260px] min-w-[260px] bg-[#0d1520] border-r border-[#1e2e40]/50 h-full flex flex-col z-20 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-[#1e2e40]/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[#0f6e56] shrink-0">
              <Globe className="w-[13px] h-[13px] text-[#1d9e75]" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-[#e0eef8] tracking-[0.08em]">GEOSPATIA</div>
              <div className="text-[10px] text-[#3a7a60] tracking-[0.15em] mt-px">GLOBAL INTELLIGENCE</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {activeNodes > 0 && (
              <span className="text-[10px] font-mono text-[#3d7a6a] bg-[#0a1e18] px-1.5 py-0.5 rounded border border-[#0f3a2a]">
                {activeNodes.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="mx-3 my-2.5 flex items-center gap-1.5 bg-[#0a1018] border border-[#1e2e40]/50 rounded-md px-2.5 py-1.5">
        <Search className="w-3 h-3 text-[#5b7a90] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter layers…"
          className="bg-transparent border-none outline-none text-[#c8d8e8] text-[12px] w-full placeholder:text-[#5b7a90] font-sans"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-gray-600 hover:text-gray-400">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Layer list ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">

        {/* Geo layers */}
        {filteredGroups.map(group => (
          <CollapsibleSection key={group.id} id={group.id} title={group.name} defaultOpen={false}>
            {group.layers.map(layer => (
              <LayerRow
                key={layer.id}
                layer={layer}
                isActive={!!activeLayers[layer.id]}
                isLoading={!!loadingStates[layer.id]}
                count={layerCounts[layer.id]}
                onClick={() => toggleLayer(layer.id)}
              />
            ))}
          </CollapsibleSection>
        ))}

        {/* Intelligence section */}
        {filteredIntel.length > 0 && (
          <CollapsibleSection
            id="intel"
            title="Intelligence Layers"
            defaultOpen={true}
            badge={totalIntelPoints}
          >
            <div className="pt-0.5 pb-1">
              {filteredIntel.map(layer => (
                <IntelRow
                  key={layer.id}
                  layer={layer}
                  isActive={!!activeIntelCategories[layer.id]}
                  isLoading={!!intelLoading[layer.id]}
                  error={intelErrors[layer.id]}
                  count={intelPointCounts[layer.id] ?? 0}
                  onToggle={() => toggleIntelCategory(layer.id)}
                  onRefetch={() => onRefetchIntel(layer.id)}
                />
              ))}
            </div>

            {/* Severity legend — only when at least one intel layer active */}
            {totalIntelActive > 0 && <SeverityLegend />}
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}