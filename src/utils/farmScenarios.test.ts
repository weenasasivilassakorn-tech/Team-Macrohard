import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVINCE_PRESETS,
  applyForecastScenario,
  createRegisteredPlotAndBaacRecord,
  validateRegistrationInput,
} from './farmScenarios';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';

test('applyForecastScenario switches cleanly between normal, drought, and flood outlooks', () => {
  const baseForecast = DEMO_PLOTS[0].forecast;

  const normal = applyForecastScenario(baseForecast, 'normal');
  const drought = applyForecastScenario(baseForecast, 'drought');
  const flood = applyForecastScenario(baseForecast, 'flood');

  assert.equal(normal.length, 7);
  assert.equal(drought.length, 7);
  assert.equal(flood.length, 7);

  // Drought drops Day 7 moisture sharply below 30%
  assert.ok(drought[6].soilMoistureIndex < 30);
  // Flood spikes Day 7 moisture above 90% and rain chance above 80%
  assert.ok(flood[6].soilMoistureIndex >= 90);
  assert.ok(flood[6].rainChancePercent >= 80);

  const droughtEval = evaluatePlotProfile(DEMO_PLOTS[0], 'demo', 'test', drought);
  const floodEval = evaluatePlotProfile(DEMO_PLOTS[0], 'demo', 'test', flood);

  assert.equal(droughtEval.riskLevel, 'critical');
  assert.equal(floodEval.riskLevel, 'critical');
  assert.ok(floodEval.healthScore < 60, `Expected flood score < 60, got ${floodEval.healthScore}`);
  assert.match(floodEval.earlyWarning.messageTh, /น้ำท่วม/);
  assert.match(floodEval.earlyWarning.messageEn ?? '', /Flood/);
});

test('validateRegistrationInput rejects invalid inputs in both TH and EN', () => {
  const invalidErrorsTh = validateRegistrationInput(
    {
      fullName: '',
      phoneNumber: '123',
      cropKey: 'corn',
      areaRai: 0,
      provinceKey: PROVINCE_PRESETS[0].key,
      districtName: 'อ.หนองไผ่',
      lat: 50,
      lon: 101,
      useCustomCoords: true,
    },
    'th'
  );
  assert.ok(invalidErrorsTh.fullName);
  assert.ok(invalidErrorsTh.phoneNumber);
  assert.ok(invalidErrorsTh.areaRai);
  assert.ok(invalidErrorsTh.coords);

  const invalidErrorsEn = validateRegistrationInput(
    {
      fullName: '',
      phoneNumber: '081-234-5678',
      cropKey: 'rice',
      areaRai: 12,
      provinceKey: PROVINCE_PRESETS[1].key,
      districtName: 'Mueang',
      lat: 14.88,
      lon: 103.49,
      useCustomCoords: false,
    },
    'en'
  );
  assert.match(invalidErrorsEn.fullName ?? '', /full name/i);
  assert.equal(invalidErrorsEn.phoneNumber, undefined);
});

test('createRegisteredPlotAndBaacRecord generates synchronized farmer plot and BAAC registry entry', () => {
  const { plot, baacRecord } = createRegisteredPlotAndBaacRecord(
    {
      fullName: 'สมหญิง ทุ่งทอง',
      phoneNumber: '089-777-8899',
      cropKey: 'cassava',
      areaRai: 20,
      provinceKey: 'korat',
      districtName: 'อ.ปากช่อง',
      lat: 14.7082,
      lon: 101.4161,
      useCustomCoords: false,
    },
    84
  );

  assert.equal(plot.ownerName, 'สมหญิง ทุ่งทอง');
  assert.equal(plot.areaRai, 20);
  assert.equal(plot.baselineScore, 84);
  assert.equal(baacRecord.farmerName, 'สมหญิง ทุ่งทอง');
  assert.equal(baacRecord.nasaHealthScore, 84);
  assert.equal(baacRecord.riskLevel, 'low');
  assert.equal(baacRecord.isNewlyRegistered, true);
});
