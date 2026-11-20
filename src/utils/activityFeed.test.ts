import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countActivityByFilter,
  countUnreadActivityEvents,
  createActivityEvent,
  createSeedActivityFeed,
  filterActivityFeed,
  prependActivityEvents,
} from './activityFeed';
import { SEED_ACCOUNTS, accountToRegisteredProfile } from './authAccounts';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';

test('createSeedActivityFeed creates chronological NASA, credit, alert, and account baseline events', () => {
  const plot = DEMO_PLOTS[0];
  const evaluation = evaluatePlotProfile(plot, 'demo', 'Demo');
  const user = accountToRegisteredProfile(SEED_ACCOUNTS[0]);

  const feed = createSeedActivityFeed(plot, evaluation, user);
  assert.equal(feed.length, 4);
  assert.ok(feed[0].timestampMs >= feed[1].timestampMs);
  assert.ok(feed[1].timestampMs >= feed[2].timestampMs);
  assert.ok(feed[2].timestampMs >= feed[3].timestampMs);
  assert.equal(feed[0].category, 'nasa');
  assert.equal(feed[1].category, 'credit');
  assert.equal(feed[2].category, 'alert');
  assert.equal(feed[3].category, 'account');
});

test('prependActivityEvents keeps newest-first chronological order and caps total items', () => {
  const older = createActivityEvent({
    category: 'credit',
    timestampMs: 1000,
    titleTh: 'ขอสินเชื่อ',
    titleEn: 'Credit requested',
    detailTh: '฿18,000',
    detailEn: '฿18,000',
  });
  const newer = createActivityEvent({
    category: 'status',
    timestampMs: 5000,
    titleTh: 'สถานะเปลี่ยนเป็นเฝ้าระวัง',
    titleEn: 'Status changed to Watch',
    detailTh: '78/100',
    detailEn: '78/100',
  });

  const combined = prependActivityEvents([older], newer, 30);
  assert.equal(combined.length, 2);
  assert.equal(combined[0].id, newer.id);
  assert.equal(combined[1].id, older.id);
});

test('filterActivityFeed and countActivityByFilter group Alerts, Credit, Account, and System tabs properly', () => {
  const items = [
    createActivityEvent({
      category: 'credit',
      titleTh: 'ขอสินเชื่อ',
      titleEn: 'Credit',
      detailTh: '-',
      detailEn: '-',
    }),
    createActivityEvent({
      category: 'shield',
      titleTh: 'ประกันภัย',
      titleEn: 'Shield',
      detailTh: '-',
      detailEn: '-',
    }),
    createActivityEvent({
      category: 'status',
      titleTh: 'สถานะเปลี่ยน',
      titleEn: 'Status change',
      detailTh: '-',
      detailEn: '-',
    }),
    createActivityEvent({
      category: 'alert',
      titleTh: 'แจ้งเตือน SMS',
      titleEn: 'SMS alert',
      detailTh: '-',
      detailEn: '-',
    }),
    createActivityEvent({
      category: 'account',
      titleTh: 'ลงทะเบียนบัญชี',
      titleEn: 'Account registered',
      detailTh: '-',
      detailEn: '-',
    }),
    createActivityEvent({
      category: 'nasa',
      titleTh: 'ซิงค์ดาวเทียม NASA',
      titleEn: 'NASA sync',
      detailTh: '-',
      detailEn: '-',
    }),
  ];

  assert.equal(filterActivityFeed(items, 'all').length, 6);
  assert.equal(filterActivityFeed(items, 'alert').length, 2);
  assert.equal(filterActivityFeed(items, 'credit').length, 2);
  assert.equal(filterActivityFeed(items, 'account').length, 1);
  assert.equal(filterActivityFeed(items, 'system').length, 1);

  const counts = countActivityByFilter(items);
  assert.deepEqual(counts, {
    all: 6,
    alert: 2,
    credit: 2,
    account: 1,
    system: 1,
  });
});

test('countUnreadActivityEvents counts only events newer than lastReadTimestampMs', () => {
  const items = [
    createActivityEvent({
      category: 'alert',
      timestampMs: 3000,
      titleTh: 'ใหม่ล่าสุด',
      titleEn: 'Latest',
      detailTh: '-',
      detailEn: '-',
    }),
    createActivityEvent({
      category: 'credit',
      timestampMs: 2000,
      titleTh: 'ก่อนหน้า',
      titleEn: 'Previous',
      detailTh: '-',
      detailEn: '-',
    }),
    createActivityEvent({
      category: 'nasa',
      timestampMs: 1000,
      titleTh: 'เก่า',
      titleEn: 'Old',
      detailTh: '-',
      detailEn: '-',
    }),
  ];

  assert.equal(countUnreadActivityEvents(items, 0), 3);
  assert.equal(countUnreadActivityEvents(items, 1500), 2);
  assert.equal(countUnreadActivityEvents(items, 2000), 1);
  assert.equal(countUnreadActivityEvents(items, 3000), 0);
});


