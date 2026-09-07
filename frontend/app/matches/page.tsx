'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDemo } from '@/lib/demo-context';
import {
  Sparkles,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Filter,
  Utensils,
  ChevronRight,
} from 'lucide-react';

export default function MatchesListPage() {
  const { user, donations, matches } = useDemo();
  const [filter, setFilter] = useState<'ALL' | 'PROPOSED' | 'ACCEPTED'>('ALL');

  // Filter recipient matches
  const recipientMatches = matches.filter(
    (m) => m.recipientId === 'usr-recip-001' || m.recipientId === user?.id
  );

  const filteredMatches = recipientMatches.filter((m) => {
    if (filter === 'ALL') return true;
    return m.status === filter;
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Available Surplus Food Opportunities</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Surplus food listings matched with your organization based on proximity, urgency, intake capacity, and storage.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                Intelligent Matching Active
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === 'ALL'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Opportunities ({recipientMatches.length})
              </button>

              <button
                type="button"
                onClick={() => setFilter('PROPOSED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === 'PROPOSED'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Open for Review ({recipientMatches.filter((m) => m.status === 'PROPOSED').length})
              </button>

              <button
                type="button"
                onClick={() => setFilter('ACCEPTED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === 'ACCEPTED'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Accepted / Reserved ({recipientMatches.filter((m) => m.status === 'ACCEPTED').length})
              </button>
            </div>

            {/* Matches Grid */}
            {filteredMatches.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-sm font-bold text-slate-900">No surplus opportunities in this filter</h2>
                <p className="text-xs text-slate-500 mt-1">
                  When new surplus listings match your organization, they will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredMatches.map((match) => {
                  const donation = donations.find((d) => d.id === match.donationId);
                  if (!donation) return null;

                  const isAccepted = match.status === 'ACCEPTED';

                  return (
                    <div
                      key={match.id}
                      className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all shadow-2xs ${
                        isAccepted
                          ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-400/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-teal-50 text-teal-800 border border-teal-200'
                            }`}
                          >
                            {isAccepted ? 'MATCH ACCEPTED • RESERVED' : `MATCH SCORE: ${match.matchScore}/100`}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">#{match.id}</span>
                        </div>

                        <div>
                          <h2 className="text-base font-bold text-slate-900">{donation.title}</h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Category: {donation.foodType} • Provider: {donation.providerOrg}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-500 block">Quantity:</span>
                            <span className="font-bold text-teal-800">
                              {donation.quantity} {donation.quantityUnit}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-500 block">Expiry:</span>
                            <span className="font-medium text-amber-700 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {donation.expiryTime}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-500 block">Distance:</span>
                            <span className="font-bold text-slate-700">{match.distanceKm} km</span>
                          </div>
                        </div>

                        {/* Privacy boundary note */}
                        <div className="text-xs">
                          {isAccepted ? (
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">Pickup Details Unlocked:</p>
                                <p className="text-[11px] text-emerald-800">{donation.exactAddress}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                              <span className="text-[11px]">
                                Approximate Area: <strong>{donation.approxLocation}</strong>. Exact address unlocks upon acceptance.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Storage: {donation.storageRequirement}</span>

                        <Link
                          href={`/matches/${match.id}`}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors ${
                            isAccepted
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-teal-700 hover:bg-teal-800 text-white'
                          }`}
                        >
                          {isAccepted ? 'View Pickup Details' : 'Review Opportunity'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ProtectedRoute>
      </main>

      <Footer />
    </div>
  );
}
