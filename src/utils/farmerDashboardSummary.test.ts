import test from 'node:test';
import assert from 'node:assert/strict';
import { applyForecastScenario } from './farmScenarios';
import {
  buildFarmerDashboardSummary,
  buildShareableStatusPost,
  computeSoilMoistureCardState,
  getElderlyRiskBadgeText,
  summarizeFourPlotZones,
} from './farmerDashboardSummary';
import { computeIoTSensorReading, computeSoilHealthGrid } from './iotSoilSensor';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';

test('getElderlyRiskBadgeText returns plain-Thai and English traffic-light labels', () => {
  assert.equal(getElderlyRiskBadgeText('low', 'th'), 'ปลอดภัย');
  assert.equal(getElderlyRiskBadgeText('watch', 'th'), 'ระวัง');
  assert.equal(getElderlyRiskBadgeText('critical', 'th'), 'วิกฤต');
  assert.equal(getElderlyRiskBadgeText('low', 'en'), 'Safe');
});

test('buildFarmerDashboardSummary builds plain warning and mascot text for normal vs drought vs flood', () => {
  const plot = DEMO_PLOTS[0];

  // Normal Phetchabun corn outlook
  const normalEval = evaluatePlotProfile(plot, 'demo', 'Demo');
  const normalReading = computeIoTSensorReading(plot, normalEval, 'normal', 0);
  const normalGrid = computeSoilHealthGrid(plot, normalReading, 'normal');
  const normalSummary = buildFarmerDashboardSummary({
    plot,
    evaluation: normalEval,
    gridData: normalGrid,
    scenario: 'normal',
    lang: 'th',
  });

  assert.match(normalSummary.scoreHeadline, /^คะแนนแปลง: \d+ เต็ม 100$/);
  assert.equal(
    normalSummary.creditAssuranceSubtext,
    'ใช้ยืนยันความน่าเชื่อถือขอสินเชื่อและประกันได้'
  );
  assert.equal(normalSummary.warningHeadline, 'อีก 7 วันข้างหน้า: ดินจะแห้งลง');
  assert.equal(
    normalSummary.warningAdvice,
    'แนะนำให้เปิดน้ำวันพุธนี้ เพื่อรักษาผลผลิต'
  );
  assert.equal(normalSummary.mascotSpeech, 'วันนี้แปลงยังโอเคครับลุง/ป้า');

  // Drought scenario
  const droughtForecast = applyForecastScenario(plot.forecast, 'drought');
  const droughtEval = evaluatePlotProfile(plot, 'demo', 'Drought', droughtForecast);
  const droughtReading = computeIoTSensorReading(plot, droughtEval, 'drought', 0);
  const droughtGrid = computeSoilHealthGrid(plot, droughtReading, 'drought');
  const droughtSummary = buildFarmerDashboardSummary({
    plot,
    evaluation: droughtEval,
    gridData: droughtGrid,
    scenario: 'drought',
    lang: 'th',
  });

  assert.equal(droughtSummary.warningTone, 'red');
  assert.equal(droughtSummary.soilMoistureValue, 'น้อย');
  assert.match(droughtSummary.mascotSpeech, /เปิดน้ำ/);

  // Flood scenario
  const floodForecast = applyForecastScenario(plot.forecast, 'flood');
  const floodEval = evaluatePlotProfile(plot, 'demo', 'Flood', floodForecast);
  const floodReading = computeIoTSensorReading(plot, floodEval, 'flood', 0);
  const floodGrid = computeSoilHealthGrid(plot, floodReading, 'flood');
  const floodSummary = buildFarmerDashboardSummary({
    plot,
    evaluation: floodEval,
    gridData: floodGrid,
    scenario: 'flood',
    lang: 'th',
  });

  assert.equal(floodSummary.warningTone, 'red');
  assert.equal(floodSummary.soilMoistureValue, 'แฉะมาก');
  assert.match(floodSummary.warningHeadline, /น้ำท่วม/);
});

test('computeSoilMoistureCardState and summarizeFourPlotZones classify healthy rice paddy cleanly', () => {
  const ricePlot = DEMO_PLOTS[1];
  const riceEval = evaluatePlotProfile(ricePlot, 'demo', 'Demo');
  const reading = computeIoTSensorReading(ricePlot, riceEval, 'normal', 0);
  const grid = computeSoilHealthGrid(ricePlot, reading, 'normal');

  const moisture = computeSoilMoistureCardState(74, 'normal', 'th');
  assert.equal(moisture.value, 'พอดี');
  assert.equal(moisture.tone, 'good');

  const zones = summarizeFourPlotZones(grid, 'normal', 'th');
  assert.equal(zones.value, '4 จุดปกติ');
  assert.equal(zones.tone, 'good');
});

test('buildShareableStatusPost generates pre-filled bilingual plot status summary with score and risk', () => {
  const plot = DEMO_PLOTS[0];
  const evalNormal = evaluatePlotProfile(plot, 'demo', 'Demo');
  const reading = computeIoTSensorReading(plot, evalNormal, 'normal', 0);
  const grid = computeSoilHealthGrid(plot, reading, 'normal');

  const thPost = buildShareableStatusPost({
    plot,
    evaluation: evalNormal,
    gridData: grid,
    scenario: 'normal',
    lang: 'th',
  });
  assert.match(thPost, /แปลงข้าวโพด อ\.หนองไผ่/);
  assert.match(thPost, /คะแนนแปลง: \d+ เต็ม 100/);
  assert.match(thPost, /สถานะ: ระวัง/);
  assert.match(thPost, /#CropShield/);

  const enPost = buildShareableStatusPost({
    plot,
    evaluation: evalNormal,
    gridData: grid,
    scenario: 'normal',
    lang: 'en',
  });
  assert.match(enPost, /Plot Score: \d+ \/ 100/);
  assert.match(enPost, /Status: Caution/);
});
