'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDemo } from '@/lib/demo-context';
import { apiAcceptMatch, apiCompleteDonation, apiGetDonations, apiGetRecipientMatches } from '@/lib/api';
import { mapApiDonation, mapApiMatch } from '@/lib/api-mappers';
import type { DemoDonation, DemoMatch } from '@/lib/demo-data';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react';

type FeedFilter = 'ALL' | 'MATCHED' | 'UNMATCHED' | 'RESERVED';

export default function MatchesListPage() {
  const {
    user,
    isLoaded,
    donations: demoDonations,
    matches: demoMatches,
    acceptMatch,
    completePickup,
  } = useDemo();
  const [donations, setDonations] = useState<DemoDonation[]>([]);
  const [matches, setMatches] = useState<DemoMatch[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveBackend, setLiveBackend] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    const token = localStorage.getItem('foodsync_backend_token');

    setLoading(true);
    setError(null);
    if (!token) {
      setLiveBackend(false);
      setDonations(demoDonations);
      setMatches(demoMatches);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLiveBackend(true);
    Promise.all([apiGetDonations(token), apiGetRecipientMatches(token)])
      .then(([apiDonations, apiMatches]) => {
        if (cancelled) return;
        const mappedMatches = apiMatches.map((match) =>
          mapApiMatch(match, user?.organization || 'Your organization')
        );
        const mappedDonations = apiDonations.map(mapApiDonation);
        const matchesByDonation = new Map<string, number>();
        for (const match of mappedMatches) {
          matchesByDonation.set(match.donationId, (matchesByDonation.get(match.donationId) || 0) + 1);
        }
        setDonations(
          mappedDonations.map((donation) => ({
            ...donation,
            matchedCount: matchesByDonation.get(donation.id) || 0,
          }))
        );
        setMatches(mappedMatches);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load available donations.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id, user?.organization, demoDonations, demoMatches, reloadKey]);

  const handleAccept = async (match: DemoMatch) => {
    setPendingId(match.id);
    setError(null);
    try {
      if (liveBackend) {
        const token = localStorage.getItem('foodsync_backend_token');
        if (!token) throw new Error('Your session has expired. Please sign in again.');
        await apiAcceptMatch(token, match.id);
        setReloadKey((key) => key + 1);
      } else {
        await acceptMatch(match.id);
      }
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to accept this donation.');
    } finally {
      setPendingId(null);
    }
  };

  const handleComplete = async (donationId: string) => {
    setPendingId(donationId);
    setError(null);
    try {
      if (liveBackend) {
        const token = localStorage.getItem('foodsync_backend_token');
        if (!token) throw new Error('Your session has expired. Please sign in again.');
        await apiCompleteDonation(token, donationId);
        setReloadKey((key) => key + 1);
      } else {
        await completePickup(donationId);
      }
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to complete this collection.');
    } finally {
      setPendingId(null);
    }
  };

  const matchForDonation = (donationId: string) =>
    matches.find(
      (match) =>
        match.donationId === donationId &&
        match.status === 'ACCEPTED'
    ) ||
    matches.find(
      (match) =>
        match.donationId === donationId &&
        ['PROPOSED', 'NOTIFIED'].includes(match.status)
    );
  const visibleDonations = donations.filter((donation) => {
    const match = matchForDonation(donation.id);
    if (filter === 'MATCHED') return Boolean(match && donation.status === 'AVAILABLE');
    if (filter === 'UNMATCHED') return !match && donation.status === 'AVAILABLE';
    if (filter === 'RESERVED') return donation.status === 'RESERVED';
    return donation.status === 'AVAILABLE' || donation.status === 'RESERVED';
  });
  const counts = {
    ALL: donations.filter((donation) => ['AVAILABLE', 'RESERVED'].includes(donation.status)).length,
    MATCHED: donations.filter(
      (donation) => donation.status === 'AVAILABLE' && Boolean(matchForDonation(donation.id))
    ).length,
    UNMATCHED: donations.filter(
      (donation) => donation.status === 'AVAILABLE' && !matchForDonation(donation.id)
    ).length,
    RESERVED: donations.filter((donation) => donation.status === 'RESERVED').length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <ProtectedRoute>
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Available Surplus Food</h1>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  Browse every currently available donation. Acceptance is enabled only for a compatible match.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                Intelligent Matching Active
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {([
                ['ALL', 'All available'],
                ['MATCHED', 'Compatible matches'],
                ['UNMATCHED', 'No compatible match'],
                ['RESERVED', 'Your reservations'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    filter === key
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label} ({counts[key]})
                </button>
              ))}
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">{error}</div>
                {liveBackend && (
                  <button
                    type="button"
                    onClick={() => setReloadKey((key) => key + 1)}
                    className="text-xs font-bold underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-teal-700" />
                <p className="text-sm font-semibold text-slate-700">Loading available donations…</p>
              </div>
            ) : visibleDonations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Utensils className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">
                  {error ? 'Donation feed is unavailable' : 'No donations in this filter'}
                </h2>
                {!error && (
                  <p className="mt-1 text-xs text-slate-500">
                    Available donations appear here even when no compatible match has been found yet.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {visibleDonations.map((donation) => {
                  const match = matchForDonation(donation.id);
                  const isReserved = donation.status === 'RESERVED';
                  const isMatched = Boolean(match);
                  const deadline = match?.pickupDeadline || donation.reservationDeadline;
                  const canAccept =
                    donation.status === 'AVAILABLE' &&
                    match !== undefined &&
                    (match.status === 'PROPOSED' || match.status === 'NOTIFIED');
                  const canComplete =
                    isReserved &&
                    match?.status === 'ACCEPTED' &&
                    deadline !== null &&
                    deadline !== undefined &&
                    new Date(deadline).getTime() > Date.now();

                  return (
                    <article
                      key={donation.id}
                      className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-2xs ${
                        isReserved
                          ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-400/30'
                          : isMatched
                          ? 'border-teal-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${
                              isReserved
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                : isMatched
                                ? 'border-teal-200 bg-teal-50 text-teal-800'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {isReserved ? 'RESERVED FOR YOUR ORGANIZATION' : isMatched ? 'COMPATIBLE MATCH' : 'NO COMPATIBLE MATCH'}
                          </span>
                          <span className="font-mono text-xs text-slate-400">#{donation.id}</span>
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">{donation.title}</h2>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Category: {donation.foodType} · Provider: {donation.providerOrg}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                            <span className="block text-slate-500">Quantity</span>
                            <span className="font-bold text-teal-800">{donation.quantity} {donation.quantityUnit}</span>
                          </div>
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                            <span className="block text-slate-500">Food expiry</span>
                            <span className="flex items-center gap-1 font-medium text-amber-700">
                              <Clock className="h-3 w-3" />{donation.expiryTime}
                            </span>
                          </div>
                        </div>
                        {isReserved ? (
                          <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                            <p className="font-bold">Collection deadline</p>
                            <p>{deadline ? new Date(deadline).toLocaleString() : 'Deadline unavailable'}</p>
                            <p className="text-[11px]">Collect before this time to keep the reservation active.</p>
                          </div>
                        ) : match ? (
                          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                            <span>
                              Compatible with your organization · score {match.matchScore}/100 · {match.distanceKm} km away.
                              Pickup details are shared only after acceptance.
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>No compatible match is available for your organization, so this donation cannot be accepted.</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <span className="text-xs text-slate-500">Status: {donation.status}</span>
                        {canAccept && match ? (
                          <button
                            type="button"
                            disabled={pendingId === match.id}
                            onClick={() => void handleAccept(match)}
                            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingId === match.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Accept compatible donation
                          </button>
                        ) : canComplete ? (
                          <button
                            type="button"
                            disabled={pendingId === donation.id}
                            onClick={() => void handleComplete(donation.id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                          >
                            {pendingId === donation.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm collection
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Acceptance is enabled only when a compatible match exists."
                            className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
                          >
                            {isReserved ? 'Reservation active' : 'Cannot accept'}
                          </button>
                        )}
                      </div>
                    </article>
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
