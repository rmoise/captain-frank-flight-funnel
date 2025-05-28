"use client";

import StoreProvider from "@/providers/StoreProvider";
import ClientProviders from "@/providers/ClientProviders";
import { NavigationProvider } from "@/providers/NavigationProvider.shared";
import { ExternalScriptsProvider } from "@/providers/ExternalScriptsProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <NavigationProvider>
        <ExternalScriptsProvider />
        <ClientProviders>{children}</ClientProviders>
      </NavigationProvider>
    </StoreProvider>
  );
}
