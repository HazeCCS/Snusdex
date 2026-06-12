-- ====================================================================
-- Migration: Standort-Felder für user_collections (Regional Analytics)
-- Strategie: IP-Geolocation via Supabase Edge Function beim Eintragen
-- FIX: AVG() gibt double precision zurück, ROUND() braucht numeric-Cast
-- ====================================================================

-- 1. Standort-Spalten zur user_collections Tabelle hinzufügen
ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS country_code  text,        -- z.B. 'DE', 'AT', 'CH'
  ADD COLUMN IF NOT EXISTS country_name  text,        -- z.B. 'Germany'
  ADD COLUMN IF NOT EXISTS region        text,        -- z.B. 'Bavaria', 'Vienna'
  ADD COLUMN IF NOT EXISTS city          text,        -- z.B. 'Munich' (grob, nicht exakt)
  ADD COLUMN IF NOT EXISTS timezone      text;        -- z.B. 'Europe/Berlin'

-- 2. Index für schnelle Regional-Abfragen
CREATE INDEX IF NOT EXISTS idx_user_collections_country
  ON public.user_collections(country_code);

CREATE INDEX IF NOT EXISTS idx_user_collections_region
  ON public.user_collections(country_code, region);

-- ====================================================================
-- 3. View: Regional Analytics — Durchschnittsbewertungen pro Region
-- ====================================================================
CREATE OR REPLACE VIEW public.regional_analytics AS
SELECT
  country_code,
  country_name,
  region,
  COUNT(*)                                                          AS total_ratings,
  COUNT(DISTINCT user_id)                                           AS unique_raters,
  COUNT(DISTINCT snus_id)                                           AS unique_products,
  ROUND(AVG((
    COALESCE(rating_taste,    5) +
    COALESCE(rating_smell,    5) +
    COALESCE(rating_bite,     5) +
    COALESCE(rating_drip,     5) +
    COALESCE(rating_visuals,  5) +
    COALESCE(rating_strength, 5)
  ) / 6.0)::numeric, 2)                                            AS avg_overall_rating,
  ROUND(AVG(COALESCE(rating_taste,    5))::numeric, 2)              AS avg_taste,
  ROUND(AVG(COALESCE(rating_smell,    5))::numeric, 2)              AS avg_smell,
  ROUND(AVG(COALESCE(rating_bite,     5))::numeric, 2)              AS avg_bite,
  ROUND(AVG(COALESCE(rating_drip,     5))::numeric, 2)              AS avg_drip,
  ROUND(AVG(COALESCE(rating_visuals,  5))::numeric, 2)              AS avg_visuals,
  ROUND(AVG(COALESCE(rating_strength, 5))::numeric, 2)              AS avg_strength
FROM public.user_collections
WHERE country_code IS NOT NULL
  AND rating_taste  IS NOT NULL  -- nur echte Bewertungen, kein leerer Eintrag
GROUP BY country_code, country_name, region
ORDER BY total_ratings DESC;

-- ====================================================================
-- 4. View: Top-Produkte pro Land (für Country-Breakdown)
-- ====================================================================
CREATE OR REPLACE VIEW public.regional_top_products AS
SELECT
  uc.country_code,
  uc.country_name,
  uc.snus_id,
  COUNT(*)                                                          AS rating_count,
  ROUND(AVG((
    COALESCE(uc.rating_taste,    5) +
    COALESCE(uc.rating_smell,    5) +
    COALESCE(uc.rating_bite,     5) +
    COALESCE(uc.rating_drip,     5) +
    COALESCE(uc.rating_visuals,  5) +
    COALESCE(uc.rating_strength, 5)
  ) / 6.0)::numeric, 2)                                            AS avg_rating
FROM public.user_collections uc
WHERE uc.country_code IS NOT NULL
  AND uc.rating_taste IS NOT NULL
GROUP BY uc.country_code, uc.country_name, uc.snus_id
ORDER BY uc.country_code, avg_rating DESC;

-- ====================================================================
-- 5. RLS Policy — bestehende Policies greifen automatisch (selbe Tabelle)
-- ====================================================================
-- Kein zusätzlicher Aufwand nötig.
