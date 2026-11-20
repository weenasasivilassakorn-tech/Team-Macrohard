import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  ClipboardCheck,
  CloudSun,
  Database,
  Home,
  Languages,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { INITIAL_FARMER_RECORDS } from './data/mockFarmers';
import type {
  ActivityFeedItem,
  AlertChannel,
  AlertSubscriptionConfig,
  AppLanguage,
  AppRoleMode,
  AppScreen,
  AuthAccount,
  BaacConsoleSection,
  BaacDecisionAuditEntry,
  BaacManagementMode,
  BaacOfficerRegistrationInput,
  CreditApplicationRecord,
  CreditApplicationState,
  EmergencyAlertPopupState,
  FarmerLoanRecord,
  FarmerRegistrationInput,
  FarmPlotProfile,
  ParametricShieldState,
  PlotEvaluation,
  RegisteredUserProfile,
  ScenarioType,
} from './types/cropshield';
import {
  countUnreadActivityEvents,
  createActivityEvent,
  createSeedActivityFeed,
  prependActivityEvents,
} from './utils/activityFeed';
import {
  DEFAULT_ALERT_CONFIG,
  createAlertLogEntries,
  shouldTriggerRiskAlert,
} from './utils/alertNotifications';
import {
  SEED_ACCOUNTS,
  accountToRegisteredProfile,
  authenticateAccount,
  loadPersistedSession,
  savePersistedSession,
  updateAccountProfile,
  upsertRegisteredAccount,
} from './utils/authAccounts';
import {
  applyScenarioToBaacFarmers,
  buildBaacOfficerMascotTip,
  buildChatbotContextSummary,
  createBaacAuditEntry,
  createSeedBaacAuditLog,
  formatThaiBuddhistDateTime,
  getFarmerTrancheSchedule,
} from './utils/baacWorkbench';
import { buildCreditApplicationRecord } from './utils/creditReceiptPdf';
import { exportCreditReceiptPdf } from './utils/creditReceiptPdfExporter';
import {
  applyForecastScenario,
  createRegisteredPlotAndBaacRecord,
} from './utils/farmScenarios';
import { APP_COPY, getRiskLabel } from './utils/i18n';
import {
  DEMO_PLOTS,
  evaluatePlotProfile,
  fetchNasaPowerEvaluation,
} from './utils/nasaPower';
import { AccountSettingsScreen } from './components/AccountSettingsScreen';
import { CreditRequestModal, ParametricShieldModal } from './components/ActionModals';
import { ActivityFeedCard } from './components/ActivityFeedCard';
import { AuthScreen } from './components/AuthScreen';
import { BaacPartnerScreen } from './components/BaacPartnerScreen';
import { BottomSheetModal } from './components/BottomSheetModal';
import { EmergencyAlertModal } from './components/EmergencyAlertModal';
import { FinanceAlertsScreen } from './components/FinanceAlertsScreen';
import { FloatingAiChatbot } from './components/FloatingAiChatbot';
import { ForecastScreen } from './components/ForecastScreen';
import { HomeScreen } from './components/HomeScreen';
import { SplashLoaderScreen } from './components/SplashLoaderScreen';

export default function App() {
  const [initialSession] = useState(() => loadPersistedSession());

  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('splash') === '1') return true;
    const autoParam = params.get('autostart');
    if (autoParam === '1' || autoParam === 'baac') return false;
    return true;
  });

  useEffect(() => {
    if (!showSplash) return;
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('splash') === '1'
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1250);
    return () => window.clearTimeout(timer);
  }, [showSplash]);

  const [accounts, setAccounts] = useState<AuthAccount[]>(
    () => initialSession?.accounts ?? SEED_ACCOUNTS
  );

  const [activeAccount, setActiveAccount] = useState<AuthAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const autoParam = new URLSearchParams(window.location.search).get('autostart');
      if (autoParam === 'baac') {
        return SEED_ACCOUNTS.find((a) => a.role === 'baac') ?? SEED_ACCOUNTS[2];
      }
      if (autoParam === '1') {
        return SEED_ACCOUNTS[0];
      }
    }
    if (initialSession?.activeAccountId) {
      const pool = initialSession.accounts ?? SEED_ACCOUNTS;
      return pool.find((a) => a.id === initialSession.activeAccountId) ?? null;
    }
    return null;
  });

  const [loginError, setLoginError] = useState<string>('');
  const [lang, setLang] = useState<AppLanguage>('th');
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
  const [baacSection, setBaacSection] = useState<BaacConsoleSection>('console');
  const [baacScenario, setBaacScenario] = useState<ScenarioType>('normal');
  const roleMode: AppRoleMode = activeAccount?.role ?? 'farmer';
  const [demoMode, setDemoMode] = useState<boolean>(true);

  const [plots, setPlots] = useState<FarmPlotProfile[]>(() => {
    const custom = initialSession?.customPlots ?? [];
    return [...custom, ...DEMO_PLOTS];
  });

  const [selectedPlotId, setSelectedPlotId] = useState<string>(() => {
    if (activeAccount?.linkedPlotId) {
      const custom = initialSession?.customPlots ?? [];
      const all = [...custom, ...DEMO_PLOTS];
      if (all.some((p) => p.id === activeAccount.linkedPlotId)) {
        return activeAccount.linkedPlotId;
      }
    }
    return DEMO_PLOTS[0].id;
  });

  const [scenarioByPlot, setScenarioByPlot] = useState<Record<string, ScenarioType>>({});
  const [isUpdatingNasa, setIsUpdatingNasa] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [justRegisteredBanner, setJustRegisteredBanner] = useState<boolean>(false);

  const [registeredUser, setRegisteredUser] = useState<RegisteredUserProfile>(() =>
    activeAccount
      ? accountToRegisteredProfile(activeAccount)
      : accountToRegisteredProfile(SEED_ACCOUNTS[0])
  );

  const selectedPlot =
    plots.find((p) => p.id === selectedPlotId) ?? plots[0];
  const currentScenario: ScenarioType = scenarioByPlot[selectedPlot.id] ?? 'normal';

  const [evaluationsByPlot, setEvaluationsByPlot] = useState<
    Record<string, PlotEvaluation>
  >(() => {
    const initial: Record<string, PlotEvaluation> = {};
    const custom = initialSession?.customPlots ?? [];
    for (const plot of [...custom, ...DEMO_PLOTS]) {
      initial[plot.id] = evaluatePlotProfile(
        plot,
        'demo',
        'ข้อมูลจำลองพร้อมใช้งาน'
      );
    }
    return initial;
  });

  const [creditByPlot, setCreditByPlot] = useState<
    Record<string, CreditApplicationState>
  >({});
  const [shieldByPlot, setShieldByPlot] = useState<
    Record<string, ParametricShieldState>
  >({});
  const [farmerRecords, setFarmerRecords] = useState<FarmerLoanRecord[]>(() => {
    const custom = initialSession?.customFarmerRecords ?? [];
    return [...custom, ...INITIAL_FARMER_RECORDS];
  });
  const [baacAuditLog, setBaacAuditLog] = useState<BaacDecisionAuditEntry[]>(
    () =>
      initialSession?.baacAuditLog && initialSession.baacAuditLog.length > 0
        ? initialSession.baacAuditLog
        : createSeedBaacAuditLog(INITIAL_FARMER_RECORDS)
  );

  const [alertConfig, setAlertConfig] = useState<AlertSubscriptionConfig>(() => ({
    ...DEFAULT_ALERT_CONFIG,
    phoneNumber: activeAccount?.phoneNumber ?? DEFAULT_ALERT_CONFIG.phoneNumber,
    lineAccountLabel: activeAccount
      ? accountToRegisteredProfile(activeAccount).lineAccountLabel
      : DEFAULT_ALERT_CONFIG.lineAccountLabel,
  }));
  const [creditHistory, setCreditHistory] = useState<CreditApplicationRecord[]>(
    () => initialSession?.creditHistory ?? []
  );
  const [emergencyPopupEnabled, setEmergencyPopupEnabled] = useState<boolean>(
    () => initialSession?.emergencyPopupEnabled ?? true
  );
  const [emergencyPopup, setEmergencyPopup] =
    useState<EmergencyAlertPopupState | null>(null);
  const [latestAutoAlertNotice, setLatestAutoAlertNotice] = useState<string>('');
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>(() => {
    if (initialSession?.activityFeed && initialSession.activityFeed.length > 0) {
      return initialSession.activityFeed;
    }
    const seedPlot = selectedPlot;
    const seedEval =
      evaluationsByPlot[seedPlot.id] ??
      evaluatePlotProfile(seedPlot, 'demo', 'ข้อมูลจำลองพร้อมใช้งาน');
    return createSeedActivityFeed(seedPlot, seedEval, registeredUser);
  });

  const recordActivity = useCallback(
    (params: Parameters<typeof createActivityEvent>[0]) => {
      const entry = createActivityEvent(params);
      setActivityFeed((prev) => prependActivityEvents(prev, entry));
    },
    []
  );

  const [lastReadActivityMs, setLastReadActivityMs] = useState<number>(
    () => initialSession?.lastReadActivityMs ?? 0
  );
  const [modalUnreadSnapshotMs, setModalUnreadSnapshotMs] = useState<number>(0);

  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [shieldModalOpen, setShieldModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  useEffect(() => {
    savePersistedSession({
      activeAccountId: activeAccount?.id ?? null,
      accounts,
      customPlots: plots.filter(
        (p) => !DEMO_PLOTS.some((demo) => demo.id === p.id)
      ),
      customFarmerRecords: farmerRecords.filter(
        (r) => !INITIAL_FARMER_RECORDS.some((init) => init.id === r.id)
      ),
      activityFeed,
      lastReadActivityMs,
      creditHistory,
      emergencyPopupEnabled,
      baacAuditLog,
    });
  }, [
    accounts,
    activeAccount,
    activityFeed,
    baacAuditLog,
    creditHistory,
    emergencyPopupEnabled,
    farmerRecords,
    lastReadActivityMs,
    plots,
  ]);

  const dispatchEscalationAlertsIfNeeded = useCallback(
    (
      plotObj: FarmPlotProfile,
      prevRisk: PlotEvaluation['riskLevel'] | null,
      nextEvaluation: PlotEvaluation,
      configOverride?: AlertSubscriptionConfig,
      triggerType: 'auto-transition' | 'manual-test' = 'auto-transition'
    ) => {
      const cfg = configOverride ?? alertConfig;
      const shouldNotifyLineSms = shouldTriggerRiskAlert(
        prevRisk,
        nextEvaluation.riskLevel,
        cfg
      );
      const isRiskAlert =
        nextEvaluation.riskLevel === 'watch' ||
        nextEvaluation.riskLevel === 'critical';
      const didEscalate = prevRisk !== nextEvaluation.riskLevel;

      const newEntries = shouldNotifyLineSms
        ? createAlertLogEntries(
            plotObj,
            nextEvaluation,
            prevRisk!,
            cfg,
            triggerType
          )
        : [];

      const channelsSent = newEntries.map(
        (e) => `${e.channel.toUpperCase()} (${e.recipient})`
      );

      if (newEntries.length > 0) {
        const channelText = channelsSent.join(lang === 'th' ? ' และ ' : ' & ');
        const plotTitle =
          lang === 'en' && plotObj.nameEn ? plotObj.nameEn : plotObj.name;
        const riskText = getRiskLabel(nextEvaluation.riskLevel, lang);

        if (!emergencyPopupEnabled) {
          setLatestAutoAlertNotice(
            lang === 'th'
              ? `ตรวจพบความเสี่ยงของ "${plotTitle}" เปลี่ยนเป็น ${riskText} (${nextEvaluation.healthScore}/100) ส่งแจ้งเตือนไปยัง ${channelText} แล้ว`
              : `Risk alert for "${plotTitle}" escalated to ${riskText} (${nextEvaluation.healthScore}/100). Dispatched to ${channelText}.`
          );
        }

        recordActivity({
          category: 'alert',
          plotId: plotObj.id,
          titleTh: `ส่งแจ้งเตือนความเสี่ยง (${nextEvaluation.riskLabelTh})`,
          titleEn: `Alert Dispatched (${nextEvaluation.riskLabelEn ?? nextEvaluation.riskLabelTh})`,
          detailTh: `${plotObj.name} · ส่งผ่าน ${newEntries.map((e) => e.channel.toUpperCase()).join(' และ ')} (${nextEvaluation.healthScore}/100)`,
          detailEn: `${plotObj.nameEn ?? plotObj.name} · via ${newEntries.map((e) => e.channel.toUpperCase()).join(' & ')} (${nextEvaluation.healthScore}/100)`,
        });
      }

      if (
        triggerType === 'manual-test' ||
        (emergencyPopupEnabled && isRiskAlert && (didEscalate || prevRisk === null))
      ) {
        const timeLabel = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setEmergencyPopup({
          id: `popup-${Date.now()}`,
          plotId: plotObj.id,
          plotName: plotObj.name,
          plotNameEn: plotObj.nameEn,
          cropType: plotObj.cropType,
          cropTypeEn: plotObj.cropTypeEn,
          riskLevel: nextEvaluation.riskLevel,
          healthScore: nextEvaluation.healthScore,
          headlineTh: nextEvaluation.earlyWarning.titleTh,
          headlineEn:
            nextEvaluation.earlyWarning.titleEn ??
            nextEvaluation.earlyWarning.titleTh,
          messageTh: nextEvaluation.earlyWarning.messageTh,
          messageEn:
            nextEvaluation.earlyWarning.messageEn ??
            nextEvaluation.earlyWarning.messageTh,
          actionHintTh: nextEvaluation.earlyWarning.actionSummaryTh,
          actionHintEn:
            nextEvaluation.earlyWarning.actionSummaryEn ??
            nextEvaluation.earlyWarning.actionSummaryTh,
          channelsSent,
          timestampLabel: lang === 'th' ? `${timeLabel} น.` : timeLabel,
        });
      }
    },
    [alertConfig, emergencyPopupEnabled, lang, recordActivity]
  );

  const handleRefreshNasa = useCallback(
    async (overrideDemoMode?: boolean) => {
      const effectiveDemo =
        typeof overrideDemoMode === 'boolean' ? overrideDemoMode : demoMode;
      setIsUpdatingNasa(true);
      const prevRisk = evaluationsByPlot[selectedPlot.id]?.riskLevel ?? null;
      const result = await fetchNasaPowerEvaluation(selectedPlot, effectiveDemo);
      const scenarioForecast = applyForecastScenario(result.forecast, currentScenario);
      const finalEval =
        currentScenario === 'normal'
          ? result
          : evaluatePlotProfile(
              selectedPlot,
              result.dataSource,
              result.lastUpdatedLabel,
              scenarioForecast,
              result.nasaWeatherTelemetry
            );

      setEvaluationsByPlot((prev) => ({
        ...prev,
        [selectedPlot.id]: finalEval,
      }));
      recordActivity({
        category: prevRisk && prevRisk !== finalEval.riskLevel ? 'status' : 'nasa',
        plotId: selectedPlot.id,
        titleTh: `อัปเดตข้อมูลดาวเทียม NASA (${finalEval.healthScore}/100)`,
        titleEn: `NASA Satellite Sync (${finalEval.healthScore}/100)`,
        detailTh: `${selectedPlot.name} · ${finalEval.riskLabelTh}`,
        detailEn: `${selectedPlot.nameEn ?? selectedPlot.name} · ${finalEval.riskLabelEn ?? finalEval.riskLabelTh}`,
      });
      dispatchEscalationAlertsIfNeeded(
        selectedPlot,
        prevRisk,
        finalEval,
        undefined,
        'auto-transition'
      );
      setIsUpdatingNasa(false);
    },
    [
      currentScenario,
      demoMode,
      dispatchEscalationAlertsIfNeeded,
      evaluationsByPlot,
      recordActivity,
      selectedPlot,
    ]
  );

  useEffect(() => {
    if (!demoMode) {
      void handleRefreshNasa(false);
    }
  }, [demoMode, selectedPlotId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleDemoMode = () => {
    const nextDemo = !demoMode;
    setDemoMode(nextDemo);
    if (nextDemo) {
      const scenarioForecast = applyForecastScenario(
        selectedPlot.forecast,
        currentScenario
      );
      setEvaluationsByPlot((prev) => ({
        ...prev,
        [selectedPlot.id]: evaluatePlotProfile(
          selectedPlot,
          'demo',
          lang === 'th' ? 'ข้อมูลจำลองพร้อมใช้งาน' : 'Demo dataset active',
          currentScenario === 'normal' ? undefined : scenarioForecast
        ),
      }));
    }
  };

  const handleChangeScenario = (nextScenario: ScenarioType) => {
    const prevEval =
      evaluationsByPlot[selectedPlot.id] ??
      evaluatePlotProfile(selectedPlot, 'demo', 'Demo');
    setScenarioByPlot((prev) => ({ ...prev, [selectedPlot.id]: nextScenario }));

    const nextForecast = applyForecastScenario(selectedPlot.forecast, nextScenario);
    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const nextEval = evaluatePlotProfile(
      selectedPlot,
      demoMode ? 'demo' : prevEval.dataSource,
      nextScenario === 'normal'
        ? lang === 'th'
          ? 'สถานการณ์ปกติ'
          : 'Normal outlook'
        : `${lang === 'th' ? 'จำลองสถานการณ์' : 'Scenario'} ${timeStr}`,
      nextScenario === 'normal' ? undefined : nextForecast,
      prevEval.nasaWeatherTelemetry
    );

    setEvaluationsByPlot((prev) => ({
      ...prev,
      [selectedPlot.id]: nextEval,
    }));

    if (prevEval.riskLevel !== nextEval.riskLevel || nextScenario !== 'normal') {
      recordActivity({
        category: 'status',
        plotId: selectedPlot.id,
        titleTh: `สถานะแปลงเปลี่ยนเป็น ${nextEval.riskLabelTh} (${nextEval.healthScore}/100)`,
        titleEn: `Plot Status Changed to ${nextEval.riskLabelEn ?? nextEval.riskLabelTh} (${nextEval.healthScore}/100)`,
        detailTh: `${selectedPlot.name} · โหมด ${nextScenario === 'normal' ? 'ปกติ' : nextScenario === 'drought' ? 'จำลองแล้ง 7 วัน' : 'จำลองเสี่ยงน้ำท่วม'}`,
        detailEn: `${selectedPlot.nameEn ?? selectedPlot.name} · ${nextScenario === 'normal' ? 'Normal' : nextScenario === 'drought' ? '7-Day Drought' : 'Flood Risk'} scenario`,
      });
    }

    if (nextScenario !== 'normal') {
      dispatchEscalationAlertsIfNeeded(
        selectedPlot,
        prevEval.riskLevel,
        nextEval,
        undefined,
        'auto-transition'
      );
    } else {
      setLatestAutoAlertNotice('');
    }
  };

  const handleSimulateRiskTransition = () => {
    const droughtForecast = applyForecastScenario(selectedPlot.forecast, 'drought');
    setScenarioByPlot((prev) => ({ ...prev, [selectedPlot.id]: 'drought' }));
    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const simulatedEval = evaluatePlotProfile(
      selectedPlot,
      'demo',
      `${lang === 'th' ? 'ทดสอบแจ้งเตือน' : 'Alert test'} ${timeStr}`,
      droughtForecast
    );
    setEvaluationsByPlot((prev) => ({
      ...prev,
      [selectedPlot.id]: simulatedEval,
    }));
    recordActivity({
      category: 'status',
      plotId: selectedPlot.id,
      titleTh: `ทดสอบสถานะเปลี่ยนเป็น ${simulatedEval.riskLabelTh} (${simulatedEval.healthScore}/100)`,
      titleEn: `Simulated Status Escalation: ${simulatedEval.riskLabelEn ?? simulatedEval.riskLabelTh}`,
      detailTh: `${selectedPlot.name} · ทดสอบเงื่อนไขภัยแล้งล่วงหน้า`,
      detailEn: `${selectedPlot.nameEn ?? selectedPlot.name} · Drought alert simulation`,
    });
    dispatchEscalationAlertsIfNeeded(
      selectedPlot,
      'low',
      simulatedEval,
      undefined,
      'manual-test'
    );
  };

  const applyAuthenticatedAccount = useCallback(
    (account: AuthAccount) => {
      const profile = accountToRegisteredProfile(account);
      setActiveAccount(account);
      setRegisteredUser(profile);
      setLoginError('');
      setActiveScreen('home');
      setBaacSection('console');
      setJustRegisteredBanner(false);
      setAlertConfig((prev) => ({
        ...prev,
        phoneNumber: account.phoneNumber,
        lineAccountLabel: profile.lineAccountLabel,
      }));
      if (account.linkedPlotId && plots.some((p) => p.id === account.linkedPlotId)) {
        setSelectedPlotId(account.linkedPlotId);
      }
    },
    [plots]
  );

  const handleLogin = (identifier: string, pin: string) => {
    const result = authenticateAccount(accounts, identifier, pin, lang);
    if (!result.account) {
      setLoginError(result.error ?? '');
      return;
    }
    applyAuthenticatedAccount(result.account);
    recordActivity({
      category: 'account',
      plotId: result.account.linkedPlotId,
      titleTh: `เข้าสู่ระบบ: ${result.account.fullName}`,
      titleEn: `Signed In: ${result.account.fullName}`,
      detailTh: `${result.account.role === 'baac' ? 'เจ้าหน้าที่สินเชื่อ ธ.ก.ส.' : 'เกษตรกร'} · ${result.account.phoneNumber}`,
      detailEn: `${result.account.role === 'baac' ? 'BAAC Credit Officer' : 'Farmer'} · ${result.account.phoneNumber}`,
    });
  };

  const handleQuickDemoLogin = (account: AuthAccount) => {
    applyAuthenticatedAccount(account);
    recordActivity({
      category: 'account',
      plotId: account.linkedPlotId,
      titleTh: `สลับบัญชีทดลอง: ${account.fullName}`,
      titleEn: `Demo Account Sign-In: ${account.fullName}`,
      detailTh: `${account.role === 'baac' ? 'เจ้าหน้าที่สินเชื่อ ธ.ก.ส.' : 'เกษตรกร'} · ${account.phoneNumber}`,
      detailEn: `${account.role === 'baac' ? 'BAAC Credit Officer' : 'Farmer'} · ${account.phoneNumber}`,
    });
  };

  const handleLogout = () => {
    setActiveAccount(null);
    setActiveScreen('home');
    setBaacSection('console');
    setLoginError('');
    setLatestAutoAlertNotice('');
    setJustRegisteredBanner(false);
  };

  const handleRegisterFarmer = async (input: FarmerRegistrationInput) => {
    setIsRegistering(true);
    const { plot: newPlot, baacRecord } = createRegisteredPlotAndBaacRecord(input);

    // Run real NASA POWER fetch for the registered Lat/Lon alongside brief minimum UX feedback
    const [nasaEval] = await Promise.all([
      fetchNasaPowerEvaluation(newPlot, false),
      new Promise((resolve) => setTimeout(resolve, 650)),
    ]);

    const syncedPlot: FarmPlotProfile = {
      ...newPlot,
      baselineScore: nasaEval.healthScore,
      forecast: nasaEval.forecast,
    };

    const syncedBaacRecord: FarmerLoanRecord = {
      ...baacRecord,
      nasaHealthScore: nasaEval.healthScore,
      riskLevel: nasaEval.riskLevel,
      riskStatus7DayTh: nasaEval.riskLabelTh,
    };

    const { accounts: nextAccounts, account: newAccount } = upsertRegisteredAccount(
      accounts,
      {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        pin: input.passwordPin || '1234',
        linkedPlotId: syncedPlot.id,
      }
    );

    const updatedPhone = input.phoneNumber.trim();
    const updatedLineHandle = `@CropShield-${input.fullName.trim().split(/\s+/)[0] || 'Farmer'}`;
    const nextAlertConfig: AlertSubscriptionConfig = {
      ...alertConfig,
      enabled: true,
      phoneNumber: updatedPhone,
      lineAccountLabel: updatedLineHandle,
    };

    setAccounts(nextAccounts);
    setActiveAccount(newAccount);
    setPlots((prev) => [syncedPlot, ...prev]);
    setSelectedPlotId(syncedPlot.id);
    setScenarioByPlot((prev) => ({ ...prev, [syncedPlot.id]: 'normal' }));
    setEvaluationsByPlot((prev) => ({ ...prev, [syncedPlot.id]: nasaEval }));
    setFarmerRecords((prev) => [syncedBaacRecord, ...prev]);
    setAlertConfig(nextAlertConfig);

    setRegisteredUser({
      accountId: newAccount.id,
      role: 'farmer',
      fullName: input.fullName.trim(),
      phoneNumber: updatedPhone,
      lineAccountLabel: updatedLineHandle,
      registeredAtLabel: new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isCustomRegistered: true,
    });

    dispatchEscalationAlertsIfNeeded(
      syncedPlot,
      'low',
      nasaEval,
      nextAlertConfig,
      'auto-transition'
    );

    setIsRegistering(false);
    setJustRegisteredBanner(true);
    setActiveScreen('home');
    recordActivity({
      category: 'account',
      plotId: syncedPlot.id,
      titleTh: `ลงทะเบียนแปลงใหม่: ${syncedPlot.name}`,
      titleEn: `Registered Plot: ${syncedPlot.nameEn ?? syncedPlot.name}`,
      detailTh: `เกษตรกร ${input.fullName.trim()} (${input.areaRai} ไร่) · คะแนนเริ่มต้น ${nasaEval.healthScore}/100`,
      detailEn: `Farmer ${input.fullName.trim()} (${input.areaRai} Rai) · Initial Score ${nasaEval.healthScore}/100`,
    });
  };

  const handleRegisterBaacOfficer = async (input: BaacOfficerRegistrationInput) => {
    setIsRegistering(true);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const { accounts: nextAccounts, account: newOfficer } = upsertRegisteredAccount(
      accounts,
      {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        pin: input.passwordPin || '1234',
        role: 'baac',
        identifier: input.officerIdentifier,
        branchName: input.branchName,
        employeeCode: input.employeeCode,
      }
    );

    const updatedPhone = input.phoneNumber.trim();
    setAccounts(nextAccounts);
    setActiveAccount(newOfficer);
    setRegisteredUser({
      accountId: newOfficer.id,
      role: 'baac',
      fullName: input.fullName.trim(),
      phoneNumber: updatedPhone,
      lineAccountLabel: '@CropShield-BAAC',
      registeredAtLabel: new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isCustomRegistered: true,
      branchName: input.branchName.trim(),
      employeeCode: input.employeeCode.trim(),
    });

    recordActivity({
      category: 'account',
      titleTh: `ลงทะเบียนเจ้าหน้าที่ ธ.ก.ส.: ${input.fullName.trim()}`,
      titleEn: `Registered BAAC Officer: ${input.fullName.trim()}`,
      detailTh: `${input.branchName.trim()} · รหัส ${input.employeeCode.trim()}`,
      detailEn: `${input.branchName.trim()} · ID ${input.employeeCode.trim()}`,
    });

    setIsRegistering(false);
    setJustRegisteredBanner(false);
    setBaacSection('console');
    setActiveScreen('home');
  };

  const handleUpdateAccountSettings = (updates: {
    fullName: string;
    phoneNumber: string;
    lineAccountLabel: string;
    branchName?: string;
    employeeCode?: string;
    alertChannel: AlertChannel;
    alertsEnabled: boolean;
  }) => {
    if (!activeAccount) return;
    const { accounts: nextAccounts, updatedAccount } = updateAccountProfile(
      accounts,
      activeAccount.id,
      {
        fullName: updates.fullName,
        phoneNumber: updates.phoneNumber,
        lineAccountLabel: updates.lineAccountLabel,
        branchName: updates.branchName,
        employeeCode: updates.employeeCode,
      }
    );
    if (!updatedAccount) return;

    setAccounts(nextAccounts);
    setActiveAccount(updatedAccount);
    setRegisteredUser(accountToRegisteredProfile(updatedAccount));
    setAlertConfig((prev) => ({
      ...prev,
      enabled: updates.alertsEnabled,
      channel: updates.alertChannel,
      phoneNumber: updatedAccount.phoneNumber,
      lineAccountLabel: updates.lineAccountLabel.trim(),
    }));
    recordActivity({
      category: 'account',
      plotId: selectedPlot.id,
      titleTh: `อัปเดตการตั้งค่าบัญชี: ${updatedAccount.fullName}`,
      titleEn: `Account Settings Updated: ${updatedAccount.fullName}`,
      detailTh: `${updatedAccount.phoneNumber} · ${updates.lineAccountLabel.trim()}`,
      detailEn: `${updatedAccount.phoneNumber} · ${updates.lineAccountLabel.trim()}`,
    });
  };

  const handleSubmitCredit = (
    amountThb: number,
    purposeTh: string
  ): CreditApplicationRecord => {
    const evalForPlot =
      evaluationsByPlot[selectedPlot.id] ??
      evaluatePlotProfile(selectedPlot, 'demo', 'ข้อมูลจำลองพร้อมใช้งาน');
    const newRecord = buildCreditApplicationRecord({
      plot: selectedPlot,
      evaluation: evalForPlot,
      user: registeredUser,
      amountThb,
      purposeTh,
      existingCount: creditHistory.length,
      lang,
    });

    setCreditHistory((prev) => [newRecord, ...prev]);
    setCreditByPlot((prev) => ({
      ...prev,
      [selectedPlot.id]: {
        status: 'submitted',
        requestedAmountThb: amountThb,
        purposeTh,
        submittedAtLabel:
          lang === 'th'
            ? `อนุมัติแล้ว (${newRecord.receiptNumber})`
            : `Approved (${newRecord.receiptNumber})`,
      },
    }));
    recordActivity({
      category: 'credit',
      plotId: selectedPlot.id,
      titleTh: `อนุมัติวงเงินสินเชื่อหมุนเวียน ฿${amountThb.toLocaleString('en-US')} (${newRecord.receiptNumber})`,
      titleEn: `Working Credit Approved (฿${amountThb.toLocaleString('en-US')} · ${newRecord.receiptNumber})`,
      detailTh: `${selectedPlot.name} · ${purposeTh || 'เสริมสภาพคล่องระบบน้ำและปัจจัยการผลิต'}`,
      detailEn: `${selectedPlot.nameEn ?? selectedPlot.name} · ${purposeTh || 'Supplemental irrigation & farm input capital'}`,
    });
    return newRecord;
  };

  const handleDownloadCreditReceipt = async (
    record: CreditApplicationRecord
  ) => {
    const filename = await exportCreditReceiptPdf(record, lang);
    recordActivity({
      category: 'credit',
      plotId: record.plotId,
      titleTh: `ดาวน์โหลดใบเสร็จสินเชื่อ PDF (${record.receiptNumber})`,
      titleEn: `Downloaded Credit Receipt PDF (${record.receiptNumber})`,
      detailTh: `${record.plotName} · ${filename}`,
      detailEn: `${record.plotNameEn ?? record.plotName} · ${filename}`,
    });
  };

  const handleActivateShield = () => {
    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setShieldByPlot((prev) => ({
      ...prev,
      [selectedPlot.id]: {
        active: true,
        activatedAtLabel:
          lang === 'th' ? `เปิดใช้งาน ${timeStr} น.` : `Activated ${timeStr}`,
        coverageThb: selectedPlot.parametricCoverageThb,
        triggerConditionTh: selectedPlot.parametricTriggerTh,
      },
    }));
    recordActivity({
      category: 'shield',
      plotId: selectedPlot.id,
      titleTh: `เปิดใช้งานประกันภัย Parametric Shield (฿${selectedPlot.parametricCoverageThb.toLocaleString('en-US')})`,
      titleEn: `Parametric Shield Activated (฿${selectedPlot.parametricCoverageThb.toLocaleString('en-US')})`,
      detailTh: `${selectedPlot.name} · ${selectedPlot.parametricTriggerTh}`,
      detailEn: `${selectedPlot.nameEn ?? selectedPlot.name} · ${selectedPlot.parametricTriggerEn ?? selectedPlot.parametricTriggerTh}`,
    });
  };

  const handleApproveNextTranche = (
    farmerId: string,
    creditMode: BaacManagementMode = 'phased-tranche',
    minHealthScore: number = 70
  ) => {
    const target = farmerRecords.find((r) => r.id === farmerId);
    const stamp = formatThaiBuddhistDateTime(new Date(), lang);
    setFarmerRecords((prev) =>
      prev.map((record) => {
        if (record.id !== farmerId) return record;
        const nextTranche = Math.min(
          record.totalTranches,
          record.currentTranche + 1
        );
        const schedule = getFarmerTrancheSchedule(record).map((item) => {
          if (item.trancheNumber === nextTranche) {
            return {
              ...item,
              status: 'approved' as const,
              timestampLabel:
                lang === 'th'
                  ? `อนุมัติแล้ว · ${stamp}`
                  : `Approved · ${stamp}`,
            };
          }
          if (
            item.trancheNumber === nextTranche + 1 &&
            item.status === 'scheduled'
          ) {
            return {
              ...item,
              status: 'pending' as const,
            };
          }
          return item;
        });
        return {
          ...record,
          currentTranche: nextTranche,
          trancheSchedule: schedule,
          loanStatus:
            nextTranche === record.totalTranches
              ? 'อนุมัติงวดที่ 1 แล้ว'
              : 'พร้อมปล่อยงวดที่ 2',
          officerActionTaken:
            lang === 'th'
              ? creditMode === 'pre-approved-revolving'
                ? `อนุมัติวงเงินหมุนเวียน (งวดที่ ${nextTranche}) เมื่อ ${stamp}`
                : `อนุมัติเบิกจ่ายงวดที่ ${nextTranche} สำเร็จเมื่อ ${stamp}`
              : `Approved Tranche #${nextTranche} at ${stamp}`,
        };
      })
    );
    if (target) {
      const nextT = Math.min(target.totalTranches, target.currentTranche + 1);
      const audit = createBaacAuditEntry({
        officerName: registeredUser.fullName,
        record: target,
        actionType: 'approve-tranche',
        minHealthScore,
        lang,
      });
      setBaacAuditLog((prev) => [audit, ...prev]);
      recordActivity({
        category: 'credit',
        titleTh: `ธ.ก.ส. อนุมัติงวดที่ ${nextT}: ${target.farmerName}`,
        titleEn: `BAAC Approved Tranche #${nextT}: ${target.farmerName}`,
        detailTh: `วงเงิน ฿${target.loanLimitThb.toLocaleString('en-US')} · ${stamp}`,
        detailEn: `Limit ฿${target.loanLimitThb.toLocaleString('en-US')} · ${stamp}`,
      });
    }
  };

  const handleHoldCredit = (farmerId: string, minHealthScore: number = 70) => {
    const target = farmerRecords.find((r) => r.id === farmerId);
    const stamp = formatThaiBuddhistDateTime(new Date(), lang);
    setFarmerRecords((prev) =>
      prev.map((record) => {
        if (record.id !== farmerId) return record;
        const targetTranche = Math.min(
          record.totalTranches,
          record.currentTranche + 1
        );
        const schedule = getFarmerTrancheSchedule(record).map((item) =>
          item.trancheNumber === targetTranche && item.status !== 'approved'
            ? {
                ...item,
                status: 'held' as const,
                timestampLabel:
                  lang === 'th'
                    ? `ชะลอวงเงิน · ${stamp}`
                    : `Held · ${stamp}`,
              }
            : item
        );
        return {
          ...record,
          trancheSchedule: schedule,
          loanStatus: 'ชะลอวงเงินชั่วคราว',
          officerActionTaken:
            lang === 'th'
              ? `ชะลอวงเงินงวดที่ ${targetTranche} ชั่วคราวเมื่อ ${stamp}`
              : `Credit release placed on hold at ${stamp}`,
        };
      })
    );
    if (target) {
      const audit = createBaacAuditEntry({
        officerName: registeredUser.fullName,
        record: target,
        actionType: 'hold-credit',
        minHealthScore,
        lang,
      });
      setBaacAuditLog((prev) => [audit, ...prev]);
      recordActivity({
        category: 'credit',
        titleTh: `ธ.ก.ส. ชะลอวงเงินชั่วคราว: ${target.farmerName}`,
        titleEn: `BAAC Credit Hold: ${target.farmerName}`,
        detailTh: `คะแนน NASA ${target.nasaHealthScore}/100 · ${stamp}`,
        detailEn: `NASA Score ${target.nasaHealthScore}/100 · ${stamp}`,
      });
    }
  };

  const handleTriggerInsurance = (
    farmerId: string,
    minHealthScore: number = 70
  ) => {
    const target = farmerRecords.find((r) => r.id === farmerId);
    const stamp = formatThaiBuddhistDateTime(new Date(), lang);
    setFarmerRecords((prev) =>
      prev.map((record) => {
        if (record.id !== farmerId) return record;
        return {
          ...record,
          hasParametricInsurance: true,
          officerActionTaken:
            lang === 'th'
              ? `ทริกเกอร์ประกันภัย Parametric Shield สำเร็จเมื่อ ${stamp}`
              : `Parametric Shield triggered at ${stamp}`,
        };
      })
    );
    if (target) {
      const audit = createBaacAuditEntry({
        officerName: registeredUser.fullName,
        record: target,
        actionType: 'trigger-insurance',
        minHealthScore,
        lang,
      });
      setBaacAuditLog((prev) => [audit, ...prev]);
      recordActivity({
        category: 'shield',
        titleTh: `ธ.ก.ส. ทริกเกอร์ประกันภัย: ${target.farmerName}`,
        titleEn: `BAAC Triggered Parametric Shield: ${target.farmerName}`,
        detailTh: `คะแนน NASA ${target.nasaHealthScore}/100 · ${stamp}`,
        detailEn: `NASA Score ${target.nasaHealthScore}/100 · ${stamp}`,
      });
    }
  };

  const handleSendSmsAlertToFarmer = (
    farmerId: string,
    minHealthScore: number = 70,
    customMessage?: string
  ) => {
    const target = farmerRecords.find((r) => r.id === farmerId);
    const stamp = formatThaiBuddhistDateTime(new Date(), lang);
    const phoneDisplay = target?.phoneNumber ?? '08x-xxx-xxxx';
    setFarmerRecords((prev) =>
      prev.map((record) => {
        if (record.id !== farmerId) return record;
        return {
          ...record,
          lastSmsSentLabel:
            lang === 'th'
              ? `ส่ง SMS สำเร็จเมื่อ ${stamp}`
              : `SMS sent at ${stamp}`,
          lastSmsMessage: customMessage ?? record.lastSmsMessage,
          officerActionTaken:
            lang === 'th'
              ? `ส่ง SMS แจ้งเตือน (${phoneDisplay}) สำเร็จเมื่อ ${stamp}`
              : `SMS sent to ${phoneDisplay} at ${stamp}`,
        };
      })
    );
    if (target) {
      const audit = createBaacAuditEntry({
        officerName: registeredUser.fullName,
        record: target,
        actionType: 'send-sms',
        minHealthScore,
        lang,
      });
      setBaacAuditLog((prev) => [audit, ...prev]);
      recordActivity({
        category: 'alert',
        titleTh: `ธ.ก.ส. ส่ง SMS แจ้งเตือน: ${target.farmerName}`,
        titleEn: `BAAC Sent SMS Alert: ${target.farmerName}`,
        detailTh: `ส่งไปยัง ${phoneDisplay} · ${stamp}`,
        detailEn: `Sent to ${phoneDisplay} · ${stamp}`,
      });
    }
  };

  const handleBatchApproveTranche = (
    farmerIds: string[],
    mode: BaacManagementMode,
    minHealthScore: number
  ) => {
    const idSet = new Set(farmerIds);
    const targets = farmerRecords.filter((r) => idSet.has(r.id));
    if (targets.length === 0) return;

    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setFarmerRecords((prev) =>
      prev.map((record) => {
        if (!idSet.has(record.id)) return record;
        const nextTranche = Math.min(
          record.totalTranches,
          record.currentTranche + 1
        );
        return {
          ...record,
          currentTranche: nextTranche,
          loanStatus:
            nextTranche === record.totalTranches
              ? 'อนุมัติงวดที่ 1 แล้ว'
              : 'พร้อมปล่อยงวดที่ 2',
          officerActionTaken:
            lang === 'th'
              ? mode === 'pre-approved-revolving'
                ? `อนุมัติวงเงินหมุนเวียนแบบกลุ่ม (งวด ${nextTranche}) · ${timeStr} น.`
                : `อนุมัติงวดแบบกลุ่ม (งวดที่ ${nextTranche}) สำเร็จ · ${timeStr} น.`
              : `Batch approved Tranche #${nextTranche} · ${timeStr}`,
        };
      })
    );

    const newAudits = targets.map((t) =>
      createBaacAuditEntry({
        officerName: registeredUser.fullName,
        record: t,
        actionType: 'approve-tranche',
        minHealthScore,
        batchCount: targets.length,
        lang,
      })
    );
    setBaacAuditLog((prev) => [...newAudits, ...prev]);

    recordActivity({
      category: 'credit',
      titleTh: `ธ.ก.ส. อนุมัติงวดแบบกลุ่ม (${targets.length} แปลง)`,
      titleEn: `BAAC Batch Tranche Approval (${targets.length} plots)`,
      detailTh: `อนุมัติ ${targets.map((t) => t.farmerName).slice(0, 2).join(', ')}${targets.length > 2 ? ` และอีก ${targets.length - 2} ราย` : ''}`,
      detailEn: `Batch processed ${targets.length} accounts under Min Score ${minHealthScore}`,
    });
  };

  const handleBatchSendSmsAlert = (
    farmerIds: string[],
    minHealthScore: number
  ) => {
    const idSet = new Set(farmerIds);
    const targets = farmerRecords.filter((r) => idSet.has(r.id));
    if (targets.length === 0) return;

    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setFarmerRecords((prev) =>
      prev.map((record) => {
        if (!idSet.has(record.id)) return record;
        return {
          ...record,
          loanStatus:
            record.loanStatus === 'ชะลอวงเงินชั่วคราว'
              ? 'ชะลอวงเงินชั่วคราว'
              : 'รอติดตามผลความชื้น',
          officerActionTaken:
            lang === 'th'
              ? `ส่ง SMS เตือนภัยล่วงหน้า 7 วัน (กลุ่ม) · ${timeStr} น.`
              : `Batch 7-day risk SMS sent · ${timeStr}`,
        };
      })
    );

    const newAudits = targets.map((t) =>
      createBaacAuditEntry({
        officerName: registeredUser.fullName,
        record: t,
        actionType: 'send-sms',
        minHealthScore,
        batchCount: targets.length,
        lang,
      })
    );
    setBaacAuditLog((prev) => [...newAudits, ...prev]);

    recordActivity({
      category: 'alert',
      titleTh: `ธ.ก.ส. ส่ง SMS เตือนภัยกลุ่มเสี่ยง (${targets.length} ราย)`,
      titleEn: `BAAC Batch 7-Day SMS Alert (${targets.length} farmers)`,
      detailTh: `แจ้งเตือนล่วงหน้า 7 วันพร้อมแนวทางรับมือภัยแล้ง/น้ำท่วม`,
      detailEn: `Sent 7-day climate warning SMS to ${targets.length} farmers`,
    });
  };

  const handleBatchHoldOrTriggerInsurance = (
    farmerIds: string[],
    action: 'hold-credit' | 'trigger-insurance',
    minHealthScore: number
  ) => {
    const idSet = new Set(farmerIds);
    const targets = farmerRecords.filter((r) => idSet.has(r.id));
    if (targets.length === 0) return;

    const timeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setFarmerRecords((prev) =>
      prev.map((record) => {
        if (!idSet.has(record.id)) return record;
        if (action === 'hold-credit') {
          return {
            ...record,
            loanStatus: 'ชะลอวงเงินชั่วคราว',
            officerActionTaken:
              lang === 'th'
                ? `ชะลอวงเงินเพื่อตรวจติดตาม (กลุ่ม) · ${timeStr} น.`
                : `Batch credit hold placed · ${timeStr}`,
          };
        }
        return {
          ...record,
          hasParametricInsurance: true,
          officerActionTaken:
            lang === 'th'
              ? `ทริกเกอร์ประกันภัย Parametric Shield (กลุ่ม) · ${timeStr} น.`
              : `Batch Parametric Shield triggered · ${timeStr}`,
        };
      })
    );

    const newAudits = targets.map((t) =>
      createBaacAuditEntry({
        officerName: registeredUser.fullName,
        record: t,
        actionType: action,
        minHealthScore,
        batchCount: targets.length,
        lang,
      })
    );
    setBaacAuditLog((prev) => [...newAudits, ...prev]);

    recordActivity({
      category: action === 'hold-credit' ? 'credit' : 'shield',
      titleTh:
        action === 'hold-credit'
          ? `ธ.ก.ส. ชะลอวงเงินแบบกลุ่ม (${targets.length} แปลง)`
          : `ธ.ก.ส. ทริกเกอร์ประกันภัยแบบกลุ่ม (${targets.length} แปลง)`,
      titleEn:
        action === 'hold-credit'
          ? `BAAC Batch Credit Hold (${targets.length} plots)`
          : `BAAC Batch Parametric Shield (${targets.length} plots)`,
      detailTh: `อ้างอิงเกณฑ์คะแนนขั้นต่ำ NASA ${minHealthScore}/100`,
      detailEn: `Applied under policy min score ${minHealthScore}/100`,
    });
  };

  const currentEvaluation =
    evaluationsByPlot[selectedPlot.id] ??
    evaluatePlotProfile(selectedPlot, 'demo', 'ข้อมูลจำลองพร้อมใช้งาน');

  const currentCreditState: CreditApplicationState = creditByPlot[
    selectedPlot.id
  ] ?? {
    status: 'eligible',
    requestedAmountThb: selectedPlot.recommendedWorkingCapitalThb,
    purposeTh: '',
  };

  const currentShieldState: ParametricShieldState = shieldByPlot[
    selectedPlot.id
  ] ?? {
    active: false,
    coverageThb: selectedPlot.parametricCoverageThb,
    triggerConditionTh: selectedPlot.parametricTriggerTh,
  };

  const chatbotContextSummary = useMemo(
    () =>
      buildChatbotContextSummary({
        role: roleMode,
        plot: selectedPlot,
        evaluation: currentEvaluation,
        farmers: farmerRecords,
      }),
    [currentEvaluation, farmerRecords, roleMode, selectedPlot]
  );

  const farmerMascotSpeech = useMemo(() => {
    if (lang === 'en') {
      if (currentScenario === 'drought' || currentEvaluation.riskLevel === 'critical') {
        return 'Soil is very dry—please water your field soon!';
      }
      if (currentScenario === 'flood') {
        return 'Heavy rain expected—check drainage and weather shield!';
      }
      return 'Your plot looks good today!';
    }
    if (currentScenario === 'drought' || currentEvaluation.riskLevel === 'critical') {
      return 'ช่วงนี้ดินแห้งจัด อย่าลืมเปิดน้ำเพิ่มนะครับลุง/ป้า';
    }
    if (currentScenario === 'flood') {
      return 'ช่วงนี้ฝนตกหนัก รีบเช็กทางระบายน้ำและประกันไว้เลยครับ';
    }
    return 'วันนี้แปลงยังโอเคครับลุง/ป้า';
  }, [currentEvaluation.riskLevel, currentScenario, lang]);

  const baacMascotSpeech = useMemo(
    () =>
      buildBaacOfficerMascotTip(
        applyScenarioToBaacFarmers(farmerRecords, baacScenario),
        lang
      ),
    [baacScenario, farmerRecords, lang]
  );

  const copy = APP_COPY[lang];
  const unreadActivityCount = countUnreadActivityEvents(
    activityFeed,
    lastReadActivityMs
  );

  const handleOpenActivityModal = () => {
    setModalUnreadSnapshotMs(lastReadActivityMs);
    const newestTs = activityFeed.reduce(
      (max, item) => Math.max(max, item.timestampMs),
      Date.now()
    );
    setLastReadActivityMs(newestTs);
    setActivityModalOpen(true);
  };

  const handleFarmerBottomNavClick = (screen: AppScreen) => {
    setActiveScreen(screen);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EFF6F2] text-slate-900">
      {showSplash && (
        <SplashLoaderScreen lang={lang} onEnterApp={() => setShowSplash(false)} />
      )}

      {/* Compact Sticky Mobile-First Top App Bar (52px height) */}
      <header className="sticky top-0 z-30 h-[52px] bg-white/95 backdrop-blur-md border-b border-emerald-900/10">
        <div className="max-w-6xl h-full mx-auto px-3.5 sm:px-6 flex items-center justify-between gap-2">
          {/* Brand Logo Lockup — strictly stays inside current account's role */}
          <button
            type="button"
            onClick={() => {
              if (roleMode === 'baac') {
                setBaacSection('console');
              } else {
                setActiveScreen('home');
              }
            }}
            aria-label={copy.brand}
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg py-0.5 pr-1"
          >
            <img
              src="/assets/aistudio/IMG_3569_daf0d6e4.JPG"
              alt="CropShield"
              referrerPolicy="no-referrer"
              className="h-10 sm:h-11 w-auto object-contain rounded-md"
            />
          </button>

          {/* Compact Right Utilities: Demo Toggle + Bilingual TH / EN Toggle + Top-Right Notification Bell */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              aria-pressed={demoMode}
              onClick={handleToggleDemoMode}
              className={`min-h-[34px] inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                demoMode
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-900 border-slate-900 text-white'
              }`}
            >
              <Database className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>{demoMode ? copy.demoOn : copy.demoOff}</span>
            </button>

            <div
              className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80"
              role="group"
              aria-label="Language switcher"
            >
              <button
                type="button"
                data-testid="lang-btn-th"
                onClick={() => setLang('th')}
                className={`min-h-[30px] px-2 sm:px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors whitespace-nowrap ${
                  lang === 'th'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ไทย
              </button>
              <button
                type="button"
                data-testid="lang-btn-en"
                onClick={() => setLang('en')}
                className={`min-h-[30px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors whitespace-nowrap ${
                  lang === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Languages className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>EN</span>
              </button>
            </div>

            {activeAccount && (
              <button
                type="button"
                data-testid="header-activity-bell-btn"
                onClick={handleOpenActivityModal}
                aria-label={copy.activityFeed.bellAriaLabel}
                className="relative min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
                {unreadActivityCount > 0 && (
                  <span
                    data-testid="header-activity-unread-badge"
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center ring-2 ring-white"
                  >
                    {unreadActivityCount > 9 ? '9+' : unreadActivityCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main App Viewport Content (padded cleanly above Bottom Navigation Bar when signed in) */}
      <main
        className={`flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 pt-3 ${
          activeAccount
            ? roleMode === 'baac'
              ? 'pb-36'
              : 'pb-20'
            : 'pb-10'
        }`}
      >
        {!activeAccount ? (
          <AuthScreen
            lang={lang}
            isRegistering={isRegistering}
            loginError={loginError}
            onClearLoginError={() => setLoginError('')}
            onLogin={handleLogin}
            onQuickDemoLogin={handleQuickDemoLogin}
            onRegisterFarmer={handleRegisterFarmer}
            onRegisterBaacOfficer={handleRegisterBaacOfficer}
          />
        ) : (
          <>
            {/* Global Automatic LINE / SMS Alert Notice */}
            {latestAutoAlertNotice && (
              <div
                data-testid="auto-alert-toast"
                role="status"
                className="mb-3 bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <Bell className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-amber-950 leading-relaxed">
                    {latestAutoAlertNotice}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLatestAutoAlertNotice('')}
                  aria-label="Dismiss alert"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {roleMode === 'baac' ? (
              baacSection === 'account' ? (
                <AccountSettingsScreen
                  lang={lang}
                  onChangeLang={setLang}
                  user={registeredUser}
                  alertConfig={alertConfig}
                  emergencyPopupEnabled={emergencyPopupEnabled}
                  onToggleEmergencyPopup={setEmergencyPopupEnabled}
                  onUpdateAccountSettings={handleUpdateAccountSettings}
                  onLogout={handleLogout}
                />
              ) : (
                <BaacPartnerScreen
                  lang={lang}
                  activeSection={baacSection}
                  onSelectSection={(sec) => setBaacSection(sec)}
                  officerName={registeredUser.fullName}
                  branchName={registeredUser.branchName}
                  farmers={farmerRecords}
                  auditLog={baacAuditLog}
                  scenario={baacScenario}
                  onChangeScenario={setBaacScenario}
                  onApproveNextTranche={handleApproveNextTranche}
                  onHoldCredit={handleHoldCredit}
                  onTriggerInsurance={handleTriggerInsurance}
                  onSendSmsAlert={handleSendSmsAlertToFarmer}
                  onLogout={handleLogout}
                />
              )
            ) : activeScreen === 'home' ? (
              <HomeScreen
                lang={lang}
                user={registeredUser}
                plots={plots}
                selectedPlot={selectedPlot}
                onSelectPlot={setSelectedPlotId}
                evaluation={currentEvaluation}
                scenario={currentScenario}
                onChangeScenario={handleChangeScenario}
                isUpdating={isUpdatingNasa}
                onRefreshNasa={() => void handleRefreshNasa()}
                onOpenForecastTab={() => setActiveScreen('forecast')}
                onOpenCreditModal={() => setCreditModalOpen(true)}
                onOpenShieldModal={() => setShieldModalOpen(true)}
                creditState={currentCreditState}
                shieldState={currentShieldState}
                justRegisteredBanner={justRegisteredBanner}
                onDismissRegisteredBanner={() => setJustRegisteredBanner(false)}
                onExportRiskPdf={(filename) =>
                  recordActivity({
                    category: 'credit',
                    plotId: selectedPlot.id,
                    titleTh: `ส่งออกรายงานสุขภาพแปลง PDF (${currentEvaluation.healthScore}/100)`,
                    titleEn: `Exported NASA Risk Summary PDF (${currentEvaluation.healthScore}/100)`,
                    detailTh: `${selectedPlot.name} · ${filename}`,
                    detailEn: `${selectedPlot.nameEn ?? selectedPlot.name} · ${filename}`,
                  })
                }
                onLogout={handleLogout}
              />
            ) : activeScreen === 'forecast' ? (
              <ForecastScreen
                lang={lang}
                plot={selectedPlot}
                evaluation={currentEvaluation}
                scenario={currentScenario}
                onChangeScenario={handleChangeScenario}
                onOpenCreditModal={() => setCreditModalOpen(true)}
              />
            ) : activeScreen === 'finance' ? (
              <FinanceAlertsScreen
                lang={lang}
                plot={selectedPlot}
                evaluation={currentEvaluation}
                creditState={currentCreditState}
                creditHistory={creditHistory}
                shieldState={currentShieldState}
                onOpenCreditModal={() => setCreditModalOpen(true)}
                onOpenShieldModal={() => setShieldModalOpen(true)}
                onDownloadCreditReceipt={handleDownloadCreditReceipt}
                alertConfig={alertConfig}
                onSaveAlertConfig={setAlertConfig}
                isSimulatedDrop={currentScenario !== 'normal'}
                onSimulateRiskTransition={handleSimulateRiskTransition}
                onResetSimulation={() => handleChangeScenario('normal')}
              />
            ) : (
              <AccountSettingsScreen
                lang={lang}
                onChangeLang={setLang}
                user={registeredUser}
                alertConfig={alertConfig}
                emergencyPopupEnabled={emergencyPopupEnabled}
                onToggleEmergencyPopup={setEmergencyPopupEnabled}
                onUpdateAccountSettings={handleUpdateAccountSettings}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* Role-Specific Floating Mascot / AI Assistant (Bottom-Right above Bottom Nav) */}
      {activeAccount && (
        <FloatingAiChatbot
          role={roleMode}
          lang={lang}
          contextSummary={chatbotContextSummary}
          mascotSpeech={
            roleMode === 'baac' ? baacMascotSpeech : farmerMascotSpeech
          }
        />
      )}

      {/* Fixed Native-Style Senior-Friendly Bottom Navigation Bar (Strictly Role-Isolated) */}
      {activeAccount && (
        <nav
          aria-label={lang === 'th' ? 'แถบนำทางหลัก' : 'Bottom navigation'}
          className="fixed bottom-0 left-0 right-0 z-40 h-[60px] bg-white/95 backdrop-blur-md border-t border-emerald-900/12 shadow-[0_-2px_10px_rgba(6,78,59,0.05)]"
        >
          {roleMode === 'baac' ? (
            <div className="max-w-6xl h-full mx-auto grid grid-cols-4 items-center">
              {(
                [
                  {
                    id: 'console',
                    label: lang === 'th' ? 'พอร์ต ธ.ก.ส.' : 'Console',
                    icon: Building2,
                  },
                  {
                    id: 'radar',
                    label: copy.nav.forecast,
                    icon: CloudSun,
                  },
                  {
                    id: 'history',
                    label: lang === 'th' ? 'อนุมัติงวด' : 'Approvals',
                    icon: ClipboardCheck,
                  },
                  {
                    id: 'account',
                    label: copy.nav.register,
                    icon: User,
                  },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const isActive = baacSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`baac-bottom-nav-${item.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setBaacSection(item.id)}
                    className={`min-h-[48px] h-full flex flex-col items-center justify-center gap-0.5 px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
                      isActive
                        ? 'text-emerald-800 font-bold bg-emerald-50/70'
                        : 'text-slate-600 hover:text-emerald-900 font-semibold'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`}
                      aria-hidden="true"
                    />
                    <span className="text-xs leading-tight whitespace-nowrap truncate max-w-full">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="max-w-6xl h-full mx-auto grid grid-cols-4 items-center">
              {(
                [
                  { id: 'home', label: copy.nav.home, icon: Home },
                  { id: 'forecast', label: copy.nav.forecast, icon: CloudSun },
                  { id: 'finance', label: copy.nav.finance, icon: ShieldCheck },
                  { id: 'register', label: copy.nav.register, icon: User },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`bottom-nav-${item.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleFarmerBottomNavClick(item.id)}
                    className={`min-h-[48px] h-full flex flex-col items-center justify-center gap-0.5 px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
                      isActive
                        ? 'text-emerald-800 font-bold bg-emerald-50/70'
                        : 'text-slate-600 hover:text-emerald-900 font-semibold'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`}
                      aria-hidden="true"
                    />
                    <span className="text-xs leading-tight whitespace-nowrap truncate max-w-full">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      )}

      {/* Global Bottom Sheet Modals for Credit & Parametric Insurance (Farmer Only) */}
      {roleMode === 'farmer' && (
        <>
          <CreditRequestModal
            isOpen={creditModalOpen}
            onClose={() => setCreditModalOpen(false)}
            plot={selectedPlot}
            healthScore={currentEvaluation.healthScore}
            lang={lang}
            onSubmitCredit={handleSubmitCredit}
          />

          <ParametricShieldModal
            isOpen={shieldModalOpen}
            onClose={() => setShieldModalOpen(false)}
            plot={selectedPlot}
            lang={lang}
            onActivateShield={handleActivateShield}
          />
        </>
      )}

      {/* Top-Right Bell Notification & Activity Feed Sheet */}
      <BottomSheetModal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={copy.activityFeed.modalTitle}
        subtitle={copy.activityFeed.modalSubtitle}
        icon={<Bell className="w-5 h-5" aria-hidden="true" />}
        closeLabel={copy.home.close}
      >
        <ActivityFeedCard
          lang={lang}
          items={activityFeed}
          inModal
          unreadBeforeOpenMs={modalUnreadSnapshotMs}
        />
      </BottomSheetModal>

      {/* Emergency Risk Alert Pop-up Modal (Farmer View Only) */}
      {roleMode === 'farmer' && (
        <EmergencyAlertModal
          popup={emergencyPopup}
          lang={lang}
          onClose={() => setEmergencyPopup(null)}
          onOpenForecast={() => setActiveScreen('forecast')}
          onOpenFinance={() => setActiveScreen('finance')}
        />
      )}
    </div>
  );
}
