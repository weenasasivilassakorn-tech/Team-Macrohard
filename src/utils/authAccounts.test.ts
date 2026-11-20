import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_ACCOUNTS,
  accountToRegisteredProfile,
  authenticateAccount,
  normalizeIdentifier,
  updateAccountProfile,
  upsertRegisteredAccount,
  validateAccountProfileUpdate,
  validateBaacRegistrationInput,
  validateLoginInput,
} from './authAccounts';

test('normalizeIdentifier cleans Thai phone formatting and trims emails', () => {
  assert.equal(normalizeIdentifier('081-234-5678'), '0812345678');
  assert.equal(normalizeIdentifier(' 089 888 7766 '), '0898887766');
  assert.equal(normalizeIdentifier(' Officer@BAAC.or.th '), 'officer@baac.or.th');
});

test('validateLoginInput validates missing identifier or short PIN in TH and EN', () => {
  const errTh = validateLoginInput('', '12', 'th');
  assert.ok(errTh.identifier);
  assert.ok(errTh.pin);

  const errEn = validateLoginInput('081-234-5678', '123', 'en');
  assert.equal(errEn.identifier, undefined);
  assert.match(errEn.pin ?? '', /4 characters/i);
});

test('authenticateAccount supports demo farmer, BAAC officer, and newly registered accounts', () => {
  const farmerResult = authenticateAccount(SEED_ACCOUNTS, '081-234-5678', '1234', 'th');
  assert.equal(farmerResult.account?.role, 'farmer');
  assert.equal(farmerResult.account?.linkedPlotId, 'plot-phetchabun-corn');

  const baacResult = authenticateAccount(
    SEED_ACCOUNTS,
    'officer@baac.or.th',
    '9999',
    'en'
  );
  assert.equal(baacResult.account?.role, 'baac');

  const wrongPin = authenticateAccount(SEED_ACCOUNTS, '0812345678', '0000', 'en');
  assert.equal(wrongPin.account, null);
  assert.ok(wrongPin.error);

  const { accounts: updatedAccounts, account: created } = upsertRegisteredAccount(
    SEED_ACCOUNTS,
    {
      fullName: 'วีณา ศศิวิลาส',
      phoneNumber: '089-888-7766',
      pin: '5678',
      linkedPlotId: 'plot-reg-test',
    }
  );
  assert.equal(created.isCustomRegistered, true);

  const loginCreated = authenticateAccount(
    updatedAccounts,
    '0898887766',
    '5678',
    'th'
  );
  assert.equal(loginCreated.account?.fullName, 'วีณา ศศิวิลาส');
  assert.equal(loginCreated.account?.linkedPlotId, 'plot-reg-test');
});

test('validateBaacRegistrationInput and upsertRegisteredAccount support BAAC Credit Officer registration', () => {
  const invalid = validateBaacRegistrationInput(
    {
      fullName: 'ก',
      officerIdentifier: 'ab',
      phoneNumber: '123',
      branchName: '',
      employeeCode: '12',
      passwordPin: '99',
    },
    'th'
  );
  assert.ok(invalid.fullName);
  assert.ok(invalid.officerIdentifier);
  assert.ok(invalid.phoneNumber);
  assert.ok(invalid.branchName);
  assert.ok(invalid.employeeCode);
  assert.ok(invalid.passwordPin);

  const validInput = {
    fullName: 'สมศักดิ์ ธนาคารดี',
    officerIdentifier: 'somsak@baac.or.th',
    phoneNumber: '081-777-6655',
    branchName: 'สาขาหนองไผ่ จ.เพชรบูรณ์',
    employeeCode: 'BAAC-4021',
    passwordPin: '8888',
  };
  const noErrors = validateBaacRegistrationInput(validInput, 'en');
  assert.equal(Object.keys(noErrors).length, 0);

  const { accounts: withOfficer, account: officer } = upsertRegisteredAccount(
    SEED_ACCOUNTS,
    {
      fullName: validInput.fullName,
      phoneNumber: validInput.phoneNumber,
      pin: validInput.passwordPin,
      role: 'baac',
      identifier: validInput.officerIdentifier,
      branchName: validInput.branchName,
      employeeCode: validInput.employeeCode,
    }
  );

  assert.equal(officer.role, 'baac');
  assert.equal(officer.branchName, 'สาขาหนองไผ่ จ.เพชรบูรณ์');

  const loginByEmail = authenticateAccount(withOfficer, 'somsak@baac.or.th', '8888', 'th');
  assert.equal(loginByEmail.account?.id, officer.id);

  const loginByEmployeeCode = authenticateAccount(withOfficer, 'BAAC-4021', '8888', 'th');
  assert.equal(loginByEmployeeCode.account?.id, officer.id);
});

test('validateAccountProfileUpdate and updateAccountProfile update user profile settings safely', () => {
  const errs = validateAccountProfileUpdate(
    {
      fullName: 'ก',
      phoneNumber: '123',
      lineAccountLabel: 'a',
    },
    'farmer',
    'th'
  );
  assert.ok(errs.fullName);
  assert.ok(errs.phoneNumber);
  assert.ok(errs.lineAccountLabel);

  const validUpdate = {
    fullName: 'สมชาย รักษ์ดิน (ปรับปรุง)',
    phoneNumber: '089-111-2233',
    lineAccountLabel: '@Somchai-Farm',
  };
  assert.equal(
    Object.keys(validateAccountProfileUpdate(validUpdate, 'farmer', 'th')).length,
    0
  );

  const { accounts: updatedList, updatedAccount } = updateAccountProfile(
    SEED_ACCOUNTS,
    'acc-somchai',
    validUpdate
  );
  assert.ok(updatedAccount);
  assert.equal(updatedAccount?.fullName, 'สมชาย รักษ์ดิน (ปรับปรุง)');
  assert.equal(updatedAccount?.phoneNumber, '089-111-2233');
  assert.equal(updatedAccount?.lineAccountLabel, '@Somchai-Farm');

  const profile = accountToRegisteredProfile(updatedAccount!);
  assert.equal(profile.lineAccountLabel, '@Somchai-Farm');
  assert.equal(
    updatedList.find((a) => a.id === 'acc-somchai')?.phoneNumber,
    '089-111-2233'
  );
});
