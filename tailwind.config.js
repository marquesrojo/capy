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
        // Colores oficiales del manual de marca de Club Pucara, usados
        // unicamente en las pantallas de CLIENTE (carta, carrito, pago,
        // estado del pedido, encuesta). El panel de admin sigue con "ember".
        pucara: {
          blue: {
            300: '#5C7DAD',
            400: '#2E5694',
            500: '#002F6C',
            600: '#00255A',
            700: '#001C44'
          },
          red: {
            400: '#E85A4E',
            500: '#DA291C',
            600: '#B81F14',
            700: '#8F1810'
          }
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
        ember: '0 0 0 1px rgba(255,157,66,0.25), 0 8px 24px -8px rgba(255,157,66,0.35)',
        pucara: '0 0 0 1px rgba(0,47,108,0.2), 0 8px 24px -8px rgba(0,47,108,0.35)'
      }
    }
  },
  plugins: []
}
