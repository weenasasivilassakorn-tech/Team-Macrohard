import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileDown,
  FileText,
  History,
  Loader2,
  LogOut,
  MapPin,
  MessageSquareText,
  PauseCircle,
  Radar,
  Satellite,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  UserCheck,
  Users,
} from 'lucide-react';
import type {
  AppLanguage,
  BaacCompactFilterMode,
  BaacConsoleSection,
  BaacDecisionAuditEntry,
  BaacManagementMode,
  BaacMapLayerMode,
  FarmerLoanRecord,
  ScenarioType,
} from '../types/cropshield';
import { exportFarmerRiskPdf } from '../utils/baacPdfExporter';
import {
  applyScenarioToBaacFarmers,
  buildBaacSmsDraft,
  buildPortfolioRiskRadar,
  filterBaacCompactList,
  formatThaiBuddhistDateTime,
  getDaysUntilRepayment,
  getFarmerTrancheSchedule,
  getRepaymentCountdownMeta,
  hasContractOrInsuranceProtection,
  splitTrancheApprovalQueue,
} from '../utils/baacWorkbench';
import { APP_COPY } from '../utils/i18n';
import { computePortfolioKpis } from '../utils/nasaPower';
import { BaacPortfolioMap } from './BaacPortfolioMap';
import { BottomSheetModal } from './BottomSheetModal';
import { NasaPowerMapPanel } from './NasaPowerMapPanel';

interface BaacPartnerScreenProps {
  lang: AppLanguage;
  activeSection: Exclude<BaacConsoleSection, 'account'>;
  onSelectSection: (section: Exclude<BaacConsoleSection, 'account'>) => void;
  officerName: string;
  branchName?: string;
  farmers: FarmerLoanRecord[];
  auditLog: BaacDecisionAuditEntry[];
  scenario: ScenarioType;
  onChangeScenario: (next: ScenarioType) => void;
  onApproveNextTranche: (
    farmerId: string,
    mode?: BaacManagementMode,
    minHealthScore?: number
  ) => void;
  onHoldCredit: (farmerId: string, minHealthScore?: number) => void;
  onTriggerInsurance: (farmerId: string, minHealthScore?: number) => void;
  onSendSmsAlert: (
    farmerId: string,
    minHealthScore?: number,
    customMessage?: string
  ) => void;
  onLogout?: () => void;
}

export const BaacPartnerScreen: React.FC<BaacPartnerScreenProps> = ({
  lang,
  activeSection,
  onSelectSection,
  officerName,
  branchName,
  farmers,
  auditLog,
  scenario,
  onChangeScenario,
  onApproveNextTranche,
  onHoldCredit,
  onSendSmsAlert,
  onLogout,
}) => {
  const isTh = lang === 'th';

  // Left Column Map & Compact Filter State
  const [mapLayerMode, setMapLayerMode] =
    useState<BaacMapLayerMode>('soil-health');
  const [compactFilter, setCompactFilter] =
    useState<BaacCompactFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(farmers[0]?.id ?? '');

  // Radar & History State
  const [selectedRadarDayNumber, setSelectedRadarDayNumber] = useState<
    number | null
  >(null);
  const [historyFilter, setHistoryFilter] = useState<
    'all' | 'pending' | 'processed'
  >('all');

  // Right Column SMS Composer & AI Draft State
  const [smsDraftByFarmer, setSmsDraftByFarmer] = useState<
    Record<string, string>
  >({});
  const [isDraftingSms, setIsDraftingSms] = useState(false);
  const [smsConfirmedNoteByFarmer, setSmsConfirmedNoteByFarmer] = useState<
    Record<string, string>
  >({});

  // NASA Detail Modal & PDF State
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfStatusMsg, setPdfStatusMsg] = useState('');

  // Ref map for scrolling highlighted compact card into view when clicking a map pin
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Apply active BAAC simulation scenario dynamically across the portfolio
  const simulatedFarmers = useMemo(
    () => applyScenarioToBaacFarmers(farmers, scenario),
    [farmers, scenario]
  );

  const kpis = useMemo(
    () => computePortfolioKpis(simulatedFarmers),
    [simulatedFarmers]
  );
  const radarDays = useMemo(
    () => buildPortfolioRiskRadar(simulatedFarmers, lang),
    [simulatedFarmers, lang]
  );
  const activeRadarDay = useMemo(
    () =>
      selectedRadarDayNumber
        ? radarDays.find((d) => d.dayNumber === selectedRadarDayNumber) ?? null
        : null,
    [radarDays, selectedRadarDayNumber]
  );

  const risk7dCount = useMemo(
    () =>
      simulatedFarmers.filter(
        (f) => f.riskLevel === 'watch' || f.riskLevel === 'critical'
      ).length,
    [simulatedFarmers]
  );

  const dueSoonCount = useMemo(
    () =>
      simulatedFarmers.filter((f) => getDaysUntilRepayment(f) <= 15).length,
    [simulatedFarmers]
  );

  const filteredFarmers = useMemo(() => {
    const base = filterBaacCompactList(
      simulatedFarmers,
      compactFilter,
      searchQuery
    );
    if (activeSection === 'radar' && activeRadarDay) {
      return base.filter((f) => activeRadarDay.atRiskFarmerIds.includes(f.id));
    }
    return base;
  }, [
    activeRadarDay,
    activeSection,
    compactFilter,
    searchQuery,
    simulatedFarmers,
  ]);

  const selectedFarmer = useMemo(() => {
    if (simulatedFarmers.length === 0) return null;
    return (
      filteredFarmers.find((f) => f.id === selectedId) ??
      simulatedFarmers.find((f) => f.id === selectedId) ??
      filteredFarmers[0] ??
      simulatedFarmers[0]
    );
  }, [filteredFarmers, selectedId, simulatedFarmers]);

  const selectedSchedule = useMemo(
    () => (selectedFarmer ? getFarmerTrancheSchedule(selectedFarmer) : []),
    [selectedFarmer]
  );

  const selectedCountdown = useMemo(() => {
    if (!selectedFarmer) return null;
    const days = getDaysUntilRepayment(selectedFarmer);
    return {
      days,
      ...getRepaymentCountdownMeta(days, lang),
    };
  }, [lang, selectedFarmer]);

  const { pendingApproval, processedApprovals } = useMemo(
    () => splitTrancheApprovalQueue(simulatedFarmers),
    [simulatedFarmers]
  );

  useEffect(() => {
    setPdfStatusMsg('');
  }, [selectedFarmer?.id]);

  const handleSelectFarmerFromPin = (farmerId: string) => {
    setSelectedId(farmerId);
    // If active filter hides this farmer, reset to 'all' so card highlights immediately
    if (!filteredFarmers.some((f) => f.id === farmerId)) {
      setCompactFilter('all');
      setSearchQuery('');
    }
    window.setTimeout(() => {
      cardRefs.current[farmerId]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }, 80);
  };

  const currentSmsText = selectedFarmer
    ? smsDraftByFarmer[selectedFarmer.id] ?? ''
    : '';

  const handleSetSmsText = (text: string) => {
    if (!selectedFarmer) return;
    setSmsDraftByFarmer((prev) => ({ ...prev, [selectedFarmer.id]: text }));
  };

  const handleAiDraftSms = async () => {
    if (!selectedFarmer || isDraftingSms) return;
    setIsDraftingSms(true);
    const dueLabel = isTh
      ? selectedFarmer.repaymentDueLabelTh ?? '15 มี.ค. 2570, 16:00 น.'
      : selectedFarmer.repaymentDueLabelEn ?? 'Mar 15, 2027, 16:00';
    const days = getDaysUntilRepayment(selectedFarmer);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3500);
      const res = await fetch('/api/assistant/draft-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          lang,
          farmerName: selectedFarmer.farmerName,
          cropType: selectedFarmer.cropType,
          nasaHealthScore: selectedFarmer.nasaHealthScore,
          riskStatus7Day: selectedFarmer.riskStatus7DayTh,
          trancheInfo: `งวด ${selectedFarmer.currentTranche}/${selectedFarmer.totalTranches} (${selectedFarmer.loanStatus})`,
          repaymentDueLabel: dueLabel,
          daysUntilRepayment: days,
        }),
      });
      window.clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { draft?: string };
        if (data.draft?.trim()) {
          handleSetSmsText(data.draft.trim());
          setIsDraftingSms(false);
          return;
        }
      }
    } catch {
      // Seamless local fallback below
    }

    handleSetSmsText(buildBaacSmsDraft(selectedFarmer, lang));
    setIsDraftingSms(false);
  };

  const handleDispatchSms = () => {
    if (!selectedFarmer) return;
    const messageToSend =
      currentSmsText.trim() || buildBaacSmsDraft(selectedFarmer, lang);
    if (!currentSmsText.trim()) {
      handleSetSmsText(messageToSend);
    }
    const stamp = formatThaiBuddhistDateTime(new Date(), lang);
    setSmsConfirmedNoteByFarmer((prev) => ({
      ...prev,
      [selectedFarmer.id]: isTh
        ? `ส่ง SMS สำเร็จเมื่อ ${stamp}`
        : `SMS sent at ${stamp}`,
    }));
    onSendSmsAlert(selectedFarmer.id, 70, messageToSend);
  };

  const handleExportPdf = async () => {
    if (!selectedFarmer || isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfStatusMsg('');
    try {
      const filename = await exportFarmerRiskPdf(selectedFarmer, kpis);
      setPdfStatusMsg(
        isTh
          ? `ส่งออก PDF สำเร็จ: ${filename}`
          : `Exported PDF: ${filename}`
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const renderRiskBadge = (record: FarmerLoanRecord) => {
    if (record.riskLevel === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
          <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{isTh ? 'วิกฤต' : 'Critical'}</span>
        </span>
      );
    }
    if (record.riskLevel === 'watch') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{isTh ? 'เฝ้าระวัง 7 วัน' : '7D Watch'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{isTh ? 'ปกติ' : 'Normal'}</span>
      </span>
    );
  };

  const renderStatusIcon = (riskLevel: FarmerLoanRecord['riskLevel']) => {
    if (riskLevel === 'critical') {
      return (
        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 border border-red-200 flex items-center justify-center shrink-0">
          <AlertOctagon className="w-5 h-5" aria-hidden="true" />
        </div>
      );
    }
    if (riskLevel === 'watch') {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
      </div>
    );
  };

  return (
    <div
      data-testid="baac-partner-workbench"
      className="cs-fade-slide-up space-y-3.5"
    >
      {/* ================================================================= */}
      {/* 1. COMPACT BAAC OFFICER CONSOLE HEADER                            */}
      {/* ================================================================= */}
      <section
        aria-label="BAAC Officer Console Header"
        className="cs-fade-slide-up bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 shadow-xs"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: System Logo/Title + Officer Account Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex bg-white rounded-xl px-2.5 py-1.5 shadow-xs shrink-0 transition-transform duration-200 hover:scale-[1.02]">
              <img
                src="/assets/aistudio/IMG_3569_daf0d6e4.JPG"
                alt="CropShield"
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white">
                  CropShield — BAAC Officer Console
                </h1>
                <span
                  data-testid="baac-role-badge"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/15 border border-white/25 text-xs font-bold text-emerald-50 whitespace-nowrap"
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {isTh ? 'บัญชีเจ้าหน้าที่สินเชื่อ' : 'Credit Officer Account'}
                  </span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5 truncate">
                {officerName}
                {branchName ? ` · ${branchName}` : ''} ·{' '}
                {isTh
                  ? `พอร์ต ${kpis.connectedPlotsCount} แปลง (${kpis.totalAreaRai.toLocaleString('en-US')} ไร่)`
                  : `${kpis.connectedPlotsCount} plots (${kpis.totalAreaRai} Rai)`}
              </p>
            </div>
          </div>

          {/* Right: Scenario Switcher + Sign Out */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Simulation Scenario Toggle: Normal / 7D Drought / Flood */}
            <div
              role="group"
              aria-label={isTh ? 'สลับสถานการณ์จำลอง' : 'Simulate climate scenario'}
              className="inline-flex items-center p-0.5 bg-emerald-950/45 border border-white/20 rounded-xl"
            >
              {(
                [
                  { id: 'normal', label: isTh ? 'ปกติ' : 'Normal' },
                  { id: 'drought', label: isTh ? 'แล้ง 7 วัน' : '7D Drought' },
                  { id: 'flood', label: isTh ? 'น้ำท่วม' : 'Flood' },
                ] as const
              ).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  data-testid={`baac-scenario-${sc.id}`}
                  aria-pressed={scenario === sc.id}
                  onClick={() => onChangeScenario(sc.id)}
                  className={`min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all duration-150 active:scale-95 whitespace-nowrap ${
                    scenario === sc.id
                      ? 'bg-white text-emerald-950 shadow-2xs'
                      : 'text-emerald-100 hover:bg-white/10'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {onLogout && (
              <button
                type="button"
                data-testid="baac-logout-btn"
                onClick={onLogout}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-950/40 border border-white/20 hover:bg-emerald-950/65 rounded-xl transition-all duration-150 active:scale-95 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{APP_COPY[lang].auth.signOutBtn}</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Section Switcher synced with bottom nav */}
        <div
          role="tablist"
          aria-label={isTh ? 'มุมมองการทำงานเจ้าหน้าที่ ธ.ก.ส.' : 'BAAC Console Views'}
          className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap gap-1.5"
        >
          {(
            [
              {
                id: 'console',
                label: isTh ? 'คอนโซล 2 คอลัมน์' : '2-Col Officer Console',
                icon: Building2,
              },
              {
                id: 'radar',
                label: isTh ? 'เรดาร์เสี่ยง 7 วัน' : '7-Day Risk Radar',
                icon: Radar,
              },
              {
                id: 'history',
                label: isTh ? 'ประวัติอนุมัติงวด & Audit' : 'Approvals & Audit',
                icon: History,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`baac-section-tab-${tab.id}`}
                onClick={() => onSelectSection(tab.id)}
                className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-emerald-950 shadow-2xs'
                    : 'bg-emerald-950/35 text-emerald-100 hover:bg-emerald-950/55 border border-white/15'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* OPTIONAL RADAR BANNER (When Radar Tab Selected)                   */}
      {/* ================================================================= */}
      {activeSection === 'radar' && (
        <section
          data-testid="baac-portfolio-risk-radar"
          aria-label="7-Day Portfolio Risk Radar"
          className="bg-white border border-emerald-900/15 rounded-2xl p-4 space-y-3 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {isTh
                  ? 'เรดาร์ความเสี่ยงพอร์ต 7 วัน (กดวันเพื่อกรองแผนที่และรายชื่อ)'
                  : '7-Day Portfolio Risk Radar (Select day to filter)'}
              </h2>
            </div>
            {selectedRadarDayNumber !== null && (
              <button
                type="button"
                onClick={() => setSelectedRadarDayNumber(null)}
                className="min-h-[36px] px-3 py-1 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100"
              >
                {isTh ? 'แสดงทุกวัน' : 'Show All Days'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {radarDays.map((day) => {
              const selected = selectedRadarDayNumber === day.dayNumber;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  data-testid={`radar-day-btn-${day.dayNumber}`}
                  onClick={() =>
                    setSelectedRadarDayNumber((prev) =>
                      prev === day.dayNumber ? null : day.dayNumber
                    )
                  }
                  className={`text-left rounded-xl p-2.5 border transition-colors ${
                    selected
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-emerald-50/40 border-emerald-900/12 text-slate-900 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{isTh ? day.dayLabelTh : day.dayLabelEn}</span>
                    <span className="opacity-75 font-mono">{day.dateShort}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        selected
                          ? 'bg-amber-400/25 text-amber-100'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isTh ? 'ระวัง' : 'W'} {day.watchCount}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        selected
                          ? 'bg-red-400/25 text-red-100'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isTh ? 'วิกฤต' : 'C'} {day.criticalCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* HISTORY & AUDIT VIEW (When History Tab Selected)                  */}
      {/* ================================================================= */}
      {activeSection === 'history' && (
        <div data-testid="baac-approval-history-view" className="space-y-4">
          <section className="bg-white border border-emerald-900/15 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <ClipboardCheck
                  className="w-5 h-5 text-emerald-700 shrink-0"
                  aria-hidden="true"
                />
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {isTh
                    ? 'ประวัติขออนุมัติงวด & บันทึกการตัดสินใจ (Audit Log)'
                    : 'Tranche Approvals & Decision Audit Log'}
                </h2>
              </div>

              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
                {(
                  [
                    { id: 'all', label: isTh ? 'ทั้งหมด' : 'All' },
                    {
                      id: 'pending',
                      label: isTh
                        ? `รออนุมัติ (${pendingApproval.length})`
                        : `Pending (${pendingApproval.length})`,
                    },
                    {
                      id: 'processed',
                      label: isTh
                        ? `ดำเนินการแล้ว (${processedApprovals.length})`
                        : `Processed (${processedApprovals.length})`,
                    },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHistoryFilter(t.id)}
                    className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      historyFilter === t.id
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(historyFilter === 'all' || historyFilter === 'pending') && (
                <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="text-sm font-bold text-amber-950">
                    {isTh
                      ? `รออนุมัติงวดถัดไป (${pendingApproval.length})`
                      : `Pending Next Tranche (${pendingApproval.length})`}
                  </h3>
                  <div className="space-y-2">
                    {pendingApproval.map((rec) => {
                      const nextT = Math.min(
                        rec.totalTranches,
                        rec.currentTranche + 1
                      );
                      return (
                        <div
                          key={rec.id}
                          className="bg-white border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {rec.farmerName}
                            </div>
                            <div className="text-xs text-slate-600">
                              {rec.cropType} · NASA {rec.nasaHealthScore}/100 · งวด{' '}
                              {rec.currentTranche}/{rec.totalTranches}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onApproveNextTranche(rec.id, 'phased-tranche', 70)
                            }
                            className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shrink-0"
                          >
                            {isTh ? `อนุมัติงวด ${nextT}` : `Approve #${nextT}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(historyFilter === 'all' || historyFilter === 'processed') && (
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="text-sm font-bold text-emerald-950">
                    {isTh
                      ? `บันทึกการดำเนินการล่าสุด (${auditLog.length})`
                      : `Recent Officer Audit Log (${auditLog.length})`}
                  </h3>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {auditLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-white border border-emerald-200/80 rounded-xl p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-emerald-800">
                            {isTh ? entry.actionLabelTh : entry.actionLabelEn}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {entry.timeLabel}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {entry.farmerName}
                        </div>
                        <div className="text-xs text-slate-600">
                          {isTh ? entry.nasaRationaleTh : entry.nasaRationaleEn}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ================================================================= */}
      {/* MAIN 2-COLUMN SINGLE-SCREEN CONSOLE (LEFT: MAP + COMPACT LIST,    */}
      {/* RIGHT: SELECTED PROFILE + TRANCHE & COUNTDOWN + AI SMS COMPOSER)  */}
      {/* ================================================================= */}
      {(activeSection === 'console' || activeSection === 'radar') && (
        <div
          data-testid="baac-two-column-console"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
        >
          {/* --------------------------------------------------------------- */}
          {/* LEFT COLUMN: Map View + Compact Farmer Card List                */}
          {/* --------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Box 1: Interactive Map View with Status Pins & Layer Switcher */}
            <BaacPortfolioMap
              lang={lang}
              farmers={filteredFarmers.length > 0 ? filteredFarmers : simulatedFarmers}
              selectedFarmerId={selectedFarmer?.id ?? ''}
              layerMode={mapLayerMode}
              scenario={scenario}
              onChangeLayerMode={setMapLayerMode}
              onSelectFarmerFromPin={handleSelectFarmerFromPin}
            />

            {/* Box 2: Compact Farmer Card List (Zero Eye Strain) */}
            <section
              data-testid="baac-compact-list-card"
              aria-label={isTh ? 'รายชื่อเกษตรกรแบบกระชับ' : 'Compact Farmer List'}
              className="bg-white border border-emerald-900/15 rounded-2xl overflow-hidden shadow-xs"
            >
              {/* List Header + Compact Search & 3 Short Filters */}
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                      {isTh ? 'รายชื่อเกษตรกรในพอร์ต' : 'Farmer Portfolio List'}
                    </h2>
                  </div>
                  <span className="text-xs font-extrabold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                    {filteredFarmers.length} {isTh ? 'ราย' : 'plots'}
                  </span>
                </div>

                {/* Short Filter Chips: All / 7D Alert / Due Soon */}
                <div
                  role="group"
                  aria-label={isTh ? 'ตัวกรองรายชื่อสั้น' : 'Quick farmer filters'}
                  className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-xl"
                >
                  {(
                    [
                      {
                        id: 'all',
                        label: isTh
                          ? `ทั้งหมด (${simulatedFarmers.length})`
                          : `All (${simulatedFarmers.length})`,
                      },
                      {
                        id: 'risk7d',
                        label: isTh
                          ? `เตือน 7 วัน (${risk7dCount})`
                          : `7D Alert (${risk7dCount})`,
                      },
                      {
                        id: 'due-soon',
                        label: isTh
                          ? `ใกล้ครบกำหนดคืน (${dueSoonCount})`
                          : `Due Soon (${dueSoonCount})`,
                      },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      data-testid={`baac-compact-filter-${chip.id}`}
                      aria-pressed={compactFilter === chip.id}
                      onClick={() => setCompactFilter(chip.id)}
                      className={`min-h-[36px] px-2 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap text-center truncate ${
                        compactFilter === chip.id
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-white/80'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Compact Search Input */}
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    data-testid="baac-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isTh
                        ? 'ค้นหาชื่อเกษตรกร, อำเภอ, จังหวัด...'
                        : 'Search farmer, district, province...'
                    }
                    className="w-full min-h-[38px] pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* Scrollable Compact Card List (Each row: Status Icon + Name/Area + NASA Score + Status Pill + Countdown Pill) */}
              <div
                data-testid="baac-compact-farmer-list"
                className="divide-y divide-slate-100 lg:max-h-[415px] lg:overflow-y-auto"
              >
                {filteredFarmers.length === 0 ? (
                  <div className="p-6 text-center space-y-2.5">
                    <p className="text-sm font-medium text-slate-600">
                      {isTh
                        ? 'ไม่พบเกษตรกรที่ตรงกับตัวกรอง'
                        : 'No farmers match your filter.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCompactFilter('all');
                        setSearchQuery('');
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 text-xs font-bold bg-emerald-700 text-white rounded-xl"
                    >
                      {isTh ? 'แสดงทั้งหมด' : 'Show All'}
                    </button>
                  </div>
                ) : (
                  filteredFarmers.map((record) => {
                    const isSelected = selectedFarmer?.id === record.id;
                    const daysLeft = getDaysUntilRepayment(record);
                    const countdown = getRepaymentCountdownMeta(daysLeft, lang);

                    return (
                      <button
                        key={record.id}
                        ref={(el) => {
                          cardRefs.current[record.id] = el;
                        }}
                        type="button"
                        data-testid={`baac-compact-card-${record.id}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(record.id)}
                        className={`w-full text-left px-3.5 py-3 transition-all duration-200 flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 ${
                          isSelected
                            ? 'bg-emerald-50/90 ring-2 ring-inset ring-emerald-700/45 translate-x-0.5'
                            : 'bg-white hover:bg-slate-50/90 hover:translate-x-0.5'
                        }`}
                      >
                        {/* 1. Status Icon */}
                        {renderStatusIcon(record.riskLevel)}

                        {/* 2. Name + Area */}
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-bold text-slate-900 truncate leading-snug">
                            {record.farmerName}
                          </div>
                          <div className="text-[13px] text-slate-600 truncate mt-0.5 flex items-center gap-1">
                            <MapPin
                              className="w-3 h-3 text-slate-400 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {record.districtName
                                ? `${record.districtName} จ.${record.province}`
                                : `จ.${record.province}`}{' '}
                              · {record.areaRai} {isTh ? 'ไร่' : 'Rai'}
                            </span>
                          </div>
                        </div>

                        {/* 3. Right Compact Telemetry: NASA Score + Color Status + Countdown */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-extrabold font-mono tabular-nums ${
                                record.riskLevel === 'critical'
                                  ? 'text-red-700'
                                  : record.riskLevel === 'watch'
                                    ? 'text-amber-800'
                                    : 'text-emerald-800'
                              }`}
                            >
                              {record.nasaHealthScore}
                              <span className="text-[11px] font-normal text-slate-500">
                                /100
                              </span>
                            </span>
                            {renderRiskBadge(record)}
                          </div>

                          <span
                            data-testid={`baac-compact-countdown-${record.id}`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tabular-nums ${
                              countdown.tone === 'red'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : countdown.tone === 'amber'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <CalendarClock className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>{countdown.compactLabel}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Farmer Profile + Tranche/Countdown + AI SMS       */}
          {/* --------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-3.5">
            {!selectedFarmer || !selectedCountdown ? (
              <div className="bg-white border border-emerald-900/15 rounded-2xl p-8 text-center text-sm text-slate-600">
                {isTh
                  ? 'กรุณาเลือกเกษตรกรจากแผนที่หรือรายการด้านซ้าย'
                  : 'Select a farmer from the map or list on the left.'}
              </div>
            ) : (
              <>
                {/* CARD 1: Selected Farmer Info + NASA Score & 7-Day Risk */}
                <section
                  key={`profile-${selectedFarmer.id}`}
                  data-testid="baac-selected-profile-card"
                  aria-label={isTh ? 'ข้อมูลเกษตรกรที่เลือก' : 'Selected Farmer Details'}
                  className="cs-fade-slide-up bg-white border border-emerald-900/15 rounded-2xl overflow-hidden shadow-xs transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="px-4 py-3.5 sm:px-5 bg-emerald-50/55 border-b border-emerald-900/10 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-800 truncate">
                          {selectedFarmer.cooperativeName}
                        </div>
                        <h2
                          data-testid="baac-selected-farmer-name"
                          className="text-xl sm:text-[22px] font-extrabold text-slate-900 leading-tight mt-0.5"
                        >
                          {selectedFarmer.farmerName}
                        </h2>
                        <p className="text-[13px] sm:text-sm text-slate-600 mt-0.5">
                          {selectedFarmer.cropType} · {selectedFarmer.areaRai}{' '}
                          {isTh ? 'ไร่' : 'Rai'} ·{' '}
                          {selectedFarmer.districtName
                            ? `${selectedFarmer.districtName} จ.${selectedFarmer.province}`
                            : selectedFarmer.province}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid="baac-open-nasa-map-btn"
                        onClick={() => setMapModalOpen(true)}
                        className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-900 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors"
                      >
                        <Satellite className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                        <span>{isTh ? 'แผนที่ NASA' : 'NASA Map'}</span>
                      </button>

                      <button
                        type="button"
                        data-testid="baac-export-pdf-btn"
                        onClick={() => void handleExportPdf()}
                        disabled={isExportingPdf}
                        className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Clean Highlight Metrics inside Selected Farmer Card */}
                  <div className="p-4 sm:px-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* NASA Score (Large 24-28px Bold) */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
                      <div className="flex items-center justify-between gap-1 text-xs font-bold text-slate-600">
                        <span>{isTh ? 'คะแนนสุขภาพแปลง' : 'Plot Health Score'}</span>
                        <Satellite
                          className="w-4 h-4 text-emerald-700 shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span
                          data-testid="baac-selected-score"
                          className={`text-2xl sm:text-[28px] font-extrabold font-mono tabular-nums leading-none ${
                            selectedFarmer.riskLevel === 'critical'
                              ? 'text-red-700'
                              : selectedFarmer.riskLevel === 'watch'
                                ? 'text-amber-700'
                                : 'text-emerald-800'
                          }`}
                        >
                          {selectedFarmer.nasaHealthScore}
                        </span>
                        <span className="text-sm font-bold text-slate-500 font-mono">
                          /100
                        </span>
                      </div>
                      <div className="mt-1.5">{renderRiskBadge(selectedFarmer)}</div>
                    </div>

                    {/* 7-Day Risk Forecast (NASA POWER/Soil) */}
                    <div
                      className={`rounded-xl border p-3.5 ${
                        selectedFarmer.riskLevel === 'critical'
                          ? 'bg-red-50/70 border-red-200'
                          : selectedFarmer.riskLevel === 'watch'
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-emerald-50/60 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-xs font-bold text-slate-700">
                        <span>
                          {isTh ? 'ความเสี่ยงล่วงหน้า 7 วัน' : '7-Day NASA Risk'}
                        </span>
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 ${
                            selectedFarmer.riskLevel === 'critical'
                              ? 'text-red-600'
                              : selectedFarmer.riskLevel === 'watch'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                        {selectedFarmer.riskStatus7DayTh}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {isTh
                          ? 'อ้างอิง NASA POWER & Soil Moisture'
                          : 'NASA POWER & Soil telemetry'}
                      </p>
                    </div>

                    {/* Yield Stability Signal */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
                      <div className="flex items-center justify-between gap-1 text-xs font-bold text-slate-600">
                        <span>
                          {isTh ? 'ความมั่นคงผลผลิต' : 'Yield Stability Signal'}
                        </span>
                        <Sprout
                          className="w-4 h-4 text-emerald-700 shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                        {selectedFarmer.cashFlowSignalTh}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {hasContractOrInsuranceProtection(selectedFarmer)
                            ? selectedFarmer.contractFarmingPartner
                            : isTh
                              ? 'แนะนำผูกประกัน Parametric'
                              : 'Recommend Parametric Shield'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {pdfStatusMsg && (
                    <div className="mx-4 sm:mx-5 mb-3.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                      {pdfStatusMsg}
                    </div>
                  )}
                </section>

                {/* CARD 2: Tranche Approvals + Repayment Due Date & Highlighted Countdown */}
                <section
                  data-testid="baac-tranche-repayment-card"
                  aria-label={
                    isTh
                      ? 'รายการอนุมัติงวดและกำหนดจ่ายเงินคืน'
                      : 'Tranche Approvals & Repayment Countdown'
                  }
                  className="bg-white border border-emerald-900/15 rounded-2xl overflow-hidden shadow-xs"
                >
                  <div className="px-4 py-3 sm:px-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                          {isTh
                            ? 'รายการอนุมัติงวดสินเชื่อ & วันกำหนดคืนเงิน'
                            : 'Tranche Schedule & Repayment Countdown'}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {isTh
                            ? `วงเงินรวม ฿${selectedFarmer.loanLimitThb.toLocaleString('en-US')} · ปัจจุบันงวด ${selectedFarmer.currentTranche}/${selectedFarmer.totalTranches}`
                            : `Facility ฿${selectedFarmer.loanLimitThb.toLocaleString('en-US')} · Tranche ${selectedFarmer.currentTranche}/${selectedFarmer.totalTranches}`}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                      {selectedFarmer.loanStatus}
                    </span>
                  </div>

                  <div className="p-4 sm:px-5 space-y-4">
                    {/* Repayment Due Date + Highlighted Countdown Box */}
                    <div
                      data-testid="baac-repayment-countdown-box"
                      className={`rounded-2xl border-2 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 ${
                        selectedCountdown.tone === 'red'
                          ? 'bg-red-50/90 border-red-400'
                          : selectedCountdown.tone === 'amber'
                            ? 'bg-amber-50/90 border-amber-400'
                            : 'bg-emerald-50/75 border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            selectedCountdown.tone === 'red'
                              ? 'bg-red-600 text-white'
                              : selectedCountdown.tone === 'amber'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-700 text-white'
                          }`}
                        >
                          <CalendarClock className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-700">
                            {isTh
                              ? 'วัน-เวลา กำหนดจ่ายเงินคืน'
                              : 'Repayment Due Date & Time'}
                          </div>
                          <div
                            data-testid="baac-repayment-due-datetime"
                            className="text-base font-extrabold text-slate-950 mt-0.5 whitespace-nowrap"
                          >
                            {isTh
                              ? selectedFarmer.repaymentDueLabelTh ??
                                '15 มี.ค. 2570, 16:00 น.'
                              : selectedFarmer.repaymentDueLabelEn ??
                                'Mar 15, 2027, 16:00'}
                          </div>
                        </div>
                      </div>

                      <div
                        data-testid="baac-repayment-countdown-highlight"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm whitespace-nowrap shrink-0 shadow-2xs transition-colors duration-200 ${
                          selectedCountdown.tone === 'red'
                            ? 'bg-red-600 text-white'
                            : selectedCountdown.tone === 'amber'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {selectedCountdown.tone === 'red' && (
                          <span
                            aria-hidden="true"
                            className="w-2 h-2 rounded-full bg-white animate-ping shrink-0"
                          />
                        )}
                        <span>{selectedCountdown.highlightLabel}</span>
                      </div>
                    </div>

                    {/* Tranche List with Date & Time */}
                    <div
                      data-testid="baac-tranche-schedule-list"
                      className="divide-y divide-slate-100 border border-slate-200/90 rounded-xl overflow-hidden"
                    >
                      {selectedSchedule.map((item) => {
                        const isApproved = item.status === 'approved';
                        const isHeld = item.status === 'held';
                        const isPending = item.status === 'pending';
                        return (
                          <div
                            key={item.trancheNumber}
                            data-testid={`baac-tranche-item-${item.trancheNumber}`}
                            className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              isApproved
                                ? 'bg-emerald-50/35'
                                : isHeld
                                  ? 'bg-amber-50/50'
                                  : 'bg-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  {isTh ? item.labelTh : item.labelEn}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    isApproved
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isHeld
                                        ? 'bg-amber-100 text-amber-900'
                                        : isPending
                                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                          : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {isApproved
                                    ? isTh
                                      ? 'อนุมัติแล้ว'
                                      : 'Approved'
                                    : isHeld
                                      ? isTh
                                        ? 'ชะลอวงเงิน'
                                        : 'On Hold'
                                      : isPending
                                        ? isTh
                                          ? 'รอพิจารณา'
                                          : 'Pending'
                                        : isTh
                                          ? 'กำหนดการถัดไป'
                                          : 'Scheduled'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5 font-mono">
                                {item.timestampLabel}
                              </div>
                            </div>

                            <div className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-slate-900 shrink-0">
                              ฿{item.amountThb.toLocaleString('en-US')}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Officer Action Confirmation Banner */}
                    {selectedFarmer.officerActionTaken && (
                      <div
                        data-testid="officer-action-confirmation"
                        role="status"
                        className="cs-pop-in bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-emerald-950 flex items-start gap-2"
                      >
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{selectedFarmer.officerActionTaken}</span>
                      </div>
                    )}

                    {/* Action Buttons: Approve Next Tranche | Hold Credit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        data-testid="approve-next-tranche-btn"
                        onClick={() =>
                          onApproveNextTranche(
                            selectedFarmer.id,
                            'phased-tranche',
                            70
                          )
                        }
                        className="min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] shadow-2xs hover:shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {isTh ? 'อนุมัติงวดถัดไป' : 'Approve Next Tranche'}
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="hold-credit-btn"
                        onClick={() => onHoldCredit(selectedFarmer.id, 70)}
                        className="min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-amber-50 border border-amber-300 text-amber-950 hover:bg-amber-100 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
                      >
                        <PauseCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{isTh ? 'ชะลอวงเงิน' : 'Hold Credit'}</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* CARD 3: Important SMS Alert + AI Draft SMS */}
                <section
                  data-testid="baac-sms-composer-card"
                  aria-label={isTh ? 'ส่ง SMS แจ้งเตือนสำคัญ' : 'Send Important SMS Alert'}
                  className="bg-white border border-emerald-900/15 rounded-2xl overflow-hidden shadow-xs"
                >
                  <div className="px-4 py-3 sm:px-5 bg-emerald-50/45 border-b border-emerald-900/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                        <MessageSquareText className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                          {isTh ? 'ส่ง SMS แจ้งเตือนสำคัญ' : 'Important SMS Alert'}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {isTh ? 'ส่งตรงถึงเบอร์เกษตรกร: ' : 'Recipient: '}
                          <span className="font-mono font-bold text-slate-800">
                            {selectedFarmer.phoneNumber ?? '081-234-5678'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="baac-ai-draft-sms-btn"
                      disabled={isDraftingSms}
                      onClick={() => void handleAiDraftSms()}
                      className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-50 transition-all duration-150 active:scale-95 shadow-2xs disabled:opacity-60"
                    >
                      {isDraftingSms ? (
                        <Loader2
                          className="w-4 h-4 animate-spin text-emerald-700 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Sparkles
                          className="w-4 h-4 text-emerald-700 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        {isDraftingSms
                          ? isTh
                            ? 'AI กำลังร่างข้อความ...'
                            : 'AI Drafting...'
                          : isTh
                            ? 'AI ช่วยเขียน SMS'
                            : 'AI Draft SMS'}
                      </span>
                    </button>
                  </div>

                  <div className="p-4 sm:px-5 space-y-3">
                    <textarea
                      data-testid="baac-sms-textarea"
                      rows={4}
                      value={currentSmsText}
                      onChange={(e) => handleSetSmsText(e.target.value)}
                      placeholder={
                        isTh
                          ? 'พิมพ์ข้อความแจ้งเตือนเกษตรกร หรือกดปุ่ม "AI ช่วยเขียน SMS" เพื่อร่างคำเตือน 7 วันและวันคืนเงินอัตโนมัติ...'
                          : 'Type a custom SMS or click "AI Draft SMS" to compose a clear 7-day risk & repayment reminder...'
                      }
                      className="w-full px-3.5 py-2.5 text-sm sm:text-[15px] leading-relaxed bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 transition-colors"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-2.5">
                      <button
                        type="button"
                        data-testid="baac-send-sms-btn"
                        onClick={handleDispatchSms}
                        className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] shrink-0 shadow-2xs"
                      >
                        <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{isTh ? 'ส่ง SMS' : 'Send SMS'}</span>
                      </button>

                      <div className="min-h-[24px] flex items-center">
                        {(smsConfirmedNoteByFarmer[selectedFarmer.id] ||
                          selectedFarmer.lastSmsSentLabel) && (
                          <span
                            data-testid="baac-sms-sent-confirmation"
                            role="status"
                            className="cs-pop-in inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg"
                          >
                            <CheckCircle2
                              className="w-4 h-4 text-emerald-700 shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              {smsConfirmedNoteByFarmer[selectedFarmer.id] ??
                                selectedFarmer.lastSmsSentLabel}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detailed NASA Map Sheet for Selected Farmer */}
      {selectedFarmer && (
        <BottomSheetModal
          isOpen={mapModalOpen}
          onClose={() => setMapModalOpen(false)}
          pinned
          compactBody
          title={
            isTh
              ? `แผนที่แปลง NASA: ${selectedFarmer.farmerName}`
              : `NASA Plot Map: ${selectedFarmer.farmerName}`
          }
          subtitle={`${selectedFarmer.cropType} · ${selectedFarmer.areaRai} ${isTh ? 'ไร่' : 'Rai'} · จ.${selectedFarmer.province}`}
          maxWidthClass="sm:max-w-5xl"
          icon={<Satellite className="w-5 h-5" aria-hidden="true" />}
          closeLabel={APP_COPY[lang].home.close}
        >
          <NasaPowerMapPanel
            lang={lang}
            plotTitle={selectedFarmer.farmerName}
            lat={selectedFarmer.lat}
            lon={selectedFarmer.lon}
            areaRai={selectedFarmer.areaRai}
            provinceLabel={selectedFarmer.province}
            healthScore={selectedFarmer.nasaHealthScore}
            riskSummaryText={selectedFarmer.riskStatus7DayTh}
          />
        </BottomSheetModal>
      )}
    </div>
  );
};
