import type {
  AppLanguage,
  FarmPlotProfile,
  PlotEvaluation,
  RiskLevel,
  ScenarioType,
} from '../types/cropshield';
import type { SoilGridMapData } from './iotSoilSensor';

export interface FarmerCardSummary {
  statusBadgeText: string;
  scoreHeadline: string;
  creditAssuranceSubtext: string;
  warningHeadline: string;
  warningAdvice: string;
  warningTone: 'orange' | 'red';
  soilMoistureLabel: string;
  soilMoistureValue: string;
  soilMoistureTone: 'good' | 'dry' | 'wet';
  plotZonesLabel: string;
  plotZonesValue: string;
  plotZonesTone: 'good' | 'warn' | 'critical';
  mascotSpeech: string;
}

export function getElderlyRiskBadgeText(
  riskLevel: RiskLevel,
  lang: AppLanguage
): string {
  if (lang === 'en') {
    if (riskLevel === 'low') return 'Safe';
    if (riskLevel === 'watch') return 'Caution';
    return 'Critical';
  }
  if (riskLevel === 'low') return 'ปลอดภัย';
  if (riskLevel === 'watch') return 'ระวัง';
  return 'วิกฤต';
}

export function computeSoilMoistureCardState(
  avgMoisturePercent: number,
  scenario: ScenarioType,
  lang: AppLanguage
): {
  value: string;
  tone: 'good' | 'dry' | 'wet';
} {
  if (scenario === 'flood' || avgMoisturePercent >= 82) {
    return {
      value: lang === 'th' ? 'แฉะมาก' : 'Too Wet',
      tone: 'wet',
    };
  }
  if (scenario === 'drought' || avgMoisturePercent < 46) {
    return {
      value: lang === 'th' ? 'น้อย' : 'Low',
      tone: 'dry',
    };
  }
  if (avgMoisturePercent < 53) {
    return {
      value: lang === 'th' ? 'เริ่มลดลง' : 'Drying',
      tone: 'dry',
    };
  }
  return {
    value: lang === 'th' ? 'พอดี' : 'Good',
    tone: 'good',
  };
}

/**
 * Summarizes the 24 spatial cells into 4 simple human-readable farm zones
 * (Top-Left, Top-Right, Bottom-Left, Bottom-Right) so elderly farmers can
 * immediately grasp how many zones are healthy vs dry/wet.
 */
export function summarizeFourPlotZones(
  gridData: SoilGridMapData,
  scenario: ScenarioType,
  lang: AppLanguage
): {
  value: string;
  tone: 'good' | 'warn' | 'critical';
} {
  const cells = gridData.cells;
  if (cells.length === 0) {
    return {
      value: lang === 'th' ? '4 จุดปกติ' : '4 Normal Zones',
      tone: 'good',
    };
  }

  // Group into 4 quadrants: rows 0..1 vs 2..3, cols 0..2 vs 3..5
  const quadrantBuckets: number[][] = [[], [], [], []];
  for (const cell of cells) {
    const qRow = cell.row < 2 ? 0 : 1;
    const qCol = cell.col < 3 ? 0 : 1;
    const qIdx = qRow * 2 + qCol;
    quadrantBuckets[qIdx].push(cell.moisturePercent);
  }

  let normalZones = 0;
  let dryZones = 0;
  let wetZones = 0;

  for (const bucket of quadrantBuckets) {
    if (bucket.length === 0) {
      normalZones += 1;
      continue;
    }
    const avg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    if (scenario === 'flood' && avg >= 76) {
      wetZones += 1;
    } else if (avg >= 82) {
      wetZones += 1;
    } else if (avg < 50) {
      dryZones += 1;
    } else {
      normalZones += 1;
    }
  }

  if (dryZones > 0 && wetZones === 0) {
    return {
      value:
        lang === 'th'
          ? normalZones > 0
            ? `${normalZones} จุดปกติ / ${dryZones} จุดแห้ง`
            : `${dryZones} จุดแห้งทั้งหมด`
          : normalZones > 0
            ? `${normalZones} Good / ${dryZones} Dry`
            : `All ${dryZones} Dry`,
      tone: dryZones >= 3 ? 'critical' : 'warn',
    };
  }

  if (wetZones > 0) {
    return {
      value:
        lang === 'th'
          ? normalZones > 0
            ? `${normalZones} จุดปกติ / ${wetZones} จุดแฉะ`
            : `${wetZones} จุดน้ำขัง`
          : normalZones > 0
            ? `${normalZones} Good / ${wetZones} Wet`
            : `All ${wetZones} Flooded`,
      tone: wetZones >= 2 ? 'critical' : 'warn',
    };
  }

  return {
    value: lang === 'th' ? '4 จุดปกติ' : '4 Normal Zones',
    tone: 'good',
  };
}

export function buildFarmerDashboardSummary(params: {
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  gridData: SoilGridMapData;
  scenario: ScenarioType;
  lang: AppLanguage;
}): FarmerCardSummary {
  const { evaluation, gridData, scenario, lang } = params;
  const isTh = lang === 'th';

  const avgMoisture = Math.round(
    evaluation.forecast.reduce((sum, pt) => sum + pt.soilMoistureIndex, 0) /
      Math.max(1, evaluation.forecast.length)
  );
  const firstMoisture = evaluation.forecast[0]?.soilMoistureIndex ?? avgMoisture;
  const minMoisture = Math.min(
    ...evaluation.forecast.map((pt) => pt.soilMoistureIndex),
    firstMoisture
  );

  const statusBadgeText = getElderlyRiskBadgeText(evaluation.riskLevel, lang);
  const scoreHeadline = isTh
    ? `คะแนนแปลง: ${evaluation.healthScore} เต็ม 100`
    : `Plot Score: ${evaluation.healthScore} / 100`;
  const creditAssuranceSubtext = isTh
    ? 'ใช้ยืนยันความน่าเชื่อถือขอสินเชื่อและประกันได้'
    : 'Verified for farm credit & crop protection eligibility';

  let warningHeadline = '';
  let warningAdvice = '';
  let warningTone: 'orange' | 'red' = 'orange';

  if (scenario === 'flood') {
    warningTone = 'red';
    warningHeadline = isTh
      ? 'อีก 7 วันข้างหน้า: ฝนหนัก เสี่ยงน้ำท่วม'
      : 'Next 7 Days: Heavy Rain & Flood Risk';
    warningAdvice = isTh
      ? 'แนะนำให้เปิดทางระบายน้ำทันที และตรวจสิทธิ์ประกันภัยไว้'
      : 'Clear drainage channels now and activate crop weather shield.';
  } else if (scenario === 'drought' || evaluation.riskLevel === 'critical') {
    warningTone = 'red';
    warningHeadline = isTh
      ? 'อีก 7 วันข้างหน้า: ดินจะแห้งจัด'
      : 'Next 7 Days: Severe Soil Drying';
    warningAdvice = isTh
      ? 'แนะนำให้รีบเปิดน้ำเข้าแปลง และเช็กสิทธิ์สินเชื่อ/ประกันภัย'
      : 'Irrigate early morning/evening and review crop insurance.';
  } else if (
    evaluation.riskLevel === 'watch' ||
    firstMoisture - minMoisture >= 10 ||
    minMoisture < 50
  ) {
    warningTone = 'orange';
    warningHeadline = isTh
      ? 'อีก 7 วันข้างหน้า: ดินจะแห้งลง'
      : 'Next 7 Days: Soil Will Dry Out';
    warningAdvice = isTh
      ? 'แนะนำให้เปิดน้ำวันพุธนี้ เพื่อรักษาผลผลิต'
      : 'Water this Wednesday to protect crop yield.';
  } else {
    warningTone = 'orange';
    warningHeadline = isTh
      ? 'อีก 7 วันข้างหน้า: สภาพแปลงปกติ'
      : 'Next 7 Days: Healthy Field Outlook';
    warningAdvice = isTh
      ? 'ความชื้นกำลังพอดี ดูแลให้น้ำตามรอบปกติได้เลย'
      : 'Moisture looks balanced—continue your normal watering routine.';
  }

  const moistureState = computeSoilMoistureCardState(avgMoisture, scenario, lang);
  const zoneState = summarizeFourPlotZones(gridData, scenario, lang);

  let mascotSpeech = isTh
    ? 'วันนี้แปลงยังโอเคครับลุง/ป้า'
    : 'Your plot looks good today!';
  if (scenario === 'drought' || evaluation.riskLevel === 'critical') {
    mascotSpeech = isTh
      ? 'ช่วงนี้ดินแห้งจัด อย่าลืมเปิดน้ำเพิ่มนะครับลุง/ป้า'
      : 'Soil is very dry—please water your field soon!';
  } else if (scenario === 'flood') {
    mascotSpeech = isTh
      ? 'ช่วงนี้ฝนตกหนัก รีบเช็กทางระบายน้ำและประกันไว้เลยครับ'
      : 'Heavy rain expected—check drainage and weather shield!';
  }

  return {
    statusBadgeText,
    scoreHeadline,
    creditAssuranceSubtext,
    warningHeadline,
    warningAdvice,
    warningTone,
    soilMoistureLabel: isTh ? 'ความชื้นดิน' : 'Soil Moisture',
    soilMoistureValue: moistureState.value,
    soilMoistureTone: moistureState.tone,
    plotZonesLabel: isTh ? 'โซนแปลง' : 'Plot Zones',
    plotZonesValue: zoneState.value,
    plotZonesTone: zoneState.tone,
    mascotSpeech,
  };
}

export function buildShareableStatusPost(params: {
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  gridData: SoilGridMapData;
  scenario: ScenarioType;
  lang: AppLanguage;
}): string {
  const { plot, lang } = params;
  const isTh = lang === 'th';
  const summary = buildFarmerDashboardSummary(params);
  const plotTitle = !isTh && plot.nameEn ? plot.nameEn : plot.name;
  const cropLabel = !isTh && plot.cropTypeEn ? plot.cropTypeEn : plot.cropType;

  if (isTh) {
    return [
      `🌱 อัปเดตสถานะแปลงเกษตร (CropShield)`,
      `📍 แปลง: ${plotTitle} (${cropLabel} · ${plot.areaRai} ไร่)`,
      `📊 ${summary.scoreHeadline} | สถานะ: ${summary.statusBadgeText}`,
      `🌤️ ${summary.warningHeadline}`,
      `💧 ความชื้นดิน: ${summary.soilMoistureValue} | โซนแปลง: ${summary.plotZonesValue}`,
      `✅ คำแนะนำ: ${summary.warningAdvice}`,
      `🔗 ยืนยันข้อมูลดาวเทียม NASA สำหรับขอสินเชื่อ/ประกันภัยพืชผล`,
      `#CropShield #เกษตรกรยุคใหม่`,
    ].join('\n');
  }

  return [
    `🌱 Farm Status Update (CropShield)`,
    `📍 Plot: ${plotTitle} (${cropLabel} · ${plot.areaRai} Rai)`,
    `📊 ${summary.scoreHeadline} | Status: ${summary.statusBadgeText}`,
    `🌤️ ${summary.warningHeadline}`,
    `💧 Soil Moisture: ${summary.soilMoistureValue} | Zones: ${summary.plotZonesValue}`,
    `✅ Tip: ${summary.warningAdvice}`,
    `🔗 Backed by NASA satellite insights for farm credit & crop protection`,
    `#CropShield #SmartFarming`,
  ].join('\n');
}

