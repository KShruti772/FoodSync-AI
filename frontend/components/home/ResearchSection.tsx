import React from 'react';
import { HelpCircle, Clock, Users, ArrowRightLeft, ShieldAlert } from 'lucide-react';

export default function ResearchSection() {
  const failurePoints = [
    {
      title: 'Slow Response Times',
      desc: 'Recipient may not acknowledge a proposed match before perishability window shrinks.',
      icon: Clock,
    },
    {
      title: 'Late Cancellations',
      desc: 'Logistical hurdles (driver unavailability, vehicle breakdown) may occur after initial acceptance.',
      icon: ArrowRightLeft,
    },
    {
      title: 'Operational Bottlenecks',
      desc: 'Sudden volunteer shortage or intake overload can prevent timely pickup completion.',
      icon: Users,
    },
  ];

  return (
    <section id="research" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-3 py-1 rounded-md border border-teal-200">
            Research Direction • Under Investigation
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            From Matching to <span className="text-emerald-700">Successful Rescue</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            A compatible match does not necessarily guarantee a successful pickup. While coordination proceeds, the perishable shelf life of the food continuously decreases.
          </p>
        </div>

        {/* The Reality of Field Handoffs */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {failurePoints.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Central Research Question Box */}
        <div className="mt-12 max-w-4xl mx-auto rounded-2xl bg-white border-2 border-emerald-500/40 p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Core Research Question
              </span>
              <h3 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                &ldquo;Should the system continue waiting for the current recipient, or should it reallocate the donation to another eligible recipient before the food expires?&rdquo;
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Premature reallocation creates disruption and unnecessary travel; waiting too long guarantees expiration. Our research investigates adaptive mathematical decision models to balance this trade-off.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
