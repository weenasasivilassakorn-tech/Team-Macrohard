import React, { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AppLanguage,
  FarmPlotProfile,
  PlotEvaluation,
  ScenarioType,
} from '../types/cropshield';
import { APP_COPY } from '../utils/i18n';
import { computeCropYieldProjection } from '../utils/yieldProjection';

interface CropYieldPotentialCardProps {
  lang: AppLanguage;
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  scenario: ScenarioType;
  embedded?: boolean;
}

type YieldMetricUnit = 'perRai' | 'totalTons';

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: {
    stageLabel?: string;
    soilHealthIndex?: number;
  };
}

export const CropYieldPotentialCard: React.FC<CropYieldPotentialCardProps> = ({
  lang,
  plot,
  evaluation,
  scenario,
  embedded = false,
}) => {
  const copy = APP_COPY[lang].yieldCard;
  const [unit, setUnit] = useState<YieldMetricUnit>('perRai');

  const projection = useMemo(
    () => computeCropYieldProjection(plot, evaluation, scenario),
    [plot, evaluation, scenario]
  );

  const chartData = useMemo(
    () =>
      projection.points.map((pt) => ({
        stageLabel: lang === 'th' ? pt.stageLabelTh : pt.stageLabelEn,
        projected:
          unit === 'perRai' ? pt.projectedKgPerRai : pt.projectedTotalTons,
        baseline:
          unit === 'perRai' ? pt.baselineKgPerRai : pt.baselineTotalTons,
        protectedYield:
          unit === 'perRai' ? pt.protectedKgPerRai : pt.protectedTotalTons,
        soilHealthIndex: pt.soilHealthIndex,
      })),
    [lang, projection.points, unit]
  );

  const primaryStroke =
    evaluation.riskLevel === 'critical'
      ? '#DC2626'
      : evaluation.riskLevel === 'watch'
        ? '#D97706'
        : '#15803D';

  const unitSuffix =
    unit === 'perRai'
      ? lang === 'th'
        ? 'กก./ไร่'
        : 'kg/rai'
      : lang === 'th'
        ? 'ตัน'
        : 't';

  const projectedDisplayValue =
    unit === 'perRai'
      ? `${projection.projectedFinalKgPerRai.toLocaleString('en-US')} ${unitSuffix}`
      : `${projection.projectedTotalTons.toLocaleString('en-US')} ${unitSuffix}`;

  const protectedDisplayValue =
    unit === 'perRai'
      ? `${projection.protectedFinalKgPerRai.toLocaleString('en-US')} ${unitSuffix}`
      : `${projection.points[projection.points.length - 1].protectedTotalTons.toLocaleString('en-US')} ${unitSuffix}`;

  const deltaIsPositive = projection.deltaPercent >= 0;

  const WrapperTag = embedded ? 'div' : 'section';

  return (
    <WrapperTag
      data-testid="crop-yield-potential-card"
      aria-labelledby="crop-yield-heading"
      className={
        embedded
          ? 'space-y-3.5'
          : 'bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4'
      }
    >
      {/* Header & Metric Unit Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="crop-yield-heading"
            className="text-base font-bold text-slate-900 tracking-tight"
          >
            {copy.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto shrink-0"
          role="group"
          aria-label="Yield display unit"
        >
          <button
            type="button"
            data-testid="yield-unit-per-rai"
            onClick={() => setUnit('perRai')}
            className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              unit === 'perRai'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {copy.unitPerRai}
          </button>
          <button
            type="button"
            data-testid="yield-unit-total-tons"
            onClick={() => setUnit('totalTons')}
            className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              unit === 'totalTons'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {copy.unitTotalTons}
          </button>
        </div>
      </div>

      {/* 3 Compact Summary Metrics (Unboxed, Tabular Numerals) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 py-2.5 border-y border-slate-100">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 truncate">
            {copy.projectedLabel}
          </div>
          <div
            data-testid="yield-projected-value"
            className="text-sm sm:text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5 truncate"
          >
            {projectedDisplayValue}
          </div>
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-semibold mt-0.5 ${
              deltaIsPositive ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {deltaIsPositive ? (
              <TrendingUp className="w-3 h-3 shrink-0" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3 h-3 shrink-0" aria-hidden="true" />
            )}
            <span>
              {deltaIsPositive ? `+${projection.deltaPercent}%` : `${projection.deltaPercent}%`}{' '}
              {copy.vsTargetLabel}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 truncate">
            {copy.protectedLabel}
          </div>
          <div className="text-sm sm:text-lg font-bold font-mono tabular-nums text-emerald-700 mt-0.5 truncate">
            {protectedDisplayValue}
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {lang === 'th' ? 'รวมแนวทางจัดการน้ำ' : 'With early action'}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 truncate">
            {copy.revenueLabel}
          </div>
          <div className="text-sm sm:text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5 truncate">
            ฿{projection.estimatedRevenueThb.toLocaleString('en-US')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate mt-0.5">
            {plot.areaRai} {lang === 'th' ? 'ไร่' : 'Rai'}
          </div>
        </div>
      </div>

      {/* Recharts Trajectory Chart */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: primaryStroke }}
              aria-hidden="true"
            />
            {copy.projectedLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span
              className="w-3 border-t-2 border-dashed border-slate-400 shrink-0"
              aria-hidden="true"
            />
            {copy.baselineLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span
              className="w-3 border-t-2 border-emerald-600 shrink-0"
              aria-hidden="true"
            />
            {copy.protectedLabel}
          </span>
        </div>

        <div
          className={`w-full min-w-0 ${
            embedded ? 'h-[192px] sm:h-[210px]' : 'h-[216px] sm:h-[244px]'
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -8, bottom: 2 }}
            >
              <defs>
                <linearGradient id="yieldFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryStroke} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={primaryStroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="stageLabel"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const rows = payload as readonly TooltipPayloadEntry[];
                  const firstPayload = rows[0]?.payload;
                  return (
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm text-xs space-y-1">
                      <div className="font-bold text-slate-900">
                        {firstPayload?.stageLabel}
                      </div>
                      {rows.map((entry) => (
                        <div
                          key={entry.dataKey}
                          className="flex items-center justify-between gap-4 font-mono tabular-nums"
                        >
                          <span className="text-slate-600 font-sans">
                            {entry.name}:
                          </span>
                          <span className="font-semibold text-slate-900">
                            {Number(entry.value ?? 0).toLocaleString('en-US')}{' '}
                            {unitSuffix}
                          </span>
                        </div>
                      ))}
                      {typeof firstPayload?.soilHealthIndex === 'number' && (
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-4 text-[11px] text-slate-500">
                          <span>{copy.soilHealthSeries}:</span>
                          <span className="font-mono tabular-nums font-semibold text-emerald-700">
                            {firstPayload.soilHealthIndex}/100
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="projected"
                name={copy.projectedLabel}
                stroke={primaryStroke}
                strokeWidth={2.5}
                fill="url(#yieldFillGrad)"
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name={copy.baselineLabel}
                stroke="#94A3B8"
                strokeWidth={1.8}
                strokeDasharray="5 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="protectedYield"
                name={copy.protectedLabel}
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 3, fill: '#059669' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </WrapperTag>
  );
};
