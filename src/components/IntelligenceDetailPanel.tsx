import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Navigation } from 'lucide-react';
import { IntelPoint, severityColor } from './IntelligenceLayer';

interface Props {
  point: IntelPoint | null;
  countryPoints?: IntelPoint[] | null;
  countryName?: string | null;
  onClose: () => void;
  onFlyTo: (lon: number, lat: number) => void;
  onSelectPoint?: (p: IntelPoint) => void;
  onBackToList?: () => void;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'CRITICAL', high: 'HIGH RISK', medium: 'MODERATE',
  low: 'LOW RISK', opportunity: 'OPPORTUNITY',
};

const SEVERITY_CLASSES: Record<string, string> = {
  critical: 'text-red-400    bg-red-950/50    border-red-800/60',
  high: 'text-orange-400 bg-orange-950/50 border-orange-800/60',
  medium: 'text-yellow-400 bg-yellow-950/50 border-yellow-800/60',
  low: 'text-slate-400  bg-slate-900/50  border-slate-700/60',
  opportunity: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60',
};

const TYPE_META: Record<string, { label: string; icon: string }> = {
  conflict: { label: 'Armed Conflict', icon: '⚔' },
  advisory: { label: 'Travel Advisory', icon: '⚠' },
  business: { label: 'Business Intel', icon: '◆' },
  disease: { label: 'Health Alert', icon: '⬡' },
  news: { label: 'News / Humanitarian', icon: '◉' },
};

function AdvisoryBar({ level }: { level: number }) {
  const colors = ['', '#22c55e', '#eab308', '#f97316', '#ef4444'];
  const labels = ['', 'Normal', 'Caution', 'Reconsider', 'Do Not Travel'];
  return (
    <div className="mt-3">
      <div className="text-[9px] font-mono uppercase tracking-wider text-gray-600 mb-1.5">Advisory Level</div>
      <div className="flex gap-1 h-2 mb-1.5">
        {[1, 2, 3, 4].map(l => (
          <div key={l} className="flex-1 rounded-sm"
            style={{ background: l <= level ? colors[level] : '#1e2e40', opacity: l <= level ? 1 : 0.35 }} />
        ))}
      </div>
      <div className="flex justify-between text-[8px]">
        {[1, 2, 3, 4].map(l => (
          <span key={l} style={{ color: l === level ? colors[level] : '#4b5563' }}>{labels[l]}</span>
        ))}
      </div>
    </div>
  );
}

function FatalityBar({ fatalities }: { fatalities?: number }) {
  if (!fatalities) return null;
  const bars = Math.min(10, Math.ceil(Math.log10(fatalities + 1) * 3));
  return (
    <div className="mt-3">
      <div className="text-[9px] font-mono uppercase tracking-wider text-gray-600 mb-1.5">Reported Fatalities</div>
      <div className="flex gap-0.5 items-end h-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-sm"
            style={{
              height: `${30 + i * 7}%`,
              background: i < bars ? '#ef4444' : '#1e2e40',
              opacity: i < bars ? Math.min(1, 0.5 + i * 0.06) : 0.3,
            }} />
        ))}
      </div>
      <div className="text-[10px] text-red-400 font-mono mt-1">{fatalities.toLocaleString()} fatalities</div>
    </div>
  );
}

function MetaRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-[#1e2e40]/40 last:border-0">
      <span className="text-[10px] text-gray-600 shrink-0">{label}</span>
      <span className={`text-[10px] font-mono text-right break-all ${accent ? 'text-[#7fd4b0]' : 'text-[#9ab0c2]'}`}>
        {value}
      </span>
    </div>
  );
}

export default function IntelligenceDetailPanel({ point, countryPoints, countryName, onClose, onFlyTo, onSelectPoint, onBackToList }: Props) {
  const [copied, setCopied] = useState(false);

  if (point) {
    const [r, g, b] = severityColor(point.severity);
    const typeMeta = TYPE_META[point.type] ?? { label: 'Intel', icon: '●' };
    const severityClass = SEVERITY_CLASSES[point.severity] ?? SEVERITY_CLASSES.low;

    const handleCopy = () => {
      const text = [
        point.title,
        point.description,
        point.country ? `Country: ${point.country}` : '',
        point.source ? `Source: ${point.source}` : '',
        point.date ? `Date: ${point.date}` : '',
        `Coords: ${point.position[1].toFixed(4)}°, ${point.position[0].toFixed(4)}°`,
        point.url ? point.url : '',
      ].filter(Boolean).join('\n');
      navigator.clipboard?.writeText(text).catch(() => { });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="w-full h-full md:w-[260px] md:min-w-[260px] bg-[#0a1018] border-t md:border-t-0 md:border-l border-[#1e2e40]/60 flex flex-col rounded-t-2xl md:rounded-none z-50 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Severity stripe */}
        <div className="h-[3px] w-full shrink-0" style={{ background: `rgb(${r},${g},${b})` }} />

        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center pt-2 pb-1 md:hidden shrink-0 cursor-pointer bg-[#0d1520]" onClick={onClose}>
          <div className="w-10 h-1.5 bg-gray-700/50 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-[#1e2e40]/50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {countryPoints && countryPoints.length > 0 && onBackToList && (
              <button onClick={onBackToList} className="text-gray-400 hover:text-white mr-1 shrink-0" title="Back to list">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
            )}
            <span className="text-[14px] leading-none shrink-0">{typeMeta.icon}</span>
            <span className="text-[9px] uppercase tracking-widest text-gray-600 font-mono truncate">
              {typeMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${severityClass}`}>
              {SEVERITY_LABELS[point.severity]}
            </span>
            <button onClick={onClose}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 custom-scrollbar">
        {/* Title */}
        <h2 className="text-[14px] font-semibold text-[#e0eef8] leading-snug mb-2">{point.title}</h2>

        {/* Country + date chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {point.country && (
            <span className="text-[9px] text-[#3d7a6a] font-mono bg-[#0d1e2c] px-1.5 py-0.5 rounded border border-[#0f3a2a]">
              {point.country}
            </span>
          )}
          {point.date && (
            <span className="text-[9px] text-gray-600 font-mono bg-[#0d1520] px-1.5 py-0.5 rounded">
              {point.date}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-[12px] text-[#8aabbf] leading-relaxed mb-3">{point.description}</p>

        {/* Divider */}
        <div className="h-px bg-[#1e2e40]/60 mb-3" />

        {/* Type-specific visualisations */}
        {point.type === 'advisory' && point.meta?.level && (
          <AdvisoryBar level={point.meta.level} />
        )}
        {point.type === 'conflict' && (
          <FatalityBar fatalities={point.meta?.fatalities} />
        )}
        {point.type === 'business' && point.meta?.gdpGrowth && (
          <div className="mt-1 mb-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
            <div className="text-[9px] text-emerald-600 font-mono uppercase tracking-wider mb-1">GDP Growth</div>
            <div className="text-[20px] font-bold text-emerald-400 font-mono">{point.meta.gdpGrowth}</div>
          </div>
        )}

        {/* Key/value rows */}
        <div className="mt-3">
          <MetaRow label="Latitude" value={`${point.position[1].toFixed(4)}°`} accent />
          <MetaRow label="Longitude" value={`${point.position[0].toFixed(4)}°`} accent />
          {point.source && <MetaRow label="Source" value={point.source} />}
          {point.meta?.actor1 && point.meta.actor1 !== '' && (
            <MetaRow label="Actor 1" value={point.meta.actor1} />
          )}
          {point.meta?.actor2 && point.meta.actor2 !== '' && (
            <MetaRow label="Actor 2" value={point.meta.actor2} />
          )}
          {point.meta?.eventType && (
            <MetaRow label="Event Type" value={point.meta.eventType} />
          )}
          {point.meta?.language && point.meta.language !== 'English' && (
            <MetaRow label="Language" value={point.meta.language} />
          )}
          {point.meta?.tone != null && (
            <MetaRow label="Sentiment" value={`${point.meta.tone > 0 ? '+' : ''}${point.meta.tone.toFixed(1)}`} />
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="px-3.5 py-2.5 border-t border-[#1e2e40]/50 flex gap-1.5 shrink-0">
        <button
          onClick={() => onFlyTo(point.position[0], point.position[1])}
          className="flex items-center justify-center gap-1 flex-1 py-1.5 rounded border border-[#0f6e56] text-teal-400 text-[11px] hover:bg-teal-900/20 transition-colors font-medium"
          title="Fly to location"
        >
          <Navigation className="w-3 h-3" />
          Fly To
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1 flex-1 py-1.5 rounded border border-[#1e3a50] text-gray-400 text-[11px] hover:bg-[#111e2a] transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        {point.url && (
          <a
            href={point.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 flex-1 py-1.5 rounded border border-[#1e3a50] text-gray-400 text-[11px] hover:bg-[#111e2a] transition-colors"
            title="Open source"
          >
            <ExternalLink className="w-3 h-3" />
            Source
          </a>
        )}
      </div>
    </div>
  );
  }

  // List view for country
  if (countryPoints && countryName) {
    const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, opportunity: 0 };
    const sortedPoints = [...countryPoints].sort((a, b) => {
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    });

    return (
      <div className="w-full h-full md:w-[260px] md:min-w-[260px] bg-[#0a1018] border-t md:border-t-0 md:border-l border-[#1e2e40]/60 flex flex-col rounded-t-2xl md:rounded-none z-50 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden shrink-0 cursor-pointer bg-[#0d1520]" onClick={onClose}>
          <div className="w-10 h-1.5 bg-gray-700/50 rounded-full" />
        </div>
        <div className="px-3.5 py-3 border-b border-[#1e2e40]/50 flex items-center justify-between shrink-0 bg-[#0d1520]">
          <h2 className="text-[13px] font-bold text-[#e0eef8] uppercase tracking-wider truncate flex-1 flex items-center gap-2">
            <span>🗺</span> {countryName} 
            <span className="bg-[#1a2838] text-[9px] px-1.5 py-0.5 rounded text-gray-400 font-mono">{countryPoints.length}</span>
          </h2>
          <button onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors shrink-0">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar flex flex-col gap-2 bg-[#05090e]">
          {sortedPoints.length === 0 && (
             <div className="text-xs text-gray-500 p-4 text-center">No active intel found.</div>
          )}
          {sortedPoints.map((p) => {
             const typeMeta = TYPE_META[p.type] ?? { label: 'Intel', icon: '●' };
             const severityClass = SEVERITY_CLASSES[p.severity] ?? SEVERITY_CLASSES.low;
             const [r, g, b] = severityColor(p.severity);
             
             return (
               <div key={p.id} className="flex flex-col text-left rounded bg-[#0d1520] border border-[#1e2e40]/40 transition-colors w-full relative overflow-hidden shrink-0">
                 <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${r},${g},${b})` }} />
                 
                 <div className="p-2.5 pl-4 flex flex-col cursor-pointer hover:bg-[#111e2a]" onClick={() => onSelectPoint?.(p)}>
                   <div className="flex justify-between items-start mb-1.5">
                     <div className="flex items-center gap-1.5 opacity-80">
                       <span className="text-[12px]">{typeMeta.icon}</span>
                       <span className="text-[10px] uppercase tracking-wider text-[#8aabbf] font-mono">{typeMeta.label}</span>
                     </div>
                     <span className={`text-[9px] font-mono px-1 py-0.5 rounded border ${severityClass}`}>
                       {SEVERITY_LABELS[p.severity]}
                     </span>
                   </div>
                   <h3 className="text-[12px] font-medium text-[#e0eef8] leading-snug line-clamp-2 mb-2">{p.title}</h3>
                   
                   <div className="flex justify-between items-center w-full">
                     <span className="text-[10px] text-[#3d7a6a] font-mono truncate pr-2 max-w-[70%]">{p.source || p.date}</span>
                     <div className="flex items-center gap-2">
                       {p.meta?.fatalities ? <span className="text-[10px] text-red-400 font-mono shrink-0">{p.meta.fatalities} †</span> : null}
                       <svg className="w-3 h-3 text-[#5b7a90]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                     </div>
                   </div>
                 </div>
               </div>
              );
           })}
        </div>
      </div>
    );
  }

  return null;
}