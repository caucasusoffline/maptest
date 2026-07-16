import React, { useMemo, useState } from 'react';
import { SpeedTestData } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Search, Activity, Map as MapIcon } from 'lucide-react';

interface BottomDashboardProps {
  geoData: any[]; // The features array
  trendFixed: any;
  trendMobile: any;
  selectedMuni: string | null;
  onSelectMuni: (name: string) => void;
  connectionType: 'fixed' | 'mobile';
  setConnectionType: (type: 'fixed' | 'mobile') => void;
}

export function BottomDashboard({
  geoData,
  trendFixed,
  trendMobile,
  selectedMuni,
  onSelectMuni,
  connectionType,
  setConnectionType
}: BottomDashboardProps) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof SpeedTestData; direction: 'asc' | 'desc' }>({ key: 'download', direction: 'desc' });

  // Extract municipality data from geoData
  const munis = useMemo(() => {
    let result = geoData
      .map(f => f.properties as SpeedTestData)
      .filter(m => m.name !== 'საქართველო' && m.name.toLowerCase().includes(search.toLowerCase()));

    // Deduplicate by name to prevent multiple entries for the same municipality
    const uniqueMap = new Map<string, SpeedTestData>();
    result.forEach(m => {
      const name = (m.name || "").trim();
      if (name) {
        uniqueMap.set(name, { ...m, name });
      }
    });
    result = Array.from(uniqueMap.values());

    result.sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [geoData, search, sortConfig]);

  const handleSort = (key: keyof SpeedTestData) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const currentFixedTrend = useMemo(() => {
    if (!trendFixed) return [];
    if (selectedMuni && trendFixed.municipalities && trendFixed.municipalities[selectedMuni]) {
      return trendFixed.municipalities[selectedMuni];
    }
    return trendFixed.national || [];
  }, [trendFixed, selectedMuni]);

  const currentMobileTrend = useMemo(() => {
    if (!trendMobile) return [];
    if (selectedMuni && trendMobile.municipalities && trendMobile.municipalities[selectedMuni]) {
      return trendMobile.municipalities[selectedMuni];
    }
    return trendMobile.national || [];
  }, [trendMobile, selectedMuni]);

  const combinedTrend = useMemo(() => {
    // combine fixed and mobile by quarter
    const map = new Map<string, any>();
    currentFixedTrend.forEach((t: any) => {
      map.set(t.quarter, { quarter: t.quarter, fixedPing: t.ping, fixedTests: t.tests || 0 });
    });
    currentMobileTrend.forEach((t: any) => {
      if (map.has(t.quarter)) {
        map.set(t.quarter, { ...map.get(t.quarter), mobilePing: t.ping, mobileTests: t.tests || 0 });
      } else {
        map.set(t.quarter, { quarter: t.quarter, mobilePing: t.ping, mobileTests: t.tests || 0 });
      }
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.quarter.localeCompare(b.quarter));
  }, [currentFixedTrend, currentMobileTrend]);

  const formatPeriod = (p: string) => {
    const match = p.match(/(\d{4})_(Q\d)/);
    return match ? `${match[1]}-${match[2]}` : p;
  };

  const title = selectedMuni || 'საქართველო';

  return (
    <div className="w-full h-[600px] md:h-[500px] shrink-0 bg-[#0d1117] flex flex-col md:flex-row border-t border-white/10 z-[1000] text-white">
      {/* Left Panel: Municipalities */}
      <div className="w-full md:w-[350px] border-r border-white/10 flex flex-col shrink-0 bg-[#0d1117]">
        <div className="p-4 border-b border-white/10 flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <MapIcon className="w-5 h-5 text-gray-400" />
            მუნიციპალიტეტები
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="მოძებნე ქალაქი/რეგიონი..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#161b22] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex bg-[#161b22] rounded-lg p-1">
            <button
              onClick={() => setConnectionType('fixed')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${connectionType === 'fixed' ? 'bg-[#004d26] text-[#22c55e]' : 'text-gray-400 hover:text-white'}`}
            >
              ფიქსირებული
            </button>
            <button
              onClick={() => setConnectionType('mobile')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${connectionType === 'mobile' ? 'bg-[#1e1e1e] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              მობილური
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-[#0d1117] border-b border-white/10 text-gray-500 uppercase font-bold text-[10px] z-10">
              <tr>
                <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                  სახელი {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-2 py-3 text-right text-emerald-500 cursor-pointer hover:text-emerald-400" onClick={() => handleSort('download')}>
                  DOWN {sortConfig.key === 'download' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-2 py-3 text-right text-blue-500 cursor-pointer hover:text-blue-400" onClick={() => handleSort('upload')}>
                  UP {sortConfig.key === 'upload' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-2 py-3 text-right text-purple-500 cursor-pointer hover:text-purple-400" onClick={() => handleSort('ping')}>
                  PING {sortConfig.key === 'ping' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('tests')}>
                  ტესტები {sortConfig.key === 'tests' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {munis.map(m => (
                <tr 
                  key={m.name} 
                  onClick={() => onSelectMuni(m.name)}
                  className={`border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedMuni === m.name ? 'bg-white/10' : ''}`}
                >
                  <td className="px-4 py-3 font-semibold">{m.name}</td>
                  <td className="px-2 py-3 text-right text-emerald-400 font-bold">{m.download.toFixed(2)}</td>
                  <td className="px-2 py-3 text-right text-orange-400">{m.upload.toFixed(2)}</td>
                  <td className="px-2 py-3 text-right text-purple-400">{m.ping.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{m.tests.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Panel: Charts */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-4 bg-[#0d1117] overflow-y-auto min-h-0">
        
        {/* Chart 1: Fixed Trend */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-4 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <h3 className="font-bold text-sm">{title} - ფიქსირებული</h3>
            </div>
            <div className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 flex items-center gap-1 font-bold">
              <Activity size={12}/> {currentFixedTrend[currentFixedTrend.length-1]?.ping?.toFixed(0)} ms
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-4">
            <div>Download <span className="text-emerald-400 text-sm ml-1">{currentFixedTrend[currentFixedTrend.length-1]?.download?.toFixed(1)}</span> Mb/s</div>
            <div>Upload <span className="text-orange-400 text-sm ml-1">{currentFixedTrend[currentFixedTrend.length-1]?.upload?.toFixed(1)}</span> Mb/s</div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentFixedTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDlFixed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUlFixed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="quarter" tickFormatter={formatPeriod} tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '11px'}} />
                <Area type="monotone" dataKey="download" stroke="#10b981" fillOpacity={1} fill="url(#colorDlFixed)" strokeWidth={2} activeDot={{r:4}} />
                <Area type="monotone" dataKey="upload" stroke="#f59e0b" fillOpacity={1} fill="url(#colorUlFixed)" strokeWidth={2} activeDot={{r:4}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Mobile Trend */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-4 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="font-bold text-sm">{title} - მობილური</h3>
            </div>
            <div className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 flex items-center gap-1 font-bold">
              <Activity size={12}/> {currentMobileTrend[currentMobileTrend.length-1]?.ping?.toFixed(0)} ms
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-4">
            <div>Download <span className="text-blue-400 text-sm ml-1">{currentMobileTrend[currentMobileTrend.length-1]?.download?.toFixed(1)}</span> Mb/s</div>
            <div>Upload <span className="text-pink-500 text-sm ml-1">{currentMobileTrend[currentMobileTrend.length-1]?.upload?.toFixed(1)}</span> Mb/s</div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentMobileTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDlMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUlMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="quarter" tickFormatter={formatPeriod} tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '11px'}} />
                <Area type="monotone" dataKey="download" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDlMobile)" strokeWidth={2} activeDot={{r:4}} />
                <Area type="monotone" dataKey="upload" stroke="#ec4899" fillOpacity={1} fill="url(#colorUlMobile)" strokeWidth={2} activeDot={{r:4}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Ping Dynamics */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <h3 className="font-bold text-sm">{title} - Ping დინამიკა</h3>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-4">
            <div>Fixed Ping <span className="text-yellow-500 text-sm ml-1">{currentFixedTrend[currentFixedTrend.length-1]?.ping?.toFixed(1)}</span> ms</div>
            <div>Mobile Ping <span className="text-pink-500 text-sm ml-1">{currentMobileTrend[currentMobileTrend.length-1]?.ping?.toFixed(1)}</span> ms</div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPingFixed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPingMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="quarter" tickFormatter={formatPeriod} tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '11px'}} />
                <Area type="monotone" dataKey="fixedPing" stroke="#eab308" fillOpacity={1} fill="url(#colorPingFixed)" strokeWidth={2} activeDot={{r:4}} />
                <Area type="monotone" dataKey="mobilePing" stroke="#ec4899" fillOpacity={1} fill="url(#colorPingMobile)" strokeWidth={2} activeDot={{r:4}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Tests Dynamics */}
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <h3 className="font-bold text-sm">{title} - ტესტების დინამიკა</h3>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-4">
            <div>ფიქს. ტესტები <span className="text-emerald-400 text-sm ml-1">{(currentFixedTrend[currentFixedTrend.length-1]?.tests || 0).toLocaleString()}</span></div>
            <div>მობ. ტესტები <span className="text-blue-400 text-sm ml-1">{(currentMobileTrend[currentMobileTrend.length-1]?.tests || 0).toLocaleString()}</span></div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTestsFixed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTestsMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="quarter" tickFormatter={formatPeriod} tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '11px'}} />
                <Area type="monotone" dataKey="fixedTests" stroke="#10b981" fillOpacity={1} fill="url(#colorTestsFixed)" strokeWidth={2} activeDot={{r:4}} />
                <Area type="monotone" dataKey="mobileTests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTestsMobile)" strokeWidth={2} activeDot={{r:4}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
