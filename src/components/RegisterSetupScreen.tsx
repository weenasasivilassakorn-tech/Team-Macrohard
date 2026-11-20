import React, { useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Satellite,
  Smartphone,
  Sprout,
  UserPlus,
} from 'lucide-react';
import type {
  AppLanguage,
  AppRoleMode,
  BaacOfficerRegistrationInput,
  FarmerRegistrationInput,
} from '../types/cropshield';
import {
  type BaacRegistrationValidationErrors,
  validateBaacRegistrationInput,
} from '../utils/authAccounts';
import {
  CROP_OPTIONS,
  PROVINCE_PRESETS,
  type RegistrationValidationErrors,
  validateRegistrationInput,
} from '../utils/farmScenarios';
import { APP_COPY } from '../utils/i18n';

interface RegisterSetupScreenProps {
  lang: AppLanguage;
  isSubmitting: boolean;
  onRegisterFarmer: (input: FarmerRegistrationInput) => Promise<void>;
  onRegisterBaacOfficer: (input: BaacOfficerRegistrationInput) => Promise<void>;
  embedded?: boolean;
}

export const RegisterSetupScreen: React.FC<RegisterSetupScreenProps> = ({
  lang,
  isSubmitting,
  onRegisterFarmer,
  onRegisterBaacOfficer,
  embedded = false,
}) => {
  const copy = APP_COPY[lang].register;
  const [registerAs, setRegisterAs] = useState<AppRoleMode>('farmer');
  const [showPin, setShowPin] = useState(false);

  const [form, setForm] = useState<FarmerRegistrationInput>({
    fullName: '',
    phoneNumber: '',
    passwordPin: '1234',
    cropKey: 'corn',
    areaRai: 15,
    provinceKey: PROVINCE_PRESETS[0].key,
    districtName:
      lang === 'th'
        ? PROVINCE_PRESETS[0].defaultDistrictTh
        : PROVINCE_PRESETS[0].defaultDistrictEn,
    lat: PROVINCE_PRESETS[0].lat,
    lon: PROVINCE_PRESETS[0].lon,
    useCustomCoords: false,
  });

  const [baacForm, setBaacForm] = useState<BaacOfficerRegistrationInput>({
    fullName: '',
    officerIdentifier: '',
    phoneNumber: '',
    branchName: '',
    employeeCode: '',
    passwordPin: '1234',
  });

  const [errors, setErrors] = useState<RegistrationValidationErrors>({});
  const [baacErrors, setBaacErrors] = useState<BaacRegistrationValidationErrors>({});

  const handleProvinceChange = (provinceKey: string) => {
    const found =
      PROVINCE_PRESETS.find((p) => p.key === provinceKey) ?? PROVINCE_PRESETS[0];
    setForm((prev) => ({
      ...prev,
      provinceKey,
      districtName: lang === 'th' ? found.defaultDistrictTh : found.defaultDistrictEn,
      lat: found.lat,
      lon: found.lon,
    }));
    setErrors((prev) => ({ ...prev, coords: undefined }));
  };

  const handleSubmitFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRegistrationInput(form, lang);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    await onRegisterFarmer(form);
  };

  const handleSubmitBaac = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBaacRegistrationInput(baacForm, lang);
    setBaacErrors(validation);
    if (Object.keys(validation).length > 0) return;

    await onRegisterBaacOfficer(baacForm);
  };

  const roleSelectorBlock = (
    <div className="space-y-2">
      <div className="text-xs font-bold text-slate-700">
        {copy.registerAsLabel}
      </div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
        role="radiogroup"
        aria-label={copy.registerAsLabel}
      >
        <button
          type="button"
          role="radio"
          aria-checked={registerAs === 'farmer'}
          data-testid="register-role-farmer"
          onClick={() => setRegisterAs('farmer')}
          className={`min-h-[60px] p-3.5 rounded-xl border text-left flex items-start gap-3 transition-colors ${
            registerAs === 'farmer'
              ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div
            className={`p-2 rounded-lg shrink-0 ${
              registerAs === 'farmer'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Sprout className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">
              {copy.roleFarmerTitle}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {copy.roleFarmerDesc}
            </div>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={registerAs === 'baac'}
          data-testid="register-role-baac"
          onClick={() => setRegisterAs('baac')}
          className={`min-h-[60px] p-3.5 rounded-xl border text-left flex items-start gap-3 transition-colors ${
            registerAs === 'baac'
              ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div
            className={`p-2 rounded-lg shrink-0 ${
              registerAs === 'baac'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">
              {copy.roleBaacTitle}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {copy.roleBaacDesc}
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const farmerFormContent = (
    <form onSubmit={(e) => void handleSubmitFarmer(e)} className="space-y-4">
      <div>
        <label
          htmlFor="reg-fullname"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          {copy.fullNameLabel}
        </label>
        <input
          id="reg-fullname"
          type="text"
          value={form.fullName}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, fullName: e.target.value }));
            setErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          placeholder={copy.fullNamePlaceholder}
          className="w-full min-h-[44px] px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        {errors.fullName && (
          <p className="text-xs text-red-600 mt-1" role="alert">
            {errors.fullName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label
            htmlFor="reg-phone"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.phoneLabel}
          </label>
          <div className="relative">
            <Smartphone
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="reg-phone"
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, phoneNumber: e.target.value }));
                setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
              }}
              placeholder={copy.phonePlaceholder}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          {errors.phoneNumber && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.phoneNumber}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="reg-pin"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.pinLabel}
          </label>
          <div className="relative">
            <KeyRound
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="reg-pin"
              type={showPin ? 'text' : 'password'}
              value={form.passwordPin ?? ''}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, passwordPin: e.target.value }));
                setErrors((prev) => ({ ...prev, passwordPin: undefined }));
              }}
              placeholder={copy.pinPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-11 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={() => setShowPin((prev) => !prev)}
              aria-label={showPin ? 'Hide registration PIN' : 'Show registration PIN'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-0 top-0 text-slate-500 hover:text-slate-900"
            >
              {showPin ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.passwordPin && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.passwordPin}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label
            htmlFor="reg-crop"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.cropLabel}
          </label>
          <div className="relative">
            <Sprout
              className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <select
              id="reg-crop"
              value={form.cropKey}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  cropKey: e.target.value as FarmerRegistrationInput['cropKey'],
                }))
              }
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {CROP_OPTIONS.map((crop) => (
                <option key={crop.key} value={crop.key}>
                  {lang === 'th' ? crop.labelTh : crop.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-area"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.areaLabel}
          </label>
          <input
            id="reg-area"
            type="number"
            min={1}
            max={1000}
            value={form.areaRai}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, areaRai: Number(e.target.value) }));
              setErrors((prev) => ({ ...prev, areaRai: undefined }));
            }}
            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {errors.areaRai && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.areaRai}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label
            htmlFor="reg-province"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.provinceLabel}
          </label>
          <select
            id="reg-province"
            value={form.provinceKey}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {PROVINCE_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {lang === 'th'
                  ? `จ.${p.nameTh} (${p.defaultDistrictTh})`
                  : `${p.nameEn} (${p.defaultDistrictEn})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="reg-district"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.districtLabel}
          </label>
          <input
            id="reg-district"
            type="text"
            value={form.districtName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, districtName: e.target.value }))
            }
            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Coordinates Box */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span className="font-mono tabular-nums font-semibold">
              {form.lat.toFixed(4)}° N, {form.lon.toFixed(4)}° E
            </span>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.useCustomCoords}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, useCustomCoords: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-emerald-700"
            />
            <span>{copy.customCoordsToggle}</span>
          </label>
        </div>

        {form.useCustomCoords && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-lat" className="block text-[11px] text-slate-600 mb-1">
                {copy.latLabel}
              </label>
              <input
                id="reg-lat"
                type="number"
                step="0.0001"
                value={form.lat}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, lat: Number(e.target.value) }));
                  setErrors((prev) => ({ ...prev, coords: undefined }));
                }}
                className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label htmlFor="reg-lon" className="block text-[11px] text-slate-600 mb-1">
                {copy.lonLabel}
              </label>
              <input
                id="reg-lon"
                type="number"
                step="0.0001"
                value={form.lon}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, lon: Number(e.target.value) }));
                  setErrors((prev) => ({ ...prev, coords: undefined }));
                }}
                className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>
        )}

        {errors.coords && (
          <p className="text-xs text-red-600" role="alert">
            {errors.coords}
          </p>
        )}
      </div>

      {isSubmitting && (
        <div
          data-testid="nasa-registration-loading"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-950"
        >
          <Loader2 className="w-5 h-5 text-emerald-700 animate-spin shrink-0" aria-hidden="true" />
          <div>
            <div className="font-bold">{copy.loadingBtn}</div>
            <div className="text-emerald-800 mt-0.5">{copy.loadingHint}</div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="submit-farmer-registration"
        className="min-h-[48px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-70 transition-colors"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          <Satellite className="w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        <span>{isSubmitting ? copy.loadingBtn : copy.submitBtn}</span>
      </button>
    </form>
  );

  const baacFormContent = (
    <form
      onSubmit={(e) => void handleSubmitBaac(e)}
      className="space-y-4"
      data-testid="baac-registration-form"
    >
      <div>
        <label
          htmlFor="baac-reg-fullname"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          {copy.baacFullNameLabel}
        </label>
        <input
          id="baac-reg-fullname"
          type="text"
          value={baacForm.fullName}
          onChange={(e) => {
            setBaacForm((prev) => ({ ...prev, fullName: e.target.value }));
            setBaacErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          placeholder={copy.baacFullNamePlaceholder}
          className="w-full min-h-[44px] px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        {baacErrors.fullName && (
          <p className="text-xs text-red-600 mt-1" role="alert">
            {baacErrors.fullName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label
            htmlFor="baac-reg-identifier"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.baacIdentifierLabel}
          </label>
          <div className="relative">
            <Mail
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="baac-reg-identifier"
              type="text"
              value={baacForm.officerIdentifier}
              onChange={(e) => {
                setBaacForm((prev) => ({
                  ...prev,
                  officerIdentifier: e.target.value,
                }));
                setBaacErrors((prev) => ({
                  ...prev,
                  officerIdentifier: undefined,
                }));
              }}
              placeholder={copy.baacIdentifierPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          {baacErrors.officerIdentifier && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {baacErrors.officerIdentifier}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="baac-reg-empcode"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.baacEmployeeCodeLabel}
          </label>
          <div className="relative">
            <BadgeCheck
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="baac-reg-empcode"
              type="text"
              value={baacForm.employeeCode}
              onChange={(e) => {
                setBaacForm((prev) => ({
                  ...prev,
                  employeeCode: e.target.value,
                }));
                setBaacErrors((prev) => ({
                  ...prev,
                  employeeCode: undefined,
                }));
              }}
              placeholder={copy.baacEmployeeCodePlaceholder}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          {baacErrors.employeeCode && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {baacErrors.employeeCode}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="baac-reg-branch"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          {copy.baacBranchLabel}
        </label>
        <div className="relative">
          <Building2
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="baac-reg-branch"
            type="text"
            value={baacForm.branchName}
            onChange={(e) => {
              setBaacForm((prev) => ({ ...prev, branchName: e.target.value }));
              setBaacErrors((prev) => ({ ...prev, branchName: undefined }));
            }}
            placeholder={copy.baacBranchPlaceholder}
            className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        {baacErrors.branchName && (
          <p className="text-xs text-red-600 mt-1" role="alert">
            {baacErrors.branchName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label
            htmlFor="baac-reg-phone"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.baacPhoneLabel}
          </label>
          <div className="relative">
            <Smartphone
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="baac-reg-phone"
              type="tel"
              value={baacForm.phoneNumber}
              onChange={(e) => {
                setBaacForm((prev) => ({ ...prev, phoneNumber: e.target.value }));
                setBaacErrors((prev) => ({ ...prev, phoneNumber: undefined }));
              }}
              placeholder={copy.phonePlaceholder}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          {baacErrors.phoneNumber && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {baacErrors.phoneNumber}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="baac-reg-pin"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {copy.pinLabel}
          </label>
          <div className="relative">
            <KeyRound
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="baac-reg-pin"
              type={showPin ? 'text' : 'password'}
              value={baacForm.passwordPin}
              onChange={(e) => {
                setBaacForm((prev) => ({ ...prev, passwordPin: e.target.value }));
                setBaacErrors((prev) => ({ ...prev, passwordPin: undefined }));
              }}
              placeholder={copy.pinPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-11 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={() => setShowPin((prev) => !prev)}
              aria-label={showPin ? 'Hide officer PIN' : 'Show officer PIN'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-0 top-0 text-slate-500 hover:text-slate-900"
            >
              {showPin ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {baacErrors.passwordPin && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {baacErrors.passwordPin}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="submit-baac-registration"
        className="min-h-[48px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-70 transition-colors"
      >
        <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{copy.baacSubmitBtn}</span>
      </button>
    </form>
  );

  const combinedContent = (
    <div className="space-y-5">
      {roleSelectorBlock}
      <div className="border-t border-slate-100 pt-4">
        {registerAs === 'farmer' ? farmerFormContent : baacFormContent}
      </div>
    </div>
  );

  if (embedded) {
    return combinedContent;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <UserPlus className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {copy.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              {copy.subtitle}
            </p>
          </div>
        </div>

        {combinedContent}
      </section>
    </div>
  );
};
