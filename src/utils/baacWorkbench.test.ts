import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_FARMER_RECORDS } from '../data/mockFarmers';
import {
  applyBaacPolicyFilters,
  applyScenarioToBaacFarmers,
  BAAC_THEME_PRESETS,
  buildAiCreditInsight,
  buildBaacOfficerMascotTip,
  buildBaacSmsDraft,
  buildPortfolioRiskRadar,
  createBaacAuditEntry,
  createSeedBaacAuditLog,
  extractBaacFilterOptions,
  filterBaacCompactList,
  filterBaacFarmers,
  formatThaiBuddhistDateTime,
  getDaysUntilRepayment,
  getFarmerTrancheSchedule,
  getRepaymentCountdownMeta,
  hasContractOrInsuranceProtection,
  isReadyToReleaseLoan,
  splitTrancheApprovalQueue,
} from './baacWorkbench';

test('filterBaacFarmers filters accurately by area/coop, crop type, 7-day risk status, and contract/insurance toggle', () => {
  const options = extractBaacFilterOptions(INITIAL_FARMER_RECORDS);
  assert.ok(options.areaCoopOptions.length >= 6);
  assert.ok(options.cropOptions.includes('ข้าวโพดเลี้ยงสัตว์'));

  // Filter by 'ready' (พร้อมปล่อยกู้)
  const readyOnly = filterBaacFarmers(INITIAL_FARMER_RECORDS, {
    searchQuery: '',
    areaOrCoop: 'all',
    cropType: 'all',
    riskFilter: 'ready',
    onlyContractOrInsurance: false,
  });
  assert.ok(readyOnly.length >= 3);
  assert.ok(readyOnly.every((r) => isReadyToReleaseLoan(r)));
  assert.ok(readyOnly.every((r) => r.riskLevel !== 'critical'));

  // Filter by 'critical'
  const criticalOnly = filterBaacFarmers(INITIAL_FARMER_RECORDS, {
    searchQuery: '',
    areaOrCoop: 'all',
    cropType: 'all',
    riskFilter: 'critical',
    onlyContractOrInsurance: false,
  });
  assert.equal(criticalOnly.length, 1);
  assert.equal(criticalOnly[0].id, 'baac-003');

  // Filter by Contract Farming or Insurance only
  const protectedOnly = filterBaacFarmers(INITIAL_FARMER_RECORDS, {
    searchQuery: '',
    areaOrCoop: 'all',
    cropType: 'all',
    riskFilter: 'all',
    onlyContractOrInsurance: true,
  });
  assert.equal(protectedOnly.length, 5);
  assert.ok(protectedOnly.every((r) => hasContractOrInsuranceProtection(r)));
  assert.equal(
    protectedOnly.some((r) => r.id === 'baac-005'),
    false
  );

  // Filter by specific crop
  const cornOnly = filterBaacFarmers(INITIAL_FARMER_RECORDS, {
    searchQuery: '',
    areaOrCoop: 'all',
    cropType: 'ข้าวโพดเลี้ยงสัตว์',
    riskFilter: 'all',
    onlyContractOrInsurance: false,
  });
  assert.equal(cornOnly.length, 1);
  assert.equal(cornOnly[0].id, 'baac-001');
});

test('applyBaacPolicyFilters handles portfolioScope, enforceMinScoreFilter, and radarDayFarmerIds', () => {
  const contractOnly = applyBaacPolicyFilters(INITIAL_FARMER_RECORDS, {
    searchQuery: '',
    areaOrCoop: 'all',
    cropType: 'all',
    riskFilter: 'all',
    onlyContractOrInsurance: false,
    portfolioScope: 'contract-only',
    minHealthScore: 70,
  });
  assert.equal(contractOnly.length, 4);
  assert.equal(
    contractOnly.some((r) => r.id === 'baac-005'),
    false
  );

  const aboveThreshold = applyBaacPolicyFilters(INITIAL_FARMER_RECORDS, {
    searchQuery: '',
    areaOrCoop: 'all',
    cropType: 'all',
    riskFilter: 'all',
    onlyContractOrInsurance: false,
    portfolioScope: 'branch-all',
    minHealthScore: 75,
    enforceMinScoreFilter: true,
  });
  assert.ok(aboveThreshold.every((r) => r.nasaHealthScore >= 75));
  assert.equal(
    aboveThreshold.some((r) => r.id === 'baac-003'),
    false
  );
});

test('buildPortfolioRiskRadar returns 7 daily risk summaries with accurate loan exposure', () => {
  const radar = buildPortfolioRiskRadar(INITIAL_FARMER_RECORDS, 'th');
  assert.equal(radar.length, 7);
  assert.equal(radar[0].dayNumber, 1);
  assert.equal(radar[6].dayNumber, 7);
  // Day 4 should detect critical risk (baac-003) and exposed loan THB > 0
  const day4 = radar[3];
  assert.ok(day4.criticalCount >= 1);
  assert.ok(day4.watchCount >= 1);
  assert.ok(day4.exposedLoanThb >= 85000);
  assert.ok(day4.atRiskFarmerIds.includes('baac-003'));
});

test('splitTrancheApprovalQueue and audit helpers track pending/processed approvals and NASA rationale', () => {
  const { pendingApproval, processedApprovals } = splitTrancheApprovalQueue(
    INITIAL_FARMER_RECORDS
  );
  assert.ok(pendingApproval.length >= 3);
  assert.ok(processedApprovals.length >= 2);

  const seedAudit = createSeedBaacAuditLog(INITIAL_FARMER_RECORDS);
  assert.equal(seedAudit.length, 3);

  const audit = createBaacAuditEntry({
    officerName: 'เจ้าหน้าที่ ทดสอบ',
    record: INITIAL_FARMER_RECORDS[0],
    actionType: 'approve-tranche',
    minHealthScore: 70,
    lang: 'th',
  });
  assert.match(audit.actionLabelTh, /อนุมัติเบิกจ่ายงวดที่ 2/);
  assert.match(audit.nasaRationaleTh, /NASA 78\/100/);
});

test('buildAiCreditInsight adapts recommendation to risk level, minHealthScore, and management mode', () => {
  const watchFarmer = INITIAL_FARMER_RECORDS[0]; // score 78, watch
  const phasedInsight = buildAiCreditInsight(watchFarmer, 'phased-tranche', 'th');
  assert.equal(phasedInsight.tone, 'amber');
  assert.equal(phasedInsight.suggestedDisbursementThb, 20000);
  assert.match(phasedInsight.loanRecommendation, /งวดที่ 2/);

  const revolvingInsight = buildAiCreditInsight(
    watchFarmer,
    'pre-approved-revolving',
    'th'
  );
  assert.equal(revolvingInsight.suggestedDisbursementThb, 21000);
  assert.match(revolvingInsight.loanRecommendation, /วงเงินหมุนเวียนเบื้องต้น/);

  const insuranceInsight = buildAiCreditInsight(
    watchFarmer,
    'trigger-insurance',
    'th'
  );
  assert.match(insuranceInsight.headline, /Parametric Shield/);

  const criticalFarmer = INITIAL_FARMER_RECORDS[2]; // score 54, critical
  const criticalInsight = buildAiCreditInsight(
    criticalFarmer,
    'phased-tranche',
    'en'
  );
  assert.equal(criticalInsight.tone, 'red');
  assert.equal(criticalInsight.suggestedDisbursementThb, 0);
  assert.match(criticalInsight.headline, /Hold Principal/i);
});

test('BAAC_THEME_PRESETS exposes 4 distinct selectable themes', () => {
  assert.equal(Object.keys(BAAC_THEME_PRESETS).length, 4);
  assert.ok(BAAC_THEME_PRESETS['baac-emerald'].primaryBtnClass);
  assert.ok(BAAC_THEME_PRESETS['fintech-navy'].primaryBtnClass);
  assert.ok(BAAC_THEME_PRESETS['agri-amber'].primaryBtnClass);
  assert.ok(BAAC_THEME_PRESETS['slate-minimal'].primaryBtnClass);
});

test('applyScenarioToBaacFarmers, filterBaacCompactList, countdown meta, SMS draft, and mascot tip work cleanly', () => {
  const droughtPortfolio = applyScenarioToBaacFarmers(
    INITIAL_FARMER_RECORDS,
    'drought'
  );
  assert.equal(droughtPortfolio.length, INITIAL_FARMER_RECORDS.length);
  assert.ok(
    droughtPortfolio[0].nasaHealthScore < INITIAL_FARMER_RECORDS[0].nasaHealthScore
  );
  assert.match(droughtPortfolio[0].riskStatus7DayTh, /จำลองแล้ง 7 วัน/);

  const risk7dList = filterBaacCompactList(INITIAL_FARMER_RECORDS, 'risk7d');
  assert.ok(
    risk7dList.every((f) => f.riskLevel === 'watch' || f.riskLevel === 'critical')
  );

  const dueSoonList = filterBaacCompactList(INITIAL_FARMER_RECORDS, 'due-soon');
  assert.ok(dueSoonList.every((f) => getDaysUntilRepayment(f) <= 15));
  assert.ok(dueSoonList.some((f) => f.id === 'baac-003'));

  const urgentMeta = getRepaymentCountdownMeta(6, 'th');
  assert.equal(urgentMeta.tone, 'red');
  assert.match(urgentMeta.compactLabel, /เหลือ 6 วัน/);

  const schedule = getFarmerTrancheSchedule(INITIAL_FARMER_RECORDS[0]);
  assert.equal(schedule.length, 3);
  assert.equal(schedule[0].status, 'approved');

  const formattedBe = formatThaiBuddhistDateTime(
    new Date(2026, 10, 14, 22, 45),
    'th'
  );
  assert.equal(formattedBe, '14 พ.ย. 2569, 22:45 น.');

  const smsTh = buildBaacSmsDraft(INITIAL_FARMER_RECORDS[0], 'th');
  assert.match(smsTh, /นายสมชาย/);
  assert.match(smsTh, /เหลืออีก 14 วัน/);

  const tipTh = buildBaacOfficerMascotTip(INITIAL_FARMER_RECORDS, 'th');
  assert.match(tipTh, /แนะนำกด AI ร่าง SMS/);
});

