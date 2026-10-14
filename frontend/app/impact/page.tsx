'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import { useDemo } from '@/lib/demo-context';
import {
  apiGetImpactLedger,
  apiDownloadImpactCsv,
  apiDownloadImpactCertificate,
  ApiImpactLedgerResponse,
  ApiImpactRecord,
  ApiMonthlyTrend,
} from '@/lib/api';
import {
  TrendingUp,
  Utensils,
  Leaf,
  Scale,
  CheckCircle2,
  Download,
  Calendar,
  FileText,
  AlertCircle,
  RefreshCw,
  Building2,
  Users,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

type TimeRangeFilter = 'ALL' | '30D' | '90D' | '1Y';

export default function ImpactPage() {
  const { user, token, isLiveBackend, impactMetrics } = useDemo();

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [scope, setScope] = useState<'auto' | 'platform'>('auto');
  const [ledgerData, setLedgerData] = useState<ApiImpactLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Calculate start date based on selected filter
  const { startDate, endDate } = useMemo(() => {
    if (timeRange === 'ALL') {
      return { startDate: undefined, endDate: undefined };
    }
    const now = new Date();
    const start = new Date();
    if (timeRange === '30D') {
      start.setDate(now.getDate() - 30);
    } else if (timeRange === '90D') {
      start.setDate(now.getDate() - 90);
    } else if (timeRange === '1Y') {
      start.setFullYear(now.getFullYear() - 1);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }, [timeRange]);

  // Fetch live ledger
  const fetchLedger = useCallback(async () => {
    if (!token || !isLiveBackend) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetImpactLedger(token, {
        scope,
        startDate,
        endDate,
      });
      setLedgerData(data);
    } catch (err: any) {
      console.error('Failed to load impact ledger:', err);
      setError(err?.message || 'Could not retrieve verified impact records from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [token, isLiveBackend, scope, startDate, endDate]);

  useEffect(() => {
    if (token && isLiveBackend) {
      fetchLedger();
    }
  }, [token, isLiveBackend, fetchLedger]);

  // CSV Export Handler
  const handleExportCsv = async () => {
    if (!token) {
      alert('Authentication required: please log in to export authoritative organization records.');
      return;
    }
    setIsExportingCsv(true);
    try {
      const blob = await apiDownloadImpactCsv(token, {
        scope,
        startDate,
        endDate,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodsync_impact_ledger_${timeRange.toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err?.message || 'Unable to download CSV export'}`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // PDF Certificate Download Handler
  const handleDownloadCertificate = async (donationId: string) => {
    if (!token) {
      alert('Authentication required: please log in to download signed certificates.');
      return;
    }
    setDownloadingId(donationId);
    try {
      const blob = await apiDownloadImpactCertificate(donationId, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodsync_certificate_${donationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Certificate download failed: ${err?.message || 'Unable to generate PDF certificate'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Metrics to display: Live reconciled summary if available, otherwise demoMetrics
  const displaySummary = useMemo(() => {
    if (ledgerData?.summary) {
      return {
        mealsRescued: ledgerData.summary.total_meals_rescued,
        foodWeightKg: ledgerData.summary.total_food_weight_kg,
        co2SavingsKg: ledgerData.summary.total_co2_savings_kg,
        completedDonations: ledgerData.summary.total_completed_donations,
        isLive: true,
      };
    }
    return {
      mealsRescued: impactMetrics.totalMealsRescued,
      foodWeightKg: Math.round(impactMetrics.totalMealsRescued * 0.5),
      co2SavingsKg: impactMetrics.co2OffsetKg,
      completedDonations: impactMetrics.totalDonations,
      isLive: false,
    };
  }, [ledgerData, impactMetrics]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-10">
        {/* Header & Mode Notice */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Impact Analytics & Audit Ledger
              </span>
              {displaySummary.isLive ? (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  ● Authenticated Live Records
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Demo Prototype Simulation
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Food Rescue Impact Ledger
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Authoritative, tamper-evident historical redistribution analytics. Every completed handover is mathematically reconciled with physical quantity, mass diverted, and estimated landfill methane avoidance.
            </p>
          </div>

          {/* Time Filter Controls & Export CTA */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Range Selector */}
            <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
              {(['ALL', '30D', '90D', '1Y'] as TimeRangeFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTimeRange(tab)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    timeRange === tab
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'All Time' : tab === '30D' ? '30 Days' : tab === '90D' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              id="export-csv-button"
              disabled={isExportingCsv || !displaySummary.isLive}
              onClick={handleExportCsv}
              className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border shadow-2xs transition-colors ${
                displaySummary.isLive
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={!displaySummary.isLive ? 'Sign in to export authorized records' : 'Download sanitized CSV ledger'}
            >
              <Download className={`h-4 w-4 ${isExportingCsv ? 'animate-bounce' : 'text-slate-500'}`} />
              {isExportingCsv ? 'Generating...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Demo Notice Banner if unauthenticated */}
        {!displaySummary.isLive && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">Prototype Demonstration Mode</p>
              <p>
                You are currently viewing aggregated prototype demonstration data. To access your organization's verified completed donation ledgers, chronological breakdowns, and downloadable PDF certificates,{' '}
                <Link href="/login" className="font-bold underline hover:text-amber-950">
                  sign in to an authenticated account
                </Link>.
              </p>
            </div>
          </div>
        )}

        {/* 4 Primary Reconciled Impact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Meals Rescued */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Utensils className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meals Rescued</p>
            <p className="text-3xl font-extrabold text-slate-900">
              {displaySummary.mealsRescued.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-700 font-medium">Reconciled physical meal count</p>
          </div>

          {/* Card 2: Food Weight Rescued */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Scale className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Food Weight Diverted</p>
            <p className="text-3xl font-extrabold text-teal-700">
              {displaySummary.foodWeightKg.toLocaleString()} <span className="text-base font-normal text-slate-500">kg</span>
            </p>
            <p className="text-xs text-teal-700 font-medium">0.5 kg standard factor per meal</p>
          </div>

          {/* Card 3: CO2 Offset */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Leaf className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated CO₂ Avoided*</p>
            <p className="text-3xl font-extrabold text-emerald-800">
              {displaySummary.co2SavingsKg.toLocaleString()} <span className="text-base font-normal text-slate-500">kg</span>
            </p>
            <p className="text-xs text-slate-500 font-medium">*2.5 kg CO₂e per kg diverted food</p>
          </div>

          {/* Card 4: Completed Rescues */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Rescues</p>
            <p className="text-3xl font-extrabold text-slate-900">
              {displaySummary.completedDonations.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 font-medium">Cryptographically verified handovers</p>
          </div>
        </div>

        {/* Chronological Monthly Impact Trends */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Monthly Rescue Trends
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological monthly aggregation over the active time range. All totals reconcile with underlying records.
              </p>
            </div>
            {ledgerData?.monthly_trends && ledgerData.monthly_trends.length > 0 && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
                {ledgerData.monthly_trends.length} reporting period(s)
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mr-2" />
              <span className="text-sm font-medium">Aggregating historical records...</span>
            </div>
          ) : ledgerData?.monthly_trends && ledgerData.monthly_trends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ledgerData.monthly_trends.map((trend) => (
                <div
                  key={trend.month}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {trend.month}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                      {trend.completed_rescues} rescue(s)
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-200/70 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Meals Rescued:</span>
                      <span className="font-bold text-slate-900">{trend.meals_rescued.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Food Diverted:</span>
                      <span className="font-bold text-slate-900">{trend.food_weight_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Est. CO₂ Prevented:</span>
                      <span className="font-bold">{trend.co2_savings_kg.toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500 font-medium">
                {displaySummary.isLive
                  ? 'No completed rescues found for the selected time range.'
                  : 'Monthly aggregation available once live rescues are logged.'}
              </p>
            </div>
          )}
        </div>

        {/* Authoritative Historical Completed-Rescue Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Historical Rescue Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Persisted completed-donation records with verified timestamps, physical quantities, and signed certificate downloads.
              </p>
            </div>

            {displaySummary.isLive && (
              <button
                type="button"
                onClick={fetchLedger}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchLedger}
                className="font-bold underline hover:text-red-950 ml-2"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-medium">Loading authoritative records...</p>
            </div>
          ) : ledgerData?.records && ledgerData.records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Rescue Ref</th>
                    <th className="py-3 px-4">Donation Title</th>
                    <th className="py-3 px-4">Partner Org</th>
                    <th className="py-3 px-4">Completed Date (UTC)</th>
                    <th className="py-3 px-4 text-right">Meals</th>
                    <th className="py-3 px-4 text-right">Weight (kg)</th>
                    <th className="py-3 px-4 text-right">Est. CO₂ (kg)</th>
                    <th className="py-3 px-4 text-center">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData.records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {rec.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate" title={rec.donation_title}>
                        {rec.donation_title}
                        {rec.food_type && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {rec.food_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {user?.role === 'FOOD_PROVIDER'
                          ? rec.recipient_name || 'Recipient Agency'
                          : rec.provider_name || 'Food Provider'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {rec.completed_at ? new Date(rec.completed_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-right">
                        {rec.meals_rescued}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        {rec.food_weight_kg.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        {rec.co2_savings_kg.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDownloadCertificate(rec.donation_id)}
                          disabled={downloadingId === rec.donation_id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          title="Download server-signed PDF impact certificate"
                        >
                          <Download className="h-3 w-3" />
                          {downloadingId === rec.donation_id ? 'PDF...' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No Verified Rescues in Selected Range</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Completed handovers are automatically cataloged here as soon as providers and recipients confirm pickup in the app.
              </p>
            </div>
          )}

          {/* Scientific Disclaimer Footer */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
            <p>
              * <span className="font-semibold text-slate-500">Methodology & Disclaimers:</span> Food weight is calculated at standard 0.5 kg per meal equivalent. CO₂ emission savings are estimated based on FoodSync standard landfill diversion factor (2.5 kg CO₂e per 1.0 kg food diverted).
            </p>
            <p>
              This ledger reflects authenticated transactional logs. It does not constitute statutory governmental certification or tax-exempt verification.
            </p>
          </div>
        </div>

        {/* Rescued Food Lifecycle Section */}
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
