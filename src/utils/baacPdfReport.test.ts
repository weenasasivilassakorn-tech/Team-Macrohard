import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_FARMER_RECORDS } from '../data/mockFarmers';
import { computePortfolioKpis } from './nasaPower';
import { buildBaacReportPayload, wrapTextByMeasure } from './baacPdfReport';

test('buildBaacReportPayload formats farmer risk summary and filename for loan committee', () => {
  const kpis = computePortfolioKpis(INITIAL_FARMER_RECORDS);
  const somchai = INITIAL_FARMER_RECORDS[0];
  const fixedDate = new Date('2026-11-14T03:30:00Z');

  const payload = buildBaacReportPayload(somchai, kpis, fixedDate);

  assert.equal(payload.filename, 'CropShield-BAAC-Risk-Report-baac-001.pdf');
  assert.equal(payload.nasaHealthScoreLabel, '78 / 100');
  assert.equal(payload.loanLimitLabel, '฿60,000');
  assert.equal(payload.trancheProgressLabel, 'งวดที่ 1 จาก 3');
  assert.match(payload.riskLabelTh, /เฝ้าระวัง/);
  assert.match(payload.portfolioSummaryLineTh, /6 แปลง/);
  assert.equal(payload.mitigationReasonsTh.length, 3);
});

test('buildBaacReportPayload reflects critical farmer tranche hold recommendation', () => {
  const kpis = computePortfolioKpis(INITIAL_FARMER_RECORDS);
  const criticalFarmer = INITIAL_FARMER_RECORDS.find((f) => f.riskLevel === 'critical')!;

  const payload = buildBaacReportPayload(criticalFarmer, kpis);
  assert.equal(payload.filename, 'CropShield-BAAC-Risk-Report-baac-003.pdf');
  assert.match(payload.trancheHeadlineTh, /ชะลอการปล่อยกู้เพิ่ม/);
});

test('wrapTextByMeasure splits long Thai text cleanly without dropping words', () => {
  const sample =
    'ระบบเตือนภัยล่วงหน้า 7 วันช่วยชี้เป้าให้ปล่อยงวดที่ 2 เฉพาะค่าสูบน้ำเสริม ป้องกันผลผลิตเสียหายก่อนวิกฤต';
  const lines = wrapTextByMeasure(sample, 240, (str) => str.length * 10);

  assert.ok(lines.length >= 3, `Expected >= 3 wrapped lines, got ${lines.length}`);
  assert.equal(lines.join(' ').replace(/\s+/g, ''), sample.replace(/\s+/g, ''));
});
