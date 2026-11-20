import type {
  AppLanguage,
  DailyForecastPoint,
  FarmerLoanRecord,
  FarmerRegistrationInput,
  FarmPlotProfile,
  PlotEvaluation,
  ScenarioType,
} from '../types/cropshield';
import { validateThaiPhoneNumber } from './alertNotifications';
import { getRiskLabelTh } from './nasaPower';

export interface ProvincePreset {
  key: string;
  nameTh: string;
  nameEn: string;
  defaultDistrictTh: string;
  defaultDistrictEn: string;
  lat: number;
  lon: number;
}

export const PROVINCE_PRESETS: ProvincePreset[] = [
  {
    key: 'phetchabun',
    nameTh: 'เพชรบูรณ์',
    nameEn: 'Phetchabun',
    defaultDistrictTh: 'อ.หนองไผ่',
    defaultDistrictEn: 'Nong Phai',
    lat: 16.0124,
    lon: 101.0567,
  },
  {
    key: 'surin',
    nameTh: 'สุรินทร์',
    nameEn: 'Surin',
    defaultDistrictTh: 'อ.เมือง',
    defaultDistrictEn: 'Mueang Surin',
    lat: 14.8829,
    lon: 103.4937,
  },
  {
    key: 'suphanburi',
    nameTh: 'สุพรรณบุรี',
    nameEn: 'Suphan Buri',
    defaultDistrictTh: 'อ.ด่านช้าง',
    defaultDistrictEn: 'Dan Chang',
    lat: 14.8415,
    lon: 99.6974,
  },
  {
    key: 'korat',
    nameTh: 'นครราชสีมา',
    nameEn: 'Nakhon Ratchasima',
    defaultDistrictTh: 'อ.ปากช่อง',
    defaultDistrictEn: 'Pak Chong',
    lat: 14.7082,
    lon: 101.4161,
  },
  {
    key: 'khonkaen',
    nameTh: 'ขอนแก่น',
    nameEn: 'Khon Kaen',
    defaultDistrictTh: 'อ.บ้านไผ่',
    defaultDistrictEn: 'Ban Phai',
    lat: 16.0592,
    lon: 102.7311,
  },
  {
    key: 'chiangmai',
    nameTh: 'เชียงใหม่',
    nameEn: 'Chiang Mai',
    defaultDistrictTh: 'อ.สันป่าตอง',
    defaultDistrictEn: 'San Pa Tong',
    lat: 18.6274,
    lon: 98.8952,
  },
];

export interface CropOption {
  key: FarmerRegistrationInput['cropKey'];
  labelTh: string;
  labelEn: string;
  irrigationTh: string;
  irrigationEn: string;
  creditPerRaiThb: number;
  coveragePerRaiThb: number;
  contractPartner: string;
}

export const CROP_OPTIONS: CropOption[] = [
  {
    key: 'corn',
    labelTh: 'ข้าวโพดเลี้ยงสัตว์',
    labelEn: 'Feed Corn',
    irrigationTh: 'น้ำหยดเสริม + น้ำฝน',
    irrigationEn: 'Supplemental Drip + Rainfed',
    creditPerRaiThb: 2500,
    coveragePerRaiThb: 1800,
    contractPartner: 'เครือข่ายโรงงานอาหารสัตว์ภาคกลาง',
  },
  {
    key: 'rice',
    labelTh: 'ข้าวหอมมะลิ',
    labelEn: 'Jasmine Rice',
    irrigationTh: 'ชลประทาน + สระน้ำประจำแปลง',
    irrigationEn: 'Canal Irrigation + Farm Pond',
    creditPerRaiThb: 2800,
    coveragePerRaiThb: 2200,
    contractPartner: 'สหกรณ์โรงสีข้าวคุณภาพส่งออก',
  },
  {
    key: 'cassava',
    labelTh: 'มันสำปะหลัง',
    labelEn: 'Cassava',
    irrigationTh: 'อาศัยน้ำฝน + ร่องกักเก็บความชื้น',
    irrigationEn: 'Rainfed + Moisture Furrow',
    creditPerRaiThb: 2200,
    coveragePerRaiThb: 1600,
    contractPartner: 'สมาคมโรงงานแป้งมันสำปะหลังไทย',
  },
  {
    key: 'sugarcane',
    labelTh: 'อ้อยโรงงาน',
    labelEn: 'Sugarcane',
    irrigationTh: 'ระบบน้ำราดร่อง + น้ำฝน',
    irrigationEn: 'Furrow Irrigation + Rainfed',
    creditPerRaiThb: 2600,
    coveragePerRaiThb: 2000,
    contractPartner: 'โรงงานน้ำตาลมิตรผล / เกษตรกรคู่สัญญา',
  },
];

const EN_WEEKDAYS = [
  'Sat',
  'Sun',
  'Mon',
  'Tue',
  'Next Wed',
  'Next Thu',
  'Next Fri',
];

export function applyForecastScenario(
  baseForecast: DailyForecastPoint[],
  scenario: ScenarioType
): DailyForecastPoint[] {
  if (scenario === 'normal') {
    return baseForecast.map((day, index) => ({
      ...day,
      dayLabelEn: day.dayLabelEn ?? EN_WEEKDAYS[index] ?? `Day ${day.dayNumber}`,
    }));
  }

  if (scenario === 'drought') {
    return baseForecast.map((day, index) => {
      const moisture = Math.max(22, Math.round(52 - index * 5.2));
      const stress = Math.min(86, Math.round(38 + index * 7.5));
      const tempMaxC = Math.min(40, Math.round(day.tempMaxC + (index >= 2 ? 3 : 2)));
      const rainChancePercent = index >= 5 ? 8 : 5;

      const advisoryTh =
        index >= 3
          ? 'ภัยแล้งสะสมรุนแรง ความชื้นดินต่ำกว่าเกณฑ์ปลอดภัย ให้เปิดระบบน้ำเร่งด่วนและกดขอวงเงินหมุนเวียนฉุกเฉิน'
          : 'ความชื้นผิวดินลดลงเร็วกว่าปกติ ควรเตรียมสำรองน้ำและคลุมโคนต้นลดการระเหย';
      const advisoryEn =
        index >= 3
          ? 'Severe 7-day drought stress: soil moisture drops below safe floor. Run supplemental irrigation now and request emergency credit.'
          : 'Soil moisture is declining rapidly. Prepare water pump reserves and apply mulch to slow evaporation.';

      return {
        ...day,
        dayLabelEn: day.dayLabelEn ?? EN_WEEKDAYS[index] ?? `Day ${day.dayNumber}`,
        soilMoistureIndex: moisture,
        cropStressIndex: stress,
        rainChancePercent,
        tempMaxC,
        advisoryTh,
        advisoryEn,
      };
    });
  }

  // scenario === 'flood'
  return baseForecast.map((day, index) => {
    // Waterlogging and flood risk elevates moisture > 85% and increases root-hypoxia crop stress
    const moisture = Math.min(96, Math.round(68 + index * 4.5));
    const stress = Math.min(80, Math.round(30 + index * 8.2));
    const rainChancePercent = Math.min(95, Math.round(55 + index * 6));
    const tempMaxC = Math.max(26, day.tempMaxC - 3);

    const advisoryTh =
      index >= 3
        ? 'ฝนตกหนักต่อเนื่อง เสี่ยงน้ำท่วมขังและรากเน่า ให้เปิดทางระบายน้ำทันทีและแจ้งเตือนเจ้าหน้าที่ ธ.ก.ส. เตรียมเคลมประกัน'
        : 'กลุ่มฝนกำลังเคลื่อนเข้าพื้นที่ ตรวจเช็กคันดินและขุดลอกร่องระบายน้ำรอบแปลงล่วงหน้า';
    const advisoryEn =
      index >= 3
        ? 'Heavy rain surge creates waterlogging & root-hypoxia risk. Open field drainage channels immediately and notify BAAC officer.'
        : 'Heavy rain front approaching. Inspect field embankments and clear drainage trenches ahead of runoff.';

    return {
      ...day,
      dayLabelEn: day.dayLabelEn ?? EN_WEEKDAYS[index] ?? `Day ${day.dayNumber}`,
      soilMoistureIndex: moisture,
      cropStressIndex: stress,
      rainChancePercent,
      tempMaxC,
      advisoryTh,
      advisoryEn,
    };
  });
}

export interface RegistrationValidationErrors {
  fullName?: string;
  phoneNumber?: string;
  passwordPin?: string;
  areaRai?: string;
  coords?: string;
}

export function validateRegistrationInput(
  input: FarmerRegistrationInput,
  lang: AppLanguage
): RegistrationValidationErrors {
  const errors: RegistrationValidationErrors = {};

  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    errors.fullName =
      lang === 'th'
        ? 'กรุณากรอกชื่อ-นามสกุลเกษตรกร'
        : 'Please enter the farmer full name.';
  }

  const phoneErr = validateThaiPhoneNumber(input.phoneNumber);
  if (phoneErr) {
    errors.phoneNumber =
      lang === 'th'
        ? phoneErr
        : 'Please enter a valid 10-digit Thai mobile number (e.g., 081-234-5678).';
  }

  if (typeof input.passwordPin === 'string') {
    const cleanPin = input.passwordPin.trim();
    if (cleanPin.length < 4) {
      errors.passwordPin =
        lang === 'th'
          ? 'กรุณาตั้งรหัสผ่าน / PIN อย่างน้อย 4 ตัวอักษร'
          : 'Please set a password or PIN with at least 4 characters.';
    }
  }

  if (!Number.isFinite(input.areaRai) || input.areaRai < 1 || input.areaRai > 1000) {
    errors.areaRai =
      lang === 'th'
        ? 'กรุณาระบุขนาดแปลงระหว่าง 1 ถึง 1,000 ไร่'
        : 'Plot size must be between 1 and 1,000 Rai.';
  }

  if (
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lon) ||
    input.lat < 5 ||
    input.lat > 21 ||
    input.lon < 97 ||
    input.lon > 106
  ) {
    errors.coords =
      lang === 'th'
        ? 'กรุณาระบุพิกัด Lat (5–21) และ Lon (97–106) ในเขตประเทศไทย'
        : 'Please enter valid coordinates within Thailand (Lat 5–21, Lon 97–106).';
  }

  return errors;
}

const TH_DAY_LABELS = [
  'วันเสาร์',
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธหน้า',
  'วันพฤหัสฯ หน้า',
  'วันศุกร์หน้า',
];

export function createRegisteredPlotAndBaacRecord(
  input: FarmerRegistrationInput,
  evaluationScoreOverride?: number
): {
  plot: FarmPlotProfile;
  baacRecord: FarmerLoanRecord;
} {
  const province =
    PROVINCE_PRESETS.find((p) => p.key === input.provinceKey) ?? PROVINCE_PRESETS[0];
  const crop = CROP_OPTIONS.find((c) => c.key === input.cropKey) ?? CROP_OPTIONS[0];
  const trimmedDistrict = input.districtName.trim();
  const districtTh = trimmedDistrict || province.defaultDistrictTh;
  const districtEn =
    !trimmedDistrict || trimmedDistrict === province.defaultDistrictTh
      ? province.defaultDistrictEn
      : trimmedDistrict;
  const plotId = `plot-reg-${Date.now()}`;

  const cleanArea = Math.round(input.areaRai);
  const preApprovedCreditLimitThb = Math.max(20000, cleanArea * crop.creditPerRaiThb);
  const recommendedWorkingCapitalThb = Math.round(preApprovedCreditLimitThb * 0.35);
  const parametricCoverageThb = Math.max(15000, cleanArea * crop.coveragePerRaiThb);

  const forecast: DailyForecastPoint[] = TH_DAY_LABELS.map((dayLabelTh, idx) => {
    const soilMoistureIndex = Math.max(43, 64 - idx * 4 + (idx === 6 ? 6 : 0));
    const cropStressIndex = Math.min(58, 22 + idx * 6);
    const rainChancePercent = idx >= 5 ? 35 : 15;
    const tempMaxC = 32 + Math.min(4, idx);

    return {
      dayNumber: idx + 1,
      dayLabelTh,
      dayLabelEn: EN_WEEKDAYS[idx],
      dateShort: `Day ${idx + 1}`,
      soilMoistureIndex,
      cropStressIndex,
      rainChancePercent,
      tempMaxC,
      advisoryTh:
        idx === 4
          ? 'ความชื้นลดลงจากต้นสัปดาห์ แนะนำเปิดระบบน้ำเสริมช่วงเช้าหรือค่ำเพื่อประคองรากพืช'
          : idx >= 5
            ? 'เตรียมรับฝนปลายสัปดาห์และติดตามคะแนนสุขภาพแปลงผ่าน CropShield'
            : 'ความชื้นดินอยู่ในเกณฑ์เหมาะสม ดูแลแปลงตามรอบปกติได้',
      advisoryEn:
        idx === 4
          ? 'Moisture dips mid-week; run supplemental irrigation during early morning or evening.'
          : idx >= 5
            ? 'Late-week rain relief expected; keep monitoring CropShield daily score.'
            : 'Soil moisture remains balanced; continue standard crop care.',
    };
  });

  const baselineScore = evaluationScoreOverride ?? 79;

  const plot: FarmPlotProfile = {
    id: plotId,
    name: `แปลง${crop.labelTh} ${districtTh} จ.${province.nameTh}`,
    nameEn: `${crop.labelEn} Plot · ${districtEn}, ${province.nameEn}`,
    ownerName: input.fullName.trim(),
    cropType: crop.labelTh,
    cropTypeEn: crop.labelEn,
    areaRai: cleanArea,
    province: province.nameTh,
    provinceEn: province.nameEn,
    lat: Number(input.lat.toFixed(4)),
    lon: Number(input.lon.toFixed(4)),
    irrigationType: crop.irrigationTh,
    irrigationTypeEn: crop.irrigationEn,
    baselineScore,
    preApprovedCreditLimitThb,
    recommendedWorkingCapitalThb,
    parametricCoverageThb,
    parametricTriggerTh: 'ความชื้นในดินต่ำกว่า 35% ต่อเนื่อง 3 วัน',
    parametricTriggerEn: 'Surface soil moisture below 35% for 3 consecutive days',
    forecast,
  };

  const riskLevel: FarmerLoanRecord['riskLevel'] =
    baselineScore >= 82 ? 'low' : baselineScore >= 60 ? 'watch' : 'critical';

  const baacRecord: FarmerLoanRecord = {
    id: `baac-reg-${Date.now()}`,
    farmerName: input.fullName.trim(),
    cooperativeName: `ลงทะเบียนใหม่ผ่าน CropShield (${districtTh})`,
    province: province.nameTh,
    cropType: crop.labelTh,
    areaRai: cleanArea,
    nasaHealthScore: baselineScore,
    riskLevel,
    riskStatus7DayTh: getRiskLabelTh(riskLevel),
    cashFlowSignalTh: 'เชื่อมข้อมูลดาวเทียม NASA และ SMS แจ้งเตือนแล้ว',
    contractFarmingPartner: crop.contractPartner,
    hasContractFarming: true,
    hasParametricInsurance: false,
    loanLimitThb: preApprovedCreditLimitThb,
    currentTranche: 1,
    totalTranches: 3,
    loanStatus: riskLevel === 'low' ? 'พร้อมปล่อยงวดที่ 2' : 'อนุมัติงวดที่ 1 แล้ว',
    savedInspectionCostThb: 1450,
    mitigationReasonsTh: [
      `เกษตรกรลงทะเบียนเชื่อมต่อพิกัด (${plot.lat.toFixed(2)}, ${plot.lon.toFixed(2)}) กับดาวเทียม NASA POWER แล้ว`,
      `เปิดรับแจ้งเตือน SMS อัตโนมัติที่เบอร์ ${input.phoneNumber.trim()} เพื่อป้องกันภัยแล้งล่วงหน้า 7 วัน`,
      `มีตลาดคู่สัญญารับซื้อผลผลิต (${crop.contractPartner}) ช่วยรับประกันกระแสเงินสดคืนหนี้`,
    ],
    nextTrancheConditionTh:
      'รักษาคะแนนความชื้นในดินเฉลี่ย 7 วันให้อยู่ในเกณฑ์เฝ้าระวังปลอดภัยขึ้นไป เพื่อปลดล็อกงวดที่ 2',
    isNewlyRegistered: true,
    phoneNumber: input.phoneNumber.trim(),
    lat: plot.lat,
    lon: plot.lon,
    districtName: districtTh,
  };

  return { plot, baacRecord };
}

export function updateBaacRecordWithScore(
  record: FarmerLoanRecord,
  evaluation: PlotEvaluation
): FarmerLoanRecord {
  return {
    ...record,
    nasaHealthScore: evaluation.healthScore,
    riskLevel: evaluation.riskLevel,
    riskStatus7DayTh: evaluation.riskLabelTh,
  };
}
