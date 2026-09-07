import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, HeartHandshake } from 'lucide-react';

export default function FinalCtaSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-emerald-50/50 border-b border-slate-200">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md mb-6">
          <HeartHandshake className="h-7 w-7" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
          Help Move Surplus Food Where It Is Needed
        </h2>

        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed text-balance">
          FoodSync AI brings food providers and recipient organizations together through structured matching, coordination and impact tracking.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#research"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <BookOpen className="h-4 w-4 text-emerald-600" />
            Learn About the Research
          </Link>
        </div>
      </div>
    </section>
  );
}
