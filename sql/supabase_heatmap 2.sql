-- ==========================================
-- SNUSDEX: DAILY CONSUMPTION HEATMAP MIGRATION
-- ==========================================

-- 1. Daily Consumption Tabelle
CREATE TABLE IF NOT EXISTS daily_consumption (
    id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date            DATE            NOT NULL DEFAULT CURRENT_DATE,
    pouches_taken   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     DEFAULT now(),
    UNIQUE(user_id, date)
);

-- 2. Row Level Security (RLS)
ALTER TABLE daily_consumption ENABLE ROW LEVEL SECURITY;

-- User können nur ihre eigenen Einträge lesen
CREATE POLICY "daily_consumption_own_read" ON daily_consumption
    FOR SELECT USING (auth.uid() = user_id);

-- User können nur ihre eigenen Einträge bearbeiten/einfügen
CREATE POLICY "daily_consumption_own_insert" ON daily_consumption
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_consumption_own_update" ON daily_consumption
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Hilfsfunktion für Upsert (sicher und einfach)
CREATE OR REPLACE FUNCTION increment_daily_consumption(uid UUID, target_date DATE, amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO daily_consumption (user_id, date, pouches_taken)
    VALUES (uid, target_date, amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET pouches_taken = daily_consumption.pouches_taken + EXCLUDED.pouches_taken;
END;
$$;
