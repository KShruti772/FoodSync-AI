import React from 'react';
import Link from 'next/link';
import { Leaf, ArrowLeft, Store, Package, Cpu, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  heading: string;
  subheading: string;
  alternateLink: {
    prompt: string;
    actionText: string;
    href: string;
  };
}

export default function AuthLayout({
  children,
  heading,
  subheading,
  alternateLink,
}: AuthLayoutProps) {
  const steps = [
    { label: 'Surplus Food', icon: Package, desc: 'Logged by local donor' },
    { label: 'Smart Matching', icon: Cpu, desc: 'Multi-factor compatibility' },
    { label: 'Recipient Organization', icon: Building2, desc: 'Instant notification & reservation' },
    { label: 'Food Rescued', icon: CheckCircle2, desc: 'Verified timely collection' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Simple Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-900 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">FoodSync AI</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 py-1.5 px-3 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Two-Column Auth Container */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Brand Panel (Desktop) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-md relative overflow-hidden min-h-[580px]">
            {/* Top Tag & Motto */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/30 text-emerald-100 text-xs font-semibold mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300"></span>
                Intelligent Food Redistribution
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-white text-balance leading-tight">
                Rescue more.<br />Waste less.
              </h2>

              <p className="mt-4 text-sm text-emerald-100/90 leading-relaxed text-balance">
                FoodSync AI helps connect surplus food with nearby organizations through intelligent matching and coordinated redistribution.
              </p>
            </div>

            {/* Middle Flow Diagram */}
            <div className="my-8 bg-emerald-950/40 border border-emerald-600/30 rounded-xl p-4.5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block mb-2">
                Redistribution Lifecycle
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                {steps.map((st) => {
                  const Icon = st.icon;
                  return (
                    <div
                      key={st.label}
                      className="bg-emerald-900/50 border border-emerald-700/40 rounded-lg p-2.5 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-200 mb-1">
                        <Icon className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                        <span className="text-xs font-bold leading-tight text-white">{st.label}</span>
                      </div>
                      <span className="text-[10px] text-emerald-200/70 leading-tight">{st.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Trust Invariant */}
            <div className="flex items-center gap-2.5 text-xs text-emerald-200/90 pt-3 border-t border-emerald-700/50">
              <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Privacy-protected coordination & explainable multi-factor scoring.</span>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm">
              {/* Form Heading */}
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {heading}
                </h1>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {subheading}
                </p>
              </div>

              {/* Injected Form Component */}
              {children}

              {/* Bottom Alternate Route Switcher */}
              <div className="mt-8 border-t border-slate-100 pt-5 text-center">
                <p className="text-xs text-slate-600">
                  {alternateLink.prompt}{' '}
                  <Link
                    href={alternateLink.href}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                  >
                    {alternateLink.actionText}
                  </Link>
                </p>
              </div>
            </div>

            {/* Supporting Bottom Trust Text */}
            <p className="mt-4 text-center text-xs text-slate-500">
              Your account helps FoodSync connect surplus food with organizations that need it.
            </p>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        &copy; {new Date().getFullYear()} FoodSync AI. Developed for community food rescue.
      </footer>
    </div>
  );
}
