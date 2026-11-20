import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';
import { applyForecastScenario } from './farmScenarios';
import {
  computeCropYieldProjection,
  resolveCropAgronomicProfile,
} from './yieldProjection';

test('resolveCropAgronomicProfile assigns crop-specific Thai yield benchmarks', () => {
  assert.equal(resolveCropAgronomicProfile('ข้าวโพดเลี้ยงสัตว์').baselineKgPerRai, 960);
  assert.equal(resolveCropAgronomicProfile('ข้าวหอมมะลิ 105').baselineKgPerRai, 680);
  assert.equal(resolveCropAgronomicProfile('มันสำปะหลัง').baselineKgPerRai, 3600);
  assert.equal(resolveCropAgronomicProfile('อ้อยโรงงาน').baselineKgPerRai, 11500);
});

test('computeCropYieldProjection reflects soil health score and scenario stress', () => {
  const cornPlot = DEMO_PLOTS[0];
  const normalEval = evaluatePlotProfile(cornPlot, 'demo', 'normal');
  const droughtForecast = applyForecastScenario(cornPlot.forecast, 'drought');
  const droughtEval = evaluatePlotProfile(cornPlot, 'demo', 'drought', droughtForecast);

  const normalYield = computeCropYieldProjection(cornPlot, normalEval, 'normal');
  const droughtYield = computeCropYieldProjection(cornPlot, droughtEval, 'drought');

  assert.equal(normalYield.points.length, 6);
  assert.ok(normalYield.projectedTotalTons > 0);
  assert.ok(
    droughtYield.projectedFinalKgPerRai < normalYield.projectedFinalKgPerRai,
    'Drought soil stress must reduce projected yield per rai'
  );
  assert.ok(
    droughtYield.protectedFinalKgPerRai > droughtYield.projectedFinalKgPerRai,
    'CropShield mitigation action must improve protected harvest trajectory under drought'
  );

  const ricePlot = DEMO_PLOTS[1]; // Healthy 87/100 score
  const riceEval = evaluatePlotProfile(ricePlot, 'demo', 'normal');
  const riceYield = computeCropYieldProjection(ricePlot, riceEval, 'normal');
  assert.ok(riceYield.deltaPercent >= 0, 'Healthy rice plot should meet or beat baseline');
});
