import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  Globe,
  LogOut,
  MessageSquare,
  Save,
  ShieldAlert,
  Smartphone,
  User,
  UserCheck,
} from 'lucide-react';
import type {
  AlertChannel,
  AlertSubscriptionConfig,
  AppLanguage,
  RegisteredUserProfile,
} from '../types/cropshield';
import {
  type AccountProfileValidationErrors,
  validateAccountProfileUpdate,
} from '../utils/authAccounts';

interface AccountSettingsScreenProps {
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  user: RegisteredUserProfile;
  alertConfig: AlertSubscriptionConfig;
  emergencyPopupEnabled: boolean;
  onToggleEmergencyPopup: (enabled: boolean) => void;
  onUpdateAccountSettings: (updates: {
    fullName: string;
    phoneNumber: string;
    lineAccountLabel: string;
    branchName?: string;
    employeeCode?: string;
    alertChannel: AlertChannel;
    alertsEnabled: boolean;
  }) => void;
  onLogout: () => void;
}

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({
  lang,
  onChangeLang,
  user,
  alertConfig,
  emergencyPopupEnabled,
  onToggleEmergencyPopup,
  onUpdateAccountSettings,
  onLogout,
}) => {
  const isTh = lang === 'th';
  const isBaac = user.role === 'baac';

  const [fullName, setFullName] = useState(user.fullName);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);
  const [lineAccountLabel, setLineAccountLabel] = useState(
    alertConfig.lineAccountLabel || user.lineAccountLabel
  );
  const [branchName, setBranchName] = useState(user.branchName ?? '');
  const [employeeCode, setEmployeeCode] = useState(user.employeeCode ?? '');
  const [alertChannel, setAlertChannel] = useState<AlertChannel>(
    alertConfig.channel
  );
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(
    alertConfig.enabled
  );

  const [errors, setErrors] = useState<AccountProfileValidationErrors>({});
  const [savedBanner, setSavedBanner] = useState<string>('');

  useEffect(() => {
    setFullName(user.fullName);
    setPhoneNumber(user.phoneNumber);
    setLineAccountLabel(alertConfig.lineAccountLabel || user.lineAccountLabel);
    setBranchName(user.branchName ?? '');
    setEmployeeCode(user.employeeCode ?? '');
    setAlertChannel(alertConfig.channel);
    setAlertsEnabled(alertConfig.enabled);
    setErrors({});
  }, [user, alertConfig]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateAccountProfileUpdate(
      {
        fullName,
        phoneNumber,
        lineAccountLabel,
        branchName: isBaac ? branchName : undefined,
        employeeCode: isBaac ? employeeCode : undefined,
      },
      user.role ?? 'farmer',
      lang
    );

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSavedBanner('');
      return;
    }

    onUpdateAccountSettings({
      fullName,
      phoneNumber,
      lineAccountLabel,
      branchName: isBaac ? branchName : undefined,
      employeeCode: isBaac ? employeeCode : undefined,
      alertChannel,
      alertsEnabled,
    });

    setSavedBanner(
      isTh
        ? 'บันทึกการตั้งค่าบัญชีและช่องทางแจ้งเตือนเรียบร้อยแล้ว'
        : 'Account and notification settings saved.'
    );
  };

  return (
    <div
      data-testid="account-settings-screen"
      className="cs-fade-slide-up max-w-3xl mx-auto space-y-4"
    >
      {/* Account Profile Header Card */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <UserCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                {isTh ? 'ตั้งค่าบัญชีผู้ใช้งาน' : 'Account Settings'}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700">
                {isBaac
                  ? isTh
                    ? 'เจ้าหน้าที่ ธ.ก.ส.'
                    : 'BAAC Officer'
                  : isTh
                    ? 'เกษตรกร'
                    : 'Farmer'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
              {user.fullName}
            </h2>
            <p className="text-xs font-mono tabular-nums text-slate-500 truncate">
              {user.phoneNumber} · {user.lineAccountLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="account-logout-btn"
          onClick={onLogout}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {isTh ? 'ออกจากระบบ / สลับบัญชี' : 'Sign Out / Switch Account'}
          </span>
        </button>
      </section>

      {/* Main Account & Notification Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isTh
                ? 'ข้อมูลบัญชีและการติดต่อ'
                : 'Profile & Contact Preferences'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTh
                ? 'อัปเดตชื่อ เบอร์มือถือ และบัญชี LINE สำหรับรับแจ้งเตือนและใบเสร็จสินเชื่อ'
                : 'Keep your name, mobile number, and LINE handle up to date for alerts and receipts.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="settings-fullname-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {isTh ? 'ชื่อ-นามสกุล' : 'Full Name'}
            </label>
            <div className="relative">
              <User
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="settings-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                  setSavedBanner('');
                }}
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-red-600 mt-1" role="alert">
                {errors.fullName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="settings-phone-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {isTh
                ? 'เบอร์โทรศัพท์มือถือ (SMS & พร้อมเพย์)'
                : 'Mobile Number (SMS & PromptPay)'}
            </label>
            <div className="relative">
              <Smartphone
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="settings-phone-input"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                  setSavedBanner('');
                }}
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-xs text-red-600 mt-1" role="alert">
                {errors.phoneNumber}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="settings-line-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {isTh
                ? 'บัญชี LINE Official / Notify'
                : 'LINE Official / Notify ID'}
            </label>
            <div className="relative">
              <MessageSquare
                className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="settings-line-input"
                type="text"
                value={lineAccountLabel}
                onChange={(e) => {
                  setLineAccountLabel(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    lineAccountLabel: undefined,
                  }));
                  setSavedBanner('');
                }}
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            {errors.lineAccountLabel && (
              <p className="text-xs text-red-600 mt-1" role="alert">
                {errors.lineAccountLabel}
              </p>
            )}
          </div>

          {isBaac && (
            <>
              <div>
                <label
                  htmlFor="settings-branch-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {isTh ? 'สาขา ธ.ก.ส. / พื้นที่รับผิดชอบ' : 'BAAC Branch'}
                </label>
                <div className="relative">
                  <Building2
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="settings-branch-input"
                    type="text"
                    value={branchName}
                    onChange={(e) => {
                      setBranchName(e.target.value);
                      setErrors((prev) => ({ ...prev, branchName: undefined }));
                      setSavedBanner('');
                    }}
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {errors.branchName && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {errors.branchName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="settings-empcode-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {isTh ? 'รหัสพนักงาน ธ.ก.ส.' : 'BAAC Employee Code'}
                </label>
                <input
                  id="settings-empcode-input"
                  type="text"
                  value={employeeCode}
                  onChange={(e) => {
                    setEmployeeCode(e.target.value);
                    setErrors((prev) => ({ ...prev, employeeCode: undefined }));
                    setSavedBanner('');
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {errors.employeeCode && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {errors.employeeCode}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* App & Alert Channel Preferences */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  {isTh ? 'ภาษาแอปพลิเคชัน' : 'App Language'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isTh
                    ? 'ใช้กับหน้าจอและเอกสาร PDF ที่ส่งออก'
                    : 'Applies to UI screens and exported PDFs'}
                </div>
              </div>
            </div>
            <div
              className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto"
              role="group"
              aria-label={isTh ? 'เลือกภาษา' : 'Select language'}
            >
              <button
                type="button"
                onClick={() => onChangeLang('th')}
                className={`min-h-[36px] px-3.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  lang === 'th'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ภาษาไทย
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`min-h-[36px] px-3.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  lang === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={alertsEnabled}
              onClick={() => {
                setAlertsEnabled((v) => !v);
                setSavedBanner('');
              }}
              className={`min-h-[54px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                alertsEnabled
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {isTh ? 'แจ้งเตือน LINE / SMS อัตโนมัติ' : 'Auto LINE / SMS Alerts'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {alertsEnabled
                      ? isTh
                        ? 'เปิดใช้งาน'
                        : 'Enabled'
                      : isTh
                        ? 'ปิดชั่วคราว'
                        : 'Paused'}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                  alertsEnabled
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {alertsEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={emergencyPopupEnabled}
              onClick={() => onToggleEmergencyPopup(!emergencyPopupEnabled)}
              className={`min-h-[54px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                emergencyPopupEnabled
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert
                  className="w-4 h-4 text-amber-700 shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {isTh ? 'ป๊อปอัปแจ้งเตือนฉุกเฉิน' : 'Emergency Alert Popup'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {emergencyPopupEnabled
                      ? isTh
                        ? 'เด้งเตือนทันทีเมื่อเสี่ยงสูง'
                        : 'Pop up immediately on risk'
                      : isTh
                        ? 'ปิดป๊อปอัปอัตโนมัติ'
                        : 'Muted'}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                  emergencyPopupEnabled
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {emergencyPopupEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isTh ? 'ช่องทางรับแจ้งเตือนหลัก' : 'Primary Notification Channel'}
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(
                [
                  { id: 'both', label: 'LINE + SMS' },
                  { id: 'line', label: isTh ? 'เฉพาะ LINE' : 'LINE Only' },
                  { id: 'sms', label: isTh ? 'เฉพาะ SMS' : 'SMS Only' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAlertChannel(opt.id);
                    setSavedBanner('');
                  }}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    alertChannel === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {savedBanner && (
          <div
            data-testid="account-settings-saved"
            role="status"
            className="flex items-center gap-2 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{savedBanner}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            data-testid="account-settings-save-btn"
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors"
          >
            <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {isTh ? 'บันทึกการตั้งค่าบัญชี' : 'Save Account Settings'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
