import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  AlertTriangle,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  Clock,
  CloudRain,
  Droplets,
  ExternalLink,
  Flame,
  LogOut,
  RefreshCw,
  Thermometer,
  Wallet,
} from 'lucide-react';
import type {
  AppLanguage,
  DailyForecastPoint,
  FarmPlotProfile,
  PlotEvaluation,
  ScenarioType,
} from '../types/cropshield';
import {
  type GoogleCalendarEventInsertPayload,
  type GoogleCalendarEventItem,
  type ResolvedForecastDate,
  buildBatchRiskCalendarEvents,
  buildGoogleCalendarEventPayload,
  formatLiveClockLabel,
  groupGoogleEventsByDate,
  resolveRealTimeForecastCalendar,
} from '../utils/forecastCalendar';
import {
  createGoogleCalendarEvent,
  fetchSevenDayGoogleCalendarEvents,
  getGoogleCalendarAccessToken,
  initGoogleCalendarAuth,
  signInWithGoogleCalendar,
  signOutGoogleCalendar,
} from '../utils/googleCalendarClient';
import { APP_COPY } from '../utils/i18n';
import { BottomSheetModal } from './BottomSheetModal';
import { ForecastChart } from './ForecastChart';

interface ForecastScreenProps {
  lang: AppLanguage;
  plot: FarmPlotProfile;
  evaluation: PlotEvaluation;
  scenario: ScenarioType;
  onChangeScenario: (nextScenario: ScenarioType) => void;
  onOpenCreditModal: () => void;
}

interface PendingCalendarConfirmation {
  mode: 'single' | 'batch';
  items: Array<{
    day: DailyForecastPoint;
    resolved: ResolvedForecastDate;
    payload: GoogleCalendarEventInsertPayload;
  }>;
}

export const ForecastScreen: React.FC<ForecastScreenProps> = ({
  lang,
  plot,
  evaluation,
  scenario,
  onChangeScenario,
  onOpenCreditModal,
}) => {
  const copy = APP_COPY[lang].forecast;
  const [selectedDay, setSelectedDay] = useState<DailyForecastPoint | null>(null);
  const [highlightedDayNumber, setHighlightedDayNumber] = useState<number>(5);

  // Real-time ticking clock & calendar date anchoring
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDaySignature = `${liveNow.getFullYear()}-${liveNow.getMonth()}-${liveNow.getDate()}`;
  const resolvedDates = useMemo(
    () => resolveRealTimeForecastCalendar(evaluation.forecast, liveNow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evaluation.forecast, currentDaySignature]
  );

  // Google Calendar client-side auth & live sync state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(() =>
    getGoogleCalendarAccessToken()
  );
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState<boolean>(
    () => !getGoogleCalendarAccessToken()
  );
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string>('');
  const [calendarError, setCalendarError] = useState<string>('');
  const [calendarSuccessMsg, setCalendarSuccessMsg] = useState<string>('');

  // Mandatory explicit user confirmation before writing to Google Calendar
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingCalendarConfirmation | null>(null);
  const [isSavingCalendarEvent, setIsSavingCalendarEvent] = useState(false);

  const loadGoogleCalendarEvents = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride ?? googleToken ?? getGoogleCalendarAccessToken();
      if (!token || resolvedDates.length === 0) return;

      setIsSyncingCalendar(true);
      setCalendarError('');
      try {
        const startIso = resolvedDates[0].isoDate;
        const endIso = resolvedDates[resolvedDates.length - 1].isoDate;
        const events = await fetchSevenDayGoogleCalendarEvents(
          token,
          startIso,
          endIso,
          lang
        );
        setCalendarEvents(events);
        const now = new Date();
        setLastSyncedLabel(
          `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes()
          ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('401')) {
          setGoogleToken(null);
          setNeedsGoogleAuth(true);
        }
        setCalendarError(
          lang === 'th'
            ? 'ไม่สามารถดึงข้อมูลปฏิทินได้ กรุณาลองเชื่อมต่อใหม่'
            : 'Unable to fetch Google Calendar events. Please reconnect.'
        );
      } finally {
        setIsSyncingCalendar(false);
      }
    },
    [googleToken, lang, resolvedDates]
  );

  useEffect(() => {
    const unsubscribe = initGoogleCalendarAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setNeedsGoogleAuth(false);
        void loadGoogleCalendarEvents(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setNeedsGoogleAuth(true);
        setCalendarEvents([]);
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll Google Calendar every 60 seconds while connected for real-time updates
  useEffect(() => {
    if (!googleToken) return;
    const pollId = setInterval(() => {
      void loadGoogleCalendarEvents(googleToken);
    }, 60000);
    return () => clearInterval(pollId);
  }, [googleToken, loadGoogleCalendarEvents]);

  const eventsByDate = useMemo(
    () => groupGoogleEventsByDate(calendarEvents),
    [calendarEvents]
  );

  const handleGoogleSignIn = async () => {
    setIsConnectingGoogle(true);
    setCalendarError('');
    setCalendarSuccessMsg('');
    try {
      const result = await signInWithGoogleCalendar();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setNeedsGoogleAuth(false);
        await loadGoogleCalendarEvents(result.accessToken);
      }
    } catch {
      setCalendarError(
        lang === 'th'
          ? 'การเชื่อมต่อ Google Calendar ถูกยกเลิกหรือยังไม่สมบูรณ์'
          : 'Google Calendar sign-in was cancelled or failed.'
      );
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    await signOutGoogleCalendar();
    setGoogleUser(null);
    setGoogleToken(null);
    setNeedsGoogleAuth(true);
    setCalendarEvents([]);
    setLastSyncedLabel('');
    setCalendarSuccessMsg('');
  };

  const openSingleDayConfirm = (day: DailyForecastPoint) => {
    const resolved =
      resolvedDates.find((d) => d.dayNumber === day.dayNumber) ?? resolvedDates[0];
    if (!resolved) return;
    setPendingConfirm({
      mode: 'single',
      items: [
        {
          day,
          resolved,
          payload: buildGoogleCalendarEventPayload(plot, day, resolved, lang),
        },
      ],
    });
  };

  const openBatchConfirm = () => {
    const items = buildBatchRiskCalendarEvents(
      plot,
      evaluation.forecast,
      lang,
      liveNow
    );
    setPendingConfirm({
      mode: 'batch',
      items,
    });
  };

  const handleConfirmCreateEvents = async () => {
    if (!pendingConfirm || !googleToken) return;
    setIsSavingCalendarEvent(true);
    setCalendarError('');
    try {
      let createdCount = 0;
      for (const item of pendingConfirm.items) {
        const created = await createGoogleCalendarEvent(
          googleToken,
          item.payload,
          lang
        );
        if (created) createdCount += 1;
      }
      setPendingConfirm(null);
      await loadGoogleCalendarEvents(googleToken);
      setCalendarSuccessMsg(
        lang === 'th'
          ? `บันทึกกำหนดการดูแลแปลง ${createdCount} รายการลง Google Calendar เรียบร้อยแล้ว`
          : `Added ${createdCount} farm care reminder(s) to your Google Calendar.`
      );
    } catch {
      setCalendarError(
        lang === 'th'
          ? 'ไม่สามารถบันทึกกำหนดการลง Google Calendar ได้'
          : 'Failed to create event(s) in Google Calendar.'
      );
    } finally {
      setIsSavingCalendarEvent(false);
    }
  };

  const handleTapDay = (day: DailyForecastPoint) => {
    setHighlightedDayNumber(day.dayNumber);
    setSelectedDay(day);
  };

  const plotTitle = lang === 'en' && plot.nameEn ? plot.nameEn : plot.name;
  const selectedResolved = selectedDay
    ? resolvedDates.find((d) => d.dayNumber === selectedDay.dayNumber)
    : undefined;
  const selectedDayEvents = selectedResolved
    ? eventsByDate[selectedResolved.isoDate] ?? []
    : [];

  const getDayRiskSummary = (day: DailyForecastPoint) => {
    if (day.soilMoistureIndex >= 86) {
      return lang === 'th'
        ? 'เสี่ยงน้ำท่วมขังและรากขาดอากาศจากฝนสะสมต่อเนื่อง'
        : 'Waterlogging and root-hypoxia risk from sustained rainfall.';
    }
    if (day.soilMoistureIndex < 38 || day.cropStressIndex >= 65) {
      return lang === 'th'
        ? 'ความชื้นผิวดินต่ำกว่าเกณฑ์ปลอดภัย พืชเสี่ยงชะงักการเจริญเติบโต'
        : 'Soil moisture drops below safe floor; crops face heat/drought stress.';
    }
    if (day.soilMoistureIndex < 50 || day.cropStressIndex >= 48) {
      return lang === 'th'
        ? 'ความชื้นเริ่มลดลงในชั้นราก ควรเฝ้าระวังและเตรียมระบบน้ำเสริม'
        : 'Root-zone moisture is declining; watch closely and prepare irrigation.';
    }
    return lang === 'th'
      ? 'ระดับความชื้นสมดุล ความเสี่ยงต่อผลผลิตต่ำมาก'
      : 'Balanced soil moisture with minimal crop stress risk.';
  };

  const dateRangeLabel =
    resolvedDates.length > 0
      ? lang === 'en'
        ? `${resolvedDates[0].dateShortEn} – ${resolvedDates[resolvedDates.length - 1].dateShortEn}`
        : `${resolvedDates[0].dateShortTh} – ${resolvedDates[resolvedDates.length - 1].dateShortTh}`
      : 'Day 1 – Day 7';

  return (
    <div className="cs-fade-slide-up space-y-4 sm:space-y-5">
      {/* Header + Real-Time Clock + Scenario Switcher */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {copy.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {plotTitle} · {copy.subtitle}
            </p>
          </div>

          <div
            data-testid="forecast-realtime-clock"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-mono tabular-nums font-semibold text-emerald-900 self-start shrink-0"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{formatLiveClockLabel(liveNow, lang)}</span>
          </div>
        </div>

        {/* Google Calendar Real-Time Integration Bar */}
        <div
          data-testid="google-calendar-sync-panel"
          className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CalendarCheck2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>{copy.calendarSectionTitle}</span>
                {!needsGoogleAuth && googleToken && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Real-Time
                  </span>
                )}
              </div>
              {needsGoogleAuth ? (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {copy.calendarSectionDesc}
                </p>
              ) : (
                <p className="text-xs text-slate-600 font-mono tabular-nums truncate">
                  {copy.calendarConnectedAs}:{' '}
                  <span className="font-semibold text-slate-900">
                    {googleUser?.email ?? googleUser?.displayName ?? 'Google Calendar'}
                  </span>
                  {lastSyncedLabel && (
                    <>
                      {' · '}
                      {copy.calendarSyncedAt} {lastSyncedLabel}
                    </>
                  )}
                </p>
              )}
            </div>

            {needsGoogleAuth ? (
              <button
                type="button"
                data-testid="google-calendar-signin-btn"
                onClick={() => void handleGoogleSignIn()}
                disabled={isConnectingGoogle}
                className="gsi-material-button min-h-[40px] inline-flex items-center justify-center gap-2.5 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60 transition-colors shadow-2xs shrink-0"
              >
                <div className="gsi-material-button-icon w-4 h-4 shrink-0" aria-hidden="true">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block', width: '16px', height: '16px' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isConnectingGoogle ? copy.connectingGoogle : copy.signInGoogleBtn}
                </span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid="google-calendar-refresh-btn"
                  onClick={() => void loadGoogleCalendarEvents()}
                  disabled={isSyncingCalendar}
                  className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-60 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 shrink-0 ${isSyncingCalendar ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{copy.calendarSyncBtn}</span>
                </button>
                <button
                  type="button"
                  data-testid="google-calendar-batch-btn"
                  onClick={openBatchConfirm}
                  className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
                >
                  <CalendarPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{copy.calendarBatchBtn}</span>
                </button>
                <button
                  type="button"
                  data-testid="google-calendar-disconnect-btn"
                  onClick={() => void handleGoogleDisconnect()}
                  className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{copy.calendarDisconnectBtn}</span>
                </button>
              </div>
            )}
          </div>

          {calendarError && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {calendarError}
            </p>
          )}
          {calendarSuccessMsg && (
            <p
              data-testid="calendar-sync-success"
              className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
            >
              {calendarSuccessMsg}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            {copy.scenarioLabel}
          </div>
          <div
            className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl"
            role="group"
            aria-label={copy.scenarioLabel}
          >
            {(['normal', 'drought', 'flood'] as const).map((item) => {
              const active = scenario === item;
              return (
                <button
                  key={item}
                  type="button"
                  data-testid={`scenario-btn-${item}`}
                  onClick={() => onChangeScenario(item)}
                  className={`min-h-[44px] px-2.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? item === 'normal'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : item === 'drought'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-sky-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {copy.scenarios[item]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Horizontal Real-Time 7-Day Tap Timeline */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">
            {copy.tapDayHint}
          </span>
          <span
            data-testid="forecast-realtime-range"
            className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-600 font-semibold"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>{dateRangeLabel}</span>
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible">
          {evaluation.forecast.map((day, idx) => {
            const resolved = resolvedDates[idx];
            const isHighlighted = day.dayNumber === highlightedDayNumber;
            const isDanger =
              day.soilMoistureIndex < 38 ||
              day.soilMoistureIndex >= 86 ||
              day.cropStressIndex >= 65;

            const dateDisplay = resolved
              ? lang === 'en'
                ? resolved.dateShortEn
                : resolved.dateShortTh
              : day.dateShort;
            const dayName = resolved
              ? lang === 'en'
                ? resolved.relativeLabelEn ?? resolved.weekdayEn
                : resolved.relativeLabelTh
                  ? `${resolved.relativeLabelTh} · ${resolved.weekdayShortTh}`
                  : resolved.weekdayTh
              : day.dayLabelTh;
            const dayEvents = resolved ? eventsByDate[resolved.isoDate] ?? [] : [];

            return (
              <button
                key={day.dayNumber}
                type="button"
                data-testid={`forecast-day-card-${day.dayNumber}`}
                onClick={() => handleTapDay(day)}
                className={`min-w-[104px] sm:min-w-0 min-h-[96px] p-3 rounded-2xl border text-left sm:text-center flex flex-col justify-between transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  isHighlighted
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : isDanger
                      ? 'bg-amber-50/80 text-slate-900 border-amber-200 hover:bg-amber-100/70'
                      : 'bg-slate-50/90 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-[11px] font-mono tabular-nums opacity-80">
                    {dateDisplay}
                  </div>
                  <div className="text-xs font-bold truncate mt-0.5">{dayName}</div>
                </div>

                <div className="space-y-1 mt-2">
                  <div
                    className={`text-xs font-mono tabular-nums font-semibold ${
                      isHighlighted
                        ? 'text-sky-300'
                        : isDanger
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }`}
                  >
                    {copy.moistureShort} {day.soilMoistureIndex}%
                  </div>
                  {dayEvents.length > 0 && (
                    <div
                      className={`text-[10px] font-semibold truncate ${
                        isHighlighted ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                    >
                      {dayEvents.length} {copy.calendarEventUnit}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Compact SVG Chart synced with Real-Time Dates */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5">
        <ForecastChart
          forecast={evaluation.forecast}
          selectedDayNumber={highlightedDayNumber}
          onSelectDay={handleTapDay}
          lang={lang}
          resolvedDates={resolvedDates}
          eventsByDate={eventsByDate}
        />
      </section>

      {/* Day Detail Pop-up Bottom Sheet */}
      <BottomSheetModal
        isOpen={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        title={
          selectedDay && selectedResolved
            ? `${
                lang === 'en'
                  ? selectedResolved.dateShortEn
                  : selectedResolved.dateShortTh
              } · ${
                lang === 'en'
                  ? selectedResolved.relativeLabelEn ?? selectedResolved.weekdayEn
                  : selectedResolved.weekdayTh
              }`
            : ''
        }
        subtitle={`${plotTitle} · ${copy.dayModalSubtitle}`}
        icon={<CalendarDays className="w-5 h-5" aria-hidden="true" />}
        closeLabel={APP_COPY[lang].home.close}
      >
        {selectedDay && selectedResolved && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                  <span>{copy.soilOutlookTitle}</span>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {selectedDay.soilMoistureIndex}%
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Flame className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  <span>{copy.stressShort}</span>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {selectedDay.cropStressIndex}/100
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CloudRain className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>{copy.rainLabel}</span>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {selectedDay.rainChancePercent}%
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Thermometer className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>{copy.tempLabel}</span>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {selectedDay.tempMaxC}°C
                </div>
              </div>
            </div>

            {/* Real-Time Google Calendar Events for Selected Day */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CalendarCheck2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>{copy.calendarDayEventsTitle}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedResolved.isoDate}
                </span>
              </div>

              {needsGoogleAuth ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <p className="text-xs text-slate-600">{copy.calendarNeedSignInHint}</p>
                  <button
                    type="button"
                    onClick={() => void handleGoogleSignIn()}
                    className="min-h-[34px] px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    {copy.signInGoogleBtn}
                  </button>
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <p className="text-xs text-slate-600">{copy.calendarNoEventsDay}</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {ev.summary}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {ev.timeRangeLabel}
                        </div>
                      </div>
                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 shrink-0 p-1"
                          aria-label={ev.summary}
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span>{copy.riskAnalysisTitle}</span>
              </div>
              <p className="text-sm text-amber-950 leading-relaxed">
                {getDayRiskSummary(selectedDay)}
              </p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-emerald-950">
                {copy.actionRequiredTitle}
              </div>
              <p className="text-sm text-emerald-950 font-medium leading-relaxed">
                {lang === 'en' && selectedDay.advisoryEn
                  ? selectedDay.advisoryEn
                  : selectedDay.advisoryTh}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              {!needsGoogleAuth && (
                <button
                  type="button"
                  data-testid="add-day-to-google-calendar-btn"
                  onClick={() => openSingleDayConfirm(selectedDay)}
                  className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{copy.calendarAddDayBtn}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(null);
                  onOpenCreditModal();
                }}
                className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
              >
                <Wallet className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{copy.notifyBaacAction}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {APP_COPY[lang].home.close}
              </button>
            </div>
          </div>
        )}
      </BottomSheetModal>

      {/* Mandatory Explicit Confirmation Modal Before Creating Google Calendar Events */}
      <BottomSheetModal
        isOpen={Boolean(pendingConfirm)}
        onClose={() => {
          if (!isSavingCalendarEvent) setPendingConfirm(null);
        }}
        title={copy.calendarConfirmTitle}
        subtitle={`${plotTitle} · Google Calendar`}
        icon={<CalendarPlus className="w-5 h-5" aria-hidden="true" />}
        closeLabel={copy.calendarCancelAction}
      >
        {pendingConfirm && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {copy.calendarConfirmDesc}
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingConfirm.items.map(({ day, resolved, payload }) => (
                <div
                  key={day.dayNumber}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1"
                >
                  <div className="text-xs font-bold text-slate-900">
                    {payload.summary}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-emerald-800 font-semibold">
                    {lang === 'en' ? resolved.dateShortEn : resolved.dateShortTh} (
                    {resolved.isoDate}) · {resolved.recommendedTimeStart}–
                    {resolved.recommendedTimeEnd}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {payload.location}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                data-testid="confirm-google-calendar-insert-btn"
                onClick={() => void handleConfirmCreateEvents()}
                disabled={isSavingCalendarEvent}
                className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 transition-colors"
              >
                <CalendarCheck2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isSavingCalendarEvent
                    ? copy.connectingGoogle
                    : copy.calendarConfirmAction}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                disabled={isSavingCalendarEvent}
                className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {copy.calendarCancelAction}
              </button>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
};
