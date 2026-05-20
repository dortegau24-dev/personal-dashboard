import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0f',
          raised: '#12121a',
          elevated: '#1a1a24',
        },
        gold: {
          DEFAULT: '#D4AF37',
          bright: '#FFD700',
          dim: '#9b7f28',
        },
        silver: {
          DEFAULT: '#C0C0C0',
          dim: '#A8A8A8',
        },
        bronze: {
          DEFAULT: '#CD7F32',
          dim: '#B87333',
        },
        danger: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        muted: '#666666',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'SF Mono', 'monospace'],
        sans: ['var(--font-sans)', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: { glass: '20px' },
      transitionDuration: { DEFAULT: '300ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      animation: {
        'ticker-scroll': 'ticker-scroll 60s linear infinite',
        'pr-flash': 'pr-flash 1.2s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pr-flash': {
          '0%': { boxShadow: '0 0 0 0 rgba(255,215,0,0.7)' },
          '100%': { boxShadow: '0 0 0 40px rgba(255,215,0,0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
