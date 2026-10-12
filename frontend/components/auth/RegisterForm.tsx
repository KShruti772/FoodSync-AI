'use client';

import React, { useState } from 'react';
import PasswordInput from './PasswordInput';
import { useDemo } from '@/lib/demo-context';
import { Loader2, AlertCircle, Store, Building2, ShieldCheck } from 'lucide-react';

export default function RegisterForm() {
  const { register } = useDemo();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'FOOD_PROVIDER' as 'FOOD_PROVIDER' | 'RECIPIENT',
  });

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please enter your full name or organization name.';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter a password.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.role) {
      newErrors.role = 'Please select your organization role.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(formData.fullName, formData.email, formData.password, formData.role);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Role Selection (Radio Cards) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Organization Role <span className="text-emerald-700" aria-hidden="true">*</span>
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          Select whether you donate surplus food or receive food for community redistribution.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: Food Provider */}
          <label
            className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
              formData.role === 'FOOD_PROVIDER'
                ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 shadow-2xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">Food Provider</span>
              </div>
              <input
                type="radio"
                name="role"
                value="FOOD_PROVIDER"
                checked={formData.role === 'FOOD_PROVIDER'}
                onChange={() => setFormData({ ...formData, role: 'FOOD_PROVIDER' })}
                disabled={isSubmitting}
                className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <span className="text-[11px] text-slate-600 leading-tight">
              Organizations or businesses with edible surplus food to donate.
            </span>
          </label>

          {/* Option 2: Recipient Organization */}
          <label
            className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
              formData.role === 'RECIPIENT'
                ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 shadow-2xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">Recipient Org</span>
              </div>
              <input
                type="radio"
                name="role"
                value="RECIPIENT"
                checked={formData.role === 'RECIPIENT'}
                onChange={() => setFormData({ ...formData, role: 'RECIPIENT' })}
                disabled={isSubmitting}
                className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <span className="text-[11px] text-slate-600 leading-tight">
              Shelters, community kitchens, and relief groups receiving food.
            </span>
          </label>
        </div>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700">
          Full Name / Organization Name <span className="text-emerald-700" aria-hidden="true">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          value={formData.fullName}
          onChange={(e) => {
            setFormData({ ...formData, fullName: e.target.value });
            if (errors.fullName) setErrors({ ...errors, fullName: undefined });
          }}
          disabled={isSubmitting}
          placeholder="e.g. Green Leaf Cafe or Hope Shelter"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
            errors.fullName
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
          }`}
        />
        {errors.fullName && (
          <p id="fullName-error" className="text-xs text-red-600 flex items-center gap-1 mt-1" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errors.fullName}</span>
          </p>
        )}
      </div>

      {/* Email Address */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
          Email Address <span className="text-emerald-700" aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          disabled={isSubmitting}
          placeholder="contact@organization.org"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
            errors.email
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
          }`}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-600 flex items-center gap-1 mt-1" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errors.email}</span>
          </p>
        )}
      </div>

      {/* Password Inputs in Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.password}
        />

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={(e) => {
            setFormData({ ...formData, confirmPassword: e.target.value });
            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
          }}
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.confirmPassword}
        />
      </div>

      {/* Trust & Privacy Notice */}
      <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 flex items-start gap-2.5 text-xs text-slate-600 mt-3">
        <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Your account information is handled securely. FoodSync is designed with privacy and controlled access in mind.
        </span>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create Account & Enter Dashboard</span>
          )}
        </button>
      </div>
    </form>
  );
}
