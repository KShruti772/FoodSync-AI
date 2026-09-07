import React from 'react';
import { ArrowRight, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function LifecycleSection() {
  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-3 py-1 rounded-md">
            State Machine Architecture
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Donation & Match Lifecycle
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            FoodSync AI maintains strict mathematical separation between physical donation states and multi-candidate match statuses.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Donation Lifecycle Column */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">1. Donation Lifecycle</h3>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Physical Inventory
              </span>
            </div>

            {/* Core Happy Path */}
            <div className="mt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-3">
                Core Rescue Pathway
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="w-full sm:w-auto flex-1 bg-sky-50 border border-sky-200 rounded-lg px-3.5 py-2.5 text-center">
                  <span className="text-xs font-bold text-sky-900 block">AVAILABLE</span>
                  <span className="text-[10px] text-sky-700">Listed by Provider</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 rotate-90 sm:rotate-0" />
                <div className="w-full sm:w-auto flex-1 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-center">
                  <span className="text-xs font-bold text-amber-900 block">RESERVED</span>
                  <span className="text-[10px] text-amber-700">Recipient Accepted</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 rotate-90 sm:rotate-0" />
                <div className="w-full sm:w-auto flex-1 bg-emerald-50 border border-emerald-300 rounded-lg px-3.5 py-2.5 text-center">
                  <span className="text-xs font-bold text-emerald-900 block">COMPLETED</span>
                  <span className="text-[10px] text-emerald-700">Handover Confirmed</span>
                </div>
              </div>
            </div>

            {/* Terminal States */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Documented Terminal States
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-bold text-slate-800 block">EXPIRED</span>
                  <span className="text-slate-500 text-[11px]">Unrescued prior to cutoff time</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-bold text-slate-800 block">CANCELLED</span>
                  <span className="text-slate-500 text-[11px]">Withdrawn prior to handoff</span>
                </div>
              </div>
            </div>
          </div>

          {/* Match Lifecycle Column */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">2. Match Proposal Status</h3>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Candidate Pairing
              </span>
            </div>

            <div className="mt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-3">
                Pairing Resolution
              </span>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-center">
                  <span className="text-xs font-bold text-slate-800 block">PROPOSED</span>
                  <span className="text-[11px] text-slate-500">Evaluated & ranked by deterministic engine</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 rotate-90" />
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <span className="text-xs font-bold text-emerald-900 block">ACCEPTED</span>
                    <span className="text-[10px] text-emerald-700">Unlocks pickup address</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="text-xs font-bold text-slate-700 block">REJECTED</span>
                    <span className="text-[10px] text-slate-500">Donation stays available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invariant Note */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
              <strong>Core Invariant:</strong> The state machine transitions strictly through <code className="text-slate-800 font-mono">AVAILABLE → RESERVED → COMPLETED</code>. Prohibited terms such as <code className="text-slate-800 font-mono">CLAIMED</code> or speculative <code className="text-slate-800 font-mono">/claim</code> routes are excluded by architectural specification.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
