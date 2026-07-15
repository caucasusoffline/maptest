import React, { useMemo } from 'react';
import { SpeedTestData } from '../types';
import { Download, Upload, Activity, Hash, Laptop } from 'lucide-react';

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

  const circumference = 2 * Math.PI * 30;
  const dlPercent = Math.min(Math.max((data.download / 100) * 100, 0), 100);
  const strokeDashoffset = circumference - (dlPercent / 100) * circumference;

  return (
    <div className="flex flex-row items-center justify-between w-full bg-card px-6 py-2 gap-4 overflow-x-auto">
      
      {/* Title & Circular Gauge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="30"
              fill="transparent"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="30"
              fill="transparent"
              stroke="#10b981"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-0.5">
            <span className="text-sm font-bold text-white leading-none">{Math.round(data.download)}</span>
            <span className="text-[8px] text-gray-400 font-semibold">Mbps</span>
          </div>
        </div>
        
        <div className="flex flex-col justify-center">
          <h2 className="text-lg md:text-xl font-black text-white tracking-tight font-serif italic leading-tight">
            {isNational ? "საქართველოს" : data.name}
          </h2>
          <span className="text-xs font-bold text-gray-400 leading-tight">Speedtest დაშბორდი</span>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10 mx-2 shrink-0 hidden md:block"></div>

      {/* Cards */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="bg-slate-800/50 border border-white/5 rounded-lg px-3 py-1 w-[130px] flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase">
            <Download size={10} className="text-emerald-400" />
            ჩამოტვირთვა
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-black text-emerald-400 leading-none">
              {data.download.toFixed(1)} <span className="text-[10px] font-bold">Mbps</span>
            </span>
          </div>
          <div className="mt-0.5">{renderYoY(yoyData?.download)}</div>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-lg px-3 py-1 w-[130px] flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase">
            <Upload size={10} className="text-blue-400" />
            ატვირთვა
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-black text-blue-400 leading-none">
              {data.upload.toFixed(1)} <span className="text-[10px] font-bold">Mbps</span>
            </span>
          </div>
          <div className="mt-0.5">{renderYoY(yoyData?.upload)}</div>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-lg px-3 py-1 w-[130px] flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase">
            <Activity size={10} className="text-purple-400" />
            PING
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-black text-purple-400 leading-none">
              {Math.round(data.ping)} <span className="text-[10px] font-bold">ms</span>
            </span>
          </div>
          <div className="mt-0.5">{renderYoY(yoyData?.ping, true)}</div>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-lg px-3 py-1 w-[110px] flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase">
            <Hash size={10} className="text-orange-400" />
            ტესტები
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-black text-orange-400 leading-none">
              {data.tests.toLocaleString()}
            </span>
          </div>
        </div>

        {data.devices !== undefined && (
          <div className="bg-slate-800/50 border border-white/5 rounded-lg px-3 py-1 w-[110px] flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase">
              <Laptop size={10} className="text-cyan-400" />
              მოწყ.
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-cyan-400 leading-none">
                {data.devices.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
