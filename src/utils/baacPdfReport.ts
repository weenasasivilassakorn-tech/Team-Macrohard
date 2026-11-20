import type { BaacPortfolioKpis, FarmerLoanRecord } from '../types/cropshield';
import { evaluateTrancheReadiness, getRiskLabelTh } from './nasaPower';

export interface BaacPdfReportPayload {
  filename: string;
  documentTitleTh: string;
  subtitleTh: string;
  generatedAtLabel: string;
  farmerName: string;
  cooperativeName: string;
  province: string;
  cropType: string;
  areaRaiLabel: string;
  nasaHealthScoreLabel: string;
  riskLabelTh: string;
  riskStatus7DayTh: string;
  cashFlowSignalTh: string;
  contractFarmingPartner: string;
  loanLimitLabel: string;
  trancheProgressLabel: string;
  loanStatus: string;
  savedInspectionCostLabel: string;
  trancheHeadlineTh: string;
  trancheRecommendationTh: string;
  nextTrancheConditionTh: string;
  mitigationReasonsTh: string[];
  portfolioSummaryLineTh: string;
  officerActionTaken?: string;
}

export function buildBaacReportPayload(
  farmer: FarmerLoanRecord,
  kpis: BaacPortfolioKpis,
  now: Date = new Date()
): BaacPdfReportPayload {
  const trancheEval = evaluateTrancheReadiness(farmer);
  const safeId = farmer.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const generatedAtLabel = now.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    filename: `CropShield-BAAC-Risk-Report-${safeId || 'farmer'}.pdf`,
    documentTitleTh: 'รายงานสรุปการประเมินความเสี่ยงสินเชื่อเกษตร (CropShield x ธ.ก.ส.)',
    subtitleTh: 'เอกสารประกอบการพิจารณาอนุมัติสินเชื่อแบบทยอยเป็นงวดสำหรับคณะกรรมการสินเชื่อ',
    generatedAtLabel: `ออกรายงานเมื่อ: ${generatedAtLabel} น.`,
    farmerName: farmer.farmerName,
    cooperativeName: farmer.cooperativeName,
    province: `จ.${farmer.province}`,
    cropType: farmer.cropType,
    areaRaiLabel: `${farmer.areaRai.toLocaleString('th-TH')} ไร่`,
    nasaHealthScoreLabel: `${farmer.nasaHealthScore} / 100`,
    riskLabelTh: getRiskLabelTh(farmer.riskLevel),
    riskStatus7DayTh: farmer.riskStatus7DayTh,
    cashFlowSignalTh: farmer.cashFlowSignalTh,
    contractFarmingPartner: farmer.contractFarmingPartner,
    loanLimitLabel: `฿${farmer.loanLimitThb.toLocaleString('th-TH')}`,
    trancheProgressLabel: `งวดที่ ${farmer.currentTranche} จาก ${farmer.totalTranches}`,
    loanStatus: farmer.loanStatus,
    savedInspectionCostLabel: `฿${farmer.savedInspectionCostThb.toLocaleString('th-TH')}`,
    trancheHeadlineTh: trancheEval.headlineTh,
    trancheRecommendationTh: trancheEval.recommendationTh,
    nextTrancheConditionTh: farmer.nextTrancheConditionTh,
    mitigationReasonsTh: [...farmer.mitigationReasonsTh],
    portfolioSummaryLineTh: `ภาพรวมพอร์ตที่เชื่อมข้อมูล NASA: ${kpis.connectedPlotsCount} แปลง (${kpis.totalAreaRai.toLocaleString('th-TH')} ไร่) · คาดการณ์ลดหนี้เสีย (NPL) -${kpis.estimatedNplReductionPercent}% · ประหยัดค่าตรวจแปลงรวม ฿${kpis.savedFieldInspectionCostThb.toLocaleString('th-TH')}`,
    officerActionTaken: farmer.officerActionTaken,
  };
}

/**
 * Segments Thai & mixed Latin text cleanly using Intl.Segmenter when available
 * and wraps lines to fit within maxWidth based on the provided measureFn.
 */
export function wrapTextByMeasure(
  text: string,
  maxWidth: number,
  measureFn: (candidate: string) => number
): string[] {
  if (!text.trim()) return [''];

  let tokens: string[];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    tokens = Array.from(segmenter.segment(text), (s) => s.segment);
  } else {
    tokens = text.split(/(\s+)/);
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const candidate = currentLine + token;
    if (measureFn(candidate) <= maxWidth || currentLine === '') {
      currentLine = candidate;
    } else {
      lines.push(currentLine.trimEnd());
      currentLine = token.trimStart();
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trimEnd());
  }

  return lines.length > 0 ? lines : [''];
}
