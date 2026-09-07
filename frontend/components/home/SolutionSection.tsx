import React from 'react';
import {
  FileText,
  Filter,
  Calculator,
  ListOrdered,
  Bell,
  CheckCheck,
  Eye,
  Truck,
  TrendingUp,
} from 'lucide-react';

export default function SolutionSection() {
  const steps = [
    {
      num: '01',
      title: 'Provider lists surplus food',
      desc: 'Provider inputs food type, quantity (meals / kg), storage requirements, and expiry window.',
      icon: FileText,
    },
    {
      num: '02',
      title: 'FoodSync checks eligibility',
      desc: 'Hard constraints filter candidate recipients by travel radius, storage type, and dietary compatibility.',
      icon: Filter,
    },
    {
      num: '03',
      title: 'Matching engine evaluates candidates',
      desc: 'Deterministic multi-factor algorithm scores all eligible recipients against the donation profile.',
      icon: Calculator,
    },
    {
      num: '04',
      title: 'Candidates are ranked',
      desc: 'Multi-factor weighted scores produce an explainable, transparent candidate ranking.',
      icon: ListOrdered,
    },
    {
      num: '05',
      title: 'Relevant recipients notified',
      desc: 'Top-ranked recipients receive match notifications with approximate area and compatibility scores.',
      icon: Bell,
    },
    {
      num: '06',
      title: 'Recipient accepts the match',
      desc: 'When an authorized recipient accepts, donation atomically transitions from AVAILABLE to RESERVED.',
      icon: CheckCheck,
    },
    {
      num: '07',
      title: 'Pickup details revealed',
      desc: 'Exact street address, donor contact phone, and handling notes unlock exclusively for accepted recipient.',
      icon: Eye,
    },
    {
      num: '08',
      title: 'Food collected & recorded',
      desc: 'Physical pickup is completed, donor confirms handoff, and donation transitions to COMPLETED.',
      icon: Truck,
    },
    {
      num: '09',
      title: 'Impact metrics updated',
      desc: 'Meals rescued, food weight, and CO₂ emission offsets are automatically logged into verified impact data.',
      icon: TrendingUp,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-md border border-emerald-200">
            System Architecture
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            How FoodSync AI Helps
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            FoodSync AI creates a structured coordination layer between Food Providers and Recipient organizations through an end-to-end 9-step workflow.
          </p>
        </div>

        {/* 9-Step Timeline Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="flex flex-col bg-white rounded-xl border border-slate-200 p-6 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-400 group-hover:text-emerald-600 transition-colors">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>

                {/* Subtle top border accent on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
