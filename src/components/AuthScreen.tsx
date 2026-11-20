import React, { useState } from 'react';
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Smartphone,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import farmBannerImg from '../assets/images/farmer_paddy_banner_1794665055048.jpg';
import type {
  AppLanguage,
  AuthAccount,
  BaacOfficerRegistrationInput,
  FarmerRegistrationInput,
} from '../types/cropshield';
import { SEED_ACCOUNTS, validateLoginInput } from '../utils/authAccounts';
import { APP_COPY } from '../utils/i18n';
import { RegisterSetupScreen } from './RegisterSetupScreen';

interface AuthScreenProps {
  lang: AppLanguage;
  initialTab?: 'login' | 'register';
  isRegistering: boolean;
  loginError: string;
  onClearLoginError: () => void;
  onLogin: (identifier: string, pin: string) => void;
  onQuickDemoLogin: (account: AuthAccount) => void;
  onRegisterFarmer: (input: FarmerRegistrationInput) => Promise<void>;
  onRegisterBaacOfficer: (input: BaacOfficerRegistrationInput) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  lang,
  initialTab = 'login',
  isRegistering,
  loginError,
  onClearLoginError,
  onLogin,
  onQuickDemoLogin,
  onRegisterFarmer,
  onRegisterBaacOfficer,
}) => {
  const copy = APP_COPY[lang].auth;
  const [authTab, setAuthTab] = useState<'login' | 'register'>(initialTab);
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; pin?: string }>(
    {}
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateLoginInput(identifier, pin, lang);
    setFieldErrors(errs);
    if (errs.identifier || errs.pin) return;
    onLogin(identifier, pin);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <section className="bg-white border border-emerald-900/10 rounded-3xl overflow-hidden shadow-xs">
        {/* Scenic Lush Green Farm Header with Uploaded CropShield Logo */}
        <div className="relative bg-emerald-900 text-white px-5 py-6 sm:px-7 sm:py-7 overflow-hidden">
          <img
            src={farmBannerImg}
            alt={
              lang === 'th'
                ? 'ทิวทัศน์ทุ่งนาและไร่เกษตรสีเขียว'
                : 'Lush green Thai agricultural farm landscape'
            }
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-emerald-950/92 via-emerald-900/85 to-emerald-800/65"
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="bg-white rounded-2xl px-4 py-2.5 shadow-md shrink-0 self-start sm:self-center">
              <img
                src="/assets/aistudio/IMG_3569_daf0d6e4.JPG"
                alt="CropShield Logo"
                referrerPolicy="no-referrer"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                {copy.heroTitle}
              </h1>
              <p className="text-sm sm:text-base text-emerald-100 mt-1 leading-relaxed">
                {copy.heroSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {/* Senior-Friendly Auth Mode Switcher: Sign In vs Register */}
          <div
            className="grid grid-cols-2 gap-1.5 p-1.5 bg-emerald-50/80 border border-emerald-900/10 rounded-2xl"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authTab === 'login'}
              data-testid="auth-tab-login"
              onClick={() => setAuthTab('login')}
              className={`min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl transition-colors whitespace-nowrap ${
                authTab === 'login'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-950/75 hover:text-emerald-950 hover:bg-white/70'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{copy.tabLogin}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={authTab === 'register'}
              data-testid="auth-tab-register"
              onClick={() => setAuthTab('register')}
              className={`min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl transition-colors whitespace-nowrap ${
                authTab === 'register'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-950/75 hover:text-emerald-950 hover:bg-white/70'
              }`}
            >
              <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{copy.tabRegister}</span>
            </button>
          </div>

          {authTab === 'login' ? (
            <div className="space-y-6 pt-1">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-sm font-bold text-slate-800 mb-1.5"
                  >
                    {copy.identifierLabel}
                  </label>
                  <div className="relative">
                    <Smartphone
                      className="w-5 h-5 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="login-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                        onClearLoginError();
                      }}
                      placeholder={copy.identifierPlaceholder}
                      className="w-full min-h-[50px] pl-11 pr-4 py-3 text-base border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                    />
                  </div>
                  {fieldErrors.identifier && (
                    <p className="text-sm text-red-700 font-medium mt-1.5" role="alert">
                      {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="login-pin"
                    className="block text-sm font-bold text-slate-800 mb-1.5"
                  >
                    {copy.pinLabel}
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="w-5 h-5 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="login-pin"
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, pin: undefined }));
                        onClearLoginError();
                      }}
                      placeholder={copy.pinPlaceholder}
                      className="w-full min-h-[50px] pl-11 pr-12 py-3 text-base font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      className="min-h-[50px] min-w-[48px] flex items-center justify-center absolute right-0 top-0 text-slate-600 hover:text-slate-900"
                    >
                      {showPin ? (
                        <EyeOff className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Eye className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.pin && (
                    <p className="text-sm text-red-700 font-medium mt-1.5" role="alert">
                      {fieldErrors.pin}
                    </p>
                  )}
                </div>

                {loginError && (
                  <div
                    data-testid="login-error-alert"
                    role="alert"
                    className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm font-medium text-red-800"
                  >
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="login-submit-btn"
                  className="min-h-[52px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-emerald-700 rounded-2xl hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{copy.loginBtn}</span>
                </button>
              </form>

              {/* Quick Demo Account Sign-In — large easy-to-tap cards */}
              <div className="pt-5 border-t border-emerald-900/10 space-y-3">
                <div className="text-sm font-bold text-slate-700">
                  {copy.quickDemoTitle}
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {SEED_ACCOUNTS.map((acc) => {
                    const isBaac = acc.role === 'baac';
                    const displayTitle =
                      acc.id === 'acc-somchai'
                        ? copy.demoFarmer1
                        : acc.id === 'acc-maliwan'
                          ? copy.demoFarmer2
                          : copy.demoBaac;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        data-testid={`demo-login-${acc.id}`}
                        onClick={() => onQuickDemoLogin(acc)}
                        className="min-h-[52px] w-full px-4 py-3 text-left bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-900/15 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isBaac ? (
                            <Building2 className="w-5 h-5 text-emerald-800 shrink-0" aria-hidden="true" />
                          ) : (
                            <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {displayTitle}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-mono tabular-nums text-emerald-900/75 pl-8 sm:pl-0 shrink-0">
                          {acc.phoneNumber} · PIN {acc.pin}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1 text-center text-sm text-slate-600">
                <span>{copy.switchToRegisterHint} </span>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className="font-bold text-emerald-700 hover:underline py-1.5 px-1"
                >
                  {copy.switchToRegisterLink}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <RegisterSetupScreen
                lang={lang}
                isSubmitting={isRegistering}
                onRegisterFarmer={onRegisterFarmer}
                onRegisterBaacOfficer={onRegisterBaacOfficer}
                embedded
              />
              <div className="text-center text-sm text-slate-600">
                <span>{copy.switchToLoginHint} </span>
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className="font-bold text-emerald-700 hover:underline py-1.5 px-1"
                >
                  {copy.switchToLoginLink}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
