import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THAILAND_SVG_VIEWBOX,
  buildThailandOutlineSvgPath,
  computeParcelGeometryFromRai,
  projectLatLonToThailandSvg,
} from './offlineMapGeometry';

test('projectLatLonToThailandSvg places northern plots above southern plots and western left of eastern', () => {
  const chiangMai = projectLatLonToThailandSvg(18.6274, 98.8952);
  const surin = projectLatLonToThailandSvg(14.8829, 103.4937);
  const bangkok = projectLatLonToThailandSvg(13.75, 100.5);

  assert.ok(chiangMai.y < bangkok.y, 'Chiang Mai must sit north (lower Y) than Bangkok');
  assert.ok(chiangMai.x < surin.x, 'Chiang Mai must sit west (lower X) than Surin');
  assert.ok(chiangMai.x >= 0 && chiangMai.x <= THAILAND_SVG_VIEWBOX.width);
  assert.ok(surin.y >= 0 && surin.y <= THAILAND_SVG_VIEWBOX.height);

  const path = buildThailandOutlineSvgPath();
  assert.ok(path.startsWith('M ') && path.endsWith(' Z'));
});

test('computeParcelGeometryFromRai calculates realistic Rai area and corner coordinates', () => {
  const parcel = computeParcelGeometryFromRai(16.0124, 101.0567, 25);
  assert.equal(parcel.areaSqm, 40000);
  assert.equal(parcel.cornerCoords.length, 4);
  assert.ok(parcel.cornerCoords[0].lat > 16.0124);
  assert.ok(parcel.cornerCoords[2].lat < 16.0124);
  assert.equal(parcel.scaleBarMeters, 200);
});
