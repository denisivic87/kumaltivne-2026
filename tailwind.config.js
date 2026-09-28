/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#0F172A',
          800: '#111827',
          700: '#1E293B',
        },
        brand: {
          600: '#2563EB',
          700: '#1D4ED8',
          500: '#3B82F6',
          50: '#EFF6FF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F1F5F9',
          page: '#F8FAFC',
        },
        ink: {
          900: '#0F172A',
          600: '#475569',
          400: '#64748B',
        },
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        success: {
          600: '#16A34A',
          50: '#F0FDF4',
          200: '#BBF7D0',
        },
        warning: {
          600: '#D97706',
          50: '#FFFBEB',
          200: '#FDE68A',
        },
        error: {
          600: '#DC2626',
          50: '#FEF2F2',
          200: '#FECACA',
        },
      },
      boxShadow: {
        'elev1': '0 1px 2px 0 rgba(0,0,0,0.04)',
        'elev2': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'elev3': '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'dropdown': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
        'drawer': '-4px 0 24px -4px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'xl2': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in': 'slideIn 200ms ease-out',
        'slide-right': 'slideRight 200ms ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
