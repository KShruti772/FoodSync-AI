import React from 'react';
import { GitBranch, Activity, Hourglass, ShieldCheck, ArrowDown, CheckCircle2, RotateCw } from 'lucide-react';

export default function DynamicReallocationSection() {
  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200">
            Proposed Research Problem • Under Investigation
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Reliability-Aware Dynamic Reallocation
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The research direction investigates whether recipient behavioral signals and remaining food shelf life can be used to make better wait-versus-reallocate decisions.
          </p>
        </div>

        {/* Dynamic Decision Flow Visualization */}
        <div className="mt-14 max-w-4xl mx-auto rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8 shadow-2xs">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Conceptual Decision Logic Flow
            </span>
          </div>

          <div className="flex flex-col items-center space-y-3 max-w-md mx-auto">
            {/* Step 1 */}
            <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
              <span className="text-xs font-bold text-slate-800">1. Initial Match Proposed</span>
            </div>
            <ArrowDown className="h-4 w-4 text-slate-400" />

            {/* Step 2 */}
            <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
              <span className="text-xs font-bold text-slate-800">2. Monitor Response & Pickup Confirmation</span>
            </div>
            <ArrowDown className="h-4 w-4 text-slate-400" />

            {/* Step 3 */}
            <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
              <span className="text-xs font-bold text-slate-800">3. Evaluate Remaining Shelf Life & Urgency</span>
            </div>
            <ArrowDown className="h-4 w-4 text-slate-400" />

            {/* Step 4 */}
            <div className="w-full bg-teal-50 border border-teal-300 rounded-lg p-3 text-center shadow-2xs">
              <span className="text-xs font-bold text-teal-900">4. Estimate Spoilage / Rescue Risk</span>
            </div>
            <ArrowDown className="h-4 w-4 text-teal-600" />

            {/* Branching Decision Box */}
            <div className="grid grid-cols-2 gap-4 w-full pt-1">
              <div className="flex flex-col items-center bg-white border-2 border-emerald-300 rounded-xl p-3.5 text-center shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mb-1">
                  Branch A: WAIT
                </span>
                <span className="text-xs text-slate-700 font-medium">Proceed with Pickup Attempt</span>
              </div>
              <div className="flex flex-col items-center bg-white border-2 border-amber-300 rounded-xl p-3.5 text-center shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded mb-1">
                  Branch B: REALLOCATE
                </span>
                <span className="text-xs text-slate-700 font-medium">Transfer to Next Eligible Recipient</span>
              </div>
            </div>

            <ArrowDown className="h-4 w-4 text-emerald-600" />

            {/* Final Target */}
            <div className="w-full bg-emerald-600 text-white rounded-lg p-3 text-center shadow-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-bold">Successful Food Rescue</span>
            </div>
          </div>
        </div>

        {/* Baseline vs Research Approach Comparison */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Column 1: Current Baseline */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current FoodSync
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">MVP Baseline Model</h3>
              </div>
              <span className="text-xs font-medium text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                Active Architecture
              </span>
            </div>

            <ul className="mt-6 space-y-3.5 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Static eligibility filtering:</strong> Hard boundary checks for distance, storage, and diet.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Explainable weighted ranking:</strong> Deterministic 4-factor scoring model.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Recipient notification:</strong> In-app alerts for top candidate recipients.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Acceptance-based reservation:</strong> Atomic status locking upon first acceptance.</span>
              </li>
            </ul>
          </div>

          {/* Column 2: Research Extension */}
          <div className="rounded-2xl border-2 border-teal-400 bg-teal-50/40 p-6 sm:p-8 relative">
            <div className="flex items-center justify-between pb-4 border-b border-teal-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Research Extension
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Dynamic Reallocation</h3>
              </div>
              <span className="text-xs font-medium text-teal-900 bg-teal-200/70 px-2.5 py-1 rounded-full">
                Under Investigation
              </span>
            </div>

            <ul className="mt-6 space-y-3.5 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <RotateCw className="h-4 w-4 text-teal-700 mt-0.5 shrink-0" />
                <span><strong>Recipient behavioral signals:</strong> Historical responsiveness and cancellation patterns.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <RotateCw className="h-4 w-4 text-teal-700 mt-0.5 shrink-0" />
                <span><strong>Remaining shelf-life awareness:</strong> Real-time decay tracking against transport latency.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <RotateCw className="h-4 w-4 text-teal-700 mt-0.5 shrink-0" />
                <span><strong>Dynamic wait/reallocate decision:</strong> Adaptive mathematical thresholds for re-assignment.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <RotateCw className="h-4 w-4 text-teal-700 mt-0.5 shrink-0" />
                <span><strong>Pre-emptive reallocation investigation:</strong> Reducing waste from stalled coordination.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
