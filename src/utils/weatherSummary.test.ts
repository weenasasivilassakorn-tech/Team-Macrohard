import test from 'node:test';
import assert from 'node:assert/strict';
import { applyForecastScenario } from './farmScenarios';
import {
  DEMO_PLOTS,
  evaluatePlotProfile,
  extractNasaWeatherTelemetry,
} from './nasaPower';
import { computeWeatherTrendSummary } from './weatherSummary';

test('extractNasaWeatherTelemetry parses T2M, PRECTOTCORR, RH2M and skips -999 fill values', () => {
  const rawNasa = {
    properties: {
      parameter: {
        T2M: { '20250601': 31.2, '20250602': -999, '20250603': 33.4 },
        PRECTOTCORR: { '20250601': 4.5, '20250602': 0.0, '20250603': -999 },
        RH2M: { '20250601': 72, '20250602': 68, '20250603': 64 },
      },
    },
  };

  const telemetry = extractNasaWeatherTelemetry(rawNasa);
  assert.equal(telemetry.observations.length, 3);
  assert.equal(telemetry.observations[0].labelShort, '06/01');
  assert.equal(telemetry.observations[0].precipMm, 4.5);
  assert.equal(telemetry.observations[0].tempC, 31.2);
  // Missing T2M on 20250602 falls back to recent average (32.3) instead of -999
  assert.ok(telemetry.observations[1].tempC > 25 && telemetry.observations[1].tempC < 40);
  assert.ok(telemetry.observedTotalPrecipMm >= 4.5);
  assert.equal(telemetry.observedAvgHumidityPercent, 68);
});

test('computeWeatherTrendSummary reflects drought heat surge vs flood precipitation spike', () => {
  const cornPlot = DEMO_PLOTS[0];
  const normalEval = evaluatePlotProfile(cornPlot, 'demo', 'Demo');
  const droughtEval = evaluatePlotProfile(
    cornPlot,
    'demo',
    'Drought',
    applyForecastScenario(cornPlot.forecast, 'drought')
  );
  const floodEval = evaluatePlotProfile(
    cornPlot,
    'demo',
    'Flood',
    applyForecastScenario(cornPlot.forecast, 'flood')
  );

  const normalWeather = computeWeatherTrendSummary(cornPlot, normalEval, 'normal');
  const droughtWeather = computeWeatherTrendSummary(cornPlot, droughtEval, 'drought');
  const floodWeather = computeWeatherTrendSummary(cornPlot, floodEval, 'flood');

  assert.equal(normalWeather.outlookPoints.length, 7);
  assert.ok(
    droughtWeather.peakTempMaxC > floodWeather.peakTempMaxC,
    `Expected drought peak ${droughtWeather.peakTempMaxC} > flood peak ${floodWeather.peakTempMaxC}`
  );
  assert.ok(
    floodWeather.totalForecastPrecipMm > droughtWeather.totalForecastPrecipMm * 10,
    `Expected flood rain ${floodWeather.totalForecastPrecipMm} >> drought rain ${droughtWeather.totalForecastPrecipMm}`
  );
  assert.match(floodWeather.insightEn, /drainage|rainfall/i);
  assert.match(droughtWeather.insightEn, /evaporation|heat/i);
});

test('computeWeatherTrendSummary uses live NASA POWER telemetry when attached to evaluation', () => {
  const ricePlot = DEMO_PLOTS[1];
  const telemetry = extractNasaWeatherTelemetry({
    properties: {
      parameter: {
        T2M: { '20250701': 29.5, '20250702': 30.1 },
        PRECTOTCORR: { '20250701': 12.4, '20250702': 8.6 },
        RH2M: { '20250701': 81, '20250702': 79 },
      },
    },
  });

  const liveEval = evaluatePlotProfile(
    ricePlot,
    'nasa-live',
    'Live NASA',
    ricePlot.forecast,
    telemetry
  );

  const summary = computeWeatherTrendSummary(ricePlot, liveEval, 'normal');
  assert.equal(summary.isLiveNasaTelemetry, true);
  assert.equal(summary.observedTotalPrecipMm, 21);
  assert.equal(summary.observedAvgTempC, 29.8);
  assert.equal(summary.avgHumidityPercent, 80);
});
