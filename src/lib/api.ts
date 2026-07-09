import * as turf from "@turf/turf";

const muniNameMap: Record<string, string> = { "მცხეთის": "მცხეთა", "ახმეტის": "ახმეტა", "თელავის": "თელავი", "გურჯაანის": "გურჯაანი", "ყვარლის": "ყვარელი", "სიღნაღის": "სიღნაღი", "დედოფლისწყაროს": "დედოფლისწყარo", "ლაგოდეხის": "ლაგოდეხი", "საგარეჯოს": "საგარეჯო", "თიანეთის": "თიანეთი", "დუშეთის": "დუშეთი", "ყაზბეგის": "ყაზბეგი", "კასპის": "კასპი", "გორის": "გორი", "ქარელის": "ქარელი", "ხაშურის": "ხაშური", "ბორჯომის": "ბორჯომი", "ახალციხის": "ახალციხე", "ადიგენის": "ადიგენი", "ასპინძის": "ასპინძა", "ახალქალაქის": "ახალქალაქი", "ნინოწმინდის": "ნინოწმინდა", "წალკის": "წალკა", "დმანისის": "დმანისი", "ბოლნისის": "ბოლნისი", "მარნეულის": "მარნეული", "გარდაბნის": "გარდაბანი", "თეთრიწყაროს": "თეთრიწყარო", "ონისა": "ონი", "ონის": "ონი", "ამბროლაურის": "ამბროლაური", "ცაგერის": "ცაგერი", "ლენტეხის": "ლენტეხი", "მესტიის": "მესტია", "საჩხერის": "საჩხერე", "ჭიათურის": "ჭიათურა", "ხარაგაულის": "ხარაგაული", "ზესტაფონის": "ზესტაფონი", "ბაღდათის": "ბაღდათი", "ვანის": "ვანი", "სამტრედიის": "სამტრედია", "ხონის": "ხონი", "წყალტუბოს": "წყალტუბო", "ტყიბულის": "ტყიბული", "თერჯოლის": "თერჯოლა", "ოზურგეთის": "ოზურგეთი", "ლანჩხუთის": "ლანჩხუთი", "ჩოხატაურის": "ჩოხატაური", "აბაშის": "აბაშა", "სენაკის": "სენაკი", "მარტვილის": "მარტვილი", "ხობის": "ხობი", "ზუგდიდის": "ზუგდიდი", "წალენჯიხის": "წალენჯიხა", "ჩხოროწყუს": "ჩხოროწყუ", "ბათუმის": "ბათუმი", "ქედის": "ქედა", "ქობულეთის": "ქობულეთი", "შუახევის": "შუახევი", "ხელვაჩაურის": "ხელვაჩაური", "ხულოს": "ხულო", "გულრიფშის": "გულრიფში", "გალის": "გალი", "ოჩამჩირის": "ოჩამჩირე", "სოხუმის": "სოხუმი", "გუდაუთის": "გუდაუთა", "გაგრის": "გაგრა", "ცხინვალის": "ცხინვალი", "ჯავის": "ჯავა", "ახალგორის": "ახალგორი", "ზნაურის": "ზნაური" };

function normalizeMuniName(name: string): string {
  if (!name) return "უცნობი მუნიციპალიტეტი";
  const n = name.replace(/ რაიონი$/, "").replace(/ მუნიციპალიტეტი$/, "");
  return muniNameMap[n] || n;
}

export interface SpeedTestProperties {
  download: number;
  upload: number;
  ping: number;
  tests: number;
  devices: number;
  year?: number;
  quarter?: string;
  name?: string;
  [key: string]: any;
}

export interface NationalTrend {
  quarter: string;
  download: number;
  upload: number;
  ping: number;
  timestamp: number;
}

export interface MuniTrend {
  quarter: string;
  download: number;
  upload: number;
  ping: number;
  timestamp: number;
}

export interface TrendData {
  national: NationalTrend[];
  municipalities: Record<string, MuniTrend[]>;
}

export interface GeoCacheMetadata {
  mobile: string[];
  fixed: string[];
  generated_at: string;
}

export interface LoadedPeriod {
  points: any;
  agg: any;
  lastAccessed: number;
}

export class SpatialGridIndex {
  private grid: Record<string, number[]> = {};
  private cellSizeX: number;
  private cellSizeY: number;
  private minLng: number;
  private minLat: number;
  private cols: number;
  private rows: number;

  constructor(muniList: { bbox: [number, number, number, number] }[], cols = 20, rows = 15) {
    this.cols = cols;
    this.rows = rows;

    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    for (const m of muniList) {
      minLng = Math.min(minLng, m.bbox[0]);
      minLat = Math.min(minLat, m.bbox[1]);
      maxLng = Math.max(maxLng, m.bbox[2]);
      maxLat = Math.max(maxLat, m.bbox[3]);
    }
    
    this.minLng = minLng - 0.05;
    this.minLat = minLat - 0.05;
    const maxLngPadded = maxLng + 0.05;
    const maxLatPadded = maxLat + 0.05;

    this.cellSizeX = (maxLngPadded - this.minLng) / cols;
    this.cellSizeY = (maxLatPadded - this.minLat) / rows;

    for (let i = 0; i < muniList.length; i++) {
      const bbox = muniList[i].bbox;
      const startCol = Math.floor((bbox[0] - this.minLng) / this.cellSizeX);
      const endCol = Math.floor((bbox[2] - this.minLng) / this.cellSizeX);
      const startRow = Math.floor((bbox[1] - this.minLat) / this.cellSizeY);
      const endRow = Math.floor((bbox[3] - this.minLat) / this.cellSizeY);

      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
          const key = `${c},${r}`;
          if (!this.grid[key]) {
            this.grid[key] = [];
          }
          this.grid[key].push(i);
        }
      }
    }
  }

  public getCandidateIndices(lng: number, lat: number): number[] {
    if (isNaN(lng) || isNaN(lat)) return [];
    let col = Math.floor((lng - this.minLng) / this.cellSizeX);
    let row = Math.floor((lat - this.minLat) / this.cellSizeY);
    if (col < 0) col = 0;
    else if (col >= this.cols) col = this.cols - 1;
    if (row < 0) row = 0;
    else if (row >= this.rows) row = this.rows - 1;
    return this.grid[`${col},${row}`] || [];
  }
}

export interface MuniJoinObject {
  feature: any;
  name: string;
  bbox: [number, number, number, number];
  ptsInPoly: SpeedTestProperties[];
}

export interface GeoCache {
  meta: GeoCacheMetadata | null;
  rawMuni: any;
  muniList: MuniJoinObject[] | null;
  muniIndex: SpatialGridIndex | null;
  periods: Record<string, LoadedPeriod>;
  trendFixed: TrendData | null;
  trendMobile: TrendData | null;
  ready: boolean;
  trendPromises: Record<string, Promise<void> | null>;
}

const geoCache: GeoCache = {
  meta: null,
  rawMuni: null,
  muniList: null,
  muniIndex: null,
  periods: {},
  trendFixed: null,
  trendMobile: null,
  ready: false,
  trendPromises: { fixed: null, mobile: null }
};

const activeLoads: Record<string, Promise<LoadedPeriod | null>> = {};

function normalizePoints(data: any): any {
  if (!data || !Array.isArray(data.features)) return data;
  return {
    ...data,
    features: data.features.map((f: any, idx: number) => ({
      ...f,
      properties: {
        ...f.properties,
        name: `ზონა #${idx + 1}`,
        download: f.properties.avg_d_mbps || 0,
        upload: f.properties.avg_u_mbps || 0,
        ping: f.properties.avg_lat_ms || 0,
        tests: f.properties.tests || 0,
        devices: f.properties.devices || 0,
        locations: 1
      }
    }))
  };
}

function getFeatureCenter(f: any): any {
  if (!f || !f.geometry) return null;
  if (f.geometry.type === "Point") {
    return {
      type: "Feature",
      geometry: f.geometry,
      properties: f.properties
    };
  }
  
  try {
    const cent = turf.centroid(f);
    cent.properties = f.properties;
    return cent;
  } catch (err) {
    try {
      const bbox = turf.bbox(f);
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
        },
        properties: f.properties
      };
    } catch (e) {
      return null;
    }
  }
}

async function doJoin(points: any[], muniList: MuniJoinObject[], index: SpatialGridIndex): Promise<MuniJoinObject[]> {
  const centroids = points.map((f: any) => ({
    originalFeature: f,
    center: getFeatureCenter(f)
  })).filter(x => x.center);

  let count = 0;
  for (const item of centroids) {
    count++;
    if (count % 500 === 0) {
      await new Promise(r => setTimeout(r, 0)); 
    }
    
    const pt = item.center;
    const [lng, lat] = pt.geometry.coordinates;
    const candidates = index.getCandidateIndices(lng, lat);
    
    for (const idx of candidates) {
      const muniObj = muniList[idx];
      const bbox = muniObj.bbox;
      if (lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]) {
        try {
          if (turf.booleanPointInPolygon(pt, muniObj.feature)) {
            const origName = item.originalFeature.properties.name || "";
            const zoneMatch = origName.match(/#\d+/);
            const suffix = zoneMatch ? ` ${zoneMatch[0]}` : '';
            
            const newProps = {
              ...item.originalFeature.properties,
              name: `${muniObj.name}${suffix}`
            };
            item.originalFeature.properties = newProps;
            
            muniObj.ptsInPoly.push(newProps);
            break;
          }
        } catch (err) {}
      }
    }
  }

  return muniList;
}

async function performSpatialJoin(points: any[], rawMuni: any): Promise<MuniJoinObject[]> {
  if (!geoCache.muniList || !geoCache.muniIndex) {
    const muniList: MuniJoinObject[] = rawMuni.features.map((m: any) => ({
      feature: m,
      name: normalizeMuniName(m.properties.NAME_2 || m.properties.NAME_1 || m.properties.name),
      bbox: turf.bbox(m) as [number, number, number, number],
      ptsInPoly: [] as SpeedTestProperties[]
    }));
    const index = new SpatialGridIndex(muniList);
    return doJoin(points, muniList, index);
  }

  const freshMuniList: MuniJoinObject[] = geoCache.muniList.map((m) => ({
    feature: m.feature,
    name: m.name,
    bbox: m.bbox,
    ptsInPoly: [] as SpeedTestProperties[]
  }));

  return doJoin(points, freshMuniList, geoCache.muniIndex);
}

async function aggregateData(pointsData: any, muniData: any): Promise<any> {
  const muniList = await performSpatialJoin(pointsData.features, muniData);
  
  const features = muniList.map((m) => {
    const pts = m.ptsInPoly;
    
    const props = {
      ...m.feature.properties,
      name: m.name,
      download: 0,
      download_max: 0,
      download_min: Infinity,
      upload: 0,
      upload_max: 0,
      upload_min: Infinity,
      ping: 0,
      ping_max: 0,
      ping_min: Infinity,
      tests: 0,
      devices: 0,
      locations: pts.length
    };

    if (pts.length > 0) {
      let dSum = 0, dCount = 0;
      let uSum = 0, uCount = 0;
      let pSum = 0, pCount = 0;

      for (const p of pts) {
        const d = p.download || 0;
        const u = p.upload || 0;
        const pin = p.ping || 0;

        if (d > 0) {
          dSum += d; dCount++;
          props.download_max = Math.max(props.download_max, d);
          props.download_min = Math.min(props.download_min, d);
        }
        if (u > 0) {
          uSum += u; uCount++;
          props.upload_max = Math.max(props.upload_max, u);
          props.upload_min = Math.min(props.upload_min, u);
        }
        if (pin > 0) {
          pSum += pin; pCount++;
          props.ping_max = Math.max(props.ping_max, pin);
          props.ping_min = Math.min(props.ping_min, pin);
        }
        props.tests += p.tests || 0;
        props.devices += p.devices || 0;
      }

      if (dCount > 0) props.download = dSum / dCount;
      if (uCount > 0) props.upload = uSum / uCount;
      if (pCount > 0) props.ping = pSum / pCount;
    }

    if (props.download_min === Infinity) props.download_min = 0;
    if (props.upload_min === Infinity) props.upload_min = 0;
    if (props.ping_min === Infinity) props.ping_min = 0;

    return {
      ...m.feature,
      properties: props
    };
  });

  return {
    type: "FeatureCollection",
    features
  };
}

function closeRings(geojson: any): any {
  if (geojson.type === "FeatureCollection") {
    geojson.features.forEach((f: any) => closeRings(f));
  } else if (geojson.type === "Feature") {
    closeRings(geojson.geometry);
  } else if (geojson.type === "Polygon") {
    geojson.coordinates.forEach((ring: any) => {
      if (ring.length > 0) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          ring.push([...first]);
        }
      }
    });
  } else if (geojson.type === "MultiPolygon") {
    geojson.coordinates.forEach((poly: any) => {
      poly.forEach((ring: any) => {
        if (ring.length > 0) {
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push([...first]);
          }
        }
      });
    });
  }
  return geojson;
}

async function fetchWithRetry(url: string, options?: RequestInit, retries = 5, delay = 2000): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res;
  } catch (err) {
    if (retries <= 0) throw err;
    console.warn(`Fetch failed for ${url}. Retrying in ${delay}ms...`, err);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 1.5);
  }
}

async function loadPeriodData(file: string): Promise<LoadedPeriod | null> {
  if (geoCache.periods[file]) {
    geoCache.periods[file].lastAccessed = Date.now();
    return geoCache.periods[file];
  }

  if (activeLoads[file]) {
    return activeLoads[file];
  }

  const loadPromise = (async (): Promise<LoadedPeriod | null> => {
    const keys = Object.keys(geoCache.periods);
    if (keys.length >= 10) {
      let oldestKey = keys[0];
      let oldestTime = geoCache.periods[oldestKey].lastAccessed;
      for (const key of keys) {
        if (geoCache.periods[key].lastAccessed < oldestTime) {
          oldestTime = geoCache.periods[key].lastAccessed;
          oldestKey = key;
        }
      }
      delete geoCache.periods[oldestKey];
    }

    const baseUrl = "https://raw.githubusercontent.com/caucasusoffline/georgia-speedtest-map/main/data/";
    try {
      const res = await fetchWithRetry(baseUrl + file);
      const raw = await res.json();
      const points = normalizePoints(raw);
      const agg = await aggregateData(points, geoCache.rawMuni);
      geoCache.periods[file] = { points, agg, lastAccessed: Date.now() };
      return geoCache.periods[file];
    } catch(e) {
      console.error("Error loading period data", file, e);
      return null;
    } finally {
      delete activeLoads[file];
    }
  })();

  activeLoads[file] = loadPromise;
  return loadPromise;
}

async function fetchTrendData(files: string[], rawMuni: any): Promise<TrendData> {
  const trend: TrendData = {
    national: [],
    municipalities: {}
  };
  
  const baseUrl = "https://raw.githubusercontent.com/caucasusoffline/georgia-speedtest-map/main/data/";
  
  rawMuni.features.forEach((m: any) => {
    const name = normalizeMuniName(m.properties.NAME_2 || m.properties.NAME_1 || m.properties.name);
    trend.municipalities[name] = [];
  });
  
  for (let i = 0; i < files.length; i += 3) {
    const chunk = files.slice(i, i + 3);
    const promises = chunk.map(async (file) => {
      try {
        if (geoCache.periods[file]) {
          const cached = geoCache.periods[file];
          let totalDown = 0, totalUp = 0, totalPing = 0;
          let count = 0;
          for (const f of cached.points.features) {
            const d = f.properties.download || 0;
            const u = f.properties.upload || 0;
            const pin = f.properties.ping || 0;
            if (d > 0) {
              totalDown += d;
              totalUp += u;
              totalPing += pin;
              count++;
            }
          }
          
          const match = file.match(/(\d{4})_(Q\d)/);
          const quarter = match ? `${match[1]} ${match[2]}` : file;
          const timestamp = match ? new Date(`${match[1]}-${match[2].replace('Q1','01').replace('Q2','04').replace('Q3','07').replace('Q4','10')}-01`).getTime() : 0;
          
          const nationalData: NationalTrend = {
            quarter,
            download: count > 0 ? totalDown / count : 0,
            upload: count > 0 ? totalUp / count : 0,
            ping: count > 0 ? totalPing / count : 0,
            timestamp
          };
          
          const finalMuniStats: Record<string, MuniTrend> = {};
          for (const m of cached.agg.features) {
            finalMuniStats[m.properties.name] = {
              quarter,
              download: m.properties.download || 0,
              upload: m.properties.upload || 0,
              ping: m.properties.ping || 0,
              timestamp
            };
          }
          
          return { national: nationalData, municipalities: finalMuniStats };
        }

        const res = await fetchWithRetry(baseUrl + file);
        const rawData = await res.json();
        const data = normalizePoints(rawData);
        
        let totalDown = 0, totalUp = 0, totalPing = 0;
        let count = 0;
        for (const f of data.features) {
          const d = f.properties.download || 0;
          const u = f.properties.upload || 0;
          const pin = f.properties.ping || 0;
          if (d > 0) {
            totalDown += d;
            totalUp += u;
            totalPing += pin;
            count++;
          }
        }
        
        const match = file.match(/(\d{4})_(Q\d)/);
        const quarter = match ? `${match[1]} ${match[2]}` : file;
        const timestamp = match ? new Date(`${match[1]}-${match[2].replace('Q1','01').replace('Q2','04').replace('Q3','07').replace('Q4','10')}-01`).getTime() : 0;
        
        const nationalData: NationalTrend = {
          quarter,
          download: count > 0 ? totalDown / count : 0,
          upload: count > 0 ? totalUp / count : 0,
          ping: count > 0 ? totalPing / count : 0,
          timestamp
        };

        const joinedMuniList = await performSpatialJoin(data.features, rawMuni);
        
        const finalMuniStats: Record<string, MuniTrend> = {};
        for (const m of joinedMuniList) {
          const pts = m.ptsInPoly;
          let dSum = 0, dCount = 0;
          let uSum = 0, uCount = 0;
          let pSum = 0, pCount = 0;

          for (const p of pts) {
            const d = p.download || 0;
            const u = p.upload || 0;
            const pin = p.ping || 0;
            if (d > 0) { dSum += d; dCount++; }
            if (u > 0) { uSum += u; uCount++; }
            if (pin > 0) { pSum += pin; pCount++; }
          }

          finalMuniStats[m.name] = {
            quarter,
            download: dCount > 0 ? dSum / dCount : 0,
            upload: uCount > 0 ? uSum / uCount : 0,
            ping: pCount > 0 ? pSum / pCount : 0,
            timestamp
          };
        }

        await new Promise(r => setTimeout(r, 10)); 

        return { national: nationalData, municipalities: finalMuniStats };
      } catch (e) {
        console.error("Error loading trend file:", file, e);
        return null;
      }
    });
    
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res) {
        trend.national.push(res.national);
        for (const [name, stats] of Object.entries(res.municipalities)) {
          if (trend.municipalities[name]) {
            trend.municipalities[name].push(stats);
          }
        }
      }
    }
  }
  
  trend.national.sort((a, b) => a.timestamp - b.timestamp);
  for (const name in trend.municipalities) {
    trend.municipalities[name].sort((a, b) => a.timestamp - b.timestamp);
  }
  
  return trend;
}

// Ensure init happens only once
let initPromise: Promise<void> | null = null;

export async function initClientData(): Promise<void> {
  if (geoCache.ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("Fetching metadata...");
    const metaRes = await fetchWithRetry("https://raw.githubusercontent.com/caucasusoffline/georgia-speedtest-map/main/data/metadata.json");
    const meta: GeoCacheMetadata = await metaRes.json();
    geoCache.meta = meta;
    
    console.log("Fetching muni shapes...");
    const muniRes = await fetchWithRetry("https://raw.githubusercontent.com/caucasusoffline/georgia-speedtest-map/main/municipality.geojson");
    let rawMuni = await muniRes.json();
    rawMuni = closeRings(rawMuni);
    geoCache.rawMuni = rawMuni;

    const muniList: MuniJoinObject[] = rawMuni.features.map((m: any) => ({
      feature: m,
      name: normalizeMuniName(m.properties.NAME_2 || m.properties.NAME_1 || m.properties.name),
      bbox: turf.bbox(m) as [number, number, number, number],
      ptsInPoly: [] as SpeedTestProperties[]
    }));
    geoCache.muniList = muniList;
    geoCache.muniIndex = new SpatialGridIndex(muniList);

    geoCache.ready = true;
    console.log("Map client data init complete."); 
  })();

  return initPromise;
}

export async function getMetadataApi() {
  await initClientData();
  return geoCache.meta;
}

export async function getDataApi(type: 'fixed' | 'mobile', view: 'municipality' | 'points', period?: string) {
  await initClientData();
  const file = period || geoCache.meta![type][0];
  let periodData = geoCache.periods[file];
  if (!periodData) {
    periodData = (await loadPeriodData(file)) as LoadedPeriod;
  }
  return view === 'points' ? periodData.points : periodData.agg;
}

export async function getTrendApi(type: 'fixed' | 'mobile') {
  await initClientData();
  if (type === 'fixed') {
    if (!geoCache.trendFixed) {
      if (!geoCache.trendPromises.fixed) {
        geoCache.trendPromises.fixed = fetchTrendData(geoCache.meta!.fixed, geoCache.rawMuni).then(d => { geoCache.trendFixed = d; });
      }
      await geoCache.trendPromises.fixed;
    }
    return geoCache.trendFixed;
  } else {
    if (!geoCache.trendMobile) {
      if (!geoCache.trendPromises.mobile) {
        geoCache.trendPromises.mobile = fetchTrendData(geoCache.meta!.mobile, geoCache.rawMuni).then(d => { geoCache.trendMobile = d; });
      }
      await geoCache.trendPromises.mobile;
    }
    return geoCache.trendMobile;
  }
}
