-- ==========================================
-- SNUSDEX: FEATURED BADGE - MIGRATION
-- ==========================================
-- Führe dieses Script im Supabase SQL Editor aus.

-- 1. Spalte zu profiles hinzufügen
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS featured_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL;

-- 2. RLS: User darf eigenes featured_badge_id updaten
-- (Die bestehende profiles-Update-Policy deckt das ab, falls vorhanden.
--  Falls nicht, Policy anlegen:)
-- CREATE POLICY "profiles_own_update" ON profiles
--     FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
