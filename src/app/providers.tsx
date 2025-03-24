'use client';

import { ChromeDebugProvider } from '@/providers/ChromeDebugProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChromeDebugProvider>
      <div className="min-h-screen">
        <main>{children}</main>
      </div>
    </ChromeDebugProvider>
  );
}
