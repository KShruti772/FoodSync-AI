import React from 'react';
import Link from 'next/link';
import { Leaf, Github } from 'lucide-react';

export default function Footer() {
  const currentYear = 2026;

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 text-sm border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Col 1: Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 text-white mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight">FoodSync AI</span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-4">
              An intelligent, explainable food redistribution platform connecting surplus food providers with local community recipient organizations.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/KShruti772/FoodSync-AI"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub Repository
              </a>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="#" className="hover:text-emerald-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-emerald-400 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#matching" className="hover:text-emerald-400 transition-colors">
                  Matching Baseline
                </Link>
              </li>
              <li>
                <Link href="#research" className="hover:text-emerald-400 transition-colors">
                  Research Direction
                </Link>
              </li>
              <li>
                <Link href="#impact" className="hover:text-emerald-400 transition-colors">
                  Impact Metrics
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Project Architecture */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-400">Next.js 14 & Tailwind CSS</span>
              </li>
              <li>
                <span className="text-slate-400">FastAPI & Python 3.11</span>
              </li>
              <li>
                <span className="text-slate-400">PostgreSQL 15 & SQLAlchemy</span>
              </li>
              <li>
                <span className="text-slate-400">Deterministic Multi-Factor Scoring</span>
              </li>
              <li>
                <span className="text-slate-400">Discrete-Event Simulation</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {currentYear} FoodSync AI. Developed for research, academic evaluation, and community food rescue.
          </p>
          <p className="text-[11px] text-slate-500">
            MVP baseline: Deterministic Multi-Factor Scoring ($w_d=0.35, w_u=0.30, w_c=0.20, w_r=0.15$).
          </p>
        </div>
      </div>
    </footer>
  );
}
