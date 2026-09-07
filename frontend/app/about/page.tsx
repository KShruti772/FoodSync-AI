'use client';

import React from 'react';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import {
  Leaf,
  ShieldCheck,
  Scale,
  Users,
  Target,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            About FoodSync AI
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Intelligent Food Redistribution with Transparency & Privacy
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            FoodSync AI is built to bridge the gap between commercial edible food surplus and community organizations working to feed individuals in need.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Target className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Our Mission</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              To eliminate preventable food waste by providing an explainable, multi-factor redistribution platform that connects local food providers with community shelters rapidly, safely, and equitably.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Core Principles</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We prioritize explainable deterministic decision-making over opaque algorithms, privacy-by-design location protection for donor safety, and verifiable sustainability impact metrics.
            </p>
          </div>
        </div>

        {/* Value Pillars */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <h2 className="text-xl font-bold text-slate-900 text-center">Our Commitment to Integrity</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-600">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Scale className="h-4 w-4 text-emerald-600" />
                <span>Explainable Baseline</span>
              </div>
              <p className="leading-relaxed">
                All match scores are calculated transparently across proximity, urgency, capacity fit, and dietary compatibility without black-box models.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span>Privacy by Design</span>
              </div>
              <p className="leading-relaxed">
                Exact physical pickup addresses and donor telephone numbers are strictly protected until an authorized match is accepted.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Leaf className="h-4 w-4 text-emerald-600" />
                <span>Verified Impact</span>
              </div>
              <p className="leading-relaxed">
                Rescued meals and prevented carbon emissions are tracked directly through physical handover confirmations.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
