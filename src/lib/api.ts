const muniNameMap: Record<string, string> = { "მცხეთის": "მცხეთა", "ახმეტის": "ახმეტა", "თელავის": "თელავი", "გურჯაანის": "გურჯაანი", "ყვარლის": "ყვარელი", "სიღნაღის": "სიღნაღი", "დედოფლისწყაროს": "დედოფლისწყარო", "ლაგოდეხის": "ლაგოდეხი", "საგარეჯოს": "საგარეჯო", "თიანეთის": "თიანეთი", "დუშეთის": "დუშეთი", "ყაზბეგის": "ყაზბეგი", "კასპის": "კასპი", "გორის": "გორი", "ქარელის": "ქარელი", "ხაშურის": "ხაშური", "ბორჯომის": "ბორჯომი", "ახალციხის": "ახალციხე", "ადიგენის": "ადიგენი", "ასპინძის": "ასპინძა", "ახალქალაქის": "ახალქალაქი", "ნინოწმინდის": "ნინოწმინდა", "წალკის": "წალკა", "დმანისის": "დმანისი", "ბოლნისის": "ბოლნისი", "მარნეულის": "მარნეული", "გარდაბნის": "გარდაბანი", "თეთრიწყაროს": "თეთრიწყარო", "ონისა": "ონი", "ონის": "ონი", "ამბროლაურის": "ამბროლაური", "ცაგერის": "ცაგერი", "ლენტეხის": "ლენტეხი", "მესტიის": "მესტია", "საჩხერის": "საჩხერე", "ჭიათურის": "ჭიათურა", "ხარაგაულის": "ხარაგაული", "ზესტაფონის": "ზესტაფონი", "ბაღდათის": "ბაღდათი", "ვანის": "ვანი", "სამტრედიის": "სამტრედია", "ხონის": "ხონი", "წყალტუბოს": "წყალტუბო", "ტყიბულის": "ტყიბული", "თერჯოლის": "თერჯოლა", "ოზურგეთის": "ოზურგეთი", "ლანჩხუთის": "ლანჩხუთი", "ჩოხატაურის": "ჩოხატაური", "აბაშის": "აბაშა", "სენაკის": "სენაკი", "მარტვილის": "მარტვილი", "ხობის": "ხობი", "ზუგდიდის": "ზუგდიდი", "წალენჯიხის": "წალენჯიხა", "ჩხოროწყუს": "ჩხოროწყუ", "ბათუმის": "ბათუმი", "ქედის": "ქედა", "ქობულეთის": "ქობულეთი", "შუახევის": "შუახევი", "ხელვაჩაურის": "ხელვაჩაური", "ხულოს": "ხულო", "გულრიფშის": "გულრიფში", "გალის": "გალი", "ოჩამჩირის": "ოჩამჩირე", "სოხუმის": "სოხუმი", "გუდაუთის": "გუდაუთა", "გაგრის": "გაგრა", "ცხინვალის": "ცხინვალი", "ჯავის": "ჯავა", "ახალგორის": "ახალგორი", "ზნაურის": "ზნაური" };

export function normalizeMuniName(name: string): string {
  if (!name) return "უცნობი მუნიციპალიტეტი";
  const n = name.replace(/ რაიონი$/, "").replace(/ მუნიციპალიტეტი$/, "");
  return muniNameMap[n] || n;
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

export interface GeoCache {
  meta: GeoCacheMetadata | null;
  rawMuni: any;
  periods: Record<string, LoadedPeriod>;
  trendFixed: TrendData | null;
  trendMobile: TrendData | null;
  ready: boolean;
  trendPromises: Record<string, Promise<void> | null>;
}

const geoCache: GeoCache = {
  meta: null,
  rawMuni: null,
  periods: {},
  trendFixed: null,
  trendMobile: null,
  ready: false,
  trendPromises: { fixed: null, mobile: null }
};

const activeLoads: Record<string, Promise<LoadedPeriod | null>> = {};
const baseUrl = "https://raw.githubusercontent.com/caucasusoffline/maptest/main/data/";

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 1500): Promise<Response> {
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

// Ensure init happens only once
let initPromise: Promise<void> | null = null;

export async function initClientData(): Promise<void> {
  if (geoCache.ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("Fetching metadata...");
    const metaRes = await fetchWithRetry(baseUrl + "metadata.json");
    const meta: GeoCacheMetadata = await metaRes.json();
    geoCache.meta = meta;
    
    console.log("Fetching muni shapes...");
    const muniRes = await fetchWithRetry("https://raw.githubusercontent.com/caucasusoffline/maptest/main/municipality.geojson");
    let rawMuni = await muniRes.json();
    rawMuni = closeRings(rawMuni);
    
    // Pre-normalize names in the base GeoJSON
    rawMuni.features.forEach((f: any) => {
      const originalName = f.properties.NAME_2 || f.properties.NAME_1 || f.properties.name;
      f.properties.muni_name = normalizeMuniName(originalName);
    });
    
    geoCache.rawMuni = rawMuni;
    geoCache.ready = true;
    console.log("Map client data init complete."); 
  })();

  return initPromise;
}

export async function getMetadataApi() {
  await initClientData();
  return geoCache.meta;
}

async function loadPeriodData(type: string, periodId: string): Promise<LoadedPeriod | null> {
  const cacheKey = `${type}_${periodId}`;
  
  if (geoCache.periods[cacheKey]) {
    geoCache.periods[cacheKey].lastAccessed = Date.now();
    return geoCache.periods[cacheKey];
  }

  if (activeLoads[cacheKey]) {
    return activeLoads[cacheKey];
  }

  const loadPromise = (async (): Promise<LoadedPeriod | null> => {
    // Cache management
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

    try {
      const [pointsRes, aggRes] = await Promise.all([
        fetchWithRetry(baseUrl + `georgia_${type}_${periodId}.geojson`).catch(() => null),
        fetchWithRetry(baseUrl + `georgia_${type}_${periodId}_agg.json`).catch(() => null)
      ]);

      let points = null;
      if (pointsRes) {
        points = await pointsRes.json();
        if (points && points.features) {
          points.features.forEach((f: any, idx: number) => {
            if (!f.properties.name) f.properties.name = `ზონა #${idx + 1}`;
            f.properties.locations = 1;
          });
        }
      }

      let aggData = null;
      if (aggRes) {
        const aggDict = await aggRes.json();
        
        // Map aggregate data onto the base municipality GeoJSON
        const features = geoCache.rawMuni.features.map((m: any) => {
          const muniName = m.properties.muni_name;
          const stats = aggDict[muniName] || {
            download: 0, download_max: 0, download_min: 0,
            upload: 0, upload_max: 0, upload_min: 0,
            ping: 0, ping_max: 0, ping_min: 0,
            tests: 0, devices: 0, locations: 0
          };
          
          return {
            ...m,
            properties: {
              ...m.properties,
              name: muniName,
              ...stats
            }
          };
        });

        aggData = {
          type: "FeatureCollection",
          features
        };
      }

      geoCache.periods[cacheKey] = { points, agg: aggData, lastAccessed: Date.now() };
      return geoCache.periods[cacheKey];
    } catch(e) {
      console.error("Error loading period data", periodId, e);
      return null;
    } finally {
      delete activeLoads[cacheKey];
    }
  })();

  activeLoads[cacheKey] = loadPromise;
  return loadPromise;
}

export async function getDataApi(type: 'fixed' | 'mobile', view: 'municipality' | 'points', periodId?: string) {
  await initClientData();
  const targetPeriod = periodId || geoCache.meta![type][0];
  let periodData = geoCache.periods[`${type}_${targetPeriod}`];
  
  if (!periodData) {
    periodData = (await loadPeriodData(type, targetPeriod)) as LoadedPeriod;
  }
  
  return view === 'points' ? periodData.points : periodData.agg;
}

export async function getTrendApi(type: 'fixed' | 'mobile') {
  await initClientData();
  
  if (type === 'fixed') {
    if (!geoCache.trendFixed) {
      if (!geoCache.trendPromises.fixed) {
        geoCache.trendPromises.fixed = fetchWithRetry(baseUrl + "trend_fixed.json")
          .then(res => res.json())
          .then(data => { geoCache.trendFixed = data; })
          .catch(err => console.error("Failed to load fixed trends", err));
      }
      await geoCache.trendPromises.fixed;
    }
    return geoCache.trendFixed;
  } else {
    if (!geoCache.trendMobile) {
      if (!geoCache.trendPromises.mobile) {
        geoCache.trendPromises.mobile = fetchWithRetry(baseUrl + "trend_mobile.json")
          .then(res => res.json())
          .then(data => { geoCache.trendMobile = data; })
          .catch(err => console.error("Failed to load mobile trends", err));
      }
      await geoCache.trendPromises.mobile;
    }
    return geoCache.trendMobile;
  }
}
