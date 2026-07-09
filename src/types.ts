import { Feature, Geometry } from "geojson";

export type MetricType = 'download' | 'upload' | 'ping';

export interface SpeedTestData {
  name: string;
  download: number;
  upload: number;
  ping: number;
  tests: number;
  devices?: number;
  locations?: number;

  download_max?: number;
  download_min?: number;
  upload_max?: number;
  upload_min?: number;
  ping_max?: number;
  ping_min?: number;
}

export type MunicipalityFeature = Feature<Geometry, SpeedTestData>;

