import type {
  FarmPlotProfile,
  PlotEvaluation,
  ScenarioType,
} from '../types/cropshield';
import { clamp } from './nasaPower';

export type SensorStatusLevel = 'optimal' | 'dry' | 'saturated';

export interface IoTSensorHourlyPoint {
  hourLabel: string;
  surface10cm: number; // % VWC
  rootZone30cm: number; // % VWC
  nasaBaseline: number; // %
}

export interface IoTSensorReading {
  nodeId: string;
  connectivityLabel: string;
  batteryPercent: number;
  signalStrengthLabelTh: string;
  signalStrengthLabelEn: string;
  surfaceMoisture10cm: number; // % VWC
  rootZoneMoisture30cm: number; // % VWC
  nasaSurfaceMoisture: number; // % from evaluation day 1
  deltaVsNasaPercent: number; // surface10cm - nasaSurfaceMoisture
  soilTempC: number;
  soilPh: number;
  ecDsPerM: number;
  statusLevel: SensorStatusLevel;
  hourlySeries: IoTSensorHourlyPoint[];
  calibrationNoteTh: string;
  calibrationNoteEn: string;
  lastPolledLabel: string;
}

function deriveNodeId(plotId: string): string {
  if (plotId === 'plot-phetchabun-corn') return 'CS-PROBE-PHB01';
  if (plotId === 'plot-surin-rice') return 'CS-PROBE-SRN02';
  if (plotId === 'plot-suphan-sugarcane') return 'CS-PROBE-SPB03';
  const suffix = plotId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '001';
  return `CS-PROBE-${suffix}`;
}

export function computeIoTSensorReading(
  plot: FarmPlotProfile,
  evaluation: PlotEvaluation,
  scenario: ScenarioType,
  pollStep = 0,
  polledTimeLabel?: string
): IoTSensorReading {
  const day1 = evaluation.forecast[0] ?? plot.forecast[0];
  const nasaSurfaceMoisture = Math.round(clamp(day1?.soilMoistureIndex ?? 58, 18, 96));
  const day1Temp = day1?.tempMaxC ?? 33;

  // Ground probe reflects micro-climate canopy shade and root-zone retention
  const coordOffset = Math.round(Math.sin(plot.lat * 3.1 + plot.lon * 1.7) * 3);
  const pollJitter =
    pollStep === 0 ? 0 : Math.round(Math.sin(pollStep * 2.15) * 2 + (pollStep % 2 === 0 ? -1 : 1));

  const scenarioRootShift = scenario === 'drought' ? -5 : scenario === 'flood' ? 4 : 4;
  const scenarioSurfaceShift = scenario === 'drought' ? -2 : scenario === 'flood' ? 2 : 1;

  const surfaceMoisture10cm = Math.round(
    clamp(nasaSurfaceMoisture + coordOffset + scenarioSurfaceShift + pollJitter, 16, 98)
  );
  const rootZoneMoisture30cm = Math.round(
    clamp(
      surfaceMoisture10cm + scenarioRootShift + (scenario === 'drought' ? 2 : 5),
      20,
      98
    )
  );

  const deltaVsNasaPercent = surfaceMoisture10cm - nasaSurfaceMoisture;

  const soilTempC = Number(
    clamp(day1Temp - 4.2 + (scenario === 'drought' ? 2.1 : scenario === 'flood' ? -1.8 : 0), 21, 38).toFixed(1)
  );
  const soilPh = Number(
    clamp(6.3 + Math.cos(plot.lat + plot.lon) * 0.4, 5.4, 7.6).toFixed(1)
  );
  const ecDsPerM = Number(
    clamp(
      0.85 + (scenario === 'drought' ? 0.35 : scenario === 'flood' ? -0.2 : 0.05),
      0.35,
      1.95
    ).toFixed(2)
  );

  const batteryPercent = Math.round(clamp(88 - (pollStep % 4) + (scenario === 'flood' ? -6 : 4), 68, 99));

  const statusLevel: SensorStatusLevel =
    surfaceMoisture10cm >= 85 || rootZoneMoisture30cm >= 88
      ? 'saturated'
      : surfaceMoisture10cm < 38 || rootZoneMoisture30cm < 42
        ? 'dry'
        : 'optimal';

  // Generate 6 readings over the last 24 hours (-20h, -16h, -12h, -8h, -4h, Now)
  const hourLabels = ['-20h', '-16h', '-12h', '-8h', '-4h', 'Now'];
  const hourlySeries: IoTSensorHourlyPoint[] = hourLabels.map((hourLabel, idx) => {
    const isNow = idx === hourLabels.length - 1;
    const trendSlope = scenario === 'drought' ? 1.6 : scenario === 'flood' ? -2.2 : 0.7;
    const distanceFromNow = hourLabels.length - 1 - idx;
    const diurnalWave = Math.sin((idx / 5) * Math.PI) * 2.2;

    const s10 = isNow
      ? surfaceMoisture10cm
      : Math.round(clamp(surfaceMoisture10cm + distanceFromNow * trendSlope + diurnalWave, 15, 98));
    const r30 = isNow
      ? rootZoneMoisture30cm
      : Math.round(clamp(rootZoneMoisture30cm + distanceFromNow * (trendSlope * 0.55) + diurnalWave * 0.5, 18, 98));

    return {
      hourLabel,
      surface10cm: s10,
      rootZone30cm: r30,
      nasaBaseline: nasaSurfaceMoisture,
    };
  });

  let calibrationNoteTh = '';
  let calibrationNoteEn = '';

  if (statusLevel === 'saturated') {
    calibrationNoteTh = `หัววัดใต้ดินลึก 30 ซม. วัดได้ ${rootZoneMoisture30cm}% สูงกว่าเกณฑ์อิ่มตัว สอดคล้องกับสัญญาณดาวเทียม NASA (${nasaSurfaceMoisture}%) ควรเร่งเปิดทางระบายน้ำ`;
    calibrationNoteEn = `30 cm root probe reads ${rootZoneMoisture30cm}% (saturated), confirming NASA satellite (${nasaSurfaceMoisture}%). Open drainage trenches immediately.`;
  } else if (statusLevel === 'dry') {
    calibrationNoteTh = `ความชื้นผิวดินจากเซ็นเซอร์ลดลงเหลือ ${surfaceMoisture10cm}% และชั้นรากอยู่ที่ ${rootZoneMoisture30cm}% แนะนำเปิดระบบน้ำหยดเสริมเพื่อป้องกันรากขาดน้ำ`;
    calibrationNoteEn = `Ground probe confirms dry topsoil (${surfaceMoisture10cm}%) and ${rootZoneMoisture30cm}% root zone. Run supplemental irrigation to protect root uptake.`;
  } else if (deltaVsNasaPercent >= 2) {
    calibrationNoteTh = `เซ็นเซอร์ในแปลงชื้นกว่าค่าเฉลี่ยดาวเทียม NASA อยู่ +${deltaVsNasaPercent}% (ชั้นราก 30 ซม. ชุ่ม ${rootZoneMoisture30cm}%) ช่วยชะลอรอบการสูบน้ำและประหยัดค่าไฟได้`;
    calibrationNoteEn = `In-field probe reads +${deltaVsNasaPercent}% wetter than NASA satellite pixel (${rootZoneMoisture30cm}% at 30 cm root depth)—safe to skip extra pumping today.`;
  } else {
    calibrationNoteTh = `ค่าหัววัดภาคพื้นดิน (${surfaceMoisture10cm}%) สอดคล้องกับดาวเทียม NASA (${nasaSurfaceMoisture}%) และความชื้นชั้นราก 30 ซม. อยู่ที่ ${rootZoneMoisture30cm}% อยู่ในเกณฑ์สมบูรณ์`;
    calibrationNoteEn = `Ground probe (${surfaceMoisture10cm}%) aligns closely with NASA satellite (${nasaSurfaceMoisture}%), with healthy ${rootZoneMoisture30cm}% moisture at 30 cm root depth.`;
  }

  return {
    nodeId: deriveNodeId(plot.id),
    connectivityLabel: 'LoRaWAN · 923 MHz',
    batteryPercent,
    signalStrengthLabelTh: 'สัญญาณดี (-74 dBm)',
    signalStrengthLabelEn: 'Strong (-74 dBm)',
    surfaceMoisture10cm,
    rootZoneMoisture30cm,
    nasaSurfaceMoisture,
    deltaVsNasaPercent,
    soilTempC,
    soilPh,
    ecDsPerM,
    statusLevel,
    hourlySeries,
    calibrationNoteTh,
    calibrationNoteEn,
    lastPolledLabel: polledTimeLabel ?? 'Live · 1 min ago',
  };
}

export type SoilGridLayerMode = 'combined' | 'moisture' | 'nutrients';
export type SoilGridZoneHealth = 'optimal' | 'watch' | 'critical';

export interface SoilGridCell {
  id: string;
  row: number;
  col: number;
  zoneCode: string;
  hasSensorNode: boolean;
  moisturePercent: number;
  nutrientScore: number;
  ecDsPerM: number;
  combinedHealthScore: number;
  moistureStatus: SoilGridZoneHealth;
  nutrientStatus: SoilGridZoneHealth;
  combinedStatus: SoilGridZoneHealth;
  isSaturated: boolean;
}

export interface SoilGridMapData {
  rows: number;
  cols: number;
  cells: SoilGridCell[];
  optimalZoneCount: number;
  watchZoneCount: number;
  criticalZoneCount: number;
  avgNutrientScore: number;
}

function classifyMoistureZone(moisture: number): {
  status: SoilGridZoneHealth;
  suitabilityScore: number;
  isSaturated: boolean;
} {
  if (moisture >= 88) {
    return { status: 'critical', suitabilityScore: 38, isSaturated: true };
  }
  if (moisture >= 80) {
    return { status: 'watch', suitabilityScore: 66, isSaturated: true };
  }
  if (moisture < 36) {
    return {
      status: 'critical',
      suitabilityScore: Math.round(clamp((moisture / 36) * 48, 15, 48)),
      isSaturated: false,
    };
  }
  if (moisture < 48) {
    return {
      status: 'watch',
      suitabilityScore: Math.round(52 + ((moisture - 36) / 12) * 20),
      isSaturated: false,
    };
  }
  // Optimal range: 48..79
  const distFromCenter = Math.abs(moisture - 64);
  const suitabilityScore = Math.round(clamp(96 - distFromCenter * 1.1, 76, 98));
  return { status: 'optimal', suitabilityScore, isSaturated: false };
}

function classifyScoreZone(score: number): SoilGridZoneHealth {
  if (score >= 75) return 'optimal';
  if (score >= 55) return 'watch';
  return 'critical';
}

export function computeSoilHealthGrid(
  plot: FarmPlotProfile,
  reading: IoTSensorReading,
  scenario: ScenarioType
): SoilGridMapData {
  const rows = 4;
  const cols = 6;
  const rowLetters = ['A', 'B', 'C', 'D'];
  const sensorCoords = new Set(['0-1', '1-4', '2-2']);

  // Base nutrient score around optimal EC (0.8..1.2 dS/m) and pH (6.0..6.8)
  const ecDeviation = Math.abs(reading.ecDsPerM - 0.95);
  const phDeviation = Math.abs(reading.soilPh - 6.4);
  const baseNutrientScore = clamp(
    90 - ecDeviation * 42 - phDeviation * 14 - (scenario === 'flood' ? 12 : scenario === 'drought' ? 7 : 0),
    35,
    96
  );

  const cells: SoilGridCell[] = [];
  let optimalZoneCount = 0;
  let watchZoneCount = 0;
  let criticalZoneCount = 0;
  let nutrientSum = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const zoneCode = `${rowLetters[r]}${c + 1}`;
      const hasSensorNode = sensorCoords.has(`${r}-${c}`);

      // Spatial micro-variation: edges & southern rows vary by irrigation/drainage slope
      const centerDist = Math.sqrt(Math.pow(r - 1.5, 2) + Math.pow(c - 2.5, 2));
      const wave = Math.sin((r + 1) * 1.45 + (c + 1) * 0.9 + plot.lat * 0.5) * 6;
      const slopeShift =
        scenario === 'flood'
          ? (r - 1.2) * 5.5 + (c - 2) * 1.8
          : scenario === 'drought'
            ? -centerDist * 5.2
            : -centerDist * 2.6;

      const moisturePercent = Math.round(
        clamp(reading.surfaceMoisture10cm + wave + slopeShift, 16, 97)
      );

      const nutrientWave =
        Math.cos((r + 0.7) * 1.8 - (c + 0.5) * 1.1 + plot.lon * 0.4) * 9;
      const leachingPenalty =
        scenario === 'flood' && r >= 2 ? -10 : scenario === 'drought' && centerDist > 2 ? -8 : 0;

      const nutrientScore = Math.round(
        clamp(baseNutrientScore + nutrientWave + leachingPenalty, 28, 98)
      );
      const ecDsPerM = Number(
        clamp(reading.ecDsPerM + (nutrientWave / 100) * 0.85, 0.25, 2.05).toFixed(2)
      );

      const moistureEval = classifyMoistureZone(moisturePercent);
      const nutrientStatus = classifyScoreZone(nutrientScore);
      const combinedHealthScore = Math.round(
        clamp(moistureEval.suitabilityScore * 0.55 + nutrientScore * 0.45, 20, 99)
      );
      const combinedStatus = classifyScoreZone(combinedHealthScore);

      if (combinedStatus === 'optimal') optimalZoneCount++;
      else if (combinedStatus === 'watch') watchZoneCount++;
      else criticalZoneCount++;

      nutrientSum += nutrientScore;

      cells.push({
        id: `zone-${zoneCode}`,
        row: r,
        col: c,
        zoneCode,
        hasSensorNode,
        moisturePercent,
        nutrientScore,
        ecDsPerM,
        combinedHealthScore,
        moistureStatus: moistureEval.status,
        nutrientStatus,
        combinedStatus,
        isSaturated: moistureEval.isSaturated,
      });
    }
  }

  return {
    rows,
    cols,
    cells,
    optimalZoneCount,
    watchZoneCount,
    criticalZoneCount,
    avgNutrientScore: Math.round(nutrientSum / Math.max(1, cells.length)),
  };
}

export function computeZoneIoTSensorReading(
  baseReading: IoTSensorReading,
  cell: SoilGridCell
): IoTSensorReading {
  const moistureDelta = cell.moisturePercent - baseReading.surfaceMoisture10cm;
  const depthSpread = baseReading.rootZoneMoisture30cm - baseReading.surfaceMoisture10cm;
  const surfaceMoisture10cm = cell.moisturePercent;
  const rootZoneMoisture30cm = Math.round(
    clamp(surfaceMoisture10cm + depthSpread, 18, 98)
  );
  const deltaVsNasaPercent = surfaceMoisture10cm - baseReading.nasaSurfaceMoisture;

  const soilTempC = Number(
    clamp(baseReading.soilTempC - moistureDelta * 0.08, 20, 39).toFixed(1)
  );
  const soilPh = Number(
    clamp(
      baseReading.soilPh + ((cell.row - 1.5) * 0.06 - (cell.col - 2.5) * 0.03),
      5.2,
      7.8
    ).toFixed(1)
  );

  const statusLevel: SensorStatusLevel =
    cell.isSaturated || surfaceMoisture10cm >= 85 || rootZoneMoisture30cm >= 88
      ? 'saturated'
      : surfaceMoisture10cm < 40 || rootZoneMoisture30cm < 44
        ? 'dry'
        : 'optimal';

  const hourlySeries: IoTSensorHourlyPoint[] = baseReading.hourlySeries.map(
    (pt, idx) => {
      const isNow = idx === baseReading.hourlySeries.length - 1;
      return {
        hourLabel: pt.hourLabel,
        surface10cm: isNow
          ? surfaceMoisture10cm
          : Math.round(clamp(pt.surface10cm + moistureDelta, 15, 98)),
        rootZone30cm: isNow
          ? rootZoneMoisture30cm
          : Math.round(clamp(pt.rootZone30cm + moistureDelta, 18, 98)),
        nasaBaseline: pt.nasaBaseline,
      };
    }
  );

  const nodeTagTh = cell.hasSensorNode
    ? `${baseReading.nodeId} · หัววัดโซน ${cell.zoneCode}`
    : `${baseReading.nodeId} → โซน ${cell.zoneCode} (คำนวณร่วม)`;
  const nodeTagEn = cell.hasSensorNode
    ? `${baseReading.nodeId} · Probe ${cell.zoneCode}`
    : `${baseReading.nodeId} → Zone ${cell.zoneCode} (Grid Est.)`;

  let calibrationNoteTh = '';
  let calibrationNoteEn = '';

  if (statusLevel === 'saturated') {
    calibrationNoteTh = `โซน ${cell.zoneCode}: ความชื้นผิวดิน ${surfaceMoisture10cm}% และชั้นราก ${rootZoneMoisture30cm}% สูงกว่าเกณฑ์อิ่มตัว ควรเปิดทางระบายน้ำในโซนนี้`;
    calibrationNoteEn = `Zone ${cell.zoneCode}: Topsoil (${surfaceMoisture10cm}%) and 30 cm root zone (${rootZoneMoisture30cm}%) are saturated—prioritize furrow drainage here.`;
  } else if (statusLevel === 'dry') {
    calibrationNoteTh = `โซน ${cell.zoneCode}: ความชื้นลดลงเหลือ ${surfaceMoisture10cm}% (ชั้นราก ${rootZoneMoisture30cm}%) แนะนำเปิดน้ำหยดเสริมเฉพาะโซนนี้`;
    calibrationNoteEn = `Zone ${cell.zoneCode}: Moisture dropped to ${surfaceMoisture10cm}% (${rootZoneMoisture30cm}% root zone)—target supplemental drip irrigation here.`;
  } else if (cell.nutrientStatus !== 'optimal') {
    calibrationNoteTh = `โซน ${cell.zoneCode}: ความชื้นเหมาะสม (${surfaceMoisture10cm}%) แต่ค่าปุ๋ย EC อยู่ที่ ${cell.ecDsPerM} dS/m แนะนำปรับธาตุอาหารเฉพาะจุด`;
    calibrationNoteEn = `Zone ${cell.zoneCode}: Moisture is optimal (${surfaceMoisture10cm}%), while EC reads ${cell.ecDsPerM} dS/m—consider targeted nutrient balancing.`;
  } else {
    calibrationNoteTh = `โซน ${cell.zoneCode}: ความชื้นผิวดิน ${surfaceMoisture10cm}% (ชั้นราก ${rootZoneMoisture30cm}%) และ EC ${cell.ecDsPerM} dS/m อยู่ในเกณฑ์สมดุล`;
    calibrationNoteEn = `Zone ${cell.zoneCode}: Topsoil (${surfaceMoisture10cm}%), 30 cm root zone (${rootZoneMoisture30cm}%), and EC (${cell.ecDsPerM} dS/m) are well balanced.`;
  }

  return {
    ...baseReading,
    nodeId: baseReading.nodeId,
    connectivityLabel: cell.hasSensorNode ? baseReading.connectivityLabel : `${nodeTagEn.split('·')[0].trim()}`,
    surfaceMoisture10cm,
    rootZoneMoisture30cm,
    deltaVsNasaPercent,
    soilTempC,
    soilPh,
    ecDsPerM: cell.ecDsPerM,
    statusLevel,
    hourlySeries,
    calibrationNoteTh,
    calibrationNoteEn,
    signalStrengthLabelTh: nodeTagTh,
    signalStrengthLabelEn: nodeTagEn,
  };
}


