import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_KEY } from './constants';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types mirroring Supabase tables
export type SnusProduct = {
  id: number;
  name: string;
  nicotine: number;
  rarity: string;
  flavor: string[];
  barcode: string | null;
  image: string;
  overall_score?: number;
  avg_score?: number;
  score?: number;
};

export type UserCollection = {
  user_id: string;
  snus_id: number;
  collected_at: string;
  rating_taste: number;
  rating_taste_text: string;
  rating_smell: number;
  rating_smell_text: string;
  rating_bite: number;
  rating_bite_text: string;
  rating_drip: number;
  rating_drip_text: string;
  rating_visuals: number;
  rating_visuals_text: string;
  rating_strength: number;
  rating_strength_text: string;
  opened_count?: number;
};

export type UsageLog = {
  id: string;
  user_id: string;
  snus_id: number;
  opened_at: string;
  finished_at: string | null;
  is_active: boolean;
  pouches_per_can: number | null;
  pouches_taken: number | null;
  mg_per_gram: number | null;
  snus_products?: SnusProduct;
};

export type Badge = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  level: number;
  category: string;
  required_count: number;
  xp_reward: number;
};

export type Profile = {
  id: string;
  username: string;
  username_changes?: number;
  username_last_reset?: string;
  featured_badge_id?: number | null;
  avatar_url?: string | null;
  xp?: number;
};

export type UserFollow = {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'pending' | 'accepted' | 'blocked';
};
