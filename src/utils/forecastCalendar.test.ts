import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_PLOTS } from './nasaPower';
import {
  buildBatchRiskCalendarEvents,
  buildGoogleCalendarEventPayload,
  formatLiveClockLabel,
  groupGoogleEventsByDate,
  normalizeGoogleCalendarEvents,
  resolveRealTimeForecastCalendar,
} from './forecastCalendar';

test('resolveRealTimeForecastCalendar maps 7 days onto real-time calendar dates starting today', () => {
  const plot = DEMO_PLOTS[0];
  const baseDate = new Date(2026, 10, 14, 9, 30, 0); // Sat Nov 14, 2026
  const resolved = resolveRealTimeForecastCalendar(plot.forecast, baseDate);

  assert.equal(resolved.length, 7);
  assert.equal(resolved[0].isoDate, '2026-11-14');
  assert.equal(resolved[0].dateShortTh, '14 พ.ย.');
  assert.equal(resolved[0].dateShortEn, 'Nov 14');
  assert.equal(resolved[0].relativeLabelTh, 'วันนี้');
  assert.equal(resolved[1].isoDate, '2026-11-15');
  assert.equal(resolved[1].relativeLabelEn, 'Tomorrow');
  assert.equal(resolved[6].isoDate, '2026-11-20');
  // Day 5 has 44% moisture -> needs calendar action at 06:00-07:00
  assert.equal(resolved[4].needsCalendarAction, true);
  assert.equal(resolved[4].recommendedTimeStart, '06:00');
});

test('buildGoogleCalendarEventPayload and buildBatchRiskCalendarEvents build valid event payloads', () => {
  const plot = DEMO_PLOTS[0];
  const baseDate = new Date(2026, 10, 14, 9, 30, 0);
  const resolved = resolveRealTimeForecastCalendar(plot.forecast, baseDate);
  const day5Payload = buildGoogleCalendarEventPayload(plot, plot.forecast[4], resolved[4], 'th');

  assert.ok(day5Payload.summary.includes('[CropShield]'));
  assert.ok(day5Payload.start.dateTime.startsWith('2026-11-18T06:00:00'));
  assert.ok(day5Payload.end.dateTime.startsWith('2026-11-18T07:00:00'));
  assert.ok(day5Payload.description.includes('44%'));

  const batch = buildBatchRiskCalendarEvents(plot, plot.forecast, 'en', baseDate);
  assert.ok(batch.length >= 2);
  assert.ok(batch.every((item) => item.payload.summary.includes('[CropShield]')));
});

test('normalizeGoogleCalendarEvents and groupGoogleEventsByDate organize live Google Calendar events by dateKey', () => {
  const events = normalizeGoogleCalendarEvents(
    [
      {
        id: 'ev-1',
        summary: '[CropShield] เปิดระบบน้ำเสริม: แปลงข้าวโพด (44%)',
        start: { dateTime: '2026-11-18T06:00:00+07:00' },
        end: { dateTime: '2026-11-18T07:00:00+07:00' },
      },
      {
        id: 'ev-2',
        summary: 'ประชุมสหกรณ์การเกษตร',
        start: { date: '2026-11-18' },
        end: { date: '2026-11-19' },
      },
      {
        id: 'ev-cancelled',
        status: 'cancelled',
        summary: 'Cancelled meeting',
        start: { date: '2026-11-18' },
      },
    ],
    'th'
  );

  assert.equal(events.length, 2);
  assert.equal(events[0].isAllDay, true);
  assert.equal(events[1].isCropShieldEvent, true);

  const grouped = groupGoogleEventsByDate(events);
  assert.equal(grouped['2026-11-18'].length, 2);
});

test('formatLiveClockLabel formats bilingual real-time clock strings', () => {
  const now = new Date(2026, 10, 14, 13, 5, 9);
  const thLabel = formatLiveClockLabel(now, 'th');
  const enLabel = formatLiveClockLabel(now, 'en');

  assert.ok(thLabel.includes('14 พ.ย. 2569'));
  assert.ok(thLabel.includes('13:05:09'));
  assert.ok(enLabel.includes('Nov 14, 2026'));
  assert.ok(enLabel.includes('13:05:09'));
});
