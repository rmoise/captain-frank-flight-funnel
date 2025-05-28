"use client";

import { default as StoreProvider } from "@/providers/StoreProvider";
import { ErrorBoundary } from "@/components/ui/feedback/ErrorBoundary";
import { LoadingProvider } from "@/providers/LoadingProvider";
import { AccordionProvider } from "@/components/shared/accordion/AccordionContext";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <ErrorBoundary>
        <LoadingProvider>
          <AccordionProvider>{children}</AccordionProvider>
        </LoadingProvider>
      </ErrorBoundary>
    </StoreProvider>
  );
}
