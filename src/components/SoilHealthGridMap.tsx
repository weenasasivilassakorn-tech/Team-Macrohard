import React, { useMemo, useState } from 'react';
import { Grid3X3, Radio } from 'lucide-react';
import type {
  AppLanguage,
  FarmPlotProfile,
  ScenarioType,
} from '../types/cropshield';
import { APP_COPY } from '../utils/i18n';
import {
  type IoTSensorReading,
  type SoilGridCell,
  type SoilGridLayerMode,
  type SoilGridMapData,
  type SoilGridZoneHealth,
  computeSoilHealthGrid,
} from '../utils/iotSoilSensor';

interface SoilHealthGridMapProps {
  lang: AppLanguage;
  plot: FarmPlotProfile;
  reading: IoTSensorReading;
  scenario: ScenarioType;
  gridData?: SoilGridMapData;
  selectedZoneCode?: string;
  onSelectZone?: (zoneCode: string) => void;
  embedded?: boolean;
  showInlineInspector?: boolean;
}

function getCellSurfaceClass(
  status: SoilGridZoneHealth,
  isSelected: boolean
): string {
  const ring = isSelected ? 'ring-2 ring-slate-900 ring-offset-1 z-10' : '';
  switch (status) {
    case 'optimal':
      return `bg-emerald-500/85 hover:bg-emerald-600 text-white border-emerald-600/40 ${ring}`;
    case 'watch':
      return `bg-amber-400/90 hover:bg-amber-500 text-slate-950 border-amber-500/50 ${ring}`;
    case 'critical':
      return `bg-red-500/90 hover:bg-red-600 text-white border-red-600/50 ${ring}`;
  }
}

export const SoilHealthGridMap: React.FC<SoilHealthGridMapProps> = ({
  lang,
  plot,
  reading,
  scenario,
  gridData: externalGridData,
  selectedZoneCode: controlledZoneCode,
  onSelectZone,
  embedded = false,
  showInlineInspector = true,
}) => {
  const copy = APP_COPY[lang].soilGrid;
  const [layer, setLayer] = useState<SoilGridLayerMode>('combined');
  const [internalZoneCode, setInternalZoneCode] = useState<string>('B2');
  const activeZoneCode = controlledZoneCode ?? internalZoneCode;

  const handleSelectZone = (zoneCode: string) => {
    if (onSelectZone) {
      onSelectZone(zoneCode);
    } else {
      setInternalZoneCode(zoneCode);
    }
  };

  const gridData = useMemo(
    () => externalGridData ?? computeSoilHealthGrid(plot, reading, scenario),
    [externalGridData, plot, reading, scenario]
  );

  const selectedCell: SoilGridCell =
    gridData.cells.find((c) => c.zoneCode === activeZoneCode) ??
    gridData.cells[0];

  const getCellDisplay = (cell: SoilGridCell) => {
    if (layer === 'moisture') {
      return {
        status: cell.moistureStatus,
        valueText: `${cell.moisturePercent}%`,
      };
    }
    if (layer === 'nutrients') {
      return {
        status: cell.nutrientStatus,
        valueText: `${cell.nutrientScore}`,
      };
    }
    return {
      status: cell.combinedStatus,
      valueText: `${cell.combinedHealthScore}`,
    };
  };

  const activeLayerCounts = useMemo(() => {
    let optimal = 0;
    let watch = 0;
    let critical = 0;
    for (const cell of gridData.cells) {
      const status =
        layer === 'moisture'
          ? cell.moistureStatus
          : layer === 'nutrients'
            ? cell.nutrientStatus
            : cell.combinedStatus;
      if (status === 'optimal') optimal += 1;
      else if (status === 'watch') watch += 1;
      else critical += 1;
    }
    return { optimal, watch, critical };
  }, [gridData.cells, layer]);

  const selectedHealthTextClass =
    selectedCell.combinedStatus === 'optimal'
      ? 'text-emerald-700'
      : selectedCell.combinedStatus === 'watch'
        ? 'text-amber-700'
        : 'text-red-700';

  const selectedTip = (() => {
    if (selectedCell.moistureStatus !== 'optimal') {
      return selectedCell.isSaturated ? copy.tipSaturated : copy.tipDry;
    }
    if (selectedCell.nutrientStatus !== 'optimal') {
      return copy.tipNutrient;
    }
    return copy.tipOptimal;
  })();

  const raiPerCell = (plot.areaRai / gridData.cells.length).toFixed(1);

  return (
    <div
      data-testid="soil-health-grid-map"
      className={embedded ? 'space-y-3' : 'pt-3 border-t border-slate-100 space-y-3'}
    >
      {/* Sub-header & Layer Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Grid3X3 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              {copy.title}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto"
          role="group"
          aria-label="Soil grid data layer"
        >
          {(
            [
              { id: 'combined', label: copy.layerCombined },
              { id: 'moisture', label: copy.layerMoisture },
              { id: 'nutrients', label: copy.layerNutrients },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`grid-layer-${tab.id}`}
              onClick={() => setLayer(tab.id)}
              className={`min-h-[32px] px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                layer === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4x6 Spatial Plot Grid */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 sm:p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
          <span>
            {plot.areaRai} {lang === 'th' ? 'ไร่' : 'Rai'} · ~{raiPerCell}{' '}
            {lang === 'th' ? 'ไร่/โซน' : 'Rai/zone'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-700" aria-hidden="true" />
            <span>{copy.sensorNodeTag} (3)</span>
          </span>
        </div>

        <div
          role="grid"
          aria-label={copy.title}
          className="grid grid-cols-6 gap-1.5"
        >
          {gridData.cells.map((cell) => {
            const { status, valueText } = getCellDisplay(cell);
            const isSelected = cell.zoneCode === selectedCell.zoneCode;

            return (
              <button
                key={cell.id}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                data-testid={`soil-grid-cell-${cell.zoneCode}`}
                onClick={() => handleSelectZone(cell.zoneCode)}
                className={`relative ${
                  embedded ? 'min-h-[40px] sm:min-h-[42px]' : 'min-h-[44px] sm:min-h-[48px]'
                } rounded-lg border flex flex-col items-center justify-center p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${getCellSurfaceClass(
                  status,
                  isSelected
                )}`}
              >
                <span className="text-[10px] font-mono leading-none opacity-85">
                  {cell.zoneCode}
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono tabular-nums leading-tight mt-0.5">
                  {valueText}
                </span>
                {cell.hasSensorNode && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white ring-1 ring-slate-900/40"
                    title={copy.sensorNodeTag}
                    aria-label={copy.sensorNodeTag}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Compact Color Legend + Zone Counts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shrink-0" aria-hidden="true" />
              <span>
                {copy.legendOptimal} ({activeLayerCounts.optimal})
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 shrink-0" aria-hidden="true" />
              <span>
                {copy.legendWatch} ({activeLayerCounts.watch})
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-500 shrink-0" aria-hidden="true" />
              <span>
                {copy.legendCritical} ({activeLayerCounts.critical})
              </span>
            </span>
          </div>
          <span className="text-slate-400 hidden sm:inline">{copy.tapHint}</span>
        </div>
      </div>

      {/* Selected Zone Inspector Bar (hidden when paired with dedicated right-hand IoT sensor panel) */}
      {showInlineInspector && (
        <div
          data-testid="soil-grid-inspector"
          className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 space-y-1.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span>
                {copy.zoneLabel} {selectedCell.zoneCode}
              </span>
              {selectedCell.hasSensorNode && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                  {copy.sensorNodeTag}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums text-slate-600">
              <span>
                {copy.moistureMetric}:{' '}
                <strong className="text-slate-900">{selectedCell.moisturePercent}%</strong>
              </span>
              <span>
                {copy.nutrientMetric}:{' '}
                <strong className="text-slate-900">
                  {selectedCell.nutrientScore}/100 ({selectedCell.ecDsPerM} dS/m)
                </strong>
              </span>
              <span>
                {copy.healthMetric}:{' '}
                <strong className={selectedHealthTextClass}>
                  {selectedCell.combinedHealthScore}/100
                </strong>
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">{selectedTip}</p>
        </div>
      )}
    </div>
  );
};
