"use client";

import { Providers } from "@/app/providers";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <body suppressHydrationWarning className="overflow-x-hidden">
      <Providers>
        <div className="relative w-full overflow-x-hidden">{children}</div>
      </Providers>
    </body>
  );
}
