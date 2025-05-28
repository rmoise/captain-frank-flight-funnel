"use client";

import React from "react";
import { LoadingProvider } from "@/providers/LoadingProvider";
import AgreementPage from "./page";

export default function AgreementPageWrapper() {
  return (
    <LoadingProvider>
      <AgreementPage />
    </LoadingProvider>
  );
}
