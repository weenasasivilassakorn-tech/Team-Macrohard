import React from 'react';
import { ArrowRight, Satellite, ShieldCheck } from 'lucide-react';
import type { AppLanguage } from '../types/cropshield';

interface SplashLoaderScreenProps {
  lang: AppLanguage;
  onEnterApp: () => void;
}

export const SplashLoaderScreen: React.FC<SplashLoaderScreenProps> = ({
  lang,
  onEnterApp,
}) => {
  const isTh = lang === 'th';

  return (
    <div
      data-testid="app-splash-loader"
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-800 text-white"
    >
      {/* Ambient botanical light accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(167,243,208,0.16),_transparent_58%)]"
      />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center space-y-6">
        {/* Crisp white crest framing the uploaded CropShield logo on the green backdrop */}
        <div className="w-full max-w-[320px] rounded-3xl bg-white px-6 py-5 shadow-2xl border border-emerald-100/80 flex items-center justify-center">
          <img
            src="/assets/aistudio/IMG_3569_daf0d6e4.JPG"
            alt="CropShield Logo"
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[120px] object-contain select-none"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {isTh
              ? 'ระบบเตือนภัยแปลงเกษตรและสินเชื่ออัจฉริยะ'
              : 'Smart Farm Risk & Agricultural Credit Platform'}
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/95 leading-relaxed">
            {isTh
              ? 'กำลังเชื่อมข้อมูลดาวเทียม NASA และเซ็นเซอร์วัดความชื้นในแปลง...'
              : 'Connecting NASA satellite outlook and in-field soil sensors...'}
          </p>
        </div>

        {/* Smooth green progress indicator */}
        <div className="w-full max-w-xs space-y-2.5">
          <div className="h-2.5 w-full rounded-full bg-emerald-950/60 border border-white/15 overflow-hidden">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-200 animate-pulse" />
          </div>
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-emerald-100/90">
            <span className="inline-flex items-center gap-1.5">
              <Satellite className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              <span>NASA POWER</span>
            </span>
            <span aria-hidden="true" className="text-emerald-400/60">·</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              <span>{isTh ? 'มาตรฐาน ธ.ก.ส.' : 'BAAC Ready'}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="splash-enter-btn"
          onClick={onEnterApp}
          className="min-h-[48px] inline-flex items-center justify-center gap-2 px-7 py-3 text-base font-bold text-emerald-950 bg-white rounded-2xl shadow-lg hover:bg-emerald-50 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span>{isTh ? 'เข้าสู่ระบบใช้งาน' : 'Enter App'}</span>
          <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
