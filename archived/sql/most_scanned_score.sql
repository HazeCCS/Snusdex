-- =======================================================
-- Most Scanned (Last 7 Days) — Overall Score per Snus
-- =======================================================
-- The "Most Scanned" list in the Social tab now shows the
-- overall_score for each snus product. This score is computed
-- from the average of all ratings submitted across all users.
--
-- Step 1: Check which score column exists on snus_products
-- =======================================================
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'snus_products'
  AND column_name IN ('overall_score', 'avg_score', 'score');

-- Step 2 (optional): If no score column exists yet, add a
-- computed/materialized overall_score column.
-- This aggregates avg ratings from user_collections table.
-- =======================================================

-- Option A: Add a plain column that is manually refreshed
-- ALTER TABLE snus_products ADD COLUMN IF NOT EXISTS overall_score NUMERIC(4,2);

-- Option B: Use a view that joins with ratings (recommended — no schema change needed)
-- The app reads snus_products.* with .select('*'), so the most compatible approach
-- is to store a denormalized score. Run the following to populate it:

/*
-- Create overall_score column
ALTER TABLE snus_products
  ADD COLUMN IF NOT EXISTS overall_score NUMERIC(4,2);

-- Populate with current averages from user_collections
UPDATE snus_products sp
SET overall_score = sub.avg_score
FROM (
  SELECT
    snus_id,
    ROUND(
      (AVG(rating_visuals) + AVG(rating_smell) + AVG(rating_taste) + AVG(rating_bite) + AVG(rating_drip) + AVG(rating_strength)) / 6.0,
      2
    ) AS avg_score
  FROM user_collections
  WHERE rating_visuals IS NOT NULL
  GROUP BY snus_id
) sub
WHERE sp.id = sub.snus_id;
*/

-- =======================================================
-- Step 3: SQL query for Most Scanned (Last 7 Days) list
-- This is what the app does client-side, but can also be
-- done server-side via a Supabase RPC for better performance.
-- =======================================================
SELECT
  uc.snus_id,
  sp.name,
  sp.image,
  COUNT(*)::INT AS scan_count,
  ROUND(
    (AVG(uc.rating_visuals) + AVG(uc.rating_smell) + AVG(uc.rating_taste) + AVG(uc.rating_bite) + AVG(uc.rating_drip) + AVG(uc.rating_strength)) / 6.0,
    1
  ) AS overall_score
FROM user_collections uc
JOIN snus_products sp ON sp.id = uc.snus_id
WHERE uc.collected_at >= NOW() - INTERVAL '7 days'
GROUP BY uc.snus_id, sp.name, sp.image
ORDER BY scan_count DESC
LIMIT 7;

-- =======================================================
-- Optional: Create a Supabase RPC for the above query
-- =======================================================
/*
CREATE OR REPLACE FUNCTION get_most_scanned_last_7_days()
RETURNS TABLE (
  snus_id   INT,
  name      TEXT,
  image     TEXT,
  scan_count INT,
  overall_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    uc.snus_id,
    sp.name,
    sp.image,
    COUNT(*)::INT AS scan_count,
    ROUND(
      (AVG(uc.rating_visuals) + AVG(uc.rating_smell) + AVG(uc.rating_taste) + AVG(uc.rating_bite) + AVG(uc.rating_drip) + AVG(uc.rating_strength)) / 6.0,
      1
    ) AS overall_score
  FROM user_collections uc
  JOIN snus_products sp ON sp.id = uc.snus_id
  WHERE uc.collected_at >= NOW() - INTERVAL '7 days'
  GROUP BY uc.snus_id, sp.name, sp.image
  ORDER BY scan_count DESC
  LIMIT 7;
$$;
*/
