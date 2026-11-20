import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileDown,
  Layers,
  MapPin,
  Satellite,
  Share2,
} from 'lucide-react';
import type {
  AppLanguage,
  BaacMapLayerMode,
  FarmerLoanRecord,
  ScenarioType,
} from '../types/cropshield';
import {
  buildBaacPortfolioMapShareText,
  exportBaacPortfolioMapPdf,
} from '../utils/baacPortfolioMapPdf';
import { getNasaGibsDateString } from '../utils/nasaPowerMap';
import {
  REGIONAL_REFERENCE_CITIES,
  THAILAND_SVG_VIEWBOX,
  buildThailandOutlineSvgPath,
  projectLatLonToThailandSvg,
} from '../utils/offlineMapGeometry';
import { BottomSheetModal } from './BottomSheetModal';

interface BaacPortfolioMapProps {
  lang: AppLanguage;
  farmers: FarmerLoanRecord[];
  selectedFarmerId: string;
  layerMode: BaacMapLayerMode;
  scenario?: ScenarioType;
  onChangeLayerMode: (mode: BaacMapLayerMode) => void;
  onSelectFarmerFromPin: (farmerId: string) => void;
}

const THAILAND_CENTER: [number, number] = [15.85, 101.25];

export const BaacPortfolioMap: React.FC<BaacPortfolioMapProps> = ({
  lang,
  farmers,
  selectedFarmerId,
  layerMode,
  scenario = 'normal',
  onChangeLayerMode,
  onSelectFarmerFromPin,
}) => {
  const isTh = lang === 'th';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [portfolioPdfModalOpen, setPortfolioPdfModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [customShareText, setCustomShareText] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const selectedFarmer =
    farmers.find((f) => f.id === selectedFarmerId) ?? farmers[0] ?? null;

  const thailandPath = useMemo(() => buildThailandOutlineSvgPath(), []);
  const normalCount = useMemo(
    () => farmers.filter((f) => f.riskLevel === 'low').length,
    [farmers]
  );
  const watchCount = useMemo(
    () => farmers.filter((f) => f.riskLevel === 'watch').length,
    [farmers]
  );
  const criticalCount = useMemo(
    () => farmers.filter((f) => f.riskLevel === 'critical').length,
    [farmers]
  );

  const defaultShareText = useMemo(
    () => buildBaacPortfolioMapShareText(farmers, layerMode, scenario, lang),
    [farmers, layerMode, scenario, lang]
  );
  const shareTextValue = customShareText ?? defaultShareText;
  const lineShareHref = `https://line.me/R/msg/text/?${encodeURIComponent(shareTextValue)}`;

  const handleOpenPortfolioModal = () => {
    setPdfNotice(null);
    setShareNotice(null);
    setShareOpen(false);
    setCustomShareText(null);
    setPortfolioPdfModalOpen(true);
  };

  const handleDownloadPortfolioPdf = async () => {
    setIsExportingPdf(true);
    setPdfNotice(null);
    try {
      const filename = await exportBaacPortfolioMapPdf(farmers, layerMode, scenario, lang);
      setPdfNotice(
        isTh
          ? `ดาวน์โหลด PDF แผนที่ดูไร่แล้ว (${filename})`
          : `Downloaded Portfolio Map PDF (${filename})`
      );
    } catch {
      setPdfNotice(
        isTh
          ? 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองอีกครั้ง'
          : 'Failed to generate Portfolio Map PDF.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyShareText = async () => {
    let copiedOk = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareTextValue);
        copiedOk = true;
      }
    } catch {
      // Fallback below
    }
    if (!copiedOk) {
      try {
        const el = document.createElement('textarea');
        el.value = shareTextValue;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        copiedOk = document.execCommand('copy');
        document.body.removeChild(el);
      } catch {
        copiedOk = false;
      }
    }
    setShareCopied(copiedOk);
    setShareNotice(
      copiedOk
        ? isTh
          ? 'คัดลอกสรุปแผนที่พอร์ตแล้ว พร้อมวางส่งใน LINE ได้ทันที'
          : 'Portfolio summary copied!'
        : isTh
          ? 'เตรียมข้อความพร้อมแชร์แล้ว กรุณาคัดลอกจากกล่องด้านบน'
          : 'Summary ready to copy from the text box above.'
    );
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Initialize Leaflet map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: THAILAND_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    tileLayerGroupRef.current = L.layerGroup().addTo(map);
    markerLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      tileLayerGroupRef.current = null;
      markerLayerGroupRef.current = null;
    };
  }, []);

  // Update base map + optional NASA GIBS soil/vegetation layer when layerMode changes
  useEffect(() => {
    const tileGroup = tileLayerGroupRef.current;
    if (!tileGroup) return;
    tileGroup.clearLayers();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 18,
      opacity: layerMode === 'soil-health' ? 0.82 : 0.92,
    }).addTo(tileGroup);

    if (layerMode === 'soil-health') {
      const gibsDate = getNasaGibsDateString();
      L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
        {
          maxZoom: 9,
          opacity: 0.42,
        }
      ).addTo(tileGroup);
    }
  }, [layerMode]);

  // Render interactive color-coded farmer pins
  useEffect(() => {
    const markerGroup = markerLayerGroupRef.current;
    const map = mapRef.current;
    if (!markerGroup || !map) return;

    markerGroup.clearLayers();

    for (const farmer of farmers) {
      const isSelected = farmer.id === selectedFarmerId;
      const isCritical = farmer.riskLevel === 'critical';
      const isWatch = farmer.riskLevel === 'watch';

      const pinBg = isCritical
        ? '#DC2626'
        : isWatch
          ? '#D97706'
          : '#059669';
      const ringColor = isSelected ? '#0F172A' : '#FFFFFF';
      const haloColor = isCritical
        ? 'rgba(220,38,38,0.28)'
        : isWatch
          ? 'rgba(217,119,6,0.28)'
          : 'rgba(5,150,105,0.22)';

      const badgeText =
        layerMode === 'soil-health'
          ? `${farmer.nasaHealthScore}`
          : isCritical
            ? isTh
              ? 'วิกฤต'
              : 'Crit'
            : isWatch
              ? isTh
                ? 'ระวัง'
                : 'Watch'
              : isTh
                ? 'ปกติ'
                : 'OK';

      const html = `
        <button
          type="button"
          data-testid="baac-map-pin-${farmer.id}"
          class="${isCritical ? 'baac-pin-pulse' : ''}"
          aria-label="${farmer.farmerName} (${farmer.province}) - NASA ${farmer.nasaHealthScore}/100"
          style="
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: ${layerMode === 'soil-health' ? '34px' : '46px'};
            height: 28px;
            padding: 0 7px;
            border-radius: 9999px;
            background: ${pinBg};
            color: #FFFFFF;
            font-weight: 800;
            font-size: 11px;
            line-height: 1;
            border: 2.5px solid ${ringColor};
            box-shadow: 0 0 0 ${isSelected ? '5px' : '3px'} ${haloColor}, 0 3px 8px rgba(15,23,42,0.25);
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.16)' : 'scale(1)'};
            transition: transform 150ms ease;
            white-space: nowrap;
          "
        >${badgeText}</button>
      `;

      const icon = L.divIcon({
        className: 'baac-custom-pin',
        html,
        iconSize: [layerMode === 'soil-health' ? 36 : 48, 28],
        iconAnchor: [layerMode === 'soil-health' ? 18 : 24, 14],
      });

      const marker = L.marker([farmer.lat, farmer.lon], {
        icon,
        zIndexOffset: isSelected ? 1000 : isCritical ? 400 : 100,
      });

      marker.on('click', () => {
        onSelectFarmerFromPin(farmer.id);
      });

      marker.bindTooltip(
        `<div style="font-size:12px;font-weight:700;color:#0F172A;">${farmer.farmerName}</div>
         <div style="font-size:11px;color:#475569;">${farmer.cropType} · ${farmer.province} · NASA ${farmer.nasaHealthScore}/100</div>`,
        { direction: 'top', offset: [0, -10] }
      );

      marker.addTo(markerGroup);
    }
  }, [farmers, isTh, layerMode, onSelectFarmerFromPin, selectedFarmerId]);

  return (
    <>
      <section
        data-testid="baac-portfolio-map-card"
        aria-label={isTh ? 'แผนที่พื้นที่แปลงเกษตรในพอร์ต' : 'BAAC Portfolio Map View'}
        className="bg-white border border-emerald-900/15 rounded-2xl overflow-hidden shadow-xs"
      >
        {/* Card Header + Layer Switcher + Direct Portfolio PDF Modal Button */}
        <div className="px-4 py-3 bg-emerald-50/55 border-b border-emerald-900/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                {isTh ? 'แผนที่ดูไร่ดูพื้นที่เกษตรกร' : 'Regional Farm Map View'}
              </h3>
              <p className="text-xs text-slate-600 truncate">
                {isTh
                  ? 'คลิกหมุดบนแผนที่เพื่อไฮไลต์เกษตรกรด้านล่าง'
                  : 'Click any plot pin to highlight farmer below'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* Layer Toggle: NASA Soil Health vs 7-Day Risk */}
            <div
              role="group"
              aria-label={isTh ? 'สลับเลเยอร์แผนที่' : 'Map layer toggle'}
              className="inline-flex items-center p-0.5 bg-white border border-emerald-900/15 rounded-xl"
            >
              <button
                type="button"
                data-testid="map-layer-soil"
                aria-pressed={layerMode === 'soil-health'}
                onClick={() => onChangeLayerMode('soil-health')}
                className={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  layerMode === 'soil-health'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-emerald-50'
                }`}
              >
                <Satellite className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{isTh ? 'สุขภาพดิน NASA' : 'NASA Soil'}</span>
              </button>
              <button
                type="button"
                data-testid="map-layer-risk7d"
                aria-pressed={layerMode === 'risk-7d'}
                onClick={() => onChangeLayerMode('risk-7d')}
                className={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  layerMode === 'risk-7d'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-emerald-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{isTh ? 'ความเสี่ยง 7 วัน' : '7-Day Risk'}</span>
              </button>
            </div>

            {/* Instant Pinned Portfolio Farm Map & PDF Modal Trigger */}
            <button
              type="button"
              data-testid="baac-portfolio-map-pdf-modal-btn"
              onClick={handleOpenPortfolioModal}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
              <span>{isTh ? 'PDF แผนที่ดูไร่' : 'Map PDF'}</span>
            </button>
          </div>
        </div>

        {/* Leaflet Interactive Map Canvas */}
        <div className="relative h-[220px] sm:h-[245px] bg-[#E8F1EC]">
          <div ref={containerRef} className="w-full h-full z-0" />

          {/* Layer Legend Pill Overlay */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] pointer-events-none flex flex-wrap items-center justify-between gap-2">
            <div className="pointer-events-auto inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-white/95 border border-slate-200 shadow-xs text-[11px] font-bold text-slate-800">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                {isTh ? 'ปกติ' : 'Normal'}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                {isTh ? 'เฝ้าระวัง 7 วัน' : '7D Watch'}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                {isTh ? 'วิกฤต' : 'Critical'}
              </span>
            </div>

            {selectedFarmer && (
              <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 text-white text-[11px] font-semibold shadow-xs max-w-[220px] truncate">
                <MapPin className="w-3 h-3 text-emerald-300 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {selectedFarmer.districtName ?? selectedFarmer.province} ·{' '}
                  {selectedFarmer.nasaHealthScore}/100
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pinned Zero-Scroll Portfolio Farm Map + PDF Modal (stays pinned until clicking Close or X) */}
      <BottomSheetModal
        isOpen={portfolioPdfModalOpen}
        onClose={() => setPortfolioPdfModalOpen(false)}
        pinned
        compactBody
        maxWidthClass="sm:max-w-5xl"
        title={
          isTh
            ? 'แผนที่ดูไร่ดูพื้นที่เกษตรกรในพอร์ต & ดาวน์โหลด PDF'
            : 'BAAC Regional Farm Map & PDF Report'
        }
        subtitle={
          isTh
            ? `ทั้งหมด ${farmers.length} แปลง (${farmers.reduce((s, f) => s + f.areaRai, 0)} ไร่) · แตะหมุดเพื่อเลือกดูแปลง`
            : `${farmers.length} plots in portfolio`
        }
        icon={<MapPin className="w-5 h-5" aria-hidden="true" />}
        closeLabel={isTh ? 'ปิดหน้าต่าง' : 'Close'}
      >
        <div
          data-testid="baac-portfolio-pdf-modal"
          className="border border-slate-200 rounded-2xl overflow-hidden bg-white lg:grid lg:grid-cols-12"
        >
          {/* Left Column (6 cols): Interactive Thailand Portfolio Map Preview */}
          <div className="lg:col-span-6 bg-[#EAF2F8] p-3 flex flex-col justify-between gap-2 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-900">
                {isTh
                  ? 'ตำแหน่งแปลงเกษตรกรทั่วประเทศ (คลิกหมุดได้)'
                  : 'Regional Plot Pins (Click to highlight)'}
              </span>
              <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => onChangeLayerMode('soil-health')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md ${
                    layerMode === 'soil-health'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  {isTh ? 'คะแนน NASA' : 'NASA Score'}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLayerMode('risk-7d')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md ${
                    layerMode === 'risk-7d'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  {isTh ? 'เสี่ยง 7 วัน' : '7D Risk'}
                </button>
              </div>
            </div>

            <div className="relative h-[260px] sm:h-[340px] flex items-center justify-center bg-white/60 rounded-xl border border-slate-200/80 p-2">
              <svg
                viewBox={`0 0 ${THAILAND_SVG_VIEWBOX.width} ${THAILAND_SVG_VIEWBOX.height}`}
                className="h-full w-auto max-w-full"
                role="img"
                aria-label={isTh ? 'แผนที่ดูไร่ดูพื้นที่เกษตรกรในพอร์ต ธ.ก.ส.' : 'BAAC Farm Portfolio Map'}
              >
                <path
                  d={thailandPath}
                  fill="#DCFCE7"
                  stroke="#15803D"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />

                {REGIONAL_REFERENCE_CITIES.map((city) => {
                  const pt = projectLatLonToThailandSvg(city.lat, city.lon);
                  return (
                    <g key={city.id} transform={`translate(${pt.x}, ${pt.y})`}>
                      <circle r="1.5" fill="#64748B" />
                      <text x="3.5" y="2" fontSize="6" fill="#475569">
                        {isTh ? city.labelTh : city.labelEn}
                      </text>
                    </g>
                  );
                })}

                {farmers.map((f) => {
                  const pt = projectLatLonToThailandSvg(f.lat, f.lon);
                  const isSel = f.id === selectedFarmerId;
                  const fill =
                    f.riskLevel === 'critical'
                      ? '#DC2626'
                      : f.riskLevel === 'watch'
                        ? '#D97706'
                        : '#059669';
                  return (
                    <g
                      key={f.id}
                      transform={`translate(${pt.x}, ${pt.y})`}
                      onClick={() => onSelectFarmerFromPin(f.id)}
                      className="cursor-pointer"
                    >
                      {isSel && (
                        <circle r="10.5" fill={fill} fillOpacity="0.22" stroke="#0F172A" strokeWidth="1" />
                      )}
                      <circle
                        r={isSel ? '6.2' : '4.8'}
                        fill={fill}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      <text
                        x="7"
                        y="2"
                        fontSize="6.5"
                        fontWeight={isSel ? '700' : '600'}
                        fill="#0F172A"
                      >
                        {f.province} ({f.nasaHealthScore})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                {isTh ? `ปกติ (${normalCount})` : `Normal (${normalCount})`}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                {isTh ? `เฝ้าระวัง (${watchCount})` : `Watch (${watchCount})`}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                {isTh ? `วิกฤต (${criticalCount})` : `Critical (${criticalCount})`}
              </span>
            </div>
          </div>

          {/* Right Column (6 cols): Plot Summary Table + Instant Download PDF & Share */}
          <div className="lg:col-span-6 p-3.5 bg-slate-50/85 flex flex-col justify-between gap-3">
            <div className="space-y-2.5">
              {/* Portfolio KPI Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {isTh ? 'จำนวนแปลง' : 'Total Plots'}
                  </div>
                  <div className="text-lg font-extrabold font-mono text-slate-900">
                    {farmers.length} {isTh ? 'แปลง' : ''}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-emerald-800">
                    {isTh ? 'ปกติ' : 'Normal'}
                  </div>
                  <div className="text-lg font-extrabold font-mono text-emerald-700">
                    {normalCount}
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-red-800">
                    {isTh ? 'เฝ้าระวัง/วิกฤต' : 'Alert'}
                  </div>
                  <div className="text-lg font-extrabold font-mono text-red-700">
                    {watchCount + criticalCount}
                  </div>
                </div>
              </div>

              {shareOpen ? (
                <div
                  data-testid="baac-portfolio-share-box"
                  className="bg-white border-2 border-sky-200 rounded-xl p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="baac-portfolio-share-textarea"
                      className="text-xs font-extrabold text-slate-900"
                    >
                      {isTh ? 'ข้อความสรุปแผนที่พอร์ต ธ.ก.ส.' : 'BAAC Portfolio Map Summary'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShareOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg bg-slate-100"
                    >
                      <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                      <span>{isTh ? 'ดูตารางแปลง' : 'Back'}</span>
                    </button>
                  </div>
                  <textarea
                    id="baac-portfolio-share-textarea"
                    data-testid="baac-portfolio-share-textarea"
                    rows={6}
                    value={shareTextValue}
                    onChange={(e) => setCustomShareText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-medium text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                  {shareNotice && (
                    <div
                      role="status"
                      className="rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-[11px] font-bold text-sky-900"
                    >
                      {shareNotice}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyShareText()}
                      className="min-h-[38px] flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl"
                    >
                      {shareCopied ? (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{shareCopied ? (isTh ? 'คัดลอกแล้ว' : 'Copied') : (isTh ? 'คัดลอกข้อความ' : 'Copy')}</span>
                    </button>
                    <a
                      href={lineShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-emerald-950 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-xl"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isTh ? 'ส่งเข้า LINE' : 'LINE'}</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* Compact Farmer Plot Coordinates Table (fits 6 plots cleanly without scroll!) */
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {farmers.slice(0, 6).map((f) => {
                    const isSel = f.id === selectedFarmerId;
                    const badgeClass =
                      f.riskLevel === 'critical'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : f.riskLevel === 'watch'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    const badgeText =
                      f.riskLevel === 'critical'
                        ? isTh
                          ? 'วิกฤต'
                          : 'Critical'
                        : f.riskLevel === 'watch'
                          ? isTh
                            ? 'เฝ้าระวัง'
                            : 'Watch'
                          : isTh
                            ? 'ปกติ'
                            : 'Normal';

                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onSelectFarmerFromPin(f.id)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                          isSel ? 'bg-emerald-50/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {f.farmerName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            จ.{f.province} · {f.areaRai} {isTh ? 'ไร่' : 'Rai'} ·{' '}
                            <span className="font-mono">
                              {f.lat.toFixed(2)}°N, {f.lon.toFixed(2)}°E
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-extrabold font-mono text-slate-900">
                            {f.nasaHealthScore}/100
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}
                          >
                            {badgeText}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons: Download Portfolio Map PDF + Share + Confirmation */}
            <div className="space-y-2 pt-1 border-t border-slate-200/80">
              {pdfNotice && (
                <div
                  data-testid="baac-portfolio-map-pdf-confirmation"
                  role="status"
                  className="rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-900 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{pdfNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="baac-download-portfolio-map-pdf-btn"
                  onClick={() => void handleDownloadPortfolioPdf()}
                  disabled={isExportingPdf}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-xl transition-colors"
                >
                  <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {isExportingPdf
                      ? isTh
                        ? 'กำลังสร้าง PDF...'
                        : 'Building PDF...'
                      : isTh
                        ? 'ดาวน์โหลด PDF แผนที่ดูไร่'
                        : 'Download Farm Map PDF'}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="baac-share-portfolio-map-btn"
                  onClick={() => setShareOpen((prev) => !prev)}
                  className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-extrabold rounded-xl border transition-colors ${
                    shareOpen
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{isTh ? 'แชร์แผนที่พอร์ต' : 'Share Map Summary'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </BottomSheetModal>
    </>
  );
};
