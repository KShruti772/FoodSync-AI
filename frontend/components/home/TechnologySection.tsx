import React from 'react';
import { Layers, Server, Database, LineChart, ShieldCheck } from 'lucide-react';

export default function TechnologySection() {
  const techPillars = [
    {
      category: 'Frontend Web Client',
      icon: Layers,
      items: ['Next.js 14 (App Router)', 'React 18 & TypeScript 5', 'Tailwind CSS (Utility Styling)', 'Lucide React Icons'],
      note: 'Modular client components consuming FastAPI REST endpoints.',
    },
    {
      category: 'Backend REST API',
      icon: Server,
      items: ['Python 3.11', 'FastAPI Web Framework', 'Pydantic Schemas', 'Deterministic Heuristic Engine'],
      note: 'Authoritative boundary for validation, RBAC, and matching.',
    },
    {
      category: 'Database & Persistence',
      icon: Database,
      items: ['PostgreSQL 15+', 'SQLAlchemy 2.x ORM', 'Alembic Migrations', 'Row-Level Concurrency Locks'],
      note: 'Frontend never connects directly to PostgreSQL.',
    },
    {
      category: 'Research & Simulation',
      icon: LineChart,
      items: ['Python Data Stack', 'NumPy & Pandas', 'SimPy Simulation', 'Discrete-Event Evaluation'],
      note: 'Benchmarking allocation policies against synthetic workloads.',
    },
    {
      category: 'Security & Auth',
      icon: ShieldCheck,
      items: ['Signed JWT Bearer Tokens', 'Argon2id Password Hashing', 'Role-Based Access Control', 'Two-Stage Privacy Masking'],
      note: 'Zero-trust client model with strict resource ownership.',
    },
  ];

  return (
    <section id="technology" className="py-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            System Implementation
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for a Practical AI Product
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Engineered with a robust, type-safe stack spanning responsive web clients, performant asynchronous microservices, relational persistence, and discrete-event simulation.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {techPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.category}
                className="flex flex-col bg-slate-50/70 rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 text-emerald-700 shadow-2xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{pillar.category}</h3>
                </div>

                <ul className="space-y-1.5 mb-4 text-xs font-mono text-slate-700">
                  {pillar.items.map((it) => (
                    <li key={it} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-emerald-600"></span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-slate-500 mt-auto pt-3 border-t border-slate-200/80">
                  {pillar.note}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
