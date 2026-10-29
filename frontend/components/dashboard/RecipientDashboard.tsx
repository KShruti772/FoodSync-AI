'use client';

import React from 'react';
import Link from 'next/link';
import { useDemo } from '@/lib/demo-context';
import {
  Building2,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Phone,
  AlertTriangle,
  Scale,
  Utensils,
  ChevronRight,
} from 'lucide-react';
import { formatActiveReservationDeadline } from '@/lib/deadline-utils.mjs';

export default function RecipientDashboard() {
  const { user, donations, matches, logout } = useDemo();

  // Recipient matches
  const recipientMatches = matches.filter((m) => m.recipientId === user?.id);
  const proposedMatches = recipientMatches.filter((m) => m.status === 'PROPOSED');
  const acceptedMatches = recipientMatches.filter((m) => m.status === 'ACCEPTED');
  const historicalMatches = recipientMatches.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'EXPIRED',
  );

  const reservedDonations = donations.filter(
    (d) => d.status === 'RESERVED' && d.reservedRecipientId === user?.id,
  );
  const totalAcceptedMeals = reservedDonations.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              <Building2 className="h-3.5 w-3.5 text-teal-700" />
              Recipient Organization Portal
            </span>
            <span className="text-xs text-slate-500">• {user?.organization}</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review matched surplus food listings and coordinate safe, rapid community distribution.
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
            href="/matches"
            className="inline-flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Utensils className="h-4 w-4" />
            Browse Available Surplus ({proposedMatches.length})
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Opportunities</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-teal-700">{proposedMatches.length}</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            Compatible with your facility
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Reserved Pickups</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600">{acceptedMatches.length}</p>
          <p className="mt-1 text-xs text-slate-500">Address & contact unlocked</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meals Accepted (Active)</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">{totalAcceptedMeals}</p>
          <p className="mt-1 text-xs text-slate-500">Prepared for distribution</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Intake Capacity</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">75 Meals</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <Scale className="h-3.5 w-3.5 text-slate-400" />
            Refrigeration & ambient supported
          </p>
        </div>
      </div>

      {/* Reserved Pickups Section (Privacy Revealed!) */}
      {reservedDonations.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-300 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold">Active Reserved Pickups (Details Unlocked)</h2>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full">
              {reservedDonations.length} Scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reservedDonations.map((donation) => (
              <div key={donation.id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      MATCH ACCEPTED
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{donation.title}</h3>
                    <p className="text-xs text-slate-600">
                      <strong>{donation.quantity} {donation.quantityUnit}</strong> • Expiry: {donation.expiryTime}
                    </p>
                    {formatActiveReservationDeadline(donation.reservationDeadline) && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-800">
                        <Clock className="h-3.5 w-3.5" />
                        Collection by:{' '}
                        {formatActiveReservationDeadline(donation.reservationDeadline)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/80 text-xs space-y-1.5 text-slate-700">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span className="font-semibold text-slate-900">{donation.exactAddress}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Contact: {donation.contactPerson} ({donation.contactPhone})</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-emerald-200 text-[11px] text-slate-600">
                    <strong className="text-slate-800">Handling Note:</strong> {donation.handlingNotes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {historicalMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Reservation History</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {historicalMatches.map((match) => {
              const donation = donations.find((item) => item.id === match.donationId);
              return (
                <div key={match.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {donation?.title || `Donation #${match.donationId}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {match.status === 'COMPLETED' ? 'Collection completed' : 'Reservation expired'}
                        {' · '}{match.proposedAt}
                      </p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                      {match.status}
                    </span>
                  </div>
                  {match.pickupDeadline && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5" />
                      Collection deadline: {new Date(match.pickupDeadline).toLocaleString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Content Grid: Recommended Opportunities & Privacy Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Matched Opportunities */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Matched Surplus Opportunities</span>
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {proposedMatches.length} Available
              </span>
            </h2>
            <Link
              href="/matches"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              View Full Match Feed <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {proposedMatches.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">All matched opportunities reviewed</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When nearby food providers list surplus matching your intake capacity, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {proposedMatches.map((match) => {
                const donation = donations.find((d) => d.id === match.donationId);
                if (!donation) return null;

                return (
                  <div
                    key={match.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                            MATCH SCORE: {match.matchScore}/100
                          </span>
                          <span className="text-xs text-slate-500">#{donation.id}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{donation.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                          <span className="font-semibold text-teal-700">
                            {donation.quantity} {donation.quantityUnit}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Expires {donation.expiryTime}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500">{donation.storageRequirement}</span>
                        </p>
                      </div>

                      <div className="self-end sm:self-center">
                        <Link
                          href={`/matches/${match.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                        >
                          Review & Accept
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Masked Location Banner */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-teal-700" />
                        Approx: {donation.approxLocation} ({match.distanceKm} km)
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        🔒 Exact address locked until match acceptance
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Explainable Scoring Concept */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-teal-700" />
              <span>Explainable Matching Criteria</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              FoodSync scores compatibility using an explainable deterministic baseline:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Distance Proximity</span>
                <span className="font-bold text-teal-800">35% Weight</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Shelf-Life Urgency</span>
                <span className="font-bold text-teal-800">30% Weight</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Recipient Capacity</span>
                <span className="font-bold text-teal-800">20% Weight</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Requirements / Storage</span>
                <span className="font-bold text-teal-800">15% Weight</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 p-5 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Recipient Privacy & Safety</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Accepting an opportunity initiates a formal pickup reservation. Donor contact info and exact coordinates are revealed strictly for logistics coordination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
