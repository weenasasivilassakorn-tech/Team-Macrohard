import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_PLOTS,
  buildEarlyWarning,
  calculateFarmHealthScore,
  classifyRiskLevel,
  computePortfolioKpis,
  evaluatePlotProfile,
  evaluateTrancheReadiness,
  extractNasaWeatherTelemetry,
  translateNasaPowerToForecast,
} from './nasaPower';
import { INITIAL_FARMER_RECORDS } from '../data/mockFarmers';

test('classifyRiskLevel assigns green, yellow, and red traffic lights accurately', () => {
  assert.equal(classifyRiskLevel(88, 65, 22), 'low');
  assert.equal(classifyRiskLevel(78, 42, 58), 'watch');
  assert.equal(classifyRiskLevel(54, 28, 78), 'critical');
  // Even with moderate score, severe soil moisture drop triggers critical
  assert.equal(classifyRiskLevel(70, 29, 45), 'critical');
});

test('calculateFarmHealthScore responds monotonically to moisture and stress', () => {
  const healthyPlot = DEMO_PLOTS.find((p) => p.id === 'plot-surin-rice')!;
  const stressedPlot = DEMO_PLOTS.find((p) => p.id === 'plot-suphan-sugarcane')!;

  const healthyScore = calculateFarmHealthScore(healthyPlot.forecast);
  const stressedScore = calculateFarmHealthScore(stressedPlot.forecast);

  assert.ok(healthyScore > stressedScore, `Expected ${healthyScore} > ${stressedScore}`);
  assert.ok(healthyScore >= 80 && healthyScore <= 98);
  assert.ok(stressedScore >= 15 && stressedScore <= 65);
});

test('translateNasaPowerToForecast handles -999 fill values and produces 7 days', () => {
  const basePlot = DEMO_PLOTS[0];
  const mockNasaResponse = {
    properties: {
      parameter: {
        T2M: { '20250501': 33.4, '20250502': -999, '20250503': 34.1 },
        PRECTOTCORR: { '20250501': 0.8, '20250502': 1.2, '20250503': -999 },
        RH2M: { '20250501': 62, '20250502': 60, '20250503': -999 },
        GWETTOP: { '20250501': 0.52, '20250502': 0.49, '20250503': -999 },
      },
    },
  };

  const forecast = translateNasaPowerToForecast(mockNasaResponse, basePlot);
  assert.equal(forecast.length, 7);
  for (const point of forecast) {
    assert.ok(point.soilMoistureIndex >= 22 && point.soilMoistureIndex <= 88);
    assert.ok(point.cropStressIndex >= 12 && point.cropStressIndex <= 85);
    assert.ok(point.advisoryTh.length > 10);
  }
});

test('evaluatePlotProfile and buildEarlyWarning produce plain-Thai warning for Phetchabun corn plot', () => {
  const cornPlot = DEMO_PLOTS[0];
  const evaluation = evaluatePlotProfile(cornPlot, 'demo', 'ข้อมูลจำลองล่าสุด');

  assert.equal(evaluation.healthScore, 78);
  assert.equal(evaluation.riskLevel, 'watch');
  assert.match(evaluation.earlyWarning.messageTh, /18%/);
  assert.match(evaluation.earlyWarning.messageTh, /วันพุธหน้า/);
});

test('computePortfolioKpis and evaluateTrancheReadiness summarize BAAC portfolio accurately', () => {
  const kpis = computePortfolioKpis(INITIAL_FARMER_RECORDS);
  assert.equal(kpis.connectedPlotsCount, INITIAL_FARMER_RECORDS.length);
  assert.ok(kpis.totalAreaRai > 100);
  assert.ok(kpis.estimatedNplReductionPercent > 30);
  assert.ok(kpis.savedFieldInspectionCostThb > 15000);

  const criticalFarmer = INITIAL_FARMER_RECORDS.find((f) => f.riskLevel === 'critical')!;
  const lowFarmer = INITIAL_FARMER_RECORDS.find((f) => f.riskLevel === 'low')!;

  assert.equal(evaluateTrancheReadiness(criticalFarmer).canApproveNextTranche, false);
  assert.equal(evaluateTrancheReadiness(lowFarmer).canApproveNextTranche, true);
});

test('extractNasaWeatherTelemetry extracts elevationMeters and GWETTOP soil wetness', () => {
  const telemetry = extractNasaWeatherTelemetry({
    geometry: {
      coordinates: [101.057, 16.012, 296.25],
    },
    properties: {
      parameter: {
        T2M: { '20251101': 26.2, '20251102': 27.4 },
        PRECTOTCORR: { '20251101': 5.5, '20251102': 1.2 },
        RH2M: { '20251101': 74, '20251102': 68 },
        GWETTOP: { '20251101': 0.64, '20251102': 0.68 },
      },
    },
  });

  assert.equal(telemetry.elevationMeters, 296.3);
  assert.equal(telemetry.observedSoilWetnessPercent, 68);
  assert.equal(telemetry.observations.length, 2);
});
