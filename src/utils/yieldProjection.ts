import type {
  FarmPlotProfile,
  PlotEvaluation,
  ScenarioType,
} from '../types/cropshield';
import { clamp } from './nasaPower';

export interface YieldTrajectoryPoint {
  stageKey: string;
  stageLabelTh: string;
  stageLabelEn: string;
  soilHealthIndex: number; // 0-100
  baselineKgPerRai: number;
  projectedKgPerRai: number;
  protectedKgPerRai: number;
  baselineTotalTons: number;
  projectedTotalTons: number;
  protectedTotalTons: number;
}

export interface CropYieldSummary {
  cropBenchmarkKgPerRai: number;
  farmPricePerKgThb: number;
  projectedFinalKgPerRai: number;
  baselineFinalKgPerRai: number;
  protectedFinalKgPerRai: number;
  projectedTotalTons: number;
  baselineTotalTons: number;
  deltaPercent: number;
  estimatedRevenueThb: number;
  points: YieldTrajectoryPoint[];
}

interface CropAgronomicProfile {
  baselineKgPerRai: number;
  farmPricePerKgThb: number;
}

export function resolveCropAgronomicProfile(cropType: string): CropAgronomicProfile {
  const lower = cropType.toLowerCase();
  if (lower.includes('ข้าวโพด') || lower.includes('corn')) {
    return { baselineKgPerRai: 960, farmPricePerKgThb: 9.8 };
  }
  if (lower.includes('ข้าว') || lower.includes('rice')) {
    return { baselineKgPerRai: 680, farmPricePerKgThb: 14.5 };
  }
  if (lower.includes('มัน') || lower.includes('cassava')) {
    return { baselineKgPerRai: 3600, farmPricePerKgThb: 3.1 };
  }
  if (lower.includes('อ้อย') || lower.includes('sugarcane')) {
    return { baselineKgPerRai: 11500, farmPricePerKgThb: 1.35 };
  }
  return { baselineKgPerRai: 920, farmPricePerKgThb: 10.0 };
}

const SEASON_STAGES = [
  { key: 's1', th: 'สัปดาห์ 2', en: 'Wk 2', progress: 0.14 },
  { key: 's2', th: 'สัปดาห์ 4', en: 'Wk 4', progress: 0.31 },
  { key: 's3', th: 'สัปดาห์ 6', en: 'Wk 6', progress: 0.51 },
  { key: 's4', th: 'สัปดาห์ 8', en: 'Wk 8', progress: 0.72 },
  { key: 's5', th: 'สัปดาห์ 10', en: 'Wk 10', progress: 0.89 },
  { key: 's6', th: 'เก็บเกี่ยว', en: 'Harvest', progress: 1.0 },
];

export function computeCropYieldProjection(
  plot: FarmPlotProfile,
  evaluation: PlotEvaluation,
  scenario: ScenarioType
): CropYieldSummary {
  const { baselineKgPerRai, farmPricePerKgThb } = resolveCropAgronomicProfile(
    plot.cropType
  );
  const forecast = evaluation.forecast;
  const avgMoisture =
    forecast.length > 0
      ? forecast.reduce((s, d) => s + d.soilMoistureIndex, 0) / forecast.length
      : 60;
  const avgStress =
    forecast.length > 0
      ? forecast.reduce((s, d) => s + d.cropStressIndex, 0) / forecast.length
      : 30;

  // Health score 85 maps to ~100% baseline yield; score 50 drops yield ~28%
  const baseFactorFromHealth = 0.64 + (evaluation.healthScore / 100) * 0.41;
  const scenarioPenalty =
    scenario === 'drought' ? -0.1 : scenario === 'flood' ? -0.12 : 0;
  const moistureBonus =
    avgMoisture >= 55 && avgMoisture <= 76 && avgStress < 35 ? 0.03 : 0;

  const projectedFactor = clamp(
    baseFactorFromHealth + scenarioPenalty + moistureBonus,
    0.45,
    1.12
  );

  // With CropShield irrigation/drainage action, farmers recover up to 65% of stress loss
  const protectedFactor =
    projectedFactor < 0.98
      ? clamp(projectedFactor + (1.0 - projectedFactor) * 0.62, projectedFactor, 1.05)
      : clamp(projectedFactor + 0.02, 0.5, 1.14);

  const areaRai = Math.max(1, plot.areaRai);

  const points: YieldTrajectoryPoint[] = SEASON_STAGES.map((stage, idx) => {
    const baselineAtStage = Math.round(baselineKgPerRai * stage.progress);

    // Current week (stage index >= 2 reflects the current NASA soil-health inflection)
    const stageWeight = idx <= 1 ? 0.35 + idx * 0.25 : 1;
    const effectiveFactor = 1 + (projectedFactor - 1) * stageWeight;
    const effectiveProtectedFactor = 1 + (protectedFactor - 1) * stageWeight;

    const projectedAtStage = Math.round(baselineAtStage * effectiveFactor);
    const protectedAtStage = Math.round(baselineAtStage * effectiveProtectedFactor);

    const dayMatch = forecast[Math.min(idx, Math.max(0, forecast.length - 1))];
    const stageMoisture = dayMatch ? dayMatch.soilMoistureIndex : avgMoisture;
    const stageStress = dayMatch ? dayMatch.cropStressIndex : avgStress;
    const soilHealthIndex = Math.round(
      clamp(stageMoisture * 0.8 + (100 - stageStress) * 0.35, 20, 99)
    );

    return {
      stageKey: stage.key,
      stageLabelTh: stage.th,
      stageLabelEn: stage.en,
      soilHealthIndex,
      baselineKgPerRai: baselineAtStage,
      projectedKgPerRai: projectedAtStage,
      protectedKgPerRai: protectedAtStage,
      baselineTotalTons: Number(((baselineAtStage * areaRai) / 1000).toFixed(2)),
      projectedTotalTons: Number(((projectedAtStage * areaRai) / 1000).toFixed(2)),
      protectedTotalTons: Number(((protectedAtStage * areaRai) / 1000).toFixed(2)),
    };
  });

  const finalPoint = points[points.length - 1];
  const deltaPercent = Math.round(
    ((finalPoint.projectedKgPerRai - finalPoint.baselineKgPerRai) /
      Math.max(1, finalPoint.baselineKgPerRai)) *
      100
  );
  const estimatedRevenueThb = Math.round(
    finalPoint.projectedKgPerRai * areaRai * farmPricePerKgThb
  );

  return {
    cropBenchmarkKgPerRai: baselineKgPerRai,
    farmPricePerKgThb,
    projectedFinalKgPerRai: finalPoint.projectedKgPerRai,
    baselineFinalKgPerRai: finalPoint.baselineKgPerRai,
    protectedFinalKgPerRai: finalPoint.protectedKgPerRai,
    projectedTotalTons: finalPoint.projectedTotalTons,
    baselineTotalTons: finalPoint.baselineTotalTons,
    deltaPercent,
    estimatedRevenueThb,
    points,
  };
}
