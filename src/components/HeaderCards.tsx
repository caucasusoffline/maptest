import React, { useMemo } from 'react';
import { SpeedTestData } from '../types';
import { ArrowDown, ArrowUp, Activity, Hash, Laptop } from 'lucide-react';

interface HeaderCardsProps {
  data: SpeedTestData | null;
  trendData: any;
  selectedPeriod: string;
  isNational: boolean;
}

export function HeaderCards({ data, trendData, selectedPeriod, isNational }: HeaderCardsProps) {
  const currentTrendList = useMemo(() => {
    if (!trendData) return [];
    if (isNational) {
      return trendData.national || [];
    }
    return trendData.municipalities?.[data?.name || ""] || [];
  }, [trendData, isNational, data]);

  const yoyData = useMemo(() => {
    if (!currentTrendList || currentTrendList.length === 0 || !selectedPeriod) return null;
    
    // selectedPeriod format: e.g., "2026_Q2" -> "2026 Q2"
    const match = selectedPeriod.match(/(\d{4})_(Q\d)/);
    if (!match) return null;
    const year = parseInt(match[1]);
    const quarter = match[2];
    const prevYear = year - 1;
    const prevPeriodString = `${prevYear} ${quarter}`;

    const prevData = currentTrendList.find((t: any) => t.quarter === prevPeriodString);
    if (!prevData || !data) return null;

    const calcPercent = (current: number, prev: number) => {
      if (!prev) return 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    return {
      download: calcPercent(data.download, prevData.download),
      upload: calcPercent(data.upload, prevData.upload),
      ping: calcPercent(data.ping, prevData.ping), // Lower is better
    };
  }, [currentTrendList, selectedPeriod, data]);

  if (!data) return null;

  const renderYoY = (value: number | undefined, reverseColors: boolean = false) => {
    if (value === undefined || value === null) return null;
    const isPositive = value > 0;
    const isZero = value === 0;
    
    // For ping, negative means faster (better), so we reverse the colors.
    let colorClass = 'text-gray-400';
    if (!isZero) {
      if (reverseColors) {
        colorClass = isPositive ? 'text-red-400' : 'text-emerald-400';
      } else {
        colorClass = isPositive ? 'text-emerald-400' : 'text-red-400';
      }
    }

    const sign = isPositive ? '+' : '';
    return (
      <span className={`text-[10px] font-bold ${colorClass} flex items-center gap-0.5`}>
        {sign}{value}% {reverseColors && !isPositive ? '(უკეთესი) ' : ''}წლიურად
      </span>
    );
  };

  const circumference = 2 * Math.PI * 40;
  const dlPercent = Math.min(Math.max((data.download / 100) * 100, 0), 100);
  const strokeDashoffset = circumference - (dlPercent / 100) * circumference;

  return (
    <div className="flex flex-row items-center justify-between w-full bg-card/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl gap-4 overflow-x-auto">
      
      {/* Title & Circular Gauge */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#10b981"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-white leading-none">{Math.round(data.download)}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1">Mbps</span>
          </div>
        </div>
        
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight font-serif italic">
            {isNational ? "საქართველოს" : data.name}
          </h2>
          <span className="text-sm md:text-base font-bold text-gray-400">Speedtest დაშბორდი</span>
        </div>
      </div>

      <div className="w-px h-16 bg-white/10 mx-2 shrink-0 hidden md:block"></div>

      {/* Cards */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 w-[140px] flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
            <ArrowDown size={12} className="text-emerald-400" />
            ჩამოტვირთვა
          </div>
          <div className="mt-1 flex flex-col">
            <span className="text-xl font-black text-emerald-400">
              {data.download.toFixed(1)} <span className="text-[11px] font-bold">Mbps</span>
            </span>
            {renderYoY(yoyData?.download)}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 w-[140px] flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
            <ArrowUp size={12} className="text-blue-400" />
            ატვირთვა
          </div>
          <div className="mt-1 flex flex-col">
            <span className="text-xl font-black text-blue-400">
              {data.upload.toFixed(1)} <span className="text-[11px] font-bold">Mbps</span>
            </span>
            {renderYoY(yoyData?.upload)}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 w-[140px] flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
            <Activity size={12} className="text-purple-400" />
            PING
          </div>
          <div className="mt-1 flex flex-col">
            <span className="text-xl font-black text-purple-400">
              {Math.round(data.ping)} <span className="text-[11px] font-bold">ms</span>
            </span>
            {renderYoY(yoyData?.ping, true)}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 w-[140px] flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
            <Hash size={12} className="text-orange-400" />
            ტესტები
          </div>
          <div className="mt-1 flex flex-col">
            <span className="text-xl font-black text-orange-400">
              {data.tests.toLocaleString()}
            </span>
          </div>
        </div>

        {data.devices !== undefined && (
          <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 w-[140px] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
              <Laptop size={12} className="text-cyan-400" />
              მოწყობილობები
            </div>
            <div className="mt-1 flex flex-col">
              <span className="text-xl font-black text-cyan-400">
                {data.devices.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
