import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Banknote,
  BellRing,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Droplets,
  ExternalLink,
  FileDown,
  LogOut,
  MapPin,
  Satellite,
  Share2,
  ShieldCheck,
  Sprout,
  Zap,
} from 'lucide-react';
import farmBannerImg from '../assets/images/farmer_paddy_banner_1794665055048.jpg';
import type {
  AppLanguage,
  CreditApplicationState,
  FarmPlotProfile,
  ParametricShieldState,
  PlotEvaluation,
  RegisteredUserProfile,
  RiskLevel,
  ScenarioType,
} from '../types/cropshield';
import {
  buildFarmerDashboardSummary,
  buildShareableStatusPost,
} from '../utils/farmerDashboardSummary';
import { exportFarmerPlotSummaryPdf } from '../utils/farmerRiskPdfExporter';
import { APP_COPY } from '../utils/i18n';
import { computeIoTSensorReading, computeSoilHealthGrid } from '../utils/iotSoilSensor';
import { BottomSheetModal } from './BottomSheetModal';
import { NasaPowerMapPanel } from './NasaPowerMapPanel';
import { SoilHealthGridMap } from './SoilHealthGridMap';

interface HomeScreenProps {
  lang: AppLanguage;
  user: RegisteredUserProfile;
  plots: FarmPlotProfile[];
  selectedPlot: FarmPlotProfile;
  onSelectPlot: (plotId: string) => void;
  evaluation: PlotEvaluation;
  scenario: ScenarioType;
  onChangeScenario: (nextScenario: ScenarioType) => void;
  isUpdating: boolean;
  onRefreshNasa: () => void;
  onOpenForecastTab: () => void;
  onOpenCreditModal: () => void;
  onOpenShieldModal: () => void;
  creditState: CreditApplicationState;
  shieldState: ParametricShieldState;
  justRegisteredBanner: boolean;
  onDismissRegisteredBanner: () => void;
  onExportRiskPdf?: (filename: string) => void;
  onLogout?: () => void;
}

const HERO_STATUS_STYLE: Record<
  RiskLevel,
  {
    cardClass: string;
    iconBoxClass: string;
    badgeClass: string;
    scoreColorClass: string;
    badgeIcon: React.FC<{ className?: string }>;
  }
> = {
  low: {
    cardClass: 'bg-emerald-50/90 border-2 border-emerald-500 shadow-sm',
    iconBoxClass: 'bg-emerald-700 text-white shadow-xs',
    badgeClass: 'bg-emerald-700 text-white border border-emerald-800',
    scoreColorClass: 'text-emerald-950',
    badgeIcon: CheckCircle2,
  },
  watch: {
    cardClass: 'bg-amber-50/85 border-2 border-amber-400 shadow-sm',
    iconBoxClass: 'bg-amber-600 text-white shadow-xs',
    badgeClass: 'bg-amber-500 text-white border border-amber-600',
    scoreColorClass: 'text-amber-950',
    badgeIcon: AlertTriangle,
  },
  critical: {
    cardClass: 'bg-red-50/90 border-2 border-red-500 shadow-sm',
    iconBoxClass: 'bg-red-600 text-white shadow-xs',
    badgeClass: 'bg-red-600 text-white border border-red-700',
    scoreColorClass: 'text-red-950',
    badgeIcon: AlertOctagon,
  },
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  lang,
  user,
  plots,
  selectedPlot,
  onSelectPlot,
  evaluation,
  scenario,
  onChangeScenario,
  isUpdating,
  onRefreshNasa,
  onOpenForecastTab,
  onOpenCreditModal,
  onOpenShieldModal,
  creditState,
  shieldState,
  justRegisteredBanner,
  onDismissRegisteredBanner,
  onExportRiskPdf,
  onLogout,
}) => {
  const isTh = lang === 'th';
  const copy = APP_COPY[lang].home;
  const forecastCopy = APP_COPY[lang].forecast;

  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('B2');
  const [nasaSheetOpen, setNasaSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [customShareText, setCustomShareText] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareStatusNotice, setShareStatusNotice] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfStatusMsg, setPdfStatusMsg] = useState('');
  const [pdfErrorMsg, setPdfErrorMsg] = useState('');

  const baseReading = useMemo(
    () => computeIoTSensorReading(selectedPlot, evaluation, scenario, 0),
    [selectedPlot, evaluation, scenario]
  );

  const gridData = useMemo(
    () => computeSoilHealthGrid(selectedPlot, baseReading, scenario),
    [selectedPlot, baseReading, scenario]
  );

  const summary = useMemo(
    () =>
      buildFarmerDashboardSummary({
        plot: selectedPlot,
        evaluation,
        gridData,
        scenario,
        lang,
      }),
    [selectedPlot, evaluation, gridData, scenario, lang]
  );

  const defaultSharePost = useMemo(
    () =>
      buildShareableStatusPost({
        plot: selectedPlot,
        evaluation,
        gridData,
        scenario,
        lang,
      }),
    [selectedPlot, evaluation, gridData, scenario, lang]
  );

  const shareTextValue = customShareText ?? defaultSharePost;

  const handleOpenShareModal = () => {
    setCustomShareText(defaultSharePost);
    setShareCopied(false);
    setShareStatusNotice('');
    setShareSheetOpen(true);
  };

  const handleCopyShareText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareTextValue);
      }
      setShareCopied(true);
      setShareStatusNotice(
        isTh
          ? 'คัดลอกข้อความสถานะแปลงแล้ว สามารถวางส่งใน LINE หรือ Facebook ได้ทันที'
          : 'Copied status summary—paste into LINE, WhatsApp, or social groups.'
      );
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch {
      setShareCopied(true);
      setShareStatusNotice(
        isTh
          ? 'พร้อมแชร์แล้ว กรุณากดคัดลอกข้อความในกล่องด้านบน'
          : 'Ready to share—copy the summary text above.'
      );
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: isTh ? 'สถานะแปลงเกษตร CropShield' : 'CropShield Farm Status',
          text: shareTextValue,
        });
        setShareStatusNotice(
          isTh ? 'แชร์สถานะแปลงเรียบร้อยแล้ว' : 'Status shared successfully.'
        );
        return;
      } catch {
        // Fallback to copy if user cancelled or unsupported
      }
    }
    await handleCopyShareText();
  };

  const handleExportSummaryPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfStatusMsg('');
    setPdfErrorMsg('');
    try {
      const filename = await exportFarmerPlotSummaryPdf({
        plot: selectedPlot,
        evaluation,
        user,
        creditState,
        shieldState,
        scenario,
        lang,
      });
      setPdfStatusMsg(`${copy.exportSummarySuccessPrefix} ${filename}`);
      onExportRiskPdf?.(filename);
    } catch {
      setPdfErrorMsg(copy.exportSummaryError);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const statusUi = HERO_STATUS_STYLE[evaluation.riskLevel];
  const StatusBadgeIcon = statusUi.badgeIcon;
  const plotTitle =
    lang === 'en' && selectedPlot.nameEn ? selectedPlot.nameEn : selectedPlot.name;
  const cropLabel =
    lang === 'en' && selectedPlot.cropTypeEn
      ? selectedPlot.cropTypeEn
      : selectedPlot.cropType;
  const provinceLabel =
    lang === 'en' && selectedPlot.provinceEn
      ? selectedPlot.provinceEn
      : selectedPlot.province;

  const warningCardStyle =
    summary.warningTone === 'red'
      ? {
          cardClass: 'bg-red-50/95 border-2 border-red-500 shadow-xs',
          iconBoxClass: 'bg-red-600 text-white',
          titleClass: 'text-red-950',
          subClass: 'text-red-900',
          Icon: Zap,
        }
      : {
          cardClass: 'bg-orange-50/95 border-2 border-orange-400 shadow-xs',
          iconBoxClass: 'bg-orange-600 text-white',
          titleClass: 'text-orange-950',
          subClass: 'text-orange-900',
          Icon: BellRing,
        };
  const WarningIcon = warningCardStyle.Icon;

  const lineShareHref = `https://line.me/R/msg/text/?${encodeURIComponent(shareTextValue)}`;

  return (
    <div
      data-testid="elderly-farmer-home"
      className="cs-fade-slide-up max-w-4xl mx-auto space-y-4 sm:space-y-5"
    >
      {/* Registration Success Confirmation */}
      {justRegisteredBanner && (
        <div
          data-testid="registration-success-banner"
          role="status"
          className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2
              className="w-5 h-5 text-emerald-700 shrink-0"
              aria-hidden="true"
            />
            <span className="text-sm sm:text-base font-bold text-emerald-950">
              {copy.registrationSuccessTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismissRegisteredBanner}
            className="min-h-[40px] px-3 py-1 text-sm font-bold text-emerald-900 bg-white border border-emerald-300 rounded-xl hover:bg-emerald-100 shrink-0"
          >
            {copy.close}
          </button>
        </div>
      )}

      {/* 1. Header สั้นๆ: ชื่อแปลงและพื้นที่ + ปุ่มสลับสถานการณ์ + แผนที่ NASA */}
      <section
        data-testid="home-workspace-topbar"
        aria-label={copy.activePlotLabel}
        className="relative rounded-3xl overflow-hidden bg-emerald-900 text-white shadow-sm border-2 border-emerald-900/20"
      >
        <img
          src={farmBannerImg}
          alt={
            isTh
              ? 'ภาพทุ่งนาและแปลงเกษตรสีเขียวของเกษตรกร'
              : 'Green agricultural field'
          }
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-emerald-950/92 via-emerald-950/84 to-emerald-900/72"
        />

        <div className="relative z-10 p-4 sm:p-5 space-y-3.5">
          {/* Plot Selector & Farmer Account Badge + Logout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 space-y-1.5 flex-1">
              <div className="text-sm font-semibold text-emerald-100">
                {isTh ? `สวัสดีคุณ${user.fullName}` : `Welcome, ${user.fullName}`} ·{' '}
                {cropLabel} · {selectedPlot.areaRai} {isTh ? 'ไร่' : 'Rai'}
              </div>

              <select
                id="home-plot-select"
                aria-label={copy.activePlotLabel}
                value={selectedPlot.id}
                onChange={(e) => onSelectPlot(e.target.value)}
                className="min-h-[46px] w-full text-base sm:text-lg font-extrabold text-slate-900 bg-white border-2 border-white/80 rounded-2xl px-3.5 py-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer"
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'en' && p.nameEn ? p.nameEn : p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 self-stretch sm:self-end">
              <span
                data-testid="farmer-account-badge"
                className="min-h-[42px] inline-flex items-center px-3.5 py-1.5 text-sm font-bold rounded-xl bg-white/15 border border-white/30 text-white whitespace-nowrap"
              >
                {isTh ? 'บัญชีเกษตรกร' : 'Farmer Account'}
              </span>

              {onLogout && (
                <button
                  type="button"
                  data-testid="home-logout-btn"
                  onClick={onLogout}
                  aria-label={APP_COPY[lang].auth.signOutBtn}
                  className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-sm font-bold text-white bg-emerald-950/60 border border-white/30 rounded-xl hover:bg-emerald-950/85 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{APP_COPY[lang].auth.signOutBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Scenario Switcher + NASA Map Icon Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div
              className="grid grid-cols-3 gap-1.5 p-1.5 bg-emerald-950/60 backdrop-blur-xs rounded-2xl border border-white/20 flex-1"
              role="group"
              aria-label={forecastCopy.scenarioLabel}
            >
              {(
                [
                  { id: 'normal', label: isTh ? 'ปกติ' : 'Normal' },
                  { id: 'drought', label: isTh ? 'แล้ง 7 วัน' : '7-Day Drought' },
                  { id: 'flood', label: isTh ? 'น้ำท่วม' : 'Flood' },
                ] as const
              ).map((item) => {
                const active = scenario === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`home-scenario-btn-${item.id}`}
                    aria-pressed={active}
                    onClick={() => onChangeScenario(item.id)}
                    className={`min-h-[44px] px-2.5 py-2 text-sm sm:text-base font-extrabold rounded-xl transition-colors whitespace-nowrap text-center ${
                      active
                        ? item.id === 'normal'
                          ? 'bg-white text-emerald-950 shadow-sm'
                          : item.id === 'drought'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-sky-600 text-white shadow-sm'
                        : 'text-emerald-50 hover:bg-white/15'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="open-plot-map-modal-btn"
              onClick={() => setNasaSheetOpen(true)}
              aria-label={isTh ? 'เปิดแผนที่ NASA POWER' : 'Open NASA Map'}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base font-extrabold text-emerald-950 bg-white border-2 border-emerald-200 rounded-2xl hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <MapPin className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>{isTh ? 'แผนที่ NASA' : 'NASA Map'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. กล่องที่ 1: การ์ดสถานะหลัก (เด่นสุด ใหญ่สุด) + ปุ่มแชร์สถานะ / ส่งออก PDF */}
      <section
        data-testid="hero-score-card"
        aria-labelledby="home-score-heading"
        className={`rounded-3xl p-5 sm:p-6 space-y-4 ${statusUi.cardClass}`}
      >
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 ${statusUi.iconBoxClass}`}
          >
            <Sprout className="w-9 h-9 sm:w-11 sm:h-11" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                data-testid="hero-status-badge"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-base font-extrabold whitespace-nowrap ${statusUi.badgeClass}`}
              >
                <StatusBadgeIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{summary.statusBadgeText}</span>
              </span>
            </div>

            <h2
              id="home-score-heading"
              data-testid="farm-health-score"
              className={`text-2xl sm:text-[32px] font-extrabold leading-tight tracking-tight ${statusUi.scoreColorClass}`}
            >
              {summary.scoreHeadline}
            </h2>

            <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed">
              {summary.creditAssuranceSubtext}
            </p>
          </div>
        </div>

        {/* Share Status & Export PDF Quick Action Row */}
        <div className="pt-3 border-t border-slate-900/10 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-testid="share-status-btn"
            onClick={handleOpenShareModal}
            className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base font-extrabold text-emerald-950 bg-white border-2 border-emerald-600/35 rounded-2xl hover:bg-emerald-50 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] shadow-xs"
          >
            <Share2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{isTh ? 'แชร์สถานะแปลง' : 'Share Status'}</span>
          </button>

          <button
            type="button"
            data-testid="home-export-nasa-pdf-btn"
            onClick={() => void handleExportSummaryPdf()}
            disabled={isExportingPdf}
            className="min-h-[48px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base font-extrabold text-slate-900 bg-white border-2 border-slate-300 rounded-2xl hover:bg-slate-50 disabled:opacity-60 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] shadow-xs"
          >
            <FileDown className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>
              {isExportingPdf
                ? copy.exportingSummaryPdf
                : isTh
                  ? 'ส่งออกใบสรุป PDF'
                  : 'Export PDF'}
            </span>
          </button>
        </div>

        {(pdfStatusMsg || pdfErrorMsg) && (
          <p
            data-testid={pdfStatusMsg ? 'farmer-pdf-export-confirmation' : undefined}
            role={pdfErrorMsg ? 'alert' : 'status'}
            className={`text-sm font-bold rounded-2xl px-4 py-2.5 ${
              pdfErrorMsg
                ? 'text-red-800 bg-red-100 border border-red-300'
                : 'text-emerald-950 bg-white border border-emerald-300'
            }`}
          >
            {pdfErrorMsg || pdfStatusMsg}
          </p>
        )}
      </section>

      {/* 3. กล่องที่ 2: การ์ดเตือนล่วงหน้า 7 วัน (กรอบสีส้ม/แดง + ไอคอนกระดิ่ง/ฟ้าผ่า) */}
      <section
        data-testid="early-warning-banner"
        aria-labelledby="home-warning-heading"
        className={`rounded-3xl p-5 sm:p-6 ${warningCardStyle.cardClass}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ${warningCardStyle.iconBoxClass}`}
          >
            <WarningIcon className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <h2
              id="home-warning-heading"
              className={`text-2xl sm:text-[28px] font-extrabold leading-snug ${warningCardStyle.titleClass}`}
            >
              {summary.warningHeadline}
            </h2>
            <p
              className={`text-sm sm:text-base font-semibold leading-relaxed ${warningCardStyle.subClass}`}
            >
              {summary.warningAdvice}
            </p>
          </div>
        </div>
      </section>

      {/* 4. กล่องที่ 3: การ์ดดินและน้ำแบบย่อ (2 คอลัมน์เล็กๆ ในกล่องเดียว) */}
      <section
        data-testid="soil-water-summary-card"
        aria-label={isTh ? 'สรุปดินและโซนแปลง' : 'Soil and Plot Zones Summary'}
        className="bg-white border-2 border-sky-300 rounded-3xl p-4 sm:p-5 shadow-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* ซ้าย: ความชื้นดิน */}
          <div className="flex items-center gap-3.5 bg-sky-50/75 border border-sky-200 rounded-2xl p-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0">
              <Droplets className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-slate-600">
                {summary.soilMoistureLabel}
              </div>
              <div
                data-testid="farmer-soil-moisture-value"
                className={`text-2xl sm:text-[28px] font-extrabold leading-tight mt-0.5 ${
                  summary.soilMoistureTone === 'good'
                    ? 'text-emerald-800'
                    : summary.soilMoistureTone === 'dry'
                      ? 'text-amber-700'
                      : 'text-sky-800'
                }`}
              >
                {summary.soilMoistureValue}
              </div>
            </div>
          </div>

          {/* ขวา: โซนแปลง */}
          <div className="flex items-center gap-3.5 bg-teal-50/75 border border-teal-200 rounded-2xl p-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Compass className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-slate-600">
                {summary.plotZonesLabel}
              </div>
              <div
                data-testid="farmer-plot-zones-value"
                className={`text-2xl sm:text-[26px] font-extrabold leading-tight mt-0.5 ${
                  summary.plotZonesTone === 'good'
                    ? 'text-emerald-800'
                    : summary.plotZonesTone === 'warn'
                      ? 'text-amber-800'
                      : 'text-red-700'
                }`}
              >
                {summary.plotZonesValue}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ปุ่มใหญ่ด้านล่างสุด (2 ปุ่มใหญ่กดง่าย) */}
      <section
        aria-label={isTh ? 'บริการสินเชื่อและประกันภัยพืชผล' : 'Credit & Insurance Actions'}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
      >
        {/* ปุ่มสีเขียว (ไอคอนธนบัตร): ขอดูสิทธิ์สินเชื่อ */}
        <button
          type="button"
          data-testid="hero-apply-finance-btn"
          onClick={onOpenCreditModal}
          className="min-h-[68px] w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm hover:shadow-md border-2 border-emerald-800 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        >
          <Banknote className="w-7 h-7 shrink-0" aria-hidden="true" />
          <div className="text-left">
            <div className="text-lg sm:text-xl font-extrabold leading-tight">
              {isTh ? 'ขอดูสิทธิ์สินเชื่อ' : 'Check Loan Eligibility'}
            </div>
            {creditState.status === 'submitted' && (
              <div className="text-xs sm:text-sm font-semibold text-emerald-100 mt-0.5">
                {isTh
                  ? `ยื่นแล้ว ฿${creditState.requestedAmountThb.toLocaleString('en-US')}`
                  : `Submitted ฿${creditState.requestedAmountThb.toLocaleString('en-US')}`}
              </div>
            )}
          </div>
        </button>

        {/* ปุ่มสีส้ม (ไอคอนโล่คุ้มครอง): ดูประกันภัยพืชผล */}
        <button
          type="button"
          data-testid="hero-insurance-btn"
          onClick={onOpenShieldModal}
          className="min-h-[68px] w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md border-2 border-orange-700 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
        >
          <ShieldCheck className="w-7 h-7 shrink-0" aria-hidden="true" />
          <div className="text-left">
            <div className="text-lg sm:text-xl font-extrabold leading-tight">
              {isTh ? 'ดูประกันภัยพืชผล' : 'View Crop Insurance'}
            </div>
            {shieldState.active && (
              <div className="text-xs sm:text-sm font-semibold text-orange-100 mt-0.5">
                {isTh ? 'เปิดความคุ้มครองแล้ว' : 'Active Coverage'}
              </div>
            )}
          </div>
        </button>
      </section>

      {/* 6. ตารางแผงไร่ (Spatial Soil Health Grid) */}
      <section
        data-testid="farmer-soil-grid-section"
        aria-label={isTh ? 'ตารางแผงไร่รายโซน' : 'Spatial Plot Grid'}
        className="bg-white border-2 border-emerald-900/12 rounded-3xl p-4 sm:p-5 shadow-xs"
      >
        <SoilHealthGridMap
          lang={lang}
          plot={selectedPlot}
          reading={baseReading}
          scenario={scenario}
          gridData={gridData}
          selectedZoneCode={selectedZoneCode}
          onSelectZone={setSelectedZoneCode}
          embedded
          showInlineInspector
        />
      </section>

      {/* Modal 1: Share Status Summary Modal */}
      <BottomSheetModal
        isOpen={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        title={isTh ? 'แชร์สถานะแปลงเกษตร' : 'Share Farm Status'}
        subtitle={plotTitle}
        icon={<Share2 className="w-5 h-5" aria-hidden="true" />}
        closeLabel={copy.close}
      >
        <div data-testid="share-status-modal" className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="share-status-textarea"
              className="block text-sm font-bold text-slate-800"
            >
              {isTh
                ? 'ข้อความสรุปสำหรับส่งให้ครอบครัว กลุ่มเกษตรกร หรือโพสต์โซเชียล'
                : 'Pre-filled summary for family or community groups'}
            </label>
            <textarea
              id="share-status-textarea"
              data-testid="share-status-textarea"
              rows={8}
              value={shareTextValue}
              onChange={(e) => setCustomShareText(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 p-3.5 text-sm sm:text-base font-medium text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>

          {shareStatusNotice && (
            <div
              data-testid="share-status-confirmation"
              role="status"
              className="rounded-xl bg-emerald-50 border border-emerald-300 px-3.5 py-2.5 text-sm font-bold text-emerald-900 flex items-center gap-2"
            >
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{shareStatusNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="copy-share-text-btn"
              onClick={() => void handleCopyShareText()}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors"
            >
              {shareCopied ? (
                <Check className="w-5 h-5 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-5 h-5 shrink-0" aria-hidden="true" />
              )}
              <span>
                {shareCopied
                  ? isTh
                    ? 'คัดลอกข้อความแล้ว'
                    : 'Copied!'
                  : isTh
                    ? 'คัดลอกข้อความ'
                    : 'Copy Summary'}
              </span>
            </button>

            <a
              data-testid="share-line-link"
              href={lineShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm sm:text-base font-extrabold text-emerald-950 bg-emerald-50 border-2 border-emerald-600/30 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isTh ? 'ส่งเข้า LINE' : 'Share to LINE'}</span>
            </a>
          </div>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              data-testid="native-share-btn"
              onClick={() => void handleNativeShare()}
              className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isTh ? 'แชร์ผ่านแอปอื่นในเครื่อง' : 'Share via Device Apps'}
              </span>
            </button>
          )}
        </div>
      </BottomSheetModal>

      {/* Modal 2: NASA POWER Satellite Map & PDF Export Modal */}
      <BottomSheetModal
        isOpen={nasaSheetOpen}
        onClose={() => setNasaSheetOpen(false)}
        pinned
        compactBody
        title={isTh ? 'แผนที่แปลงเชื่อมข้อมูล NASA POWER' : 'NASA POWER Satellite Map'}
        subtitle={`${plotTitle} · ${provinceLabel}`}
        maxWidthClass="sm:max-w-5xl"
        icon={<Satellite className="w-5 h-5" aria-hidden="true" />}
        closeLabel={copy.close}
      >
        <div className="space-y-3">
          <NasaPowerMapPanel
            lang={lang}
            plotTitle={plotTitle}
            lat={selectedPlot.lat}
            lon={selectedPlot.lon}
            areaRai={selectedPlot.areaRai}
            provinceLabel={provinceLabel}
            evaluation={evaluation}
            healthScore={evaluation.healthScore}
            riskSummaryText={summary.warningHeadline}
            isUpdating={isUpdating}
            onSyncNasa={onRefreshNasa}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              data-testid="modal-export-nasa-pdf-btn"
              onClick={() => void handleExportSummaryPdf()}
              disabled={isExportingPdf}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-900 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 disabled:opacity-60 transition-colors"
            >
              <FileDown className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                {isExportingPdf ? copy.exportingSummaryPdf : copy.exportSummaryPdfBtn}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNasaSheetOpen(false);
                onOpenForecastTab();
              }}
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
            >
              {copy.viewForecastBtn}
            </button>
          </div>

          {pdfStatusMsg && (
            <p
              data-testid="modal-pdf-export-confirmation"
              className="text-xs sm:text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5"
            >
              {pdfStatusMsg}
            </p>
          )}
        </div>
      </BottomSheetModal>
    </div>
  );
};
