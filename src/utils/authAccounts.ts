import type {
  ActivityFeedItem,
  AppLanguage,
  AppRoleMode,
  AuthAccount,
  BaacOfficerRegistrationInput,
  CreditApplicationRecord,
  FarmerLoanRecord,
  FarmPlotProfile,
  RegisteredUserProfile,
} from '../types/cropshield';
import { validateLineAccount, validateThaiPhoneNumber } from './alertNotifications';

export const SEED_ACCOUNTS: AuthAccount[] = [
  {
    id: 'acc-somchai',
    identifier: '0812345678',
    phoneNumber: '081-234-5678',
    fullName: 'สมชาย รักษ์ดิน',
    pin: '1234',
    role: 'farmer',
    linkedPlotId: 'plot-phetchabun-corn',
    isCustomRegistered: false,
  },
  {
    id: 'acc-maliwan',
    identifier: '0894567890',
    phoneNumber: '089-456-7890',
    fullName: 'มาลี สุขสมบูรณ์',
    pin: '1234',
    role: 'farmer',
    linkedPlotId: 'plot-surin-rice',
    isCustomRegistered: false,
  },
  {
    id: 'acc-baac-officer',
    identifier: 'officer@baac.or.th',
    phoneNumber: '02-555-0000',
    fullName: 'เจ้าหน้าที่สินเชื่อ ธ.ก.ส. (BAAC Officer)',
    pin: '9999',
    role: 'baac',
    linkedPlotId: 'plot-phetchabun-corn',
    isCustomRegistered: false,
  },
];

export function normalizeIdentifier(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return trimmed.replace(/[\s-]/g, '');
}

export interface LoginValidationErrors {
  identifier?: string;
  pin?: string;
  general?: string;
}

export function validateLoginInput(
  identifier: string,
  pin: string,
  lang: AppLanguage
): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const normalized = normalizeIdentifier(identifier);

  if (!normalized || normalized.length < 4) {
    errors.identifier =
      lang === 'th'
        ? 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก หรือรหัสเจ้าหน้าที่ ธ.ก.ส.'
        : 'Please enter your 10-digit mobile number or BAAC officer ID.';
  }

  if (!pin.trim() || pin.trim().length < 4) {
    errors.pin =
      lang === 'th'
        ? 'กรุณากรอกรหัสผ่าน / PIN อย่างน้อย 4 ตัวอักษร'
        : 'Please enter your password / PIN (at least 4 characters).';
  }

  return errors;
}

export function authenticateAccount(
  accounts: AuthAccount[],
  identifier: string,
  pin: string,
  lang: AppLanguage
): { account: AuthAccount | null; error?: string } {
  const normalizedInput = normalizeIdentifier(identifier);
  const trimmedPin = pin.trim();

  const found = accounts.find(
    (acc) =>
      normalizeIdentifier(acc.identifier) === normalizedInput ||
      normalizeIdentifier(acc.phoneNumber) === normalizedInput ||
      (acc.employeeCode ? normalizeIdentifier(acc.employeeCode) === normalizedInput : false)
  );

  if (!found || found.pin !== trimmedPin) {
    return {
      account: null,
      error:
        lang === 'th'
          ? 'เบอร์โทรศัพท์/รหัสเจ้าหน้าที่ หรือรหัสผ่านไม่ถูกต้อง (ตัวอย่าง: 081-234-5678 / PIN 1234)'
          : 'Invalid mobile/officer ID or PIN. Try Demo Farmer: 081-234-5678 / PIN 1234.',
    };
  }

  return { account: found };
}

export interface BaacRegistrationValidationErrors {
  fullName?: string;
  officerIdentifier?: string;
  phoneNumber?: string;
  branchName?: string;
  employeeCode?: string;
  passwordPin?: string;
}

export function validateBaacRegistrationInput(
  input: BaacOfficerRegistrationInput,
  lang: AppLanguage
): BaacRegistrationValidationErrors {
  const errors: BaacRegistrationValidationErrors = {};

  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    errors.fullName =
      lang === 'th'
        ? 'กรุณากรอกชื่อ-นามสกุลเจ้าหน้าที่ ธ.ก.ส.'
        : 'Please enter the BAAC officer full name.';
  }

  const cleanId = normalizeIdentifier(input.officerIdentifier);
  if (!cleanId || cleanId.length < 4) {
    errors.officerIdentifier =
      lang === 'th'
        ? 'กรุณากรอกอีเมลหรือรหัสเข้าสู่ระบบ ธ.ก.ส. (อย่างน้อย 4 ตัวอักษร)'
        : 'Please enter a BAAC email or login ID (min 4 characters).';
  }

  if (!input.employeeCode.trim() || input.employeeCode.trim().length < 3) {
    errors.employeeCode =
      lang === 'th'
        ? 'กรุณากรอกรหัสพนักงาน ธ.ก.ส.'
        : 'Please enter the BAAC employee code.';
  }

  if (!input.branchName.trim() || input.branchName.trim().length < 2) {
    errors.branchName =
      lang === 'th'
        ? 'กรุณาระบุสาขา ธ.ก.ส. หรือพื้นที่รับผิดชอบ'
        : 'Please enter the BAAC branch or region.';
  }

  const phoneErr = validateThaiPhoneNumber(input.phoneNumber);
  if (phoneErr) {
    errors.phoneNumber =
      lang === 'th'
        ? phoneErr
        : 'Please enter a valid 10-digit mobile number (e.g., 081-234-5678).';
  }

  if (!input.passwordPin.trim() || input.passwordPin.trim().length < 4) {
    errors.passwordPin =
      lang === 'th'
        ? 'กรุณาตั้งรหัสผ่าน / PIN อย่างน้อย 4 ตัวอักษร'
        : 'Please set a password or PIN with at least 4 characters.';
  }

  return errors;
}

export function upsertRegisteredAccount(
  accounts: AuthAccount[],
  params: {
    fullName: string;
    phoneNumber: string;
    pin: string;
    linkedPlotId?: string;
    role?: AppRoleMode;
    identifier?: string;
    branchName?: string;
    employeeCode?: string;
  }
): { accounts: AuthAccount[]; account: AuthAccount } {
  const role: AppRoleMode = params.role ?? 'farmer';
  const normalizedIdentifier = normalizeIdentifier(params.identifier ?? params.phoneNumber);
  const existing = accounts.find(
    (acc) => normalizeIdentifier(acc.identifier) === normalizedIdentifier
  );

  const newAccount: AuthAccount = {
    id: existing ? existing.id : `acc-reg-${Date.now()}`,
    identifier: normalizedIdentifier,
    phoneNumber: params.phoneNumber.trim(),
    fullName: params.fullName.trim(),
    pin: params.pin.trim() || '1234',
    role,
    ...(params.linkedPlotId ? { linkedPlotId: params.linkedPlotId } : {}),
    ...(params.branchName ? { branchName: params.branchName.trim() } : {}),
    ...(params.employeeCode ? { employeeCode: params.employeeCode.trim() } : {}),
    isCustomRegistered: true,
  };

  if (existing) {
    return {
      accounts: accounts.map((acc) => (acc.id === existing.id ? newAccount : acc)),
      account: newAccount,
    };
  }

  return {
    accounts: [newAccount, ...accounts],
    account: newAccount,
  };
}

export interface AccountProfileUpdateInput {
  fullName: string;
  phoneNumber: string;
  lineAccountLabel: string;
  branchName?: string;
  employeeCode?: string;
}

export interface AccountProfileValidationErrors {
  fullName?: string;
  phoneNumber?: string;
  lineAccountLabel?: string;
  branchName?: string;
  employeeCode?: string;
}

export function validateAccountProfileUpdate(
  input: AccountProfileUpdateInput,
  role: AppRoleMode,
  lang: AppLanguage
): AccountProfileValidationErrors {
  const errors: AccountProfileValidationErrors = {};
  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    errors.fullName =
      lang === 'th'
        ? 'กรุณากรอกชื่อ-นามสกุล (อย่างน้อย 2 ตัวอักษร)'
        : 'Please enter a full name (min 2 characters).';
  }
  const phoneErr = validateThaiPhoneNumber(input.phoneNumber);
  if (phoneErr) {
    errors.phoneNumber =
      lang === 'th'
        ? phoneErr
        : 'Please enter a valid 10-digit Thai mobile number (e.g., 081-234-5678).';
  }
  const lineErr = validateLineAccount(input.lineAccountLabel);
  if (lineErr) {
    errors.lineAccountLabel =
      lang === 'th'
        ? lineErr
        : 'Please enter a valid LINE Official ID (e.g., @CropShield-Somchai).';
  }
  if (role === 'baac') {
    if (!input.branchName?.trim() || input.branchName.trim().length < 2) {
      errors.branchName =
        lang === 'th'
          ? 'กรุณาระบุสาขา ธ.ก.ส. หรือพื้นที่รับผิดชอบ'
          : 'Please enter the BAAC branch or region.';
    }
    if (!input.employeeCode?.trim() || input.employeeCode.trim().length < 3) {
      errors.employeeCode =
        lang === 'th'
          ? 'กรุณาระบุรหัสพนักงาน ธ.ก.ส.'
          : 'Please enter the BAAC employee code.';
    }
  }
  return errors;
}

export function updateAccountProfile(
  accounts: AuthAccount[],
  accountId: string,
  updates: AccountProfileUpdateInput
): { accounts: AuthAccount[]; updatedAccount: AuthAccount | null } {
  let updatedAccount: AuthAccount | null = null;
  const nextAccounts = accounts.map((acc) => {
    if (acc.id !== accountId) return acc;
    updatedAccount = {
      ...acc,
      fullName: updates.fullName.trim(),
      phoneNumber: updates.phoneNumber.trim(),
      lineAccountLabel: updates.lineAccountLabel.trim(),
      ...(acc.role === 'baac' && updates.branchName !== undefined
        ? { branchName: updates.branchName.trim() }
        : {}),
      ...(acc.role === 'baac' && updates.employeeCode !== undefined
        ? { employeeCode: updates.employeeCode.trim() }
        : {}),
    };
    return updatedAccount;
  });
  return { accounts: nextAccounts, updatedAccount };
}

export function accountToRegisteredProfile(account: AuthAccount): RegisteredUserProfile {
  const firstWord = account.fullName.trim().split(/\s+/)[0] || 'Farmer';
  return {
    accountId: account.id,
    fullName: account.fullName,
    phoneNumber: account.phoneNumber,
    lineAccountLabel:
      account.lineAccountLabel?.trim() ||
      (account.role === 'baac' ? '@CropShield-BAAC' : `@CropShield-${firstWord}`),
    registeredAtLabel: account.isCustomRegistered
      ? new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : 'CropShield Verified',
    isCustomRegistered: account.isCustomRegistered,
    role: account.role,
    ...(account.branchName ? { branchName: account.branchName } : {}),
    ...(account.employeeCode ? { employeeCode: account.employeeCode } : {}),
  };
}

export interface PersistedCropShieldSession {
  activeAccountId: string | null;
  accounts: AuthAccount[];
  customPlots: FarmPlotProfile[];
  customFarmerRecords: FarmerLoanRecord[];
  activityFeed?: ActivityFeedItem[];
  lastReadActivityMs?: number;
  creditHistory?: CreditApplicationRecord[];
  emergencyPopupEnabled?: boolean;
  baacAuditLog?: import('../types/cropshield').BaacDecisionAuditEntry[];
}

const STORAGE_KEY = 'cropshield_session_v2';

export function loadPersistedSession(): PersistedCropShieldSession | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedCropShieldSession>;
    return {
      activeAccountId:
        typeof parsed.activeAccountId === 'string' ? parsed.activeAccountId : null,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : SEED_ACCOUNTS,
      customPlots: Array.isArray(parsed.customPlots) ? parsed.customPlots : [],
      customFarmerRecords: Array.isArray(parsed.customFarmerRecords)
        ? parsed.customFarmerRecords
        : [],
      activityFeed: Array.isArray(parsed.activityFeed) ? parsed.activityFeed : undefined,
      lastReadActivityMs:
        typeof parsed.lastReadActivityMs === 'number'
          ? parsed.lastReadActivityMs
          : undefined,
      creditHistory: Array.isArray(parsed.creditHistory)
        ? parsed.creditHistory
        : undefined,
      emergencyPopupEnabled:
        typeof parsed.emergencyPopupEnabled === 'boolean'
          ? parsed.emergencyPopupEnabled
          : undefined,
      baacAuditLog: Array.isArray(parsed.baacAuditLog)
        ? parsed.baacAuditLog
        : undefined,
    };
  } catch {
    return null;
  }
}

export function savePersistedSession(session: PersistedCropShieldSession): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}
