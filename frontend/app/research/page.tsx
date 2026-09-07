'use client';

import React from 'react';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import {
  Sparkles,
  GitBranch,
  Scale,
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function ResearchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            Research & Algorithmic Foundation
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            From Matching to Successful Rescue
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Investigating reliability-aware, expiry-sensitive dynamic reallocation to minimize food expiration failures before physical collection.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            <FlaskConical className="h-3.5 w-3.5 text-emerald-600" />
            <span>Research Direction • Currently Under Investigation</span>
          </div>
        </div>

        {/* Section 1: Core Research Question */}
        <div className="bg-white p-8 rounded-2xl border-2 border-emerald-300 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="h-4 w-4 text-emerald-600" />
            <span>Core Research Question</span>
          </div>
          <blockquote className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            “Can reliability-aware, expiry-sensitive dynamic reallocation reduce expiry-before-pickup failures compared with static compatibility-based matching?”
          </blockquote>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Traditional food redistribution platforms treat matching as a one-time static assignment. When a matched recipient experiences operational delays or cannot collect in time, the surplus food risks expiring. Our proposed research models recipient response probability and dynamic fallback triggers.
          </p>
        </div>

        {/* Section 2: Current MVP vs Proposed Research Direction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baseline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                CURRENT MVP BASELINE
              </span>
              <span className="text-xs font-semibold text-emerald-700">Implemented</span>
            </div>

            <h2 className="text-base font-bold text-slate-900">Explainable Deterministic Multi-Factor Matching</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Computes a weighted linear composite compatibility score based on 4 verifiable parameters:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                <span>Distance Proximity ($w_1$)</span>
                <strong className="text-slate-900">35%</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                <span>Shelf-Life Urgency ($w_2$)</span>
                <strong className="text-slate-900">30%</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                <span>Intake Capacity Fit ($w_3$)</span>
                <strong className="text-slate-900">20%</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                <span>Requirements Compatibility ($w_4$)</span>
                <strong className="text-slate-900">15%</strong>
              </div>
            </div>
          </div>

          {/* Research Extension */}
          <div className="bg-white p-6 rounded-2xl border border-teal-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                PROPOSED RESEARCH EXTENSION
              </span>
              <span className="text-xs font-semibold text-teal-700">Under Investigation</span>
            </div>

            <h2 className="text-base font-bold text-slate-900">Reliability-Aware Dynamic Reallocation</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Introduces dynamic time-decay monitoring and fallback candidate queues:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-teal-50/50 border border-teal-100 space-y-0.5">
                <strong className="text-teal-900 block">1. Dynamic Reallocation Decision Logic</strong>
                <span className="text-slate-600 text-[11px]">
                  Evaluates remaining time window against recipient historical response latency.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-teal-50/50 border border-teal-100 space-y-0.5">
                <strong className="text-teal-900 block">2. Candidate Queue Transition</strong>
                <span className="text-slate-600 text-[11px]">
                  Seamlessly hands over unaccepted offers to pre-ranked fallback recipients.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-teal-50/50 border border-teal-100 space-y-0.5">
                <strong className="text-teal-900 block">3. Failure Prevention Invariant</strong>
                <span className="text-slate-600 text-[11px]">
                  Prioritizes saving edible food before the terminal expiry threshold is breached.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Evaluation Metrics Framework */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Simulation Evaluation Framework</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Proposed metrics to compare static baseline vs. dynamic reallocation in synthetic simulation environments:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="text-slate-900 block text-sm">Successful Rescue Rate</strong>
              <p className="text-slate-600 text-[11px]">
                Percentage of listed surplus food batches that are physically collected before expiry.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="text-slate-900 block text-sm">Expiry-Before-Pickup Rate</strong>
              <p className="text-slate-600 text-[11px]">
                Proportion of listings that expire while awaiting response or transit.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="text-slate-900 block text-sm">Time-to-Acceptance (TTA)</strong>
              <p className="text-slate-600 text-[11px]">
                Duration between surplus listing publication and recipient match acceptance.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="text-slate-900 block text-sm">Time-to-Pickup (TTP)</strong>
              <p className="text-slate-600 text-[11px]">
                Duration from match acceptance to physical handover completion.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="text-slate-900 block text-sm">Reallocation Rate</strong>
              <p className="text-slate-600 text-[11px]">
                Frequency of candidate handovers triggered due to impending deadline risk.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <strong className="text-slate-900 block text-sm">Travel Distance Overhead</strong>
              <p className="text-slate-600 text-[11px]">
                Geodesic transit distance incurred across primary vs fallback routes.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
