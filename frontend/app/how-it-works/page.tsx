'use client';

import React from 'react';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import {
  Store,
  Sparkles,
  Building2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Clock,
  Scale,
} from 'lucide-react';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            End-to-End Redistribution Architecture
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How FoodSync AI Works
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Connecting food providers with verified recipient organizations through multi-factor matching, privacy-by-design safeguards, and rapid pickup coordination.
          </p>
        </div>

        {/* 4 Core Steps */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-6 items-start">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-extrabold text-lg shrink-0">
              1
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Surplus Food Listing</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Commercial food providers (catering companies, restaurants, bakeries) register available surplus food specifying quantity, perishability deadline, storage requirement (ambient, refrigerated, frozen), and dietary labels.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-6 items-start">
            <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800 font-extrabold text-lg shrink-0">
              2
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Explainable Multi-Factor Matching</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The FoodSync matching engine evaluates eligible recipient organizations across 4 transparent criteria: Distance Proximity (35%), Shelf-Life Urgency (30%), Daily Intake Capacity (20%), and Storage/Dietary Compatibility (15%).
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-6 items-start">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-extrabold text-lg shrink-0">
              3
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Match Acceptance & Privacy Unlock</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Before acceptance, recipients view only approximate area and distance. Once the recipient accepts the match, the listing transitions to <strong className="text-slate-800">RESERVED</strong> and unlocks the full street address and provider telephone contact.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-6 items-start">
            <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800 font-extrabold text-lg shrink-0">
              4
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Physical Pickup & Impact Tracking</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The recipient collects the food safely. The food provider confirms physical handover in their dashboard, updating the listing to <strong className="text-slate-800">COMPLETED</strong> and recording rescued meals and carbon emissions prevented.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm transition-all"
          >
            <span>Join the FoodSync Network</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
