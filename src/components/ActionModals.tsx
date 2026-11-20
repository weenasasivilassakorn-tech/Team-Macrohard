import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileDown, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import type {
  AppLanguage,
  CreditApplicationRecord,
  FarmPlotProfile,
} from '../types/cropshield';
import { exportCreditReceiptPdf } from '../utils/creditReceiptPdfExporter';
import { BottomSheetModal } from './BottomSheetModal';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: FarmPlotProfile;
  healthScore: number;
  lang: AppLanguage;
  onSubmitCredit: (
    amountThb: number,
    purposeTh: string
  ) => CreditApplicationRecord;
}

export const CreditRequestModal: React.FC<CreditModalProps> = ({
  isOpen,
  onClose,
  plot,
  healthScore,
  lang,
  onSubmitCredit,
}) => {
  const [amount, setAmount] = useState<number>(plot.recommendedWorkingCapitalThb);
  const [purpose, setPurpose] = useState<string>(
    lang === 'th'
      ? 'เปิดระบบน้ำเสริมและค่าไฟฟ้า/น้ำมันสูบน้ำ'
      : 'Supplemental irrigation & water pump fuel'
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [approvedReceipt, setApprovedReceipt] =
    useState<CreditApplicationRecord | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  useEffect(() => {
    setAmount(plot.recommendedWorkingCapitalThb);
    setErrorMsg('');
  }, [plot]);

  useEffect(() => {
    if (!isOpen) {
      setApprovedReceipt(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  useEffect(() => {
    setPurpose(
      lang === 'th'
        ? 'เปิดระบบน้ำเสริมและค่าไฟฟ้า/น้ำมันสูบน้ำ'
        : 'Supplemental irrigation & water pump fuel'
    );
  }, [lang]);

  const plotTitle = lang === 'en' && plot.nameEn ? plot.nameEn : plot.name;
  const isTh = lang === 'th';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(amount) || amount < 1000) {
      setErrorMsg(
        isTh
          ? 'กรุณาระบุวงเงินขั้นต่ำ 1,000 บาท'
          : 'Minimum requested amount is ฿1,000.'
      );
      return;
    }
    if (amount > plot.preApprovedCreditLimitThb) {
      setErrorMsg(
        isTh
          ? `วงเงินเกินสิทธิ์อนุมัติเบื้องต้น (${plot.preApprovedCreditLimitThb.toLocaleString('th-TH')} บาท)`
          : `Exceeds pre-approved limit (฿${plot.preApprovedCreditLimitThb.toLocaleString('en-US')}).`
      );
      return;
    }
    const record = onSubmitCredit(amount, purpose);
    setApprovedReceipt(record);
  };

  const handleDownloadPdf = async () => {
    if (!approvedReceipt) return;
    setIsDownloadingPdf(true);
    try {
      await exportCreditReceiptPdf(approvedReceipt, lang);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        approvedReceipt
          ? isTh
            ? 'อนุมัติวงเงินสินเชื่อเบื้องต้นสำเร็จ'
            : 'Pre-Approved Credit Confirmed'
          : isTh
            ? 'ขอวงเงินสินเชื่อหมุนเวียน (Pre-approved)'
            : 'Pre-Approved Working Capital Request'
      }
      subtitle={`${plotTitle} · ${isTh ? 'คะแนน' : 'Score'} ${healthScore}/100`}
      icon={<Wallet className="w-5 h-5" aria-hidden="true" />}
      closeLabel={isTh ? 'ปิดหน้าต่างขอวงเงินสินเชื่อ' : 'Close credit modal'}
    >
      {approvedReceipt ? (
        <div data-testid="credit-approved-receipt-view" className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                {isTh
                  ? 'บันทึกคำขอและอนุมัติเบื้องต้นเรียบร้อยแล้ว'
                  : 'Credit Request Approved & Recorded'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 pt-1">
              <span className="text-xs text-emerald-800">
                {isTh ? 'เลขที่ใบเสร็จ' : 'Receipt No.'}:{' '}
                <strong className="font-mono">{approvedReceipt.receiptNumber}</strong>
              </span>
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
                ฿{approvedReceipt.requestedAmountThb.toLocaleString('en-US')}
              </span>
            </div>
            <p className="text-xs text-emerald-900/90 leading-relaxed">
              {approvedReceipt.purposeTh} · {approvedReceipt.approvedAtLabel}
            </p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {isTh
              ? 'รายการนี้ถูกบันทึกในประวัติสินเชื่อแล้ว ท่านสามารถดาวน์โหลดใบเสร็จรับรอง PDF เพื่อเก็บไว้เป็นหลักฐานหรือยื่นคู่กับ ธ.ก.ส. ได้ทันที'
              : 'This transaction is saved in your Pre-Approved Credit History. You may download the official PDF receipt below.'}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              data-testid="modal-download-credit-receipt-btn"
              disabled={isDownloadingPdf}
              onClick={() => void handleDownloadPdf()}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{isTh ? 'ดาวน์โหลดใบเสร็จ PDF' : 'Download Receipt PDF'}</span>
            </button>

            <button
              type="button"
              data-testid="modal-credit-done-btn"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
            >
              {isTh ? 'เสร็จสิ้น' : 'Done'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {isTh ? 'วงเงินอนุมัติเบื้องต้นสูงสุด' : 'Max Pre-Approved Limit'}
            </span>
            <span className="text-lg font-bold font-mono tabular-nums text-emerald-700">
              ฿{plot.preApprovedCreditLimitThb.toLocaleString('en-US')}
            </span>
          </div>

          <div>
            <label
              htmlFor="credit-amount-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {isTh
                ? 'จำนวนเงินที่ต้องการเบิกใช้ (บาท)'
                : 'Requested Amount (THB)'}
            </label>
            <input
              id="credit-amount-input"
              type="number"
              min={1000}
              max={plot.preApprovedCreditLimitThb}
              step={1000}
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setErrorMsg('');
              }}
              className="w-full min-h-[44px] px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
            <div className="flex flex-wrap gap-2 mt-2.5">
              {[
                10000,
                plot.recommendedWorkingCapitalThb,
                plot.preApprovedCreditLimitThb,
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmount(preset);
                    setErrorMsg('');
                  }}
                  className={`min-h-[40px] px-3.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border transition-colors ${
                    amount === preset
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ฿{preset.toLocaleString('en-US')}
                </button>
              ))}
            </div>
            {errorMsg && (
              <p className="text-xs text-red-600 mt-1.5" role="alert">
                {errorMsg}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="credit-purpose-select"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {isTh ? 'วัตถุประสงค์การใช้เงินทุน' : 'Loan Purpose'}
            </label>
            <select
              id="credit-purpose-select"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {isTh ? (
                <>
                  <option value="เปิดระบบน้ำเสริมและค่าไฟฟ้า/น้ำมันสูบน้ำ">
                    เปิดระบบน้ำเสริมและค่าไฟฟ้า/น้ำมันสูบน้ำ
                  </option>
                  <option value="ซื้อปุ๋ยบำรุงและสารลดความเครียดพืช">
                    ซื้อปุ๋ยบำรุงและสารลดความเครียดพืช
                  </option>
                  <option value="ค่าแรงดูแลแปลงและคลุมดินรักษาความชื้น">
                    ค่าแรงดูแลแปลงและคลุมดินรักษาความชื้น
                  </option>
                </>
              ) : (
                <>
                  <option value="Supplemental irrigation & water pump fuel">
                    Supplemental irrigation &amp; water pump fuel
                  </option>
                  <option value="Crop nutrients & heat-stress protection">
                    Crop nutrients &amp; heat-stress protection
                  </option>
                  <option value="Field labor, drainage & soil mulching">
                    Field labor, drainage &amp; soil mulching
                  </option>
                </>
              )}
            </select>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {isTh
              ? 'ธนาคาร ธ.ก.ส. ใช้คะแนนสุขภาพแปลงจากดาวเทียม NASA แทนการลงตรวจแปลง ทำให้สามารถโอนเงินทุนหมุนเวียนเข้าบัญชีพร้อมเพย์เกษตรกรได้ภายใน 24 ชั่วโมง'
              : 'BAAC uses your NASA satellite health score in place of field visits, enabling working capital disbursement within 24 hours.'}
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              data-testid="submit-credit-request-btn"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
            >
              {isTh ? 'ยืนยันขอวงเงินสินเชื่อ' : 'Submit Loan Request'}
            </button>
          </div>
        </form>
      )}
    </BottomSheetModal>
  );
};

interface InsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: FarmPlotProfile;
  lang: AppLanguage;
  onActivateShield: () => void;
}

export const ParametricShieldModal: React.FC<InsuranceModalProps> = ({
  isOpen,
  onClose,
  plot,
  lang,
  onActivateShield,
}) => {
  const plotTitle = lang === 'en' && plot.nameEn ? plot.nameEn : plot.name;
  const triggerText =
    lang === 'en' && plot.parametricTriggerEn
      ? plot.parametricTriggerEn
      : plot.parametricTriggerTh;

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        lang === 'th'
          ? 'เปิดใช้งานประกันภัยพืชผลอัตโนมัติ (Parametric Shield)'
          : 'Activate Parametric Shield Crop Insurance'
      }
      subtitle={`${plotTitle} · ${plot.areaRai} ${lang === 'th' ? 'ไร่' : 'Rai'}`}
      icon={<ShieldCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />}
      closeLabel={lang === 'th' ? 'ปิดหน้าต่างประกันภัยพืชผล' : 'Close insurance modal'}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">
              {lang === 'th' ? 'วงเงินคุ้มครองความเสียหาย' : 'Coverage Amount'}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
              ฿{plot.parametricCoverageThb.toLocaleString('en-US')}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">
              {lang === 'th' ? 'ค่าธรรมเนียมฤดูกาลนี้' : 'Seasonal Premium'}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-1">
              {lang === 'th' ? '฿350 / รอบ' : '฿350 / season'}
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="text-sm font-semibold text-slate-900">
            {lang === 'th'
              ? 'เงื่อนไขจ่ายชดเชยอัตโนมัติ (ไม่ต้องรอเจ้าหน้าที่สำรวจ)'
              : 'Automatic Satellite Payout Trigger (No Field Adjuster Wait)'}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {lang === 'th' ? (
              <>
                หากระบบดาวเทียมตรวจพบว่า <strong className="text-slate-900">{triggerText}</strong>{' '}
                ระบบจะโอนเงินชดเชยต้นทุนการให้น้ำและประคองผลผลิตเข้าบัญชี ธ.ก.ส. ของท่านโดยอัตโนมัติภายใน 48 ชั่วโมง
              </>
            ) : (
              <>
                When satellite data detects <strong className="text-slate-900">{triggerText}</strong>,
                compensation transfers automatically to your BAAC account within 48 hours.
              </>
            )}
          </p>
          <div className="flex items-start gap-2 text-xs text-emerald-800 pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {lang === 'th'
                ? 'ช่วยรักษาประวัติเครดิตทางการเกษตร ไม่เสียประวัติหนี้เสียแม้เกิดภัยแล้งกะทันหัน'
                : 'Protects your agricultural credit standing even during sudden weather shocks.'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              onActivateShield();
              onClose();
            }}
            className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
          >
            {lang === 'th' ? 'ยืนยันเปิดใช้งาน Parametric Shield' : 'Confirm & Activate Shield'}
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
};
