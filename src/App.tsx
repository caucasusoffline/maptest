import { useEffect, useState, useMemo, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { Legend } from "./components/Legend";
import { MapComponent } from "./components/MapComponent";
import { MunicipalityFeature, SpeedTestData, MetricType } from "./types";
import { fetchGeoData, getNationalAverage } from "./utils";
import { Layers } from "lucide-react";
import * as turf from "@turf/turf";

import { getMetadataApi, getTrendApi } from "./lib/api";

export default function App() {
  const [connectionType, setConnectionType] = useState<'fixed' | 'mobile'>('fixed');
  const [viewType, setViewType] = useState<'municipality' | 'points'>('municipality');
  const [activeSettings, setActiveSettings] = useState({ connectionType: 'fixed', viewType: 'municipality' });
  const [geoData, setGeoData] = useState<MunicipalityFeature[]>([]);
  const [baseMuniData, setBaseMuniData] = useState<MunicipalityFeature[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedDataName, setSelectedDataName] = useState<string | null>(null);
  const [zoomBounds, setZoomBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<MetricType>('download');
  const [nationalAverage, setNationalAverage] = useState<SpeedTestData | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [trendData, setTrendData] = useState<any>(null);

  // Fetch metadata once
  useEffect(() => {
    getMetadataApi()
      .then(meta => {
        if (meta && meta[connectionType]) {
          setAvailablePeriods(meta[connectionType]);
          if (!selectedPeriod || !meta[connectionType].includes(selectedPeriod)) {
            setSelectedPeriod(meta[connectionType][0]);
          }
        }
      })
      .catch(err => console.error("Failed to load metadata", err));
  }, [connectionType]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadData() {
      if (!selectedPeriod) return; // Wait for metadata to load

      setIsLoading(true);
      try {
        const data = await fetchGeoData(connectionType, viewType, selectedPeriod, controller.signal);
        
        let muniData: MunicipalityFeature[] = [];
        if (viewType === 'points') {
          muniData = await fetchGeoData(connectionType, 'municipality', selectedPeriod, controller.signal);
        }

        if (ignore) return;
        setGeoData(data);
        if (viewType === 'points') setBaseMuniData(muniData);
        else setBaseMuniData([]);
        
        setActiveSettings({ connectionType, viewType });
        setDataVersion(v => v + 1);
        
        // Fetch trend data
        try {
          const trend = await getTrendApi(connectionType);
          if (!ignore && trend) setTrendData(trend);
        } catch (e) {
          console.error("Trend endpoint error", e);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Error loading geo data:", error);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    
    loadData();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [connectionType, viewType, selectedPeriod]);

  const displayData = geoData;

  useEffect(() => {
    if (displayData.length > 0) {
      setNationalAverage(getNationalAverage(displayData));
    }
  }, [displayData]);

  const selectedData = useMemo(() => {
    if (!selectedDataName) return null;
    return displayData.find(f => f.properties.name === selectedDataName)?.properties || null;
  }, [displayData, selectedDataName]);


  const handleFeatureHover = useCallback((data: SpeedTestData) => {
    setSelectedDataName(data.name);
  }, []);
  
  const handleFeatureOut = useCallback(() => {
    setSelectedDataName(null);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-dark text-white font-sans">
      {isLoading && (
        <div className="absolute inset-0 z-[2000] bg-dark/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="font-sans text-gray-400 animate-pulse">მონაცემების ჩატვირთვა...</p>
        </div>
      )}
      
      {/* Mobile-Only Cohesive Control Panel */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex flex-col gap-1.5 p-1.5 bg-card/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl md:hidden font-sans">
        {/* Row 1: Toggles */}
        <div className="flex gap-1.5 w-full">
          {/* View Type Toggle */}
          <div className="bg-slate-800/60 p-0.5 rounded-lg flex items-center flex-1 border border-white/5">
            <button
              onClick={() => setViewType('municipality')}
              className={`px-1 py-1 text-[9px] font-bold rounded-md transition-all flex-1 text-center ${
                viewType === 'municipality' ? 'bg-primary/25 text-primary' : 'text-slate-400 hover:text-white'
              }`}
            >
              რაიონები
            </button>
            <button
              onClick={() => setViewType('points')}
              className={`px-1 py-1 text-[9px] font-bold rounded-md transition-all flex-1 text-center flex items-center justify-center gap-0.5 ${
                viewType === 'points' ? 'bg-primary/25 text-primary' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={9} />
              წერტილები
            </button>
          </div>

          {/* Connection Type Toggle */}
          <div className="bg-slate-800/60 p-0.5 rounded-lg flex items-center flex-1 border border-white/5">
            <button
              onClick={() => setConnectionType('fixed')}
              className={`px-1 py-1 text-[9px] font-bold rounded-md transition-all flex-1 text-center ${
                connectionType === 'fixed' ? 'bg-primary/25 text-primary' : 'text-slate-400 hover:text-white'
              }`}
            >
              ფიქსირებული
            </button>
            <button
              onClick={() => setConnectionType('mobile')}
              className={`px-1 py-1 text-[9px] font-bold rounded-md transition-all flex-1 text-center ${
                connectionType === 'mobile' ? 'bg-primary/25 text-primary' : 'text-slate-400 hover:text-white'
              }`}
            >
              მობილური
            </button>
          </div>
        </div>

        {/* Row 2: Metrics & Period */}
        <div className="flex gap-1.5 w-full items-center">
          {/* Metric selector tabs */}
          <div className="bg-slate-800/60 p-0.5 rounded-lg flex items-center flex-1 border border-white/5 gap-0.5">
            <button 
              onClick={() => setActiveMetric('download')}
              className={`px-1 py-1 rounded-md text-[9px] font-bold transition-colors flex-1 text-center ${activeMetric === 'download' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}
            >
              ჩამოტვირთვა
            </button>
            <button 
              onClick={() => setActiveMetric('upload')}
              className={`px-1 py-1 rounded-md text-[9px] font-bold transition-colors flex-1 text-center ${activeMetric === 'upload' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              ატვირთვა
            </button>
            <button 
              onClick={() => setActiveMetric('ping')}
              className={`px-1 py-1 rounded-md text-[9px] font-bold transition-colors flex-1 text-center ${activeMetric === 'ping' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
              Ping
            </button>
          </div>

          {/* Period dropdown */}
          {availablePeriods.length > 0 && (
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-800/60 border border-white/10 rounded-lg py-1 px-1.5 text-[9px] font-bold focus:outline-none focus:border-primary/50 shadow-md font-sans text-white cursor-pointer shrink-0 w-[75px]"
            >
              {availablePeriods.map(period => {
                const match = period.match(/(\d{4})_(Q\d)/);
                const label = match ? `${match[1]} ${match[2]}` : period;
                return <option key={period} value={period}>{label}</option>;
              })}
            </select>
          )}
        </div>
      </div>

      {/* Desktop-Only Cohesive Controls */}
      <div className="absolute top-4 left-[330px] z-[1000] hidden md:flex flex-row items-center gap-3 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          {/* View Type Toggle */}
          <div className="bg-card border border-white/10 rounded-xl p-1 flex items-center shadow-xl backdrop-blur-xl shrink-0">
            <button
              onClick={() => setViewType('municipality')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewType === 'municipality' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
              }`}
              title="მუნიციპალიტეტები"
            >
              მუნიციპალიტეტები
            </button>
            <button
              onClick={() => setViewType('points')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                viewType === 'points' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
              }`}
              title="წერტილოვანი"
            >
              <Layers size={14} />
              წერტილები
            </button>
          </div>

          {/* Connection Type Toggle */}
          <div className="bg-card border border-white/10 rounded-xl p-1 flex items-center shadow-xl backdrop-blur-xl shrink-0">
            <button
              onClick={() => setConnectionType('fixed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                connectionType === 'fixed' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
              }`}
            >
              ფიქსირებული
            </button>
            <button
              onClick={() => setConnectionType('mobile')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                connectionType === 'mobile' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
              }`}
            >
              მობილური
            </button>
          </div>

          {/* Period Dropdown */}
          {availablePeriods.length > 0 && (
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-card border border-white/10 rounded-xl py-1.5 px-3 text-xs font-semibold focus:outline-none focus:border-primary/50 shadow-xl backdrop-blur-xl font-sans text-white cursor-pointer shrink-0"
            >
              {availablePeriods.map(period => {
                const match = period.match(/(\d{4})_(Q\d)/);
                const label = match ? `${match[1]} ${match[2]}` : period;
                return <option key={period} value={period}>{label}</option>;
              })}
            </select>
          )}
        </div>
      </div>

      {/* Desktop-Only Metric Selector Tabs */}
      <div className="absolute top-4 right-4 z-[1000] hidden md:flex bg-card rounded-xl p-1 gap-1 border border-white/10 shadow-xl backdrop-blur-xl font-sans">
        <button 
          onClick={() => setActiveMetric('download')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeMetric === 'download' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          ჩამოტვირთვა
        </button>
        <button 
          onClick={() => setActiveMetric('upload')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeMetric === 'upload' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          ატვირთვა
        </button>
        <button 
          onClick={() => setActiveMetric('ping')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeMetric === 'ping' ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          Ping
        </button>
      </div>

      <Sidebar 
        selectedData={selectedData} 
        nationalAverage={nationalAverage}
        trendData={trendData}
        activeMetric={activeMetric}
        connectionType={activeSettings.connectionType as 'fixed' | 'mobile'}
      />
      
      <MapComponent 
        geoData={displayData} 
        baseMuniData={baseMuniData}
        dataVersion={dataVersion}
        onFeatureHover={handleFeatureHover} 
        onFeatureOut={handleFeatureOut} 
        activeMetric={activeMetric}
        selectedFeatureName={selectedDataName || undefined}
        zoomBounds={zoomBounds}
        viewType={activeSettings.viewType as 'municipality' | 'points'}
        connectionType={activeSettings.connectionType as 'fixed' | 'mobile'}
      />
      
      <Legend activeMetric={activeMetric} connectionType={activeSettings.connectionType as 'fixed' | 'mobile'} />
    </div>
  );
}
