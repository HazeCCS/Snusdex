-- =======================================================
-- SNUSDEX: DAILY STREAK XP MILESTONE SYSTEM
-- =======================================================
-- Run this script in the Supabase SQL Editor.
-- It automatically awards XP to users when their daily streak count
-- matches predefined milestone days.
--
-- Milestones:
--   Tag 5  -> 50 XP
--   Tag 10 -> 75 XP
--   Tag 15 -> 100 XP
--   Tag 30 -> 200 XP
--   Tag 45 -> 200 XP
--   Tag 60 -> 500 XP
--   Tag > 60: Every 15 days -> 200 XP (e.g. 75, 90, 105...)

CREATE OR REPLACE FUNCTION check_streak_milestone_xp()
RETURNS TRIGGER AS $$
DECLARE
    xp_to_award INT := 0;
    streak INT;
BEGIN
    -- Check if streak_count has changed and increased
    IF (TG_OP = 'UPDATE') AND (NEW.streak_count > COALESCE(OLD.streak_count, 0)) THEN
        streak := NEW.streak_count;
        
        -- Determine XP to award
        IF streak = 5 THEN
            xp_to_award := 50;
        ELSIF streak = 10 THEN
            xp_to_award := 75;
        ELSIF streak = 15 THEN
            xp_to_award := 100;
        ELSIF streak = 30 THEN
            xp_to_award := 200;
        ELSIF streak = 45 THEN
            xp_to_award := 200;
        ELSIF streak = 60 THEN
            xp_to_award := 500;
        ELSIF streak > 60 AND (streak - 60) % 15 = 0 THEN
            xp_to_award := 200;
        END IF;

        -- Award the XP if a milestone was reached
        IF xp_to_award > 0 THEN
            NEW.badge_xp := COALESCE(NEW.badge_xp, 0) + xp_to_award;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists to allow safe re-runs
DROP TRIGGER IF EXISTS trigger_streak_milestone_xp ON public.profiles;

CREATE TRIGGER trigger_streak_milestone_xp
BEFORE UPDATE OF streak_count ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION check_streak_milestone_xp();
