-- ==========================================
-- SNUSDEX: CREATOR'S PICK SYSTEM (Migration)
-- ==========================================
-- Führe dieses Script im Supabase SQL Editor aus.
-- Migriert die bestehende creator_picks Tabelle und fügt alle neuen Spalten hinzu.

-- ==========================================
-- 0. Spalten zu profiles hinzufügen
-- ==========================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_creator         BOOLEAN     DEFAULT false,
    ADD COLUMN IF NOT EXISTS creator_handle     TEXT        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS creator_avatar_url TEXT        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS content_follower   INTEGER     DEFAULT 0;

-- ==========================================
-- 1. Alte creator_picks Tabelle migrieren
--    (Falls sie bereits existiert ohne user_id)
-- ==========================================

-- Fehlende Spalten zur bestehenden Tabelle hinzufügen
ALTER TABLE creator_picks
    ADD COLUMN IF NOT EXISTS user_id             UUID        DEFAULT NULL
                                                            REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS creator_handle     TEXT        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS creator_avatar_url TEXT        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS content_follower   INTEGER     DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active          BOOLEAN     DEFAULT true;

-- Unique Constraint hinzufügen (nur wenn noch nicht vorhanden)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'creator_picks_user_snus_unique'
    ) THEN
        ALTER TABLE creator_picks
            ADD CONSTRAINT creator_picks_user_snus_unique UNIQUE (user_id, snus_id);
    END IF;
END $$;

-- Falls die Tabelle noch gar nicht existiert, jetzt neu anlegen
CREATE TABLE IF NOT EXISTS creator_picks (
    id                  UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             UUID            REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_name        TEXT            NOT NULL DEFAULT 'Creator',
    creator_handle      TEXT            DEFAULT NULL,
    creator_avatar_url  TEXT            DEFAULT NULL,
    content_follower    INTEGER         DEFAULT 0,
    snus_id             INTEGER         NOT NULL,
    custom_headline     TEXT            DEFAULT NULL,
    review_text         TEXT            DEFAULT NULL,
    rating_taste        NUMERIC(3,1)    DEFAULT NULL,
    rating_smell        NUMERIC(3,1)    DEFAULT NULL,
    rating_bite         NUMERIC(3,1)    DEFAULT NULL,
    rating_drip         NUMERIC(3,1)    DEFAULT NULL,
    rating_visuals      NUMERIC(3,1)    DEFAULT NULL,
    rating_strength     NUMERIC(3,1)    DEFAULT NULL,
    is_active           BOOLEAN         DEFAULT true,
    created_at          TIMESTAMPTZ     DEFAULT now(),
    CONSTRAINT creator_picks_user_snus_unique UNIQUE (user_id, snus_id)
);

-- ==========================================
-- 2. Row Level Security
-- ==========================================
ALTER TABLE creator_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_picks_public_read" ON creator_picks;
CREATE POLICY "creator_picks_public_read" ON creator_picks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "creator_picks_own_write" ON creator_picks;
CREATE POLICY "creator_picks_own_write" ON creator_picks
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. Index für Sortierung
-- ==========================================
CREATE INDEX IF NOT EXISTS creator_picks_follower_idx
    ON creator_picks (content_follower DESC, created_at DESC);

-- ==========================================
-- 4. RPC: Aktive Creator Picks der letzten 3 Tage
-- ==========================================
DROP FUNCTION IF EXISTS get_creator_picks();

CREATE OR REPLACE FUNCTION get_creator_picks()
RETURNS TABLE (
    id                  UUID,
    user_id             UUID,
    creator_name        TEXT,
    creator_handle      TEXT,
    creator_avatar_url  TEXT,
    content_follower    INTEGER,
    snus_id             INTEGER,
    custom_headline     TEXT,
    review_text         TEXT,
    rating_taste        NUMERIC,
    rating_smell        NUMERIC,
    rating_bite         NUMERIC,
    rating_drip         NUMERIC,
    rating_visuals      NUMERIC,
    rating_strength     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.id,
        cp.user_id,
        COALESCE(p.username, cp.creator_name) AS creator_name,
        COALESCE(p.creator_handle, cp.creator_handle) AS creator_handle,
        COALESCE(p.avatar_url, cp.creator_avatar_url) AS creator_avatar_url,
        cp.content_follower,
        cp.snus_id,
        cp.custom_headline,
        cp.review_text,
        cp.rating_taste,
        cp.rating_smell,
        cp.rating_bite,
        cp.rating_drip,
        cp.rating_visuals,
        cp.rating_strength
    FROM creator_picks cp
    LEFT JOIN profiles p ON p.id = cp.user_id
    WHERE cp.is_active = true
      -- Nur Picks der letzten 3 Tage
      AND cp.created_at >= (now() - INTERVAL '3 days')
    ORDER BY cp.content_follower DESC, cp.created_at DESC;
END;
$$;

-- ==========================================
-- 5. RPC: Creator Pick speichern/aktualisieren
-- ==========================================
DROP FUNCTION IF EXISTS upsert_creator_pick(INTEGER, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION upsert_creator_pick(
    p_snus_id           INTEGER,
    p_custom_headline   TEXT,
    p_review_text       TEXT,
    p_rating_taste      NUMERIC,
    p_rating_smell      NUMERIC,
    p_rating_bite       NUMERIC,
    p_rating_drip       NUMERIC,
    p_rating_visuals    NUMERIC,
    p_rating_strength   NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_profile   RECORD;
    v_pick_id   UUID;
BEGIN
    -- Nur is_creator = true User dürfen Picks erstellen
    SELECT username, creator_handle, avatar_url, content_follower
    INTO v_profile
    FROM profiles
    WHERE id = v_user_id AND is_creator = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User is not a creator' USING ERRCODE = 'AUTH01';
    END IF;

    -- Upsert: Bei erneutem Speichern wird created_at aktualisiert (3-Tage-Timer reset)
    INSERT INTO creator_picks (
        user_id, creator_name, creator_handle, creator_avatar_url, content_follower,
        snus_id, custom_headline, review_text,
        rating_taste, rating_smell, rating_bite, rating_drip, rating_visuals, rating_strength,
        is_active, created_at
    ) VALUES (
        v_user_id,
        COALESCE(v_profile.username, 'Creator'),
        v_profile.creator_handle,
        v_profile.avatar_url,
        COALESCE(v_profile.content_follower, 0),
        p_snus_id, p_custom_headline, p_review_text,
        p_rating_taste, p_rating_smell, p_rating_bite, p_rating_drip, p_rating_visuals, p_rating_strength,
        true, now()
    )
    ON CONFLICT ON CONSTRAINT creator_picks_user_snus_unique DO UPDATE SET
        custom_headline    = EXCLUDED.custom_headline,
        review_text        = EXCLUDED.review_text,
        rating_taste       = EXCLUDED.rating_taste,
        rating_smell       = EXCLUDED.rating_smell,
        rating_bite        = EXCLUDED.rating_bite,
        rating_drip        = EXCLUDED.rating_drip,
        rating_visuals     = EXCLUDED.rating_visuals,
        rating_strength    = EXCLUDED.rating_strength,
        creator_name       = EXCLUDED.creator_name,
        creator_handle     = EXCLUDED.creator_handle,
        creator_avatar_url = EXCLUDED.creator_avatar_url,
        content_follower   = EXCLUDED.content_follower,
        is_active          = true,
        created_at         = now()
    RETURNING id INTO v_pick_id;

    RETURN v_pick_id;
END;
$$;
