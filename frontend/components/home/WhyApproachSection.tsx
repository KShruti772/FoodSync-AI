import React from 'react';
import { Eye, Clock, AlertTriangle, Shield } from 'lucide-react';

export default function WhyApproachSection() {
  const cards = [
    {
      title: 'EXPLAINABLE',
      icon: Eye,
      tag: 'Deterministic Logic',
      desc: 'The current matching baseline is deterministic and understandable. Donors and recipients can clearly see how distance, urgency, and capacity shaped the score.',
    },
    {
      title: 'TIME-AWARE',
      icon: Clock,
      tag: 'Shelf-Life Critical',
      desc: 'Perishable donations require decisions that consider remaining shelf life and transport times rather than treating surplus like static inventory.',
    },
    {
      title: 'FAILURE-AWARE',
      icon: AlertTriangle,
      tag: 'Handover Reliability',
      desc: 'A successful match should ideally lead to successful physical pickup. The platform is designed to identify and mitigate coordination delays before expiration.',
    },
    {
      title: 'PRIVACY-AWARE',
      icon: Shield,
      tag: 'Access Controlled',
      desc: 'Sensitive pickup addresses and donor telephone numbers are protected by backend authorization and unlocked only after mutual match confirmation.',
    },
  ];

  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-md border border-emerald-200">
            Design Philosophy
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Why This Approach
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Four foundational principles governing our algorithmic coordination and system architecture.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="flex flex-col bg-white rounded-xl border border-slate-200 p-6 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {c.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                  {c.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {c.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
