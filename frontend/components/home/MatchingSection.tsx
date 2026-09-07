import React from 'react';
import { MapPin, Clock, Scale, Utensils, CheckCircle, ShieldAlert } from 'lucide-react';

export default function MatchingSection() {
  const weights = [
    {
      percentage: '35%',
      label: 'Distance Proximity',
      sublabel: 'weight: 0.35',
      icon: MapPin,
      desc: 'Evaluates geodesic and travel distance to ensure rapid, fuel-efficient pickup within local radius.',
    },
    {
      percentage: '30%',
      label: 'Shelf-Life Urgency',
      sublabel: 'weight: 0.30',
      icon: Clock,
      desc: 'Prioritizes listings with the narrowest remaining window before expiration to prevent food waste.',
    },
    {
      percentage: '20%',
      label: 'Recipient Capacity',
      sublabel: 'weight: 0.20',
      icon: Scale,
      desc: 'Matches donation meal volume against recipient daily intake capacity to prevent overloading or underserving.',
    },
    {
      percentage: '15%',
      label: 'Requirement Compatibility',
      sublabel: 'weight: 0.15',
      icon: Utensils,
      desc: 'Checks storage requirements (ambient, cold, frozen) and dietary preferences (vegetarian, halal, etc.).',
    },
  ];

  const hardConstraints = [
    { title: 'Max Travel Distance', desc: 'Recipient must be within the defined geographic service radius.' },
    { title: 'Perishability / Expiry Cutoff', desc: 'Donation must have sufficient remaining shelf life before pickup.' },
    { title: 'Storage Compatibility', desc: 'Recipient facility must support required dry, refrigerated, or frozen conditions.' },
    { title: 'Dietary Preferences', desc: 'Listing must comply with recipient dietary intake guidelines.' },
    { title: 'Intake Capacity Fit', desc: 'Recipient daily capacity must be capable of receiving the batch size.' },
  ];

  return (
    <section id="matching" className="py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            Current MVP Matching Baseline
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Matching Beyond Just Distance
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Rather than selecting recipients using a single factor such as distance, FoodSync evaluates multiple eligibility and compatibility factors to produce an explainable ranking.
          </p>
        </div>

        {/* 4 Multi-Factor Scoring Weights */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {weights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 p-6 hover:border-emerald-300 hover:shadow-md transition-all relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
                    {item.percentage}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                    <Icon className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {item.label}
                </h3>
                <span className="text-xs font-mono text-slate-500 mb-2.5">
                  {item.sublabel}
                </span>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Hard Eligibility Constraints Section */}
        <div className="mt-14 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldAlert className="h-5 w-5 text-emerald-800" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide text-xs">
              Deterministic Hard Constraints (Pre-Scoring Filter)
            </h3>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Before mathematical weighted scoring, candidates must satisfy all hard eligibility criteria:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hardConstraints.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs"
              >
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
