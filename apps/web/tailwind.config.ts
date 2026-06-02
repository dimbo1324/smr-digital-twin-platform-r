import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "focus-ring": "hsl(var(--focus-ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        mock: {
          DEFAULT: "hsl(var(--mock))",
          foreground: "hsl(var(--mock-foreground))",
        },
        offline: {
          DEFAULT: "hsl(var(--offline))",
          foreground: "hsl(var(--offline-foreground))",
        },
        disabled: {
          DEFAULT: "hsl(var(--disabled))",
          foreground: "hsl(var(--disabled-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
          elevated: "hsl(var(--surface-elevated))",
          subtle: "hsl(var(--surface-subtle))",
        },
        status: {
          healthy: "hsl(var(--status-healthy))",
          warning: "hsl(var(--status-warning))",
          critical: "hsl(var(--status-critical))",
          degraded: "hsl(var(--status-degraded))",
          disabled: "hsl(var(--status-disabled))",
          connected: "hsl(var(--status-connected))",
          disconnected: "hsl(var(--status-disconnected))",
          simulation: "hsl(var(--status-simulation))",
          fallback: "hsl(var(--status-fallback))",
        },
        chart: {
          temperature: "hsl(var(--chart-temperature))",
          pressure: "hsl(var(--chart-pressure))",
          flow: "hsl(var(--chart-flow))",
          level: "hsl(var(--chart-level))",
          valve: "hsl(var(--chart-valve))",
          pid: "hsl(var(--chart-pid))",
          neutral: "hsl(var(--chart-neutral))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--app-radius-lg)",
        md: "var(--app-radius-md)",
        sm: "var(--app-radius-sm)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        lift: "var(--shadow-lift)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
