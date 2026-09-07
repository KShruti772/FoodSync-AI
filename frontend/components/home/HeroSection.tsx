import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Store, Package, Cpu, Building2, Truck, CheckCircle2 } from 'lucide-react';

export default function HeroSection() {
  const flowSteps = [
    { label: 'Food Provider', icon: Store, desc: 'Lists surplus' },
    { label: 'Surplus Food', icon: Package, desc: 'Time-critical' },
    { label: 'FoodSync AI', icon: Cpu, desc: 'Multi-factor match', highlight: true },
    { label: 'Best-Fit Recipient', icon: Building2, desc: 'Eligible & ready' },
    { label: 'Pickup', icon: Truck, desc: 'Masked address reveal' },
    { label: 'Food Rescued', icon: CheckCircle2, desc: 'Impact logged' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Tag badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Algorithmic Coordination Platform
          </div>

          {/* Headline */}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl text-balance">
            Turning Surplus Food Into <span className="text-emerald-700">Timely Action</span>
          </h1>

          {/* Supporting text */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed text-balance">
            FoodSync AI connects surplus food providers with nearby recipient organizations and intelligently coordinates redistribution before valuable food goes to waste.
          </p>

          <p className="mt-4 text-sm sm:text-base text-slate-500 leading-normal max-w-2xl mx-auto">
            A web-based platform evaluating distance, urgency, capacity, requirement compatibility, and food perishability to match donations with eligible recipient organizations.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#research"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <BookOpen className="h-4 w-4 text-emerald-600" />
              Explore the Research
            </Link>
          </div>
        </div>

        {/* Hero Concept Visual: Flow Diagram */}
        <div className="mt-14 sm:mt-18 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                End-to-End Coordination Flow
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative">
              {flowSteps.map((step, idx) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.label}
                    className={`relative flex flex-col items-center text-center p-3.5 rounded-xl border transition-all ${
                      step.highlight
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm ring-1 ring-emerald-400/30'
                        : 'bg-slate-50/80 border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg mb-2.5 ${
                        step.highlight
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 leading-snug">
                      {step.label}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      {step.desc}
                    </span>

                    {/* Step number badge */}
                    <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 border border-white">
                      {idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Deterministic Matching Baseline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                Two-Stage Privacy Reveal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                Active Shelf-Life Tracking
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
