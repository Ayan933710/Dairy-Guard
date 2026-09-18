/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'theme-bg-main': '#FAFAFA',
        'theme-bg-card': '#FFFFFF',
        'theme-primary': '#0EA5E9',
        'theme-text-dark': '#1E293B',
        'theme-text-muted': '#64748B',
        'theme-risk-none': '#22C55E',
        'theme-risk-low': '#38BDF8',
        'theme-risk-moderate': '#F59E0B',
        'theme-risk-high': '#EF4444',
        // Compatibility names for routes that use the original component API.
        night: { DEFAULT: '#FAFAFA', soft: '#FFFFFF', card: '#FFFFFF' },
        pasture: { DEFAULT: '#0EA5E9', light: '#22C55E' },
        turmeric: { DEFAULT: '#0284C7', soft: '#38BDF8' },
        milk: { DEFAULT: '#1E293B', dim: '#64748B' },
        alert: { low: '#38BDF8', moderate: '#F59E0B', high: '#EF4444' },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Public Sans"', 'sans-serif'],
      },
      backgroundImage: {
        'fresh-gradient':
          'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 55%, #FAFAFA 100%)',
      },
    },
  },
  plugins: [],
};
