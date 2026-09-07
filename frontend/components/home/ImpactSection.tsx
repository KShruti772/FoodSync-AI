import React from 'react';
import { Utensils, Weight, CloudFog, Store, Building2 } from 'lucide-react';

export default function ImpactSection() {
  const metrics = [
    {
      title: 'Meals Rescued',
      value: '--',
      unit: 'meals',
      sublabel: 'total_meals_rescued',
      icon: Utensils,
      desc: 'Nutritious meals diverted from waste to community tables',
    },
    {
      title: 'Food Weight Diverted',
      value: '--',
      unit: 'kg',
      sublabel: 'total_food_weight_kg',
      icon: Weight,
      desc: 'Total aggregate weight of successfully collected surplus',
    },
    {
      title: 'CO₂ Emissions Offset',
      value: '--',
      unit: 'kg CO₂e',
      sublabel: 'total_co2_offset_kg',
      icon: CloudFog,
      desc: 'Estimated greenhouse gas emissions prevented from landfill decay',
    },
    {
      title: 'Active Providers',
      value: '--',
      unit: 'organizations',
      sublabel: 'active_providers_count',
      icon: Store,
      desc: 'Bakeries, supermarkets, and restaurants donating surplus',
    },
    {
      title: 'Active Recipients',
      value: '--',
      unit: 'organizations',
      sublabel: 'active_recipients_count',
      icon: Building2,
      desc: 'Verified shelters, community kitchens, and relief charities',
    },
  ];

  return (
    <section id="impact" className="py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            Verified Environmental & Social Impact
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Measure the Food We Rescue
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            FoodSync AI tracks aggregate redistribution metrics verified from completed physical pickups.
          </p>
        </div>

        {/* 5 Impact Metric Cards */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col bg-slate-50/80 rounded-xl border border-slate-200 p-6 text-center hover:border-emerald-300 hover:shadow-md transition-all relative"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-slate-200 text-emerald-700 mb-4 shadow-2xs">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex items-baseline justify-center gap-1 my-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {item.value}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {item.unit}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 mt-2 mb-1">
                  {item.title}
                </h3>
                <span className="text-[10px] font-mono text-slate-400 mb-2">
                  {item.sublabel}
                </span>

                <p className="text-xs text-slate-500 leading-relaxed mt-auto">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Contract Rule Callout */}
        <div className="mt-10 text-center max-w-2xl mx-auto">
          <p className="text-xs text-slate-500 bg-slate-50 py-2.5 px-4 rounded-lg border border-slate-200 inline-block">
            <strong>Contract Rule:</strong> The frontend displays verified backend-provided values from{' '}
            <code className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              GET /api/v1/impact/summary
            </code>
            . Values update automatically as donation lifecycles reach completion.
          </p>
        </div>
      </div>
    </section>
  );
}
