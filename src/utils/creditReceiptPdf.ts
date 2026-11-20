import type {
  AppLanguage,
  CreditApplicationRecord,
  FarmPlotProfile,
  PlotEvaluation,
  RegisteredUserProfile,
} from '../types/cropshield';
import { getRiskLabel } from './i18n';

export function generateCreditReceiptNumber(
  existingCount: number,
  now: Date = new Date()
): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(existingCount + 1).padStart(3, '0');
  return `CS-CR-${yyyy}${mm}${dd}-${seq}`;
}

export function buildCreditApplicationRecord(params: {
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  user: RegisteredUserProfile;
  amountThb: number;
  purposeTh: string;
  existingCount: number;
  lang: AppLanguage;
  now?: Date;
}): CreditApplicationRecord {
  const now = params.now ?? new Date();
  const timeStr = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = now.toLocaleDateString(
    params.lang === 'th' ? 'th-TH' : 'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );
  const receiptNumber = generateCreditReceiptNumber(params.existingCount, now);

  return {
    id: `cr-${now.getTime()}-${params.existingCount + 1}`,
    receiptNumber,
    plotId: params.plot.id,
    plotName: params.plot.name,
    plotNameEn: params.plot.nameEn,
    cropType: params.plot.cropType,
    cropTypeEn: params.plot.cropTypeEn,
    areaRai: params.plot.areaRai,
    province: params.plot.province,
    provinceEn: params.plot.provinceEn,
    farmerName: params.user.fullName,
    phoneNumber: params.user.phoneNumber,
    requestedAmountThb: params.amountThb,
    purposeTh: params.purposeTh,
    nasaHealthScore: params.evaluation.healthScore,
    riskLevel: params.evaluation.riskLevel,
    status: 'approved',
    approvedAtLabel:
      params.lang === 'th'
        ? `${dateStr} · ${timeStr} น.`
        : `${dateStr} · ${timeStr}`,
    timestampMs: now.getTime(),
  };
}

export interface CreditReceiptPdfPayload {
  lang: AppLanguage;
  filename: string;
  brandHeaderTag: string;
  documentTitle: string;
  subtitle: string;
  receiptNumber: string;
  statusBadgeLabel: string;
  approvedAtLabel: string;
  farmerName: string;
  phoneNumber: string;
  plotName: string;
  cropType: string;
  areaRaiLabel: string;
  provinceLabel: string;
  requestedAmountLabel: string;
  purposeLabel: string;
  nasaScoreLabel: string;
  riskLabel: string;
  collateralVerificationNote: string;
  disbursementNote: string;
  footerNote: string;
}

export function buildCreditReceiptPdfPayload(
  record: CreditApplicationRecord,
  lang: AppLanguage
): CreditReceiptPdfPayload {
  const isTh = lang === 'th';
  const plotTitle = isTh
    ? record.plotName
    : record.plotNameEn ?? record.plotName;
  const cropTitle = isTh
    ? record.cropType
    : record.cropTypeEn ?? record.cropType;
  const provinceTitle = isTh
    ? record.province
    : record.provinceEn ?? record.province;

  const formattedAmount = `฿${record.requestedAmountThb.toLocaleString('en-US')}`;

  return {
    lang,
    filename: `CropShield-Credit-Receipt-${record.receiptNumber}.pdf`,
    brandHeaderTag: isTh
      ? 'ใบเสร็จยืนยันการอนุมัติวงเงินสินเชื่อ · ธ.ก.ส. × NASA'
      : 'PRE-APPROVED CREDIT RECEIPT · BAAC × NASA',
    documentTitle: isTh
      ? 'ใบเสร็จรับรองการยื่นขอและอนุมัติวงเงินสินเชื่อหมุนเวียน'
      : 'Pre-Approved Working Capital Credit Approval Receipt',
    subtitle: isTh
      ? 'เอกสารอิเล็กทรอนิกส์ยืนยันผลการอนุมัติเบื้องต้นด้วยคะแนนสุขภาพแปลงจากดาวเทียม NASA'
      : 'Official digital receipt confirming satellite-verified working capital approval',
    receiptNumber: record.receiptNumber,
    statusBadgeLabel: isTh
      ? 'อนุมัติเบื้องต้นสำเร็จ (PRE-APPROVED)'
      : 'PRE-APPROVED · COMPLETED',
    approvedAtLabel: record.approvedAtLabel,
    farmerName: record.farmerName,
    phoneNumber: record.phoneNumber,
    plotName: plotTitle,
    cropType: cropTitle,
    areaRaiLabel: `${record.areaRai} ${isTh ? 'ไร่' : 'Rai'}`,
    provinceLabel: provinceTitle,
    requestedAmountLabel: formattedAmount,
    purposeLabel: record.purposeTh,
    nasaScoreLabel: `${record.nasaHealthScore}/100`,
    riskLabel: getRiskLabel(record.riskLevel, lang),
    collateralVerificationNote: isTh
      ? `ระบบ CropShield ตรวจรับรองความน่าเชื่อถือแปลง "${plotTitle}" ด้วยข้อมูลดาวเทียม NASA POWER (คะแนน ${record.nasaHealthScore}/100) ใช้เป็น Data Collateral แทนการลงตรวจพื้นที่ภาคสนาม`
      : `CropShield verified "${plotTitle}" via NASA POWER satellite telemetry (${record.nasaHealthScore}/100) as Data Collateral, waiving physical field inspection.`,
    disbursementNote: isTh
      ? `วงเงินหมุนเวียนจำนวน ${formattedAmount} ได้รับการบันทึกเข้าคิวโอนเข้าบัญชีพร้อมเพย์/ธ.ก.ส. (${record.phoneNumber}) ภายใน 24 ชั่วโมง`
      : `Working capital of ${formattedAmount} has been queued for PromptPay/BAAC account disbursement (${record.phoneNumber}) within 24 hours.`,
    footerNote: isTh
      ? `อ้างอิงเลขที่ใบเสร็จ ${record.receiptNumber} · CropShield Satellite Credit Identity · เอกสารสร้างอัตโนมัติใช้ยื่นคู่สาขา ธ.ก.ส. ได้ทันที`
      : `Receipt Ref ${record.receiptNumber} · CropShield Satellite Credit Identity · Valid for BAAC partner branch verification`,
  };
}
