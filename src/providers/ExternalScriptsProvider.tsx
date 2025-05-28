"use client";

import { useEffect } from "react";

// Define DataLayerEvent for Google Tag Manager
interface DataLayerEvent {
  [key: string]: any;
}

// Add type declarations for global window objects
declare global {
  interface Window {
    _cookiebot?: any;
    hj?: any;
    gtag?: (...args: any[]) => void;
    __cookiebot_script_loaded?: boolean;
    __hotjar_script_loaded?: boolean;
    Cookiebot?: any;
    // Do not declare dataLayer here to avoid conflicts
  }
}

/**
 * Component to manage third-party script loading
 * This prevents certain scripts from loading in dev environment
 */
export function ExternalScriptsProvider() {
  useEffect(() => {
    // Only execute in production environment
    if (process.env.NODE_ENV === "production") {
      // This would be where you'd initialize external scripts
      // But we're not initializing them in development
      console.log("External scripts would initialize in production");
    } else {
      // Disable any global variables that might be used by these scripts
      if (typeof window !== "undefined") {
        // Create no-op functions to prevent errors
        window.gtag =
          window.gtag ||
          function () {
            console.log("[DISABLED] gtag call:", arguments);
          };

        // Handle dataLayer with type casting to avoid TypeScript errors
        const win = window as any;
        win.dataLayer = win.dataLayer || [];

        // Prevent script loading attempts
        window.__cookiebot_script_loaded = true;
        window.__hotjar_script_loaded = true;

        // Clear any global handlers or objects that might exist
        window._cookiebot = undefined;
        window.hj = undefined;
        window.Cookiebot = undefined;

        // Add console message for debugging
        console.log("External scripts disabled in development environment");
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  // This component doesn't render anything
  return null;
}
