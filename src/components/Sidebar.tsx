import React from 'react';
import {
  Globe, Satellite, Activity, Settings, Search,
  AlertTriangle,
  Flame, Mountain, Wind, CloudRain, Rocket, Cable, Lightbulb, Fish, Crosshair, Star, Waves, Newspaper
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeLayers: any;
  toggleLayer: (layer: string) => void;
  activeNodes: number;
  loadingStates?: Record<string, boolean>;
  onOpenSettings: () => void;
}

interface LayerDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

interface LayerGroup {
  name: string;
  layers: LayerDef[];
}

export default function Sidebar({ activeLayers, toggleLayer, activeNodes, loadingStates = {}, onOpenSettings }: SidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const categories: LayerGroup[] = [
    {
      name: 'Space & Astronomy',
      layers: [
        { id: 'satellites', label: 'Satellite Tracking', icon: Satellite, iconColor: 'text-teal-400', iconBg: 'bg-teal-900/30' },
        { id: 'iss', label: 'ISS Live Position', icon: Satellite, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-900/30' },
        { id: 'neos', label: 'Near-Earth Objects', icon: Crosshair, iconColor: 'text-blue-400', iconBg: 'bg-blue-900/30' },
        { id: 'aurora', label: 'Aurora Forecast', icon: Globe, iconColor: 'text-purple-400', iconBg: 'bg-purple-900/30' },
        { id: 'launches', label: 'Spacecraft Launches', icon: Rocket, iconColor: 'text-gray-400', iconBg: 'bg-gray-800/30' },
        { id: 'fireball', label: 'Fireball/Meteor Impacts', icon: Star, iconColor: 'text-orange-400', iconBg: 'bg-orange-900/30' },
      ]
    },
    {
      name: 'Natural Disasters',
      layers: [
        { id: 'earthquakes', label: 'Seismic Activity', icon: Activity, iconColor: 'text-amber-400', iconBg: 'bg-amber-900/30' },
        { id: 'wildfires', label: 'Active Wildfires', icon: Flame, iconColor: 'text-red-400', iconBg: 'bg-red-900/30' },
        { id: 'volcanoes', label: 'Volcano Eruptions', icon: Mountain, iconColor: 'text-gray-400', iconBg: 'bg-gray-800/30' },
        { id: 'tsunami', label: 'Tsunami Warnings', icon: Waves, iconColor: 'text-cyan-400', iconBg: 'bg-cyan-900/30' },
      ]
    },
    {
      name: 'Infrastructure',
      layers: [
        { id: 'cables', label: 'Submarine Cables', icon: Cable, iconColor: 'text-blue-400', iconBg: 'bg-blue-900/30' },
        { id: 'nightLights', label: 'Global Night Lights', icon: Lightbulb, iconColor: 'text-amber-400', iconBg: 'bg-amber-900/30' },
      ]
    }
  ];

  return (
    <div className="w-[260px] min-w-[260px] bg-[#0d1520] border-r border-[#1e2e40]/50 h-full flex flex-col z-20 overflow-hidden">
      {/* Header */}
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
          <button onClick={onOpenSettings} className="p-1.5 hover:bg-white/10 rounded transition-colors shrink-0" title="Settings">
            <Settings className="w-4 h-4 text-zinc-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mx-3 my-2.5 flex items-center gap-1.5 bg-[#0a1018] border border-[#1e2e40]/50 rounded-md px-2.5 py-1.5">
        <Search className="w-3 h-3 text-[#3d5568] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search location or object…"
          className="bg-transparent border-none outline-none text-[#c8d8e8] text-[12px] w-full placeholder:text-[#3d5568] font-sans"
        />
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {categories
          .map((category) => ({
            ...category,
            layers: category.layers.filter(
              (layer) =>
                layer.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                category.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
          }))
          .filter((category) => category.layers.length > 0)
          .map((category, idx) => (
            <div key={idx} className="mb-1.5">
              <div className="text-[9px] uppercase tracking-widest text-gray-600 px-4 pt-2.5 pb-1 font-medium">
                {category.name}
              </div>
              {category.layers.map((layer) => {
              const Icon = layer.icon;
              const isActive = activeLayers[layer.id];
              const isLoading = loadingStates[layer.id];
              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-[7px] cursor-pointer transition-[background] duration-120",
                    isActive ? "bg-[#0d1e2c]" : "hover:bg-[#111e2a]"
                  )}
                >
                  {/* Colored icon square */}
                  <div className={cn(
                    "w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0",
                    layer.iconBg
                  )}>
                    <Icon className={cn("w-[11px] h-[11px]", layer.iconColor)} />
                  </div>

                  {/* Label */}
                  <span className={cn(
                    "flex-1 text-left text-[12px] truncate",
                    isActive ? "text-[#d8eaf8]" : "text-[#9ab0c2]"
                  )}>
                    {layer.label}
                  </span>

                  {/* Loading spinner */}
                  {isLoading && (
                    <div className="w-3 h-3 rounded-full border border-white/20 border-t-emerald-400 animate-spin shrink-0" />
                  )}

                  {/* Toggle switch */}
                  <div className={cn(
                    "w-7 h-4 rounded-full relative shrink-0 cursor-pointer transition-[background] duration-200",
                    isActive ? "bg-[#0f6e56]" : "bg-[#1e2e40]"
                  )}>
                    <div className={cn(
                      "absolute w-3 h-3 rounded-full top-0.5 transition-[left,background] duration-200",
                      isActive ? "left-[14px] bg-white" : "left-0.5 bg-[#6a8898]"
                    )} />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
