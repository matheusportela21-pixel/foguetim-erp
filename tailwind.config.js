/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        navy:   { DEFAULT: '#1a1f4e', 50: '#f0f1ff', 100: '#e0e3ff', 200: '#c7cbff', 300: '#a5acff', 400: '#8188ff', 500: '#5f67f7', 600: '#4a51e8', 700: '#3a40cc', 800: '#2d32a3', 900: '#1a1f4e' },
        purple: { DEFAULT: '#6c3fa0', 50: '#f9f5ff', 100: '#f1e8ff', 200: '#e3d1ff', 300: '#ccadff', 400: '#b07dff', 500: '#9550f5', 600: '#8130e8', 700: '#6c3fa0', 800: '#5a1f8a', 900: '#3d1160' },
        cyan:   { DEFAULT: '#00c2ff', 50: '#f0fbff', 100: '#d9f5ff', 200: '#a8ecff', 300: '#6de0ff', 400: '#24cfff', 500: '#00c2ff', 600: '#009acc', 700: '#0077a3', 800: '#005c82', 900: '#003d5c' },
        orange: { DEFAULT: '#ff6b35', 50: '#fff5f0', 100: '#ffe8db', 200: '#ffcfb3', 300: '#ffaf80', 400: '#ff8c52', 500: '#ff6b35', 600: '#e8521f', 700: '#c43d12', 800: '#9e2e09', 900: '#7a2005' },
        // Dashboard darks
        dark:   { 950: '#090c14', 900: '#0f1117', 800: '#161b27', 700: '#1c2233', 600: '#232940', 500: '#2a3050', },
        // Neutral
        slate:  { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
      },
      fontFamily: {
        sans:     ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        heading:  ['Sora', 'Space Grotesk', 'sans-serif'],
        mono:     ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-md': '0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.08)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.1), 0 16px 48px rgba(0,0,0,0.12)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.06)',
        'neon-cyan':   '0 0 20px rgba(0,194,255,0.3)',
        'neon-purple': '0 0 20px rgba(108,63,160,0.3)',
        'neon-orange': '0 0 20px rgba(255,107,53,0.3)',
        'glow-sm':     '0 0 12px rgba(0,194,255,0.2)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #1a1f4e 0%, #6c3fa0 100%)',
        'gradient-hero':  'linear-gradient(135deg, #f0f1ff 0%, #f9f5ff 50%, #f0fbff 100%)',
        'gradient-dark':  'linear-gradient(180deg, #0f1117 0%, #161b27 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      borderRadius: {
        '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem',
      },
      animation: {
        'float':      'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'twinkle':    'twinkle 3s ease-in-out infinite alternate',
        'orbit':      'orbit 20s linear infinite',
        'slide-up':   'slideUp 0.4s ease-out',
        'fade-in':    'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float:    { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        twinkle:  { '0%': { opacity: '0.2' }, '100%': { opacity: '0.9' } },
        orbit:    { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        slideUp:  { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
