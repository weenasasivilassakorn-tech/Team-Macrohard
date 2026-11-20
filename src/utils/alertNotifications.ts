import type {
  AlertChannel,
  AlertDeliveryLogEntry,
  AlertSubscriptionConfig,
  FarmPlotProfile,
  PlotEvaluation,
  RiskLevel,
} from '../types/cropshield';
import { getRiskLabelTh } from './nasaPower';

export const DEFAULT_ALERT_CONFIG: AlertSubscriptionConfig = {
  enabled: true,
  channel: 'both',
  lineAccountLabel: '@CropShield-Somchai',
  phoneNumber: '081-234-5678',
  notifyOnWatch: true,
  notifyOnCritical: true,
};

export function normalizeThaiPhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

export function validateThaiPhoneNumber(phone: string): string | null {
  const digits = normalizeThaiPhone(phone);
  if (!digits) {
    return 'กรุณาระบุเบอร์โทรศัพท์มือถือสำหรับรับ SMS';
  }
  if (!/^0[689]\d{8}$/.test(digits)) {
    return 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ตัวอย่าง: 081-234-5678)';
  }
  return null;
}

export function validateLineAccount(lineAccount: string): string | null {
  const trimmed = lineAccount.trim();
  if (!trimmed) {
    return 'กรุณาระบุชื่อบัญชี LINE หรือรหัสเชื่อมต่อ LINE Notify';
  }
  if (trimmed.length < 3) {
    return 'ชื่อบัญชี LINE ต้องมีความยาวอย่างน้อย 3 ตัวอักษร';
  }
  return null;
}

const RISK_SEVERITY_ORDER: Record<RiskLevel, number> = {
  low: 0,
  watch: 1,
  critical: 2,
};

/**
 * Triggers automatic LINE/SMS notification when risk escalates
 * from Safe (low) -> Watch/Critical, or from Watch -> Critical.
 */
export function shouldTriggerRiskAlert(
  previousRisk: RiskLevel | null,
  nextRisk: RiskLevel,
  config: AlertSubscriptionConfig
): boolean {
  if (!config.enabled || !previousRisk) {
    return false;
  }
  if (RISK_SEVERITY_ORDER[nextRisk] <= RISK_SEVERITY_ORDER[previousRisk]) {
    return false;
  }
  if (nextRisk === 'watch') {
    return config.notifyOnWatch;
  }
  if (nextRisk === 'critical') {
    return config.notifyOnCritical;
  }
  return false;
}

export function formatAlertMessage(
  plot: FarmPlotProfile,
  evaluation: PlotEvaluation,
  previousRisk: RiskLevel,
  channel: Exclude<AlertChannel, 'both'>
): string {
  const prevLabel = getRiskLabelTh(previousRisk);
  const nextLabel = getRiskLabelTh(evaluation.riskLevel);

  if (channel === 'line') {
    return [
      `[CropShield แจ้งเตือนแปลงเกษตร]`,
      `แปลง: ${plot.name}`,
      `สถานะเปลี่ยน: ${prevLabel} -> ${nextLabel} (คะแนน ${evaluation.healthScore}/100)`,
      `สัญญาณ 7 วัน: ${evaluation.earlyWarning.messageTh}`,
      `คำแนะนำ: ${evaluation.earlyWarning.actionSummaryTh}`,
    ].join('\n');
  }

  return `CropShield: ${plot.name} ความเสี่ยงเปลี่ยนเป็น ${nextLabel} (${evaluation.healthScore}/100) ${evaluation.earlyWarning.actionSummaryTh}`;
}

export function createAlertLogEntries(
  plot: FarmPlotProfile,
  evaluation: PlotEvaluation,
  previousRisk: RiskLevel,
  config: AlertSubscriptionConfig,
  triggerType: 'auto-transition' | 'manual-test',
  now: Date = new Date()
): AlertDeliveryLogEntry[] {
  const timestampLabel = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const channelsToSend: Array<Exclude<AlertChannel, 'both'>> =
    config.channel === 'both' ? ['line', 'sms'] : [config.channel];

  return channelsToSend.map((ch, idx) => ({
    id: `alert-${now.getTime()}-${ch}-${idx}`,
    timestampLabel: `${timestampLabel} น.`,
    plotId: plot.id,
    plotName: plot.name,
    previousRisk,
    nextRisk: evaluation.riskLevel,
    healthScore: evaluation.healthScore,
    channel: ch,
    recipient: ch === 'line' ? config.lineAccountLabel : config.phoneNumber,
    messageText: formatAlertMessage(plot, evaluation, previousRisk, ch),
    triggerType,
  }));
}
