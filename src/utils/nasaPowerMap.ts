export type NasaMapLayerId =
  | 'power-hybrid'
  | 'nasa-modis-truecolor'
  | 'nasa-ndvi'
  | 'nasa-precip'
  | 'offline-vector';

export interface NasaPowerGridCell {
  id: string;
  centerLat: number;
  centerLon: number;
  southLat: number;
  northLat: number;
  westLon: number;
  eastLon: number;
  widthKm: number;
  heightKm: number;
  isPrimary: boolean;
}

export interface NasaMapLayerMeta {
  id: NasaMapLayerId;
  labelTh: string;
  labelEn: string;
  descriptionTh: string;
  descriptionEn: string;
  nasaProductCode: string;
}

/**
 * NASA POWER meteorological & agroclimatology variables (T2M, PRECTOTCORR, RH2M)
 * are served on the MERRA-2 0.5° latitude x 0.625° longitude spatial grid.
 */
export const NASA_POWER_LAT_STEP = 0.5;
export const NASA_POWER_LON_STEP = 0.625;

export function computeNasaPowerGridCell(
  lat: number,
  lon: number,
  isPrimary = true
): NasaPowerGridCell {
  const centerLat = Number((Math.round(lat / NASA_POWER_LAT_STEP) * NASA_POWER_LAT_STEP).toFixed(4));
  const centerLon = Number((Math.round(lon / NASA_POWER_LON_STEP) * NASA_POWER_LON_STEP).toFixed(4));

  const halfLat = NASA_POWER_LAT_STEP / 2;
  const halfLon = NASA_POWER_LON_STEP / 2;

  const southLat = Number((centerLat - halfLat).toFixed(4));
  const northLat = Number((centerLat + halfLat).toFixed(4));
  const westLon = Number((centerLon - halfLon).toFixed(4));
  const eastLon = Number((centerLon + halfLon).toFixed(4));

  const heightKm = Number((NASA_POWER_LAT_STEP * 111.32).toFixed(1));
  const widthKm = Number(
    (NASA_POWER_LON_STEP * 111.32 * Math.cos((centerLat * Math.PI) / 180)).toFixed(1)
  );

  return {
    id: `MERRA2_${centerLat.toFixed(2)}N_${centerLon.toFixed(3)}E`,
    centerLat,
    centerLon,
    southLat,
    northLat,
    westLon,
    eastLon,
    widthKm,
    heightKm,
    isPrimary,
  };
}

/**
 * Generates the 3x3 surrounding NASA POWER MERRA-2 spatial grid cells
 * centered on the plot's containing cell, matching the gridded overview
 * shown in the NASA POWER Data Access Viewer.
 */
export function buildNasaPowerSurroundingGrid(lat: number, lon: number): NasaPowerGridCell[] {
  const primary = computeNasaPowerGridCell(lat, lon, true);
  const cells: NasaPowerGridCell[] = [];

  for (let dLat = -1; dLat <= 1; dLat += 1) {
    for (let dLon = -1; dLon <= 1; dLon += 1) {
      const cellLat = primary.centerLat + dLat * NASA_POWER_LAT_STEP;
      const cellLon = primary.centerLon + dLon * NASA_POWER_LON_STEP;
      cells.push(computeNasaPowerGridCell(cellLat, cellLon, dLat === 0 && dLon === 0));
    }
  }
  return cells;
}

/**
 * NASA GIBS archive imagery settles a few days behind real-time and caps safely
 * to settled 2025 imagery if the host clock is in a future year.
 */
export function getNasaGibsDateString(referenceDate: Date = new Date()): string {
  const safe = new Date(referenceDate.getTime());
  safe.setUTCDate(safe.getUTCDate() - 5);
  if (safe.getUTCFullYear() > 2025) {
    safe.setUTCFullYear(2025);
  }
  const y = safe.getUTCFullYear();
  const m = String(safe.getUTCMonth() + 1).padStart(2, '0');
  const d = String(safe.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildNasaGibsTileUrl(
  layer: 'MODIS_Terra_CorrectedReflectance_TrueColor' | 'MODIS_Terra_NDVI_8Day' | 'IMERG_Precipitation_Rate',
  dateStr: string
): string {
  switch (layer) {
    case 'MODIS_Terra_CorrectedReflectance_TrueColor':
      return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
    case 'MODIS_Terra_NDVI_8Day':
      return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
    case 'IMERG_Precipitation_Rate':
      return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${dateStr}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
  }
}

export function buildNasaPowerViewerUrl(lat: number, lon: number): string {
  return `https://power.larc.nasa.gov/data-access-viewer/?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
}

export const NASA_MAP_LAYERS: NasaMapLayerMeta[] = [
  {
    id: 'power-hybrid',
    labelTh: 'แผนที่ + กริด NASA',
    labelEn: 'Map + NASA Grid',
    descriptionTh: 'แผนที่ภูมิประเทศพร้อมขอบเขตกริด MERRA-2 (0.5°×0.625°) และขอบเขตแปลงเกษตร',
    descriptionEn: 'Terrain/street base map with NASA POWER MERRA-2 0.5°×0.625° grid cell & parcel boundary',
    nasaProductCode: 'MERRA-2 0.5°×0.625°',
  },
  {
    id: 'nasa-modis-truecolor',
    labelTh: 'ดาวเทียม NASA',
    labelEn: 'NASA Satellite',
    descriptionTh: 'ภาพถ่ายดาวเทียมสีจริงจาก NASA EOSDIS GIBS (MODIS Terra True Color)',
    descriptionEn: 'True-color satellite reflectance from NASA EOSDIS GIBS (MODIS Terra)',
    nasaProductCode: 'MODIS Terra TrueColor',
  },
  {
    id: 'nasa-ndvi',
    labelTh: 'ดัชนีพืช (NDVI)',
    labelEn: 'Crop NDVI',
    descriptionTh: 'ชั้นข้อมูลความเขียวสมบูรณ์ของพืชพรรณ 8 วันจากดาวเทียม NASA MODIS Terra',
    descriptionEn: '8-day vegetation greenness index overlay from NASA MODIS Terra',
    nasaProductCode: 'MODIS_Terra_NDVI_8Day',
  },
  {
    id: 'nasa-precip',
    labelTh: 'ฝนดาวเทียม (IMERG)',
    labelEn: 'NASA Rain (IMERG)',
    descriptionTh: 'ชั้นข้อมูลอัตราฝนตกจากกลุ่มดาวเทียม NASA GPM IMERG',
    descriptionEn: 'Satellite precipitation rate layer from NASA GPM IMERG',
    nasaProductCode: 'GPM IMERG Precip',
  },
  {
    id: 'offline-vector',
    labelTh: 'ออฟไลน์',
    labelEn: 'Offline Vector',
    descriptionTh: 'แผนที่พิกัดแปลงและแผนที่ประเทศไทยแบบเวกเตอร์ ใช้งานได้แม้ไม่มีอินเทอร์เน็ต',
    descriptionEn: 'Zero-network vector parcel & regional map for offline field inspections',
    nasaProductCode: 'Vector Fallback',
  },
];
