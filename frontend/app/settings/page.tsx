'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDemo } from '@/lib/demo-context';
import {
  ApiRecipientProfile,
  ApiRecipientProfileUpdate,
  RecipientOrgType,
  RecipientDietaryPreference,
  RecipientStorageType,
} from '@/lib/api';
import {
  Building2,
  Scale,
  MapPin,
  Utensils,
  ThermometerSnowflake,
  Clock,
  Save,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Sparkles,
  Info,
  ArrowLeft,
} from 'lucide-react';

interface FormState {
  org_type: RecipientOrgType;
  daily_capacity_meals: string;
  max_travel_distance_km: string;
  dietary_preferences: RecipientDietaryPreference;
  storage_types: RecipientStorageType[];
  operating_hours: string;
}

export default function SettingsPage() {
  const { user, isLiveBackend, recipientProfile, getRecipientProfile, updateRecipientProfile } = useDemo();

  const [form, setForm] = useState<FormState>({
    org_type: 'SHELTER',
    daily_capacity_meals: '100',
    max_travel_distance_km: '15.0',
    dietary_preferences: 'ALL',
    storage_types: ['DRY'],
    operating_hours: '08:00 - 20:00',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [lastSavedProfile, setLastSavedProfile] = useState<ApiRecipientProfile | null>(null);

  // Sync form state from loaded profile
  const populateForm = (profile: ApiRecipientProfile) => {
    setForm({
      org_type: profile.org_type || 'SHELTER',
      daily_capacity_meals: String(profile.daily_capacity_meals ?? 100),
      max_travel_distance_km: String(profile.max_travel_distance_km ?? 15.0),
      dietary_preferences: profile.dietary_preferences || 'ALL',
      storage_types: (profile.storage_types as RecipientStorageType[]) || ['DRY'],
      operating_hours: profile.operating_hours || '',
    });
    setLastSavedProfile(profile);
  };

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (user && user.role !== 'RECIPIENT') {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const profile = await getRecipientProfile();
        if (isMounted && profile) {
          populateForm(profile);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Failed to load recipient profile from server.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    const capacityNum = Number(form.daily_capacity_meals);
    if (form.daily_capacity_meals.trim() === '' || isNaN(capacityNum)) {
      errors.daily_capacity_meals = 'Daily intake capacity is required.';
    } else if (!Number.isInteger(capacityNum)) {
      errors.daily_capacity_meals = 'Daily capacity must be a whole number (integer).';
    } else if (capacityNum < 0) {
      errors.daily_capacity_meals = 'Daily capacity must be 0 or greater (ge=0).';
    }

    const distanceNum = Number(form.max_travel_distance_km);
    if (form.max_travel_distance_km.trim() === '' || isNaN(distanceNum)) {
      errors.max_travel_distance_km = 'Maximum travel distance is required.';
    } else if (distanceNum <= 0) {
      errors.max_travel_distance_km = 'Maximum travel distance must be strictly greater than 0 km.';
    } else if (distanceNum > 50) {
      errors.max_travel_distance_km = 'Travel distance cannot exceed 50 km.';
    }

    if (!form.storage_types || form.storage_types.length === 0) {
      errors.storage_types = 'Please select at least one storage facility type.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleToggleStorage = (storage: RecipientStorageType) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    if (form.storage_types.includes(storage)) {
      setForm((prev) => ({
        ...prev,
        storage_types: prev.storage_types.filter((s) => s !== storage),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        storage_types: [...prev.storage_types, storage],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload: ApiRecipientProfileUpdate = {
        org_type: form.org_type,
        daily_capacity_meals: parseInt(form.daily_capacity_meals, 10),
        max_travel_distance_km: parseFloat(form.max_travel_distance_km),
        dietary_preferences: form.dietary_preferences,
        storage_types: form.storage_types,
        operating_hours: form.operating_hours.trim() || null,
      };

      const updatedProfile = await updateRecipientProfile(payload);
      populateForm(updatedProfile);
      setSuccessMessage('Intake settings and capacity requirements successfully saved and synchronized!');
    } catch (err: any) {
      // Keep form inputs intact so unsaved edits are preserved
      setErrorMessage(
        err?.message ||
          'Failed to save intake settings to server. Your unsaved modifications have been preserved below.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const profile = await getRecipientProfile();
      if (profile) {
        populateForm(profile);
        setFieldErrors({});
        setSuccessMessage('Profile settings reloaded from authoritative server records.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reload profile from server.');
    } finally {
      setIsReloading(false);
    }
  };

  const handleReset = () => {
    if (lastSavedProfile) {
      populateForm(lastSavedProfile);
      setFieldErrors({});
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <ProtectedRoute>
          {/* Role Access Guard: Prevent Food Providers or other unauthorized roles from editing settings */}
          {user && user.role !== 'RECIPIENT' ? (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-2">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Access Restricted: Recipient Settings Only</h1>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                You are currently signed in as a <strong>Food Provider</strong> ({user.organization}). Intake capacity and storage settings are configured by community recipient organizations.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Provider Dashboard
                </Link>
                <Link
                  href="/donations"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
                >
                  View My Donations
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Breadcrumb / Back Link */}
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Dashboard
                </Link>

                <div className="flex items-center gap-2">
                  {isLiveBackend ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Persistence
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                      Demo Mode (Local)
                    </span>
                  )}
                </div>
              </div>

              {/* Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        Recipient Intake Profile
                      </span>
                      <span className="text-xs text-slate-500">• {user?.organization}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Intake Capacity & Facility Settings
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Configure your intake capacity, storage capabilities, and travel limits to receive accurate surplus food matches.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleReload}
                    disabled={isReloading || isSaving || isLoading}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs self-start sm:self-auto"
                    title="Reload from backend server"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isReloading ? 'animate-spin' : ''}`} />
                    {isReloading ? 'Reloading...' : 'Reload Server Data'}
                  </button>
                </div>
              </div>

              {/* Success Alert Banner */}
              {successMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-start gap-3 animate-in fade-in duration-200"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold">Settings Updated</p>
                    <p className="text-emerald-800 mt-0.5">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Error Alert Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 flex items-start gap-3 animate-in fade-in duration-200"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold">Error Saving Settings</p>
                    <p className="text-red-800 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Informative Engine Guide */}
              <div className="bg-teal-50/60 p-4 sm:p-5 rounded-2xl border border-teal-200/80 flex items-start gap-3.5">
                <Sparkles className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-950 space-y-1">
                  <p className="font-bold text-teal-900">How FoodSync Matching Uses These Settings:</p>
                  <ul className="list-disc list-inside space-y-1 text-teal-800">
                    <li>
                      <strong>Storage Types:</strong> Cold storage (Refrigerated/Frozen) is strictly required to receive perishable food. Without cold storage, perishable donations are disqualified.
                    </li>
                    <li>
                      <strong>Travel Distance:</strong> Candidate donations situated beyond your travel radius are disqualified from matching.
                    </li>
                    <li>
                      <strong>Intake Capacity:</strong> Determines the capacity score weight (20%) when prioritizing larger or smaller meal batches.
                    </li>
                    <li>
                      <strong>Dietary Preferences:</strong> Vegetarian or Vegan preferences filter out non-compliant surplus items.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Loading Skeleton */}
              {isLoading ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-700">Loading recipient profile from server...</p>
                </div>
              ) : (
                /* Profile & Settings Form */
                <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-8">
                  {/* Section 1: Organization & Intake Capacity */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <Scale className="h-4 w-4 text-teal-600" />
                      Capacity & Organization Profile
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Organization Type */}
                      <div>
                        <label htmlFor="org_type" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Organization Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="org_type"
                          value={form.org_type}
                          onChange={(e) => {
                            setSuccessMessage(null);
                            setForm({ ...form, org_type: e.target.value as RecipientOrgType });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="SHELTER">Homeless / Community Shelter</option>
                          <option value="FOOD_BANK">Food Bank & Pantry</option>
                          <option value="COMMUNITY_KITCHEN">Community Soup Kitchen</option>
                          <option value="ORPHANAGE">Children Care / Orphanage</option>
                        </select>
                        <p className="mt-1 text-[11px] text-slate-500">Helps classify your facility for community reports.</p>
                      </div>

                      {/* Daily Intake Capacity */}
                      <div>
                        <label htmlFor="daily_capacity_meals" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Daily Capacity (Meals) <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="daily_capacity_meals"
                          type="number"
                          min="0"
                          step="1"
                          value={form.daily_capacity_meals}
                          onChange={(e) => {
                            setSuccessMessage(null);
                            setForm({ ...form, daily_capacity_meals: e.target.value });
                            if (fieldErrors.daily_capacity_meals) {
                              setFieldErrors((prev) => {
                                const updated = { ...prev };
                                delete updated.daily_capacity_meals;
                                return updated;
                              });
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                            fieldErrors.daily_capacity_meals ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                          }`}
                          placeholder="e.g. 100"
                        />
                        {fieldErrors.daily_capacity_meals ? (
                          <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.daily_capacity_meals}</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-500">Maximum meals your facility can receive per day (must be ≥ 0).</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 2: Storage Facilities */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1.5">
                      <ThermometerSnowflake className="h-4 w-4 text-teal-600" />
                      Storage Capabilities <span className="text-red-500">*</span>
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">
                      Select all cold and dry food storage facilities available on-site at your premises.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* DRY Storage */}
                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          form.storage_types.includes('DRY')
                            ? 'border-teal-500 bg-teal-50/40 text-teal-950 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.storage_types.includes('DRY')}
                          onChange={() => handleToggleStorage('DRY')}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">Dry / Ambient Storage</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Shelves and dry pantries for packaged grains, canned goods & bakery.</p>
                        </div>
                      </label>

                      {/* REFRIGERATED Storage */}
                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          form.storage_types.includes('REFRIGERATED')
                            ? 'border-teal-500 bg-teal-50/40 text-teal-950 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.storage_types.includes('REFRIGERATED')}
                          onChange={() => handleToggleStorage('REFRIGERATED')}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">Cold Refrigeration (2°C - 5°C)</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Commercial coolers or refrigerators for cooked dishes and dairy.</p>
                        </div>
                      </label>

                      {/* FROZEN Storage */}
                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          form.storage_types.includes('FROZEN')
                            ? 'border-teal-500 bg-teal-50/40 text-teal-950 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.storage_types.includes('FROZEN')}
                          onChange={() => handleToggleStorage('FROZEN')}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">Deep Freezer Storage (-18°C)</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Freezers for storing bulk prepared food or frozen donations.</p>
                        </div>
                      </label>
                    </div>

                    {fieldErrors.storage_types && (
                      <p className="mt-2 text-xs text-red-600 font-medium">{fieldErrors.storage_types}</p>
                    )}

                    {!form.storage_types.includes('REFRIGERATED') && !form.storage_types.includes('FROZEN') && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Perishable Notice:</strong> Without Refrigerated or Deep Freezer storage, the matching engine will disqualify perishable food donations.
                        </span>
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 3: Dietary Preferences & Travel Radius */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <Utensils className="h-4 w-4 text-teal-600" />
                      Dietary Compatibility & Travel Radius
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Dietary Preference */}
                      <div>
                        <label htmlFor="dietary_preferences" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Dietary Acceptance <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="dietary_preferences"
                          value={form.dietary_preferences}
                          onChange={(e) => {
                            setSuccessMessage(null);
                            setForm({ ...form, dietary_preferences: e.target.value as RecipientDietaryPreference });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="ALL">All Types Accepted (Veg & Non-Veg)</option>
                          <option value="VEGETARIAN_ONLY">Strictly Vegetarian Only</option>
                          <option value="VEGAN_ONLY">Strictly Vegan Only</option>
                        </select>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {form.dietary_preferences === 'ALL' && 'Accepts all edible surplus (vegetarian, non-vegetarian, bakery, produce).'}
                          {form.dietary_preferences === 'VEGETARIAN_ONLY' && 'Disqualifies non-vegetarian cooked meals automatically.'}
                          {form.dietary_preferences === 'VEGAN_ONLY' && 'Restricts matches exclusively to produce and certified vegan items.'}
                        </p>
                      </div>

                      {/* Travel Distance Limit */}
                      <div>
                        <label htmlFor="max_travel_distance_km" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Max Travel Distance (km) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="max_travel_distance_km"
                            type="number"
                            min="0.1"
                            max="50"
                            step="0.5"
                            value={form.max_travel_distance_km}
                            onChange={(e) => {
                              setSuccessMessage(null);
                              setForm({ ...form, max_travel_distance_km: e.target.value });
                              if (fieldErrors.max_travel_distance_km) {
                                setFieldErrors((prev) => {
                                  const updated = { ...prev };
                                  delete updated.max_travel_distance_km;
                                  return updated;
                                });
                              }
                            }}
                            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              fieldErrors.max_travel_distance_km ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                            }`}
                            placeholder="15.0"
                          />
                          <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">km</span>
                        </div>
                        {fieldErrors.max_travel_distance_km ? (
                          <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.max_travel_distance_km}</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Maximum pickup radius (System caps effective distance at 15.0 km).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 4: Operating Hours */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1.5">
                      <Clock className="h-4 w-4 text-teal-600" />
                      Receiving Hours
                    </h2>
                    <p className="text-xs text-slate-500 mb-3">
                      Specify the daily hours during which your kitchen or facility accepts surplus deliveries.
                    </p>

                    <div>
                      <input
                        id="operating_hours"
                        type="text"
                        value={form.operating_hours}
                        onChange={(e) => {
                          setSuccessMessage(null);
                          setForm({ ...form, operating_hours: e.target.value });
                        }}
                        className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. 08:00 - 20:00"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Displayed to donor providers upon reservation confirmation.</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isSaving || isLoading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                      Discard Unsaved Changes
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving || isLoading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving & Syncing...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Intake Settings
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </ProtectedRoute>
      </main>

      <Footer />
    </div>
  );
}
