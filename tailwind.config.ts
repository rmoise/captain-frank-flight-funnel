import type { Config } from "tailwindcss";

// Helper function to safely load plugins
function safeRequire(moduleName: string) {
  try {
    return require(moduleName);
  } catch (error) {
    console.warn(`Failed to load ${moduleName}:`, error);
    return null;
  }
}

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-heebo)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        heebo: [
          "var(--font-heebo)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        primary: {
          "50": "#EBF5FF",
          "100": "#E1EFFE",
          "500": "#3B82F6",
          "600": "#2563EB",
          "700": "#1D4ED8",
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          "50": "#F8FAFC",
          "100": "#F1F5F9",
          "500": "#64748B",
          "600": "#475569",
          "700": "#334155",
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          "50": "#F0FDF4",
          "500": "#22C55E",
        },
        error: {
          "50": "#FEF2F2",
          "500": "#EF4444",
        },
        brand: {
          red: "#F54538",
          green: "#08d259",
          "green-light": "#c7efd7",
          gray: {
            text: "#464646",
            muted: "#8d8d8d",
            step: "#6f6f6f",
            bg: "#f1f1f1",
          },
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        slideIn: {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-in-out forwards",
        "slide-up-1": "slideIn 0.6s ease-out forwards",
        "slide-up-2": "slideIn 0.6s ease-out 0.2s forwards",
        "slide-up-3": "slideIn 0.6s ease-out 0.4s forwards",
        "slide-up-4": "slideIn 0.6s ease-out 0.6s forwards",
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    // Load plugins safely to prevent build failures
    safeRequire("tailwindcss-animate"),
    safeRequire("@tailwindcss/typography"),
  ].filter(Boolean), // Remove null entries
};

export default config;
