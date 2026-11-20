import React, { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CloudRain, Droplets, Satellite, Thermometer } from 'lucide-react';
import type {
  AppLanguage,
  FarmPlotProfile,
  PlotEvaluation,
  ScenarioType,
} from '../types/cropshield';
import { APP_COPY } from '../utils/i18n';
import { computeWeatherTrendSummary } from '../utils/weatherSummary';

interface WeatherSummaryCardProps {
  lang: AppLanguage;
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  scenario: ScenarioType;
  embedded?: boolean;
}

type WeatherViewMode = 'outlook' | 'observed';

interface WeatherTooltipEntry {
  name?: string;
  value?: number;
  dataKey?: string;
  payload?: {
    label?: string;
    precipMm?: number;
    tempC?: number;
    rainChancePercent?: number;
    humidityPercent?: number;
  };
}

interface WeatherChartDatum {
  label: string;
  precipMm: number;
  tempC: number;
  rainChancePercent?: number;
  humidityPercent?: number;
}

export const WeatherSummaryCard: React.FC<WeatherSummaryCardProps> = ({
  lang,
  plot,
  evaluation,
  scenario,
  embedded = false,
}) => {
  const copy = APP_COPY[lang].weatherCard;
  const homeCopy = APP_COPY[lang].home;
  const [viewMode, setViewMode] = useState<WeatherViewMode>('outlook');

  const summary = useMemo(
    () => computeWeatherTrendSummary(plot, evaluation, scenario),
    [plot, evaluation, scenario]
  );

  const chartData = useMemo<WeatherChartDatum[]>(() => {
    if (viewMode === 'outlook') {
      return summary.outlookPoints.map((pt) => ({
        label: lang === 'th' ? pt.labelTh : pt.labelEn,
        precipMm: pt.precipMm,
        tempC: pt.tempMaxC,
        rainChancePercent: pt.rainChancePercent,
      }));
    }
    return summary.observedPoints.map((obs) => ({
      label: obs.labelShort,
      precipMm: obs.precipMm,
      tempC: obs.tempC,
      humidityPercent: obs.humidityPercent,
    }));
  }, [lang, summary.observedPoints, summary.outlookPoints, viewMode]);

  const tempTrendText =
    summary.tempTrendDirection === 'warming'
      ? `${copy.tempTrendWarm} +${summary.tempTrendDeltaC}°C`
      : summary.tempTrendDirection === 'cooling'
        ? `${copy.tempTrendCool} ${summary.tempTrendDeltaC}°C`
        : copy.tempTrendSteady;

  const rainMetricDisplay =
    viewMode === 'outlook'
      ? `${summary.totalForecastPrecipMm.toLocaleString('en-US')} ${lang === 'th' ? 'มม.' : 'mm'}`
      : `${summary.observedTotalPrecipMm.toLocaleString('en-US')} ${lang === 'th' ? 'มม.' : 'mm'}`;

  const tempMetricDisplay =
    viewMode === 'outlook'
      ? `${summary.peakTempMaxC}°C / ${summary.avgTempMaxC}°C`
      : `${summary.observedAvgTempC}°C`;

  const WrapperTag = embedded ? 'div' : 'section';

  return (
    <WrapperTag
      data-testid="weather-summary-card"
      aria-labelledby="weather-summary-heading"
      className={
        embedded
          ? 'space-y-3.5'
          : 'bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4'
      }
    >
      {/* Header & Outlook / NASA Observed Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id="weather-summary-heading"
              className="text-base font-bold text-slate-900 tracking-tight"
            >
              {copy.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto shrink-0"
          role="group"
          aria-label="Weather trend view switcher"
        >
          <button
            type="button"
            data-testid="weather-mode-outlook"
            onClick={() => setViewMode('outlook')}
            className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              viewMode === 'outlook'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {copy.viewOutlook}
          </button>
          <button
            type="button"
            data-testid="weather-mode-observed"
            onClick={() => setViewMode('observed')}
            className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              viewMode === 'observed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {copy.viewObserved}
          </button>
        </div>
      </div>

      {/* 3 Unboxed Tabular-Numeral Weather Summary Metrics */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 py-2.5 border-y border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <CloudRain className="w-3.5 h-3.5 text-sky-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.rainfallLabel}</span>
          </div>
          <div
            data-testid="weather-rainfall-value"
            className="text-sm sm:text-lg font-bold font-mono tabular-nums text-sky-700 mt-0.5 truncate"
          >
            {rainMetricDisplay}
          </div>
          <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate mt-0.5">
            {viewMode === 'outlook'
              ? `${copy.rainChanceSub}: ${summary.peakRainChancePercent}%`
              : `${copy.observedRainSub}: PRECTOTCORR`}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Thermometer className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.tempLabel}</span>
          </div>
          <div
            data-testid="weather-temp-value"
            className="text-sm sm:text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5 truncate"
          >
            {tempMetricDisplay}
          </div>
          <div className="text-[11px] text-amber-700 font-medium truncate mt-0.5">
            {tempTrendText}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Droplets className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.humidityLabel}</span>
          </div>
          <div
            data-testid="weather-humidity-value"
            className="text-sm sm:text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5 truncate"
          >
            {summary.avgHumidityPercent}%
          </div>
          <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate mt-0.5">
            {copy.nightFloorSub}: {summary.minTempNightC}°C
          </div>
        </div>
      </div>

      {/* Dual-Axis Recharts Precipitation & Temperature Trend Chart */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-xs bg-sky-500 shrink-0"
                aria-hidden="true"
              />
              {copy.precipLegend}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-3 border-t-2 border-amber-600 shrink-0"
                aria-hidden="true"
              />
              {viewMode === 'outlook' ? copy.tempMaxLegend : copy.tempObservedLegend}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <Satellite className="w-3 h-3 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>
              {summary.isLiveNasaTelemetry
                ? copy.liveTelemetryTag
                : copy.modeledTelemetryTag}
            </span>
          </span>
        </div>

        <div
          className={`w-full min-w-0 ${
            embedded ? 'h-[192px] sm:h-[210px]' : 'h-[206px] sm:h-[228px]'
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 0, left: -12, bottom: 2 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="rain"
                tick={{ fontSize: 11, fill: '#0369A1' }}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <YAxis
                yAxisId="temp"
                orientation="right"
                domain={[20, 42]}
                tick={{ fontSize: 11, fill: '#B45309' }}
                axisLine={false}
                tickLine={false}
                width={36}
                unit="°"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const rows = payload as readonly WeatherTooltipEntry[];
                  const first = rows[0]?.payload;
                  return (
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm text-xs space-y-1">
                      <div className="font-bold text-slate-900">{first?.label}</div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="text-slate-600 font-sans">
                          {copy.precipLegend}:
                        </span>
                        <span className="font-semibold text-sky-700">
                          {first?.precipMm ?? 0} {lang === 'th' ? 'มม.' : 'mm'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="text-slate-600 font-sans">
                          {viewMode === 'outlook'
                            ? copy.tempMaxLegend
                            : copy.tempObservedLegend}
                          :
                        </span>
                        <span className="font-semibold text-amber-700">
                          {first?.tempC ?? 0}°C
                        </span>
                      </div>
                      {typeof first?.rainChancePercent === 'number' && (
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-4 text-[11px] text-slate-500">
                          <span>{copy.rainChanceSeries}:</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-800">
                            {first.rainChancePercent}%
                          </span>
                        </div>
                      )}
                      {typeof first?.humidityPercent === 'number' && (
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-4 text-[11px] text-slate-500">
                          <span>RH2M:</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-800">
                            {first.humidityPercent}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="rain"
                dataKey="precipMm"
                name={copy.precipLegend}
                fill="#0EA5E9"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="tempC"
                name={
                  viewMode === 'outlook'
                    ? copy.tempMaxLegend
                    : copy.tempObservedLegend
                }
                stroke="#D97706"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#D97706', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Concise Field Impact Summary Box */}
      <div
        data-testid="weather-impact-summary"
        className={`border rounded-xl px-3.5 py-2.5 space-y-1 ${
          scenario === 'drought'
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : scenario === 'flood'
              ? 'bg-sky-50/70 border-sky-200 text-sky-950'
              : 'bg-slate-50 border-slate-200/80 text-slate-800'
        }`}
      >
        <div className="text-[11px] font-bold">{homeCopy.weatherImpactTitle}</div>
        <p className="text-xs leading-relaxed">
          {lang === 'th' ? summary.insightTh : summary.insightEn}
        </p>
      </div>
    </WrapperTag>
  );
};
