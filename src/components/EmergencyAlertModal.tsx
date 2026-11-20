import React, { useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  EmergencyAlertPopupState,
} from '../types/cropshield';
import { getRiskLabel } from '../utils/i18n';

interface EmergencyAlertModalProps {
  popup: EmergencyAlertPopupState | null;
  lang: AppLanguage;
  onClose: () => void;
  onOpenForecast: () => void;
  onOpenFinance: () => void;
}

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  popup,
  lang,
  onClose,
  onOpenForecast,
  onOpenFinance,
}) => {
  useEffect(() => {
    if (!popup) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [popup, onClose]);

  if (!popup) return null;

  const isTh = lang === 'th';
  const isCritical = popup.riskLevel === 'critical';
  const plotTitle = !isTh && popup.plotNameEn ? popup.plotNameEn : popup.plotName;
  const cropTitle = !isTh && popup.cropTypeEn ? popup.cropTypeEn : popup.cropType;

  return (
    <div
      data-testid="emergency-alert-popup"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-alert-title"
      aria-describedby="emergency-alert-message"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Urgent Header Banner */}
        <div
          className={`px-5 py-4 flex items-start justify-between gap-3 ${
            isCritical
              ? 'bg-red-600 text-white'
              : 'bg-amber-500 text-slate-950'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isCritical
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-950/10 text-slate-950'
              }`}
            >
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-90">
                <span>
                  {isTh
                    ? isCritical
                      ? 'แจ้งเตือนฉุกเฉินเร่งด่วน'
                      : 'แจ้งเตือนเฝ้าระวังความเสี่ยง'
                    : isCritical
                      ? 'CRITICAL EMERGENCY ALERT'
                      : 'RISK WATCH ALERT'}
                </span>
                <span className="font-mono">· {popup.timestampLabel}</span>
              </div>
              <h3
                id="emergency-alert-title"
                className="text-base sm:text-lg font-bold leading-snug mt-0.5"
              >
                {isTh ? popup.headlineTh : popup.headlineEn}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? 'ปิดหน้าต่างแจ้งเตือนฉุกเฉิน' : 'Close alert dialog'}
            className={`min-h-[38px] min-w-[38px] -mr-1 -mt-1 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
              isCritical
                ? 'text-white/90 hover:bg-white/20'
                : 'text-slate-900 hover:bg-slate-950/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {plotTitle}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {cropTitle} · {getRiskLabel(popup.riskLevel, lang)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`text-lg font-bold font-mono tabular-nums ${
                  isCritical ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                {popup.healthScore}/100
              </div>
              <div className="text-[10px] font-medium text-slate-500">
                {isTh ? 'คะแนนสุขภาพ' : 'Health Score'}
              </div>
            </div>
          </div>

          <p
            id="emergency-alert-message"
            className="text-sm text-slate-700 leading-relaxed"
          >
            {isTh ? popup.messageTh : popup.messageEn}
          </p>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
            <div className="font-bold text-emerald-900 mb-0.5">
              {isTh ? 'คำแนะนำเร่งด่วน:' : 'Recommended Action:'}
            </div>
            <p className="leading-relaxed">
              {isTh ? popup.actionHintTh : popup.actionHintEn}
            </p>
          </div>

          {popup.channelsSent.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
              <BellRing className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span className="leading-snug">
                {isTh
                  ? `ส่งแจ้งเตือนไปยัง ${popup.channelsSent.join(' และ ')} แล้ว`
                  : `Dispatched to ${popup.channelsSent.join(' & ')}`}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenForecast();
              }}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <CalendarClock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isTh ? 'ดูพยากรณ์ 7 วัน' : 'View 7-Day Forecast'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFinance();
              }}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isTh ? 'ขอสินเชื่อ / เปิดคุ้มครอง' : 'Credit / Parametric Shield'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            data-testid="emergency-popup-ack-btn"
            onClick={onClose}
            className="min-h-[42px] w-full text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {isTh ? 'รับทราบ' : 'Acknowledge'}
          </button>
        </div>
      </div>
    </div>
  );
};
