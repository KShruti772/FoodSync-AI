'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/lib/demo-context';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Utensils,
  Store,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { formatActiveReservationDeadline } from '@/lib/deadline-utils.mjs';

export default function ProviderDashboard() {
  const { user, donations, matches, impactMetrics, completePickup, logout } = useDemo();
  const [pickupModalDonationId, setPickupModalDonationId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeDonations = donations.filter((d) => d.status === 'AVAILABLE' || d.status === 'RESERVED');
  const availableMeals = activeDonations.reduce((sum, d) => sum + d.quantity, 0);
  const activeMatchesCount = matches.filter((m) => m.status === 'PROPOSED' || m.status === 'ACCEPTED').length;

  const targetDonationForModal = donations.find((d) => d.id === pickupModalDonationId);

  const handleConfirmPickup = async () => {
    if (pickupModalDonationId) {
      setActionError(null);
      try {
        await completePickup(pickupModalDonationId);
        setPickupModalDonationId(null);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Unable to complete this pickup.');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              Food Provider Portal
            </span>
            <span className="text-xs text-slate-500">• {user?.organization}</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Intelligently match surplus food with verified community recipient organizations.
          </p>
          {(user?.address || user?.phone) && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {user.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {user.address}
                </span>
              )}
              {user.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {user.phone}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/donations/new"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4" />
            Create Donation
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Listings</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">{activeDonations.length}</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            Currently open for pickup
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Meals</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600">{availableMeals}</p>
          <p className="mt-1 text-xs text-slate-500">Total batch volume</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Candidate Matches</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-teal-600">{activeMatchesCount}</p>
          <p className="mt-1 text-xs text-slate-500">Evaluated by multi-factor engine</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Food Rescued</p>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">DEMO</span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">{impactMetrics.totalMealsRescued.toLocaleString()}</p>
          <p className="mt-1 text-xs text-emerald-700 font-medium flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            +{impactMetrics.co2OffsetKg.toLocaleString()} kg CO₂ prevented
          </p>
        </div>
      </div>

      {/* Main Content Grid: Active Listings & Top Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Donations List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Your Active Donations</span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {activeDonations.length} Active
              </span>
            </h2>
            <Link
              href="/donations"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View All History <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {activeDonations.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center">
              <Utensils className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">No active surplus listings</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                List edible surplus food to match with local shelters and prevent waste.
              </p>
              <Link
                href="/donations/new"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Create First Donation
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activeDonations.map((donation) => {
                const isReserved = donation.status === 'RESERVED';
                return (
                  <div
                    key={donation.id}
                    className={`bg-white p-5 rounded-xl border transition-all ${
                      isReserved
                        ? 'border-teal-300 bg-teal-50/20 ring-1 ring-teal-400/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              isReserved
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isReserved ? 'RESERVED FOR PICKUP' : 'AVAILABLE • MATCHING'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">#{donation.id}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{donation.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                          <span className="font-semibold text-emerald-700">
                            {donation.quantity} {donation.quantityUnit}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            {donation.expiryTime}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500">{donation.storageRequirement}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isReserved ? (
                          <button
                            type="button"
                            onClick={() => setPickupModalDonationId(donation.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 px-3.5 py-2 rounded-lg shadow-sm transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete Pickup
                          </button>
                        ) : (
                          <Link
                            href={`/donations/${donation.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg border border-emerald-200 transition-colors"
                          >
                            Review Matches ({donation.matchedCount})
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {isReserved && formatActiveReservationDeadline(donation.reservationDeadline) && (
                      <div className="mt-3.5 pt-3 border-t border-teal-100/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-teal-900 font-medium">
                          <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                          <span>
                            Reserved by: <strong className="font-bold">{donation.reservedRecipientName}</strong>
                          </span>
                        </div>
                        <span className="text-right text-[11px] text-teal-700">
                          Collection by:{' '}
                          <strong>
                            {formatActiveReservationDeadline(donation.reservationDeadline)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Top Candidates & Explainable Baseline */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Top Candidate Matches</span>
              </h2>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                MVP Engine
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Scored using explainable multi-factor compatibility (Distance 35%, Urgency 30%, Capacity 20%, Requirements 15%).
            </p>

            <div className="space-y-3">
              {matches.slice(0, 3).map((match) => (
                <div key={match.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{match.recipientName}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-emerald-600" />
                        {match.distanceKm} km away • {match.recipientType}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        {match.matchScore}/100
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Match Score</p>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="truncate max-w-[180px]">{match.whyBreakdown.distanceText}</span>
                    <Link
                      href={`/donations/${match.donationId}`}
                      className="font-semibold text-emerald-700 hover:underline shrink-0"
                    >
                      View Breakdown →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Invariant Box */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Privacy-by-Design Invariant</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Exact pickup street address and telephone contacts are strictly hidden until an authorized recipient formally accepts the match.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Complete Pickup */}
      {pickupModalDonationId && targetDonationForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            {actionError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {actionError}
              </p>
            )}
            <div className="flex items-center gap-3 text-teal-800">
              <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Food Handover</h3>
                <p className="text-xs text-slate-500">Donation #{targetDonationForModal.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-1.5">
              <p className="text-slate-700">
                <strong>Recipient:</strong> {targetDonationForModal.reservedRecipientName}
              </p>
              <p className="text-slate-700">
                <strong>Food:</strong> {targetDonationForModal.title} ({targetDonationForModal.quantity} {targetDonationForModal.quantityUnit})
              </p>
              <p className="text-emerald-700 font-semibold">
                Completing will record +{targetDonationForModal.quantity} meals as successfully rescued.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPickupModalDonationId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPickup}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm"
              >
                Confirm Pickup Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
