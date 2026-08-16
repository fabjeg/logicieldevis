/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Fonds
        page: '#F2F3F9',
        surface: '#FFFFFF',
        // Texte
        ink: '#23253A',
        muted: '#9598B8',
        faint: '#C2C4DA',
        // Accent
        accent: {
          DEFAULT: '#6366F1',
          soft: '#EEF0FE',
        },
        // Statuts
        success: { DEFAULT: '#14B863', soft: '#E9FBF1' },
        pending: { DEFAULT: '#9598B8', soft: '#F0F1F6' },
        danger: { DEFAULT: '#DC2626', soft: '#FDECEC' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '22px',
        field: '16px',
        chip: '11px',
      },
      boxShadow: {
        soft: '0 6px 14px -4px rgba(99,102,241,0.10)',
        tab: '0 8px 24px -6px rgba(35,37,58,0.12)',
        fab: '0 10px 22px -6px rgba(99,102,241,0.45)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(145deg, #7C7FF2, #6366F1)',
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
    },
  },
  plugins: [],
};
