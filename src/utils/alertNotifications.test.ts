import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ALERT_CONFIG,
  createAlertLogEntries,
  formatAlertMessage,
  shouldTriggerRiskAlert,
  validateLineAccount,
  validateThaiPhoneNumber,
} from './alertNotifications';
import { DEMO_PLOTS, evaluatePlotProfile } from './nasaPower';

test('shouldTriggerRiskAlert fires only on risk escalation when enabled', () => {
  assert.equal(shouldTriggerRiskAlert('low', 'watch', DEFAULT_ALERT_CONFIG), true);
  assert.equal(shouldTriggerRiskAlert('low', 'critical', DEFAULT_ALERT_CONFIG), true);
  assert.equal(shouldTriggerRiskAlert('watch', 'critical', DEFAULT_ALERT_CONFIG), true);

  // Should not fire when staying at same level, improving, or null initial state
  assert.equal(shouldTriggerRiskAlert(null, 'watch', DEFAULT_ALERT_CONFIG), false);
  assert.equal(shouldTriggerRiskAlert('watch', 'watch', DEFAULT_ALERT_CONFIG), false);
  assert.equal(shouldTriggerRiskAlert('watch', 'low', DEFAULT_ALERT_CONFIG), false);
  assert.equal(shouldTriggerRiskAlert('critical', 'watch', DEFAULT_ALERT_CONFIG), false);

  // Respects disabled state and per-level toggles
  assert.equal(
    shouldTriggerRiskAlert('low', 'watch', { ...DEFAULT_ALERT_CONFIG, enabled: false }),
    false
  );
  assert.equal(
    shouldTriggerRiskAlert('low', 'watch', { ...DEFAULT_ALERT_CONFIG, notifyOnWatch: false }),
    false
  );
});

test('validateThaiPhoneNumber and validateLineAccount enforce valid inputs', () => {
  assert.equal(validateThaiPhoneNumber('081-234-5678'), null);
  assert.equal(validateThaiPhoneNumber('0998887766'), null);
  assert.notEqual(validateThaiPhoneNumber(''), null);
  assert.notEqual(validateThaiPhoneNumber('021234567'), null); // landline, not mobile

  assert.equal(validateLineAccount('@CropShield-Somchai'), null);
  assert.notEqual(validateLineAccount(''), null);
  assert.notEqual(validateLineAccount('ab'), null);
});

test('formatAlertMessage and createAlertLogEntries produce LINE and SMS alerts in plain Thai', () => {
  const cornPlot = DEMO_PLOTS[0];
  const evalWatch = evaluatePlotProfile(cornPlot, 'demo', 'ตอนนี้');

  const lineMsg = formatAlertMessage(cornPlot, evalWatch, 'low', 'line');
  const smsMsg = formatAlertMessage(cornPlot, evalWatch, 'low', 'sms');

  assert.match(lineMsg, /แปลงข้าวโพด/);
  assert.match(lineMsg, /78\/100/);
  assert.match(lineMsg, /เฝ้าระวัง/);
  assert.match(smsMsg, /CropShield:/);
  assert.match(smsMsg, /78\/100/);

  const entries = createAlertLogEntries(
    cornPlot,
    evalWatch,
    'low',
    DEFAULT_ALERT_CONFIG,
    'auto-transition',
    new Date('2026-11-14T03:40:00Z')
  );
  assert.equal(entries.length, 2);
  assert.equal(entries[0].channel, 'line');
  assert.equal(entries[1].channel, 'sms');
});
