import React from 'react';
import Navbar from '@/components/navigation/Navbar';
import HeroSection from '@/components/home/HeroSection';
import ProblemSection from '@/components/home/ProblemSection';
import SolutionSection from '@/components/home/SolutionSection';
import MatchingSection from '@/components/home/MatchingSection';
import ResearchSection from '@/components/home/ResearchSection';
import DynamicReallocationSection from '@/components/home/DynamicReallocationSection';
import ExperimentSection from '@/components/home/ExperimentSection';
import PrivacySection from '@/components/home/PrivacySection';
import RolesSection from '@/components/home/RolesSection';
import ImpactSection from '@/components/home/ImpactSection';
import LifecycleSection from '@/components/home/LifecycleSection';
import TechnologySection from '@/components/home/TechnologySection';
import WhyApproachSection from '@/components/home/WhyApproachSection';
import FutureSection from '@/components/home/FutureSection';
import FinalCtaSection from '@/components/home/FinalCtaSection';
import Footer from '@/components/home/Footer';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* 1. Sticky Navigation Bar */}
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. Problem Statement */}
        <ProblemSection />

        {/* 4. End-to-End Solution Workflow */}
        <SolutionSection />

        {/* 5. Deterministic Matching Algorithm Baseline */}
        <MatchingSection />

        {/* 6. Research Challenge & Question */}
        <ResearchSection />

        {/* 7. Proposed Dynamic Reallocation Decision Logic */}
        <DynamicReallocationSection />

        {/* 8. Simulation Evaluation Methodology & Metrics */}
        <ExperimentSection />

        {/* 9. Privacy & Security Invariants */}
        <PrivacySection />

        {/* 10. User Personas & System Roles */}
        <RolesSection />

        {/* 11. Environmental & Community Impact Metrics */}
        <ImpactSection />

        {/* 12. Donation & Match Lifecycle Separation */}
        <LifecycleSection />

        {/* 13. System Technology Architecture */}
        <TechnologySection />

        {/* 14. Why This Approach (Core Principles) */}
        <WhyApproachSection />

        {/* 15. Future Research Vectors */}
        <FutureSection />

        {/* 16. Final Call-to-Action */}
        <FinalCtaSection />
      </main>

      {/* 17. Footer */}
      <Footer />
    </div>
  );
}
