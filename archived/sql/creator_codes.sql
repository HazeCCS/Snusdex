-- ==========================================
-- SNUSDEX: CREATOR CODE SYSTEM
-- ==========================================
-- Führe dieses Script im Supabase SQL Editor aus.

-- 1. Creator-Codes Tabelle
-- Jede Reihe = ein einzigartiger Code mit optionalen Freischaltungen.
CREATE TABLE IF NOT EXISTS creator_codes (
    id                  UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    code                TEXT            NOT NULL UNIQUE,          -- Der Code den man eintippen muss (z.B. "HAZECCS")
    activates_animation TEXT            DEFAULT NULL,             -- Animation-ID die freigeschaltet wird (z.B. "wave"), NULL = keine
    activates_badge     TEXT            DEFAULT NULL,             -- Badge-ID (UUID) die freigeschaltet wird, NULL = keine
    credits             TEXT            DEFAULT NULL,             -- @Handle des Creators (z.B. "@hazeccs"), NULL = nicht angezeigt
    text                TEXT            DEFAULT NULL,             -- Freitext des Creators, NULL = nicht angezeigt
    created_at          TIMESTAMPTZ     DEFAULT now()
);

-- 2. Redemptions-Tabelle
-- Speichert welcher User welchen Code bereits eingelöst hat.
CREATE TABLE IF NOT EXISTS creator_code_redemptions (
    id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID            NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    code_id         UUID            NOT NULL REFERENCES creator_codes(id) ON DELETE CASCADE,
    redeemed_at     TIMESTAMPTZ     DEFAULT now()
);

-- 3. Row Level Security (RLS)
ALTER TABLE creator_codes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_code_redemptions    ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten User können Codes lesen (zum Validieren)
DROP POLICY IF EXISTS "creator_codes_auth_read" ON creator_codes;
CREATE POLICY "creator_codes_auth_read" ON creator_codes
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- User können nur ihre eigenen Redemptions lesen
DROP POLICY IF EXISTS "redemptions_own_read" ON creator_code_redemptions;
CREATE POLICY "redemptions_own_read" ON creator_code_redemptions
    FOR SELECT USING (auth.uid() = user_id);

-- User können ihre eigenen Redemptions einfügen
DROP POLICY IF EXISTS "redemptions_own_insert" ON creator_code_redemptions;
CREATE POLICY "redemptions_own_insert" ON creator_code_redemptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User können ihre eigenen Redemptions aktualisieren
DROP POLICY IF EXISTS "redemptions_own_update" ON creator_code_redemptions;
CREATE POLICY "redemptions_own_update" ON creator_code_redemptions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User können ihre eigenen Redemptions löschen
DROP POLICY IF EXISTS "redemptions_own_delete" ON creator_code_redemptions;
CREATE POLICY "redemptions_own_delete" ON creator_code_redemptions
    FOR DELETE USING (auth.uid() = user_id);



-- ==========================================
-- BEISPIEL-CODES EINFÜGEN
-- ==========================================
-- Passe die Werte nach deinen Wünschen an.
-- activates_animation: 'sweep' | 'pulse' | 'ripple' | 'gol' | 'firework' | 'wave' | 'mountains' | NULL
-- activates_badge: UUID eines Badges aus der badges-Tabelle | NULL
-- credits: '@creatorname' | NULL
-- text: Beliebiger Text des Creators | NULL

INSERT INTO creator_codes (code, activates_animation, activates_badge, credits, text) VALUES
    ('HAZECCS',     'mountains', NULL,                                   '@hazeccs',   'Thanks for using Snusdex! This exclusive animation is yours. 🏔️'),
    ('WAVECODE',    'wave',      NULL,                                   '@wavecreator', 'Enjoy the silk wave animation — made with love.'),
    ('SUPPORTER',   NULL,        'da77f766-3d23-41c3-ab0e-d716cf9bdf7b', '@snusdex',   'Thank you for your support! Your badge has been unlocked.')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- NEUEN CODE EINFÜGEN (Vorlage)
-- ==========================================
--
-- INSERT INTO creator_codes (code, activates_animation, activates_badge, credits, text) VALUES
--     ('MEINCODE', 'wave', NULL, '@meinname', 'Danke fürs Einlösen! Das ist mein persönlicher Code.');
--
-- Nur Animation (kein Badge, kein Text):
-- INSERT INTO creator_codes (code, activates_animation, activates_badge, credits, text) VALUES
--     ('ANIMONLY', 'firework', NULL, NULL, NULL);
--
-- Nur Badge (keine Animation, kein Creator-Text):
-- INSERT INTO creator_codes (code, activates_animation, activates_badge, credits, text) VALUES
--     ('BADGEONLY', NULL, 'UUID-DES-BADGES', '@creator', 'Du hast ein exklusives Badge freigeschaltet!');

-- ==========================================
-- CREATOR CODE COOLDOWN — PROFILES SPALTE & TRIGGERS
-- ==========================================
-- Analog zum Username-Änderungs-Cooldown (username_changes / username_last_reset)
-- wird der letzte Einlöse-Zeitpunkt direkt in der profiles-Tabelle gespeichert.
-- So ist der Cooldown geräteübergreifend und serverseitig verankert.
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS creator_code_last_redeemed TIMESTAMPTZ DEFAULT NULL;

-- ── 1. TRIGGER: Cooldown bei creator_code_redemptions prüfen & profiles updaten ──
CREATE OR REPLACE FUNCTION check_creator_code_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_redeemed TIMESTAMPTZ;
    cooldown_interval INTERVAL := INTERVAL '14 days';
BEGIN
    -- Hole den letzten Einlösezeitpunkt des Users
    SELECT creator_code_last_redeemed INTO last_redeemed
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Falls es ein UPDATE ist und sich der Code nicht geändert hat, überspringen
    IF TG_OP = 'UPDATE' AND OLD.code_id = NEW.code_id THEN
        RETURN NEW;
    END IF;

    -- Cooldown prüfen (falls vorhanden und innerhalb der letzten 14 Tage)
    IF last_redeemed IS NOT NULL AND (now() - last_redeemed) < cooldown_interval THEN
        RAISE EXCEPTION 'You can only change your creator code once every 14 days. Cooldown active.'
            USING ERRCODE = 'LMT01';
    END IF;

    -- Setze Umgehungs-Variable für das Profil-Update (gilt nur für die aktuelle Transaktion)
    PERFORM set_config('app.creator_code_bypass', 'true', true);

    -- Automatisch das Datum auf dem Profil aktualisieren
    UPDATE public.profiles
    SET creator_code_last_redeemed = now()
    WHERE id = NEW.user_id;

    -- Setze Umgehungs-Variable wieder zurück
    PERFORM set_config('app.creator_code_bypass', 'false', true);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_creator_code_cooldown ON creator_code_redemptions;
CREATE TRIGGER enforce_creator_code_cooldown
    BEFORE INSERT OR UPDATE ON creator_code_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION check_creator_code_cooldown();

-- ── 2. TRIGGER: profiles.creator_code_last_redeemed vor direktem API-Update schützen ──
CREATE OR REPLACE FUNCTION protect_profile_cooldown_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Wenn das Update direkt vom Client kommt (Variable ist nicht 'true') und versucht wird,
    -- creator_code_last_redeemed zu manipulieren, verwerfen wir diese Änderung.
    IF COALESCE(current_setting('app.creator_code_bypass', true), 'false') <> 'true' THEN
        IF NEW.creator_code_last_redeemed IS DISTINCT FROM OLD.creator_code_last_redeemed THEN
            NEW.creator_code_last_redeemed := OLD.creator_code_last_redeemed;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profiles_cooldown_protection ON profiles;
CREATE TRIGGER enforce_profiles_cooldown_protection
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_profile_cooldown_fields();


