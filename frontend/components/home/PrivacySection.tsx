import React from 'react';
import { Lock, EyeOff, ShieldCheck, Key, UserCheck, MapPin } from 'lucide-react';

export default function PrivacySection() {
  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            Protected Coordination
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy by Design
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Food donor location and contact details remain protected until a mutual, verified match commitment is confirmed by an authorized recipient.
          </p>
        </div>

        {/* 2-Stage Reveal Comparison */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Stage 1: Before Acceptance */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <EyeOff className="h-5 w-5 text-slate-500" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage 1</span>
                <h3 className="text-base font-bold text-slate-900">Before Authorized Match Acceptance</h3>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>City / Neighborhood visible (e.g. &ldquo;Pune Central&rdquo;)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>Approximate distance visible (e.g. &ldquo;2.4 km away&rdquo;)</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                <span>Exact street address: <strong>Protected & Hidden</strong></span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                <span>Donor phone number: <strong>Protected & Hidden</strong></span>
              </li>
            </ul>
          </div>

          {/* Stage 2: After Acceptance */}
          <div className="rounded-2xl border-2 border-emerald-500/60 bg-emerald-50/40 p-6 sm:p-8">
            <div className="flex items-center gap-2.5 pb-4 border-b border-emerald-200">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Stage 2</span>
                <h3 className="text-base font-bold text-slate-900">After Authorized Acceptance (Status: RESERVED)</h3>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                <span>Full street address unlocked exclusively for matched recipient</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                <span>Authorized donor contact phone revealed for coordination</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                <span>Special pickup and handling instructions displayed</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                <span>Coordination state locked to prevent duplicate claims</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Security Invariant Callout */}
        <div className="mt-12 max-w-4xl mx-auto rounded-xl bg-slate-50 border border-slate-200 p-6">
          <div className="flex items-start gap-3.5">
            <Lock className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
            <div className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900 font-semibold block mb-1">
                The backend remains the security boundary; the frontend never determines authorization.
              </strong>
              CSS masking is never treated as security. Authentication tokens (JWT), Role-Based Access Control (RBAC), and strict database resource ownership rules ensure that sensitive pickup information is revealed only to authorized recipients through verified backend API responses.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
