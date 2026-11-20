import { jsPDF } from 'jspdf';
import { wrapTextByMeasure } from './baacPdfReport';
import { buildNasaPowerSurroundingGrid } from './nasaPowerMap';
import { buildNasaMapPdfPayload, type NasaMapReportInput } from './nasaPowerMapReport';
import {
  buildThailandOutlineSvgPath,
  computeParcelGeometryFromRai,
  projectLatLonToThailandSvg,
} from './offlineMapGeometry';

const A4_WIDTH_PX = 1240;
const A4_HEIGHT_PX = 1754;
const FONT_STACK = '"IBM Plex Sans Thai", "Plus Jakarta Sans", system-ui, sans-serif';
const MONO_STACK = '"IBM Plex Mono", monospace';

export async function exportNasaPowerMapPdf(
  input: NasaMapReportInput
): Promise<string> {
  const payload = buildNasaMapPdfPayload(input);
  const isTh = payload.lang === 'th';

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback fonts
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH_PX;
  canvas.height = A4_HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(
      isTh
        ? 'ไม่สามารถสร้าง Canvas สำหรับส่งออก PDF แผนที่ NASA ได้'
        : 'Unable to initialize canvas for NASA Map PDF.'
    );
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  const marginX = 70;
  const contentWidth = A4_WIDTH_PX - marginX * 2;
  let cursorY = 74;

  // Brand Header
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText('CropShield', marginX, cursorY);

  ctx.fillStyle = '#047857';
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(
    isTh ? 'รายงานแผนที่ดาวเทียมและจุดพิกัด NASA POWER' : 'NASA POWER Satellite Map Report',
    A4_WIDTH_PX - marginX,
    cursorY - 4
  );
  ctx.textAlign = 'left';

  cursorY += 38;
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 25px ${FONT_STACK}`;
  ctx.fillText(payload.title, marginX, cursorY);

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

  cursorY += 30;

  // Plot Identity & Score Card
  const idBoxH = 164;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, idBoxH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 24px ${FONT_STACK}`;
  ctx.fillText(payload.plotTitle, marginX + 24, cursorY + 42);

  ctx.fillStyle = '#334155';
  ctx.font = `400 18px ${FONT_STACK}`;
  ctx.fillText(
    `${isTh ? 'พื้นที่' : 'Area'}: ${payload.areaLabel} (${payload.parcelSizeLabel})  ·  ${payload.provinceLabel}`,
    marginX + 24,
    cursorY + 76
  );
  ctx.fillText(
    `${isTh ? 'พิกัดแปลง' : 'Coordinates'}: ${payload.coordLabel}  ·  ${isTh ? 'ความสูง' : 'Elevation'}: ${payload.metrics.elevation}`,
    marginX + 24,
    cursorY + 108
  );
  ctx.fillStyle = '#047857';
  ctx.font = `600 16px ${FONT_STACK}`;
  ctx.fillText(
    `${isTh ? 'กริด MERRA-2' : 'MERRA-2 Grid'}: ${payload.merraCellId} (${payload.merraBoundsLabel})`,
    marginX + 24,
    cursorY + 140
  );

  if (input.healthScore !== undefined) {
    const scoreW = 210;
    const scoreX = A4_WIDTH_PX - marginX - scoreW - 22;
    const scoreY = cursorY + 20;
    const scoreH = idBoxH - 40;
    const scoreColor =
      input.healthScore >= 82
        ? '#15803D'
        : input.healthScore >= 60
          ? '#B45309'
          : '#B91C1C';
    const scoreBg =
      input.healthScore >= 82
        ? '#ECFDF5'
        : input.healthScore >= 60
          ? '#FFFBEB'
          : '#FEF2F2';

    ctx.fillStyle = scoreBg;
    ctx.strokeStyle = scoreColor;
    ctx.beginPath();
    ctx.roundRect(scoreX, scoreY, scoreW, scoreH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = `600 14px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText(isTh ? 'คะแนนสุขภาพ NASA' : 'NASA Health Score', scoreX + scoreW / 2, scoreY + 32);
    ctx.fillStyle = scoreColor;
    ctx.font = `700 38px ${MONO_STACK}`;
    ctx.fillText(payload.healthScoreLabel, scoreX + scoreW / 2, scoreY + 86);
    ctx.textAlign = 'left';
  }

  cursorY += idBoxH + 28;

  // Section 1: Spatial Map Preview (Thailand Locator + 3x3 MERRA-2 Grid + Farm Parcel)
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 21px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? `1. แผนที่พิกัดแปลงและกริดดาวเทียม (${payload.layerLabel})`
      : `1. Plot Coordinates & Satellite Grid Map (${payload.layerLabel})`,
    marginX,
    cursorY
  );
  cursorY += 18;

  const mapBoxH = 390;
  const leftMapW = 360;
  const rightMapW = contentWidth - leftMapW - 20;

  // Left: Thailand Vector Map with Plot Pin
  ctx.fillStyle = '#EAF2F8';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, leftMapW, mapBoxH, 12);
  ctx.fill();
  ctx.stroke();

  const thPathData = buildThailandOutlineSvgPath();
  const thPin = projectLatLonToThailandSvg(input.lat, input.lon);
  ctx.save();
  const scaleTh = 1.68;
  const offsetXTh = marginX + (leftMapW - 200 * scaleTh) / 2;
  const offsetYTh = cursorY + 26;
  ctx.translate(offsetXTh, offsetYTh);
  ctx.scale(scaleTh, scaleTh);
  const path2d = new Path2D(thPathData);
  ctx.fillStyle = '#DCFCE7';
  ctx.strokeStyle = '#15803D';
  ctx.lineWidth = 1.4;
  ctx.fill(path2d);
  ctx.stroke(path2d);

  ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
  ctx.beginPath();
  ctx.arc(thPin.x, thPin.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(thPin.x, thPin.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.fillText(
    isTh ? 'ตำแหน่งในประเทศไทย' : 'Regional Position (Thailand)',
    marginX + 18,
    cursorY + mapBoxH - 22
  );

  // Right: Zoomed 3x3 MERRA-2 Grid + Parcel Boundary + Coordinates
  const rightX = marginX + leftMapW + 20;
  ctx.fillStyle = '#EEF5F0';
  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(rightX, cursorY, rightMapW, mapBoxH, 12);
  ctx.fill();
  ctx.stroke();

  const cells = buildNasaPowerSurroundingGrid(input.lat, input.lon);
  const minWest = Math.min(...cells.map((c) => c.westLon));
  const maxEast = Math.max(...cells.map((c) => c.eastLon));
  const minSouth = Math.min(...cells.map((c) => c.southLat));
  const maxNorth = Math.max(...cells.map((c) => c.northLat));

  const pad = 42;
  const drawW = rightMapW - pad * 2;
  const drawH = mapBoxH - pad * 2 - 24;
  const projectGridX = (lonVal: number) =>
    rightX + pad + ((lonVal - minWest) / (maxEast - minWest)) * drawW;
  const projectGridY = (latVal: number) =>
    cursorY + pad + ((maxNorth - latVal) / (maxNorth - minSouth)) * drawH;

  cells.forEach((cell) => {
    const x1 = projectGridX(cell.westLon);
    const y1 = projectGridY(cell.northLat);
    const w = projectGridX(cell.eastLon) - x1;
    const h = projectGridY(cell.southLat) - y1;
    ctx.fillStyle = cell.isPrimary
      ? 'rgba(16, 185, 129, 0.22)'
      : 'rgba(148, 163, 184, 0.08)';
    ctx.strokeStyle = cell.isPrimary ? '#047857' : '#94A3B8';
    ctx.lineWidth = cell.isPrimary ? 2.5 : 1;
    ctx.setLineDash(cell.isPrimary ? [] : [5, 5]);
    ctx.fillRect(x1, y1, w, h);
    ctx.strokeRect(x1, y1, w, h);
    ctx.setLineDash([]);
  });

  // Parcel Highlight & Pin at exact (lat, lon)
  const parcel = computeParcelGeometryFromRai(input.lat, input.lon, input.areaRai);
  const px = projectGridX(input.lon);
  const py = projectGridY(input.lat);
  const pw = Math.max(24, parcel.svgRectWidth * 0.45);
  const ph = Math.max(18, parcel.svgRectHeight * 0.45);

  ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
  ctx.strokeStyle = '#14532D';
  ctx.lineWidth = 2.5;
  ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
  ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);

  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? `กริด 3×3 NASA MERRA-2 (0.5°×0.625°) · ขอบเขตแปลงสีเขียว (${payload.areaLabel})`
      : `3×3 NASA MERRA-2 Grid (0.5°×0.625°) · Green Parcel (${payload.areaLabel})`,
    rightX + 20,
    cursorY + mapBoxH - 22
  );

  cursorY += mapBoxH + 30;

  // Section 2: NASA POWER Point Telemetry Cards
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 21px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? '2. ค่าตรวจวัดจากจุดพิกัด NASA POWER ล่าสุด'
      : '2. Latest NASA POWER Point Telemetry',
    marginX,
    cursorY
  );
  cursorY += 18;

  const metricCols = 4;
  const metricGap = 16;
  const metricW = (contentWidth - metricGap * (metricCols - 1)) / metricCols;
  const metricH = 98;
  const cards = [
    { label: 'GWETTOP (Soil Wetness)', val: payload.metrics.soilWetness, color: '#047857' },
    { label: 'T2M (Temperature)', val: payload.metrics.tempC, color: '#0F172A' },
    { label: 'PRECTOTCORR (Rain)', val: payload.metrics.precip, color: '#0369A1' },
    { label: 'RH2M (Humidity)', val: payload.metrics.humidity, color: '#0F172A' },
  ];

  cards.forEach((c, idx) => {
    const mx = marginX + idx * (metricW + metricGap);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mx, cursorY, metricW, metricH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = `600 14px ${FONT_STACK}`;
    ctx.fillText(c.label, mx + 16, cursorY + 32);

    ctx.fillStyle = c.color;
    ctx.font = `700 28px ${MONO_STACK}`;
    ctx.fillText(c.val, mx + 16, cursorY + 74);
  });

  cursorY += metricH + 28;

  // Risk & Advisory Summary Strip
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  const advLines = wrapTextByMeasure(payload.riskSummaryText, contentWidth - 48, (t) =>
    ctx.measureText(t).width
  );
  const advH = 54 + Math.max(1, advLines.length) * 26;
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, advH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 17px ${FONT_STACK}`;
  ctx.fillText(
    isTh ? 'สรุปสถานะแปลงและคำแนะนำอ้างอิง NASA:' : 'NASA Plot Status & Advisory:',
    marginX + 20,
    cursorY + 30
  );
  ctx.fillStyle = '#334155';
  ctx.font = `400 17px ${FONT_STACK}`;
  advLines.slice(0, 3).forEach((line, idx) => {
    ctx.fillText(line, marginX + 20, cursorY + 58 + idx * 26);
  });

  cursorY += advH + 28;

  // Section 3: Observed 7-Day NASA POWER Daily Table
  if (payload.observations.length > 0) {
    ctx.fillStyle = '#0F172A';
    ctx.font = `700 21px ${FONT_STACK}`;
    ctx.fillText(
      isTh
        ? '3. ข้อมูลรายวันจากดาวเทียม NASA POWER (ย้อนหลังล่าสุด)'
        : '3. Recent NASA POWER Daily Satellite Observations',
      marginX,
      cursorY
    );
    cursorY += 16;

    const headH = 40;
    const rowH = 42;
    ctx.fillStyle = '#ECFDF5';
    ctx.beginPath();
    ctx.roundRect(marginX, cursorY, contentWidth, headH, 8);
    ctx.fill();

    ctx.fillStyle = '#065F46';
    ctx.font = `700 15px ${FONT_STACK}`;
    ctx.fillText(isTh ? 'วันที่ (ด/ว)' : 'Date', marginX + 20, cursorY + 26);
    ctx.fillText('T2M (Temp)', marginX + 260, cursorY + 26);
    ctx.fillText('PRECTOTCORR (Rain)', marginX + 530, cursorY + 26);
    ctx.fillText('RH2M (Humidity)', marginX + 830, cursorY + 26);
    cursorY += headH + 4;

    payload.observations.slice(0, 7).forEach((obs, idx) => {
      const ry = cursorY + idx * rowH;
      if (idx % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(marginX, ry, contentWidth, rowH);
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = `600 15px ${MONO_STACK}`;
      ctx.fillText(obs.dateLabel, marginX + 20, ry + 27);
      ctx.fillText(obs.tempLabel, marginX + 260, ry + 27);
      ctx.fillText(obs.precipLabel, marginX + 530, ry + 27);
      ctx.fillText(obs.humidityLabel, marginX + 830, ry + 27);
    });
  }

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = `400 14px ${FONT_STACK}`;
  ctx.fillText(
    `${payload.dataSourceLabel}  ·  Google Maps: ${payload.googleMapsUrl}`,
    marginX,
    A4_HEIGHT_PX - 46
  );

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
