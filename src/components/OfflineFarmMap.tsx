import React, { useMemo, useState } from 'react';
import { Check, Compass, Copy, Map as MapIcon, MapPin, WifiOff } from 'lucide-react';
import type { AppLanguage } from '../types/cropshield';
import { APP_COPY } from '../utils/i18n';
import {
  REGIONAL_REFERENCE_CITIES,
  THAILAND_SVG_VIEWBOX,
  buildThailandOutlineSvgPath,
  computeParcelGeometryFromRai,
  projectLatLonToThailandSvg,
} from '../utils/offlineMapGeometry';

interface OfflineFarmMapProps {
  lang: AppLanguage;
  plotTitle: string;
  lat: number;
  lon: number;
  areaRai: number;
  provinceLabel?: string;
}

type OfflineMapMode = 'parcel' | 'region';

export const OfflineFarmMap: React.FC<OfflineFarmMapProps> = ({
  lang,
  plotTitle,
  lat,
  lon,
  areaRai,
  provinceLabel,
}) => {
  const copy = APP_COPY[lang].offlineMap;
  const [mapMode, setMapMode] = useState<OfflineMapMode>('parcel');
  const [copied, setCopied] = useState(false);

  const thailandPath = useMemo(() => buildThailandOutlineSvgPath(), []);
  const regionPin = useMemo(() => projectLatLonToThailandSvg(lat, lon), [lat, lon]);
  const parcel = useMemo(
    () => computeParcelGeometryFromRai(lat, lon, areaRai),
    [lat, lon, areaRai]
  );

  const coordString = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  const handleCopyCoords = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(coordString);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  // Parcel view SVG canvas dimensions (320 x 176)
  const parcelCenterX = 160;
  const parcelCenterY = 88;
  const halfW = parcel.svgRectWidth / 2;
  const halfH = parcel.svgRectHeight / 2;

  return (
    <section
      data-testid="offline-farm-map"
      aria-label={copy.sectionTitle}
      className="border border-slate-200 rounded-2xl overflow-hidden bg-white"
    >
      {/* Map Header */}
      <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <MapIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.sectionTitle}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
              <WifiOff className="w-3 h-3 shrink-0" aria-hidden="true" />
              {copy.offlineBadge}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
            </span>
          </div>
        </div>

        {/* Interactive Mode Switcher: Plot Zoom vs Thailand Region */}
        <div
          className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-lg"
          role="group"
          aria-label="Offline map zoom mode"
        >
          <button
            type="button"
            data-testid="offline-map-tab-parcel"
            onClick={() => setMapMode('parcel')}
            className={`min-h-[34px] px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
              mapMode === 'parcel'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {copy.tabParcel}
          </button>
          <button
            type="button"
            data-testid="offline-map-tab-region"
            onClick={() => setMapMode('region')}
            className={`min-h-[34px] px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
              mapMode === 'region'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {copy.tabRegion}
          </button>
        </div>
      </div>

      {/* Offline Vector Map Canvas */}
      <div className="relative bg-[#EEF3EE]">
        {mapMode === 'parcel' ? (
          <svg
            viewBox="0 0 320 176"
            className="w-full h-44 block"
            role="img"
            aria-label={`${plotTitle} (${lat.toFixed(4)}, ${lon.toFixed(4)})`}
          >
            {/* Topographic Offline Survey Grid */}
            <defs>
              <pattern
                id="offlineSurveyGrid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="0.6"
                  strokeDasharray="2 2"
                />
              </pattern>
            </defs>
            <rect width="320" height="176" fill="#EEF3EE" />
            <rect width="320" height="176" fill="url(#offlineSurveyGrid)" />

            {/* Stylized Rural Access Road & Irrigation Canal */}
            <path
              d="M -10 148 Q 110 142 330 156"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="7"
            />
            <path
              d="M -10 148 Q 110 142 330 156"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeDasharray="6 4"
            />
            <path
              d="M 248 -10 Q 254 90 236 186"
              fill="none"
              stroke="#BAE6FD"
              strokeWidth="5"
            />

            {/* Coordinate Crosshair Axes through Plot Centroid */}
            <line
              x1={parcelCenterX}
              y1="8"
              x2={parcelCenterX}
              y2="168"
              stroke="#94A3B8"
              strokeWidth="0.7"
              strokeDasharray="3 3"
            />
            <line
              x1="12"
              y1={parcelCenterY}
              x2="308"
              y2={parcelCenterY}
              stroke="#94A3B8"
              strokeWidth="0.7"
              strokeDasharray="3 3"
            />

            {/* Registered Farm Parcel Polygon */}
            <rect
              x={parcelCenterX - halfW}
              y={parcelCenterY - halfH}
              width={parcel.svgRectWidth}
              height={parcel.svgRectHeight}
              rx="4"
              fill="#15803D"
              fillOpacity="0.18"
              stroke="#15803D"
              strokeWidth="2"
            />

            {/* Subtle Crop Row Lines inside Parcel */}
            {[-18, -6, 6, 18].map((offset) => (
              <line
                key={offset}
                x1={parcelCenterX - halfW + 8}
                y1={parcelCenterY + offset}
                x2={parcelCenterX + halfW - 8}
                y2={parcelCenterY + offset}
                stroke="#16A34A"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
            ))}

            {/* 4 Corner Survey Markers */}
            {[
              [parcelCenterX - halfW, parcelCenterY - halfH],
              [parcelCenterX + halfW, parcelCenterY - halfH],
              [parcelCenterX + halfW, parcelCenterY + halfH],
              [parcelCenterX - halfW, parcelCenterY + halfH],
            ].map(([cx, cy], idx) => (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r="3.2"
                fill="#FFFFFF"
                stroke="#15803D"
                strokeWidth="1.6"
              />
            ))}

            {/* Plot Centroid Pin */}
            <circle
              cx={parcelCenterX}
              cy={parcelCenterY}
              r="14"
              fill="#15803D"
              fillOpacity="0.18"
            />
            <circle
              cx={parcelCenterX}
              cy={parcelCenterY}
              r="5.5"
              fill="#DC2626"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Coordinate Readout Tag anchored at top-left of SVG */}
            <g transform="translate(10, 10)">
              <rect
                width="148"
                height="24"
                rx="6"
                fill="#FFFFFF"
                fillOpacity="0.92"
                stroke="#CBD5E1"
                strokeWidth="0.8"
              />
              <text
                x="8"
                y="15.5"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="700"
                fill="#0F172A"
              >
                {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
              </text>
            </g>

            {/* North Arrow (Top-Right) */}
            <g transform="translate(292, 22)">
              <circle r="12" fill="#FFFFFF" fillOpacity="0.9" stroke="#CBD5E1" strokeWidth="0.8" />
              <polygon points="0,-7 3.5,3 0,1 -3.5,3" fill="#0F172A" />
              <text
                x="0"
                y="9.5"
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="700"
                fill="#475569"
              >
                {copy.northLabel}
              </text>
            </g>

            {/* Scale Bar (Bottom-Right) */}
            <g transform="translate(226, 152)">
              <rect
                x="-6"
                y="-11"
                width="84"
                height="20"
                rx="4"
                fill="#FFFFFF"
                fillOpacity="0.88"
              />
              <path d="M 0 3 L 0 6 L 44 6 L 44 3" fill="none" stroke="#0F172A" strokeWidth="1.3" />
              <text
                x="49"
                y="6"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="600"
                fill="#0F172A"
              >
                {parcel.scaleBarMeters}m
              </text>
            </g>
          </svg>
        ) : (
          <div className="relative h-48 flex items-center justify-center bg-[#EAF2F8] px-3 py-2">
            <svg
              viewBox={`0 0 ${THAILAND_SVG_VIEWBOX.width} ${THAILAND_SVG_VIEWBOX.height}`}
              className="h-full w-auto max-w-full"
              role="img"
              aria-label={`Thailand coordinate overview ${lat.toFixed(4)}, ${lon.toFixed(4)}`}
            >
              {/* Lat/Lon Graticule Lines */}
              {[8, 12, 16, 20].map((latLine) => {
                const pt = projectLatLonToThailandSvg(latLine, 100);
                return (
                  <g key={latLine}>
                    <line
                      x1="10"
                      y1={pt.y}
                      x2={THAILAND_SVG_VIEWBOX.width - 10}
                      y2={pt.y}
                      stroke="#CBD5E1"
                      strokeWidth="0.6"
                      strokeDasharray="2 2"
                    />
                    <text
                      x="12"
                      y={pt.y - 2}
                      fontSize="7"
                      fontFamily="monospace"
                      fill="#64748B"
                    >
                      {latLine}°N
                    </text>
                  </g>
                );
              })}

              {/* Thailand Vector Silhouette */}
              <path
                d={thailandPath}
                fill="#DCFCE7"
                stroke="#15803D"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />

              {/* Regional Reference Cities */}
              {REGIONAL_REFERENCE_CITIES.map((city) => {
                const pt = projectLatLonToThailandSvg(city.lat, city.lon);
                return (
                  <g key={city.id} transform={`translate(${pt.x}, ${pt.y})`}>
                    <circle r="2" fill="#475569" />
                    <text
                      x="4"
                      y="2.5"
                      fontSize="7"
                      fill="#334155"
                      fontWeight="500"
                    >
                      {lang === 'th' ? city.labelTh : city.labelEn}
                    </text>
                  </g>
                );
              })}

              {/* Registered Farm Target Pin */}
              <g transform={`translate(${regionPin.x}, ${regionPin.y})`}>
                <circle r="11" fill="#DC2626" fillOpacity="0.18" />
                <circle r="4.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1.5" />
              </g>
            </svg>

            <div className="hidden sm:flex flex-col justify-center gap-1.5 pl-4 text-xs text-slate-700 max-w-[200px]">
              <div className="font-bold text-slate-900 line-clamp-2">{plotTitle}</div>
              {provinceLabel && <div className="text-slate-600">{provinceLabel}</div>}
              <div className="font-mono tabular-nums text-[11px] text-slate-600">
                {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Footer Metadata + Copy Coords Button */}
      <div className="px-3.5 py-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="text-[11px] text-slate-600 space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-slate-800">{copy.parcelDimensionsLabel}:</span>
            <span className="font-mono tabular-nums">
              ~{parcel.widthMeters}m × {parcel.heightMeters}m ({areaRai}{' '}
              {lang === 'th' ? 'ไร่' : 'Rai'})
            </span>
          </div>
          <p className="text-[11px] text-slate-500">{copy.siteVerifyHint}</p>
        </div>

        <button
          type="button"
          data-testid="copy-farm-coords-btn"
          onClick={() => void handleCopyCoords()}
          className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              <span className="text-emerald-800">{copy.copiedBtn}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{copy.copyCoordsBtn}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};
