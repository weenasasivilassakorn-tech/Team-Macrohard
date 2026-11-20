import { jsPDF } from 'jspdf';
import type { AppLanguage, CreditApplicationRecord } from '../types/cropshield';
import { wrapTextByMeasure } from './baacPdfReport';
import { buildCreditReceiptPdfPayload } from './creditReceiptPdf';

const A4_WIDTH_PX = 1240;
const A4_HEIGHT_PX = 1754;
const FONT_STACK = '"IBM Plex Sans Thai", "Plus Jakarta Sans", system-ui, sans-serif';
const MONO_STACK = '"IBM Plex Mono", monospace';

export async function exportCreditReceiptPdf(
  record: CreditApplicationRecord,
  lang: AppLanguage
): Promise<string> {
  const payload = buildCreditReceiptPdfPayload(record, lang);
  const isTh = payload.lang === 'th';

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback font stack if font loading settles early
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH_PX;
  canvas.height = A4_HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(
      isTh
        ? 'ไม่สามารถสร้าง Canvas สำหรับใบเสร็จ PDF ได้'
        : 'Unable to initialize canvas for receipt PDF generation.'
    );
  }

  // White A4 background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  const marginX = 76;
  const contentWidth = A4_WIDTH_PX - marginX * 2;
  let cursorY = 82;

  // Brand & Header
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText('CropShield', marginX, cursorY);

  ctx.fillStyle = '#15803D';
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(payload.brandHeaderTag, A4_WIDTH_PX - marginX, cursorY - 4);
  ctx.textAlign = 'left';

  cursorY += 44;
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 28px ${FONT_STACK}`;
  ctx.fillText(payload.documentTitle, marginX, cursorY);

  cursorY += 32;
  ctx.fillStyle = '#475569';
  ctx.font = `400 18px ${FONT_STACK}`;
  ctx.fillText(payload.subtitle, marginX, cursorY);

  cursorY += 26;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, cursorY);
  ctx.lineTo(A4_WIDTH_PX - marginX, cursorY);
  ctx.stroke();

  cursorY += 38;

  // Receipt Status & Amount Banner Box
  const bannerH = 210;
  ctx.fillStyle = '#ECFDF5';
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, bannerH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#065F46';
  ctx.font = `700 17px ${FONT_STACK}`;
  ctx.fillText(payload.statusBadgeLabel, marginX + 32, cursorY + 42);

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 54px ${MONO_STACK}`;
  ctx.fillText(payload.requestedAmountLabel, marginX + 32, cursorY + 112);

  ctx.fillStyle = '#334155';
  ctx.font = `500 18px ${FONT_STACK}`;
  ctx.fillText(
    `${isTh ? 'วัตถุประสงค์' : 'Purpose'}: ${payload.purposeLabel}`,
    marginX + 32,
    cursorY + 156
  );

  ctx.fillStyle = '#475569';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText(
    `${isTh ? 'วันเวลาที่อนุมัติ' : 'Approved At'}: ${payload.approvedAtLabel}`,
    marginX + 32,
    cursorY + 186
  );

  // Right side Receipt Number Box
  const refBoxW = 330;
  const refBoxX = A4_WIDTH_PX - marginX - refBoxW - 26;
  const refBoxY = cursorY + 28;
  const refBoxH = bannerH - 56;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(refBoxX, refBoxY, refBoxW, refBoxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `600 15px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    isTh ? 'เลขที่ใบเสร็จอ้างอิง' : 'Receipt Reference No.',
    refBoxX + refBoxW / 2,
    refBoxY + 38
  );
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 22px ${MONO_STACK}`;
  ctx.fillText(payload.receiptNumber, refBoxX + refBoxW / 2, refBoxY + 78);

  ctx.fillStyle = '#15803D';
  ctx.font = `600 16px ${FONT_STACK}`;
  ctx.fillText(
    `NASA Score ${payload.nasaScoreLabel}`,
    refBoxX + refBoxW / 2,
    refBoxY + 118
  );
  ctx.textAlign = 'left';

  cursorY += bannerH + 40;

  // Section 1: Farmer & Plot Details Table
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? '1. รายละเอียดผู้กู้และแปลงเกษตรที่ใช้รับรองสิทธิ์'
      : '1. Borrower & Verified Farm Plot Details',
    marginX,
    cursorY
  );
  cursorY += 20;

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    {
      label: isTh ? 'ชื่อ-นามสกุล เกษตรกร' : 'Farmer Name',
      value: payload.farmerName,
    },
    {
      label: isTh ? 'เบอร์โทรศัพท์รับเงิน/แจ้งเตือน' : 'Registered Mobile',
      value: payload.phoneNumber,
      mono: true,
    },
    {
      label: isTh ? 'ชื่อแปลงเกษตร' : 'Monitored Plot Name',
      value: payload.plotName,
    },
    {
      label: isTh ? 'ชนิดพืชและขนาดพื้นที่' : 'Crop & Area',
      value: `${payload.cropType} · ${payload.areaRaiLabel}`,
    },
    {
      label: isTh ? 'จังหวัด / พื้นที่' : 'Province / Location',
      value: payload.provinceLabel,
    },
    {
      label: isTh ? 'คะแนนสุขภาพแปลง NASA' : 'NASA Farm Health Score',
      value: `${payload.nasaScoreLabel} (${payload.riskLabel})`,
    },
  ];

  const rowH = 62;
  const tableH = rows.length * rowH;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, tableH, 12);
  ctx.fill();
  ctx.stroke();

  rows.forEach((r, idx) => {
    const ry = cursorY + idx * rowH;
    if (idx > 0) {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX, ry);
      ctx.lineTo(marginX + contentWidth, ry);
      ctx.stroke();
    }
    if (idx % 2 === 0) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(marginX + 1, ry + 1, contentWidth - 2, rowH - 2);
    }
    ctx.fillStyle = '#475569';
    ctx.font = `600 18px ${FONT_STACK}`;
    ctx.fillText(r.label, marginX + 26, ry + 38);

    ctx.fillStyle = '#0F172A';
    ctx.font = r.mono ? `700 19px ${MONO_STACK}` : `700 19px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillText(r.value, A4_WIDTH_PX - marginX - 26, ry + 38);
    ctx.textAlign = 'left';
  });

  cursorY += tableH + 40;

  // Section 2: Collateral Verification & Disbursement Notice
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? '2. การรับรอง Data Collateral และกำหนดโอนเงินทุนหมุนเวียน'
      : '2. Data Collateral Verification & Disbursement Terms',
    marginX,
    cursorY
  );
  cursorY += 20;

  ctx.font = `400 18px ${FONT_STACK}`;
  const colLines = wrapTextByMeasure(
    payload.collateralVerificationNote,
    contentWidth - 52,
    (t) => ctx.measureText(t).width
  );
  const disbLines = wrapTextByMeasure(
    payload.disbursementNote,
    contentWidth - 52,
    (t) => ctx.measureText(t).width
  );

  const noteBoxH = 44 + colLines.length * 28 + disbLines.length * 28 + 36;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, noteBoxH, 12);
  ctx.fill();
  ctx.stroke();

  let noteY = cursorY + 40;
  ctx.fillStyle = '#1E293B';
  ctx.font = `400 18px ${FONT_STACK}`;
  colLines.forEach((line) => {
    ctx.fillText(line, marginX + 26, noteY);
    noteY += 28;
  });
  noteY += 14;
  ctx.fillStyle = '#065F46';
  ctx.font = `600 18px ${FONT_STACK}`;
  disbLines.forEach((line) => {
    ctx.fillText(line, marginX + 26, noteY);
    noteY += 28;
  });

  cursorY += noteBoxH + 46;

  // Digital Seal Box
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, 108, 12);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#15803D';
  ctx.font = `700 18px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? '✓ รับรองความถูกต้องทางดิจิทัลโดยระบบ CropShield × NASA POWER Telemetry'
      : '✓ Digitally Verified by CropShield × NASA POWER Satellite Telemetry',
    marginX + 28,
    cursorY + 44
  );
  ctx.fillStyle = '#475569';
  ctx.font = `400 16px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? `รหัสอ้างอิงธุรกรรม: ${payload.receiptNumber} · สามารถแสดงไฟล์ PDF นี้ต่อเจ้าหน้าที่ ธ.ก.ส. ได้ทันที`
      : `Transaction Reference: ${payload.receiptNumber} · Present this PDF to any BAAC officer if requested.`,
    marginX + 28,
    cursorY + 78
  );

  // Signatures near bottom
  const signY = A4_HEIGHT_PX - 150;
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX + 20, signY);
  ctx.lineTo(marginX + 360, signY);
  ctx.moveTo(A4_WIDTH_PX - marginX - 360, signY);
  ctx.lineTo(A4_WIDTH_PX - marginX - 20, signY);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    isTh ? `ผู้ขอรับวงเงิน (${payload.farmerName})` : `Applicant (${payload.farmerName})`,
    marginX + 190,
    signY + 30
  );
  ctx.fillText(
    isTh ? 'ระบบอนุมัติสินเชื่ออัตโนมัติ CropShield / ธ.ก.ส.' : 'CropShield / BAAC Automated Approval System',
    A4_WIDTH_PX - marginX - 190,
    signY + 30
  );
  ctx.textAlign = 'left';

  ctx.fillStyle = '#94A3B8';
  ctx.font = `400 14px ${FONT_STACK}`;
  ctx.fillText(payload.footerNote, marginX, A4_HEIGHT_PX - 52);

  const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
  doc.save(payload.filename);

  return payload.filename;
}
