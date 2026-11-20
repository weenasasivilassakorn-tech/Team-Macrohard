import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';
import {
  buildCreditApplicationRecord,
  buildCreditReceiptPdfPayload,
  generateCreditReceiptNumber,
} from './creditReceiptPdf';

test('generateCreditReceiptNumber formats sequential YYYYMMDD receipt codes', () => {
  const fixedDate = new Date('2026-11-13T10:15:00Z');
  assert.equal(generateCreditReceiptNumber(0, fixedDate), 'CS-CR-20261113-001');
  assert.equal(generateCreditReceiptNumber(11, fixedDate), 'CS-CR-20261113-012');
});

test('buildCreditApplicationRecord and buildCreditReceiptPdfPayload build complete bilingual receipt metadata', () => {
  const plot = DEMO_PLOTS[0];
  const evaluation = evaluatePlotProfile(plot, 'demo', 'Demo');
  const fixedDate = new Date('2026-11-13T10:15:00Z');

  const record = buildCreditApplicationRecord({
    plot,
    evaluation,
    user: {
      fullName: 'สมชาย รักษ์ดิน',
      phoneNumber: '081-234-5678',
      lineAccountLabel: '@CropShield-Somchai',
      registeredAtLabel: 'CropShield Verified',
      isCustomRegistered: false,
    },
    amountThb: 25000,
    purposeTh: 'เปิดระบบน้ำเสริมและค่าไฟฟ้า/น้ำมันสูบน้ำ',
    existingCount: 2,
    lang: 'th',
    now: fixedDate,
  });

  assert.equal(record.status, 'approved');
  assert.equal(record.receiptNumber, 'CS-CR-20261113-003');
  assert.equal(record.requestedAmountThb, 25000);
  assert.equal(record.nasaHealthScore, evaluation.healthScore);

  const payloadTh = buildCreditReceiptPdfPayload(record, 'th');
  assert.equal(
    payloadTh.filename,
    'CropShield-Credit-Receipt-CS-CR-20261113-003.pdf'
  );
  assert.match(payloadTh.requestedAmountLabel, /฿25,000/);
  assert.match(payloadTh.collateralVerificationNote, new RegExp(plot.name));

  const payloadEn = buildCreditReceiptPdfPayload(record, 'en');
  assert.equal(payloadEn.lang, 'en');
  assert.match(payloadEn.statusBadgeLabel, /PRE-APPROVED/i);
  assert.match(payloadEn.disbursementNote, /24 hours/i);
});
