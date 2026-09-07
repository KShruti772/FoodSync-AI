'use client';

import React from 'react';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ProviderDashboard from '@/components/dashboard/ProviderDashboard';
import RecipientDashboard from '@/components/dashboard/RecipientDashboard';
import { useDemo } from '@/lib/demo-context';

export default function DashboardPage() {
  const { user } = useDemo();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ProtectedRoute>
          {user?.role === 'FOOD_PROVIDER' ? <ProviderDashboard /> : <RecipientDashboard />}
        </ProtectedRoute>
      </main>

      <Footer />
    </div>
  );
}
