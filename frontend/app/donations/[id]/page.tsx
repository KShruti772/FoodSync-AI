'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDemo } from '@/lib/demo-context';
import {
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  ArrowLeft,
  Sparkles,
  Building2,
  Scale,
  Phone,
} from 'lucide-react';

export default function DonationDetailPage() {
  const params = useParams();
  const donationId = params?.id as string;
  const { donations, matches, completePickup } = useDemo();
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const donation = donations.find((d) => d.id === donationId);
  const donationMatches = matches.filter((m) => m.donationId === donationId);

  if (!donation) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 py-12 px-4 max-w-3xl mx-auto w-full text-center">
          <Utensils className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Donation Listing Not Found</h1>
          <p className="text-xs text-slate-500 mt-1">The requested donation ID does not exist in demo state.</p>
          <Link
            href="/donations"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Donations
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isReserved = donation.status === 'RESERVED';
  const isCompleted = donation.status === 'COMPLETED';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {/* Back Navigation */}
            <div className="flex items-center justify-between">
              <Link
                href="/donations"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to All Donations
              </Link>

              <span className="text-xs text-slate-400 font-mono">ID: {donation.id}</span>
            </div>

            {/* Main Header & Status Pill */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isReserved
                          ? 'bg-teal-100 text-teal-900 border border-teal-200'
                          : isCompleted
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      STATUS: {donation.status}
                    </span>
                    <span className="text-xs text-slate-500">Created {donation.createdAt}</span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-900">{donation.title}</h1>
                </div>

                {isReserved && (
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(true)}
                    className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Handover
                  </button>
                )}
              </div>
              {isReserved && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
                  <strong>Collection deadline:</strong>{' '}
                  {donation.reservationDeadline
                    ? new Date(donation.reservationDeadline).toLocaleString()
                    : 'Deadline unavailable'}
                </div>
              )}

              {/* Lifecycle Progress Bar */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Redistribution Lifecycle
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div
                    className={`p-2.5 rounded-lg border font-semibold ${
                      donation.status === 'AVAILABLE' || isReserved || isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    1. AVAILABLE (Matching)
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border font-semibold ${
                      isReserved || isCompleted
                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    2. RESERVED (Pickup Coordinated)
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border font-semibold ${
                      isCompleted
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    3. COMPLETED (Rescued)
                  </div>
                </div>
              </div>
            </div>

            {/* Donation Parameters & Privacy Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Food Parameters */}
              <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-emerald-600" />
                  <span>Surplus Listing Specifications</span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block">Total Volume:</span>
                    <span className="text-base font-bold text-emerald-700">
                      {donation.quantity} {donation.quantityUnit}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block">Expiry Deadline:</span>
                    <span className="text-base font-bold text-amber-700 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {donation.expiryTime}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block">Storage:</span>
                    <span className="text-base font-bold text-slate-800">{donation.storageRequirement}</span>
                  </div>
                </div>

                <div className="text-xs space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Dietary Labels:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {donation.dietary.map((tag) => (
                        <span key={tag} className="bg-emerald-50 text-emerald-800 text-[11px] px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 block">Packaging & Handling:</span>
                    <p className="text-slate-600 mt-0.5">{donation.handlingNotes}</p>
                  </div>
                </div>
              </div>

              {/* Privacy Status Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Privacy Safeguards</span>
                  </h2>

                  {isReserved ? (
                    <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1.5">
                      <p className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-teal-700" />
                        Match Accepted — Pickup Details Active
                      </p>
                      <p className="text-[11px] text-teal-800">
                        Recipient: <strong>{donation.reservedRecipientName}</strong>
                      </p>
                      <p className="text-[11px] text-teal-800">
                        Address: <em>{donation.exactAddress}</em>
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                      <p className="font-bold text-slate-900 flex items-center gap-1">
                        🔒 Coordinates Protected
                      </p>
                      <p className="text-[11px]">
                        Public candidates only see: <strong>{donation.approxLocation}</strong>.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Donor contact phone and exact street number unlock only after an authorized recipient accepts the match.
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  Compliance: FoodSync Privacy-by-Design Protocol v1.0
                </div>
              </div>
            </div>

            {/* Matched Recipient Organizations Ranking */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <span>Ranked Candidate Recipient Matches</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluated against local shelters and kitchens using FoodSync's explainable deterministic baseline.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 self-start sm:self-auto">
                  {donationMatches.length} Evaluated Candidates
                </span>
              </div>

              {donationMatches.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                  Evaluating candidates in real time...
                </div>
              ) : (
                <div className="space-y-4">
                  {donationMatches.map((match, idx) => {
                    const isTopMatch = idx === 0;
                    return (
                      <div
                        key={match.id}
                        className={`p-5 rounded-xl border transition-all ${
                          isTopMatch
                            ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-400/30'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {isTopMatch && (
                                <span className="text-[10px] font-bold text-white bg-emerald-700 px-2 py-0.5 rounded">
                                  🏆 RECOMMENDED MATCH
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-slate-500">#{match.id}</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900">{match.recipientName}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {match.recipientType} • {match.distanceKm} km travel distance
                            </p>
                          </div>

                          <div className="text-right self-start sm:self-center">
                            <span className="text-2xl font-extrabold text-emerald-700">{match.matchScore}</span>
                            <span className="text-xs font-bold text-slate-500"> / 100</span>
                            <p className="text-[10px] text-slate-400">Match Score</p>
                          </div>
                        </div>

                        {/* Explainable Factor Breakdown */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Why this match? (MVP Scoring Breakdown)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                              <span className="font-semibold text-slate-700 block">
                                Distance (35%): <strong className="text-emerald-700">{match.distanceKm} km</strong>
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{match.whyBreakdown.distanceText}</p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                              <span className="font-semibold text-slate-700 block">
                                Urgency (30%): <strong className="text-emerald-700">{match.urgencyScore}/100</strong>
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{match.whyBreakdown.urgencyText}</p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                              <span className="font-semibold text-slate-700 block">
                                Capacity (20%): <strong className="text-emerald-700">{match.capacityScore}/100</strong>
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{match.whyBreakdown.capacityText}</p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                              <span className="font-semibold text-slate-700 block">
                                Requirements (15%):{' '}
                                <strong className="text-emerald-700">{match.requirementScore}/100</strong>
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{match.whyBreakdown.requirementText}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Complete Pickup Modal */}
          {showCompleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Confirm Food Handover</h3>
                    <p className="text-xs text-slate-500">Donation #{donation.id}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Confirm that <strong>{donation.reservedRecipientName}</strong> has arrived and completed physical collection of the {donation.quantity} {donation.quantityUnit}.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      completePickup(donation.id);
                      setShowCompleteModal(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm"
                  >
                    Confirm Handover
                  </button>
                </div>
              </div>
            </div>
          )}
        </ProtectedRoute>
      </main>

      <Footer />
    </div>
  );
}
