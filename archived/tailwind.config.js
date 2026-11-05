/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './Public/**/*.html',
    './Public/**/*.js',
  ],
  safelist: [
    // Rarity badge background + border: built via `bg-[var(--${rarityLower},var(--common))]/10`
    // Scanner cannot detect template-literal-constructed class names — enumerate all combinations.
    'bg-[var(--common,var(--common))]/10',
    'bg-[var(--uncommon,var(--common))]/10',
    'bg-[var(--rare,var(--common))]/10',
    'bg-[var(--epic,var(--common))]/10',
    'bg-[var(--legendary,var(--common))]/10',
    'bg-[var(--exotic,var(--common))]/10',
    'bg-[var(--mythic,var(--common))]/10',
    'border-[var(--common,var(--common))]/30',
    'border-[var(--uncommon,var(--common))]/30',
    'border-[var(--rare,var(--common))]/30',
    'border-[var(--epic,var(--common))]/30',
    'border-[var(--legendary,var(--common))]/30',
    'border-[var(--exotic,var(--common))]/30',
    'border-[var(--mythic,var(--common))]/30',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
