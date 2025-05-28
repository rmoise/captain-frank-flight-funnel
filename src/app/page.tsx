"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to German (de) as the default language
    // This ensures German is the default regardless of browser settings
    router.replace("/de/phases/initial-assessment");
  }, [router]);

  return null;
}
