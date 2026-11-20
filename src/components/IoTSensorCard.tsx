import React, { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BatteryCharging,
  Cpu,
  Droplets,
  Radio,
  RefreshCw,
} from 'lucide-react';
import type {
  AppLanguage,
  FarmPlotProfile,
  PlotEvaluation,
  ScenarioType,
} from '../types/cropshield';
import { APP_COPY } from '../utils/i18n';
import {
  type IoTSensorReading,
  type SoilGridCell,
  computeIoTSensorReading,
} from '../utils/iotSoilSensor';
import { SoilHealthGridMap } from './SoilHealthGridMap';

interface IoTSensorCardProps {
  lang: AppLanguage;
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  scenario: ScenarioType;
  embedded?: boolean;
  readingOverride?: IoTSensorReading;
  selectedZoneCell?: SoilGridCell;
  isPollingOverride?: boolean;
  onPollOverride?: () => void;
  showEmbeddedGrid?: boolean;
}

interface SensorTooltipEntry {
  name?: string;
  value?: number;
  dataKey?: string;
  payload?: {
    hourLabel?: string;
    surface10cm?: number;
    rootZone30cm?: number;
    nasaBaseline?: number;
  };
}

export const IoTSensorCard: React.FC<IoTSensorCardProps> = ({
  lang,
  plot,
  evaluation,
  scenario,
  embedded = false,
  readingOverride,
  selectedZoneCell,
  isPollingOverride,
  onPollOverride,
  showEmbeddedGrid = true,
}) => {
  const copy = APP_COPY[lang].iotSensor;
  const gridCopy = APP_COPY[lang].soilGrid;
  const [pollStep, setPollStep] = useState<number>(0);
  const [internalIsPolling, setInternalIsPolling] = useState<boolean>(false);
  const [polledTimeLabel, setPolledTimeLabel] = useState<string | undefined>(
    undefined
  );

  const internalReading = useMemo(
    () =>
      computeIoTSensorReading(
        plot,
        evaluation,
        scenario,
        pollStep,
        polledTimeLabel ?? (lang === 'th' ? 'สด · 1 นาทีที่แล้ว' : 'Live · 1 min ago')
      ),
    [plot, evaluation, scenario, pollStep, polledTimeLabel, lang]
  );

  const reading = readingOverride ?? internalReading;
  const isPolling = isPollingOverride ?? internalIsPolling;

  const handlePollSensor = () => {
    if (onPollOverride) {
      onPollOverride();
      return;
    }
    if (internalIsPolling) return;
    setInternalIsPolling(true);
    setTimeout(() => {
      const nowTime = new Date().toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setPollStep((prev) => prev + 1);
      setPolledTimeLabel(nowTime);
      setInternalIsPolling(false);
    }, 320);
  };

  const statusText =
    reading.statusLevel === 'optimal'
      ? copy.statusOptimal
      : reading.statusLevel === 'dry'
        ? copy.statusDry
        : copy.statusSaturated;

  const statusClass =
    reading.statusLevel === 'optimal'
      ? 'text-emerald-700'
      : reading.statusLevel === 'dry'
        ? 'text-amber-700'
        : 'text-sky-700';

  const deltaDisplay =
    reading.deltaVsNasaPercent > 0
      ? `+${reading.deltaVsNasaPercent}%`
      : `${reading.deltaVsNasaPercent}%`;

  const WrapperTag = embedded ? 'div' : 'section';

  return (
    <WrapperTag
      data-testid="iot-soil-sensor-card"
      aria-labelledby="iot-sensor-heading"
      className={
        embedded
          ? 'space-y-3.5'
          : 'bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4'
      }
    >
      {/* Header & Live Sensor Poll Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <h2
              id="iot-sensor-heading"
              className="text-sm sm:text-base font-bold text-slate-900 tracking-tight"
            >
              {copy.title}
            </h2>
            {selectedZoneCell && (
              <span
                data-testid="iot-selected-zone-label"
                className="text-xs font-bold font-mono tabular-nums text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5"
              >
                {gridCopy.zoneLabel} {selectedZoneCell.zoneCode}
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
            {selectedZoneCell
              ? `${lang === 'th' ? reading.signalStrengthLabelTh : reading.signalStrengthLabelEn} · ${gridCopy.nutrientMetric} ${selectedZoneCell.nutrientScore}/100`
              : copy.subtitle}
          </p>
        </div>

        <button
          type="button"
          data-testid="iot-poll-btn"
          onClick={handlePollSensor}
          disabled={isPolling}
          className="min-h-[40px] inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-emerald-700 ${isPolling ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{isPolling ? copy.pollingBtn : copy.pollBtn}</span>
        </button>
      </div>

      {/* 3 Primary Unboxed Real-Time Moisture Metrics (10 cm, 30 cm, NASA Compare) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 py-2.5 border-y border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Droplets className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.surface10cmLabel}</span>
          </div>
          <div
            data-testid="iot-surface-moisture"
            className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5"
          >
            {reading.surfaceMoisture10cm}%
          </div>
          <div className={`text-[11px] font-semibold truncate mt-0.5 ${statusClass}`}>
            {statusText}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 truncate">
            {copy.rootZone30cmLabel}
          </div>
          <div
            data-testid="iot-root-moisture"
            className="text-base sm:text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5"
          >
            {reading.rootZoneMoisture30cm}%
          </div>
          <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate mt-0.5">
            {copy.soilTempLabel}: {reading.soilTempC}°C
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 truncate">
            {copy.nasaCompareLabel}
          </div>
          <div
            data-testid="iot-nasa-compare"
            className="text-base sm:text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5"
          >
            {reading.nasaSurfaceMoisture}%
          </div>
          <div className="text-[11px] text-slate-600 font-mono tabular-nums truncate mt-0.5">
            Δ {deltaDisplay} {copy.deltaSubVsNasa}
          </div>
        </div>
      </div>

      {/* 24-Hour Soil Probe Trend vs NASA Satellite Baseline */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-xs bg-emerald-600 shrink-0"
                aria-hidden="true"
              />
              {copy.series10cm}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-3 border-t-2 border-sky-600 shrink-0"
                aria-hidden="true"
              />
              {copy.series30cm}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-3 border-t-2 border-dashed border-slate-400 shrink-0"
                aria-hidden="true"
              />
              {copy.seriesNasa}
            </span>
          </div>
          <span
            data-testid="iot-last-polled"
            className="text-[11px] font-mono tabular-nums text-slate-500"
          >
            {copy.groundCalibrated}: {reading.lastPolledLabel}
          </span>
        </div>

        <div
          className={`w-full min-w-0 ${
            embedded ? 'h-[150px] sm:h-[158px]' : 'h-[184px] sm:h-[200px]'
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={reading.hourlySeries}
              margin={{ top: 8, right: 8, left: -4, bottom: 2 }}
            >
              <defs>
                <linearGradient id="iotMoistureGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="hourLabel"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[10, 100]}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <ReferenceLine
                y={reading.nasaSurfaceMoisture}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const rows = payload as readonly SensorTooltipEntry[];
                  const first = rows[0]?.payload;
                  return (
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm text-xs space-y-1">
                      <div className="font-bold text-slate-900">
                        {first?.hourLabel}
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="text-slate-600 font-sans">
                          {copy.series10cm}:
                        </span>
                        <span className="font-semibold text-emerald-700">
                          {first?.surface10cm}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="text-slate-600 font-sans">
                          {copy.series30cm}:
                        </span>
                        <span className="font-semibold text-sky-700">
                          {first?.rootZone30cm}%
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-4 text-[11px] text-slate-500 font-mono tabular-nums">
                        <span className="font-sans">{copy.seriesNasa}:</span>
                        <span className="font-semibold text-slate-800">
                          {first?.nasaBaseline}%
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="surface10cm"
                name={copy.series10cm}
                stroke="#059669"
                strokeWidth={2.3}
                fill="url(#iotMoistureGrad)"
                dot={{ r: 3, fill: '#059669' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="rootZone30cm"
                name={copy.series30cm}
                stroke="#0284C7"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#0284C7' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spatial 4x6 Grid-Based Soil Health Map Visualizer */}
      {showEmbeddedGrid && (
        <SoilHealthGridMap
          lang={lang}
          plot={plot}
          reading={reading}
          scenario={scenario}
        />
      )}

      {/* Concise Soil Chemistry + Field Node Hardware Strip & Plain-Language Calibration Note */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px] text-slate-600 font-mono tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>
              {reading.nodeId} · {reading.connectivityLabel}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {copy.phLabel}: <strong className="text-slate-900">{reading.soilPh}</strong>
            </span>
            <span>
              {copy.ecLabel}: <strong className="text-slate-900">{reading.ecDsPerM} dS/m</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              <strong className="text-slate-900">{reading.batteryPercent}%</strong>
            </span>
          </div>
        </div>

        <div
          data-testid="iot-calibration-note"
          className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 leading-relaxed"
        >
          {lang === 'th' ? reading.calibrationNoteTh : reading.calibrationNoteEn}
        </div>
      </div>
    </WrapperTag>
  );
};
