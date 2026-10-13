'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PickupMapPreview from '@/components/map/PickupMapPreview';
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
  Navigation,
  FileCheck2,
  Scale,
  Leaf,
} from 'lucide-react';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;
  const { user, matches, donations, acceptMatch, rejectMatch, completePickup } = useDemo();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [confirmedMeals, setConfirmedMeals] = useState<number>(0);
  const [handoverNotes, setHandoverNotes] = useState<string>('All food containers collected in hygienic, temperature-safe condition.');
  const [handoverSuccess, setHandoverSuccess] = useState<boolean>(false);

  const match = matches.find((m) => m.id === matchId);
  const donation = match ? donations.find((d) => d.id === match.donationId) : null;

  if (!match || !donation) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 py-12 px-4 max-w-3xl mx-auto w-full text-center">
          <Utensils className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Match Opportunity Not Found</h1>
          <p className="text-xs text-slate-500 mt-1">The requested opportunity ID could not be located.</p>
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
  const isCompleted = donation.status === 'COMPLETED';

  const handleAccept = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await acceptMatch(match.id);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to accept match.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await rejectMatch(match.id);
      router.push('/matches');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to decline match.');
      setIsProcessing(false);
    }
  };

  const handleOpenHandoverModal = () => {
    setConfirmedMeals(donation.quantity);
    setShowHandoverModal(true);
  };

  const handleConfirmHandover = async () => {
    if (!confirmedMeals || confirmedMeals <= 0) {
      setErrorMessage('Confirmed meal count must be greater than 0.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await completePickup(donation.id, {
        confirmedQuantityMeals: confirmedMeals,
        notes: handoverNotes.trim() || undefined,
      });
      setShowHandoverModal(false);
      setHandoverSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to record donation handover.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {/* Top Back Link & Match ID */}
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

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-red-50 border border-red-300 text-xs text-red-800 font-medium flex items-center justify-between gap-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-600 hover:text-red-900 font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Handover Success Alert */}
            {(handoverSuccess || isCompleted) && (
              <div
                role="status"
                className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-emerald-950">Food Handover Completed & Verified</h2>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Collection confirmed! {donation.quantity} {donation.quantityUnit} successfully redistributed to community beneficiaries.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                    +{donation.quantity * 2} kg CO2 Offset
                  </span>
                </div>
              </div>
            )}

            {/* Opportunity Header & Overview */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isCompleted
                          ? 'bg-slate-200 text-slate-900'
                          : isAccepted
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : isRejected
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : 'bg-teal-100 text-teal-900 border border-teal-200'
                      }`}
                    >
                      {isCompleted
                        ? 'HANDOVER COMPLETED • RESCUED'
                        : isAccepted
                        ? 'MATCH ACCEPTED • RESERVED FOR PICKUP'
                        : isRejected
                        ? 'OPPORTUNITY DECLINED'
                        : 'PROPOSED MATCH (PENDING REVIEW)'}
                    </span>
                    <span className="text-xs text-slate-500">• Provider: {donation.providerOrg}</span>
                  </div>

                  <h1 className="text-2xl font-extrabold text-slate-900">{donation.title}</h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Food Category: <strong className="text-slate-800">{donation.foodType}</strong> • Storage Required:{' '}
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
                  <span className="font-bold text-slate-900 text-sm">{match.distanceKm} km</span>
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
                    <span>Explainable Matching Criteria</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deterministic score calculation evaluated for your intake capacity and facility:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Proximity (35%)</span>
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
                    <span className="font-bold text-slate-800">Storage / Req (15%)</span>
                    <span className="font-bold text-teal-700">{match.requirementScore}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{match.whyBreakdown.requirementText}</p>
                </div>
              </div>
            </div>

            {/* PRIVACY BOUNDARY & PICKUP COORDINATION DETAILS */}
            <div
              className={`p-6 sm:p-8 rounded-2xl border-2 transition-all shadow-2xs space-y-5 ${
                isAccepted || isCompleted
                  ? 'border-emerald-400 bg-white ring-1 ring-emerald-500/20'
                  : 'border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isAccepted || isCompleted ? (
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Unlock className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <Lock className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {isAccepted || isCompleted
                        ? 'Pickup Street Address & Contact Authorized'
                        : 'Pickup Location & Contact Safeguard'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isAccepted || isCompleted
                        ? 'Authorized recipient access released for physical collection.'
                        : 'Exact street coordinates remain protected until you accept the match.'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                    isAccepted || isCompleted
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isAccepted || isCompleted ? 'ACCESS: UNLOCKED' : 'ACCESS: MASKED'}
                </span>
              </div>

              {isAccepted || isCompleted ? (
                /* Unlocked Details Grid */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="font-semibold text-slate-600 block flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-emerald-700" />
                        Exact Collection Address:
                      </span>
                      <p className="text-sm font-bold text-slate-900">{donation.exactAddress}</p>
                      <p className="text-[11px] text-slate-500">Solapur Central District • ~{match.distanceKm} km travel</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="font-semibold text-slate-600 block flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-emerald-700" />
                        Donor Logistics Contact:
                      </span>
                      <p className="text-sm font-bold text-slate-900">{donation.contactPerson}</p>
                      <p className="text-xs font-mono text-emerald-800 font-semibold">{donation.contactPhone}</p>
                    </div>

                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                      <strong className="text-slate-900">Handling & Pickup Instructions:</strong>{' '}
                      {donation.handlingNotes}
                    </div>
                  </div>

                  {/* OpenStreetMap Map Preview Component */}
                  <PickupMapPreview
                    pickupLat={donation.latitude}
                    pickupLng={donation.longitude}
                    pickupAddress={donation.exactAddress}
                    isUnlocked={true}
                    distanceKm={match.distanceKm}
                    recipientLat={user?.latitude}
                    recipientLng={user?.longitude}
                    recipientName={user?.organization || 'Your Facility'}
                    approxAreaText={donation.approxLocation}
                  />

                  {/* Pickup Handover Action Bar (If Reserved, not yet Completed) */}
                  {isAccepted && !isCompleted && (
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">On-Site Handover Coordination</h3>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          When physical pickup occurs at the donor premises, confirm collection to record verified community impact.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenHandoverModal}
                        disabled={isProcessing}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all shrink-0"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Food Pickup & Receipt
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Masked Area Safeguard Preview */
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="h-4 w-4 text-teal-700" />
                      <span>
                        Approximate Vicinity: <strong>{donation.approxLocation}</strong>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      To safeguard food donors and maintain coordinated distribution, exact street addresses and telephone contacts are released exclusively upon accepting the match.
                    </p>
                  </div>

                  {/* Masked map preview */}
                  <PickupMapPreview
                    pickupLat={donation.latitude}
                    pickupLng={donation.longitude}
                    pickupAddress={donation.exactAddress}
                    isUnlocked={false}
                    distanceKm={match.distanceKm}
                    approxAreaText={donation.approxLocation}
                  />
                </div>
              )}

              {/* Action Buttons for PROPOSED state */}
              {!isAccepted && !isRejected && !isCompleted && (
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

          {/* Handover Confirmation Modal */}
          {showHandoverModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Confirm Food Collection & Receipt</h3>
                    <p className="text-xs text-slate-500">Donation #{donation.id}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Verify the physical handover of surplus food at <strong>{donation.providerOrg}</strong>. Confirmed meals will be logged in the public impact metrics.
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label htmlFor="confirmed_meals_input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirmed Meal Quantity
                    </label>
                    <input
                      id="confirmed_meals_input"
                      type="number"
                      min="1"
                      value={confirmedMeals}
                      onChange={(e) => setConfirmedMeals(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">Listed quantity: {donation.quantity} meals</p>
                  </div>

                  <div>
                    <label htmlFor="handover_notes_input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Handover Verification Notes
                    </label>
                    <textarea
                      id="handover_notes_input"
                      rows={2}
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Temperature checked, hygienic containers verified."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowHandoverModal(false)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmHandover}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Confirm Receipt</span>
                      </>
                    )}
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
