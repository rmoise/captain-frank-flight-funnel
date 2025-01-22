'use client';

import { Providers } from '@/app/providers';
import { Navbar } from '@/components/Navbar';

export default function RootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </Providers>
  );
}
