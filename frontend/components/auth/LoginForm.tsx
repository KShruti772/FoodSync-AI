'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PasswordInput from './PasswordInput';
import { useDemo } from '@/lib/demo-context';
import { Loader2, AlertCircle, Store, Building2, Sparkles } from 'lucide-react';

export default function LoginForm() {
  const { login, loginAs } = useDemo();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoRoleLoading, setDemoRoleLoading] = useState<'FOOD_PROVIDER' | 'RECIPIENT' | null>(null);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter your password.';
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
    setTimeout(() => {
      login(formData.email);
    }, 400);
  };

  const handleQuickDemo = (role: 'FOOD_PROVIDER' | 'RECIPIENT') => {
    setDemoRoleLoading(role);
    setTimeout(() => {
      loginAs(role);
    }, 300);
  };

  return (
    <div className="space-y-5">
      {/* 1-Click Demo Login Box for Mentor Demonstration */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          <span>Quick Demo Access (1-Click)</span>
        </div>
        <p className="text-[11px] text-slate-600 mb-3">
          Select a role to explore the interactive prototype as a Food Provider or Recipient Organization.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickDemo('FOOD_PROVIDER')}
            disabled={demoRoleLoading !== null || isSubmitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-white border border-emerald-300 py-2.5 px-3 text-xs font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-100/50 hover:border-emerald-400 transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {demoRoleLoading === 'FOOD_PROVIDER' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
            ) : (
              <Store className="h-3.5 w-3.5 text-emerald-700" />
            )}
            <span>Food Provider Demo</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemo('RECIPIENT')}
            disabled={demoRoleLoading !== null || isSubmitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-white border border-teal-300 py-2.5 px-3 text-xs font-semibold text-teal-900 shadow-2xs hover:bg-teal-100/50 hover:border-teal-400 transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {demoRoleLoading === 'RECIPIENT' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-teal-700" />
            )}
            <span>Recipient Org Demo</span>
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full"></div>
        <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Or sign in with email
        </span>
      </div>

      {/* Standard Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Input */}
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
            disabled={isSubmitting || demoRoleLoading !== null}
            placeholder="provider@demo.com or recipient@demo.com"
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

        {/* Password Input */}
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          autoComplete="current-password"
          disabled={isSubmitting || demoRoleLoading !== null}
          error={errors.password}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              disabled={isSubmitting || demoRoleLoading !== null}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-600 select-none">Remember me</span>
          </label>

          <span className="text-xs text-slate-500">
            Demo password: <span className="font-mono text-slate-700 font-semibold">demo1234</span>
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || demoRoleLoading !== null}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
