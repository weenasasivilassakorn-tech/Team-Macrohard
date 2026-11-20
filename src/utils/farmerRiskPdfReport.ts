import type {
  AppLanguage,
  CreditApplicationState,
  FarmPlotProfile,
  ParametricShieldState,
  PlotEvaluation,
  RegisteredUserProfile,
  RiskLevel,
  ScenarioType,
} from '../types/cropshield';
import { getRiskLabel, getScenarioLabel } from './i18n';

export interface FarmerRiskForecastRow {
  dayLabel: string;
  dateShort: string;
  moistureText: string;
  stressText: string;
  rainText: string;
  tempText: string;
  advisoryText: string;
}

export interface FarmerRiskPdfPayload {
  filename: string;
  lang: AppLanguage;
  brandHeaderTag: string;
  documentTitle: string;
  subtitle: string;
  generatedAtLabel: string;
  farmerName: string;
  phoneNumber: string;
  lineAccountLabel: string;
  plotName: string;
  cropType: string;
  areaRaiLabel: string;
  provinceLabel: string;
  coordinatesLabel: string;
  irrigationLabel: string;
  scenarioLabel: string;
  dataOriginLabel: string;
  healthScore: number;
  healthScoreLabel: string;
  riskLevel: RiskLevel;
  riskLabel: string;
  avgMoistureLabel: string;
  maxStressLabel: string;
  maxRainChanceLabel: string;
  maxTempLabel: string;
  liveWeatherSummaryLine?: string;
  earlyWarningHeadline: string;
  earlyWarningSummary: string;
  earlyWarningAction: string;
  creditIdentityNote: string;
  preApprovedCreditLabel: string;
  creditRequestStatusLabel: string;
  insuranceStatusLabel: string;
  forecastRows: FarmerRiskForecastRow[];
  footerNote: string;
}

export function buildFarmerRiskPdfPayload(params: {
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  user: RegisteredUserProfile;
  creditState: CreditApplicationState;
  shieldState: ParametricShieldState;
  scenario: ScenarioType;
  lang: AppLanguage;
  now?: Date;
}): FarmerRiskPdfPayload {
  const {
    plot,
    evaluation,
    user,
    creditState,
    shieldState,
    scenario,
    lang,
    now = new Date(),
  } = params;

  const isTh = lang === 'th';
  const safePlotId = plot.id.replace(/[^a-zA-Z0-9_-]/g, '') || 'farm-plot';
  const dateLocale = isTh ? 'th-TH' : 'en-US';
  const generatedAt = now.toLocaleString(dateLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const plotName = !isTh && plot.nameEn ? plot.nameEn : plot.name;
  const cropType = !isTh && plot.cropTypeEn ? plot.cropTypeEn : plot.cropType;
  const provinceLabel =
    !isTh && plot.provinceEn ? plot.provinceEn : isTh ? `จ.${plot.province}` : plot.province;
  const irrigationLabel =
    !isTh && plot.irrigationTypeEn ? plot.irrigationTypeEn : plot.irrigationType;

  const days = evaluation.forecast;
  const avgMoisture = Math.round(
    days.reduce((sum, d) => sum + d.soilMoistureIndex, 0) / Math.max(1, days.length)
  );
  const maxStress = Math.max(...days.map((d) => d.cropStressIndex), 0);
  const maxRain = Math.max(...days.map((d) => d.rainChancePercent), 0);
  const maxTemp = Math.max(...days.map((d) => d.tempMaxC), 0);

  const dataOriginLabel =
    evaluation.dataSource === 'nasa-live'
      ? isTh
        ? 'ข้อมูลดาวเทียม NASA POWER API (สด)'
        : 'Live NASA POWER API Telemetry'
      : evaluation.dataSource === 'nasa-fallback'
        ? isTh
          ? 'ชุดข้อมูลสำรองมาตรฐาน NASA (ออฟไลน์)'
          : 'Automatic NASA Offline Backup Dataset'
        : isTh
          ? 'ชุดข้อมูลจำลองมาตรฐาน CropShield (Demo)'
          : 'CropShield Standard Simulation Dataset';

  const earlyWarningHeadline =
    !isTh && evaluation.earlyWarning.titleEn
      ? evaluation.earlyWarning.titleEn
      : evaluation.earlyWarning.titleTh;
  const earlyWarningSummary =
    !isTh && evaluation.earlyWarning.messageEn
      ? evaluation.earlyWarning.messageEn
      : evaluation.earlyWarning.messageTh;
  const earlyWarningAction =
    !isTh && evaluation.earlyWarning.actionSummaryEn
      ? evaluation.earlyWarning.actionSummaryEn
      : evaluation.earlyWarning.actionSummaryTh;
  const creditIdentityNote =
    !isTh && evaluation.creditIdentityNoteEn
      ? evaluation.creditIdentityNoteEn
      : evaluation.creditIdentityNoteTh;

  const creditRequestStatusLabel =
    creditState.status === 'submitted'
      ? isTh
        ? `ยื่นขอแล้ว ฿${creditState.requestedAmountThb.toLocaleString('en-US')} (${creditState.submittedAtLabel ?? 'รอดำเนินการ'})`
        : `Submitted ฿${creditState.requestedAmountThb.toLocaleString('en-US')} (${creditState.submittedAtLabel ?? 'Pending'})`
      : isTh
        ? 'พร้อมยื่นขอสินเชื่อหมุนเวียน (Pre-approved)'
        : 'Eligible for Pre-Approved Working Capital';

  const insuranceStatusLabel = shieldState.active
    ? isTh
      ? `เปิดคุ้มครอง Parametric Shield ฿${shieldState.coverageThb.toLocaleString('en-US')}`
      : `Parametric Shield Active (฿${shieldState.coverageThb.toLocaleString('en-US')})`
    : isTh
      ? `ยังไม่เปิดใช้งาน (วงเงินสิทธิ์ ฿${plot.parametricCoverageThb.toLocaleString('en-US')})`
      : `Not Activated (Eligible ฿${plot.parametricCoverageThb.toLocaleString('en-US')})`;

  const liveWeatherSummaryLine = evaluation.nasaWeatherTelemetry
    ? isTh
      ? `สถิติ NASA 7 วันล่าสุด: ฝนสะสม ${evaluation.nasaWeatherTelemetry.observedTotalPrecipMm.toFixed(1)} มม. · อุณหภูมิเฉลี่ย ${evaluation.nasaWeatherTelemetry.observedAvgTempC.toFixed(1)}°C · ความชื้นสัมพัทธ์ ${evaluation.nasaWeatherTelemetry.observedAvgHumidityPercent}%`
      : `NASA 7-Day Observed: ${evaluation.nasaWeatherTelemetry.observedTotalPrecipMm.toFixed(1)} mm rainfall · ${evaluation.nasaWeatherTelemetry.observedAvgTempC.toFixed(1)}°C avg temp · ${evaluation.nasaWeatherTelemetry.observedAvgHumidityPercent}% RH`
    : undefined;

  const forecastRows: FarmerRiskForecastRow[] = days.map((day) => ({
    dayLabel: !isTh && day.dayLabelEn ? day.dayLabelEn : day.dayLabelTh,
    dateShort: day.dateShort,
    moistureText: `${day.soilMoistureIndex}%`,
    stressText: `${day.cropStressIndex}/100`,
    rainText: `${day.rainChancePercent}%`,
    tempText: `${day.tempMaxC}°C`,
    advisoryText: !isTh && day.advisoryEn ? day.advisoryEn : day.advisoryTh,
  }));

  return {
    filename: `CropShield-NASA-Plot-Summary-${safePlotId}.pdf`,
    lang,
    brandHeaderTag: isTh
      ? 'เอกสารสรุปสุขภาพแปลงสำหรับยื่นเจ้าหน้าที่ธนาคาร / ธ.ก.ส.'
      : 'NASA Plot Health Summary for Bank & BAAC Officers',
    documentTitle: isTh
      ? 'รายงานสรุปผลการประเมินความเสี่ยงแปลงเกษตรจากข้อมูลดาวเทียม NASA'
      : 'NASA Satellite Plot Health & Risk Evaluation Summary',
    subtitle: isTh
      ? 'ใช้ยืนยันตัวตนเครดิตทางการเกษตร สภาพความชื้นดิน และแนวโน้มความเสี่ยงล่วงหน้า 7 วัน'
      : 'Verified satellite soil moisture, crop stress, and 7-day risk outlook for loan review',
    generatedAtLabel: isTh
      ? `พิมพ์เอกสารเมื่อ: ${generatedAt} น.`
      : `Generated: ${generatedAt}`,
    farmerName: user.fullName,
    phoneNumber: user.phoneNumber,
    lineAccountLabel: user.lineAccountLabel,
    plotName,
    cropType,
    areaRaiLabel: isTh
      ? `${plot.areaRai.toLocaleString('en-US')} ไร่`
      : `${plot.areaRai.toLocaleString('en-US')} Rai`,
    provinceLabel,
    coordinatesLabel: `${plot.lat.toFixed(4)}°N, ${plot.lon.toFixed(4)}°E`,
    irrigationLabel,
    scenarioLabel: getScenarioLabel(scenario, lang),
    dataOriginLabel,
    healthScore: evaluation.healthScore,
    healthScoreLabel: `${evaluation.healthScore} / 100`,
    riskLevel: evaluation.riskLevel,
    riskLabel: getRiskLabel(evaluation.riskLevel, lang),
    avgMoistureLabel: `${avgMoisture}%`,
    maxStressLabel: `${maxStress} / 100`,
    maxRainChanceLabel: `${maxRain}%`,
    maxTempLabel: `${maxTemp}°C`,
    liveWeatherSummaryLine,
    earlyWarningHeadline,
    earlyWarningSummary,
    earlyWarningAction,
    creditIdentityNote,
    preApprovedCreditLabel: `฿${plot.preApprovedCreditLimitThb.toLocaleString('en-US')}`,
    creditRequestStatusLabel,
    insuranceStatusLabel,
    forecastRows,
    footerNote: isTh
      ? 'เอกสารนี้ออกโดยระบบ CropShield (แหล่งข้อมูล: NASA POWER Agroclimatology) เพื่อใช้ประกอบการสื่อสารกับเจ้าหน้าที่สินเชื่อธนาคาร'
      : 'Issued by CropShield (Source: NASA POWER Agroclimatology) for farmer-to-bank officer credit review.',
  };
}
