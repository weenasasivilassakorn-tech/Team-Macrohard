import test from 'node:test';
import assert from 'node:assert/strict';
import { applyForecastScenario } from './farmScenarios';
import {
  computeIoTSensorReading,
  computeSoilHealthGrid,
  computeZoneIoTSensorReading,
} from './iotSoilSensor';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';

test('computeIoTSensorReading aligns with NASA satellite baseline and provides two soil depths', () => {
  const cornPlot = DEMO_PLOTS[0];
  const evaluation = evaluatePlotProfile(cornPlot, 'demo', 'Demo');
  const reading = computeIoTSensorReading(cornPlot, evaluation, 'normal', 0);

  assert.equal(reading.nodeId, 'CS-PROBE-PHB01');
  assert.equal(reading.nasaSurfaceMoisture, cornPlot.forecast[0].soilMoistureIndex);
  assert.equal(reading.hourlySeries.length, 6);
  assert.equal(reading.hourlySeries[5].hourLabel, 'Now');
  assert.equal(reading.hourlySeries[5].surface10cm, reading.surfaceMoisture10cm);
  assert.ok(
    reading.rootZoneMoisture30cm >= reading.surfaceMoisture10cm,
    'Root zone at 30cm retains equal or higher moisture in normal conditions'
  );
  assert.equal(
    reading.deltaVsNasaPercent,
    reading.surfaceMoisture10cm - reading.nasaSurfaceMoisture
  );
});

test('computeIoTSensorReading shifts to dry under drought scenario and saturated under flood scenario', () => {
  const sugarcanePlot = DEMO_PLOTS[2];
  const droughtEval = evaluatePlotProfile(
    sugarcanePlot,
    'demo',
    'Drought',
    applyForecastScenario(sugarcanePlot.forecast, 'drought')
  );
  const floodEval = evaluatePlotProfile(
    sugarcanePlot,
    'demo',
    'Flood',
    applyForecastScenario(sugarcanePlot.forecast, 'flood')
  );

  const droughtReading = computeIoTSensorReading(sugarcanePlot, droughtEval, 'drought', 0);
  const floodReading = computeIoTSensorReading(sugarcanePlot, floodEval, 'flood', 0);

  assert.ok(droughtReading.soilTempC > floodReading.soilTempC);
  assert.ok(floodReading.surfaceMoisture10cm > droughtReading.surfaceMoisture10cm);
  assert.equal(floodReading.statusLevel, 'optimal'); // Day 1 starts at 68 + shifts
});

test('computeIoTSensorReading responds to live polling steps within safe bounds', () => {
  const ricePlot = DEMO_PLOTS[1];
  const evaluation = evaluatePlotProfile(ricePlot, 'demo', 'Demo');
  const r0 = computeIoTSensorReading(ricePlot, evaluation, 'normal', 0, '19:00');
  const r1 = computeIoTSensorReading(ricePlot, evaluation, 'normal', 1, '19:01');

  assert.equal(r1.lastPolledLabel, '19:01');
  assert.ok(r1.surfaceMoisture10cm >= 16 && r1.surfaceMoisture10cm <= 98);
  assert.ok(Math.abs(r1.surfaceMoisture10cm - r0.surfaceMoisture10cm) <= 4);
});

test('computeSoilHealthGrid generates 24 spatial cells reflecting moisture, nutrient EC, and scenario stress', () => {
  const cornPlot = DEMO_PLOTS[0];
  const normalEval = evaluatePlotProfile(cornPlot, 'demo', 'Normal');
  const normalReading = computeIoTSensorReading(cornPlot, normalEval, 'normal', 0);
  const normalGrid = computeSoilHealthGrid(cornPlot, normalReading, 'normal');

  assert.equal(normalGrid.rows, 4);
  assert.equal(normalGrid.cols, 6);
  assert.equal(normalGrid.cells.length, 24);
  assert.equal(
    normalGrid.optimalZoneCount + normalGrid.watchZoneCount + normalGrid.criticalZoneCount,
    24
  );
  assert.equal(normalGrid.cells.filter((c) => c.hasSensorNode).length, 3);
  assert.equal(normalGrid.cells[0].zoneCode, 'A1');
  assert.equal(normalGrid.cells[23].zoneCode, 'D6');

  const droughtEval = evaluatePlotProfile(
    cornPlot,
    'demo',
    'Drought',
    applyForecastScenario(cornPlot.forecast, 'drought')
  );
  const droughtReading = computeIoTSensorReading(cornPlot, droughtEval, 'drought', 0);
  const droughtGrid = computeSoilHealthGrid(cornPlot, droughtReading, 'drought');

  assert.ok(
    droughtGrid.watchZoneCount + droughtGrid.criticalZoneCount >
      normalGrid.watchZoneCount + normalGrid.criticalZoneCount ||
      droughtGrid.avgNutrientScore < normalGrid.avgNutrientScore,
    'Drought scenario should degrade spatial zone health or nutrient balance'
  );
});

test('computeZoneIoTSensorReading maps selected spatial grid cell to synchronized zone sensor telemetry', () => {
  const cornPlot = DEMO_PLOTS[0];
  const evaluation = evaluatePlotProfile(cornPlot, 'demo', 'Normal');
  const baseReading = computeIoTSensorReading(cornPlot, evaluation, 'normal', 0);
  const grid = computeSoilHealthGrid(cornPlot, baseReading, 'normal');

  const targetCell = grid.cells.find((c) => c.zoneCode === 'D6')!;
  const zoneReading = computeZoneIoTSensorReading(baseReading, targetCell);

  assert.equal(zoneReading.surfaceMoisture10cm, targetCell.moisturePercent);
  assert.equal(zoneReading.ecDsPerM, targetCell.ecDsPerM);
  assert.equal(zoneReading.hourlySeries[5].surface10cm, targetCell.moisturePercent);
  assert.ok(zoneReading.calibrationNoteTh.includes('D6'));
  assert.ok(zoneReading.calibrationNoteEn.includes('D6'));
});


