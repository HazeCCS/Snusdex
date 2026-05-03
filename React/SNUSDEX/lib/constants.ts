export const SUPABASE_URL = 'https://aqyjrvukfuyuhlidpoxr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_4gIcuQhw528DH6GrmhF16g_V8im-UMU';
export const GITHUB_BASE = 'https://raw.githubusercontent.com/HazeCCS/snusdex-assets/main/assets/';

export const RATING_STEPS = ['visuals', 'smell', 'taste', 'bite', 'drip', 'strength'] as const;
export type RatingStep = typeof RATING_STEPS[number];

export const RARITY_COLORS: Record<string, string> = {
  common: '#8E8E93',
  uncommon: '#34C759',
  rare: '#0A84FF',
  epic: '#BF5AF2',
  legendary: '#FF9F0A',
  exotic: '#FF375F',
  mythic: '#64D2FF',
};

export const IOS = {
  bg: '#000000',
  card: '#1C1C1E',
  card2: '#2C2C2E',
  separator: 'rgba(84,84,88,0.65)',
  gray: '#8E8E93',
  gray2: '#636366',
  gray3: '#3A3A3C',
  green: '#34C759',
  blue: '#0A84FF',
  red: '#FF3B30',
  red2: '#FF453A',
  orange: '#FF9F0A',
  purple: '#BF5AF2',
  yellow: '#FFD60A',
  teal: '#64D2FF',
  cyan: '#32ADE6',
} as const;

export const DEX_CHUNK_SIZE = 30;
export const DEX_FIRST_CHUNK = 9;
