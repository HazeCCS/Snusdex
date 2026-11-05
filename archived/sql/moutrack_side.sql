-- ========================================================
-- SNUSDEX: MOUTRACK SIDE COUNTS
-- ========================================================
-- Tracks how often each user places a pouch in each MouTrack position per day.

CREATE TABLE IF NOT EXISTS public.moutrack_side (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,
    side TEXT NOT NULL CHECK (side IN ('topLeft', 'topRight', 'bottomLeft', 'bottomRight')),
    times_used INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, tracked_date, side)
);

CREATE INDEX IF NOT EXISTS moutrack_side_user_date_idx
    ON public.moutrack_side (user_id, tracked_date DESC);

ALTER TABLE public.moutrack_side ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moutrack_side_select_own" ON public.moutrack_side;
CREATE POLICY "moutrack_side_select_own" ON public.moutrack_side
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "moutrack_side_insert_own" ON public.moutrack_side;
CREATE POLICY "moutrack_side_insert_own" ON public.moutrack_side
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "moutrack_side_update_own" ON public.moutrack_side;
CREATE POLICY "moutrack_side_update_own" ON public.moutrack_side
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "moutrack_side_delete_own" ON public.moutrack_side;
CREATE POLICY "moutrack_side_delete_own" ON public.moutrack_side
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_moutrack_side_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_moutrack_side_updated_at ON public.moutrack_side;
CREATE TRIGGER set_moutrack_side_updated_at
    BEFORE UPDATE ON public.moutrack_side
    FOR EACH ROW
    EXECUTE FUNCTION public.set_moutrack_side_updated_at();

CREATE OR REPLACE FUNCTION public.increment_moutrack_side(
    p_side TEXT,
    p_tracked_date DATE DEFAULT CURRENT_DATE,
    p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_date DATE := COALESCE(p_tracked_date, CURRENT_DATE);
    v_amount INTEGER := COALESCE(p_amount, 1);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_side NOT IN ('topLeft', 'topRight', 'bottomLeft', 'bottomRight') THEN
        RAISE EXCEPTION 'Invalid MouTrack side';
    END IF;

    IF v_amount = 0 THEN
        RETURN;
    END IF;

    IF v_amount NOT BETWEEN -1 AND 1 THEN
        RAISE EXCEPTION 'Invalid MouTrack amount';
    END IF;

    INSERT INTO public.moutrack_side (user_id, tracked_date, side, times_used)
    VALUES (v_user_id, v_date, p_side, GREATEST(0, v_amount))
    ON CONFLICT (user_id, tracked_date, side)
    DO UPDATE SET
        times_used = GREATEST(0, public.moutrack_side.times_used + v_amount),
        updated_at = NOW();

    DELETE FROM public.moutrack_side
    WHERE user_id = v_user_id
      AND tracked_date = v_date
      AND side = p_side
      AND times_used = 0;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
