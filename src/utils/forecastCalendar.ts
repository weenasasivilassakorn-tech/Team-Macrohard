import type {
  AppLanguage,
  DailyForecastPoint,
  FarmPlotProfile,
} from '../types/cropshield';

export interface ResolvedForecastDate {
  dayNumber: number;
  isoDate: string; // YYYY-MM-DD in local calendar
  dateShortTh: string; // e.g. 14 พ.ย.
  dateShortEn: string; // e.g. Nov 14
  weekdayTh: string; // e.g. วันเสาร์
  weekdayShortTh: string; // e.g. ส.
  weekdayEn: string; // e.g. Sat
  relativeLabelTh?: string; // วันนี้ / พรุ่งนี้
  relativeLabelEn?: string; // Today / Tomorrow
  recommendedTimeStart: string; // HH:mm
  recommendedTimeEnd: string; // HH:mm
  needsCalendarAction: boolean;
}

export interface GoogleCalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  startIso: string;
  endIso: string;
  dateKey: string; // YYYY-MM-DD
  timeRangeLabel: string;
  isAllDay: boolean;
  isCropShieldEvent: boolean;
}

export interface GoogleCalendarEventInsertPayload {
  summary: string;
  location: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders: {
    useDefault: boolean;
    overrides: Array<{ method: 'popup'; minutes: number }>;
  };
}

const TH_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const EN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const TH_WEEKDAYS = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

const TH_WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const EN_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function resolveRealTimeForecastDate(
  day: DailyForecastPoint,
  referenceDate: Date = new Date()
): ResolvedForecastDate {
  const target = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + Math.max(0, day.dayNumber - 1)
  );

  const dayOfMonth = target.getDate();
  const monthIdx = target.getMonth();
  const weekdayIdx = target.getDay();

  const isFlood = day.soilMoistureIndex >= 86;
  const isDryOrStressed = day.soilMoistureIndex < 50 || day.cropStressIndex >= 48;

  const recommendedTimeStart = isFlood ? '07:00' : isDryOrStressed ? '06:00' : '08:00';
  const recommendedTimeEnd = isFlood ? '08:00' : isDryOrStressed ? '07:00' : '08:45';

  return {
    dayNumber: day.dayNumber,
    isoDate: toLocalIsoDate(target),
    dateShortTh: `${dayOfMonth} ${TH_MONTHS_SHORT[monthIdx]}`,
    dateShortEn: `${EN_MONTHS_SHORT[monthIdx]} ${dayOfMonth}`,
    weekdayTh: TH_WEEKDAYS[weekdayIdx],
    weekdayShortTh: TH_WEEKDAYS_SHORT[weekdayIdx],
    weekdayEn: EN_WEEKDAYS_SHORT[weekdayIdx],
    relativeLabelTh: day.dayNumber === 1 ? 'วันนี้' : day.dayNumber === 2 ? 'พรุ่งนี้' : undefined,
    relativeLabelEn: day.dayNumber === 1 ? 'Today' : day.dayNumber === 2 ? 'Tomorrow' : undefined,
    recommendedTimeStart,
    recommendedTimeEnd,
    needsCalendarAction: isFlood || isDryOrStressed,
  };
}

export function resolveRealTimeForecastCalendar(
  forecast: DailyForecastPoint[],
  referenceDate: Date = new Date()
): ResolvedForecastDate[] {
  return forecast.map((day) => resolveRealTimeForecastDate(day, referenceDate));
}

export function formatLiveClockLabel(now: Date, lang: AppLanguage): string {
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const dayOfMonth = now.getDate();
  const monthIdx = now.getMonth();
  const weekdayIdx = now.getDay();

  if (lang === 'en') {
    return `${EN_WEEKDAYS_SHORT[weekdayIdx]}, ${EN_MONTHS_SHORT[monthIdx]} ${dayOfMonth}, ${now.getFullYear()} · ${timeStr}`;
  }

  const buddhistYear = now.getFullYear() + 543;
  return `${TH_WEEKDAYS[weekdayIdx]}ที่ ${dayOfMonth} ${TH_MONTHS_SHORT[monthIdx]} ${buddhistYear} · ${timeStr} น.`;
}

function formatOffsetDateTime(isoDate: string, hhmm: string): { dateTime: string; timeZone: string } {
  const timeZone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'Asia/Bangkok';

  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute, 0);
  const offsetMinutes = -localDate.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMins = Math.abs(offsetMinutes);
  const offH = String(Math.floor(absMins / 60)).padStart(2, '0');
  const offM = String(absMins % 60).padStart(2, '0');

  return {
    dateTime: `${isoDate}T${hhmm}:00${sign}${offH}:${offM}`,
    timeZone,
  };
}

export function buildGoogleCalendarEventPayload(
  plot: FarmPlotProfile,
  day: DailyForecastPoint,
  resolved: ResolvedForecastDate,
  lang: AppLanguage
): GoogleCalendarEventInsertPayload {
  const plotTitle = lang === 'en' && plot.nameEn ? plot.nameEn : plot.name;
  const advisory = lang === 'en' && day.advisoryEn ? day.advisoryEn : day.advisoryTh;
  const isFlood = day.soilMoistureIndex >= 86;
  const isDry = day.soilMoistureIndex < 48 || day.cropStressIndex >= 55;

  const actionTag =
    lang === 'en'
      ? isFlood
        ? 'Drainage Alert'
        : isDry
          ? 'Irrigation Reminder'
          : 'Field Check'
      : isFlood
        ? 'เปิดร่องระบายน้ำ'
        : isDry
          ? 'เปิดระบบน้ำเสริม'
          : 'ตรวจสุขภาพแปลง';

  const summary = `[CropShield] ${actionTag}: ${plotTitle} (${day.soilMoistureIndex}%)`;

  const description =
    lang === 'en'
      ? [
          `CropShield 7-Day NASA Satellite Advisory`,
          `Plot: ${plotTitle} (${plot.areaRai} Rai)`,
          `Soil Moisture: ${day.soilMoistureIndex}% | Crop Stress: ${day.cropStressIndex}/100 | Rain Chance: ${day.rainChancePercent}% | Max Temp: ${day.tempMaxC}°C`,
          `Recommended Action: ${advisory}`,
        ].join('\n')
      : [
          `แจ้งเตือนดูแลแปลงล่วงหน้าจาก CropShield (ข้อมูลดาวเทียม NASA)`,
          `แปลง: ${plotTitle} (${plot.areaRai} ไร่)`,
          `ความชื้นในดินคาดการณ์: ${day.soilMoistureIndex}% | ความเครียดพืช: ${day.cropStressIndex}/100 | โอกาสฝน: ${day.rainChancePercent}% | อุณหภูมิสูงสุด: ${day.tempMaxC}°C`,
          `แนวทางปฏิบัติ: ${advisory}`,
        ].join('\n');

  const start = formatOffsetDateTime(resolved.isoDate, resolved.recommendedTimeStart);
  const end = formatOffsetDateTime(resolved.isoDate, resolved.recommendedTimeEnd);

  return {
    summary,
    location: `${plot.province} (${plot.lat.toFixed(4)}, ${plot.lon.toFixed(4)})`,
    description,
    start,
    end,
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 60 }],
    },
  };
}

export function buildBatchRiskCalendarEvents(
  plot: FarmPlotProfile,
  forecast: DailyForecastPoint[],
  lang: AppLanguage,
  referenceDate: Date = new Date()
): Array<{
  day: DailyForecastPoint;
  resolved: ResolvedForecastDate;
  payload: GoogleCalendarEventInsertPayload;
}> {
  const resolvedDates = resolveRealTimeForecastCalendar(forecast, referenceDate);
  const pairs = forecast.map((day, index) => ({
    day,
    resolved: resolvedDates[index],
  }));

  const urgentPairs = pairs.filter((p) => p.resolved.needsCalendarAction);
  const selectedPairs = urgentPairs.length > 0 ? urgentPairs : pairs.slice(0, 2);

  return selectedPairs.map(({ day, resolved }) => ({
    day,
    resolved,
    payload: buildGoogleCalendarEventPayload(plot, day, resolved, lang),
  }));
}

interface RawGoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
}

export function normalizeGoogleCalendarEvents(
  rawItems: RawGoogleCalendarEvent[],
  lang: AppLanguage
): GoogleCalendarEventItem[] {
  const normalized: GoogleCalendarEventItem[] = [];

  for (const item of rawItems) {
    if (!item.id || item.status === 'cancelled') continue;
    const rawStart = item.start?.dateTime ?? item.start?.date;
    if (!rawStart) continue;

    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    const dateKey = rawStart.slice(0, 10);
    let timeRangeLabel = lang === 'th' ? 'ตลอดวัน' : 'All day';

    if (!isAllDay && item.start?.dateTime) {
      const startDt = new Date(item.start.dateTime);
      const endDt = item.end?.dateTime ? new Date(item.end.dateTime) : null;
      const fmt = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      timeRangeLabel = endDt ? `${fmt(startDt)}–${fmt(endDt)}` : fmt(startDt);
    }

    const summary = item.summary ?? (lang === 'th' ? '(ไม่มีหัวข้อ)' : '(No title)');
    normalized.push({
      id: item.id,
      summary,
      description: item.description,
      location: item.location,
      htmlLink: item.htmlLink,
      startIso: rawStart,
      endIso: item.end?.dateTime ?? item.end?.date ?? rawStart,
      dateKey,
      timeRangeLabel,
      isAllDay,
      isCropShieldEvent: summary.includes('[CropShield]'),
    });
  }

  return normalized.sort((a, b) => a.startIso.localeCompare(b.startIso));
}

export function groupGoogleEventsByDate(
  events: GoogleCalendarEventItem[]
): Record<string, GoogleCalendarEventItem[]> {
  const grouped: Record<string, GoogleCalendarEventItem[]> = {};
  for (const ev of events) {
    if (!grouped[ev.dateKey]) {
      grouped[ev.dateKey] = [];
    }
    grouped[ev.dateKey].push(ev);
  }
  return grouped;
}
