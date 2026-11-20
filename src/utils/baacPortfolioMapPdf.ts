import { jsPDF } from 'jspdf';
import type { AppLanguage, BaacMapLayerMode, FarmerLoanRecord, ScenarioType } from '../types/cropshield';
import {
  buildThailandOutlineSvgPath,
  projectLatLonToThailandSvg,
} from './offlineMapGeometry';

const A4_WIDTH_PX = 1240;
const A4_HEIGHT_PX = 1754;
const FONT_STACK = '"IBM Plex Sans Thai", "Plus Jakarta Sans", system-ui, sans-serif';
const MONO_STACK = '"IBM Plex Mono", monospace';

export interface BaacPortfolioMapPdfPayload {
  lang: AppLanguage;
  filename: string;
  title: string;
  subtitle: string;
  generatedAtLabel: string;
  layerLabel: string;
  scenarioLabel: string;
  totalPlots: number;
  totalRai: number;
  normalCount: number;
  watchCount: number;
  criticalCount: number;
  rows: Array<{
    id: string;
    farmerName: string;
    locationLabel: string;
    cropAndArea: string;
    coordLabel: string;
    scoreLabel: string;
    riskLabel: string;
    riskLevel: FarmerLoanRecord['riskLevel'];
    lat: number;
    lon: number;
  }>;
}

export function buildBaacPortfolioMapPdfPayload(
  farmers: FarmerLoanRecord[],
  layerMode: BaacMapLayerMode,
  scenario: ScenarioType,
  lang: AppLanguage,
  now: Date = new Date()
): BaacPortfolioMapPdfPayload {
  const isTh = lang === 'th';
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const generatedAtLabel = now.toLocaleString(isTh ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const scenarioLabel =
    scenario === 'drought'
      ? isTh
        ? 'จำลองภัยแล้ง 7 วัน'
        : '7-Day Drought Sim'
      : scenario === 'flood'
        ? isTh
          ? 'จำลองน้ำท่วมฉับพลัน'
          : 'Flash Flood Sim'
        : isTh
          ? 'สภาพอากาศปกติ'
          : 'Normal Baseline';

  const layerLabel =
    layerMode === 'soil-health'
      ? isTh
        ? 'คะแนนสุขภาพดิน NASA (NDVI/Soil)'
        : 'NASA Soil Health Score'
      : isTh
        ? 'เรดาร์ความเสี่ยง 7 วันล่วงหน้า'
        : '7-Day Risk Radar';

  const totalPlots = farmers.length;
  const totalRai = farmers.reduce((sum, f) => sum + f.areaRai, 0);
  const normalCount = farmers.filter((f) => f.riskLevel === 'low').length;
  const watchCount = farmers.filter((f) => f.riskLevel === 'watch').length;
  const criticalCount = farmers.filter((f) => f.riskLevel === 'critical').length;

  const rows = farmers.map((f) => ({
    id: f.id,
    farmerName: f.farmerName,
    locationLabel: f.districtName ? `${f.districtName} จ.${f.province}` : `จ.${f.province}`,
    cropAndArea: `${f.cropType} · ${f.areaRai} ${isTh ? 'ไร่' : 'Rai'}`,
    coordLabel: `${f.lat.toFixed(4)}°N, ${f.lon.toFixed(4)}°E`,
    scoreLabel: `${f.nasaHealthScore}/100`,
    riskLabel:
      f.riskLevel === 'critical'
        ? isTh
          ? 'วิกฤต'
          : 'Critical'
        : f.riskLevel === 'watch'
          ? isTh
            ? 'เฝ้าระวัง 7 วัน'
            : '7D Watch'
          : isTh
            ? 'ปกติ'
            : 'Normal',
    riskLevel: f.riskLevel,
    lat: f.lat,
    lon: f.lon,
  }));

  return {
    lang,
    filename: `baac-portfolio-farm-map-${datePart}.pdf`,
    title: isTh
      ? 'รายงานแผนที่ดูไร่ดูพื้นที่เกษตรกรในพอร์ต ธ.ก.ส.'
      : 'BAAC Portfolio Regional Farm Map Report',
    subtitle: isTh
      ? 'สรุปตำแหน่งแปลงเกษตร คะแนนสุขภาพดิน NASA และความเสี่ยงล่วงหน้า 7 วัน'
      : 'Geo-referenced Farmer Plots, NASA Health Scores & 7-Day Risk Status',
    generatedAtLabel,
    layerLabel,
    scenarioLabel,
    totalPlots,
    totalRai,
    normalCount,
    watchCount,
    criticalCount,
    rows,
  };
}

export function buildBaacPortfolioMapShareText(
  farmers: FarmerLoanRecord[],
  layerMode: BaacMapLayerMode,
  scenario: ScenarioType,
  lang: AppLanguage
): string {
  const payload = buildBaacPortfolioMapPdfPayload(farmers, layerMode, scenario, lang);
  const isTh = lang === 'th';

  const topAlerts = payload.rows
    .filter((r) => r.riskLevel !== 'low')
    .slice(0, 4)
    .map((r) => `• ${r.farmerName} (${r.locationLabel}) — NASA ${r.scoreLabel} [${r.riskLabel}]`)
    .join('\n');

  if (isTh) {
    return [
      `🗺️ รายงานแผนที่ดูไร่ดูพื้นที่เกษตรกร ธ.ก.ส. (${payload.layerLabel})`,
      `📊 พอร์ตทั้งหมด: ${payload.totalPlots} แปลง (${payload.totalRai} ไร่) | ปกติ ${payload.normalCount} · เฝ้าระวัง ${payload.watchCount} · วิกฤต ${payload.criticalCount}`,
      `🌦️ สถานะจำลอง: ${payload.scenarioLabel}`,
      topAlerts ? `\n⚠️ แปลงที่ควรติดตามเร่งด่วน:\n${topAlerts}` : '',
      `\n— ส่งจากระบบ CropShield BAAC Officer Console`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `🗺️ BAAC Regional Farm Map Report (${payload.layerLabel})`,
    `📊 Portfolio: ${payload.totalPlots} plots (${payload.totalRai} Rai) | Normal ${payload.normalCount} · Watch ${payload.watchCount} · Critical ${payload.criticalCount}`,
    `🌦️ Scenario: ${payload.scenarioLabel}`,
    topAlerts ? `\n⚠️ Priority Plots:\n${topAlerts}` : '',
    `\n— CropShield BAAC Officer Console`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function exportBaacPortfolioMapPdf(
  farmers: FarmerLoanRecord[],
  layerMode: BaacMapLayerMode,
  scenario: ScenarioType,
  lang: AppLanguage
): Promise<string> {
  const payload = buildBaacPortfolioMapPdfPayload(farmers, layerMode, scenario, lang);
  const isTh = lang === 'th';

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
        ? 'ไม่สามารถสร้าง Canvas สำหรับส่งออก PDF แผนที่ดูไร่ได้'
        : 'Unable to initialize canvas for BAAC Portfolio Map PDF.'
    );
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  const marginX = 68;
  const contentWidth = A4_WIDTH_PX - marginX * 2;
  let cursorY = 72;

  // Header
  ctx.fillStyle = '#064E3B';
  ctx.font = `700 32px ${FONT_STACK}`;
  ctx.fillText('CropShield · BAAC Officer Console', marginX, cursorY);

  ctx.fillStyle = '#047857';
  ctx.font = `600 17px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(payload.generatedAtLabel, A4_WIDTH_PX - marginX, cursorY - 4);
  ctx.textAlign = 'left';

  cursorY += 40;
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 26px ${FONT_STACK}`;
  ctx.fillText(payload.title, marginX, cursorY);

  cursorY += 28;
  ctx.fillStyle = '#475569';
  ctx.font = `400 17px ${FONT_STACK}`;
  ctx.fillText(`${payload.subtitle} · ${payload.layerLabel}`, marginX, cursorY);

  cursorY += 20;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, cursorY);
  ctx.lineTo(A4_WIDTH_PX - marginX, cursorY);
  ctx.stroke();
  cursorY += 24;

  // Portfolio Summary KPI Strip
  const kpis = [
    {
      label: isTh ? 'แปลงในพอร์ต' : 'Total Plots',
      val: `${payload.totalPlots} (${payload.totalRai} ${isTh ? 'ไร่' : 'Rai'})`,
      color: '#0F172A',
      bg: '#F8FAFC',
    },
    {
      label: isTh ? 'ปกติ (พร้อมปล่อย)' : 'Normal',
      val: `${payload.normalCount}`,
      color: '#047857',
      bg: '#ECFDF5',
    },
    {
      label: isTh ? 'เฝ้าระวัง 7 วัน' : '7D Watch',
      val: `${payload.watchCount}`,
      color: '#B45309',
      bg: '#FFFBEB',
    },
    {
      label: isTh ? 'ความเสี่ยงวิกฤต' : 'Critical',
      val: `${payload.criticalCount}`,
      color: '#B91C1C',
      bg: '#FEF2F2',
    },
  ];
  const kpiGap = 14;
  const kpiW = (contentWidth - kpiGap * 3) / 4;
  const kpiH = 92;
  kpis.forEach((k, i) => {
    const kx = marginX + i * (kpiW + kpiGap);
    ctx.fillStyle = k.bg;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(kx, cursorY, kpiW, kpiH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = `600 14px ${FONT_STACK}`;
    ctx.fillText(k.label, kx + 16, cursorY + 30);

    ctx.fillStyle = k.color;
    ctx.font = `700 26px ${MONO_STACK}`;
    ctx.fillText(k.val, kx + 16, cursorY + 70);
  });
  cursorY += kpiH + 26;

  // Thailand Portfolio Map Vector Canvas
  const mapH = 540;
  ctx.fillStyle = '#EAF2F8';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, mapH, 14);
  ctx.fill();
  ctx.stroke();

  const thPathData = buildThailandOutlineSvgPath();
  ctx.save();
  const scaleTh = 2.35;
  const offsetXTh = marginX + (contentWidth - 200 * scaleTh) / 2 - 40;
  const offsetYTh = cursorY + 26;
  ctx.translate(offsetXTh, offsetYTh);
  ctx.scale(scaleTh, scaleTh);
  const path2d = new Path2D(thPathData);
  ctx.fillStyle = '#DCFCE7';
  ctx.strokeStyle = '#15803D';
  ctx.lineWidth = 1.4;
  ctx.fill(path2d);
  ctx.stroke(path2d);

  // Draw all farmer pins on the Thailand outline
  payload.rows.forEach((row) => {
    const pt = projectLatLonToThailandSvg(row.lat, row.lon);
    const pinColor =
      row.riskLevel === 'critical'
        ? '#DC2626'
        : row.riskLevel === 'watch'
          ? '#D97706'
          : '#059669';

    ctx.fillStyle = pinColor;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Compact label beside pin
    ctx.fillStyle = '#0F172A';
    ctx.font = `700 6.2px ${FONT_STACK}`;
    ctx.fillText(`${row.locationLabel.split(' ')[0]} (${row.scoreLabel})`, pt.x + 7, pt.y + 2.2);
  });
  ctx.restore();

  // Map Legend Box (Bottom-Right inside Map Card)
  const legW = 280;
  const legH = 128;
  const legX = A4_WIDTH_PX - marginX - legW - 22;
  const legY = cursorY + mapH - legH - 20;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(legX, legY, legW, legH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.fillText(isTh ? 'สัญลักษณ์ระดับความเสี่ยง' : 'Risk Legend', legX + 16, legY + 28);

  const legendItems = [
    { color: '#059669', text: isTh ? 'ปกติ — พร้อมปล่อยสินเชื่อ' : 'Normal' },
    { color: '#D97706', text: isTh ? 'เฝ้าระวังล่วงหน้า 7 วัน' : '7-Day Watch' },
    { color: '#DC2626', text: isTh ? 'ความเสี่ยงวิกฤต' : 'Critical Risk' },
  ];
  legendItems.forEach((item, idx) => {
    const iy = legY + 56 + idx * 28;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legX + 24, iy - 4, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.font = `600 14px ${FONT_STACK}`;
    ctx.fillText(item.text, legX + 40, iy);
  });

  cursorY += mapH + 28;

  // Farmer Plots Coordinate & Risk Table
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(
    isTh
      ? 'รายชื่อแปลงเกษตรกรและพิกัดบนแผนที่ทั้งหมด'
      : 'Portfolio Plots & Geo-Coordinates Directory',
    marginX,
    cursorY
  );
  cursorY += 16;

  const headH = 40;
  const rowH = 54;
  ctx.fillStyle = '#ECFDF5';
  ctx.beginPath();
  ctx.roundRect(marginX, cursorY, contentWidth, headH, 8);
  ctx.fill();

  ctx.fillStyle = '#065F46';
  ctx.font = `700 14px ${FONT_STACK}`;
  ctx.fillText(isTh ? 'เกษตรกร / พื้นที่' : 'Farmer & Location', marginX + 16, cursorY + 26);
  ctx.fillText(isTh ? 'พืช / ขนาด' : 'Crop & Area', marginX + 410, cursorY + 26);
  ctx.fillText(isTh ? 'พิกัด GPS' : 'Coordinates', marginX + 640, cursorY + 26);
  ctx.fillText('NASA Score', marginX + 870, cursorY + 26);
  ctx.fillText(isTh ? 'สถานะ' : 'Status', marginX + 995, cursorY + 26);
  cursorY += headH + 4;

  payload.rows.slice(0, 10).forEach((row, idx) => {
    const ry = cursorY + idx * rowH;
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(marginX, ry, contentWidth, rowH);
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = `700 15px ${FONT_STACK}`;
    ctx.fillText(row.farmerName.slice(0, 28), marginX + 16, ry + 23);

    ctx.fillStyle = '#475569';
    ctx.font = `400 13px ${FONT_STACK}`;
    ctx.fillText(row.locationLabel, marginX + 16, ry + 43);

    ctx.fillStyle = '#334155';
    ctx.font = `600 14px ${FONT_STACK}`;
    ctx.fillText(row.cropAndArea, marginX + 410, ry + 32);

    ctx.fillStyle = '#475569';
    ctx.font = `500 13px ${MONO_STACK}`;
    ctx.fillText(row.coordLabel, marginX + 640, ry + 32);

    ctx.fillStyle = '#0F172A';
    ctx.font = `700 15px ${MONO_STACK}`;
    ctx.fillText(row.scoreLabel, marginX + 870, ry + 32);

    const statusColor =
      row.riskLevel === 'critical'
        ? '#B91C1C'
        : row.riskLevel === 'watch'
          ? '#B45309'
          : '#047857';
    ctx.fillStyle = statusColor;
    ctx.font = `700 14px ${FONT_STACK}`;
    ctx.fillText(row.riskLabel, marginX + 995, ry + 32);
  });

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = `400 14px ${FONT_STACK}`;
  ctx.fillText(
    `CropShield BAAC Officer Console · ${payload.scenarioLabel} · ${payload.layerLabel}`,
    marginX,
    A4_HEIGHT_PX - 42
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
