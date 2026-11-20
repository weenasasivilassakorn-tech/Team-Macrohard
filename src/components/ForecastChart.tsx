import React from 'react';
import type { AppLanguage, DailyForecastPoint } from '../types/cropshield';
import {
  type GoogleCalendarEventItem,
  type ResolvedForecastDate,
  resolveRealTimeForecastCalendar,
} from '../utils/forecastCalendar';
import { APP_COPY } from '../utils/i18n';

interface ForecastChartProps {
  forecast: DailyForecastPoint[];
  selectedDayNumber: number;
  onSelectDay: (day: DailyForecastPoint) => void;
  lang: AppLanguage;
  resolvedDates?: ResolvedForecastDate[];
  eventsByDate?: Record<string, GoogleCalendarEventItem[]>;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecast,
  selectedDayNumber,
  onSelectDay,
  lang,
  resolvedDates,
  eventsByDate = {},
}) => {
  const copy = APP_COPY[lang].forecast;
  const activePoint =
    forecast.find((d) => d.dayNumber === selectedDayNumber) ?? forecast[0];
  const calendarDates =
    resolvedDates ?? resolveRealTimeForecastCalendar(forecast);

  const width = 720;
  const height = 246;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 22;
  const padBottom = 46;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const slotWidth = forecast.length > 0 ? chartWidth / forecast.length : chartWidth;
  const barWidth = Math.min(40, slotWidth * 0.48);

  const valueToY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return padTop + chartHeight - (clamped / 100) * chartHeight;
  };

  const stressPolylinePoints = forecast
    .map((point, index) => {
      const cx = padLeft + slotWidth * index + slotWidth / 2;
      const cy = valueToY(point.cropStressIndex);
      return `${cx},${cy}`;
    })
    .join(' ');

  const safeThresholdY = valueToY(40);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-sky-600" aria-hidden="true" />
          <span>{copy.moistureLegend}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-0.5 bg-amber-600" aria-hidden="true" />
          <span>{copy.stressLegend}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 border-t-2 border-dashed border-sky-600"
            aria-hidden="true"
          />
          <span>{copy.thresholdLegend}</span>
        </div>
      </div>

      {/* Compact SVG Dual-Metric Chart */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[460px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label={copy.title}
          >
            <defs>
              <linearGradient id="moistureBarDefault" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.82" />
              </linearGradient>
              <linearGradient id="moistureBarActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="1" />
                <stop offset="100%" stopColor="#0369A1" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="moistureBarLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.88" />
              </linearGradient>
            </defs>

            {[0, 25, 50, 75, 100].map((tick) => {
              const y = valueToY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1.5"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px] font-mono tabular-nums"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            <line
              x1={padLeft}
              y1={safeThresholdY}
              x2={width - padRight}
              y2={safeThresholdY}
              stroke="#0284C7"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.55"
            />

            {forecast.map((point, index) => {
              const cx = padLeft + slotWidth * index + slotWidth / 2;
              const barX = cx - barWidth / 2;
              const barY = valueToY(point.soilMoistureIndex);
              const barH = Math.max(2, padTop + chartHeight - barY);
              const isSelected = point.dayNumber === activePoint?.dayNumber;
              const isLowMoisture = point.soilMoistureIndex < 40;
              const resolved = calendarDates[index];
              const topDateLabel = resolved
                ? lang === 'en'
                  ? resolved.dateShortEn
                  : resolved.dateShortTh
                : point.dateShort;
              const dayShortLabel = resolved
                ? lang === 'en'
                  ? resolved.relativeLabelEn ?? resolved.weekdayEn
                  : resolved.relativeLabelTh ?? resolved.weekdayShortTh
                : point.dayLabelTh;
              const dayEvents = resolved ? eventsByDate[resolved.isoDate] ?? [] : [];

              return (
                <g
                  key={point.dayNumber}
                  onClick={() => onSelectDay(point)}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <rect
                      x={padLeft + slotWidth * index + 5}
                      y={padTop - 4}
                      width={slotWidth - 10}
                      height={chartHeight + 4}
                      rx={10}
                      fill="#F8FAFC"
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                  )}

                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barH}
                    rx={6}
                    fill={
                      isSelected
                        ? 'url(#moistureBarActive)'
                        : isLowMoisture
                          ? 'url(#moistureBarLow)'
                          : 'url(#moistureBarDefault)'
                    }
                  />

                  <text
                    x={cx}
                    y={padTop + chartHeight - 10}
                    textAnchor="middle"
                    className="fill-white text-[11px] font-mono font-semibold tabular-nums"
                  >
                    {point.soilMoistureIndex}%
                  </text>

                  {dayEvents.length > 0 && (
                    <circle
                      cx={cx + barWidth / 2 - 4}
                      cy={padTop + 6}
                      r={3.5}
                      fill="#059669"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  )}

                  <text
                    x={cx}
                    y={height - 22}
                    textAnchor="middle"
                    className={`text-[11px] font-mono tabular-nums ${
                      isSelected ? 'fill-slate-900 font-bold' : 'fill-slate-600'
                    }`}
                  >
                    {topDateLabel}
                  </text>
                  <text
                    x={cx}
                    y={height - 7}
                    textAnchor="middle"
                    className={`text-[10px] ${
                      isSelected ? 'fill-emerald-700 font-semibold' : 'fill-slate-400'
                    }`}
                  >
                    {dayShortLabel}
                  </text>
                </g>
              );
            })}

            {forecast.length > 1 && (
              <polyline
                fill="none"
                stroke="#D97706"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={stressPolylinePoints}
              />
            )}

            {forecast.map((point, index) => {
              const cx = padLeft + slotWidth * index + slotWidth / 2;
              const cy = valueToY(point.cropStressIndex);
              const isSelected = point.dayNumber === activePoint?.dayNumber;
              const nodeColor = point.cropStressIndex >= 60 ? '#DC2626' : '#D97706';

              return (
                <g
                  key={`stress-${point.dayNumber}`}
                  onClick={() => onSelectDay(point)}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={10} fill={nodeColor} opacity="0.16" />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4.5}
                    fill={nodeColor}
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
