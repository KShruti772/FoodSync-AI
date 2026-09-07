'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  Phone,
  Lock,
  Unlock,
  Check,
  X,
  Loader2,
} from 'lucide-react';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;
  const { matches, donations, acceptMatch, rejectMatch } = useDemo();
  const [isProcessing, setIsProcessing] = useState(false);

  const match = matches.find((m) => m.id === matchId);
  const donation = match ? donations.find((d) => d.id === match.donationId) : null;

  if (!match || !donation) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 py-12 px-4 max-w-3xl mx-auto w-full text-center">
          <Utensils className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Match Not Found</h1>
          <p className="text-xs text-slate-500 mt-1">The requested match ID is not available in demo state.</p>
          <Link
            href="/matches"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Available Food
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isAccepted = match.status === 'ACCEPTED';
  const isRejected = match.status === 'REJECTED';

  const handleAccept = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    acceptMatch(match.id);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 400));
    rejectMatch(match.id);
    setIsProcessing(false);
    router.push('/matches');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {/* Back Link */}
            <div className="flex items-center justify-between">
              <Link
                href="/matches"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Available Food
              </Link>

              <span className="text-xs text-slate-400 font-mono">Match #{match.id}</span>
            </div>

            {/* Header Box */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isAccepted
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : isRejected
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : 'bg-teal-100 text-teal-900 border border-teal-200'
                      }`}
                    >
                      {isAccepted
                        ? 'MATCH ACCEPTED • RESERVED FOR PICKUP'
                        : isRejected
                        ? 'MATCH DECLINED'
                        : 'PROPOSED OPPORTUNITY'}
                    </span>
                    <span className="text-xs text-slate-500">Provider: {donation.providerOrg}</span>
                  </div>

                  <h1 className="text-2xl font-extrabold text-slate-900">{donation.title}</h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Category: <strong className="text-slate-800">{donation.foodType}</strong> • Storage:{' '}
                    <strong className="text-slate-800">{donation.storageRequirement}</strong>
                  </p>
                </div>

                <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl font-extrabold text-teal-700">{match.matchScore}</span>
                    <span className="text-xs font-bold text-slate-500">/ 100</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Compatibility Score</p>
                </div>
              </div>

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Quantity:</span>
                  <span className="font-bold text-teal-800 text-sm">
                    {donation.quantity} {donation.quantityUnit}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Expiry Window:</span>
                  <span className="font-semibold text-amber-700 text-sm flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {donation.expiryTime}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Travel Distance:</span>
                  <span className="font-bold text-slate-900 text-sm">{match.distanceKm} km away</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Dietary Labels:</span>
                  <span className="font-medium text-slate-700 truncate block">
                    {donation.dietary.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Explainable Matching Breakdown */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-700" />
                    <span>Explainable Matching Criteria (MVP Engine)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-factor evaluation breakdown for this surplus opportunity:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Distance (35%)</span>
                    <span className="font-bold text-teal-700">{match.distanceKm} km</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{match.whyBreakdown.distanceText}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Urgency (30%)</span>
                    <span className="font-bold text-teal-700">{match.urgencyScore}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{match.whyBreakdown.urgencyText}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Capacity (20%)</span>
                    <span className="font-bold text-teal-700">{match.capacityScore}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{match.whyBreakdown.capacityText}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Storage Fit (15%)</span>
                    <span className="font-bold text-teal-700">{match.requirementScore}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{match.whyBreakdown.requirementText}</p>
                </div>
              </div>
            </div>

            {/* PRIVACY BOUNDARY DEMONSTRATION SECTION */}
            <div
              className={`p-6 sm:p-8 rounded-2xl border-2 transition-all shadow-2xs space-y-4 ${
                isAccepted
                  ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                  : 'border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isAccepted ? (
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Unlock className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {isAccepted
                        ? 'Pickup Coordinates & Contact Unlocked'
                        : 'Pickup Location & Contact Safeguard'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isAccepted
                        ? 'Authorized recipient access granted for physical collection.'
                        : 'Exact street coordinates remain protected until you accept the match.'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                    isAccepted ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isAccepted ? 'ACCESS: UNLOCKED' : 'ACCESS: MASKED'}
                </span>
              </div>

              {isAccepted ? (
                /* Unlocked Details */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-1.5 shadow-2xs">
                    <span className="font-semibold text-slate-500 block flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                      Exact Pickup Street Address:
                    </span>
                    <p className="text-sm font-bold text-slate-900">{donation.exactAddress}</p>
                    <p className="text-[11px] text-slate-500">Solapur Central District • ~7 minutes drive</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-1.5 shadow-2xs">
                    <span className="font-semibold text-slate-500 block flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-emerald-700" />
                      Donor Authorized Contact:
                    </span>
                    <p className="text-sm font-bold text-slate-900">{donation.contactPerson}</p>
                    <p className="text-xs font-mono text-emerald-800 font-semibold">{donation.contactPhone}</p>
                  </div>

                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-white border border-emerald-200 text-[11px] text-slate-700">
                    <strong className="text-slate-900">Handling & Pickup Instructions:</strong>{' '}
                    {donation.handlingNotes}
                  </div>
                </div>
              ) : (
                /* Masked Area Preview */
                <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="h-4 w-4 text-teal-700" />
                    <span>
                      Approximate Vicinity: <strong>{donation.approxLocation}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    To maintain provider safety and prevent uncoordinated site visits, exact street addresses and telephone contacts are released exclusively to the matched recipient upon accepting the opportunity.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!isAccepted && !isRejected && (
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-60"
                  >
                    Decline Opportunity
                  </button>

                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-xs font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Reserving Surplus...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Accept Match & Unlock Pickup Address</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </ProtectedRoute>
      </main>

      <Footer />
    </div>
  );
}
