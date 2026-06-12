-- =======================================================
-- SNUSDEX: FRIEND SYSTEM & BLOCKING MIGRATION
-- =======================================================

-- 1. Erstelle die Tabelle für Blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id          UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id  UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id  UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ     DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- Aktiviere Row Level Security (RLS)
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies für user_blocks
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can view blocks involving them" ON public.user_blocks;
CREATE POLICY "Users can view blocks involving them" ON public.user_blocks
    FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "Users can insert their own blocks" ON public.user_blocks;
CREATE POLICY "Users can insert their own blocks" ON public.user_blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete their own blocks" ON public.user_blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- 3. Trigger: Löscht jegliche Follow-Beziehungen bei einem Block
CREATE OR REPLACE FUNCTION public.handle_block_delete_follows()
RETURNS trigger AS $$
BEGIN
    DELETE FROM public.user_follows
    WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
       OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_handle_block_delete_follows ON public.user_blocks;
CREATE TRIGGER trigger_handle_block_delete_follows
    AFTER INSERT ON public.user_blocks
    FOR EACH ROW EXECUTE FUNCTION public.handle_block_delete_follows();

-- 4. Aktualisiere SELECT/INSERT Policies für user_follows
DROP POLICY IF EXISTS "Users can view their own follows" ON public.user_follows;
CREATE POLICY "Users can view their own follows" ON public.user_follows
    FOR SELECT USING (
        (auth.uid() = follower_id OR auth.uid() = following_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks
            WHERE (blocker_id = follower_id AND blocked_id = following_id)
               OR (blocker_id = following_id AND blocked_id = follower_id)
        )
    );

DROP POLICY IF EXISTS "Users can insert their own follows" ON public.user_follows;
CREATE POLICY "Users can insert their own follows" ON public.user_follows
    FOR INSERT WITH CHECK (
        auth.uid() = follower_id
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks
            WHERE (blocker_id = follower_id AND blocked_id = following_id)
               OR (blocker_id = following_id AND blocked_id = follower_id)
        )
    );

-- 5. Aktualisiere SELECT Policy für profiles
-- Ein Profil ist sichtbar, außer der Profilbesitzer hat den anfragenden User blockiert.
-- Der Profilbesitzer kann sein eigenes Profil immer sehen.
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        OR NOT EXISTS (
            SELECT 1 FROM public.user_blocks
            WHERE blocker_id = id AND blocked_id = auth.uid()
        )
    );

-- 6. Aktualisiere SELECT Policy für user_collections
-- Kollektionen eines Nutzers sind lesbar, außer dieser Nutzer hat den anfragenden User blockiert.
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_collections_select_policy" ON public.user_collections;
CREATE POLICY "user_collections_select_policy" ON public.user_collections
    FOR SELECT USING (
        user_id = auth.uid()
        OR NOT EXISTS (
            SELECT 1 FROM public.user_blocks
            WHERE blocker_id = user_id AND blocked_id = auth.uid()
        )
    );

-- 7. Aktualisiere SELECT Policy für daily_consumption (Heatmap)
-- Heatmap-Daten eines Nutzers sind lesbar, außer dieser Nutzer hat den anfragenden User blockiert.
DROP POLICY IF EXISTS "daily_consumption_own_read" ON public.daily_consumption;
DROP POLICY IF EXISTS "daily_consumption_select_policy" ON public.daily_consumption;
CREATE POLICY "daily_consumption_select_policy" ON public.daily_consumption
    FOR SELECT USING (
        user_id = auth.uid()
        OR NOT EXISTS (
            SELECT 1 FROM public.user_blocks
            WHERE blocker_id = user_id AND blocked_id = auth.uid()
        )
    );

-- 8. Aktualisiere SELECT Policy für user_badges
-- Badges eines Nutzers sind lesbar, außer dieser Nutzer hat den anfragenden User blockiert.
DROP POLICY IF EXISTS "user_badges_own_read" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_select_policy" ON public.user_badges;
CREATE POLICY "user_badges_select_policy" ON public.user_badges
    FOR SELECT USING (
        user_id = auth.uid()
        OR NOT EXISTS (
            SELECT 1 FROM public.user_blocks
            WHERE blocker_id = user_id AND blocked_id = auth.uid()
        )
    );

-- User können ihre eigenen user_badges löschen
DROP POLICY IF EXISTS "user_badges_own_delete" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_delete_policy" ON public.user_badges;
CREATE POLICY "user_badges_delete_policy" ON public.user_badges
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Add featured_badge_id column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS featured_badge_id UUID;

