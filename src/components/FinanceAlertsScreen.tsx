import React, { useState } from 'react';
import {
  CheckCircle2,
  FileDown,
  FileText,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type {
  AlertSubscriptionConfig,
  AppLanguage,
  CreditApplicationRecord,
  CreditApplicationState,
  FarmPlotProfile,
  ParametricShieldState,
  PlotEvaluation,
} from '../types/cropshield';
import { APP_COPY } from '../utils/i18n';
import { AlertAutomationCard } from './AlertAutomationCard';

interface FinanceAlertsScreenProps {
  lang: AppLanguage;
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  creditState: CreditApplicationState;
  creditHistory: CreditApplicationRecord[];
  shieldState: ParametricShieldState;
  onOpenCreditModal: () => void;
  onOpenShieldModal: () => void;
  onDownloadCreditReceipt: (record: CreditApplicationRecord) => Promise<void>;
  alertConfig: AlertSubscriptionConfig;
  onSaveAlertConfig: (nextConfig: AlertSubscriptionConfig) => void;
  isSimulatedDrop: boolean;
  onSimulateRiskTransition: () => void;
  onResetSimulation: () => void;
}

export const FinanceAlertsScreen: React.FC<FinanceAlertsScreenProps> = ({
  lang,
  plot,
  evaluation,
  creditState,
  creditHistory,
  shieldState,
  onOpenCreditModal,
  onOpenShieldModal,
  onDownloadCreditReceipt,
  alertConfig,
  onSaveAlertConfig,
  isSimulatedDrop,
  onSimulateRiskTransition,
  onResetSimulation,
}) => {
  const copy = APP_COPY[lang].finance;
  const isTh = lang === 'th';
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string>('');

  const latestPlotRecord = creditHistory.find((r) => r.plotId === plot.id);

  const handleDownload = async (record: CreditApplicationRecord) => {
    setDownloadingId(record.id);
    setDownloadNotice('');
    try {
      await onDownloadCreditReceipt(record);
      setDownloadNotice(
        isTh
          ? `ดาวน์โหลดใบเสร็จ PDF (${record.receiptNumber}) เรียบร้อยแล้ว`
          : `Downloaded receipt PDF (${record.receiptNumber})`
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="cs-fade-slide-up space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {copy.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{copy.subtitle}</p>
      </div>

      {/* Credit & Parametric Shield Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Wallet className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-mono tabular-nums text-lg font-bold text-emerald-700">
                ฿{plot.preApprovedCreditLimitThb.toLocaleString('en-US')}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {copy.creditCardTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {copy.creditCardDesc}
            </p>
            {creditState.status === 'submitted' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">
                    {isTh ? 'อนุมัติเบื้องต้นแล้ว' : 'Pre-Approved'} ฿
                    {creditState.requestedAmountThb.toLocaleString('en-US')} ·{' '}
                    {creditState.submittedAtLabel}
                  </span>
                </div>
                {latestPlotRecord && (
                  <button
                    type="button"
                    data-testid="latest-credit-receipt-pdf-btn"
                    disabled={downloadingId === latestPlotRecord.id}
                    onClick={() => void handleDownload(latestPlotRecord)}
                    className="min-h-[34px] inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100/70 transition-colors shrink-0"
                  >
                    {downloadingId === latestPlotRecord.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{isTh ? 'ใบเสร็จ PDF' : 'Receipt PDF'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="open-credit-modal-btn"
            onClick={onOpenCreditModal}
            className="min-h-[46px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
          >
            <Wallet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {creditState.status === 'submitted'
                ? isTh
                  ? 'ยื่นขอวงเงินเพิ่ม / ปรับรายการ'
                  : copy.adjustCreditBtn
                : copy.applyCreditBtn}
            </span>
          </button>
        </section>

        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              </div>
              <span className="font-mono tabular-nums text-lg font-bold text-slate-900">
                ฿{plot.parametricCoverageThb.toLocaleString('en-US')}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {copy.shieldCardTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {copy.shieldCardDesc}
            </p>
            {shieldState.active && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>
                  {copy.shieldActivatedBtn} · {shieldState.activatedAtLabel}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={shieldState.active}
            onClick={onOpenShieldModal}
            className={`min-h-[46px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors ${
              shieldState.active
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
                : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {shieldState.active ? copy.shieldActivatedBtn : copy.activateShieldBtn}
            </span>
          </button>
        </section>
      </div>

      {/* Pre-Approved Credit Approval History & PDF Receipts */}
      <section
        data-testid="credit-history-section"
        aria-labelledby="credit-history-heading"
        className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="credit-history-heading"
                className="text-base font-bold text-slate-900"
              >
                {isTh
                  ? 'ประวัติการยื่นและอนุมัติวงเงินสินเชื่อ (Pre-approved)'
                  : 'Pre-Approved Credit History & PDF Receipts'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTh
                  ? 'บันทึกทุกรายการที่ยื่นขอและอนุมัติสำเร็จ พร้อมดาวน์โหลดใบเสร็จรับรอง PDF ได้ทันที'
                  : 'Verified log of approved working-capital requests with downloadable official PDF receipts.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {creditHistory.length} {isTh ? 'รายการ' : 'records'}
          </span>
        </div>

        {downloadNotice && (
          <div
            role="status"
            className="flex items-center gap-2 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{downloadNotice}</span>
          </div>
        )}

        {creditHistory.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 text-center text-xs sm:text-sm text-slate-500">
            {isTh
              ? 'ยังไม่มีรายการยื่นขอสินเชื่อที่บันทึกไว้ — กด "ตรวจสอบสิทธิ์ / ยื่นขอสินเชื่อ" ด้านบนเพื่อรับผลอนุมัติเบื้องต้นและใบเสร็จ PDF'
              : 'No credit requests recorded yet. Click "Check Eligibility / Apply Credit" above to submit and receive an instant PDF receipt.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {creditHistory.map((record) => {
              const plotTitle =
                !isTh && record.plotNameEn ? record.plotNameEn : record.plotName;
              const isBusy = downloadingId === record.id;

              return (
                <div
                  key={record.id}
                  data-testid="credit-history-row"
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {record.receiptNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        {isTh ? 'อนุมัติเบื้องต้นสำเร็จ' : 'Pre-Approved'}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                        {record.approvedAtLabel}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {plotTitle} ·{' '}
                      <span className="font-normal text-slate-600">
                        {record.purposeTh}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      NASA Score {record.nasaHealthScore}/100 · {record.farmerName}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/80">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-slate-500">
                        {isTh ? 'วงเงินที่อนุมัติ' : 'Approved Amount'}
                      </div>
                      <div className="text-base font-bold font-mono tabular-nums text-emerald-700">
                        ฿{record.requestedAmountThb.toLocaleString('en-US')}
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`credit-receipt-pdf-btn-${record.receiptNumber}`}
                      disabled={isBusy}
                      onClick={() => void handleDownload(record)}
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <FileDown className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                      )}
                      <span>{isTh ? 'ใบเสร็จ PDF' : 'Receipt PDF'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* LINE / SMS & Emergency Alert Settings (No Outbox History Log) */}
      <AlertAutomationCard
        lang={lang}
        plot={plot}
        evaluation={evaluation}
        config={alertConfig}
        onSaveConfig={onSaveAlertConfig}
        isSimulatedDrop={isSimulatedDrop}
        onSimulateRiskTransition={onSimulateRiskTransition}
        onResetSimulation={onResetSimulation}
      />
    </div>
  );
};
