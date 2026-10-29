import React from 'react';
import type { Metadata } from 'next';
import ClientProviders from '@/components/providers/ClientProviders';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoodSync AI — Intelligent Food Redistribution Platform',
  description:
    'FoodSync AI connects surplus food providers with nearby recipient organizations and intelligently coordinates redistribution before valuable food goes to waste.',
  keywords: [
    'Food Redistribution',
    'Food Waste Reduction',
    'Sustainability',
    'AI Matching',
    'Deterministic Scoring',
    'Dynamic Reallocation',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
