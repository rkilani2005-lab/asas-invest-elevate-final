import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
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
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        charcoal: {
          DEFAULT: "hsl(var(--charcoal))",
          light: "hsl(var(--charcoal-light))",
        },
        gold: {
          DEFAULT: "hsl(40, 42%, 56%)",
          light: "hsl(40, 48%, 62%)",
          dark: "hsl(40, 38%, 48%)",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(0, 0%, 98%) 0%, hsl(0, 0%, 96%) 100%)',
        'gradient-accent': 'linear-gradient(135deg, hsl(40, 42%, 56%) 0%, hsl(40, 48%, 62%) 100%)',
        'gradient-hero': 'linear-gradient(to bottom, rgba(250, 250, 250, 0.1), rgba(197, 160, 89, 0.15))',
        'gradient-hero-overlay': 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3), rgba(250, 250, 250, 0.6))',
      },
      boxShadow: {
        'elegant': '0 4px 20px -4px rgba(197, 160, 89, 0.15)',
        'luxury': '0 8px 30px -8px rgba(197, 160, 89, 0.2)',
        'card': '0 2px 12px -2px rgba(0, 0, 0, 0.08)',
        'none': 'none',
      },
      fontFamily: {
        // English Fonts - Modernist Landmark
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        heading: ['"Satoshi"', 'system-ui', 'sans-serif'],
        display: ['"Satoshi"', 'system-ui', 'sans-serif'],
        // Arabic Fonts
        'arabic-heading': ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        'arabic-body': ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'tighter': '-0.04em',
        'tight': '-0.03em',
        'normal': '0',
        'wide': '0.05em',
        'wider': '0.1em',
        'widest': '0.15em',
        'luxury': '0.2em',
      },
      lineHeight: {
        'tight': '1.1',
        'snug': '1.3',
        'normal': '1.5',
        'relaxed': '1.7',
        'loose': '1.8',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-tab": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "fade-in-up": "fade-in-up 0.8s ease-out forwards",
        "fade-tab": "fade-tab 0.25s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
