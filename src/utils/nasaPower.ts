import type {
  BaacPortfolioKpis,
  DailyForecastPoint,
  DataSourceMode,
  EarlyWarningInfo,
  FarmPlotProfile,
  FarmerLoanRecord,
  NasaWeatherObservationDay,
  NasaWeatherTelemetry,
  PlotEvaluation,
  RiskLevel,
} from '../types/cropshield';

const THAI_DAYS = [
  'วันนี้',
  'พรุ่งนี้',
  'วันมะรืน',
  'วันอังคารหน้า',
  'วันพุธหน้า',
  'วันพฤหัสฯ หน้า',
  'วันศุกร์หน้า',
];

export const DEMO_PLOTS: FarmPlotProfile[] = [
  {
    id: 'plot-phetchabun-corn',
    name: 'แปลงข้าวโพด อ.หนองไผ่ จ.เพชรบูรณ์',
    nameEn: 'Feed Corn Plot · Nong Phai, Phetchabun',
    ownerName: 'สมชาย รักษ์ดิน',
    cropType: 'ข้าวโพดเลี้ยงสัตว์',
    cropTypeEn: 'Feed Corn',
    areaRai: 24,
    province: 'เพชรบูรณ์',
    provinceEn: 'Phetchabun',
    lat: 16.0124,
    lon: 101.0567,
    irrigationType: 'น้ำหยดเสริม + น้ำฝน',
    irrigationTypeEn: 'Supplemental Drip + Rainfed',
    baselineScore: 78,
    preApprovedCreditLimitThb: 60000,
    recommendedWorkingCapitalThb: 18000,
    parametricCoverageThb: 45000,
    parametricTriggerTh: 'ความชื้นในดินต่ำกว่า 35% ต่อเนื่อง 3 วัน',
    parametricTriggerEn: 'Soil moisture below 35% for 3 consecutive days',
    forecast: [
      {
        dayNumber: 1,
        dayLabelTh: 'วันเสาร์',
        dateShort: 'Day 1',
        soilMoistureIndex: 62,
        cropStressIndex: 24,
        rainChancePercent: 35,
        tempMaxC: 32,
        advisoryTh: 'ความชื้นในดินยังเหมาะสม พืชดูดซึมปุ๋ยได้ดี ไม่ต้องให้น้ำเพิ่ม',
      },
      {
        dayNumber: 2,
        dayLabelTh: 'วันอาทิตย์',
        dateShort: 'Day 2',
        soilMoistureIndex: 58,
        cropStressIndex: 29,
        rainChancePercent: 25,
        tempMaxC: 33,
        advisoryTh: 'แดดเริ่มแรงช่วงบ่าย ควรคลุมโคนต้นด้วยเศษฟางเพื่อรักษาความชื้น',
      },
      {
        dayNumber: 3,
        dayLabelTh: 'วันจันทร์',
        dateShort: 'Day 3',
        soilMoistureIndex: 53,
        cropStressIndex: 36,
        rainChancePercent: 15,
        tempMaxC: 34,
        advisoryTh: 'ฝนทิ้งช่วงเริ่มชัดเจน ตรวจเช็กวาล์วและท่อส่งน้ำหยดให้พร้อมใช้งาน',
      },
      {
        dayNumber: 4,
        dayLabelTh: 'วันอังคาร',
        dateShort: 'Day 4',
        soilMoistureIndex: 47,
        cropStressIndex: 45,
        rainChancePercent: 10,
        tempMaxC: 35,
        advisoryTh: 'ดินเริ่มแห้งในชั้นราก ควรเตรียมสูบน้ำเข้าระบบช่วงเย็นเพื่อลดการระเหย',
      },
      {
        dayNumber: 5,
        dayLabelTh: 'วันพุธหน้า',
        dateShort: 'Day 5',
        soilMoistureIndex: 44,
        cropStressIndex: 58,
        rainChancePercent: 10,
        tempMaxC: 36,
        advisoryTh: 'ความชื้นลดลง 18% จากต้นสัปดาห์ ให้เปิดระบบน้ำเสริมทันทีช่วงเช้าตรู่หรือค่ำ',
      },
      {
        dayNumber: 6,
        dayLabelTh: 'วันพฤหัสฯ หน้า',
        dateShort: 'Day 6',
        soilMoistureIndex: 46,
        cropStressIndex: 50,
        rainChancePercent: 25,
        tempMaxC: 35,
        advisoryTh: 'รักษาระดับความชื้นต่อเนื่อง หลังเปิดระบบน้ำเสริมความชื้นจะเริ่มทรงตัว',
      },
      {
        dayNumber: 7,
        dayLabelTh: 'วันศุกร์หน้า',
        dateShort: 'Day 7',
        soilMoistureIndex: 49,
        cropStressIndex: 39,
        rainChancePercent: 45,
        tempMaxC: 33,
        advisoryTh: 'เริ่มมีเมฆฝนเข้ามาช่วยบรรเทาความร้อน ตรวจระบายน้ำหากฝนตกหนักช่วงค่ำ',
      },
    ],
  },
  {
    id: 'plot-surin-rice',
    name: 'แปลงข้าวหอมมะลิ อ.เมือง จ.สุรินทร์',
    nameEn: 'Jasmine Rice Plot · Mueang Surin, Surin',
    ownerName: 'มาลี สุขสมบูรณ์',
    cropType: 'ข้าวหอมมะลิ 105',
    cropTypeEn: 'Jasmine Rice 105',
    areaRai: 18,
    province: 'สุรินทร์',
    provinceEn: 'Surin',
    lat: 14.8829,
    lon: 103.4937,
    irrigationType: 'ชลประทาน + สระน้ำประจำแปลง',
    irrigationTypeEn: 'Canal Irrigation + Farm Pond',
    baselineScore: 87,
    preApprovedCreditLimitThb: 50000,
    recommendedWorkingCapitalThb: 12000,
    parametricCoverageThb: 40000,
    parametricTriggerTh: 'ระดับความชื้นในแปลงนาต่ำกว่า 40% ต่อเนื่อง 4 วัน',
    parametricTriggerEn: 'Paddy moisture below 40% for 4 consecutive days',
    forecast: [
      {
        dayNumber: 1,
        dayLabelTh: 'วันเสาร์',
        dateShort: 'Day 1',
        soilMoistureIndex: 74,
        cropStressIndex: 16,
        rainChancePercent: 55,
        tempMaxC: 31,
        advisoryTh: 'ระดับน้ำและดินชุ่มชื้นสมดุล ต้นข้าวแตกกอแข็งแรง',
      },
      {
        dayNumber: 2,
        dayLabelTh: 'วันอาทิตย์',
        dateShort: 'Day 2',
        soilMoistureIndex: 76,
        cropStressIndex: 15,
        rainChancePercent: 60,
        tempMaxC: 30,
        advisoryTh: 'มีฝนโปรยปรายช่วยเติมน้ำในนา ประหยัดค่าสูบน้ำได้เต็มสัปดาห์',
      },
      {
        dayNumber: 3,
        dayLabelTh: 'วันจันทร์',
        dateShort: 'Day 3',
        soilMoistureIndex: 73,
        cropStressIndex: 18,
        rainChancePercent: 45,
        tempMaxC: 31,
        advisoryTh: 'เหมาะแก่การเดินสำรวจโรคใบไหม้และให้ปุ๋ยรับรวงตามรอบ',
      },
      {
        dayNumber: 4,
        dayLabelTh: 'วันอังคาร',
        dateShort: 'Day 4',
        soilMoistureIndex: 70,
        cropStressIndex: 21,
        rainChancePercent: 35,
        tempMaxC: 32,
        advisoryTh: 'ความชื้นอยู่ในเกณฑ์ดีมาก รักษาคันนาให้สมบูรณ์เพื่อกักเก็บน้ำ',
      },
      {
        dayNumber: 5,
        dayLabelTh: 'วันพุธหน้า',
        dateShort: 'Day 5',
        soilMoistureIndex: 68,
        cropStressIndex: 23,
        rainChancePercent: 30,
        tempMaxC: 32,
        advisoryTh: 'สภาพอากาศปลอดโปร่ง ต้นข้าวสังเคราะห์แสงเต็มที่',
      },
      {
        dayNumber: 6,
        dayLabelTh: 'วันพฤหัสฯ หน้า',
        dateShort: 'Day 6',
        soilMoistureIndex: 66,
        cropStressIndex: 25,
        rainChancePercent: 30,
        tempMaxC: 33,
        advisoryTh: 'ยังไม่ต้องสูบน้ำเสริม ใช้ข้อมูลคะแนนความสมบูรณ์ยื่นรับสินเชื่อดอกเบี้ยต่ำได้',
      },
      {
        dayNumber: 7,
        dayLabelTh: 'วันศุกร์หน้า',
        dateShort: 'Day 7',
        soilMoistureIndex: 69,
        cropStressIndex: 20,
        rainChancePercent: 50,
        tempMaxC: 31,
        advisoryTh: 'สัปดาห์หน้ามีแนวโน้มฝนตกต่อเนื่อง ผลผลิตคาดการณ์อยู่ในเกณฑ์สูง',
      },
    ],
  },
  {
    id: 'plot-suphan-sugarcane',
    name: 'แปลงอ้อยโรงงาน อ.ด่านช้าง จ.สุพรรณบุรี',
    nameEn: 'Sugarcane Plot · Dan Chang, Suphan Buri',
    ownerName: 'วิชัย พันธุ์ทอง',
    cropType: 'อ้อยโรงงาน (ขอนแก่น 3)',
    cropTypeEn: 'Sugarcane (Khon Kaen 3)',
    areaRai: 35,
    province: 'สุพรรณบุรี',
    provinceEn: 'Suphan Buri',
    lat: 14.8415,
    lon: 99.6974,
    irrigationType: 'อาศัยน้ำฝนเป็นหลัก',
    irrigationTypeEn: 'Primarily Rainfed',
    baselineScore: 54,
    preApprovedCreditLimitThb: 45000,
    recommendedWorkingCapitalThb: 25000,
    parametricCoverageThb: 70000,
    parametricTriggerTh: 'ความชื้นในดินต่ำกว่า 32% ต่อเนื่อง 3 วัน',
    parametricTriggerEn: 'Soil moisture below 32% for 3 consecutive days',
    forecast: [
      {
        dayNumber: 1,
        dayLabelTh: 'วันเสาร์',
        dateShort: 'Day 1',
        soilMoistureIndex: 43,
        cropStressIndex: 52,
        rainChancePercent: 10,
        tempMaxC: 35,
        advisoryTh: 'ความชื้นในดินเริ่มต่ำกว่าค่ามาตรฐาน ควรจัดหารถน้ำหรือระบบน้ำสำรอง',
      },
      {
        dayNumber: 2,
        dayLabelTh: 'วันอาทิตย์',
        dateShort: 'Day 2',
        soilMoistureIndex: 39,
        cropStressIndex: 60,
        rainChancePercent: 5,
        tempMaxC: 36,
        advisoryTh: 'อากาศร้อนแห้ง อ้อยเริ่มม้วนใบช่วงกลางวัน แนะนำฉีดพ่นสารลดการคายน้ำ',
      },
      {
        dayNumber: 3,
        dayLabelTh: 'วันจันทร์',
        dateShort: 'Day 3',
        soilMoistureIndex: 35,
        cropStressIndex: 67,
        rainChancePercent: 5,
        tempMaxC: 37,
        advisoryTh: 'เสี่ยงแล้งสะสม แนะนำกดขอวงเงินหมุนเวียนฉุกเฉินเพื่อจ้างสูบน้ำเข้าแปลง',
      },
      {
        dayNumber: 4,
        dayLabelTh: 'วันอังคาร',
        dateShort: 'Day 4',
        soilMoistureIndex: 31,
        cropStressIndex: 74,
        rainChancePercent: 5,
        tempMaxC: 37,
        advisoryTh: 'จุดวิกฤตความชื้นในดินต่ำกว่า 32% เข้าเงื่อนไขประกันภัยอัตโนมัติ (Parametric Shield)',
      },
      {
        dayNumber: 5,
        dayLabelTh: 'วันพุธหน้า',
        dateShort: 'Day 5',
        soilMoistureIndex: 29,
        cropStressIndex: 78,
        rainChancePercent: 5,
        tempMaxC: 38,
        advisoryTh: 'ความชื้นลดลง 32% จากต้นสัปดาห์ ต้องให้น้ำประคองรากอย่างเร่งด่วน',
      },
      {
        dayNumber: 6,
        dayLabelTh: 'วันพฤหัสฯ หน้า',
        dateShort: 'Day 6',
        soilMoistureIndex: 28,
        cropStressIndex: 76,
        rainChancePercent: 10,
        tempMaxC: 37,
        advisoryTh: 'หากเปิดใช้งาน Parametric Shield ระบบจะเตรียมจ่ายชดเชยอัตโนมัติ',
      },
      {
        dayNumber: 7,
        dayLabelTh: 'วันศุกร์หน้า',
        dateShort: 'Day 7',
        soilMoistureIndex: 32,
        cropStressIndex: 68,
        rainChancePercent: 20,
        tempMaxC: 36,
        advisoryTh: 'ติดตามการฟื้นตัวของยอดอ้อยหลังให้น้ำ และประสานเจ้าหน้าที่ ธ.ก.ส.',
      },
    ],
  },
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function classifyRiskLevel(
  healthScore: number,
  minSoilMoisture: number,
  maxCropStress: number
): RiskLevel {
  if (healthScore < 60 || minSoilMoisture < 32 || maxCropStress >= 72) {
    return 'critical';
  }
  if (healthScore < 82 || minSoilMoisture < 48 || maxCropStress >= 48) {
    return 'watch';
  }
  return 'low';
}

export function getRiskLabelTh(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'low':
      return 'ความเสี่ยงต่ำ (เขียว)';
    case 'watch':
      return 'เฝ้าระวัง (เหลือง)';
    case 'critical':
      return 'วิกฤต (แดง)';
  }
}

export function getRiskLabelEn(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'low':
      return 'Low Risk (Green)';
    case 'watch':
      return 'Watch (Yellow)';
    case 'critical':
      return 'Critical (Red)';
  }
}

export function calculateFarmHealthScore(forecast: DailyForecastPoint[]): number {
  if (forecast.length === 0) return 50;
  const avgMoisture =
    forecast.reduce((sum, item) => sum + item.soilMoistureIndex, 0) / forecast.length;
  const avgStress =
    forecast.reduce((sum, item) => sum + item.cropStressIndex, 0) / forecast.length;
  const avgRain =
    forecast.reduce((sum, item) => sum + item.rainChancePercent, 0) / forecast.length;

  // Penalize severe waterlogging when average moisture exceeds 78%
  const waterlogPenalty = avgMoisture > 78 ? (avgMoisture - 78) * 6.5 : 0;
  const floodRainPenalty = avgRain > 65 ? (avgRain - 65) * 0.85 : 0;

  // Weighted health score: high moisture & low stress yield stronger scores
  const rawScore =
    44 +
    avgMoisture * 0.68 -
    avgStress * 0.36 +
    avgRain * 0.14 -
    waterlogPenalty -
    floodRainPenalty;
  return Math.round(clamp(rawScore, 15, 98));
}

const EN_DAY_FALLBACKS = [
  'Sat',
  'Sun',
  'Mon',
  'Tue',
  'Next Wed',
  'Next Thu',
  'Next Fri',
];

export function buildEarlyWarning(forecast: DailyForecastPoint[], riskLevel: RiskLevel): EarlyWarningInfo {
  if (forecast.length === 0) {
    return {
      titleTh: 'กำลังประเมินแนวโน้ม 7 วันล่วงหน้า',
      titleEn: 'Evaluating 7-Day Field Outlook',
      messageTh: 'ยังไม่มีข้อมูลพยากรณ์สำหรับแปลงนี้ กรุณากดอัปเดตข้อมูลจาก NASA',
      messageEn: 'No forecast data available yet. Please tap Sync NASA Data.',
      actionSummaryTh: 'กดอัปเดตข้อมูล',
      actionSummaryEn: 'Sync NASA Data',
      moistureDeltaPercent: 0,
      peakRiskDayLabel: 'สัปดาห์นี้',
      peakRiskDayLabelEn: 'This week',
      severity: 'watch',
    };
  }

  const startMoisture = forecast[0].soilMoistureIndex;
  let minMoisturePoint = forecast[0];
  let maxMoisturePoint = forecast[0];
  let maxStressPoint = forecast[0];

  for (const point of forecast) {
    if (point.soilMoistureIndex < minMoisturePoint.soilMoistureIndex) {
      minMoisturePoint = point;
    }
    if (point.soilMoistureIndex > maxMoisturePoint.soilMoistureIndex) {
      maxMoisturePoint = point;
    }
    if (point.cropStressIndex > maxStressPoint.cropStressIndex) {
      maxStressPoint = point;
    }
  }

  const minDayEn =
    minMoisturePoint.dayLabelEn ??
    EN_DAY_FALLBACKS[minMoisturePoint.dayNumber - 1] ??
    minMoisturePoint.dateShort;
  const maxDayEn =
    maxMoisturePoint.dayLabelEn ??
    EN_DAY_FALLBACKS[maxMoisturePoint.dayNumber - 1] ??
    maxMoisturePoint.dateShort;
  const stressDayEn =
    maxStressPoint.dayLabelEn ??
    EN_DAY_FALLBACKS[maxStressPoint.dayNumber - 1] ??
    maxStressPoint.dateShort;

  const isFloodRisk =
    maxMoisturePoint.soilMoistureIndex >= 88 && maxStressPoint.cropStressIndex >= 65;

  if (isFloodRisk) {
    const surgePercent = Math.max(
      18,
      Math.round(maxMoisturePoint.soilMoistureIndex - startMoisture)
    );
    return {
      titleTh: `เตือนภัยเสี่ยงน้ำท่วม: ฝนหนักและความชื้นสะสม ${maxMoisturePoint.soilMoistureIndex}% ใน${maxMoisturePoint.dayLabelTh}`,
      titleEn: `Flood Risk Alert: Heavy rain & ${maxMoisturePoint.soilMoistureIndex}% soil saturation on ${maxDayEn}`,
      messageTh: `เตือนภัยล่วงหน้า 7 วัน: ฝนตกหนักทำให้ความชื้นดินพุ่งสูงถึง ${maxMoisturePoint.soilMoistureIndex}% ใน${maxMoisturePoint.dayLabelTh} เสี่ยงน้ำท่วมขังและรากขาดอากาศ แนะนำเปิดทางระบายน้ำและเตรียมเคลมประกันภัย`,
      messageEn: `7-Day Flood Warning: Saturation spikes to ${maxMoisturePoint.soilMoistureIndex}% on ${maxDayEn}. Clear drainage trenches immediately and notify BAAC.`,
      actionSummaryTh: 'เปิดร่องระบายน้ำด่วน + แจ้งเตือน ธ.ก.ส. เตรียมคุ้มครองประกันภัย',
      actionSummaryEn: 'Clear drainage channels + Notify BAAC Parametric Shield',
      moistureDeltaPercent: surgePercent,
      peakRiskDayLabel: maxMoisturePoint.dayLabelTh,
      peakRiskDayLabelEn: maxDayEn,
      severity: 'critical',
    };
  }

  const dropPercent = Math.round(startMoisture - minMoisturePoint.soilMoistureIndex);

  if (riskLevel === 'low') {
    return {
      titleTh: 'พยากรณ์ล่วงหน้า 7 วัน: สภาพแปลงสมบูรณ์ดีตลอดสัปดาห์',
      titleEn: '7-Day Outlook: Field Health Optimal All Week',
      messageTh: `ความชื้นในดินทรงตัวในเกณฑ์เหมาะสม (ต่ำสุด ${minMoisturePoint.soilMoistureIndex}% ใน${minMoisturePoint.dayLabelTh}) ไม่พบสัญญาณแล้งฉับพลัน สามารถลดการสูบน้ำและใช้คะแนนนี้ยื่นรับสินเชื่อดอกเบี้ยต่ำได้`,
      messageEn: `Soil moisture remains balanced (floor ${minMoisturePoint.soilMoistureIndex}% on ${minDayEn}) with no drought stress. Eligible for low-interest BAAC credit.`,
      actionSummaryTh: 'รักษาตารางดูแลปกติและรับสิทธิพิเศษดอกเบี้ยเกษตรกรชั้นดี',
      actionSummaryEn: 'Maintain normal care and unlock preferred credit rates',
      moistureDeltaPercent: -Math.max(0, dropPercent),
      peakRiskDayLabel: minMoisturePoint.dayLabelTh,
      peakRiskDayLabelEn: minDayEn,
      severity: 'low',
    };
  }

  if (riskLevel === 'watch') {
    const pct = Math.max(dropPercent, 10);
    return {
      titleTh: `เตือนล่วงหน้า 7 วัน: ความชื้นในดินมีแนวโน้มลดลง ${pct}% ใน${minMoisturePoint.dayLabelTh}`,
      titleEn: `7-Day Early Warning: Soil moisture projected to drop ${pct}% on ${minDayEn}`,
      messageTh: `เตือนล่วงหน้า 7 วัน: ความชื้นในดินมีแนวโน้มลดลง ${pct}% ใน${minMoisturePoint.dayLabelTh} แนะนำให้เปิดระบบน้ำเสริม หรือกดขอวงเงินหมุนเวียนฉุกเฉิน`,
      messageEn: `7-Day Alert: Soil moisture drops ${pct}% by ${minDayEn}. Run supplemental irrigation or request pre-approved working credit.`,
      actionSummaryTh: 'เตรียมระบบน้ำเสริมล่วงหน้า 48 ชั่วโมงก่อนถึงวันความชื้นต่ำสุด',
      actionSummaryEn: 'Start supplemental irrigation 48h before peak dryness',
      moistureDeltaPercent: -pct,
      peakRiskDayLabel: minMoisturePoint.dayLabelTh,
      peakRiskDayLabelEn: minDayEn,
      severity: 'watch',
    };
  }

  const critPct = Math.max(dropPercent, 15);
  return {
    titleTh: `แจ้งเตือนระดับวิกฤต: ความชื้นดินลดลง ${critPct}% เสี่ยงขาดน้ำรุนแรงใน${maxStressPoint.dayLabelTh}`,
    titleEn: `Critical Alert: Moisture drops ${critPct}% with high stress on ${stressDayEn}`,
    messageTh: `เตือนภัยล่วงหน้า 7 วัน: ความชื้นในดินมีแนวโน้มลดลงถึง ${minMoisturePoint.soilMoistureIndex}% ใน${minMoisturePoint.dayLabelTh} และพืชมีความเครียดจากความร้อนสูง แนะนำให้ขอวงเงินหมุนเวียนฉุกเฉินเพื่อสูบน้ำประคองผลผลิต และเปิดใช้งาน Parametric Shield ทันที`,
    messageEn: `Critical 7-Day Alert: Soil moisture falls to ${minMoisturePoint.soilMoistureIndex}% on ${minDayEn}. Request emergency working capital and activate Parametric Shield now.`,
    actionSummaryTh: 'เปิดระบบน้ำเร่งด่วน + เปิดใช้งาน Parametric Shield',
    actionSummaryEn: 'Emergency irrigation + Activate Parametric Shield',
    moistureDeltaPercent: -critPct,
    peakRiskDayLabel: maxStressPoint.dayLabelTh,
    peakRiskDayLabelEn: stressDayEn,
    severity: 'critical',
  };
}

export function evaluatePlotProfile(
  plot: FarmPlotProfile,
  dataSource: DataSourceMode,
  lastUpdatedLabel: string,
  overrideForecast?: DailyForecastPoint[],
  overrideTelemetry?: NasaWeatherTelemetry
): PlotEvaluation {
  const forecast = overrideForecast ?? plot.forecast;
  const computedScore = overrideForecast
    ? calculateFarmHealthScore(forecast)
    : plot.baselineScore;

  const minMoisture = Math.min(...forecast.map((d) => d.soilMoistureIndex));
  const maxStress = Math.max(...forecast.map((d) => d.cropStressIndex));
  const riskLevel = classifyRiskLevel(computedScore, minMoisture, maxStress);

  return {
    healthScore: computedScore,
    riskLevel,
    riskLabelTh: getRiskLabelTh(riskLevel),
    riskLabelEn: getRiskLabelEn(riskLevel),
    creditIdentityNoteTh:
      'คะแนนนี้รวบรวมจากประวัติความสมบูรณ์ของแปลงและความแม่นยำในการรับมือสภาพอากาศ สามารถใช้ยืนยันตัวตนทางข้อมูลกับ ธ.ก.ส. เพื่อขอสินเชื่อหมุนเวียนหรือเปิดประกันภัยพืชผลได้ทันทีโดยไม่ต้องใช้หลักทรัพย์ค้ำประกันเพิ่ม',
    creditIdentityNoteEn:
      'Verified from NASA satellite soil moisture and weather resilience history. Accepted by BAAC as digital credit identity for instant working capital without extra collateral.',
    earlyWarning: buildEarlyWarning(forecast, riskLevel),
    forecast,
    dataSource,
    lastUpdatedLabel,
    ...(overrideTelemetry ? { nasaWeatherTelemetry: overrideTelemetry } : {}),
  };
}

interface NasaPowerResponse {
  geometry?: {
    coordinates?: [number, number, number?];
  };
  properties?: {
    parameter?: {
      T2M?: Record<string, number>;
      PRECTOTCORR?: Record<string, number>;
      RH2M?: Record<string, number>;
      GWETTOP?: Record<string, number>;
    };
  };
}

function getLatestValidValue(series: Record<string, number> | undefined, fallback: number): number {
  if (!series) return fallback;
  const entries = Object.entries(series).sort(([a], [b]) => b.localeCompare(a));
  for (const [, val] of entries) {
    if (typeof val === 'number' && val > -900 && Number.isFinite(val)) {
      return val;
    }
  }
  return fallback;
}

function getRecentAverage(series: Record<string, number> | undefined, fallback: number): number {
  if (!series) return fallback;
  const validValues = Object.values(series).filter(
    (val) => typeof val === 'number' && val > -900 && Number.isFinite(val)
  );
  if (validValues.length === 0) return fallback;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

function isValidNasaMetric(val: unknown): val is number {
  return typeof val === 'number' && val > -900 && Number.isFinite(val);
}

function formatDateKeyShort(dateKey: string): string {
  if (/^\d{8}$/.test(dateKey)) {
    return `${dateKey.slice(4, 6)}/${dateKey.slice(6, 8)}`;
  }
  return dateKey;
}

export function extractNasaWeatherTelemetry(rawJson: NasaPowerResponse): NasaWeatherTelemetry {
  const params = rawJson?.properties?.parameter;
  const t2m = params?.T2M ?? {};
  const precip = params?.PRECTOTCORR ?? {};
  const rh2m = params?.RH2M ?? {};

  const dateKeys = Array.from(
    new Set([...Object.keys(t2m), ...Object.keys(precip), ...Object.keys(rh2m)])
  ).sort((a, b) => a.localeCompare(b));

  const fallbackTemp = Number(getRecentAverage(t2m, 31.5).toFixed(1));
  const fallbackPrecip = Number(getRecentAverage(precip, 2.4).toFixed(1));
  const fallbackRh = Math.round(getRecentAverage(rh2m, 66));

  const validDateKeys = dateKeys.filter(
    (key) => isValidNasaMetric(t2m[key]) || isValidNasaMetric(precip[key]) || isValidNasaMetric(rh2m[key])
  );

  const recentKeys = validDateKeys.slice(-7);
  const observations: NasaWeatherObservationDay[] = recentKeys.map((dateKey) => ({
    dateKey,
    labelShort: formatDateKeyShort(dateKey),
    precipMm: Number(
      clamp(isValidNasaMetric(precip[dateKey]) ? precip[dateKey] : fallbackPrecip, 0, 250).toFixed(1)
    ),
    tempC: Number(
      clamp(isValidNasaMetric(t2m[dateKey]) ? t2m[dateKey] : fallbackTemp, 12, 46).toFixed(1)
    ),
    humidityPercent: Math.round(
      clamp(isValidNasaMetric(rh2m[dateKey]) ? rh2m[dateKey] : fallbackRh, 15, 100)
    ),
  }));

  const observedAvgTempC =
    observations.length > 0
      ? Number(
          (
            observations.reduce((sum, item) => sum + item.tempC, 0) / observations.length
          ).toFixed(1)
        )
      : fallbackTemp;

  const observedTotalPrecipMm =
    observations.length > 0
      ? Number(observations.reduce((sum, item) => sum + item.precipMm, 0).toFixed(1))
      : Number((fallbackPrecip * 7).toFixed(1));

  const observedAvgHumidityPercent =
    observations.length > 0
      ? Math.round(
          observations.reduce((sum, item) => sum + item.humidityPercent, 0) / observations.length
        )
      : fallbackRh;

  const gwetTop = getLatestValidValue(params?.GWETTOP, -999);
  const observedSoilWetnessPercent =
    gwetTop > -900 ? Math.round(clamp(gwetTop * 100, 0, 100)) : undefined;
  const rawElevation = rawJson?.geometry?.coordinates?.[2];
  const elevationMeters =
    typeof rawElevation === 'number' && Number.isFinite(rawElevation) && rawElevation > -500
      ? Number(rawElevation.toFixed(1))
      : undefined;

  return {
    observations,
    observedAvgTempC,
    observedTotalPrecipMm,
    observedAvgHumidityPercent,
    ...(observedSoilWetnessPercent !== undefined ? { observedSoilWetnessPercent } : {}),
    ...(elevationMeters !== undefined ? { elevationMeters } : {}),
    sourceTag: 'NASA POWER · T2M / PRECTOTCORR / RH2M',
  };
}

export function translateNasaPowerToForecast(
  rawJson: NasaPowerResponse,
  basePlot: FarmPlotProfile
): DailyForecastPoint[] {
  const params = rawJson?.properties?.parameter;
  const latestTemp = getLatestValidValue(params?.T2M, 32);
  const avgTemp = getRecentAverage(params?.T2M, 31.5);
  const avgRainMm = getRecentAverage(params?.PRECTOTCORR, 2.4);
  const latestRh = getLatestValidValue(params?.RH2M, 66);
  // GWETTOP is 0-1 surface soil wetness ratio in NASA POWER
  const gwetTop = getLatestValidValue(params?.GWETTOP, 0.56);

  const initialMoisture = Math.round(clamp(gwetTop * 100, 28, 86));
  const dryingTrend = avgRainMm < 2.5 ? 3.4 : avgRainMm < 6 ? 1.5 : -0.8;

  return basePlot.forecast.map((templateDay, index) => {
    // Blend real NASA satellite observations with localized 7-day agronomic projection
    const projectedMoisture = Math.round(
      clamp(
        initialMoisture - index * dryingTrend + (index === 6 && avgRainMm > 1.5 ? 5 : 0),
        22,
        88
      )
    );
    const projectedTemp = Math.round(
      clamp(latestTemp + (index === 4 ? 2 : index * 0.4) + (latestTemp - avgTemp) * 0.2, 26, 40)
    );
    const projectedStress = Math.round(
      clamp(100 - projectedMoisture * 1.05 + (projectedTemp - 30) * 3.2 - (latestRh - 60) * 0.3, 12, 85)
    );
    const projectedRainChance = Math.round(
      clamp(avgRainMm * 9 + (index === 6 ? 15 : -index * 3), 5, 85)
    );

    let advisoryTh = templateDay.advisoryTh;
    let advisoryEn =
      templateDay.advisoryEn ??
      'Soil moisture remains balanced; continue standard crop care.';
    if (projectedMoisture < 35) {
      advisoryTh =
        'ความชื้นผิวดินจากดาวเทียมลดต่ำกว่าเกณฑ์ปลอดภัย ควรเปิดระบบน้ำเสริมหรือขอวงเงินฉุกเฉิน';
      advisoryEn =
        'Satellite soil moisture dropped below safe floor. Run supplemental irrigation or request emergency credit.';
    } else if (projectedMoisture < 50 && index >= 3) {
      advisoryTh =
        'ความชื้นเริ่มลดลงต่อเนื่องจากสภาพอากาศอุ่นขึ้น แนะนำวางแผนให้น้ำช่วงเช้าหรือเย็น';
      advisoryEn =
        'Soil moisture is gradually declining under warmer weather. Plan early-morning or evening irrigation.';
    } else if (projectedMoisture >= 65) {
      advisoryTh = 'ความชื้นในดินอยู่ในเกณฑ์ดี ไม่จำเป็นต้องสูบน้ำเพิ่ม ประหยัดต้นทุนพลังงานได้';
      advisoryEn =
        'Soil moisture is optimal; skip extra pumping this week to save fuel and power costs.';
    }

    return {
      dayNumber: index + 1,
      dayLabelTh: templateDay.dayLabelTh || THAI_DAYS[index] || `วันที่ ${index + 1}`,
      dayLabelEn: templateDay.dayLabelEn || EN_DAY_FALLBACKS[index] || `Day ${index + 1}`,
      dateShort: `Day ${index + 1}`,
      soilMoistureIndex: projectedMoisture,
      cropStressIndex: projectedStress,
      rainChancePercent: projectedRainChance,
      tempMaxC: projectedTemp,
      advisoryTh,
      advisoryEn,
    };
  });
}

function formatYyyymmdd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function fetchNasaPowerEvaluation(
  plot: FarmPlotProfile,
  demoMode: boolean
): Promise<PlotEvaluation> {
  const nowLabel = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (demoMode) {
    return evaluatePlotProfile(plot, 'demo', `ข้อมูลจำลองล่าสุด ${nowLabel} น.`);
  }

  // NASA POWER daily data usually settles 3-10 days prior to real-time date
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 4);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 7);

  // Cap year to 2025 if container clock is set in future (e.g. 2026) so NASA POWER always has settled archive data
  if (endDate.getUTCFullYear() > 2025) {
    endDate.setUTCFullYear(2025);
    startDate.setUTCFullYear(2025);
  }

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,RH2M,GWETTOP&community=AG&longitude=${plot.lon}&latitude=${plot.lat}&start=${formatYyyymmdd(startDate)}&end=${formatYyyymmdd(endDate)}&format=JSON`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = (await response.json()) as NasaPowerResponse;
    const nasaForecast = translateNasaPowerToForecast(json, plot);
    const nasaTelemetry = extractNasaWeatherTelemetry(json);
    return evaluatePlotProfile(
      plot,
      'nasa-live',
      `เชื่อมต่อข้อมูล NASA POWER สำเร็จ (${nowLabel} น.)`,
      nasaForecast,
      nasaTelemetry
    );
  } catch {
    clearTimeout(timeoutId);
    // Graceful automatic fallback to realistic Demo dataset so UX remains 100% smooth offline
    return evaluatePlotProfile(
      plot,
      'nasa-fallback',
      `ใช้ชุดข้อมูลสำรองอัตโนมัติ (${nowLabel} น.)`
    );
  }
}

export function buildNasaPowerPointQueryUrl(
  lat: number,
  lon: number,
  referenceDate: Date = new Date()
): string {
  const endDate = new Date(referenceDate.getTime());
  endDate.setUTCDate(endDate.getUTCDate() - 4);
  const startDate = new Date(endDate.getTime());
  startDate.setUTCDate(startDate.getUTCDate() - 7);

  if (endDate.getUTCFullYear() > 2025) {
    endDate.setUTCFullYear(2025);
    startDate.setUTCFullYear(2025);
  }

  return `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,RH2M,GWETTOP&community=AG&longitude=${lon.toFixed(
    4
  )}&latitude=${lat.toFixed(4)}&start=${formatYyyymmdd(startDate)}&end=${formatYyyymmdd(
    endDate
  )}&format=JSON`;
}

export async function fetchLiveNasaPowerTelemetry(
  lat: number,
  lon: number
): Promise<{
  telemetry: NasaWeatherTelemetry;
  source: 'nasa-live' | 'fallback';
  fetchedAtLabel: string;
}> {
  const fetchedAtLabel = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tryFetchJson = async (url: string, timeoutMs: number): Promise<NasaPowerResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as NasaPowerResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    const proxyUrl = `/api/nasa-power/point?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
    const json = await tryFetchJson(proxyUrl, 5500);
    return {
      telemetry: extractNasaWeatherTelemetry(json),
      source: 'nasa-live',
      fetchedAtLabel,
    };
  } catch {
    try {
      const directUrl = buildNasaPowerPointQueryUrl(lat, lon);
      const json = await tryFetchJson(directUrl, 5500);
      return {
        telemetry: extractNasaWeatherTelemetry(json),
        source: 'nasa-live',
        fetchedAtLabel,
      };
    } catch {
      return {
        telemetry: {
          observations: [
            { dateKey: '20251103', labelShort: '11/03', precipMm: 1.2, tempC: 31.8, humidityPercent: 68 },
            { dateKey: '20251104', labelShort: '11/04', precipMm: 0.4, tempC: 32.4, humidityPercent: 65 },
            { dateKey: '20251105', labelShort: '11/05', precipMm: 0.0, tempC: 33.1, humidityPercent: 62 },
            { dateKey: '20251106', labelShort: '11/06', precipMm: 2.8, tempC: 31.5, humidityPercent: 71 },
            { dateKey: '20251107', labelShort: '11/07', precipMm: 0.6, tempC: 32.0, humidityPercent: 67 },
          ],
          observedAvgTempC: 32.2,
          observedTotalPrecipMm: 5.0,
          observedAvgHumidityPercent: 67,
          observedSoilWetnessPercent: 61,
          elevationMeters: 168,
          sourceTag: 'NASA POWER · Fallback Telemetry',
        },
        source: 'fallback',
        fetchedAtLabel,
      };
    }
  }
}

export function computePortfolioKpis(farmers: FarmerLoanRecord[]): BaacPortfolioKpis {
  const connectedPlotsCount = farmers.length;
  const totalAreaRai = farmers.reduce((sum, f) => sum + f.areaRai, 0);
  const savedFieldInspectionCostThb = farmers.reduce(
    (sum, f) => sum + f.savedInspectionCostThb,
    0
  );

  const lowRiskCount = farmers.filter((f) => f.riskLevel === 'low').length;
  const watchRiskCount = farmers.filter((f) => f.riskLevel === 'watch').length;
  const criticalRiskCount = farmers.filter((f) => f.riskLevel === 'critical').length;

  const avgScore =
    farmers.length > 0
      ? farmers.reduce((sum, f) => sum + f.nasaHealthScore, 0) / farmers.length
      : 0;

  // Estimated NPL reduction scales with early-warning satellite monitoring coverage and average health
  const estimatedNplReductionPercent =
    farmers.length > 0 ? Number((28 + avgScore * 0.14).toFixed(1)) : 0;

  return {
    connectedPlotsCount,
    totalAreaRai,
    estimatedNplReductionPercent,
    savedFieldInspectionCostThb,
    lowRiskCount,
    watchRiskCount,
    criticalRiskCount,
  };
}

export function evaluateTrancheReadiness(record: FarmerLoanRecord): {
  canApproveNextTranche: boolean;
  headlineTh: string;
  recommendationTh: string;
} {
  if (record.riskLevel === 'low') {
    return {
      canApproveNextTranche: true,
      headlineTh: 'ผ่านเกณฑ์อนุมัติงวดถัดไปอัตโนมัติ',
      recommendationTh: `คะแนนสุขภาพพืช ${record.nasaHealthScore}/100 และมีสัญญาณรับซื้อผลผลิต (${record.contractFarmingPartner}) จึงสามารถปล่อยสินเชื่องวดที่ ${Math.min(record.currentTranche + 1, record.totalTranches)} ได้ทันทีโดยไม่ต้องส่งเจ้าหน้าที่ลงพื้นที่`,
    };
  }
  if (record.riskLevel === 'watch') {
    return {
      canApproveNextTranche: true,
      headlineTh: 'อนุมัติแบบมีเงื่อนไข (เน้นวงเงินระบบน้ำเสริม)',
      recommendationTh: `พบสัญญาณเฝ้าระวังล่วงหน้า 7 วัน จึงแนะนำให้แบ่งปล่อยงวดที่ ${Math.min(record.currentTranche + 1, record.totalTranches)} เฉพาะหมวดปัจจัยป้องกันแล้งและเปิดระบบน้ำ เพื่อคุ้มครองผลผลิตก่อนเกิดความเสียหาย`,
    };
  }
  return {
    canApproveNextTranche: false,
    headlineTh: 'ชะลอการปล่อยกู้เพิ่ม — แนะนำเปิดใช้งานประกันภัยและปรับแผนน้ำ',
    recommendationTh:
      'พื้นที่อยู่ในเกณฑ์ความเสี่ยงวิกฤต 7 วันข้างหน้า ควรส่งแจ้งเตือนให้เกษตรกรเปิดใช้ Parametric Shield และให้เจ้าหน้าที่สาขาประเมินร่วมกับสหกรณ์ก่อนปล่อยงวดถัดไป',
  };
}
