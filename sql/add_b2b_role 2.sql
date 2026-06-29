-- Migration: Add B2B Role to Profiles for Snusdash Access

-- 1. Add is_b2b column to public.profiles table if it does not exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT false;

-- 2. Create an index for quick authorization checks on login
CREATE INDEX IF NOT EXISTS idx_profiles_is_b2b ON public.profiles(is_b2b);

-- 3. Document/Helper Query:
-- To authorize yourself (or any user) for Snusdash, find their user by email and set is_b2b = true:
--
-- UPDATE public.profiles 
-- SET is_b2b = true 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@HERE.com');
--
-- Or if you want to set is_b2b for ALL profiles for development/testing:
-- UPDATE public.profiles SET is_b2b = true;
