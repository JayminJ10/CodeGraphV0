/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // IcePanel-inspired developer tool palette.
        app: '#090B10',
        panel: '#0F1219',
        raised: '#151922',
        canvas: '#0B0E14',
        border: {
          DEFAULT: '#252B36',
          strong: '#333B4A',
        },
        content: {
          primary: '#F3F4F6',
          secondary: '#9299A8',
          muted: '#687080',
        },
        accent: {
          DEFAULT: '#6D7CFF',
          soft: '#6D7CFF26',
        },
        // Retained for existing chat/repo components.
        surface: {
          950: '#090B10',
          900: '#0F1219',
          800: '#151922',
          700: '#1F2530',
        },
      },
      boxShadow: {
        panel: '0 1px 0 rgba(148,163,184,0.05), 0 8px 20px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
