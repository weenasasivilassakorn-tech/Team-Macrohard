import { jsPDF } from 'jspdf';
import type { BaacPortfolioKpis, FarmerLoanRecord } from '../types/cropshield';
import { buildBaacReportPayload, wrapTextByMeasure } from './baacPdfReport';

const A4_WIDTH_PX = 1240;
const A4_HEIGHT_PX = 1754;
const FONT_STACK = '"IBM Plex Sans Thai", "Plus Jakarta Sans", system-ui, sans-serif';
const MONO_STACK = '"IBM Plex Mono", monospace';

export async function exportFarmerRiskPdf(
  farmer: FarmerLoanRecord,
  kpis: BaacPortfolioKpis
): Promise<string> {
  const payload = buildBaacReportPayload(farmer, kpis);

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback fonts if font loading settles early
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH_PX;
  canvas.height = A4_HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง Canvas สำหรับส่งออก PDF ได้');
  }

  // White A4 background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  const marginX = 72;
  const contentWidth = A4_WIDTH_PX - marginX * 2;
  let cursorY = 76;

  // Top Brand & Document Header
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText('CropShield', marginX, cursorY);

  ctx.fillStyle = '#15803D';
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText('รายงานสำหรับคณะกรรมการสินเชื่อ · ธ.ก.ส.', A4_WIDTH_PX - marginX, cursorY - 4);
  ctx.textAlign = 'left';

  cursorY += 38;
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 26px ${FONT_STACK}`;
  ctx.fillText(payload.documentTitleTh, marginX, cursorY);

  cursorY += 30;
  ctx.fillStyle = '#475569';
  ctx.font = `400 18px ${FONT_STACK}`;
  ctx.fillText(`${payload.subtitleTh}  ·  ${payload.generatedAtLabel}`, marginX, cursorY);

  cursorY += 24;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, cursorY);
  ctx.lineTo(A4_WIDTH_PX - marginX, cursorY);
  ctx.stroke();

  cursorY += 42;

  // Farmer Profile & Score Box
  const boxTop = cursorY;
  const boxHeight = 200;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(marginX, boxTop, contentWidth, boxHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText('ข้อมูลผู้ขอสินเชื่อ / กลุ่มสหกรณ์', marginX + 28, boxTop + 36);

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 26px ${FONT_STACK}`;
  ctx.fillText(payload.farmerName, marginX + 28, boxTop + 74);

  ctx.fillStyle = '#334155';
  ctx.font = `400 19px ${FONT_STACK}`;
  ctx.fillText(
    `${payload.cooperativeName}  ·  ${payload.province}`,
    marginX + 28,
    boxTop + 110
  );
  ctx.fillText(
    `พืชหลัก: ${payload.cropType}  ·  ขนาดแปลง: ${payload.areaRaiLabel}  ·  ประหยัดค่าตรวจแปลง: ${payload.savedInspectionCostLabel}`,
    marginX + 28,
    boxTop + 144
  );
  ctx.fillText(
    `สัญญาณรายได้: ${payload.cashFlowSignalTh} (${payload.contractFarmingPartner})`,
    marginX + 28,
    boxTop + 178
  );

  // Score Sub-card on right side of Profile Box
  const scoreCardW = 240;
  const scoreCardX = A4_WIDTH_PX - marginX - scoreCardW - 24;
  const scoreCardY = boxTop + 22;
  const scoreCardH = boxHeight - 44;

  const riskColor =
    farmer.riskLevel === 'low'
      ? '#15803D'
      : farmer.riskLevel === 'watch'
        ? '#B45309'
        : '#B91C1C';
  const riskBg =
    farmer.riskLevel === 'low'
      ? '#ECFDF5'
      : farmer.riskLevel === 'watch'
        ? '#FFFBEB'
        : '#FEF2F2';

  ctx.fillStyle = riskBg;
  ctx.strokeStyle = riskColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(scoreCardX, scoreCardY, scoreCardW, scoreCardH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = `600 15px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('คะแนนสุขภาพพืช NASA', scoreCardX + scoreCardW / 2, scoreCardY + 34);

  ctx.fillStyle = riskColor;
  ctx.font = `700 44px ${MONO_STACK}`;
  ctx.fillText(payload.nasaHealthScoreLabel, scoreCardX + scoreCardW / 2, scoreCardY + 94);

  ctx.font = `600 17px ${FONT_STACK}`;
  ctx.fillText(payload.riskLabelTh, scoreCardX + scoreCardW / 2, scoreCardY + 132);
  ctx.textAlign = 'left';

  cursorY = boxTop + boxHeight + 36;

  // 7-Day Risk & Tranche Status Row
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText('1. สถานะความเสี่ยงล่วงหน้า 7 วัน และความคืบหน้าวงเงินสินเชื่อ', marginX, cursorY);
  cursorY += 26;

  const gridGap = 20;
  const halfW = (contentWidth - gridGap) / 2;
  const rowH = 116;

  // Left card: 7-Day Risk
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, halfW, rowH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText('สัญญาณเตือนภัยล่วงหน้า 7 วัน', marginX + 22, cursorY + 34);
  ctx.fillStyle = riskColor;
  ctx.font = `600 20px ${FONT_STACK}`;
  const riskLines = wrapTextByMeasure(payload.riskStatus7DayTh, halfW - 44, (t) =>
    ctx.measureText(t).width
  );
  riskLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, marginX + 22, cursorY + 68 + idx * 28);
  });

  // Right card: Loan Tranche Status
  const rightX = marginX + halfW + gridGap;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(rightX, cursorY, halfW, rowH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText('วงเงินสินเชื่อและสถานะปัจจุบัน', rightX + 22, cursorY + 34);
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText(`${payload.loanLimitLabel}  (${payload.trancheProgressLabel})`, rightX + 22, cursorY + 68);
  ctx.fillStyle = '#15803D';
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.fillText(`สถานะ: ${payload.loanStatus}`, rightX + 22, cursorY + 98);

  cursorY += rowH + 40;

  // Section 2: Tranche Recommendation
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText('2. ข้อเสนอแนะการปล่อยสินเชื่อแบบทยอยเป็นงวด (Phased Tranche)', marginX, cursorY);
  cursorY += 20;

  ctx.font = `400 19px ${FONT_STACK}`;
  const recLines = wrapTextByMeasure(payload.trancheRecommendationTh, contentWidth - 48, (t) =>
    ctx.measureText(t).width
  );
  const condLines = wrapTextByMeasure(
    `เงื่อนไขงวดถัดไป: ${payload.nextTrancheConditionTh}`,
    contentWidth - 48,
    (t) => ctx.measureText(t).width
  );
  const recBoxH = 74 + recLines.length * 28 + condLines.length * 28;

  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, recBoxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(payload.trancheHeadlineTh, marginX + 24, cursorY + 38);

  ctx.fillStyle = '#334155';
  ctx.font = `400 19px ${FONT_STACK}`;
  recLines.forEach((line, idx) => {
    ctx.fillText(line, marginX + 24, cursorY + 74 + idx * 28);
  });

  const condStartY = cursorY + 74 + recLines.length * 28 + 10;
  ctx.fillStyle = '#0F172A';
  ctx.font = `600 18px ${FONT_STACK}`;
  condLines.forEach((line, idx) => {
    ctx.fillText(line, marginX + 24, condStartY + idx * 28);
  });

  cursorY += recBoxH + 40;

  // Section 3: Business Mitigation Reasons
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText('3. เหตุผลเชิงธุรกิจและหลักฐานจากดาวเทียมที่ช่วยลดความเสี่ยงให้ ธ.ก.ส.', marginX, cursorY);
  cursorY += 34;

  ctx.font = `400 19px ${FONT_STACK}`;
  for (const reason of payload.mitigationReasonsTh) {
    const wrapped = wrapTextByMeasure(reason, contentWidth - 40, (t) =>
      ctx.measureText(t).width
    );
    ctx.fillStyle = '#15803D';
    ctx.font = `700 19px ${FONT_STACK}`;
    ctx.fillText('✓', marginX + 6, cursorY);

    ctx.fillStyle = '#1E293B';
    ctx.font = `400 19px ${FONT_STACK}`;
    wrapped.forEach((line, idx) => {
      ctx.fillText(line, marginX + 34, cursorY + idx * 28);
    });
    cursorY += wrapped.length * 28 + 14;
  }

  if (payload.officerActionTaken) {
    cursorY += 8;
    ctx.fillStyle = '#ECFDF5';
    ctx.strokeStyle = '#A7F3D0';
    ctx.beginPath();
    ctx.roundRect(marginX, cursorY, contentWidth, 52, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#065F46';
    ctx.font = `600 18px ${FONT_STACK}`;
    ctx.fillText(`บันทึกการดำเนินการเจ้าหน้าที่: ${payload.officerActionTaken}`, marginX + 20, cursorY + 32);
    cursorY += 72;
  }

  // Portfolio Context Footer Box & Committee Sign-off
  const signOffY = A4_HEIGHT_PX - 230;
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(marginX, signOffY - 76, contentWidth, 52, 8);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText(payload.portfolioSummaryLineTh, marginX + 20, signOffY - 44);

  // Signature lines
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX + 40, signOffY + 70);
  ctx.lineTo(marginX + 380, signOffY + 70);
  ctx.moveTo(A4_WIDTH_PX - marginX - 380, signOffY + 70);
  ctx.lineTo(A4_WIDTH_PX - marginX - 40, signOffY + 70);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = `500 17px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('เจ้าหน้าที่สินเชื่อผู้เสนอความเห็น', marginX + 210, signOffY + 100);
  ctx.fillText('ประธาน / กรรมการพิจารณาอนุมัติสินเชื่อ', A4_WIDTH_PX - marginX - 210, signOffY + 100);
  ctx.textAlign = 'left';

  // Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = `400 14px ${FONT_STACK}`;
  ctx.fillText(
    'CropShield · NASA Space Apps Challenge (Field Shift: Adapting Farms with NASA Data) · แหล่งข้อมูล: NASA POWER',
    marginX,
    A4_HEIGHT_PX - 48
  );

  // Convert high-DPI A4 canvas to PDF via jsPDF
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
