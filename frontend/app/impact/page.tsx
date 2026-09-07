'use client';

import React from 'react';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import { useDemo } from '@/lib/demo-context';
import {
  TrendingUp,
  Utensils,
  Leaf,
  Users,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function ImpactPage() {
  const { impactMetrics } = useDemo();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            Platform Impact & Sustainability
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Turning Surplus Food Into Rescued Meals
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            By coordinating intelligent multi-factor matching, FoodSync connects surplus food providers directly with local recipient organizations before quality degrades.
          </p>
          <p className="text-xs text-slate-400 italic">
            *Values displayed represent aggregated prototype simulation and demo metrics.
          </p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Utensils className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meals Rescued</p>
            <p className="text-3xl font-extrabold text-slate-900">
              {impactMetrics.totalMealsRescued.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-700 font-medium">Redirected to community kitchens</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Leaf className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CO₂ Offset Equivalent</p>
            <p className="text-3xl font-extrabold text-teal-700">
              {impactMetrics.co2OffsetKg.toLocaleString()} <span className="text-base font-normal text-slate-500">kg</span>
            </p>
            <p className="text-xs text-teal-700 font-medium">Prevented landfill methane emissions</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Providers</p>
            <p className="text-3xl font-extrabold text-slate-900">{impactMetrics.activeProvidersCount}</p>
            <p className="text-xs text-slate-500">Catering, hotels & food businesses</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient Shelters</p>
            <p className="text-3xl font-extrabold text-slate-900">{impactMetrics.activeRecipientsCount}</p>
            <p className="text-xs text-slate-500">Verified community organizations</p>
          </div>
        </div>

        {/* Visual Lifecycle: Surplus Food -> Rescued */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900">The Rescued Food Lifecycle</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              How FoodSync turns immediate food surplus into timely community nourishment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">STEP 1</span>
              <h3 className="text-sm font-bold text-slate-900">Surplus Listed</h3>
              <p className="text-xs text-slate-500">Provider registers volume, expiry window, and storage.</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">STEP 2</span>
              <h3 className="text-sm font-bold text-slate-900">Intelligent Matching</h3>
              <p className="text-xs text-slate-500">Multi-factor engine evaluates nearby compatible recipients.</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">STEP 3</span>
              <h3 className="text-sm font-bold text-slate-900">Match Accepted</h3>
              <p className="text-xs text-slate-500">Recipient accepts, unlocking private address coordinates.</p>
            </div>

            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
              <span className="text-xs font-bold text-white bg-emerald-700 px-2 py-0.5 rounded">STEP 4</span>
              <h3 className="text-sm font-bold text-emerald-900">Food Rescued</h3>
              <p className="text-xs text-emerald-800">Physical handover verified and impact recorded.</p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-slate-900 text-white p-8 sm:p-10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold">Ready to join the food rescue network?</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Whether you have surplus meals to donate or represent an organization feeding community members, get started today.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/register"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-sm transition-colors"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
