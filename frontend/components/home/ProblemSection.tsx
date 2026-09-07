import React from 'react';
import { PackageOpen, SearchX, ClockAlert, AlertTriangle } from 'lucide-react';

export default function ProblemSection() {
  const problems = [
    {
      title: '1. Surplus Exists',
      icon: PackageOpen,
      badge: 'Unpredictable Supply',
      description:
        'Commercial kitchens, bakeries, and grocery stores generate high-quality edible surplus on irregular and short-notice schedules.',
    },
    {
      title: '2. Suitable Recipient Is Hard to Find',
      icon: SearchX,
      badge: 'Complex Eligibility',
      description:
        'Finding a nearby organization with compatible storage (dry vs. cold), matching dietary guidelines, and transport readiness is challenging.',
    },
    {
      title: '3. Time Is Limited',
      icon: ClockAlert,
      badge: 'Perishability Window',
      description:
        'Cooked and fresh items have narrow shelf-life windows. Every hour of delay rapidly increases the likelihood of spoilage.',
    },
    {
      title: '4. Failed Coordination Means Waste',
      icon: AlertTriangle,
      badge: 'Bottlenecks',
      description:
        'Unresponsive candidate matches, missed communications, or logistical cancellations lead to preventable food waste before collection.',
    },
  ];

  return (
    <section id="problem" className="py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            The Underlying Challenge
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Food Waste Is Also a <span className="text-emerald-700">Coordination Problem</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Large amounts of edible food become waste because surplus food providers may not have an efficient way to quickly identify suitable nearby recipient organizations.
          </p>
        </div>

        {/* Coordination Multi-factor list */}
        <div className="mt-10 max-w-4xl mx-auto bg-slate-50 p-6 rounded-xl border border-slate-200 text-sm text-slate-700">
          <p className="font-semibold text-slate-900 mb-3 text-center sm:text-left">
            The challenge is not simply finding someone who needs food—it is coordinating multi-dimensional constraints in real time:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>What food is available</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>How much quantity</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Where it is located</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Remaining shelf-life urgency</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Recipient intake capacity</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Storage & dietary compatibility</span>
            </div>
          </div>
        </div>

        {/* 4 Problem Cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((prob) => {
            const Icon = prob.icon;
            return (
              <div
                key={prob.title}
                className="flex flex-col bg-slate-50/70 rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">
                    <Icon className="h-5 w-5 text-emerald-700" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {prob.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{prob.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{prob.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
