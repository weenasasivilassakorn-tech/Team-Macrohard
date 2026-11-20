import { jsPDF } from 'jspdf';
import type {
  AppLanguage,
  CreditApplicationState,
  FarmPlotProfile,
  ParametricShieldState,
  PlotEvaluation,
  RegisteredUserProfile,
  ScenarioType,
} from '../types/cropshield';
import { wrapTextByMeasure } from './baacPdfReport';
import { buildFarmerRiskPdfPayload } from './farmerRiskPdfReport';

const A4_WIDTH_PX = 1240;
const A4_HEIGHT_PX = 1754;
const FONT_STACK = '"IBM Plex Sans Thai", "Plus Jakarta Sans", system-ui, sans-serif';
const MONO_STACK = '"IBM Plex Mono", monospace';

export async function exportFarmerPlotSummaryPdf(params: {
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  user: RegisteredUserProfile;
  creditState: CreditApplicationState;
  shieldState: ParametricShieldState;
  scenario: ScenarioType;
  lang: AppLanguage;
}): Promise<string> {
  const payload = buildFarmerRiskPdfPayload(params);
  const isTh = payload.lang === 'th';

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
    throw new Error(
      isTh
        ? 'ไม่สามารถสร้าง Canvas สำหรับส่งออก PDF ได้'
        : 'Unable to initialize canvas for PDF generation.'
    );
  }

  // White A4 background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  const marginX = 72;
  const contentWidth = A4_WIDTH_PX - marginX * 2;
  let cursorY = 74;

  // Brand & Header Tag
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText('CropShield', marginX, cursorY);

  ctx.fillStyle = '#15803D';
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(payload.brandHeaderTag, A4_WIDTH_PX - marginX, cursorY - 4);
  ctx.textAlign = 'left';

  cursorY += 38;
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 25px ${FONT_STACK}`;
  ctx.fillText(payload.documentTitle, marginX, cursorY);

  cursorY += 28;
  ctx.fillStyle = '#475569';
  ctx.font = `400 17px ${FONT_STACK}`;
  ctx.fillText(`${payload.subtitle}  ·  ${payload.generatedAtLabel}`, marginX, cursorY);

  cursorY += 22;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, cursorY);
  ctx.lineTo(A4_WIDTH_PX - marginX, cursorY);
  ctx.stroke();

  cursorY += 34;

  // Farmer & Plot Summary Card + Score Badge
  const boxTop = cursorY;
  const boxHeight = 205;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(marginX, boxTop, contentWidth, boxHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText(
    isTh ? 'ข้อมูลเกษตรกรและแปลงที่ประเมิน' : 'Registered Farmer & Plot Profile',
    marginX + 26,
    boxTop + 34
  );

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 24px ${FONT_STACK}`;
  ctx.fillText(payload.plotName, marginX + 26, boxTop + 70);

  ctx.fillStyle = '#334155';
  ctx.font = `400 18px ${FONT_STACK}`;
  ctx.fillText(
    `${isTh ? 'เกษตรกร' : 'Farmer'}: ${payload.farmerName} (${payload.phoneNumber})  ·  LINE: ${payload.lineAccountLabel}`,
    marginX + 26,
    boxTop + 104
  );
  ctx.fillText(
    `${isTh ? 'พืชหลัก' : 'Crop'}: ${payload.cropType}  ·  ${isTh ? 'ขนาด' : 'Area'}: ${payload.areaRaiLabel}  ·  ${payload.provinceLabel}`,
    marginX + 26,
    boxTop + 136
  );
  ctx.fillText(
    `${isTh ? 'พิกัดแปลง' : 'Coords'}: ${payload.coordinatesLabel}  ·  ${isTh ? 'ระบบน้ำ' : 'Irrigation'}: ${payload.irrigationLabel}`,
    marginX + 26,
    boxTop + 168
  );
  ctx.fillStyle = '#15803D';
  ctx.font = `600 16px ${FONT_STACK}`;
  ctx.fillText(
    `${payload.dataOriginLabel}  ·  ${payload.scenarioLabel}`,
    marginX + 26,
    boxTop + 194
  );

  const scoreCardW = 244;
  const scoreCardX = A4_WIDTH_PX - marginX - scoreCardW - 22;
  const scoreCardY = boxTop + 20;
  const scoreCardH = boxHeight - 40;

  const riskColor =
    payload.riskLevel === 'low'
      ? '#15803D'
      : payload.riskLevel === 'watch'
        ? '#B45309'
        : '#B91C1C';
  const riskBg =
    payload.riskLevel === 'low'
      ? '#ECFDF5'
      : payload.riskLevel === 'watch'
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
  ctx.fillText(
    isTh ? 'คะแนนสุขภาพแปลง NASA' : 'NASA Farm Health Score',
    scoreCardX + scoreCardW / 2,
    scoreCardY + 34
  );

  ctx.fillStyle = riskColor;
  ctx.font = `700 42px ${MONO_STACK}`;
  ctx.fillText(payload.healthScoreLabel, scoreCardX + scoreCardW / 2, scoreCardY + 94);

  ctx.font = `600 17px ${FONT_STACK}`;
  ctx.fillText(payload.riskLabel, scoreCardX + scoreCardW / 2, scoreCardY + 132);
  ctx.textAlign = 'left';

  cursorY = boxTop + boxHeight + 32;

  // Section 1: 4 NASA Satellite Metrics
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 21px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? '1. ค่าตัวชี้วัดจากดาวเทียม NASA (เฉลี่ย 7 วัน)'
      : '1. Key NASA Satellite Indicators (7-Day Summary)',
    marginX,
    cursorY
  );
  cursorY += 20;

  const metricCols = 4;
  const metricGap = 16;
  const metricW = (contentWidth - metricGap * (metricCols - 1)) / metricCols;
  const metricH = 98;
  const metrics = [
    {
      label: isTh ? 'ความชื้นดินเฉลี่ย' : 'Avg Soil Moisture',
      value: payload.avgMoistureLabel,
    },
    {
      label: isTh ? 'ความเครียดพืชสูงสุด' : 'Peak Crop Stress',
      value: payload.maxStressLabel,
    },
    {
      label: isTh ? 'โอกาสฝนสูงสุด' : 'Peak Rain Chance',
      value: payload.maxRainChanceLabel,
    },
    {
      label: isTh ? 'อุณหภูมิสูงสุด' : 'Max Temperature',
      value: payload.maxTempLabel,
    },
  ];

  metrics.forEach((m, idx) => {
    const mx = marginX + idx * (metricW + metricGap);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mx, cursorY, metricW, metricH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = `500 15px ${FONT_STACK}`;
    ctx.fillText(m.label, mx + 18, cursorY + 34);

    ctx.fillStyle = '#0F172A';
    ctx.font = `700 26px ${MONO_STACK}`;
    ctx.fillText(m.value, mx + 18, cursorY + 74);
  });

  cursorY += metricH + 16;

  if (payload.liveWeatherSummaryLine) {
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(marginX, cursorY, contentWidth, 42, 8);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.font = `500 16px ${FONT_STACK}`;
    ctx.fillText(payload.liveWeatherSummaryLine, marginX + 18, cursorY + 27);
    cursorY += 56;
  } else {
    cursorY += 12;
  }

  // Section 2: Risk Diagnosis & Bank Officer Credit Readiness
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 21px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? '2. สรุปคำแนะนำภาคสนามและความพร้อมด้านสินเชื่อสำหรับธนาคาร'
      : '2. Field Risk Diagnosis & Bank Officer Credit Readiness',
    marginX,
    cursorY
  );
  cursorY += 20;

  ctx.font = `400 18px ${FONT_STACK}`;
  const summaryLines = wrapTextByMeasure(
    payload.earlyWarningSummary,
    contentWidth - 48,
    (t) => ctx.measureText(t).width
  );
  const actionLines = wrapTextByMeasure(
    `${isTh ? 'แนวทางปฏิบัติ' : 'Action'}: ${payload.earlyWarningAction}`,
    contentWidth - 48,
    (t) => ctx.measureText(t).width
  );
  const creditLines = wrapTextByMeasure(
    `${isTh ? 'บันทึกเครดิตจากดาวเทียม' : 'Credit Standing'}: ${payload.creditIdentityNote}`,
    contentWidth - 48,
    (t) => ctx.measureText(t).width
  );

  const diagBoxH =
    66 +
    summaryLines.length * 26 +
    actionLines.length * 26 +
    creditLines.length * 26 +
    28;

  ctx.fillStyle = riskBg;
  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, diagBoxH, 10);
  ctx.fill();
  ctx.stroke();

  let innerY = cursorY + 36;
  ctx.fillStyle = riskColor;
  ctx.font = `700 19px ${FONT_STACK}`;
  ctx.fillText(payload.earlyWarningHeadline, marginX + 24, innerY);
  innerY += 32;

  ctx.fillStyle = '#1E293B';
  ctx.font = `400 18px ${FONT_STACK}`;
  summaryLines.forEach((line) => {
    ctx.fillText(line, marginX + 24, innerY);
    innerY += 26;
  });
  innerY += 6;

  ctx.fillStyle = '#0F172A';
  ctx.font = `600 17px ${FONT_STACK}`;
  actionLines.forEach((line) => {
    ctx.fillText(line, marginX + 24, innerY);
    innerY += 26;
  });
  innerY += 6;

  ctx.fillStyle = '#065F46';
  ctx.font = `500 17px ${FONT_STACK}`;
  creditLines.forEach((line) => {
    ctx.fillText(line, marginX + 24, innerY);
    innerY += 26;
  });

  cursorY += diagBoxH + 22;

  // Credit & Insurance Status Row
  const halfW = (contentWidth - 18) / 2;
  const statusH = 88;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, halfW, statusH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `500 15px ${FONT_STACK}`;
  ctx.fillText(
    isTh ? 'สิทธิ์วงเงินสินเชื่อหมุนเวียน (Pre-approved)' : 'Pre-Approved Working Credit',
    marginX + 20,
    cursorY + 30
  );
  ctx.fillStyle = '#15803D';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(payload.preApprovedCreditLabel, marginX + 20, cursorY + 56);
  ctx.fillStyle = '#334155';
  ctx.font = `400 15px ${FONT_STACK}`;
  ctx.fillText(payload.creditRequestStatusLabel, marginX + 20, cursorY + 78);

  const rightX = marginX + halfW + 18;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(rightX, cursorY, halfW, statusH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `500 15px ${FONT_STACK}`;
  ctx.fillText(
    isTh ? 'สถานะความคุ้มครองประกันภัยพืชผล' : 'Parametric Crop Insurance Status',
    rightX + 20,
    cursorY + 30
  );
  ctx.fillStyle = '#0F172A';
  ctx.font = `600 17px ${FONT_STACK}`;
  const insLines = wrapTextByMeasure(payload.insuranceStatusLabel, halfW - 40, (t) =>
    ctx.measureText(t).width
  );
  insLines.slice(0, 2).forEach((line, idx) => {
    ctx.fillText(line, rightX + 20, cursorY + 56 + idx * 22);
  });

  cursorY += statusH + 34;

  // Section 3: 7-Day Forecast Table
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 21px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? '3. ตารางคาดการณ์สภาพแปลงล่วงหน้า 7 วัน (NASA 7-Day Outlook)'
      : '3. 7-Day Satellite Plot Forecast Breakdown',
    marginX,
    cursorY
  );
  cursorY += 18;

  const colDayW = 135;
  const colMoistW = 115;
  const colStressW = 115;
  const colRainW = 100;
  const colTempW = 100;
  const tableHeaderH = 42;
  const rowHeight = 46;

  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, tableHeaderH, 8);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.font = `700 15px ${FONT_STACK}`;
  const hY = cursorY + 27;
  ctx.fillText(isTh ? 'วัน / วันที่' : 'Day', marginX + 16, hY);
  ctx.fillText(isTh ? 'ความชื้นดิน' : 'Moisture', marginX + colDayW, hY);
  ctx.fillText(isTh ? 'ความเครียด' : 'Stress', marginX + colDayW + colMoistW, hY);
  ctx.fillText(isTh ? 'โอกาสฝน' : 'Rain', marginX + colDayW + colMoistW + colStressW, hY);
  ctx.fillText(
    isTh ? 'อุณหภูมิ' : 'Temp',
    marginX + colDayW + colMoistW + colStressW + colRainW,
    hY
  );
  ctx.fillText(
    isTh ? 'คำแนะนำประจำวัน' : 'Daily Field Advisory',
    marginX + colDayW + colMoistW + colStressW + colRainW + colTempW,
    hY
  );

  cursorY += tableHeaderH + 4;

  payload.forecastRows.slice(0, 7).forEach((row, idx) => {
    const ry = cursorY + idx * rowHeight;
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(marginX, ry, contentWidth, rowHeight);
    }

    const textY = ry + 29;
    ctx.fillStyle = '#0F172A';
    ctx.font = `600 15px ${FONT_STACK}`;
    ctx.fillText(`${row.dayLabel} (${row.dateShort})`, marginX + 16, textY);

    ctx.font = `600 15px ${MONO_STACK}`;
    ctx.fillText(row.moistureText, marginX + colDayW, textY);
    ctx.fillText(row.stressText, marginX + colDayW + colMoistW, textY);
    ctx.fillText(row.rainText, marginX + colDayW + colMoistW + colStressW, textY);
    ctx.fillText(row.tempText, marginX + colDayW + colMoistW + colStressW + colRainW, textY);

    ctx.fillStyle = '#475569';
    ctx.font = `400 15px ${FONT_STACK}`;
    const advStartX = marginX + colDayW + colMoistW + colStressW + colRainW + colTempW;
    const advMaxW = A4_WIDTH_PX - marginX - advStartX - 12;
    const advLines = wrapTextByMeasure(row.advisoryText, advMaxW, (t) =>
      ctx.measureText(t).width
    );
    ctx.fillText(advLines[0] ?? '', advStartX, textY);
  });

  // Signature / Verification Footer
  const signY = A4_HEIGHT_PX - 128;
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
    isTh ? `ลงชื่อเกษตรกร (${payload.farmerName})` : `Farmer Signature (${payload.farmerName})`,
    marginX + 190,
    signY + 28
  );
  ctx.fillText(
    isTh ? 'เจ้าหน้าที่สินเชื่อธนาคารผู้รับเอกสาร' : 'Receiving Bank / BAAC Officer',
    A4_WIDTH_PX - marginX - 190,
    signY + 28
  );
  ctx.textAlign = 'left';

  ctx.fillStyle = '#94A3B8';
  ctx.font = `400 14px ${FONT_STACK}`;
  ctx.fillText(payload.footerNote, marginX, A4_HEIGHT_PX - 46);

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
