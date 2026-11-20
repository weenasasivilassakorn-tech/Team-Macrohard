import type {
  AppLanguage,
  BaacCompactFilterMode,
  BaacCreditMode,
  BaacDecisionAuditEntry,
  BaacManagementMode,
  BaacPortfolioScope,
  BaacRiskFilter,
  BaacThemePresetId,
  FarmerLoanRecord,
  FarmPlotProfile,
  PlotEvaluation,
  PortfolioRiskRadarDay,
  ScenarioType,
  TrancheScheduleItem,
} from '../types/cropshield';

export interface BaacThemePreset {
  id: BaacThemePresetId;
  nameTh: string;
  nameEn: string;
  swatchHex: string;
  secondaryHex: string;
  heroGradientClass: string;
  heroBorderClass: string;
  accentBadgeClass: string;
  accentTextClass: string;
  primaryBtnClass: string;
  activeTabClass: string;
  selectedRowClass: string;
  insightCardClass: string;
}

export const BAAC_THEME_PRESETS: Record<BaacThemePresetId, BaacThemePreset> = {
  'baac-emerald': {
    id: 'baac-emerald',
    nameTh: 'เขียว ธ.ก.ส.',
    nameEn: 'BAAC Emerald',
    swatchHex: '#047857',
    secondaryHex: '#ECFDF5',
    heroGradientClass:
      'bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white',
    heroBorderClass: 'border-emerald-700',
    accentBadgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accentTextClass: 'text-emerald-700',
    primaryBtnClass:
      'bg-emerald-700 hover:bg-emerald-800 text-white focus-visible:ring-emerald-600',
    activeTabClass: 'bg-emerald-700 text-white shadow-xs',
    selectedRowClass:
      'bg-emerald-50/90 ring-2 ring-inset ring-emerald-600/35',
    insightCardClass: 'bg-emerald-50/80 border-emerald-200',
  },
  'fintech-navy': {
    id: 'fintech-navy',
    nameTh: 'น้ำเงินฟินเทค',
    nameEn: 'Fintech Navy',
    swatchHex: '#1D4ED8',
    secondaryHex: '#EFF6FF',
    heroGradientClass:
      'bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 text-white',
    heroBorderClass: 'border-blue-800',
    accentBadgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    accentTextClass: 'text-blue-700',
    primaryBtnClass:
      'bg-blue-700 hover:bg-blue-800 text-white focus-visible:ring-blue-600',
    activeTabClass: 'bg-blue-700 text-white shadow-xs',
    selectedRowClass:
      'bg-blue-50/85 ring-2 ring-inset ring-blue-600/35',
    insightCardClass: 'bg-blue-50/70 border-blue-200',
  },
  'agri-amber': {
    id: 'agri-amber',
    nameTh: 'ทอง-เกษตรพรีเมียม',
    nameEn: 'Harvest Gold',
    swatchHex: '#B45309',
    secondaryHex: '#FFFBEB',
    heroGradientClass:
      'bg-gradient-to-r from-amber-800 via-amber-700 to-emerald-800 text-white',
    heroBorderClass: 'border-amber-700',
    accentBadgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    accentTextClass: 'text-amber-700',
    primaryBtnClass:
      'bg-amber-700 hover:bg-amber-800 text-white focus-visible:ring-amber-600',
    activeTabClass: 'bg-amber-700 text-white shadow-xs',
    selectedRowClass:
      'bg-amber-50/85 ring-2 ring-inset ring-amber-600/35',
    insightCardClass: 'bg-amber-50/75 border-amber-200',
  },
  'slate-minimal': {
    id: 'slate-minimal',
    nameTh: 'โมเดิร์นมินิมอล',
    nameEn: 'Crisp Slate',
    swatchHex: '#0F172A',
    secondaryHex: '#F1F5F9',
    heroGradientClass:
      'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white',
    heroBorderClass: 'border-slate-800',
    accentBadgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    accentTextClass: 'text-slate-900',
    primaryBtnClass:
      'bg-slate-900 hover:bg-slate-800 text-white focus-visible:ring-slate-700',
    activeTabClass: 'bg-slate-900 text-white shadow-xs',
    selectedRowClass:
      'bg-slate-100/90 ring-2 ring-inset ring-slate-700/30',
    insightCardClass: 'bg-slate-50 border-slate-200',
  },
};

export interface BaacFilterCriteria {
  searchQuery: string;
  areaOrCoop: string; // 'all' or specific province / cooperative
  cropType: string; // 'all' or specific cropType
  riskFilter: BaacRiskFilter;
  onlyContractOrInsurance: boolean;
}

export interface BaacPolicyCriteria extends BaacFilterCriteria {
  portfolioScope: BaacPortfolioScope;
  minHealthScore: number;
  enforceMinScoreFilter?: boolean;
  radarDayFarmerIds?: string[] | null;
}

export function isReadyToReleaseLoan(record: FarmerLoanRecord): boolean {
  if (record.loanStatus === 'ชะลอวงเงินชั่วคราว') return false;
  if (record.riskLevel === 'critical') return false;
  return record.riskLevel === 'low' || record.loanStatus === 'พร้อมปล่อยงวดที่ 2';
}

export function hasContractFarmingPartner(record: FarmerLoanRecord): boolean {
  if (record.hasContractFarming !== undefined) {
    return record.hasContractFarming;
  }
  return Boolean(
    record.contractFarmingPartner &&
      !record.contractFarmingPartner.includes('ไม่มีคู่สัญญา')
  );
}

export function hasContractOrInsuranceProtection(
  record: FarmerLoanRecord
): boolean {
  const hasContract = hasContractFarmingPartner(record);
  const hasInsurance = Boolean(record.hasParametricInsurance);
  return hasContract || hasInsurance;
}

export function isCooperativePlot(record: FarmerLoanRecord): boolean {
  const coop = record.cooperativeName.trim();
  return (
    coop.includes('สหกรณ์') ||
    coop.includes('กลุ่ม') ||
    coop.includes('วิสาหกิจ')
  );
}

export function filterBaacFarmers(
  farmers: FarmerLoanRecord[],
  criteria: BaacFilterCriteria
): FarmerLoanRecord[] {
  const q = criteria.searchQuery.trim().toLowerCase();
  return farmers.filter((record) => {
    if (criteria.areaOrCoop !== 'all') {
      const areaKey = `${record.province} · ${record.cooperativeName}`;
      if (
        areaKey !== criteria.areaOrCoop &&
        record.province !== criteria.areaOrCoop &&
        record.cooperativeName !== criteria.areaOrCoop
      ) {
        return false;
      }
    }

    if (criteria.cropType !== 'all' && record.cropType !== criteria.cropType) {
      return false;
    }

    if (criteria.riskFilter === 'watch' && record.riskLevel !== 'watch') {
      return false;
    }
    if (criteria.riskFilter === 'critical' && record.riskLevel !== 'critical') {
      return false;
    }
    if (criteria.riskFilter === 'ready' && !isReadyToReleaseLoan(record)) {
      return false;
    }

    if (
      criteria.onlyContractOrInsurance &&
      !hasContractOrInsuranceProtection(record)
    ) {
      return false;
    }

    if (!q) return true;
    return (
      record.farmerName.toLowerCase().includes(q) ||
      record.cooperativeName.toLowerCase().includes(q) ||
      record.province.toLowerCase().includes(q) ||
      record.cropType.toLowerCase().includes(q) ||
      record.contractFarmingPartner.toLowerCase().includes(q)
    );
  });
}

export function applyBaacPolicyFilters(
  farmers: FarmerLoanRecord[],
  criteria: BaacPolicyCriteria
): FarmerLoanRecord[] {
  const baseFiltered = filterBaacFarmers(farmers, criteria);
  return baseFiltered.filter((record) => {
    if (criteria.portfolioScope === 'coop-group' && !isCooperativePlot(record)) {
      return false;
    }
    if (
      criteria.portfolioScope === 'contract-only' &&
      !hasContractFarmingPartner(record)
    ) {
      return false;
    }
    if (
      criteria.enforceMinScoreFilter &&
      record.nasaHealthScore < criteria.minHealthScore
    ) {
      return false;
    }
    if (
      criteria.radarDayFarmerIds &&
      !criteria.radarDayFarmerIds.includes(record.id)
    ) {
      return false;
    }
    return true;
  });
}

export function extractBaacFilterOptions(farmers: FarmerLoanRecord[]): {
  areaCoopOptions: Array<{ value: string; label: string }>;
  cropOptions: string[];
} {
  const areaMap = new Map<string, string>();
  const cropSet = new Set<string>();

  for (const r of farmers) {
    const key = `${r.province} · ${r.cooperativeName}`;
    if (!areaMap.has(key)) {
      areaMap.set(key, `${r.province} · ${r.cooperativeName}`);
    }
    if (r.cropType.trim()) {
      cropSet.add(r.cropType.trim());
    }
  }

  return {
    areaCoopOptions: Array.from(areaMap.entries()).map(([value, label]) => ({
      value,
      label,
    })),
    cropOptions: Array.from(cropSet),
  };
}

export function buildPortfolioRiskRadar(
  farmers: FarmerLoanRecord[],
  lang: AppLanguage,
  baseDate: Date = new Date()
): PortfolioRiskRadarDay[] {
  const isTh = lang === 'th';
  const thDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const thMonths = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  const enMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const days: PortfolioRiskRadarDay[] = [];

  for (let i = 0; i < 7; i += 1) {
    const dayNumber = i + 1;
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);

    const dateShort = isTh
      ? `${d.getDate()} ${thMonths[d.getMonth()]}`
      : `${enMonths[d.getMonth()]} ${d.getDate()}`;

    const dayLabelTh =
      i === 0
        ? 'วันนี้'
        : i === 1
          ? 'พรุ่งนี้'
          : `วัน${thDays[d.getDay()]} (${dayNumber})`;
    const dayLabelEn =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `Day ${dayNumber}`;

    let watchCount = 0;
    let criticalCount = 0;
    let lowCount = 0;
    let exposedLoanThb = 0;
    const atRiskFarmerIds: string[] = [];

    for (const f of farmers) {
      let dayRisk: 'low' | 'watch' | 'critical' = 'low';

      if (f.riskLevel === 'critical') {
        // Critical plots start at watch on Day 1-2 and escalate to critical from Day 3-7
        dayRisk = dayNumber >= 3 ? 'critical' : 'watch';
      } else if (f.riskLevel === 'watch') {
        // Watch plots rise into peak water stress across Days 2-6
        const hashOffset = (f.areaRai + f.nasaHealthScore) % 2;
        if (dayNumber >= 2 + hashOffset && dayNumber <= 6) {
          dayRisk = 'watch';
        } else if (f.nasaHealthScore < 75 && dayNumber === 7) {
          dayRisk = 'watch';
        }
      } else if (f.nasaHealthScore < 85 && dayNumber === 5) {
        // Borderline low-risk plot shows mild watch signal on peak heat day 5
        dayRisk = 'watch';
      }

      if (dayRisk === 'critical') {
        criticalCount += 1;
        exposedLoanThb += f.loanLimitThb;
        atRiskFarmerIds.push(f.id);
      } else if (dayRisk === 'watch') {
        watchCount += 1;
        exposedLoanThb += f.loanLimitThb;
        atRiskFarmerIds.push(f.id);
      } else {
        lowCount += 1;
      }
    }

    days.push({
      dayNumber,
      dayLabelTh,
      dayLabelEn,
      dateShort,
      watchCount,
      criticalCount,
      lowCount,
      exposedLoanThb,
      atRiskFarmerIds,
    });
  }

  return days;
}

export function splitTrancheApprovalQueue(farmers: FarmerLoanRecord[]): {
  pendingApproval: FarmerLoanRecord[];
  processedApprovals: FarmerLoanRecord[];
} {
  const pendingApproval: FarmerLoanRecord[] = [];
  const processedApprovals: FarmerLoanRecord[] = [];

  for (const record of farmers) {
    const isProcessed =
      Boolean(record.officerActionTaken) ||
      record.loanStatus === 'อนุมัติงวดที่ 1 แล้ว' ||
      record.currentTranche >= 2;

    if (isProcessed) {
      processedApprovals.push(record);
    }

    const stillHasNextTrancheOrPendingReview =
      record.currentTranche < record.totalTranches &&
      (record.loanStatus === 'พร้อมปล่อยงวดที่ 2' ||
        record.loanStatus === 'รอติดตามผลความชื้น' ||
        record.loanStatus === 'แจ้งเตือนความเสี่ยง' ||
        record.loanStatus === 'ชะลอวงเงินชั่วคราว' ||
        !isProcessed);

    if (stillHasNextTrancheOrPendingReview) {
      pendingApproval.push(record);
    }
  }

  return { pendingApproval, processedApprovals };
}

export function createBaacAuditEntry(params: {
  officerName: string;
  record: FarmerLoanRecord;
  actionType: BaacDecisionAuditEntry['actionType'];
  minHealthScore?: number;
  batchCount?: number;
  lang: AppLanguage;
}): BaacDecisionAuditEntry {
  const { officerName, record, actionType, minHealthScore = 70, batchCount } = params;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const nextTranche = Math.min(record.totalTranches, record.currentTranche + 1);
  const thresholdStatusTh =
    record.nasaHealthScore >= minHealthScore
      ? `ผ่านเกณฑ์ขั้นต่ำ (${minHealthScore})`
      : `ต่ำกว่าเกณฑ์ขั้นต่ำ (${minHealthScore})`;
  const thresholdStatusEn =
    record.nasaHealthScore >= minHealthScore
      ? `Meets Min Score (${minHealthScore})`
      : `Below Min Score (${minHealthScore})`;

  let actionLabelTh = '';
  let actionLabelEn = '';
  let nasaRationaleTh = '';
  let nasaRationaleEn = '';

  if (actionType === 'approve-tranche') {
    actionLabelTh = `อนุมัติเบิกจ่ายงวดที่ ${nextTranche}`;
    actionLabelEn = `Approved Tranche #${nextTranche}`;
    nasaRationaleTh = `คะแนน NASA ${record.nasaHealthScore}/100 (${thresholdStatusTh}) · ${record.riskStatus7DayTh} · ${record.cashFlowSignalTh}`;
    nasaRationaleEn = `NASA Score ${record.nasaHealthScore}/100 (${thresholdStatusEn}) · ${record.riskStatus7DayTh}`;
  } else if (actionType === 'hold-credit') {
    actionLabelTh = 'ชะลอวงเงินเพื่อตรวจติดตาม';
    actionLabelEn = 'Held Credit for Field Review';
    nasaRationaleTh = `คะแนน NASA ${record.nasaHealthScore}/100 (${thresholdStatusTh}) · ${record.riskStatus7DayTh} · ลดความเสี่ยง NPL ก่อนปล่อยงวดถัดไป`;
    nasaRationaleEn = `NASA Score ${record.nasaHealthScore}/100 (${thresholdStatusEn}) · ${record.riskStatus7DayTh} · Mitigates NPL risk prior to release`;
  } else if (actionType === 'trigger-insurance') {
    actionLabelTh = 'ทริกเกอร์ประกันภัย Parametric Shield';
    actionLabelEn = 'Triggered Parametric Shield Protection';
    nasaRationaleTh = `สัญญาณความชื้น NASA 7 วันผิดปกติ (คะแนน ${record.nasaHealthScore}/100) · เปิดคุ้มครองภัยแล้ง/น้ำท่วมอัตโนมัติ`;
    nasaRationaleEn = `7-day NASA moisture anomaly detected (Score ${record.nasaHealthScore}/100) · Activated automated weather shield`;
  } else {
    actionLabelTh = 'ส่ง SMS เตือนภัยล่วงหน้า 7 วัน';
    actionLabelEn = 'Dispatched 7-Day Risk SMS Alert';
    nasaRationaleTh = `แจ้งเตือนเกษตรกร ${record.phoneNumber ?? '-'} · คะแนน NASA ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh})`;
    nasaRationaleEn = `Notified farmer ${record.phoneNumber ?? '-'} · NASA Score ${record.nasaHealthScore}/100`;
  }

  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestampMs: now.getTime(),
    timeLabel: `${timeStr} น.`,
    officerName,
    farmerId: record.id,
    farmerName: record.farmerName,
    cooperativeName: record.cooperativeName,
    province: record.province,
    cropType: record.cropType,
    loanLimitThb: record.loanLimitThb,
    trancheLabel: `งวด ${record.currentTranche}/${record.totalTranches}`,
    actionType,
    actionLabelTh,
    actionLabelEn,
    nasaHealthScore: record.nasaHealthScore,
    nasaRationaleTh,
    nasaRationaleEn,
    ...(batchCount && batchCount > 1 ? { batchCount } : {}),
  };
}

export function createSeedBaacAuditLog(
  farmers: FarmerLoanRecord[]
): BaacDecisionAuditEntry[] {
  const now = Date.now();
  const f1 = farmers[1] ?? farmers[0];
  const f2 = farmers[3] ?? farmers[0];
  const f3 = farmers[2] ?? farmers[0];
  return [
    {
      id: 'audit-seed-1',
      timestampMs: now - 1000 * 60 * 42,
      timeLabel: '10:15 น.',
      officerName: 'เจ้าหน้าที่สินเชื่อ ธ.ก.ส.',
      farmerId: f2.id,
      farmerName: f2.farmerName,
      cooperativeName: f2.cooperativeName,
      province: f2.province,
      cropType: f2.cropType,
      loanLimitThb: f2.loanLimitThb,
      trancheLabel: `งวด ${f2.currentTranche}/${f2.totalTranches}`,
      actionType: 'approve-tranche',
      actionLabelTh: 'อนุมัติเบิกจ่ายงวดที่ 2',
      actionLabelEn: 'Approved Tranche #2',
      nasaHealthScore: f2.nasaHealthScore,
      nasaRationaleTh: `คะแนน NASA ${f2.nasaHealthScore}/100 · ความชื้นดินสมดุลและมีระบบน้ำสปริงเกลอร์ 100% + ประกันภัย GAP`,
      nasaRationaleEn: `NASA Score ${f2.nasaHealthScore}/100 · Balanced soil moisture with full sprinkler irrigation`,
    },
    {
      id: 'audit-seed-2',
      timestampMs: now - 1000 * 60 * 95,
      timeLabel: '09:22 น.',
      officerName: 'เจ้าหน้าที่สินเชื่อ ธ.ก.ส.',
      farmerId: f3.id,
      farmerName: f3.farmerName,
      cooperativeName: f3.cooperativeName,
      province: f3.province,
      cropType: f3.cropType,
      loanLimitThb: f3.loanLimitThb,
      trancheLabel: `งวด ${f3.currentTranche}/${f3.totalTranches}`,
      actionType: 'send-sms',
      actionLabelTh: 'ส่ง SMS เตือนภัยล่วงหน้า 7 วัน',
      actionLabelEn: 'Sent 7-Day Drought SMS Warning',
      nasaHealthScore: f3.nasaHealthScore,
      nasaRationaleTh: `คะแนน NASA ${f3.nasaHealthScore}/100 · ความชื้นชั้นรากมีแนวโน้มลดต่ำกว่า 32% ในอีก 4 วันข้างหน้า`,
      nasaRationaleEn: `NASA Score ${f3.nasaHealthScore}/100 · Root-zone moisture projected below 32% within 4 days`,
    },
    {
      id: 'audit-seed-3',
      timestampMs: now - 1000 * 60 * 145,
      timeLabel: '08:30 น.',
      officerName: 'เจ้าหน้าที่สินเชื่อ ธ.ก.ส.',
      farmerId: f1.id,
      farmerName: f1.farmerName,
      cooperativeName: f1.cooperativeName,
      province: f1.province,
      cropType: f1.cropType,
      loanLimitThb: f1.loanLimitThb,
      trancheLabel: `งวด ${f1.currentTranche}/${f1.totalTranches}`,
      actionType: 'approve-tranche',
      actionLabelTh: 'อนุมัติเบิกจ่ายงวดที่ 1',
      actionLabelEn: 'Approved Tranche #1',
      nasaHealthScore: f1.nasaHealthScore,
      nasaRationaleTh: `คะแนน NASA ${f1.nasaHealthScore}/100 · แปลงนาแปลงใหญ่ความชื้นปกติ ประหยัดค่าตรวจแปลง ฿${f1.savedInspectionCostThb.toLocaleString('en-US')}`,
      nasaRationaleEn: `NASA Score ${f1.nasaHealthScore}/100 · Stable paddy moisture; saved ฿${f1.savedInspectionCostThb.toLocaleString('en-US')} field audit cost`,
    },
  ];
}

export interface AiCreditInsight {
  tone: 'emerald' | 'amber' | 'red';
  headline: string;
  riskReason7d: string;
  loanRecommendation: string;
  suggestedDisbursementThb: number;
}

export function buildAiCreditInsight(
  record: FarmerLoanRecord,
  creditMode: BaacCreditMode | BaacManagementMode,
  lang: AppLanguage,
  minHealthScore: number = 0
): AiCreditInsight {
  const isTh = lang === 'th';
  const nextTrancheNumber = Math.min(
    record.totalTranches,
    record.currentTranche + 1
  );
  const trancheAmount = Math.round(
    record.loanLimitThb / Math.max(1, record.totalTranches)
  );
  const revolvingAmount = Math.round(record.loanLimitThb * 0.35);

  const hasContract = hasContractFarmingPartner(record);
  const hasInsurance = Boolean(record.hasParametricInsurance);
  const belowMinThreshold =
    minHealthScore > 0 && record.nasaHealthScore < minHealthScore;

  const safetyTagTh =
    hasContract && hasInsurance
      ? 'มีทั้ง Contract Farming และประกันภัยพืชผล'
      : hasContract
        ? `มีคู่สัญญา ${record.contractFarmingPartner}`
        : hasInsurance
          ? 'มีประกันภัย Parametric Shield คุ้มครอง'
          : 'ยังไม่มีคู่สัญญา/ประกันภัยรองรับ';

  const safetyTagEn =
    hasContract && hasInsurance
      ? 'Protected by both Contract Farming & Parametric Insurance'
      : hasContract
        ? `Backed by ${record.contractFarmingPartner}`
        : hasInsurance
          ? 'Covered by Parametric Shield'
          : 'No active Contract Farming or Parametric Insurance';

  if (creditMode === 'trigger-insurance') {
    return {
      tone: record.riskLevel === 'critical' ? 'red' : 'amber',
      headline: isTh
        ? 'AI Credit Insight: โหมดทริกเกอร์ประกันภัย Parametric Shield'
        : 'AI Credit Insight: Trigger Parametric Shield Mode',
      riskReason7d: isTh
        ? `คะแนน NASA ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagTh}`
        : `NASA Score ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagEn}`,
      loanRecommendation: isTh
        ? `แนะนำผูกเงื่อนไขประกันภัยอัตโนมัติ (Parametric Shield) เพื่อคุ้มครองวงเงิน ฿${record.loanLimitThb.toLocaleString('en-US')} ก่อนปล่อยงวดที่ ${nextTrancheNumber}`
        : `Attach Parametric Shield coverage to protect the ฿${record.loanLimitThb.toLocaleString('en-US')} facility before releasing Tranche #${nextTrancheNumber}.`,
      suggestedDisbursementThb: hasInsurance ? trancheAmount : 0,
    };
  }

  if (creditMode === 'hold-review') {
    return {
      tone: belowMinThreshold || record.riskLevel === 'critical' ? 'red' : 'amber',
      headline: isTh
        ? 'AI Credit Insight: โหมดชะลอตรวจติดตามความเสี่ยง'
        : 'AI Credit Insight: Hold & Inspection Review Mode',
      riskReason7d: isTh
        ? `คะแนน NASA ${record.nasaHealthScore}/100 (เกณฑ์ขั้นต่ำ ${minHealthScore || 70}) · ${record.riskStatus7DayTh}`
        : `NASA Score ${record.nasaHealthScore}/100 (Min threshold ${minHealthScore || 70}) · ${record.riskStatus7DayTh}`,
      loanRecommendation: isTh
        ? `ชะลอการปล่อยงวดที่ ${nextTrancheNumber} ชั่วคราวและส่ง SMS ให้เกษตรกรยืนยันแหล่งน้ำสำรอง/ระบบคลุมดินภายใน 48 ชม.`
        : `Hold Tranche #${nextTrancheNumber} temporarily and send an SMS requesting water-reserve confirmation within 48 hours.`,
      suggestedDisbursementThb: 0,
    };
  }

  if (record.riskLevel === 'critical' || belowMinThreshold) {
    return {
      tone: 'red',
      headline: isTh
        ? belowMinThreshold && record.riskLevel !== 'critical'
          ? `AI Credit Insight: คะแนนต่ำกว่าเกณฑ์ขั้นต่ำ (${minHealthScore}) — แนะนำชะลอ/ทบทวน`
          : 'AI Credit Insight: ความเสี่ยงวิกฤต — แนะนำชะลอวงเงินหลัก'
        : belowMinThreshold && record.riskLevel !== 'critical'
          ? `AI Credit Insight: Below Min Score (${minHealthScore}) — Review Required`
          : 'AI Credit Insight: Critical 7-Day Risk — Hold Principal Release',
      riskReason7d: isTh
        ? `คะแนน NASA ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagTh}`
        : `NASA Score ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagEn}`,
      loanRecommendation:
        creditMode === 'phased-tranche'
          ? isTh
            ? `ชะลอปล่อยกู้งวดที่ ${nextTrancheNumber} ชั่วคราว และส่ง SMS แจ้งเตือนเกษตรกรให้เปิดประกันภัย/จัดหาน้ำสำรองก่อนพิจารณาใหม่`
            : `Hold Tranche #${nextTrancheNumber} and send SMS alert advising water-reserve verification or Parametric Shield activation.`
          : isTh
            ? `ไม่อนุมัติวงเงินหมุนเวียนเต็มจำนวน แนะนำจำกัดเฉพาะวงเงินกู้ฉุกเฉินระบบน้ำหรือชะลอวงเงินรอความชื้นฟื้นตัว`
            : `Restrict full revolving limit; hold disbursement or limit strictly to emergency pump fuel after SMS verification.`,
      suggestedDisbursementThb: 0,
    };
  }

  if (record.riskLevel === 'watch') {
    return {
      tone: 'amber',
      headline: isTh
        ? creditMode === 'phased-tranche'
          ? `AI Credit Insight: เฝ้าระวัง — ปล่อยงวดที่ ${nextTrancheNumber} แบบมีเงื่อนไขระบบน้ำ`
          : 'AI Credit Insight: เฝ้าระวัง — อนุมัติวงเงินหมุนเวียนเบื้องต้นบางส่วน'
        : creditMode === 'phased-tranche'
          ? `AI Credit Insight: Watch — Conditional Tranche #${nextTrancheNumber}`
          : 'AI Credit Insight: Watch — Partial Revolving Working Capital',
      riskReason7d: isTh
        ? `คะแนน NASA ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagTh}`
        : `NASA Score ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagEn}`,
      loanRecommendation:
        creditMode === 'phased-tranche'
          ? isTh
            ? `ปล่อยงวดที่ ${nextTrancheNumber} วงเงิน ฿${trancheAmount.toLocaleString('en-US')} เฉพาะหมวดสูบน้ำ/คลุมดิน พร้อมส่ง SMS แจ้งเตือนล่วงหน้า 7 วัน`
            : `Release Tranche #${nextTrancheNumber} (฿${trancheAmount.toLocaleString('en-US')}) earmarked for supplemental irrigation + send 7-day SMS alert.`
          : isTh
            ? `อนุมัติวงเงินหมุนเวียนเบื้องต้น ฿${revolvingAmount.toLocaleString('en-US')} เพื่อเสริมสภาพคล่องระบบน้ำทันท่วงที ลดความเสี่ยงผลผลิตเสียหาย`
            : `Approve ฿${revolvingAmount.toLocaleString('en-US')} initial revolving capital for irrigation liquidity to protect harvest cash flow.`,
      suggestedDisbursementThb:
        creditMode === 'phased-tranche' ? trancheAmount : revolvingAmount,
    };
  }

  return {
    tone: 'emerald',
    headline: isTh
      ? creditMode === 'phased-tranche'
        ? `AI Credit Insight: พร้อมปล่อยงวดที่ ${nextTrancheNumber} อัตโนมัติ`
        : 'AI Credit Insight: ผ่านเกณฑ์วงเงินหมุนเวียนเบื้องต้นเต็มสิทธิ์'
      : creditMode === 'phased-tranche'
        ? `AI Credit Insight: Ready for Tranche #${nextTrancheNumber} Release`
        : 'AI Credit Insight: Eligible for Full Revolving Credit',
    riskReason7d: isTh
      ? `คะแนน NASA ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagTh}`
      : `NASA Score ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) · ${safetyTagEn}`,
    loanRecommendation:
      creditMode === 'phased-tranche'
        ? isTh
          ? `อนุมัติงวดที่ ${nextTrancheNumber} จำนวน ฿${trancheAmount.toLocaleString('en-US')} ได้ทันทีโดยไม่ต้องลงพื้นที่ตรวจแปลง`
          : `Approve Tranche #${nextTrancheNumber} (฿${trancheAmount.toLocaleString('en-US')}) immediately without physical field inspection.`
        : isTh
          ? `อนุมัติวงเงินหมุนเวียนเบื้องต้นสูงสุด ฿${record.loanLimitThb.toLocaleString('en-US')} อ้างอิงคะแนน NASA และกระแสเงินสด`
          : `Approve pre-approved revolving facility up to ฿${record.loanLimitThb.toLocaleString('en-US')} backed by NASA score & cash flow.`,
    suggestedDisbursementThb:
      creditMode === 'phased-tranche' ? trancheAmount : record.loanLimitThb,
  };
}

export function buildChatbotContextSummary(params: {
  role: 'farmer' | 'baac';
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  farmers: FarmerLoanRecord[];
  minHealthScore?: number;
}): string {
  const { role, plot, evaluation, farmers, minHealthScore = 70 } = params;
  if (role === 'baac') {
    const watchList = farmers.filter((f) => f.riskLevel === 'watch');
    const criticalList = farmers.filter((f) => f.riskLevel === 'critical');
    const readyList = farmers.filter((f) => isReadyToReleaseLoan(f));
    const totalExposedThb = [...watchList, ...criticalList].reduce(
      (sum, f) => sum + f.loanLimitThb,
      0
    );
    const lines = farmers
      .slice(0, 8)
      .map(
        (f) =>
          `- ${f.farmerName} (${f.cropType}, ${f.province}): NASA ${f.nasaHealthScore}/100, risk=${f.riskLevel}, limit=฿${f.loanLimitThb.toLocaleString('en-US')}, tranche=${f.currentTranche}/${f.totalTranches}, status=${f.loanStatus}`
      )
      .join('\n');
    return [
      `Total plots: ${farmers.length}, Ready: ${readyList.length}, Watch: ${watchList.length}, Critical: ${criticalList.length}`,
      `Watch+Critical Exposed Loan: ฿${totalExposedThb.toLocaleString('en-US')}, Policy Min Score: ${minHealthScore}`,
      `Farmers:\n${lines}`,
    ].join('\n');
  }

  return [
    `Plot: ${plot.name} (${plot.cropType}, ${plot.areaRai} ไร่, ${plot.province})`,
    `NASA Health Score: ${evaluation.healthScore}/100 (${evaluation.riskLabelTh})`,
    `7-Day Warning: ${evaluation.earlyWarning.titleTh} — ${evaluation.earlyWarning.messageTh}`,
    `Action Advice: ${evaluation.earlyWarning.actionSummaryTh}`,
    `Pre-approved Credit Limit: ฿${plot.preApprovedCreditLimitThb.toLocaleString('en-US')}, Parametric Coverage: ฿${plot.parametricCoverageThb.toLocaleString('en-US')}`,
  ].join('\n');
}

const TH_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const EN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatThaiBuddhistDateTime(
  date: Date = new Date(),
  lang: AppLanguage = 'th'
): string {
  const day = date.getDate();
  const monthIdx = date.getMonth();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  if (lang === 'en') {
    return `${EN_MONTHS_SHORT[monthIdx]} ${day}, ${date.getFullYear()}, ${hours}:${mins}`;
  }
  const beYear = date.getFullYear() + 543;
  return `${day} ${TH_MONTHS_SHORT[monthIdx]} ${beYear}, ${hours}:${mins} น.`;
}

export function getDaysUntilRepayment(record: FarmerLoanRecord): number {
  if (typeof record.daysUntilRepayment === 'number') {
    return Math.max(0, Math.round(record.daysUntilRepayment));
  }
  return 30;
}

export function getRepaymentCountdownMeta(
  days: number,
  lang: AppLanguage
): {
  compactLabel: string;
  highlightLabel: string;
  tone: 'red' | 'amber' | 'emerald';
  isNearDue: boolean;
} {
  const isTh = lang === 'th';
  const safeDays = Math.max(0, Math.round(days));
  if (safeDays <= 7) {
    return {
      compactLabel: isTh ? `เหลือ ${safeDays} วัน` : `${safeDays}d left`,
      highlightLabel: isTh
        ? `นับถอยหลัง: เหลืออีก ${safeDays} วัน (ครบกำหนดด่วน)`
        : `Countdown: ${safeDays} days remaining (Urgent due)`,
      tone: 'red',
      isNearDue: true,
    };
  }
  if (safeDays <= 15) {
    return {
      compactLabel: isTh ? `เหลือ ${safeDays} วัน` : `${safeDays}d left`,
      highlightLabel: isTh
        ? `นับถอยหลัง: เหลืออีก ${safeDays} วัน (ใกล้ครบกำหนด)`
        : `Countdown: ${safeDays} days remaining (Due soon)`,
      tone: 'amber',
      isNearDue: true,
    };
  }
  return {
    compactLabel: isTh ? `เหลือ ${safeDays} วัน` : `${safeDays}d left`,
    highlightLabel: isTh
      ? `นับถอยหลัง: เหลืออีก ${safeDays} วัน`
      : `Countdown: ${safeDays} days remaining`,
    tone: 'emerald',
    isNearDue: false,
  };
}

export function getFarmerTrancheSchedule(
  record: FarmerLoanRecord
): TrancheScheduleItem[] {
  if (record.trancheSchedule && record.trancheSchedule.length > 0) {
    return record.trancheSchedule;
  }
  const perTranche = Math.round(
    record.loanLimitThb / Math.max(1, record.totalTranches)
  );
  return Array.from({ length: record.totalTranches }, (_, idx) => {
    const trancheNumber = idx + 1;
    const isApproved = trancheNumber <= record.currentTranche;
    const isHeld =
      !isApproved &&
      trancheNumber === record.currentTranche + 1 &&
      record.loanStatus === 'ชะลอวงเงินชั่วคราว';
    const isNextPending =
      !isApproved && !isHeld && trancheNumber === record.currentTranche + 1;

    return {
      trancheNumber,
      labelTh:
        trancheNumber === 1
          ? 'งวดที่ 1 · เตรียมดินและปัจจัยผลิต'
          : trancheNumber === 2
            ? 'งวดที่ 2 · ระบบน้ำและบำรุงพืช'
            : `งวดที่ ${trancheNumber} · เก็บเกี่ยวและจำหน่าย`,
      labelEn:
        trancheNumber === 1
          ? 'Tranche 1 · Prep & Inputs'
          : trancheNumber === 2
            ? 'Tranche 2 · Irrigation & Care'
            : `Tranche ${trancheNumber} · Harvest & Sale`,
      amountThb: perTranche,
      status: isApproved
        ? 'approved'
        : isHeld
          ? 'held'
          : isNextPending
            ? 'pending'
            : 'scheduled',
      timestampLabel: isApproved
        ? '10 พ.ย. 2569, 10:30 น.'
        : isHeld
          ? 'ชะลอตรวจติดตามความชื้น'
          : 'กำหนดพิจารณา: 20 พ.ย. 2569, 09:30 น.',
    };
  });
}

export function applyScenarioToBaacFarmers(
  farmers: FarmerLoanRecord[],
  scenario: ScenarioType
): FarmerLoanRecord[] {
  if (scenario === 'normal') return farmers;

  return farmers.map((record) => {
    if (scenario === 'drought') {
      const drop = record.riskLevel === 'critical' ? 14 : 18;
      const nextScore = Math.max(32, record.nasaHealthScore - drop);
      const nextRisk: FarmerLoanRecord['riskLevel'] =
        nextScore < 62 ? 'critical' : nextScore < 80 ? 'watch' : 'low';
      return {
        ...record,
        nasaHealthScore: nextScore,
        riskLevel: nextRisk,
        riskStatus7DayTh:
          nextRisk === 'critical'
            ? 'จำลองแล้ง 7 วัน: ความชื้นดินวิกฤต ต่ำกว่า 30% ใน 3 วัน'
            : 'จำลองแล้ง 7 วัน: เฝ้าระวังความชื้นผิวดินลดลงต่อเนื่อง',
      };
    }

    // flood scenario
    const drop = record.riskLevel === 'critical' ? 12 : 16;
    const nextScore = Math.max(35, record.nasaHealthScore - drop);
    const nextRisk: FarmerLoanRecord['riskLevel'] =
      nextScore < 64 ? 'critical' : nextScore < 82 ? 'watch' : 'low';
    return {
      ...record,
      nasaHealthScore: nextScore,
      riskLevel: nextRisk,
      riskStatus7DayTh:
        nextRisk === 'critical'
          ? 'จำลองน้ำท่วม 7 วัน: ฝนสะสมสูงมาก เสี่ยงน้ำขังและรากเน่า'
          : 'จำลองน้ำท่วม 7 วัน: เฝ้าระวังฝนตกหนัก ตรวจทางระบายน้ำ',
    };
  });
}

export function filterBaacCompactList(
  farmers: FarmerLoanRecord[],
  filterMode: BaacCompactFilterMode,
  searchQuery: string = ''
): FarmerLoanRecord[] {
  const q = searchQuery.trim().toLowerCase();
  return farmers.filter((record) => {
    if (
      filterMode === 'risk7d' &&
      record.riskLevel !== 'watch' &&
      record.riskLevel !== 'critical'
    ) {
      return false;
    }
    if (filterMode === 'due-soon' && getDaysUntilRepayment(record) > 15) {
      return false;
    }
    if (!q) return true;
    return (
      record.farmerName.toLowerCase().includes(q) ||
      record.province.toLowerCase().includes(q) ||
      (record.districtName ?? '').toLowerCase().includes(q) ||
      record.cropType.toLowerCase().includes(q) ||
      record.cooperativeName.toLowerCase().includes(q)
    );
  });
}

export function buildBaacSmsDraft(
  record: FarmerLoanRecord,
  lang: AppLanguage
): string {
  const days = getDaysUntilRepayment(record);
  const dueTh = record.repaymentDueLabelTh ?? '15 มี.ค. 2570, 16:00 น.';
  const dueEn = record.repaymentDueLabelEn ?? 'Mar 15, 2027, 16:00';
  const nextTranche = Math.min(record.totalTranches, record.currentTranche + 1);
  const perTranche = Math.round(
    record.loanLimitThb / Math.max(1, record.totalTranches)
  );

  if (lang === 'en') {
    const riskAdvice =
      record.riskLevel === 'critical'
        ? `URGENT: NASA soil score is ${record.nasaHealthScore}/100. Please activate backup water/drainage immediately and review Parametric Shield.`
        : record.riskLevel === 'watch'
          ? `7-Day Alert: NASA score ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}). Plan irrigation ahead of mid-week stress.`
          : `Good news: Plot NASA score is ${record.nasaHealthScore}/100 (Low risk). Eligible for Tranche #${nextTranche} (฿${perTranche.toLocaleString('en-US')}).`;
    return `[BAAC CropShield] Dear ${record.farmerName}, ${riskAdvice} Next repayment due: ${dueEn} (${days} days left). Contact your BAAC officer if you need support.`;
  }

  const riskAdviceTh =
    record.riskLevel === 'critical'
      ? `เตือนภัยด่วน: ดาวเทียม NASA พบความเสี่ยงสูง (คะแนน ${record.nasaHealthScore}/100 · ${record.riskStatus7DayTh}) กรุณาเร่งจัดการน้ำในแปลงและติดต่อสาขาเพื่อเปิดความคุ้มครองประกันภัย`
      : record.riskLevel === 'watch'
        ? `เตือนล่วงหน้า 7 วัน: แปลง${record.cropType} คะแนน NASA ${record.nasaHealthScore}/100 (${record.riskStatus7DayTh}) แนะนำเตรียมเปิดน้ำ/ดูแลแปลงล่วงหน้า เพื่อรักษาสิทธิ์เบิกงวดที่ ${nextTranche} (฿${perTranche.toLocaleString('en-US')})`
        : `แจ้งสถานะแปลงปกติ: แปลง${record.cropType} คะแนน NASA ${record.nasaHealthScore}/100 อยู่ในเกณฑ์ดี พร้อมพิจารณาปล่อยงวดที่ ${nextTranche} (฿${perTranche.toLocaleString('en-US')})`;

  return `[ธ.ก.ส. CropShield] เรียนคุณ${record.farmerName} ${riskAdviceTh} กำหนดชำระคืนงวดถัดไป ${dueTh} (เหลืออีก ${days} วัน) หากต้องการเลื่อนหรือปรับแผนติดต่อเจ้าหน้าที่สาขาได้ครับ`;
}

export function buildBaacOfficerMascotTip(
  farmers: FarmerLoanRecord[],
  lang: AppLanguage
): string {
  const atRiskCount = farmers.filter(
    (f) => f.riskLevel === 'watch' || f.riskLevel === 'critical'
  ).length;
  const nearDueCount = farmers.filter(
    (f) => getDaysUntilRepayment(f) <= 15
  ).length;

  if (lang === 'en') {
    if (atRiskCount > 0) {
      return `${atRiskCount} plots on the map show 7-day risk${nearDueCount > 0 ? ` and ${nearDueCount} are nearing repayment` : ''}—try "AI Draft SMS" to notify farmers early.`;
    }
    return `All ${farmers.length} plots look stable today—ready for streamlined tranche approvals.`;
  }

  if (atRiskCount > 0) {
    return `มี ${atRiskCount} แปลงในแผนที่เสี่ยงใน 7 วันนี้${nearDueCount > 0 ? ` (${nearDueCount} รายใกล้ครบกำหนดคืน)` : ''} แนะนำกด AI ร่าง SMS ล่วงหน้าครับ`;
  }
  return `วันนี้แปลงในพอร์ตทั้ง ${farmers.length} รายอยู่ในเกณฑ์ปกติ พร้อมพิจารณาปล่อยงวดสินเชื่อได้เลยครับ`;
}

