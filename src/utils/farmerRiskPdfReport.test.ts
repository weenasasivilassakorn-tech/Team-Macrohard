import test from 'node:test';
import assert from 'node:assert/strict';
import { accountToRegisteredProfile, SEED_ACCOUNTS } from './authAccounts';
import { applyForecastScenario } from './farmScenarios';
import { buildFarmerRiskPdfPayload } from './farmerRiskPdfReport';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';

test('buildFarmerRiskPdfPayload formats bilingual Thai & English NASA evaluation summary for bank sharing', () => {
  const plot = DEMO_PLOTS[0];
  const evaluation = evaluatePlotProfile(plot, 'nasa-live', 'Live NASA POWER');
  const user = accountToRegisteredProfile(SEED_ACCOUNTS[0]);
  const fixedDate = new Date('2026-11-14T04:00:00Z');

  const payloadTh = buildFarmerRiskPdfPayload({
    plot,
    evaluation,
    user,
    creditState: {
      status: 'submitted',
      requestedAmountThb: 18000,
      purposeTh: 'เปิดระบบน้ำเสริม',
      submittedAtLabel: 'ยื่นขอเวลา 10:30 น.',
    },
    shieldState: {
      active: true,
      coverageThb: plot.parametricCoverageThb,
      triggerConditionTh: plot.parametricTriggerTh,
    },
    scenario: 'normal',
    lang: 'th',
    now: fixedDate,
  });

  assert.equal(
    payloadTh.filename,
    'CropShield-NASA-Plot-Summary-plot-phetchabun-corn.pdf'
  );
  assert.equal(payloadTh.healthScoreLabel, '78 / 100');
  assert.equal(payloadTh.preApprovedCreditLabel, '฿60,000');
  assert.equal(payloadTh.forecastRows.length, 7);
  assert.match(payloadTh.creditRequestStatusLabel, /18,000/);
  assert.match(payloadTh.insuranceStatusLabel, /เปิดคุ้มครอง/);
  assert.match(payloadTh.coordinatesLabel, /16\.0124°N/);

  const payloadEn = buildFarmerRiskPdfPayload({
    plot,
    evaluation,
    user,
    creditState: {
      status: 'eligible',
      requestedAmountThb: 18000,
      purposeTh: '',
    },
    shieldState: {
      active: false,
      coverageThb: plot.parametricCoverageThb,
      triggerConditionTh: plot.parametricTriggerTh,
    },
    scenario: 'normal',
    lang: 'en',
    now: fixedDate,
  });

  assert.match(payloadEn.documentTitle, /NASA Satellite Plot Health/);
  assert.match(payloadEn.dataOriginLabel, /Live NASA POWER API/);
  assert.match(payloadEn.creditRequestStatusLabel, /Eligible for Pre-Approved/);
  assert.match(payloadEn.insuranceStatusLabel, /Not Activated/);
});

test('buildFarmerRiskPdfPayload reflects drought scenario escalation and live NASA weather telemetry', () => {
  const plot = DEMO_PLOTS[0];
  const droughtForecast = applyForecastScenario(plot.forecast, 'drought');
  const evaluation = evaluatePlotProfile(
    plot,
    'nasa-live',
    'Live NASA',
    droughtForecast,
    {
      observations: [],
      observedAvgTempC: 35.4,
      observedTotalPrecipMm: 4.2,
      observedAvgHumidityPercent: 52,
      sourceTag: 'NASA POWER',
    }
  );
  const user = accountToRegisteredProfile(SEED_ACCOUNTS[0]);

  const payload = buildFarmerRiskPdfPayload({
    plot,
    evaluation,
    user,
    creditState: {
      status: 'eligible',
      requestedAmountThb: 18000,
      purposeTh: '',
    },
    shieldState: {
      active: false,
      coverageThb: plot.parametricCoverageThb,
      triggerConditionTh: plot.parametricTriggerTh,
    },
    scenario: 'drought',
    lang: 'en',
  });

  assert.equal(payload.riskLevel, 'critical');
  assert.ok(payload.healthScore < 60);
  assert.ok(payload.liveWeatherSummaryLine);
  assert.match(payload.liveWeatherSummaryLine!, /4\.2 mm/);
  assert.match(payload.scenarioLabel, /Drought/);
});
