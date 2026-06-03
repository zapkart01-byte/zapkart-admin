/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ── Brand Aliases (PRD Section 4) ── */
      colors: {
        brand: {
          DEFAULT: '#FF6B00',
          soft: '#FFF0E6',
          dark: '#CC5500',
        },

        /* ── Stitch Electric Commerce Core MD3 Palette ── */
        'primary': '#a04100',
        'on-primary': '#ffffff',
        'primary-container': '#ff6b00',
        'on-primary-container': '#572000',
        'inverse-primary': '#ffb693',
        'primary-fixed': '#ffdbcc',
        'primary-fixed-dim': '#ffb693',
        'on-primary-fixed': '#351000',
        'on-primary-fixed-variant': '#7a3000',

        'secondary': '#5f5e5e',
        'on-secondary': '#ffffff',
        'secondary-container': '#e5e2e1',
        'on-secondary-container': '#656464',
        'secondary-fixed': '#e5e2e1',
        'secondary-fixed-dim': '#c9c6c5',
        'on-secondary-fixed': '#1c1b1b',
        'on-secondary-fixed-variant': '#474646',

        'tertiary': '#585f6c',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#9299a8',
        'on-tertiary-container': '#2a313d',
        'tertiary-fixed': '#dce2f3',
        'tertiary-fixed-dim': '#c0c7d6',
        'on-tertiary-fixed': '#151c27',
        'on-tertiary-fixed-variant': '#404754',

        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        'background': '#f8f9fa',
        'on-background': '#191c1d',

        'surface': '#f8f9fa',
        'on-surface': '#191c1d',
        'surface-variant': '#e1e3e4',
        'on-surface-variant': '#5a4136',
        'surface-dim': '#d9dadb',
        'surface-bright': '#f8f9fa',
        'surface-tint': '#a04100',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f4f5',
        'surface-container': '#edeeef',
        'surface-container-high': '#e7e8e9',
        'surface-container-highest': '#e1e3e4',
        'inverse-surface': '#2e3132',
        'inverse-on-surface': '#f0f1f2',

        'outline': '#8e7164',
        'outline-variant': '#e2bfb0',

        /* ── Semantic Colors (PRD Section 4 & 11) ── */
        success: { DEFAULT: '#16A34A', soft: '#DCFCE7' },
        danger: { DEFAULT: '#EF4444', soft: '#FEE2E2' },
        warning: { DEFAULT: '#F59E0B', soft: '#FEF3C7' },
        info: { DEFAULT: '#1D4ED8', soft: '#DBEAFE' },

        /* ── Order Status Colors (PRD Section 11) ── */
        'status-placed-bg': '#DBEAFE',
        'status-placed-text': '#1D4ED8',
        'status-confirmed-bg': '#F5F3FF',
        'status-confirmed-text': '#7C3AED',
        'status-packed-bg': '#FEF3C7',
        'status-packed-text': '#D97706',
        'status-picked-bg': '#FFF0E6',
        'status-picked-text': '#FF6B00',
        'status-delivered-bg': '#DCFCE7',
        'status-delivered-text': '#16A34A',
        'status-cancelled-bg': '#FEE2E2',
        'status-cancelled-text': '#EF4444',
      },

      /* ── Border Radius (Stitch DESIGN.md) ── */
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },

      /* ── Spacing Scale (Stitch DESIGN.md) ── */
      spacing: {
        base: '4px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        'margin-mobile': '16px',
        'gutter-mobile': '12px',
      },

      /* ── Font Families ── */
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        'headline-lg': ['Inter'],
        'headline-md': ['Inter'],
        'headline-sm': ['Inter'],
        'body-lg': ['Inter'],
        'body-md': ['Inter'],
        'body-sm': ['Inter'],
        'label-lg': ['Inter'],
        'label-md': ['Inter'],
        'label-sm': ['Inter'],
      },

      /* ── Typography Scale (Stitch DESIGN.md) ── */
      fontSize: {
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-sm': ['10px', { lineHeight: '14px', fontWeight: '600' }],
      },

      /* ── Shadows (Stitch DESIGN.md) ── */
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.07)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.1)',
      },

      /* ── Min Heights ── */
      minHeight: {
        'tap': '44px',
        'btn-mobile': '52px',
        'btn-desktop': '40px',
        'input': '48px',
      },
    },
  },
  plugins: [],
}
