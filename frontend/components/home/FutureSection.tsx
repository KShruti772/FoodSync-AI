import React from 'react';
import { Compass, Sparkles, Route, TrendingUp, Scale, UsersRound, TestTubes } from 'lucide-react';

export default function FutureSection() {
  const directions = [
    {
      title: 'Reliability Prediction via Historical Data',
      desc: 'Machine learning models trained on historical pickup timeliness to improve candidate scoring prior to dispatch.',
      icon: TrendingUp,
    },
    {
      title: 'Dynamic Real-World Reallocation',
      desc: 'Deploying automated wait-vs-reallocate decision policies in active staging environments.',
      icon: Compass,
    },
    {
      title: 'Multi-Stop Route Optimization',
      desc: 'Clustering multiple nearby donations for volunteer drivers and logistics fleet collection.',
      icon: Route,
    },
    {
      title: 'Food-Demand & Surplus Forecasting',
      desc: 'Predictive time-series models to anticipate surplus spikes before events or end-of-day grocery closures.',
      icon: Sparkles,
    },
    {
      title: 'Fairness-Aware Multi-Recipient Allocation',
      desc: 'Equitable distribution algorithms preventing high-capacity shelters from starving smaller community kitchens.',
      icon: Scale,
    },
    {
      title: 'Real-World Pilot Evaluation',
      desc: 'Collaborative trial partnerships with local community food banks and metropolitan restaurant networks.',
      icon: TestTubes,
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200">
            Roadmap & Exploration
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Where FoodSync Can Go Next
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Ongoing research vectors and planned platform extensions under active investigation.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {directions.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.title}
                className="flex flex-col bg-slate-50/70 rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-teal-700 shadow-2xs">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded">
                    Future Research
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{d.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{d.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
