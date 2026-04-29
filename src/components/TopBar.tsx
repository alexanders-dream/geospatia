import React, { useState, useEffect } from 'react';
import { AlertTriangle, Menu } from 'lucide-react';

interface TopBarProps {
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  apiErrors?: Record<string, string>;
  zoom?: number;
  onMenuToggle?: () => void;
}

export default function TopBar({ onResetView, onZoomIn, onZoomOut, apiErrors = {}, zoom = 0, onMenuToggle }: TopBarProps) {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top-left live indicator */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle}
            className="md:hidden bg-[#0d1520]/90 border border-[#1e2e40]/50 rounded-md p-1.5 text-gray-400 hover:text-white pointer-events-auto"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="bg-[#0d1520]/90 border border-[#1e2e40]/50 rounded-md px-3 py-1.5 flex items-center gap-2 text-xs pointer-events-auto hidden sm:flex">
          <div className="w-[6px] h-[6px] rounded-full bg-[#1d9e75]" style={{ animation: 'pulse 1.4s infinite' }} />
        <span className="text-gray-500">LIVE FEED</span>
        <span className="text-[#3d5568] mx-1">·</span>
        <span className="text-[#9ab0c2] font-mono tabular-nums">{utcTime}</span>
        {Object.keys(apiErrors).length > 0 && (
          <div className="relative group flex items-center ml-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a1018] border border-[#1e2e40] rounded-md shadow-xl p-2 hidden group-hover:flex flex-col gap-1.5 z-50">
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">API Errors</div>
              {Object.entries(apiErrors).map(([layer, err]) => (
                <div key={layer} className="text-[10px] flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold shrink-0">{layer}:</span>
                  <span className="text-gray-400 leading-tight">{err}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Top-right tool buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-1.5 z-10 pointer-events-auto">
        <div className="bg-[#111e2a] border border-[#1e2e40] text-[#9ab0c2] text-[10px] font-mono px-2 py-1.5 rounded-md mr-1">
          {zoom.toFixed(1)}Z
        </div>
        <button
          className="w-[30px] h-[30px] rounded-md bg-[#0d1520]/85 border border-[#1e2e40]/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-[#2e4a60] transition-colors cursor-pointer"
          onClick={onResetView}
          title="Reset view"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1" />
            <line x1="6.5" y1="1.5" x2="6.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="6.5" y1="6.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="w-[30px] h-[30px] rounded-md bg-[#0d1520]/85 border border-[#1e2e40]/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-[#2e4a60] transition-colors cursor-pointer"
          onClick={onZoomIn}
          title="Zoom in"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line x1="3" y1="6.5" x2="10" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="6.5" y1="3" x2="6.5" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="w-[30px] h-[30px] rounded-md bg-[#0d1520]/85 border border-[#1e2e40]/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-[#2e4a60] transition-colors cursor-pointer"
          onClick={onZoomOut}
          title="Zoom out"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line x1="3" y1="6.5" x2="10" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
