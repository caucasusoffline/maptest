import { MunicipalityFeature, SpeedTestData } from "./types";
import { getDataApi } from "./lib/api";

export async function fetchGeoData(type: 'fixed' | 'mobile' = 'fixed', view: 'municipality' | 'points' = 'municipality', period?: string, signal?: AbortSignal): Promise<MunicipalityFeature[]> {
  try {
    const data = await getDataApi(type, view, period);
    return data.features;
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error("Failed to fetch GeoJSON", error);
    }
    throw error;
  }
}

export function getColor(value: number, metric: 'download' | 'upload' | 'ping' = 'download', connectionType: 'fixed' | 'mobile' = 'fixed'): string {
  if (metric === 'download') {
    if (connectionType === 'mobile') {
      if (value >= 50) return '#10b981';
      if (value >= 30) return '#fbbf24';
      if (value >= 15) return '#f97316';
      return '#ef4444';
    } else {
      if (value >= 100) return '#10b981';
      if (value >= 50) return '#fbbf24';
      if (value >= 20) return '#f97316';
      return '#ef4444';
    }
  } else if (metric === 'upload') {
    if (connectionType === 'mobile') {
      if (value >= 20) return '#3b82f6';
      if (value >= 10) return '#8b5cf6';
      if (value >= 5) return '#f43f5e';
      return '#ef4444';
    } else {
      if (value >= 50) return '#3b82f6';
      if (value >= 20) return '#8b5cf6';
      if (value >= 10) return '#f43f5e';
      return '#ef4444';
    }
  } else if (metric === 'ping') {
    if (value === 0) return '#475569'; // No data
    if (connectionType === 'mobile') {
      if (value <= 30) return '#10b981';
      if (value <= 50) return '#fbbf24';
      if (value <= 80) return '#f97316';
      return '#ef4444';
    } else {
      if (value <= 20) return '#10b981';
      if (value <= 40) return '#fbbf24';
      if (value <= 80) return '#f97316';
      return '#ef4444';
    }
  }
  return '#475569';
}

export function getNationalAverage(data: MunicipalityFeature[]): SpeedTestData {
  if (!data || data.length === 0) return { 
    name: "საშუალო", download: 0, upload: 0, ping: 0, tests: 0, devices: 0
  };
  
  let totalDown = 0, totalUp = 0, totalPing = 0, totalTests = 0, totalDevices = 0, totalLocations = 0;
  let minDown = Infinity, maxDown = 0;
  let minUp = Infinity, maxUp = 0;
  let minPing = Infinity, maxPing = 0;
  let count = 0;
  
  data.forEach(f => {
    if (f.properties.download > 0) {
      totalDown += f.properties.download;
      totalUp += f.properties.upload;
      totalPing += f.properties.ping;
      totalTests += f.properties.tests || 0;
      totalDevices += f.properties.devices || 0;
      totalLocations += f.properties.locations || (f.geometry?.type === 'Point' ? 1 : 0) || 1;

      if (f.properties.download_min !== undefined) minDown = Math.min(minDown, f.properties.download_min);
      if (f.properties.download_max !== undefined) maxDown = Math.max(maxDown, f.properties.download_max);
      
      if (f.properties.upload_min !== undefined) minUp = Math.min(minUp, f.properties.upload_min);
      if (f.properties.upload_max !== undefined) maxUp = Math.max(maxUp, f.properties.upload_max);
      
      if (f.properties.ping_min !== undefined) minPing = Math.min(minPing, f.properties.ping_min);
      if (f.properties.ping_max !== undefined) maxPing = Math.max(maxPing, f.properties.ping_max);

      count++;
    }
  });
  
  if (count === 0) count = 1;

  return {
    name: "ეროვნული საშუალო",
    download: totalDown / count,
    download_min: minDown === Infinity ? 0 : minDown,
    download_max: maxDown,
    upload: totalUp / count,
    upload_min: minUp === Infinity ? 0 : minUp,
    upload_max: maxUp,
    ping: totalPing / count,
    ping_min: minPing === Infinity ? 0 : minPing,
    ping_max: maxPing,
    tests: totalTests,
    devices: totalDevices,
    locations: totalLocations,
  };
}
