'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
}

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = '••••••••',
  required = true,
  autoComplete = 'current-password',
  error,
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-emerald-700" aria-hidden="true">*</span>}
        </label>
      </div>

      <div className="relative rounded-lg shadow-2xs">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
          }`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-emerald-600 transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 flex items-center gap-1 mt-1" role="alert">
          <span className="inline-block h-1 w-1 rounded-full bg-red-600"></span>
          {error}
        </p>
      )}
    </div>
  );
}
