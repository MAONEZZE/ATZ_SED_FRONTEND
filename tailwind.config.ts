import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			// Principal — corpo do site (aplicada em <body>, ver app/layout.tsx)
  			serif: [
  				'var(--font-eb-garamond)',
  				'Georgia',
  				'"Times New Roman"',
  				'serif'
  			],
  			// Secundária — títulos (h1-h6, ver app/globals.css) e uso pontual
  			sans: [
  				'var(--font-host-grotesk)',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'"SF Pro Text"',
  				'"Segoe UI"',
  				'Roboto',
  				'Helvetica',
  				'Arial',
  				'sans-serif'
  			]
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: 'hsl(var(--destructive))',
  			danger: 'hsl(var(--danger))',
  			brand: {
  				DEFAULT: 'hsl(var(--color-accent))',
  				ink: 'hsl(var(--color-accent-ink))',
  				'ink-hover': 'hsl(var(--color-accent-ink-hover))'
  			},
  			offwhite: 'hsl(var(--color-offwhite))',
  			status: {
  				'success-bg': 'var(--status-success-bg)',
  				'success-fg': 'var(--status-success-fg)',
  				'danger-bg': 'var(--status-danger-bg)',
  				'danger-fg': 'var(--status-danger-fg)',
  				'pending-bg': 'var(--status-pending-bg)',
  				'pending-fg': 'var(--status-pending-fg)',
  				'neutral-bg': 'var(--status-neutral-bg)',
  				'neutral-fg': 'var(--status-neutral-fg)'
  			},
  			warn: {
  				DEFAULT: 'hsl(var(--warn))',
  				strong: 'hsl(var(--warn-strong))',
  				soft: 'hsl(var(--warn-soft))',
  				text: 'hsl(var(--warn-text))'
  			},
  			ink: {
  				DEFAULT: 'hsl(var(--color-ink))',
  				'900': 'hsl(var(--ink-900))',
  				'700': 'hsl(var(--ink-700))',
  				'600': 'hsl(var(--ink-600))',
  				'500': 'hsl(var(--ink-500))',
  				'300': 'hsl(var(--ink-300))',
  				'200': 'hsl(var(--ink-200))',
  				'100': 'hsl(var(--ink-100))'
  			},
  			surface: {
  				DEFAULT: 'hsl(var(--surface))',
  				'2': 'hsl(var(--surface-2))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			xl: 'calc(var(--radius) + 5px)',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			sm: 'var(--shadow-sm)',
  			DEFAULT: 'var(--shadow)',
  			md: 'var(--shadow)',
  			pop: 'var(--shadow-pop)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
