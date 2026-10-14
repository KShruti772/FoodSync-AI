'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshCw,
  AlertCircle,
  Pause,
  Play,
  Radio,
  Check,
} from 'lucide-react';

const POLLING_INTERVAL_MS = 20000; // 20 seconds polling interval

export default function MatchesListPage() {
  const { user, donations, matches, refreshData, isLiveBackend } = useDemo();
  const [filter, setFilter] = useState<'ALL' | 'PROPOSED' | 'ACCEPTED'>('ALL');

  // Automatic Polling & Refresh State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [timeSinceSyncText, setTimeSinceSyncText] = useState('Just now');
  const [newMatchAlert, setNewMatchAlert] = useState<string | null>(null);

  const isSyncingRef = useRef(false);
  const previousMatchIdsRef = useRef<Set<string>>(new Set());

  // Filter recipient matches
  const recipientMatches = matches.filter(
    (m) => m.recipientId === user?.id
  );

  const filteredMatches = recipientMatches.filter((m) => {
    if (filter === 'ALL') return true;
    return m.status === filter;
  });

  // Track new matches arriving via polling
  useEffect(() => {
    const currentIds = new Set(recipientMatches.map((m) => m.id));
    if (previousMatchIdsRef.current.size > 0) {
      const newlyDiscovered = recipientMatches.filter((m) => !previousMatchIdsRef.current.has(m.id));
      if (newlyDiscovered.length > 0) {
        setNewMatchAlert(
          `${newlyDiscovered.length} new surplus opportunit${newlyDiscovered.length > 1 ? 'ies' : 'y'} matched with your facility!`
        );
      }
    }
    previousMatchIdsRef.current = currentIds;
  }, [recipientMatches.length]);

  // Execute single refresh with overlap prevention
  const triggerRefresh = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      await refreshData();
      setLastSyncedAt(new Date());
      setSyncError(null);
    } catch (err: any) {
      setSyncError(err?.message || 'Network error during background match synchronization.');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshData]);

  // Set up periodic polling & visibility detection
  useEffect(() => {
    if (!user || user.role !== 'RECIPIENT') return;

    // Initial sync
    triggerRefresh();

    let intervalId: NodeJS.Timeout | null = null;

    if (isAutoSyncEnabled) {
      intervalId = setInterval(() => {
        triggerRefresh();
      }, POLLING_INTERVAL_MS);
    }

    // Window focus / visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const lastSyncTime = lastSyncedAt ? lastSyncedAt.getTime() : 0;
        // Refresh immediately if more than 10 seconds since last sync
        if (now - lastSyncTime > 10000) {
          triggerRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user, isAutoSyncEnabled, triggerRefresh]);

  // Update humanized "Last checked X seconds ago" ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      if (!lastSyncedAt) {
        setTimeSinceSyncText('Just now');
        return;
      }
      const secondsAgo = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
      if (secondsAgo < 5) {
        setTimeSinceSyncText('Just now');
      } else if (secondsAgo < 60) {
        setTimeSinceSyncText(`${secondsAgo}s ago`);
      } else {
        const mins = Math.floor(secondsAgo / 60);
        setTimeSinceSyncText(`${mins}m ago`);
      }
    }, 2000);

    return () => clearInterval(ticker);
  }, [lastSyncedAt]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {/* Header with Polling Status & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    Intelligent Redistribution Feed
                  </span>
                  {isLiveBackend ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live API Backend
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                      Demo Mode (Local State)
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900">Available Surplus Food Opportunities</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Surplus food listings matched with your facility based on intake capacity, cold storage, and travel radius.
                </p>
              </div>

              {/* Polling Status Control Widget */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start sm:self-auto shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 px-1">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isSyncing
                        ? 'bg-amber-500 animate-spin'
                        : isAutoSyncEnabled
                        ? 'bg-teal-600 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-semibold text-slate-700">
                    {isSyncing ? 'Syncing...' : isAutoSyncEnabled ? 'Periodic Polling (20s)' : 'Polling Paused'}
                  </span>
                  <span className="text-[11px] text-slate-400">• {timeSinceSyncText}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors text-xs"
                    title={isAutoSyncEnabled ? 'Pause periodic polling' : 'Resume periodic polling'}
                    aria-label={isAutoSyncEnabled ? 'Pause periodic polling' : 'Resume periodic polling'}
                  >
                    {isAutoSyncEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-teal-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={triggerRefresh}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold shadow-2xs transition-colors"
                    title="Refresh opportunities immediately"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Check Now</span>
                  </button>
                </div>
              </div>
            </div>

            {/* New Match Discovery Banner */}
            {newMatchAlert && (
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">{newMatchAlert}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewMatchAlert(null)}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Polling Warning / Error Banner (Non-crashing) */}
            {syncError && (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Auto-sync note:</strong> {syncError} Opportunities displayed below remain from last successful sync. Retrying in 20s.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncError(null)}
                  className="font-bold text-amber-800 hover:text-amber-950 px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            )}

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
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-teal-600 mx-auto" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">No surplus opportunities in this view</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {filter === 'ALL'
                      ? 'When food donors register surplus matching your intake capacity and travel radius, opportunities will automatically display here via periodic polling.'
                      : `You do not have any listings marked as ${filter}. Select "All Opportunities" to view all candidate records.`}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={triggerRefresh}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    Poll for New Listings Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredMatches.map((match) => {
                  const donation = donations.find((d) => d.id === match.donationId);
                  if (!donation) return null;

                  const isAccepted = match.status === 'ACCEPTED';
                  const isCompleted = donation.status === 'COMPLETED';

                  return (
                    <div
                      key={match.id}
                      className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all shadow-2xs ${
                        isCompleted
                          ? 'border-slate-300 bg-slate-50/50'
                          : isAccepted
                          ? 'border-emerald-400 bg-emerald-50/20 ring-1 ring-emerald-400/40'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                              isCompleted
                                ? 'bg-slate-200 text-slate-800'
                                : isAccepted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-teal-50 text-teal-800 border border-teal-200'
                            }`}
                          >
                            {isCompleted
                              ? 'HANDOVER COMPLETED • RESCUED'
                              : isAccepted
                              ? 'MATCH ACCEPTED • RESERVED FOR PICKUP'
                              : `COMPATIBILITY SCORE: ${match.matchScore}/100`}
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
                            <span className="text-slate-500 block">Expiry Window:</span>
                            <span className="font-medium text-amber-700 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {donation.expiryTime}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-500 block">Distance:</span>
                            <span className="font-bold text-slate-700">{match.distanceKm} km away</span>
                          </div>
                        </div>

                        {/* Privacy boundary note / Address display */}
                        <div className="text-xs">
                          {isAccepted || isCompleted ? (
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">Pickup Address Unlocked:</p>
                                <p className="text-[11px] text-emerald-800">{donation.exactAddress}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                              <span className="text-[11px]">
                                Approximate Vicinity: <strong>{donation.approxLocation}</strong>. Exact street location unlocks upon acceptance.
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
                            isCompleted
                              ? 'bg-slate-700 hover:bg-slate-800 text-white'
                              : isAccepted
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-teal-700 hover:bg-teal-800 text-white'
                          }`}
                        >
                          {isCompleted
                            ? 'View Handover Summary'
                            : isAccepted
                            ? 'Pickup Coordination & Route'
                            : 'Review Opportunity'}
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
