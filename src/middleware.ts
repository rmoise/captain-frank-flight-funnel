import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@/config/language";

// Create middleware that handles locale detection and routing
export default createMiddleware({
  // A list of all locales that are supported
  locales,
  // Used when no locale matches - this will be German
  defaultLocale,
  // Prefix all locales with a path
  localePrefix: "always",
  // Disable automatic locale detection to force German as default
  localeDetection: false,
});

// Match both internationalized and non-internationalized pathnames
export const config = {
  matcher: [
    // Home routes
    "/",
    // Localized routes
    "/(de|en)/:path*",
    // Non-localized routes that should be redirected to localized versions
    "/phases/:path*",
    "/api/:path*",
    // Exclude Next.js internal paths
    "/((?!_next|_static|favicon.ico).*)",
  ],
};
