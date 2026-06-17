/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        carbon: {
          950: '#FAF8F5',
          900: '#F3F0EA',
          800: '#E8E3DA',
          700: '#D8D1C4',
          600: '#C2B9A8'
        },
        ember: {
          400: '#FF9D42',
          500: '#E8772A',
          600: '#C25A18',
          700: '#9C4612'
        },
        smoke: {
          300: '#4A4742',
          400: '#6B6862',
          500: '#8A8680'
        }
      },
      fontFamily: {
        display: ['"Bebas Neue"', '"Oswald"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        ember: '0 0 0 1px rgba(255,157,66,0.25), 0 8px 24px -8px rgba(255,157,66,0.35)'
      }
    }
  },
  plugins: []
}
