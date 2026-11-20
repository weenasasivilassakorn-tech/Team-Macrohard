import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileDown,
  Layers,
  MapPin,
  Maximize2,
  Mountain,
  Radio,
  RefreshCw,
  Satellite,
  Share2,
} from 'lucide-react';
import type { AppLanguage, NasaWeatherTelemetry, PlotEvaluation } from '../types/cropshield';
import { APP_COPY } from '../utils/i18n';
import { fetchLiveNasaPowerTelemetry } from '../utils/nasaPower';
import {
  NASA_MAP_LAYERS,
  type NasaMapLayerId,
  buildNasaGibsTileUrl,
  buildNasaPowerSurroundingGrid,
  buildNasaPowerViewerUrl,
  computeNasaPowerGridCell,
  getNasaGibsDateString,
} from '../utils/nasaPowerMap';
import { exportNasaPowerMapPdf } from '../utils/nasaPowerMapPdfExporter';
import { buildNasaMapShareText, type NasaMapReportInput } from '../utils/nasaPowerMapReport';
import { computeParcelGeometryFromRai } from '../utils/offlineMapGeometry';
import { OfflineFarmMap } from './OfflineFarmMap';

interface NasaPowerMapPanelProps {
  lang: AppLanguage;
  plotTitle: string;
  lat: number;
  lon: number;
  areaRai: number;
  provinceLabel?: string;
  evaluation?: PlotEvaluation;
  healthScore?: number;
  riskSummaryText?: string;
  isUpdating?: boolean;
  onSyncNasa?: () => void;
}

type MapZoomPreset = 'parcel' | 'grid';

interface LiveNasaFetchState {
  cellId: string;
  telemetry: NasaWeatherTelemetry;
  source: 'nasa-live' | 'fallback';
  fetchedAtLabel: string;
}

export const NasaPowerMapPanel: React.FC<NasaPowerMapPanelProps> = ({
  lang,
  plotTitle,
  lat,
  lon,
  areaRai,
  provinceLabel,
  evaluation,
  healthScore,
  riskSummaryText,
  isUpdating = false,
  onSyncNasa,
}) => {
  const isTh = lang === 'th';
  const copy = APP_COPY[lang].offlineMap;

  const [activeLayer, setActiveLayer] = useState<NasaMapLayerId>('power-hybrid');
  const [zoomPreset, setZoomPreset] = useState<MapZoomPreset>('grid');
  const [copied, setCopied] = useState(false);

  // Live NASA POWER point connection state
  const [liveNasaState, setLiveNasaState] = useState<LiveNasaFetchState | null>(null);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [liveSyncNonce, setLiveSyncNonce] = useState(0);

  // Tile health tracking for Leaflet canvas
  const [tilesLoadedCount, setTilesLoadedCount] = useState(0);
  const [tileErrorCount, setTileErrorCount] = useState(0);

  // Integrated PDF Download & Share states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [customShareText, setCustomShareText] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const primaryCell = useMemo(() => computeNasaPowerGridCell(lat, lon, true), [lat, lon]);
  const gridCells = useMemo(() => buildNasaPowerSurroundingGrid(lat, lon), [lat, lon]);
  const parcel = useMemo(
    () => computeParcelGeometryFromRai(lat, lon, areaRai),
    [lat, lon, areaRai]
  );
  const gibsDate = useMemo(() => getNasaGibsDateString(), []);
  const nasaViewerUrl = useMemo(() => buildNasaPowerViewerUrl(lat, lon), [lat, lon]);
  const activeLayerMeta = useMemo(
    () => NASA_MAP_LAYERS.find((l) => l.id === activeLayer) ?? NASA_MAP_LAYERS[0],
    [activeLayer]
  );

  const [selectedCellId, setSelectedCellId] = useState<string>(primaryCell.id);
  const selectedCell = useMemo(
    () => gridCells.find((c) => c.id === selectedCellId) ?? primaryCell,
    [gridCells, selectedCellId, primaryCell]
  );

  useEffect(() => {
    setSelectedCellId(primaryCell.id);
    setCustomShareText(null);
    setPdfNotice(null);
    setShareNotice(null);
    setShareOpen(false);
  }, [primaryCell.id, lat, lon, plotTitle]);

  // Automatically fetch live NASA POWER point data when panel opens, grid cell changes, or sync is clicked
  useEffect(() => {
    let active = true;
    setIsFetchingLive(true);

    fetchLiveNasaPowerTelemetry(selectedCell.centerLat, selectedCell.centerLon)
      .then((res) => {
        if (!active) return;
        setLiveNasaState({
          cellId: selectedCell.id,
          telemetry: res.telemetry,
          source: res.source,
          fetchedAtLabel: res.fetchedAtLabel,
        });
      })
      .finally(() => {
        if (active) setIsFetchingLive(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCell.id, selectedCell.centerLat, selectedCell.centerLon, liveSyncNonce]);

  const activeTelemetry =
    liveNasaState && liveNasaState.cellId === selectedCell.id
      ? liveNasaState.telemetry
      : evaluation?.nasaWeatherTelemetry;

  const displayTempC =
    activeTelemetry?.observedAvgTempC ??
    (evaluation?.forecast.length
      ? Number(
          (
            evaluation.forecast.reduce((sum, d) => sum + d.tempMaxC, 0) /
            evaluation.forecast.length
          ).toFixed(1)
        )
      : 32.2);

  const displayMoisturePct =
    activeTelemetry?.observedSoilWetnessPercent ??
    (evaluation?.forecast[0]?.soilMoistureIndex ?? 62);

  const displayPrecipMm = activeTelemetry?.observedTotalPrecipMm;
  const displayRainPct = evaluation?.forecast.length
    ? Math.max(...evaluation.forecast.map((d) => d.rainChancePercent))
    : 35;

  const displayPrecipLabel =
    displayPrecipMm !== undefined ? `${displayPrecipMm} mm` : `${displayRainPct}% prob`;

  const displayRhPct = activeTelemetry?.observedAvgHumidityPercent ?? 67;
  const displayElevationM = activeTelemetry?.elevationMeters;
  const recentObservations = (activeTelemetry?.observations ?? []).slice(-5);

  const resolvedHealthScore = healthScore ?? evaluation?.healthScore;
  const coordString = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  const connectionStatusLabel = isFetchingLive
    ? isTh
      ? 'กำลังเชื่อมต่อจุดพิกัด NASA POWER...'
      : 'Connecting to NASA POWER API...'
    : liveNasaState?.source === 'nasa-live'
      ? isTh
        ? `เชื่อมต่อ NASA POWER สดแล้ว · ${liveNasaState.fetchedAtLabel} น.`
        : `NASA POWER Live Connected · ${liveNasaState.fetchedAtLabel}`
      : isTh
        ? 'พร้อมใช้งาน (โหมดข้อมูลพิกัดสำรอง)'
        : 'Ready (Coordinate Fallback Data)';

  const reportInput: NasaMapReportInput = useMemo(
    () => ({
      lang,
      plotTitle,
      lat,
      lon,
      areaRai,
      provinceLabel,
      activeLayer,
      selectedCell,
      telemetry: activeTelemetry,
      soilMoisturePercent: displayMoisturePct,
      tempC: displayTempC,
      precipLabel: displayPrecipLabel,
      humidityPercent: displayRhPct,
      elevationMeters: displayElevationM,
      healthScore: resolvedHealthScore,
      riskSummaryText,
      dataSourceLabel: activeTelemetry?.sourceTag,
    }),
    [
      lang,
      plotTitle,
      lat,
      lon,
      areaRai,
      provinceLabel,
      activeLayer,
      selectedCell,
      activeTelemetry,
      displayMoisturePct,
      displayTempC,
      displayPrecipLabel,
      displayRhPct,
      displayElevationM,
      resolvedHealthScore,
      riskSummaryText,
    ]
  );

  const defaultShareText = useMemo(() => buildNasaMapShareText(reportInput), [reportInput]);
  const shareTextValue = customShareText ?? defaultShareText;
  const lineShareHref = `https://line.me/R/msg/text/?${encodeURIComponent(shareTextValue)}`;

  const handleTriggerSync = () => {
    setLiveSyncNonce((n) => n + 1);
    onSyncNasa?.();
  };

  const copyTextSafely = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyCoords = async () => {
    await copyTextSafely(coordString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadMapPdf = async () => {
    setIsExportingPdf(true);
    setPdfNotice(null);
    try {
      const filename = await exportNasaPowerMapPdf(reportInput);
      setPdfNotice(
        isTh
          ? `ดาวน์โหลด PDF แผนที่แล้ว (${filename})`
          : `Downloaded map PDF (${filename})`
      );
    } catch {
      setPdfNotice(
        isTh
          ? 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองอีกครั้ง'
          : 'Failed to generate map PDF. Please retry.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyShareSummary = async () => {
    const ok = await copyTextSafely(shareTextValue);
    if (ok) {
      setShareCopied(true);
      setShareNotice(
        isTh
          ? 'คัดลอกสรุปแผนที่และพิกัดแล้ว พร้อมวางส่งใน LINE ได้ทันที'
          : 'Map summary copied! Ready to paste into LINE or messaging apps.'
      );
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      setShareNotice(
        isTh
          ? 'เตรียมข้อความพร้อมแชร์แล้ว กรุณาคัดลอกจากกล่องด้านบน'
          : 'Summary ready to copy from the box above.'
      );
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: `CropShield NASA POWER — ${plotTitle}`,
        text: shareTextValue,
      });
      setShareNotice(isTh ? 'ส่งต่อข้อมูลแผนที่เรียบร้อย' : 'Map summary shared.');
    } catch {
      // User dismissed native share sheet
    }
  };

  const isVectorMode = activeLayer === 'offline-vector';

  // Initialize Leaflet map once when interactive raster map is visible, and track container resizes
  useEffect(() => {
    if (isVectorMode) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerGroupRef.current = null;
        vectorLayerGroupRef.current = null;
      }
      return;
    }

    const container = mapContainerRef.current;
    if (!container) return;

    if (!mapInstanceRef.current) {
      const initialZoom = zoomPreset === 'parcel' ? 15 : 9;
      const map = L.map(container, {
        center: [lat, lon],
        zoom: initialZoom,
        minZoom: 5,
        maxZoom: 17,
        zoomControl: true,
        attributionControl: false,
      });

      tileLayerGroupRef.current = L.layerGroup().addTo(map);
      vectorLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    }

    const map = mapInstanceRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map?.invalidateSize({ animate: false });
      });
      resizeObserver.observe(container);
    }

    const fallbackTimer = setTimeout(() => {
      map?.invalidateSize({ animate: false });
    }, 180);

    return () => {
      clearTimeout(fallbackTimer);
      resizeObserver?.disconnect();
    };
  }, [isVectorMode]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerGroupRef.current = null;
        vectorLayerGroupRef.current = null;
      }
    };
  }, []);

  // Update tile layers whenever activeLayer, gibsDate, or zoomPreset changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const tileGroup = tileLayerGroupRef.current;
    if (!map || !tileGroup || isVectorMode) return;

    tileGroup.clearLayers();
    setTilesLoadedCount(0);
    setTileErrorCount(0);

    const attachTileEvents = (layer: L.TileLayer) => {
      layer.on('tileload', () => {
        setTilesLoadedCount((c) => c + 1);
      });
      layer.on('tileerror', () => {
        setTileErrorCount((c) => c + 1);
      });
      return layer;
    };

    const osmBase = attachTileEvents(
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 17,
        opacity: activeLayer === 'nasa-modis-truecolor' ? 0.28 : 1,
      })
    );
    osmBase.addTo(tileGroup);

    if (activeLayer === 'nasa-modis-truecolor') {
      const modisLayer = attachTileEvents(
        L.tileLayer(buildNasaGibsTileUrl('MODIS_Terra_CorrectedReflectance_TrueColor', gibsDate), {
          maxNativeZoom: 9,
          maxZoom: 11,
          opacity: 0.94,
        })
      );
      modisLayer.addTo(tileGroup);

      const esriSatellite = attachTileEvents(
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            minZoom: 10,
            maxNativeZoom: 17,
            maxZoom: 17,
            opacity: 0.95,
          }
        )
      );
      esriSatellite.addTo(tileGroup);
    } else if (activeLayer === 'nasa-ndvi') {
      const ndviLayer = attachTileEvents(
        L.tileLayer(buildNasaGibsTileUrl('MODIS_Terra_NDVI_8Day', gibsDate), {
          maxNativeZoom: 9,
          maxZoom: 17,
          opacity: 0.72,
        })
      );
      ndviLayer.addTo(tileGroup);
    } else if (activeLayer === 'nasa-precip') {
      const imergLayer = attachTileEvents(
        L.tileLayer(buildNasaGibsTileUrl('IMERG_Precipitation_Rate', gibsDate), {
          maxNativeZoom: 6,
          maxZoom: 17,
          opacity: 0.72,
        })
      );
      imergLayer.addTo(tileGroup);
    }
  }, [activeLayer, gibsDate, isVectorMode, zoomPreset]);

  // Update NASA POWER 0.5x0.625 grid cells, farm parcel polygon & target marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    const vectorGroup = vectorLayerGroupRef.current;
    if (!map || !vectorGroup || isVectorMode) return;

    vectorGroup.clearLayers();

    gridCells.forEach((cell) => {
      const isSelected = cell.id === selectedCell.id;
      const bounds: L.LatLngBoundsExpression = [
        [cell.southLat, cell.westLon],
        [cell.northLat, cell.eastLon],
      ];

      const rect = L.rectangle(bounds, {
        color: cell.isPrimary ? '#047857' : isSelected ? '#0284C7' : '#475569',
        weight: cell.isPrimary ? 2.4 : isSelected ? 2 : 1,
        dashArray: cell.isPrimary ? undefined : '4 4',
        fillColor: cell.isPrimary ? '#10B981' : isSelected ? '#0EA5E9' : '#94A3B8',
        fillOpacity: cell.isPrimary ? 0.11 : isSelected ? 0.14 : 0.03,
      });

      rect.on('click', () => {
        setSelectedCellId(cell.id);
      });

      rect.bindTooltip(
        `${cell.isPrimary ? 'Active ' : ''}NASA POWER MERRA-2 (${cell.centerLat.toFixed(2)}°N, ${cell.centerLon.toFixed(3)}°E)`,
        { sticky: true, direction: 'top' }
      );

      rect.addTo(vectorGroup);
    });

    const parcelCoords: L.LatLngExpression[] = parcel.cornerCoords.map((c) => [c.lat, c.lon]);
    const parcelPoly = L.polygon(parcelCoords, {
      color: '#15803D',
      weight: 2.5,
      fillColor: '#22C55E',
      fillOpacity: 0.34,
    });
    parcelPoly.addTo(vectorGroup);

    const pinIcon = L.divIcon({
      className: 'cropshield-nasa-pin',
      html: `<div style="width:18px;height:18px;border-radius:9999px;background:#DC2626;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,23,42,0.45);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const marker = L.marker([lat, lon], { icon: pinIcon });
    marker.bindPopup(
      `<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.4;">
        <strong>${plotTitle}</strong><br/>
        <span>${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E · ${areaRai} ${isTh ? 'ไร่' : 'Rai'}</span><br/>
        <span style="color:#047857;font-weight:600;">MERRA-2: ${primaryCell.centerLat.toFixed(2)}°N, ${primaryCell.centerLon.toFixed(3)}°E</span>
      </div>`
    );
    marker.addTo(vectorGroup);
  }, [
    isVectorMode,
    gridCells,
    selectedCell.id,
    parcel,
    lat,
    lon,
    plotTitle,
    areaRai,
    isTh,
    primaryCell,
  ]);

  // Smoothly pan/zoom when plot coordinates or zoomPreset change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isVectorMode) return;

    if (zoomPreset === 'parcel') {
      map.setView([lat, lon], 15, { animate: true });
    } else {
      const targetZoom = activeLayer === 'nasa-precip' ? 7 : 9;
      map.setView([lat, lon], targetZoom, { animate: true });
    }
  }, [lat, lon, zoomPreset, activeLayer, isVectorMode]);

  const handleSelectLayer = (layerId: NasaMapLayerId) => {
    setActiveLayer(layerId);
    if (layerId === 'nasa-precip' || layerId === 'nasa-ndvi') {
      setZoomPreset('grid');
    }
  };

  const showTileFallbackBanner = tileErrorCount > 3 && tilesLoadedCount === 0;

  return (
    <section
      data-testid="nasa-power-map-panel"
      aria-label={isTh ? 'แผนที่ดาวเทียม NASA POWER' : 'NASA POWER Satellite Map'}
      className="border border-slate-200 rounded-2xl overflow-hidden bg-white lg:grid lg:grid-cols-12"
    >
      {/* LEFT COLUMN (7 cols): Map Toolbar + Interactive Satellite/Grid Map */}
      <div className="lg:col-span-7 flex flex-col min-w-0">
        {/* Header & Layer Toolbar */}
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                {isVectorMode ? (
                  <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                ) : (
                  <Satellite className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">
                  {isTh
                    ? 'แผนที่ดาวเทียม NASA POWER & กริด MERRA-2'
                    : 'NASA POWER Map & MERRA-2 Grid'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                <span className="text-emerald-800 font-semibold">
                  {activeLayerMeta.nasaProductCode}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                </span>
                {displayElevationM !== undefined && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Mountain className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      {displayElevationM}m
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isVectorMode && (
                <div
                  className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-lg"
                  role="group"
                  aria-label="Map zoom preset"
                >
                  <button
                    type="button"
                    data-testid="nasa-map-zoom-grid"
                    onClick={() => setZoomPreset('grid')}
                    className={`min-h-[28px] px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                      zoomPreset === 'grid'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isTh ? 'กริด NASA' : 'NASA Grid'}
                  </button>
                  <button
                    type="button"
                    data-testid="nasa-map-zoom-parcel"
                    onClick={() => setZoomPreset('parcel')}
                    className={`min-h-[28px] px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                      zoomPreset === 'parcel'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" aria-hidden="true" />
                      {isTh ? 'ขอบเขตแปลง' : 'Plot Zoom'}
                    </span>
                  </button>
                </div>
              )}

              <a
                href={nasaViewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="open-nasa-power-viewer-link"
                className="min-h-[30px] inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
              >
                <span>NASA POWER</span>
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* NASA Layer Switcher */}
          <div className="flex flex-wrap items-center gap-1">
            {NASA_MAP_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                data-testid={`nasa-map-layer-${layer.id}`}
                onClick={() => handleSelectLayer(layer.id)}
                className={`min-h-[28px] px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  activeLayer === layer.id
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isTh ? layer.labelTh : layer.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Inline Fallback Notice if map tiles cannot load on offline networks */}
        {!isVectorMode && showTileFallbackBanner && (
          <div
            data-testid="nasa-map-tile-fallback-banner"
            className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900"
          >
            <div className="inline-flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>
                {isTh
                  ? 'ไม่สามารถโหลดแผนที่ฐานออนไลน์ได้ในขณะนี้'
                  : 'Online map tiles are currently unreachable.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveLayer('offline-vector')}
              className="px-2.5 py-1 rounded-lg bg-amber-700 text-white font-bold hover:bg-amber-800 transition-colors"
            >
              {isTh ? 'สลับเป็นแผนที่เวกเตอร์ออฟไลน์' : 'Switch to Vector Map'}
            </button>
          </div>
        )}

        {/* Map Canvas */}
        {isVectorMode ? (
          <div className="p-3 bg-white flex-1">
            <OfflineFarmMap
              lang={lang}
              plotTitle={plotTitle}
              lat={lat}
              lon={lon}
              areaRai={areaRai}
              provinceLabel={provinceLabel}
            />
          </div>
        ) : (
          <div className="relative z-0 isolate bg-emerald-50/40 flex-1 min-h-[240px] sm:min-h-[290px] lg:min-h-[325px]">
            <div
              ref={mapContainerRef}
              data-testid="nasa-leaflet-map-canvas"
              className="w-full h-[240px] sm:h-[290px] lg:h-[325px]"
            />

            {/* Compact Top-Right NASA Grid Cell Badge */}
            <div className="pointer-events-none absolute top-2.5 right-2.5 z-[450] bg-white/95 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] shadow-xs max-w-[215px]">
              <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
                <span>
                  {selectedCell.isPrimary
                    ? isTh
                      ? 'กริดหลักแปลง (MERRA-2)'
                      : 'Active MERRA-2 Cell'
                    : isTh
                      ? 'กริดข้างเคียง (MERRA-2)'
                      : 'Adjacent MERRA-2 Cell'}
                </span>
                <span className="font-mono text-emerald-700">0.5°×0.625°</span>
              </div>
              <div className="font-mono tabular-nums text-slate-600 mt-0.5">
                {selectedCell.southLat.toFixed(2)}°–{selectedCell.northLat.toFixed(2)}°N,{' '}
                {selectedCell.westLon.toFixed(2)}°–{selectedCell.eastLon.toFixed(2)}°E
              </div>
              <div className="text-slate-500 mt-0.5">
                ~{selectedCell.heightKm} × {selectedCell.widthKm} {isTh ? 'กม.' : 'km'} ·{' '}
                {isTh ? 'คลิกช่องกริดเพื่อดึงค่า' : 'Click any cell'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN (5 cols): Live NASA POWER Telemetry + Instant PDF & Share Controls (Zero Scroll!) */}
      <div className="lg:col-span-5 flex flex-col justify-between gap-2.5 p-3.5 bg-slate-50/85 border-t lg:border-t-0 lg:border-l border-slate-200/80">
        <div className="space-y-2.5">
          {/* Live NASA POWER Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div
              data-testid="nasa-power-live-status"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1"
            >
              <Radio
                className={`w-3.5 h-3.5 shrink-0 ${
                  isFetchingLive ? 'animate-pulse text-amber-600' : 'text-emerald-700'
                }`}
                aria-hidden="true"
              />
              <span>{connectionStatusLabel}</span>
            </div>

            <span className="text-[10px] font-mono text-slate-500">
              {selectedCell.centerLat.toFixed(2)}°N, {selectedCell.centerLon.toFixed(3)}°E
            </span>
          </div>

          {shareOpen ? (
            /* In-place Share Panel (never overflows vertically!) */
            <div
              data-testid="nasa-map-share-box"
              className="bg-white border-2 border-sky-200 rounded-xl p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="nasa-map-share-textarea"
                  className="text-xs font-extrabold text-slate-900"
                >
                  {isTh ? 'ข้อความแชร์พิกัด + NASA POWER' : 'NASA POWER Share Summary'}
                </label>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg bg-slate-100"
                >
                  <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                  <span>{isTh ? 'ดูค่าพิกัด' : 'Back'}</span>
                </button>
              </div>

              <textarea
                id="nasa-map-share-textarea"
                data-testid="nasa-map-share-textarea"
                rows={7}
                value={shareTextValue}
                onChange={(e) => setCustomShareText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-medium text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />

              {shareNotice && (
                <div
                  data-testid="nasa-map-share-confirmation"
                  role="status"
                  className="rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-[11px] font-bold text-sky-900 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{shareNotice}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  data-testid="nasa-map-copy-share-btn"
                  onClick={() => void handleCopyShareSummary()}
                  className="min-h-[38px] flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors"
                >
                  {shareCopied ? (
                    <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {shareCopied
                      ? isTh
                        ? 'คัดลอกแล้ว'
                        : 'Copied!'
                      : isTh
                        ? 'คัดลอกข้อความ'
                        : 'Copy'}
                  </span>
                </button>

                <a
                  data-testid="nasa-map-share-line-link"
                  href={lineShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[38px] flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-extrabold text-emerald-950 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{isTh ? 'ส่งเข้า LINE' : 'LINE'}</span>
                </a>

                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    data-testid="nasa-map-native-share-btn"
                    onClick={() => void handleNativeShare()}
                    className="min-h-[38px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 4 Key NASA POWER Metrics (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    GWETTOP ({isTh ? 'ความชื้นดิน' : 'Soil'})
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-emerald-700 mt-0.5">
                    {displayMoisturePct}%
                  </div>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    T2M ({isTh ? 'อุณหภูมิ' : 'Temp'})
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                    {displayTempC}°C
                  </div>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    PRECTOTCORR ({isTh ? 'ฝน' : 'Rain'})
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-sky-700 mt-0.5">
                    {displayPrecipLabel}
                  </div>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    RH2M ({isTh ? 'ความชื้น' : 'Humid'})
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                    {displayRhPct}%
                  </div>
                </div>
              </div>

              {/* Observed Daily NASA POWER Strip */}
              {recentObservations.length > 0 && (
                <div
                  data-testid="nasa-power-daily-strip"
                  className="bg-white border border-slate-200/90 rounded-xl p-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                    <span>
                      {isTh
                        ? 'ค่าตรวจวัดรายวัน NASA POWER'
                        : 'Daily NASA POWER Observations'}
                    </span>
                    {displayElevationM !== undefined && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-slate-500">
                        <Mountain className="w-3 h-3" aria-hidden="true" />
                        {displayElevationM}m
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {recentObservations.map((obs) => (
                      <div
                        key={obs.dateKey}
                        className="rounded-lg bg-slate-50 border border-slate-200/70 px-1 py-1 text-center"
                      >
                        <div className="text-[9px] font-bold font-mono text-slate-500">
                          {obs.labelShort}
                        </div>
                        <div className="text-[11px] font-extrabold font-mono text-slate-900">
                          {obs.tempC}°
                        </div>
                        <div className="text-[9px] font-semibold font-mono text-sky-700">
                          {obs.precipMm}mm
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parcel Size Note */}
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 px-0.5">
                <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-slate-800">{copy.parcelDimensionsLabel}:</span>
                <span className="font-mono tabular-nums truncate">
                  ~{parcel.widthMeters}m × {parcel.heightMeters}m ({areaRai} {isTh ? 'ไร่' : 'Rai'})
                </span>
              </div>
            </>
          )}
        </div>

        {/* Always-visible 2x2 Action Toolbar + PDF Banner */}
        <div className="space-y-2 pt-1 border-t border-slate-200/70">
          {pdfNotice && (
            <div
              data-testid="nasa-map-pdf-confirmation"
              role="status"
              className="rounded-xl bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{pdfNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="nasa-map-download-pdf-btn"
              onClick={() => void handleDownloadMapPdf()}
              disabled={isExportingPdf}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-xl transition-colors"
            >
              <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isExportingPdf
                  ? isTh
                    ? 'กำลังสร้าง PDF...'
                    : 'Building...'
                  : isTh
                    ? 'ดาวน์โหลด PDF แผนที่'
                    : 'Download PDF'}
              </span>
            </button>

            <button
              type="button"
              data-testid="nasa-map-share-btn"
              aria-expanded={shareOpen}
              onClick={() => setShareOpen((prev) => !prev)}
              className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-extrabold rounded-xl border transition-colors ${
                shareOpen
                  ? 'bg-sky-700 text-white border-sky-700'
                  : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
              }`}
            >
              <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isTh ? 'แชร์แผนที่ & พิกัด' : 'Share Map'}</span>
            </button>

            <button
              type="button"
              data-testid="map-modal-sync-nasa-btn"
              onClick={handleTriggerSync}
              disabled={isUpdating || isFetchingLive}
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60 rounded-xl transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${isUpdating || isFetchingLive ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {isUpdating || isFetchingLive
                  ? isTh
                    ? 'กำลังซิงค์...'
                    : 'Syncing...'
                  : isTh
                    ? 'ซิงค์ NASA POWER'
                    : 'Sync NASA'}
              </span>
            </button>

            <button
              type="button"
              data-testid="copy-farm-coords-btn"
              onClick={() => void handleCopyCoords()}
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
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
        </div>
      </div>
    </section>
  );
};
