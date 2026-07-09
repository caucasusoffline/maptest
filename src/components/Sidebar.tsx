import React, { useMemo } from "react";
import { SpeedTestData } from "../types";
import { getColor } from "../utils";
import { ArrowDown, ArrowUp, MousePointer2, RadioTower, Activity, SatelliteDish } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SidebarProps {
  selectedData: SpeedTestData | null;
  nationalAverage: SpeedTestData | null;
  trendData?: any;
  activeMetric?: string;
  connectionType?: 'fixed' | 'mobile';
}

export const Sidebar = React.memo(function Sidebar({ selectedData, nationalAverage, trendData, activeMetric = 'download', connectionType = 'fixed' }: SidebarProps) {
  const chartColor = activeMetric === 'download' ? '#10b981' : activeMetric === 'upload' ? '#3b82f6' : '#a855f7';
  const chartDataKey = activeMetric === 'download' ? 'download' : activeMetric === 'upload' ? 'upload' : 'ping';
  const chartLabel = activeMetric === 'download' ? 'ჩამოტვირთვა' : activeMetric === 'upload' ? 'ატვირთვა' : 'Ping';

  let currentTrend: any[] = [];
  if (trendData) {
    if (selectedData && trendData.municipalities && trendData.municipalities[selectedData.name]) {
      currentTrend = trendData.municipalities[selectedData.name];
    } else if (trendData.national) {
      currentTrend = trendData.national;
    }
  }

  const renderTrendChart = () => {
    if (!currentTrend || currentTrend.length === 0) return null;
    return (
      <div className="mt-2 bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
        <div className="text-xs text-gray-400 font-bold mb-2 uppercase flex items-center gap-1">
          <Activity className="w-3 h-3" /> ტრენდი (2019-2026)
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentTrend} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
              <XAxis 
                dataKey="quarter" 
                tick={{fontSize: 9, fill: '#9ca3af'}} 
                tickFormatter={(val) => val.replace('20', "'")} 
                minTickGap={15}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                tick={{fontSize: 9, fill: '#9ca3af'}}
                tickFormatter={(val) => `${Math.round(val)}${activeMetric === 'ping' ? 'ms' : 'მბ'}`}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip 
                contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', fontSize: '11px'}}
                itemStyle={{color: chartColor, fontWeight: 'bold'}}
                formatter={(value: number) => [`${value.toFixed(1)} ${activeMetric === 'ping' ? 'ms' : 'Mbps'}`, chartLabel]}
                labelStyle={{color: '#9ca3af', marginBottom: '4px'}}
              />
              <Line 
                type="monotone" 
                dataKey={chartDataKey} 
                stroke={chartColor} 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, fill: chartColor, stroke: '#fff', strokeWidth: 1 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute bottom-0 md:top-4 md:bottom-auto left-0 md:left-4 z-[1000] w-full md:w-[300px] max-h-[45vh] md:max-h-[calc(100vh-2rem)] rounded-t-2xl md:rounded-2xl bg-card/95 md:bg-card p-4 flex flex-col gap-4 overflow-y-auto border-t md:border border-white/10 shadow-2xl backdrop-blur-xl text-white transition-all duration-300">
      {/* Header */}
      <div className="border-b border-gray-700/50 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <SatelliteDish className="text-primary w-6 h-6" />
          <h1 className="text-xl font-bold tracking-wide font-sans">Ookla ექსპლორერი</h1>
        </div>
        <p className="text-xs text-gray-400 font-sans">ინტერნეტის სიჩქარის ვიზუალიზაცია</p>
      </div>

      {/* Dynamic Data Panel */}
      <div className="flex flex-col gap-4 font-sans">
        <AnimatePresence mode="wait">
          {!selectedData ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <h2 className="text-xl font-bold text-white truncate">
                  საქართველო
                </h2>
                <div className="flex gap-2">
               
                </div>
              </div>
              
              {nationalAverage ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCardSmall
                      title="ჩამოტვირთვა"
                      icon={<ArrowDown className="text-emerald-400 w-3 h-3" />}
                      value={nationalAverage.download}
                      min={nationalAverage.download_min}
                      max={nationalAverage.download_max}
                      unit="Mbps"
                      color="bg-emerald-500"
                      percent={Math.min((nationalAverage.download / 200) * 100, 100)}
                    />
                    <MetricCardSmall
                      title="ატვირთვა"
                      icon={<ArrowUp className="text-blue-400 w-3 h-3" />}
                      value={nationalAverage.upload}
                      min={nationalAverage.upload_min}
                      max={nationalAverage.upload_max}
                      unit="Mbps"
                      color="bg-blue-500"
                      percent={Math.min((nationalAverage.upload / 100) * 100, 100)}
                    />
                    <MetricCardSmall
                      title="Ping"
                      icon={<RadioTower className="text-purple-400 w-3 h-3" />}
                      value={nationalAverage.ping}
                      min={nationalAverage.ping_min}
                      max={nationalAverage.ping_max}
                      unit="ms"
                      color="bg-purple-500"
                      percent={Math.min((nationalAverage.ping / 100) * 100, 100)}
                    />
                  </div>
                  <div className="flex gap-2 justify-between bg-gray-800/40 p-2 rounded-lg border border-gray-700/50 mt-1">
                    <div className="flex flex-col text-center w-1/3 border-r border-gray-700/50">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">ტესტები</span>
                      <span className="text-sm font-bold text-white">{nationalAverage.tests?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex flex-col text-center w-1/3 border-r border-gray-700/50">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">მოწყობილობები</span>
                      <span className="text-sm font-bold text-white">{nationalAverage.devices?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex flex-col text-center w-1/3">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">წერტილები</span>
                      <span className="text-sm font-bold text-white">{nationalAverage.locations?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-400 border border-dashed border-gray-600/50 rounded-xl">
                  <p className="text-sm px-4">მონაცემები იტვირთება...</p>
                </div>
              )}
              
              {renderTrendChart()}

              <div className="text-center mt-1 text-gray-400">
                <MousePointer2 className="w-4 h-4 mx-auto mb-1 opacity-50" />
                <p className="text-[10px]">დეტალებისთვის გადაატარეთ რუკაზე</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-[160px] sm:max-w-[200px]" title={selectedData.name}>
                  {selectedData.name}
                </h2>
              </div>

              <div className="flex gap-2 justify-between bg-gray-800/40 p-2 rounded-lg border border-gray-700/50">
                <div className="flex flex-col text-center w-1/3 border-r border-gray-700/50">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">ტესტები</span>
                  <span className="text-sm font-bold text-white">{selectedData.tests?.toLocaleString() || 0}</span>
                </div>
                <div className="flex flex-col text-center w-1/3 border-r border-gray-700/50">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">მოწყობილობები</span>
                  <span className="text-sm font-bold text-white">{selectedData.devices?.toLocaleString() || 0}</span>
                </div>
                <div className="flex flex-col text-center w-1/3">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">წერტილები</span>
                  <span className="text-sm font-bold text-white">{selectedData.locations?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricCardSmall
                  title="ჩამოტვირთვა"
                  icon={<ArrowDown className="text-emerald-400 w-3 h-3" />}
                  value={selectedData.download}
                  min={selectedData.download_min}
                  max={selectedData.download_max}
                  unit="Mbps"
                  color="bg-emerald-500"
                  percent={Math.min((selectedData.download / 200) * 100, 100)}
                />

                <MetricCardSmall
                  title="ატვირთვა"
                  icon={<ArrowUp className="text-blue-400 w-3 h-3" />}
                  value={selectedData.upload}
                  min={selectedData.upload_min}
                  max={selectedData.upload_max}
                  unit="Mbps"
                  color="bg-blue-500"
                  percent={Math.min((selectedData.upload / 100) * 100, 100)}
                />
                
                <MetricCardSmall
                  title="Ping"
                  icon={<RadioTower className="text-purple-400 w-3 h-3" />}
                  value={selectedData.ping}
                  min={selectedData.ping_min}
                  max={selectedData.ping_max}
                  unit="ms"
                  color="bg-purple-500"
                  percent={Math.min((selectedData.ping / 100) * 100, 100)}
                />
              </div>

              {renderTrendChart()}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context / Meta info */}
      <div className="mt-auto pt-4 border-t border-gray-700/50 text-[10px] text-gray-500 flex justify-between font-sans">
        <span>© 2026 Ookla</span>
        <span>მონაცემები 2026 Q1</span>
      </div>
    </div>
  );
});

function MetricCardSmall({ title, icon, value, min, max, unit, color, percent }: { title: string, icon: React.ReactNode, value: number, min?: number, max?: number, unit: string, color: string, percent: number }) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 flex flex-col justify-between">
      <div className="text-gray-400 flex items-center gap-1 text-[10px] uppercase font-bold mb-1">
        {icon}
        {title}
      </div>
      <div className="font-bold text-base mb-1">
        {value?.toFixed(1) || '0.0'} <span className="text-[9px] text-gray-400 font-normal">{unit}</span>
      </div>
      
      {min !== undefined && max !== undefined && (
        <div className="flex justify-between w-full text-[9px] text-gray-400 mb-2">
          <span>მინ: {min.toFixed(0)}</span>
          <span>მაქს: {max.toFixed(0)}</span>
        </div>
      )}

      <div className={`w-full bg-gray-900 rounded-full h-1.5 overflow-hidden ${min === undefined ? 'mt-3' : ''}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
