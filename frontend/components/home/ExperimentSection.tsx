import React from 'react';
import { Play, BarChart3, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, Navigation } from 'lucide-react';

export default function ExperimentSection() {
  const models = [
    {
      name: '1. FCFS Baseline',
      desc: 'First-Come, First-Served allocation without multi-factor matching or shelf-life optimization.',
    },
    {
      name: '2. FoodSync Static Matching',
      desc: 'Multi-factor deterministic ranking with hard constraints (Current FoodSync MVP).',
    },
    {
      name: '3. Dynamic Reallocation',
      desc: 'Adaptive reassignment incorporating responsiveness, shelf life, and risk thresholds.',
    },
  ];

  const metrics = [
    { name: 'Successful Rescue Rate', icon: CheckCircle, desc: 'Proportion of listed donations successfully collected before expiration.' },
    { name: 'Expiry-Before-Pickup Rate', icon: XCircle, desc: 'Donations that expired due to slow response or uncollected reservations.' },
    { name: 'Average Time-to-Acceptance', icon: Clock, desc: 'Elapsed duration from initial donor listing to recipient acceptance.' },
    { name: 'Average Time-to-Pickup', icon: Clock, desc: 'Elapsed duration from recipient reservation to physical handover completion.' },
    { name: 'Cancellation Rate', icon: AlertCircle, desc: 'Frequency of reservations cancelled prior to scheduled pickup.' },
    { name: 'Reallocation Rate', icon: RefreshCw, desc: 'Frequency of donations dynamically transferred to candidate recipients.' },
    { name: 'Unnecessary Reallocation Rate', icon: RefreshCw, desc: 'Reallocations triggered where original recipient would have succeeded.' },
    { name: 'Travel Distance Efficiency', icon: Navigation, desc: 'Total travel kilometers per kilogram of rescued food.' },
  ];

  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-3 py-1 rounded-md">
            Simulation Methodology
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            How We Plan to Evaluate It
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The research prototype will be evaluated using discrete-event simulation to benchmark against standard allocation baselines under synthetic and empirical distribution conditions.
          </p>
        </div>

        {/* 3 Evaluated Models */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {models.map((m) => (
            <div
              key={m.name}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs mb-3">
                <Play className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">{m.name}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Evaluation Metrics Cards */}
        <div className="mt-14">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-slate-900">
              Evaluation Metrics (Discrete-Event Simulation)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Standardized quantitative criteria for simulation comparative analysis
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.name}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <Icon className="h-4 w-4 text-emerald-700 shrink-0" />
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {metric.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {metric.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
