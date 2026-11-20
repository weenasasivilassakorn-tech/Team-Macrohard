export interface SvgPoint {
  x: number;
  y: number;
}

export const THAILAND_BOUNDS = {
  minLat: 5.5,
  maxLat: 20.6,
  minLon: 97.2,
  maxLon: 105.7,
};

export const THAILAND_SVG_VIEWBOX = {
  width: 240,
  height: 280,
};

/**
 * Calibrated geographic coordinates (lat, lon) tracing Thailand's border silhouette
 * for 100% offline regional vector rendering during field site visits.
 */
const THAILAND_BORDER_LATLON: Array<[number, number]> = [
  [20.42, 99.88], // Mae Sai (North)
  [20.2, 100.45],
  [19.35, 101.25], // Nan
  [18.1, 101.1],
  [17.9, 102.65], // Nong Khai
  [17.4, 104.78], // Nakhon Phanom
  [15.25, 105.5], // Ubon Ratchathani (East)
  [14.35, 104.35], // Sisaket / Surin border
  [13.7, 102.6], // Sa Kaeo
  [12.15, 102.75], // Trat
  [13.45, 100.6], // Bangkok Gulf
  [12.5, 99.95], // Hua Hin
  [10.5, 99.18], // Chumphon
  [8.4, 100.05], // Nakhon Si Thammarat
  [6.3, 101.85], // Narathiwat (South)
  [5.75, 101.1], // Betong
  [6.6, 99.9], // Satun
  [8.0, 98.35], // Phuket / Phang Nga
  [10.0, 98.6], // Ranong
  [11.8, 99.6], // Prachuap neck
  [14.2, 98.5], // Kanchanaburi
  [16.7, 98.55], // Tak / Mae Sot
  [18.6, 97.9], // Mae Hong Son
  [19.8, 98.1],
  [20.42, 99.88],
];

export interface RegionalCityMarker {
  id: string;
  labelTh: string;
  labelEn: string;
  lat: number;
  lon: number;
}

export const REGIONAL_REFERENCE_CITIES: RegionalCityMarker[] = [
  { id: 'chiangmai', labelTh: 'เชียงใหม่', labelEn: 'Chiang Mai', lat: 18.79, lon: 98.98 },
  { id: 'khonkaen', labelTh: 'ขอนแก่น', labelEn: 'Khon Kaen', lat: 16.43, lon: 102.83 },
  { id: 'phetchabun', labelTh: 'เพชรบูรณ์', labelEn: 'Phetchabun', lat: 16.42, lon: 101.15 },
  { id: 'surin', labelTh: 'สุรินทร์', labelEn: 'Surin', lat: 14.88, lon: 103.49 },
  { id: 'bangkok', labelTh: 'กทม.', labelEn: 'Bangkok', lat: 13.75, lon: 100.5 },
  { id: 'songkhla', labelTh: 'สงขลา', labelEn: 'Songkhla', lat: 7.19, lon: 100.59 },
];

export function projectLatLonToThailandSvg(
  lat: number,
  lon: number,
  width = THAILAND_SVG_VIEWBOX.width,
  height = THAILAND_SVG_VIEWBOX.height,
  padding = 18
): SvgPoint {
  const clampedLat = Math.max(THAILAND_BOUNDS.minLat, Math.min(THAILAND_BOUNDS.maxLat, lat));
  const clampedLon = Math.max(THAILAND_BOUNDS.minLon, Math.min(THAILAND_BOUNDS.maxLon, lon));

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const xRatio =
    (clampedLon - THAILAND_BOUNDS.minLon) /
    (THAILAND_BOUNDS.maxLon - THAILAND_BOUNDS.minLon);
  const yRatio =
    (THAILAND_BOUNDS.maxLat - clampedLat) /
    (THAILAND_BOUNDS.maxLat - THAILAND_BOUNDS.minLat);

  return {
    x: Number((padding + xRatio * usableWidth).toFixed(1)),
    y: Number((padding + yRatio * usableHeight).toFixed(1)),
  };
}

export function buildThailandOutlineSvgPath(): string {
  const pts = THAILAND_BORDER_LATLON.map(([lat, lon]) =>
    projectLatLonToThailandSvg(lat, lon)
  );
  return (
    pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ') + ' Z'
  );
}

export interface ParcelFootprint {
  areaSqm: number;
  widthMeters: number;
  heightMeters: number;
  svgRectWidth: number;
  svgRectHeight: number;
  scaleBarMeters: number;
  cornerCoords: Array<{ label: string; lat: number; lon: number }>;
}

/**
 * Derives an approximate rectangular parcel footprint and meter scale from Thai Rai
 * (1 Rai = 1,600 square meters) for offline field officer verification.
 */
export function computeParcelGeometryFromRai(
  lat: number,
  lon: number,
  areaRai: number
): ParcelFootprint {
  const safeRai = Math.max(1, Math.min(1000, areaRai || 15));
  const areaSqm = Math.round(safeRai * 1600);
  // 1.35:1 aspect ratio typical of Thai agricultural land plots
  const heightMeters = Math.round(Math.sqrt(areaSqm / 1.35));
  const widthMeters = Math.round(heightMeters * 1.35);

  // Map parcel size proportionally onto a 300x180 SVG plot canvas (clamped for visual clarity)
  const scaleFactor = Math.min(1.4, Math.max(0.55, Math.sqrt(safeRai / 20)));
  const svgRectWidth = Math.round(112 * scaleFactor);
  const svgRectHeight = Math.round(78 * scaleFactor);

  // Approximate degree offsets at Thailand latitudes (~111,000m per deg lat, ~107,000m per deg lon)
  const halfLatDeg = heightMeters / 2 / 111000;
  const halfLonDeg = widthMeters / 2 / 107000;

  const scaleBarMeters = safeRai >= 40 ? 300 : safeRai >= 15 ? 200 : 100;

  return {
    areaSqm,
    widthMeters,
    heightMeters,
    svgRectWidth,
    svgRectHeight,
    scaleBarMeters,
    cornerCoords: [
      { label: 'NW', lat: Number((lat + halfLatDeg).toFixed(4)), lon: Number((lon - halfLonDeg).toFixed(4)) },
      { label: 'NE', lat: Number((lat + halfLatDeg).toFixed(4)), lon: Number((lon + halfLonDeg).toFixed(4)) },
      { label: 'SE', lat: Number((lat - halfLatDeg).toFixed(4)), lon: Number((lon + halfLonDeg).toFixed(4)) },
      { label: 'SW', lat: Number((lat - halfLatDeg).toFixed(4)), lon: Number((lon - halfLonDeg).toFixed(4)) },
    ],
  };
}
