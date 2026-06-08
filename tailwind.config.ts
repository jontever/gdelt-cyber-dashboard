import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0e1a',
          panel: '#0f1629',
          border: '#1e3a5f',
          accent: '#00d4ff',
          warn: '#ff6b35',
          danger: '#ff2d55',
          muted: '#4a6fa5',
        },
      },
    },
  },
  plugins: [],
};

export default config;
