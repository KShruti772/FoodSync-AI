'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDemo } from '@/lib/demo-context';
import {
  Bell,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user, notifications, markNotificationRead, markAllNotificationsRead } = useDemo();

  const userNotifications = user
    ? notifications.filter((n) => n.userId === user.id || n.userId === 'usr-prov-001' || n.userId === 'usr-recip-001')
    : notifications;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
                  <Bell className="h-6 w-6 text-emerald-600" />
                  <span>Activity & Notifications</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Real-time alerts for candidate matches, accepted reservations, and completed food rescues.
                </p>
              </div>

              {userNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-lg border border-emerald-200 transition-colors self-start sm:self-auto shrink-0"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark All Read
                </button>
              )}
            </div>

            {/* Notifications Feed */}
            {userNotifications.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                <Bell className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h2 className="text-sm font-bold text-slate-900">You're all caught up!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Activity notifications for surplus listings and match updates will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
                      notif.read
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            notif.type === 'MATCH_ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : notif.type === 'DONATION_COMPLETED'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {notif.type === 'MATCH_ACCEPTED' && <CheckCircle2 className="h-4 w-4" />}
                          {notif.type === 'DONATION_COMPLETED' && <ShieldCheck className="h-4 w-4" />}
                          {notif.type === 'MATCH_PROPOSED' && <Sparkles className="h-4 w-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900">{notif.title}</h2>
                            {!notif.read && (
                              <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block"></span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                          <span className="text-[11px] text-slate-400 mt-1.5 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {notif.timestamp}
                          </span>
                        </div>
                      </div>

                      {notif.link && (
                        <Link
                          href={notif.link}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0 self-center"
                        >
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ProtectedRoute>
      </main>

      <Footer />
    </div>
  );
}
