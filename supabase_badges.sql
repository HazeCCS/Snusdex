-- ==========================================
-- SNUSDEX: BADGE SYSTEM - SUPABASE MIGRATION
-- ==========================================
-- Führe dieses Script im Supabase SQL Editor aus.

-- 1. Badges-Tabelle
-- Enthält alle verfügbaren Badges (modular erweiterbar durch neue Rows).
CREATE TABLE IF NOT EXISTS badges (
    id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT            NOT NULL,
    description     TEXT,
    image_url       TEXT            NOT NULL,    -- Relativer Pfad (z.B. 'badges/collector_1.png') oder vollständige URL
    category        TEXT            NOT NULL DEFAULT 'collector',  -- 'collector', 'streak', 'social', etc.
    level           INT             NOT NULL DEFAULT 1,
    required_count  INT             NOT NULL DEFAULT 5,            -- Schwelle für Auto-Vergabe (Collector = Anzahl freigeschalteter Dosen)
    created_at      TIMESTAMPTZ     DEFAULT now()
);

-- 2. User-Badge-Verknüpfung
-- Speichert, welcher User welchen Badge bereits erhalten hat.
CREATE TABLE IF NOT EXISTS user_badges (
    id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id        UUID            NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at     TIMESTAMPTZ     DEFAULT now(),
    UNIQUE(user_id, badge_id)   -- Jeder Badge nur einmal pro User
);

-- 3. Row Level Security (RLS)
ALTER TABLE badges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges  ENABLE ROW LEVEL SECURITY;

-- Alle können Badges lesen (öffentliche Referenzdaten)
CREATE POLICY "badges_public_read" ON badges
    FOR SELECT USING (true);

-- User können nur ihre eigenen user_badges lesen
CREATE POLICY "user_badges_own_read" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);

-- User können nur ihre eigenen user_badges einfügen
CREATE POLICY "user_badges_own_insert" ON user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Seed: Collector-Badges Lvl 1–10
-- image_url: Trage hier deine eigenen Bild-URLs ein.
-- Du kannst diese Einträge nach dem Ausführen in Supabase anpassen (z.B. image_url updaten).
INSERT INTO badges (name, description, image_url, category, level, required_count) VALUES
    ('Collector Lvl 1',   'Schalte 5 verschiedene Snusdosen frei.',    'badges/collector_1.png',   'collector', 1,   5),
    ('Collector Lvl 2',   'Schalte 10 verschiedene Snusdosen frei.',   'badges/collector_2.png',   'collector', 2,   10),
    ('Collector Lvl 3',   'Schalte 15 verschiedene Snusdosen frei.',   'badges/collector_3.png',   'collector', 3,   15),
    ('Collector Lvl 4',   'Schalte 20 verschiedene Snusdosen frei.',   'badges/collector_4.png',   'collector', 4,   20),
    ('Collector Lvl 5',   'Schalte 30 verschiedene Snusdosen frei.',   'badges/collector_5.png',   'collector', 5,   30),
    ('Collector Lvl 6',   'Schalte 40 verschiedene Snusdosen frei.',   'badges/collector_6.png',   'collector', 6,   40),
    ('Collector Lvl 7',   'Schalte 50 verschiedene Snusdosen frei.',   'badges/collector_7.png',   'collector', 7,   50),
    ('Collector Lvl 8',   'Schalte 65 verschiedene Snusdosen frei.',   'badges/collector_8.png',   'collector', 8,   65),
    ('Collector Lvl 9',   'Schalte 80 verschiedene Snusdosen frei.',   'badges/collector_9.png',   'collector', 9,   80),
    ('Collector Lvl 10',  'Schalte 100 verschiedene Snusdosen frei.',  'badges/collector_10.png',  'collector', 10,  100)
ON CONFLICT DO NOTHING;

-- ==========================================
-- WIE NEUE BADGES HINZUGEFÜGT WERDEN
-- ==========================================
--
-- INSERT INTO badges (name, description, image_url, category, level, required_count) VALUES
--     ('Streak Master', '7 Tage in Folge Dosen geöffnet.', 'badges/streak_1.png', 'streak', 1, 7);

-- ==========================================
-- BADGE XP SYSTEM
-- ==========================================
--   Level 1  →  250 XP
--   Level 2  →  400 XP
--   Level 3  →  600 XP
--   Level 4  →  800 XP
--   Level 5  → 1000 XP
--   Level 6  → 1200 XP
--   Level 7  → 1400 XP
--   Level 8  → 1600 XP
--   Level 9  → 1800 XP
--   Level 10 → 2000 XP

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badge_xp INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_badge_xp(uid UUID, xp_amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET badge_xp = COALESCE(badge_xp, 0) + xp_amount
    WHERE id = uid;
END;
$$;

