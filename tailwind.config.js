/** @type {import('tailwindcss').Config} */

// Color tokens are CSS variables (defined in src/index.css) so the whole
// palette can flip for dark mode by toggling the `dark` class on <html>.
// Shades 300/400/500 of `brand` stay fixed: they are used as accents on
// permanently-dark surfaces (logo, hero panels, code blocks).
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`
const scale = (name) => ({
  50: rgb(`${name}-50`),
  100: rgb(`${name}-100`),
  200: rgb(`${name}-200`),
  600: rgb(`${name}-600`),
  700: rgb(`${name}-700`),
  800: rgb(`${name}-800`),
  900: rgb(`${name}-900`),
})

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: rgb('surface'),
        night: rgb('night'),
        ink: {
          50: rgb('ink-50'),
          100: rgb('ink-100'),
          200: rgb('ink-200'),
          300: rgb('ink-300'),
          400: rgb('ink-400'),
          500: rgb('ink-500'),
          600: rgb('ink-600'),
          700: rgb('ink-700'),
          800: rgb('ink-800'),
          900: rgb('ink-900'),
          950: rgb('ink-950'),
        },
        brand: {
          50: rgb('brand-50'),
          100: rgb('brand-100'),
          200: rgb('brand-200'),
          300: '#90b4ff',
          400: '#5b8cff',
          500: '#3563f5',
          600: '#2147e0',
          700: rgb('brand-700'),
          800: rgb('brand-800'),
          900: rgb('brand-900'),
        },
        critical: rgb('critical'),
        high: rgb('high'),
        medium: rgb('medium'),
        low: rgb('low'),
        red: scale('red'),
        orange: scale('orange'),
        yellow: scale('yellow'),
        green: scale('green'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(16,24,40,.16)',
        lift: '0 18px 45px -20px rgba(16,24,40,.35)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.55' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pop: {
          '0%': { transform: 'scale(.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .45s cubic-bezier(.22,1,.36,1) both',
        fadeIn: 'fadeIn .35s ease both',
        pulseSoft: 'pulseSoft 1.6s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        pop: 'pop .28s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
}
