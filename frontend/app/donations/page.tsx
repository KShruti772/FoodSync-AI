'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDemo } from '@/lib/demo-context';
import { apiCompleteDonation, apiGetDonations } from '@/lib/api';
import { mapApiDonation } from '@/lib/api-mappers';
import type { DemoDonation } from '@/lib/demo-data';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  Utensils,
  ArrowRight,
  Filter,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function DonationsListPage() {
  const { user, donations: demoDonations, completePickup } = useDemo();
  const [donations, setDonations] = useState<DemoDonation[]>(demoDonations);
  const [liveBackend, setLiveBackend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'RESERVED' | 'COMPLETED'>('ALL');
  const [confirmModalId, setConfirmModalId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('foodsync_backend_token');
    if (!token) {
      setLiveBackend(false);
      setDonations(demoDonations);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLiveBackend(true);
    setLoading(true);
    apiGetDonations(token)
      .then((items) => {
        if (!cancelled) setDonations(items.map(mapApiDonation));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your donations.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, demoDonations]);

  const confirmPickup = async () => {
    if (!confirmModalId) return;
    setIsCompleting(true);
    setError(null);
    try {
      if (liveBackend) {
        const token = localStorage.getItem('foodsync_backend_token');
        if (!token) throw new Error('Your session has expired. Please sign in again.');
        await apiCompleteDonation(token, confirmModalId);
        const refreshed = await apiGetDonations(token);
        setDonations(refreshed.map(mapApiDonation));
      } else {
        await completePickup(confirmModalId);
      }
      setConfirmModalId(null);
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to complete this pickup.');
    } finally {
      setIsCompleting(false);
    }
  };

  const filteredDonations = donations.filter((d) => {
    if (filter === 'ALL') return true;
    return d.status === filter;
  });

  const targetModalDonation = donations.find((d) => d.id === confirmModalId);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">My Surplus Donations</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Manage your surplus food listings, inspect candidate matches, and confirm completed pickups.
                </p>
              </div>

              <Link
                href="/donations/new"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors shrink-0"
              >
                <PlusCircle className="h-4 w-4" />
                Create New Donation
              </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(['ALL', 'AVAILABLE', 'RESERVED', 'COMPLETED'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    filter === tab
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab === 'ALL' && 'All Listings'}
                  {tab === 'AVAILABLE' && 'Available / Matching'}
                  {tab === 'RESERVED' && 'Reserved for Pickup'}
                  {tab === 'COMPLETED' && 'Rescued / Completed'}
                </button>
              ))}
            </div>

            {/* Donations Grid */}
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
                Loading your donations…
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                <Utensils className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h2 className="text-sm font-bold text-slate-900">No donations found in this category</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create a new surplus listing to connect with local recipient organizations.
                </p>
                <Link
                  href="/donations/new"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  List Surplus Food
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDonations.map((donation) => {
                  const isReserved = donation.status === 'RESERVED';
                  const isCompleted = donation.status === 'COMPLETED';

                  return (
                    <div
                      key={donation.id}
                      className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all shadow-2xs ${
                        isReserved
                          ? 'border-teal-300 ring-1 ring-teal-400/30'
                          : isCompleted
                          ? 'border-slate-200 bg-slate-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isReserved
                                ? 'bg-teal-100 text-teal-800'
                                : isCompleted
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {donation.status}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">#{donation.id}</span>
                        </div>

                        <div>
                          <h2 className="text-sm font-bold text-slate-900 line-clamp-2">{donation.title}</h2>
                          <p className="text-xs text-slate-500 mt-1">{donation.foodType}</p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Volume:</span>
                            <span className="font-semibold text-slate-900">
                              {donation.quantity} {donation.quantityUnit}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Expiry Window:</span>
                            <span className="font-medium text-amber-700 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {donation.expiryTime}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Storage:</span>
                            <span className="text-slate-700">{donation.storageRequirement}</span>
                          </div>
                        </div>

                        {isReserved && (
                          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-teal-900">
                            <strong>Reserved By:</strong> {donation.reservedRecipientName}
                            <p className="mt-1">
                              <strong>Collection deadline:</strong>{' '}
                              {donation.reservationDeadline
                                ? new Date(donation.reservationDeadline).toLocaleString()
                                : 'Deadline unavailable'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Link
                          href={`/donations/${donation.id}`}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                        >
                          View Details <ChevronRight className="h-3.5 w-3.5" />
                        </Link>

                        {isReserved && (
                          <button
                            type="button"
                            onClick={() => setConfirmModalId(donation.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-teal-700 hover:bg-teal-800 px-3 py-1.5 rounded-lg shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete Pickup
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal */}
          {confirmModalId && targetModalDonation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Confirm Pickup Handover</h3>
                    <p className="text-xs text-slate-500">Donation #{targetModalDonation.id}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Confirming this pickup will mark the food as safely rescued and update community impact counters.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModalId(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmPickup()}
                    disabled={isCompleting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm"
                  >
                    {isCompleting ? 'Completing…' : 'Confirm Handover'}
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
