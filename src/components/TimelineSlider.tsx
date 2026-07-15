import React from 'react';

interface TimelineSliderProps {
  periods: string[];
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
}

export function TimelineSlider({ periods, selectedPeriod, onSelectPeriod }: TimelineSliderProps) {
  if (!periods || periods.length === 0) return null;

  // Assume periods are sorted chronologically
  const currentIndex = periods.indexOf(selectedPeriod);
  
  const formatLabel = (p: string) => {
    const match = p.match(/(\d{4})_(Q\d)/);
    return match ? `${match[1]} ${match[2]}` : p;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    if (periods[index]) {
      onSelectPeriod(periods[index]);
    }
  };

  const isLatest = currentIndex === periods.length - 1;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] md:w-[600px] bg-card/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl font-sans flex items-center gap-4 text-white">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0">
        კვარტალი
      </div>
      
      <div className="relative flex-1 flex items-center">
        <input
          type="range"
          min={0}
          max={periods.length - 1}
          step={1}
          value={currentIndex !== -1 ? currentIndex : 0}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none accent-primary"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentIndex / (periods.length - 1 || 1)) * 100}%, #374151 ${(currentIndex / (periods.length - 1 || 1)) * 100}%, #374151 100%)`
          }}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0 min-w-[100px] justify-end">
        <span className="font-bold text-sm tracking-wide text-primary">
          {formatLabel(selectedPeriod)}
        </span>
        {isLatest && (
          <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">
            უახლესი
          </span>
        )}
      </div>
    </div>
  );
}
