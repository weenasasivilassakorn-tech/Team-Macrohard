export type AppLanguage = 'th' | 'en';

export type AppScreen = 'home' | 'forecast' | 'finance' | 'register';

export type AppRoleMode = 'farmer' | 'baac';

export type ScenarioType = 'normal' | 'drought' | 'flood';

export type RiskLevel = 'low' | 'watch' | 'critical';

export type DataSourceMode = 'demo' | 'nasa-live' | 'nasa-fallback';

export interface RegisteredUserProfile {
  fullName: string;
  phoneNumber: string;
  lineAccountLabel: string;
  registeredAtLabel: string;
  isCustomRegistered: boolean;
  role?: AppRoleMode;
  accountId?: string;
  branchName?: string;
  employeeCode?: string;
}

export interface AuthAccount {
  id: string;
  identifier: string; // normalized phone or email
  phoneNumber: string;
  fullName: string;
  pin: string;
  role: AppRoleMode;
  linkedPlotId?: string;
  isCustomRegistered: boolean;
  lineAccountLabel?: string;
  branchName?: string;
  employeeCode?: string;
}

export interface BaacOfficerRegistrationInput {
  fullName: string;
  officerIdentifier: string;
  phoneNumber: string;
  branchName: string;
  employeeCode: string;
  passwordPin: string;
}

export interface FarmerRegistrationInput {
  fullName: string;
  phoneNumber: string;
  passwordPin?: string;
  cropKey: 'corn' | 'rice' | 'cassava' | 'sugarcane';
  areaRai: number;
  provinceKey: string;
  districtName: string;
  lat: number;
  lon: number;
  useCustomCoords: boolean;
}

export interface DailyForecastPoint {
  dayNumber: number; // 1 to 7
  dayLabelTh: string;
  dayLabelEn?: string;
  dateShort: string;
  soilMoistureIndex: number; // 0-100 (%)
  cropStressIndex: number; // 0-100 (higher = more heat/water stress)
  rainChancePercent: number; // 0-100 (%)
  tempMaxC: number;
  advisoryTh: string;
  advisoryEn?: string;
}

export interface EarlyWarningInfo {
  titleTh: string;
  titleEn?: string;
  messageTh: string;
  messageEn?: string;
  actionSummaryTh: string;
  actionSummaryEn?: string;
  moistureDeltaPercent: number; // e.g., -18 means drops 18%
  peakRiskDayLabel: string;
  peakRiskDayLabelEn?: string;
  severity: RiskLevel;
}

export interface FarmPlotProfile {
  id: string;
  name: string;
  nameEn?: string;
  ownerName?: string;
  cropType: string;
  cropTypeEn?: string;
  areaRai: number;
  province: string;
  provinceEn?: string;
  lat: number;
  lon: number;
  irrigationType: string;
  irrigationTypeEn?: string;
  baselineScore: number;
  preApprovedCreditLimitThb: number;
  recommendedWorkingCapitalThb: number;
  parametricCoverageThb: number;
  parametricTriggerTh: string;
  parametricTriggerEn?: string;
  forecast: DailyForecastPoint[];
}

export interface NasaWeatherObservationDay {
  dateKey: string; // YYYYMMDD
  labelShort: string; // e.g., MM/DD
  precipMm: number; // PRECTOTCORR (mm/day)
  tempC: number; // T2M (°C)
  humidityPercent: number; // RH2M (%)
}

export interface NasaWeatherTelemetry {
  observations: NasaWeatherObservationDay[];
  observedAvgTempC: number;
  observedTotalPrecipMm: number;
  observedAvgHumidityPercent: number;
  observedSoilWetnessPercent?: number;
  elevationMeters?: number;
  sourceTag: string;
}

export interface PlotEvaluation {
  healthScore: number; // 0-100
  riskLevel: RiskLevel;
  riskLabelTh: string;
  riskLabelEn?: string;
  creditIdentityNoteTh: string;
  creditIdentityNoteEn?: string;
  earlyWarning: EarlyWarningInfo;
  forecast: DailyForecastPoint[];
  dataSource: DataSourceMode;
  lastUpdatedLabel: string;
  nasaWeatherTelemetry?: NasaWeatherTelemetry;
}

export interface CreditApplicationState {
  status: 'eligible' | 'submitted';
  requestedAmountThb: number;
  purposeTh: string;
  submittedAtLabel?: string;
}

export interface ParametricShieldState {
  active: boolean;
  activatedAtLabel?: string;
  coverageThb: number;
  triggerConditionTh: string;
}

export type LoanTrancheStatus =
  | 'อนุมัติงวดที่ 1 แล้ว'
  | 'พร้อมปล่อยงวดที่ 2'
  | 'รอติดตามผลความชื้น'
  | 'แจ้งเตือนความเสี่ยง'
  | 'ชะลอวงเงินชั่วคราว';

export type BaacRiskFilter = 'all' | 'watch' | 'critical' | 'ready';

export type BaacCreditMode = 'phased-tranche' | 'pre-approved-revolving';

export type BaacConsoleSection = 'console' | 'radar' | 'history' | 'account';

export type BaacPortfolioScope = 'branch-all' | 'coop-group' | 'contract-only';

export type BaacManagementMode =
  | 'phased-tranche'
  | 'pre-approved-revolving'
  | 'hold-review'
  | 'trigger-insurance';

export interface PortfolioRiskRadarDay {
  dayNumber: number;
  dayLabelTh: string;
  dayLabelEn: string;
  dateShort: string;
  watchCount: number;
  criticalCount: number;
  lowCount: number;
  exposedLoanThb: number;
  atRiskFarmerIds: string[];
}

export interface BaacDecisionAuditEntry {
  id: string;
  timestampMs: number;
  timeLabel: string;
  officerName: string;
  farmerId: string;
  farmerName: string;
  cooperativeName: string;
  province: string;
  cropType: string;
  loanLimitThb: number;
  trancheLabel: string;
  actionType:
    | 'approve-tranche'
    | 'hold-credit'
    | 'trigger-insurance'
    | 'send-sms';
  actionLabelTh: string;
  actionLabelEn: string;
  nasaHealthScore: number;
  nasaRationaleTh: string;
  nasaRationaleEn: string;
  batchCount?: number;
}

export type BaacThemePresetId =
  | 'baac-emerald'
  | 'fintech-navy'
  | 'agri-amber'
  | 'slate-minimal';

export type BaacCompactFilterMode = 'all' | 'risk7d' | 'due-soon';

export type BaacMapLayerMode = 'soil-health' | 'risk-7d';

export interface TrancheScheduleItem {
  trancheNumber: number;
  labelTh: string;
  labelEn: string;
  amountThb: number;
  status: 'approved' | 'pending' | 'held' | 'scheduled';
  timestampLabel: string;
}

export interface FarmerLoanRecord {
  id: string;
  farmerName: string;
  cooperativeName: string;
  province: string;
  cropType: string;
  areaRai: number;
  nasaHealthScore: number;
  riskLevel: RiskLevel;
  riskStatus7DayTh: string;
  cashFlowSignalTh: string;
  contractFarmingPartner: string;
  hasContractFarming?: boolean;
  hasParametricInsurance?: boolean;
  loanLimitThb: number;
  currentTranche: number;
  totalTranches: number;
  loanStatus: LoanTrancheStatus;
  savedInspectionCostThb: number;
  mitigationReasonsTh: string[];
  nextTrancheConditionTh: string;
  officerActionTaken?: string;
  isNewlyRegistered?: boolean;
  phoneNumber?: string;
  lat: number;
  lon: number;
  districtName?: string;
  daysUntilRepayment?: number;
  repaymentDueLabelTh?: string;
  repaymentDueLabelEn?: string;
  trancheSchedule?: TrancheScheduleItem[];
  lastSmsSentLabel?: string;
  lastSmsMessage?: string;
}

export interface BaacPortfolioKpis {
  connectedPlotsCount: number;
  totalAreaRai: number;
  estimatedNplReductionPercent: number;
  savedFieldInspectionCostThb: number;
  lowRiskCount: number;
  watchRiskCount: number;
  criticalRiskCount: number;
}

export type AlertChannel = 'line' | 'sms' | 'both';

export interface AlertSubscriptionConfig {
  enabled: boolean;
  channel: AlertChannel;
  lineAccountLabel: string;
  phoneNumber: string;
  notifyOnWatch: boolean;
  notifyOnCritical: boolean;
}

export interface AlertDeliveryLogEntry {
  id: string;
  timestampLabel: string;
  plotId: string;
  plotName: string;
  previousRisk: RiskLevel;
  nextRisk: RiskLevel;
  healthScore: number;
  channel: Exclude<AlertChannel, 'both'>;
  recipient: string;
  messageText: string;
  triggerType: 'auto-transition' | 'manual-test';
}

export type ActivityEventCategory =
  | 'credit'
  | 'shield'
  | 'status'
  | 'alert'
  | 'nasa'
  | 'account';

export interface ActivityFeedItem {
  id: string;
  timestampMs: number;
  timeLabel: string;
  category: ActivityEventCategory;
  plotId?: string;
  titleTh: string;
  titleEn: string;
  detailTh: string;
  detailEn: string;
}

export interface CreditApplicationRecord {
  id: string;
  receiptNumber: string;
  plotId: string;
  plotName: string;
  plotNameEn?: string;
  cropType: string;
  cropTypeEn?: string;
  areaRai: number;
  province: string;
  provinceEn?: string;
  farmerName: string;
  phoneNumber: string;
  requestedAmountThb: number;
  purposeTh: string;
  nasaHealthScore: number;
  riskLevel: RiskLevel;
  status: 'approved';
  approvedAtLabel: string;
  timestampMs: number;
}

export interface EmergencyAlertPopupState {
  id: string;
  plotId: string;
  plotName: string;
  plotNameEn?: string;
  cropType: string;
  cropTypeEn?: string;
  riskLevel: RiskLevel;
  healthScore: number;
  headlineTh: string;
  headlineEn: string;
  messageTh: string;
  messageEn: string;
  actionHintTh: string;
  actionHintEn: string;
  channelsSent: string[];
  timestampLabel: string;
}

