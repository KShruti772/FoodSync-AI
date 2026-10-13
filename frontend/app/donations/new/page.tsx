'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/home/Footer';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useDemo } from '@/lib/demo-context';
import {
  PlusCircle,
  Clock,
  MapPin,
  ShieldCheck,
  Loader2,
  Sparkles,
  Utensils,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function CreateDonationPage() {
  const router = useRouter();
  const { user, createDonation } = useDemo();

  const [formData, setFormData] = useState({
    title: 'Fresh Prepared Lunch Meals (Rice & Vegetable Curry)',
    foodType: 'Cooked Meals',
    quantity: 50,
    quantityUnit: 'Meals',
    expiryHours: 2,
    storageRequirement: 'REFRIGERATED' as 'AMBIENT' | 'REFRIGERATED' | 'FROZEN',
    dietary: ['Vegetarian', 'Nut-Free'] as string[],
    handlingNotes: 'Packed in food-grade insulated containers. Keep chilled until distribution.',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [matchingSimulationStep, setMatchingSimulationStep] = useState<number | null>(null);

  const dietaryOptions = ['Vegetarian', 'Vegan', 'Nut-Free', 'Halal-Friendly', 'Gluten-Free', 'Dairy-Free'];

  const handleToggleDietary = (item: string) => {
    if (formData.dietary.includes(item)) {
      setFormData({ ...formData, dietary: formData.dietary.filter((d) => d !== item) });
    } else {
      setFormData({ ...formData, dietary: [...formData.dietary, item] });
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.title.trim()) newErrors.title = 'Please enter a food title.';
    if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Quantity must be greater than 0.';
    if (!formData.expiryHours || formData.expiryHours <= 0) newErrors.expiryHours = 'Expiry must be specified.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Run simulated matching steps to demonstrate the AI matching story
    setMatchingSimulationStep(1); // "Registering surplus listing..."
    await new Promise((r) => setTimeout(r, 600));

    setMatchingSimulationStep(2); // "Running explainable multi-factor matching engine..."
    await new Promise((r) => setTimeout(r, 700));

    setMatchingSimulationStep(3); // "Matches ranked and dispatched!"
    await new Promise((r) => setTimeout(r, 500));

    try {
      const newDonationId = await createDonation(formData);
      router.push(`/donations/${newDonationId}`);
    } catch (err: any) {
      setMatchingSimulationStep(null);
      setErrors({ form: err?.message || 'Failed to create donation. Please check your inputs.' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <ProtectedRoute>
          <div className="space-y-6">
            {/* Back Link */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </Link>

            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Surplus Registration
                </span>
                <span className="text-xs text-slate-500">Provider: {user?.organization}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">List Surplus Food for Redistribution</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Provide accurate details to ensure our deterministic matching engine finds the most suitable nearby recipient organizations.
              </p>
            </div>

            {/* Simulation Overlay during submission */}
            {matchingSimulationStep !== null ? (
              <div className="bg-white p-12 rounded-2xl border border-emerald-200 shadow-lg text-center space-y-5 animate-in fade-in duration-200">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center animate-pulse">
                    <Sparkles className="h-8 w-8 text-emerald-600 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {matchingSimulationStep === 1 && 'Registering Surplus Listing...'}
                    {matchingSimulationStep === 2 && 'Evaluating Candidate Recipients (Multi-Factor Scoring)...'}
                    {matchingSimulationStep === 3 && 'Compatible Matches Found!'}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {matchingSimulationStep === 1 && 'Encoding food perishability, volume, and storage requirements.'}
                    {matchingSimulationStep === 2 && 'Applying MVP weights: Distance 35%, Urgency 30%, Capacity 20%, Requirements 15%.'}
                    {matchingSimulationStep === 3 && 'Redirecting to match ranking and notification summary...'}
                  </p>
                </div>

                <div className="w-48 bg-slate-100 rounded-full h-2 mx-auto overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 transition-all duration-500"
                    style={{
                      width:
                        matchingSimulationStep === 1 ? '33%' : matchingSimulationStep === 2 ? '75%' : '100%',
                    }}
                  ></div>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
                {errors.form && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    {errors.form}
                  </div>
                )}
                {/* 1. Food Title */}
                <div className="space-y-1.5">
                  <label htmlFor="title" className="block text-xs font-semibold text-slate-700">
                    Food Title / Description <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 50 Cooked Meals or 80 Whole Wheat Rolls"
                  />
                  {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
                </div>

                {/* 2. Food Type & Storage (Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="foodType" className="block text-xs font-semibold text-slate-700">
                      Food Category <span className="text-emerald-700">*</span>
                    </label>
                    <select
                      id="foodType"
                      value={formData.foodType}
                      onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Cooked Meals">Cooked Meals (Prepared / Catering)</option>
                      <option value="Bakery">Bakery & Bread</option>
                      <option value="Fresh Produce">Fresh Produce (Fruits & Vegetables)</option>
                      <option value="Dairy">Dairy Products</option>
                      <option value="Packaged Goods">Packaged / Canned Edibles</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="storage" className="block text-xs font-semibold text-slate-700">
                      Storage Requirement <span className="text-emerald-700">*</span>
                    </label>
                    <select
                      id="storage"
                      value={formData.storageRequirement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          storageRequirement: e.target.value as 'AMBIENT' | 'REFRIGERATED' | 'FROZEN',
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="REFRIGERATED">Refrigerated / Cold Storage (2°C - 5°C)</option>
                      <option value="AMBIENT">Ambient / Room Temperature</option>
                      <option value="FROZEN">Frozen (-18°C)</option>
                    </select>
                  </div>
                </div>

                {/* 3. Quantity & Expiry Window (Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="quantity" className="block text-xs font-semibold text-slate-700">
                      Quantity (Meals Equivalent) <span className="text-emerald-700">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="inline-flex items-center px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                        Meals
                      </span>
                    </div>
                    {errors.quantity && <p className="text-xs text-red-600">{errors.quantity}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="expiryHours" className="block text-xs font-semibold text-slate-700">
                      Shelf-Life Window (Hours from now) <span className="text-emerald-700">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="expiryHours"
                        type="number"
                        min="1"
                        max="72"
                        value={formData.expiryHours}
                        onChange={(e) => setFormData({ ...formData, expiryHours: Number(e.target.value) })}
                        className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="inline-flex items-center px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                        Hours
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Dietary Tags */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Dietary Compatibility Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryOptions.map((tag) => {
                      const isSelected = formData.dietary.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleDietary(tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Handling Notes */}
                <div className="space-y-1.5">
                  <label htmlFor="notes" className="block text-xs font-semibold text-slate-700">
                    Handling & Packaging Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    value={formData.handlingNotes}
                    onChange={(e) => setFormData({ ...formData, handlingNotes: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Bring insulated cooler boxes. Ready for immediate pickup."
                  ></textarea>
                </div>

                {/* Privacy Invariant Banner */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Privacy Safeguard:</strong> Exact pickup coordinates (
                    <em>42 Market Cross Road, Solapur Central</em>) and phone numbers remain masked to the public. Only
                    approximate distance is visible until an authorized recipient formally accepts the match.
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Publish Donation & Find Candidates</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </ProtectedRoute>
      </main>

      <Footer />
    </div>
  );
}
