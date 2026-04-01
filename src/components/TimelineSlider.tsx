import React from 'react';

interface TimelineSliderProps {
  timeOffset: number;
  onChange: (offset: number) => void;
  lat: number;
  lng: number;
  alt: number;
}

export default function TimelineSlider({ timeOffset, onChange, lat, lng, alt }: TimelineSliderProps) {
  // Calculate slider percentage (0-100) from timeOffset (-86400 to +86400)
  const sliderPercent = ((timeOffset + 86400) / 172800) * 100;
  
  // Determine active label based on slider position
  const getActiveLabel = () => {
    if (sliderPercent < 45) {
      const hoursBefore = Math.round(((45 - sliderPercent) / 45) * 24);
      return { label: `-${hoursBefore}H`, type: 'before' as const };
    } else if (sliderPercent > 55) {
      const hoursAfter = Math.round(((sliderPercent - 55) / 45) * 24);
      return { label: `+${hoursAfter}H`, type: 'after' as const };
    } else {
      return { label: 'LIVE', type: 'live' as const };
    }
  };

  const activeLabel = getActiveLabel();

  return (
    <div className="h-[52px] bg-[#0d1520] border-t border-[#1e2e40]/50 flex items-center px-4">
      {/* Coordinate chips */}
      <div className="flex items-center mr-4">
        <div className="flex flex-col mr-4">
          <span className="text-[9px] uppercase tracking-wider text-gray-600">Lat</span>
          <span className="text-sm font-medium text-[#7fd4b0] tabular-nums">{lat.toFixed(4)}°</span>
        </div>
        <div className="flex flex-col mr-4">
          <span className="text-[9px] uppercase tracking-wider text-gray-600">Lng</span>
          <span className="text-sm font-medium text-[#7fd4b0] tabular-nums">{lng.toFixed(4)}°</span>
        </div>
        <div className="flex flex-col mr-4">
          <span className="text-[9px] uppercase tracking-wider text-gray-600">Alt</span>
          <span className="text-sm font-medium text-[#7fd4b0] tabular-nums">{alt} km</span>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="w-px h-6 bg-[#1e2e40] mr-4" />

      {/* Timeline scrubber */}
      <div className="flex-1 flex items-center gap-2.5">
        <span className={`text-[10px] whitespace-nowrap ${activeLabel.type === 'before' ? 'text-[#1d9e75]' : 'text-gray-600'}`}>-24H</span>
        <input
          type="range"
          min="-86400"
          max="86400"
          step="60"
          value={timeOffset}
          onChange={(e) => onChange(Number(e.target.value))}
          className="timeline-slider flex-1"
        />
        <span className={`text-[10px] whitespace-nowrap ${activeLabel.type === 'live' ? 'text-[#1d9e75]' : 'text-gray-600'}`}>
          {activeLabel.label}
        </span>
        <span className={`text-[10px] whitespace-nowrap ${activeLabel.type === 'after' ? 'text-[#1d9e75]' : 'text-gray-600'}`}>+24H</span>
      </div>
    </div>
  );
}
