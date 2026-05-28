import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ombu: {
          50:  '#f0faf4',
          100: '#d8f3e3',
          200: '#b3e8ca',
          300: '#7dd4a8',
          400: '#3ab87e',
          500: '#1f9b63',
          600: '#137d4f',
          700: '#0f6340',
          800: '#0d4f34',
          900: '#0b3f2a',
          950: '#051f15',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
