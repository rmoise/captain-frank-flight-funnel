import { Heebo } from "next/font/google";

// Define the Heebo font with improved options to prevent hydration mismatches
export const heebo = Heebo({
  subsets: ["latin"],
  display: "swap", // Use swap to ensure text remains visible during font loading
  variable: "--font-heebo", // CSS variable for the font
  weight: ["400", "500", "700"],
  fallback: ["system-ui", "Arial", "sans-serif"], // Provide fallback fonts
});
