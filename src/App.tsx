import { useEffect, useState, useMemo, useCallback } from "react";
import { BottomDashboard } from "./components/BottomDashboard";
import { Legend } from "./components/Legend";
import { MapComponent } from "./components/MapComponent";
import { TimelineSlider } from "./components/TimelineSlider";
import { HeaderCards } from "./components/HeaderCards";
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
  const [trendFixed, setTrendFixed] = useState<any>(null);
  const [trendMobile, setTrendMobile] = useState<any>(null);

  // Fetch metadata onc
  useEffect(() => {
    getMetadataApi()
      .then(meta => {
        if (meta && meta[connectionType]) {
          const filtered = meta[connectionType].filter((p: string) => !p.includes('2018'));
          const sorted = [...filtered].sort();
          setAvailablePeriods(sorted);
          if (!selectedPeriod || !sorted.includes(selectedPeriod)) {
            setSelectedPeriod(sorted[sorted.length - 1]);
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
          const [tFixed, tMobile] = await Promise.all([
            getTrendApi('fixed').catch(() => null),
            getTrendApi('mobile').catch(() => null)
          ]);
          if (!ignore) {
            setTrendFixed(tFixed);
            setTrendMobile(tMobile);
          }
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
    <div className="flex flex-col w-full h-screen overflow-y-auto bg-dark text-white font-sans">
      {/* Desktop-Only Top Header */}
      <div className="hidden md:flex flex-col w-full shrink-0 sticky top-0 z-[2000] bg-card shadow-lg">
        <HeaderCards 
          data={nationalAverage} 
          trendData={connectionType === 'fixed' ? trendFixed : trendMobile} 
          selectedPeriod={selectedPeriod} 
          isNational={true} 
        />
        
        {/* Timeline Divider Area */}
        <div className="w-full bg-[#111827] px-4 md:px-6 py-1.5 border-y border-[#1f2937] flex justify-start md:justify-center items-center shadow-md overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 md:gap-4 w-max md:w-full max-w-7xl mx-auto">
            <TimelineSlider 
              periods={availablePeriods}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={setSelectedPeriod}
              className="flex-1 bg-card border border-white/10 rounded-lg px-4 py-1.5 flex items-center gap-4 text-white"
            />
            {/* Connection Type Toggle */}
            <div className="bg-card border border-white/10 rounded-lg p-1 flex items-center shadow-xl backdrop-blur-xl shrink-0 h-full">
              <button
                onClick={() => setConnectionType('fixed')}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-all ${
                  connectionType === 'fixed' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
                }`}
              >
                ფიქსირებული
              </button>
              <button
                onClick={() => setConnectionType('mobile')}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-all ${
                  connectionType === 'mobile' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
                }`}
              >
                მობილური
              </button>
            </div>
            
            {/* Metric Type Toggle */}
            <div className="bg-card border border-white/10 rounded-lg p-1 flex items-center shadow-xl backdrop-blur-xl shrink-0 h-full">
              <button 
                onClick={() => setActiveMetric('download')}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-colors ${activeMetric === 'download' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                ჩამოტვირთვა
              </button>
              <button 
                onClick={() => setActiveMetric('upload')}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-colors ${activeMetric === 'upload' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                ატვირთვა
              </button>
              <button 
                onClick={() => setActiveMetric('ping')}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-colors ${activeMetric === 'ping' ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                Ping
              </button>
            </div>
            {/* View Type Toggle */}
            <div className="bg-card border border-white/10 rounded-lg p-1 flex items-center shadow-xl backdrop-blur-xl shrink-0 h-full">
              <button
                onClick={() => setViewType('municipality')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewType === 'municipality' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
                }`}
                title="მუნიციპალიტეტები"
              >
                მუნიციპალიტეტები
              </button>
              <button
                onClick={() => setViewType('points')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewType === 'points' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
                }`}
                title="წერტილოვანი"
              >
                <Layers size={14} />
                წერტილები
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative flex-1 w-full flex flex-col">
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

          {/* Period dropdown removed from mobile view */}
        </div>
      </div>

      {/* Desktop-Only Header Cards removed from here */}

      {/* Desktop-Only Cohesive Controls */}
      {/* Desktop-Only Metric Selector Tabs removed from here */}
      
      <div className="relative w-full h-[45vh] md:h-[45vh] min-h-[300px] shrink-0 z-0">
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
      
      <BottomDashboard 
        geoData={activeSettings.viewType === 'points' ? baseMuniData : displayData}
        trendFixed={trendFixed}
        trendMobile={trendMobile}
        selectedMuni={selectedDataName}
        onSelectMuni={setSelectedDataName}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
      />
      </div>
    </div>
  );
}
