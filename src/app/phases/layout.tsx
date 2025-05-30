"use client";

import React from "react";
import { WelcomeSection } from "@/components/shared/welcome/WelcomeSection";
import { Navbar } from "@/components/shared/navigation/Navbar";

interface PhaseLayoutProps {
  children: React.ReactNode;
}

export default function PhaseLayout({ children }: PhaseLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <WelcomeSection />
      <div className="max-w-3xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
