import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNasaGibsTileUrl,
  buildNasaPowerSurroundingGrid,
  buildNasaPowerViewerUrl,
  computeNasaPowerGridCell,
  getNasaGibsDateString,
} from './nasaPowerMap';

test('computeNasaPowerGridCell snaps Thai farm coordinates to MERRA-2 0.5x0.625 grid', () => {
  const cell = computeNasaPowerGridCell(16.0124, 101.0567);

  assert.equal(cell.centerLat, 16.0);
  assert.equal(cell.centerLon, 101.25);
  assert.equal(cell.southLat, 15.75);
  assert.equal(cell.northLat, 16.25);
  assert.equal(cell.westLon, 100.9375);
  assert.equal(cell.eastLon, 101.5625);
  assert.equal(cell.isPrimary, true);
  assert.ok(cell.widthKm > 60 && cell.widthKm < 70);
  assert.ok(cell.heightKm > 50 && cell.heightKm < 60);
});

test('buildNasaPowerSurroundingGrid generates 9 contiguous cells with 1 primary cell', () => {
  const cells = buildNasaPowerSurroundingGrid(14.8829, 103.4937);

  assert.equal(cells.length, 9);
  assert.equal(cells.filter((c) => c.isPrimary).length, 1);

  const primary = cells.find((c) => c.isPrimary)!;
  assert.ok(primary.southLat <= 14.8829 && 14.8829 <= primary.northLat);
  assert.ok(primary.westLon <= 103.4937 && 103.4937 <= primary.eastLon);
});

test('getNasaGibsDateString and buildNasaGibsTileUrl generate valid settled GIBS endpoints', () => {
  const futureDate = new Date('2026-11-13T12:00:00Z');
  const dateStr = getNasaGibsDateString(futureDate);

  assert.equal(dateStr, '2025-11-08');

  const modisUrl = buildNasaGibsTileUrl('MODIS_Terra_CorrectedReflectance_TrueColor', dateStr);
  assert.ok(modisUrl.includes('gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor'));
  assert.ok(modisUrl.includes('2025-11-08'));

  const ndviUrl = buildNasaGibsTileUrl('MODIS_Terra_NDVI_8Day', dateStr);
  assert.ok(ndviUrl.includes('MODIS_Terra_NDVI_8Day'));

  const viewerUrl = buildNasaPowerViewerUrl(16.0124, 101.0567);
  assert.equal(viewerUrl, 'https://power.larc.nasa.gov/data-access-viewer/?lat=16.0124&lon=101.0567');
});
