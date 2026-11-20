import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNasaPowerPointQueryUrl } from './nasaPower';
import { buildNasaMapPdfPayload, buildNasaMapShareText } from './nasaPowerMapReport';

const SAMPLE_TELEMETRY = {
  observations: [
    { dateKey: '20251105', labelShort: '11/05', precipMm: 0.4, tempC: 29.8, humidityPercent: 72 },
    { dateKey: '20251106', labelShort: '11/06', precipMm: 2.6, tempC: 28.9, humidityPercent: 78 },
    { dateKey: '20251107', labelShort: '11/07', precipMm: 0.0, tempC: 30.4, humidityPercent: 69 },
  ],
  observedAvgTempC: 29.7,
  observedTotalPrecipMm: 3.0,
  observedAvgHumidityPercent: 73,
  observedSoilWetnessPercent: 74,
  elevationMeters: 296.3,
  sourceTag: 'NASA POWER · T2M / PRECTOTCORR / RH2M',
};

test('buildNasaPowerPointQueryUrl caps future system year cleanly to 2025', () => {
  const url = buildNasaPowerPointQueryUrl(16.0124, 101.0567, new Date('2026-11-15T12:00:00Z'));
  assert.ok(url.includes('https://power.larc.nasa.gov/api/temporal/daily/point'));
  assert.ok(url.includes('latitude=16.0124'));
  assert.ok(url.includes('longitude=101.0567'));
  assert.ok(url.includes('start=20251104&end=20251111'));
  assert.ok(url.includes('GWETTOP'));
});

test('buildNasaMapShareText formats complete Thai and English NASA POWER map summaries', () => {
  const thText = buildNasaMapShareText({
    lang: 'th',
    plotTitle: 'แปลงข้าวโพด อ.หนองไผ่',
    lat: 16.0124,
    lon: 101.0567,
    areaRai: 24,
    provinceLabel: 'เพชรบูรณ์',
    activeLayer: 'power-hybrid',
    telemetry: SAMPLE_TELEMETRY,
    soilMoisturePercent: 74,
    tempC: 29.7,
    precipLabel: '3.0 mm',
    humidityPercent: 73,
    elevationMeters: 296.3,
    healthScore: 78,
    riskSummaryText: 'เฝ้าระวังความชื้นลด 18%',
  });

  assert.ok(thText.includes('แปลงข้าวโพด อ.หนองไผ่'));
  assert.ok(thText.includes('16.0124°N, 101.0567°E'));
  assert.ok(thText.includes('https://maps.google.com/?q=16.0124,101.0567'));
  assert.ok(thText.includes('MERRA2_16.00N_101.250E'));
  assert.ok(thText.includes('74%'));
  assert.ok(thText.includes('29.7°C'));

  const enText = buildNasaMapShareText({
    lang: 'en',
    plotTitle: 'Feed Corn Plot',
    lat: 16.0124,
    lon: 101.0567,
    areaRai: 24,
    provinceLabel: 'Phetchabun',
    activeLayer: 'nasa-ndvi',
    telemetry: SAMPLE_TELEMETRY,
    soilMoisturePercent: 74,
    tempC: 29.7,
    precipLabel: '3.0 mm',
    humidityPercent: 73,
    healthScore: 78,
  });

  assert.ok(enText.includes('CropShield NASA POWER Map Report'));
  assert.ok(enText.includes('78/100'));
});

test('buildNasaMapPdfPayload produces valid filename, MERRA-2 bounds, and 7-day observations', () => {
  const payload = buildNasaMapPdfPayload(
    {
      lang: 'th',
      plotTitle: 'แปลงข้าวโพด อ.หนองไผ่',
      lat: 16.0124,
      lon: 101.0567,
      areaRai: 24,
      provinceLabel: 'เพชรบูรณ์',
      activeLayer: 'power-hybrid',
      telemetry: SAMPLE_TELEMETRY,
      soilMoisturePercent: 74,
      tempC: 29.7,
      precipLabel: '3.0 mm',
      humidityPercent: 73,
      elevationMeters: 296.3,
      healthScore: 78,
    },
    new Date('2026-11-15T09:00:00Z')
  );

  assert.match(payload.filename, /^cropshield-nasa-map-.*-20261115\.pdf$/);
  assert.equal(payload.merraCellId, 'MERRA2_16.00N_101.250E');
  assert.equal(payload.metrics.soilWetness, '74%');
  assert.equal(payload.metrics.elevation, '296.3 m');
  assert.equal(payload.observations.length, 3);
  assert.equal(payload.observations[1].precipLabel, '2.6 mm');
});
