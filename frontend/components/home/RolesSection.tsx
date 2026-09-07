import React from 'react';
import { Store, Building2, Cpu, Check } from 'lucide-react';

export default function RolesSection() {
  const roles = [
    {
      title: 'Food Providers',
      subtitle: 'Bakeries, Restaurants, Supermarkets, Caterers',
      icon: Store,
      badge: 'Donors',
      capabilities: [
        'List edible surplus food in under 2 minutes',
        'Specify food categories, quantity, and batch sizes',
        'Set pickup window and expiration cutoff time',
        'Provide handling and storage instructions',
        'Track redistribution status in real time',
      ],
    },
    {
      title: 'Recipient Organizations',
      subtitle: 'Shelters, Food Banks, Community Kitchens',
      icon: Building2,
      badge: 'Recipients',
      capabilities: [
        'Define daily meal intake and storage capacity',
        'Specify dietary requirements and preferences',
        'Receive automated match notifications within radius',
        'Review transparent match compatibility scores',
        'Accept or decline proposed allocations',
        'Unlock authorized pickup and donor contact data',
      ],
    },
    {
      title: 'System / Coordination Layer',
      subtitle: 'FoodSync Engine & Backend Services',
      icon: Cpu,
      badge: 'Core Engine',
      capabilities: [
        'Enforce hard distance, storage, and diet constraints',
        'Calculate deterministic multi-factor match scores',
        'Manage atomic state transitions (AVAILABLE → RESERVED → COMPLETED)',
        'Dispatch timely in-app notifications',
        'Aggregate and record verified environmental impact data',
      ],
    },
  ];

  return (
    <section id="about" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-md border border-emerald-200">
            User Personas & System Boundary
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built Around the People Who Make Redistribution Possible
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            A specialized interface and coordination model tailored for surplus donors, community recipients, and automated orchestration.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="flex flex-col bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/60 px-2.5 py-1 rounded-full">
                    {r.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{r.title}</h3>
                <p className="text-xs font-medium text-slate-500 mb-6">{r.subtitle}</p>

                <div className="border-t border-slate-100 pt-4 flex-1">
                  <ul className="space-y-3">
                    {r.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
