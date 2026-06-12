-- Add columns for Daily Streak and Collector Card appearance to the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_tracked_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_appearance JSONB DEFAULT '{}'::jsonb;
