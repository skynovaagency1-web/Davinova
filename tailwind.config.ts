import type { Config } from 'tailwindcss';
import { brand } from './src/config/brand';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: brand.colors.ivory,
        blush: brand.colors.blush,
        champagne: brand.colors.champagne,
        ink: brand.colors.ink,
        muted: brand.colors.muted,
      },
      fontFamily: { display: [brand.fonts.display, 'Georgia', 'serif'], body: [brand.fonts.body, 'sans-serif'] },
      boxShadow: { soft: '0 16px 48px rgba(57, 40, 35, .08)' },
    },
  },
  plugins: [],
} satisfies Config;
