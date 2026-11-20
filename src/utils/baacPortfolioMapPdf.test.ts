import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_FARMER_RECORDS } from '../data/mockFarmers';
import {
  buildBaacPortfolioMapPdfPayload,
  buildBaacPortfolioMapShareText,
} from './baacPortfolioMapPdf';

test('buildBaacPortfolioMapPdfPayload summarizes all portfolio plots and coordinates accurately', () => {
  const payload = buildBaacPortfolioMapPdfPayload(
    INITIAL_FARMER_RECORDS,
    'soil-health',
    'normal',
    'th',
    new Date('2025-11-15T10:30:00Z')
  );

  assert.equal(payload.filename, 'baac-portfolio-farm-map-20251115.pdf');
  assert.equal(payload.totalPlots, INITIAL_FARMER_RECORDS.length);
  assert.ok(payload.totalRai > 0);
  assert.equal(
    payload.normalCount + payload.watchCount + payload.criticalCount,
    INITIAL_FARMER_RECORDS.length
  );
  assert.equal(payload.rows.length, INITIAL_FARMER_RECORDS.length);
  assert.match(payload.rows[0].coordLabel, /\d+\.\d+°N,\s*\d+\.\d+°E/);
});

test('buildBaacPortfolioMapShareText builds Thai and English summary with priority alerts', () => {
  const thText = buildBaacPortfolioMapShareText(INITIAL_FARMER_RECORDS, 'risk-7d', 'drought', 'th');
  assert.match(thText, /รายงานแผนที่ดูไร่ดูพื้นที่เกษตรกร ธ\.ก\.ส\./);
  assert.match(thText, /พอร์ตทั้งหมด/);

  const enText = buildBaacPortfolioMapShareText(INITIAL_FARMER_RECORDS, 'soil-health', 'normal', 'en');
  assert.match(enText, /BAAC Regional Farm Map Report/);
  assert.match(enText, /Portfolio:/);
});
