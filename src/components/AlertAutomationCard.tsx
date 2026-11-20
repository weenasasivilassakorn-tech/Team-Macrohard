import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
  Smartphone,
  Zap,
} from 'lucide-react';
import type {
  AlertChannel,
  AlertSubscriptionConfig,
  AppLanguage,
  FarmPlotProfile,
  PlotEvaluation,
} from '../types/cropshield';
import {
  formatAlertMessage,
  validateLineAccount,
  validateThaiPhoneNumber,
} from '../utils/alertNotifications';

interface AlertAutomationCardProps {
  lang: AppLanguage;
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  config: AlertSubscriptionConfig;
  onSaveConfig: (nextConfig: AlertSubscriptionConfig) => void;
  isSimulatedDrop: boolean;
  onSimulateRiskTransition: () => void;
  onResetSimulation: () => void;
}

export const AlertAutomationCard: React.FC<AlertAutomationCardProps> = ({
  lang,
  plot,
  evaluation,
  config,
  onSaveConfig,
  isSimulatedDrop,
  onSimulateRiskTransition,
  onResetSimulation,
}) => {
  const [draft, setDraft] = useState<AlertSubscriptionConfig>(config);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string>('');

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const needsLine = draft.channel === 'line' || draft.channel === 'both';
  const needsSms = draft.channel === 'sms' || draft.channel === 'both';

  const handleChannelChange = (channel: AlertChannel) => {
    setDraft((prev) => ({ ...prev, channel }));
    setPhoneError(null);
    setLineError(null);
    setSavedFeedback('');
  };

  const handleToggleEnabled = () => {
    const nextEnabled = !draft.enabled;
    const nextConfig = { ...draft, enabled: nextEnabled };
    setDraft(nextConfig);
    onSaveConfig(nextConfig);
    setSavedFeedback(
      lang === 'th'
        ? nextEnabled
          ? 'เปิดระบบแจ้งเตือนอัตโนมัติ LINE / SMS และป๊อปอัปฉุกเฉินแล้ว'
          : 'ปิดระบบแจ้งเตือนอัตโนมัติชั่วคราว'
        : nextEnabled
          ? 'LINE / SMS & Emergency Popup alerts enabled'
          : 'Auto-alerts paused'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawPhoneErr = needsSms ? validateThaiPhoneNumber(draft.phoneNumber) : null;
    const nextPhoneError =
      rawPhoneErr && lang === 'en'
        ? 'Please enter a valid 10-digit Thai mobile number (e.g., 081-234-5678).'
        : rawPhoneErr;
    const rawLineErr = needsLine ? validateLineAccount(draft.lineAccountLabel) : null;
    const nextLineError =
      rawLineErr && lang === 'en'
        ? 'Please enter a valid LINE Official ID (e.g., @CropShield-Somchai).'
        : rawLineErr;

    setPhoneError(nextPhoneError);
    setLineError(nextLineError);

    if (nextPhoneError || nextLineError) {
      setSavedFeedback('');
      return;
    }

    onSaveConfig(draft);
    setSavedFeedback(
      lang === 'th'
        ? 'บันทึกการตั้งค่าช่องทาง LINE / SMS เรียบร้อยแล้ว'
        : 'LINE / SMS alert preferences saved.'
    );
  };

  const previewLineText = formatAlertMessage(plot, evaluation, 'low', 'line');

  return (
    <section
      id="line-sms-alerts"
      aria-labelledby="alert-automation-heading"
      className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <Bell className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="alert-automation-heading"
              className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
            >
              {lang === 'th'
                ? 'ระบบแจ้งเตือนฉุกเฉินอัตโนมัติ (LINE / SMS / Pop-up)'
                : 'Emergency Risk Alerts (LINE / SMS / Pop-up)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {lang === 'th'
                ? 'เด้งป๊อปอัปแจ้งเตือนในแอปทันที พร้อมส่งข้อความเข้า LINE และ SMS ของคุณอัตโนมัติเมื่อแปลงเข้าสู่ภาวะเสี่ยง'
                : 'Triggers an instant in-app emergency pop-up and sends alerts directly to your LINE & SMS when risk escalates.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={draft.enabled}
          onClick={handleToggleEnabled}
          className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            draft.enabled
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
              : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {lang === 'th'
            ? draft.enabled
              ? 'สถานะ: เปิดอัตโนมัติ'
              : 'สถานะ: ปิดอยู่'
            : draft.enabled
              ? 'Status: Auto ON'
              : 'Status: Paused'}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              {lang === 'th' ? 'เลือกช่องทางรับการแจ้งเตือน' : 'Select Alert Channel'}
            </span>
            <div
              className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl"
              role="group"
              aria-label={lang === 'th' ? 'ช่องทางแจ้งเตือน' : 'Alert channels'}
            >
              {(
                [
                  { id: 'both', label: 'LINE + SMS' },
                  { id: 'line', label: lang === 'th' ? 'เฉพาะ LINE' : 'LINE Only' },
                  { id: 'sms', label: lang === 'th' ? 'เฉพาะ SMS' : 'SMS Only' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleChannelChange(option.id)}
                  className={`min-h-[40px] py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    draft.channel === option.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {needsLine && (
              <div>
                <label
                  htmlFor="alert-line-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {lang === 'th'
                    ? 'บัญชี LINE Official / LINE Notify'
                    : 'LINE Official / Notify ID'}
                </label>
                <div className="relative">
                  <MessageSquare
                    className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="alert-line-input"
                    type="text"
                    value={draft.lineAccountLabel}
                    onChange={(e) => {
                      setDraft((prev) => ({
                        ...prev,
                        lineAccountLabel: e.target.value,
                      }));
                      setLineError(null);
                      setSavedFeedback('');
                    }}
                    placeholder="@CropShield-Somchai"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {lineError && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {lineError}
                  </p>
                )}
              </div>
            )}

            {needsSms && (
              <div>
                <label
                  htmlFor="alert-phone-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {lang === 'th'
                    ? 'เบอร์โทรศัพท์มือถือสำหรับรับ SMS ฉุกเฉิน'
                    : 'Mobile Phone for Emergency SMS'}
                </label>
                <div className="relative">
                  <Smartphone
                    className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="alert-phone-input"
                    type="tel"
                    value={draft.phoneNumber}
                    onChange={(e) => {
                      setDraft((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }));
                      setPhoneError(null);
                      setSavedFeedback('');
                    }}
                    placeholder="081-234-5678"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>
            )}
          </div>

          {savedFeedback && (
            <div
              data-testid="alert-config-saved"
              className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>{savedFeedback}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <button
              type="submit"
              className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors whitespace-nowrap"
            >
              <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {lang === 'th' ? 'บันทึกการตั้งค่าแจ้งเตือน' : 'Save Alert Settings'}
              </span>
            </button>

            {!isSimulatedDrop ? (
              <button
                type="button"
                data-testid="test-emergency-alert-btn"
                onClick={onSimulateRiskTransition}
                className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <Zap className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'th'
                    ? 'ทดสอบป๊อปอัปแจ้งเตือนฉุกเฉิน'
                    : 'Test Emergency Alert Pop-up'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetSimulation}
                className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'คืนค่าสถานะเดิม' : 'Reset Scenario'}</span>
              </button>
            )}
          </div>
        </form>

        {/* Compact Emergency Pop-up & Channel Summary */}
        <div className="lg:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {lang === 'th'
                  ? 'การแจ้งเตือนฉุกเฉินแบบ Pop-up + LINE / SMS'
                  : 'Real-Time Pop-up + LINE / SMS Dispatch'}
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                {lang === 'th'
                  ? 'ข้อความแจ้งเตือนจริงจะส่งตรงเข้า LINE และ SMS ของท่านโดยอัตโนมัติ พร้อมเด้งหน้าต่าง Pop-up ฉุกเฉินบนหน้าจอทันที'
                  : 'Alerts deliver straight to your LINE & SMS while triggering an immediate in-app emergency pop-up.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-emerald-800 mb-1">
              {lang === 'th' ? 'รูปแบบข้อความที่จะส่ง' : 'Alert Message Template'} ({config.lineAccountLabel})
            </div>
            <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {previewLineText}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
