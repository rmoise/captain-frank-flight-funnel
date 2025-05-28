// Re-export all i18n functionality from a single entry point
export * from "./client";
export { default as getRequestConfig } from "./server";
export * from "./translations";

// Note: For locale-aware navigation, use:
// import { Link, useRouter, usePathname } from 'next-intl/client';
