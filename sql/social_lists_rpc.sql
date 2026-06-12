-- =======================================================
-- RPC: get_social_list_stats (ÜBERARBEITET)
-- 
-- Korrekte Logik:
--   most_scanned_7d    → Einträge in user_collections der letzten 7 Tage,
--                        jeder Eintrag = 1 Scan, sortiert nach Anzahl DESC
--   most_scanned_today → Einträge in user_collections von heute,
--                        jeder Eintrag = 1 Scan, sortiert nach Anzahl DESC
--   top_rated_all_time → ALLE Bewertungen aller Zeiten, bei denen mind. 1
--                        Rating-Feld gesetzt ist, sortiert nach Durchschnitt DESC
--
-- Ratings werden IMMER aus allen Zeiträumen gejoint (global average),
-- damit der Score auch bei Most-Scanned-Listen akkurat ist.
-- =======================================================

CREATE OR REPLACE FUNCTION get_social_list_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(

    -- ─────────────────────────────────────────────
    -- MOST SCANNED — LETZTE 7 TAGE
    -- Zählt, wie oft eine Dose in den letzten 7 Tagen
    -- in eine Sammlung aufgenommen wurde (= Scan-Ereignis).
    -- Score kommt aus dem ALL-TIME-Durchschnitt der Ratings.
    -- ─────────────────────────────────────────────
    'most_scanned_7d', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          scans.snus_id,
          scans.scan_count,
          ROUND(AVG(uc2.rating_visuals), 1)  AS visuals,
          ROUND(AVG(uc2.rating_smell),   1)  AS smell,
          ROUND(AVG(uc2.rating_taste),   1)  AS taste,
          ROUND(AVG(uc2.rating_bite),    1)  AS bite,
          ROUND(AVG(uc2.rating_drip),    1)  AS drip,
          ROUND(AVG(uc2.rating_strength),1)  AS strength,
          ROUND(
            (AVG(uc2.rating_visuals) + AVG(uc2.rating_smell) + AVG(uc2.rating_taste)
             + AVG(uc2.rating_bite) + AVG(uc2.rating_drip) + AVG(uc2.rating_strength)) / 6.0,
            1
          ) AS score
        FROM (
          SELECT snus_id, COUNT(*)::INT AS scan_count
          FROM user_collections
          WHERE collected_at >= NOW() - INTERVAL '7 days'
          GROUP BY snus_id
          ORDER BY scan_count DESC
          LIMIT 7
        ) scans
        LEFT JOIN user_collections uc2
          ON uc2.snus_id = scans.snus_id
          AND uc2.rating_visuals IS NOT NULL
        GROUP BY scans.snus_id, scans.scan_count
        ORDER BY scans.scan_count DESC
      ) t
    ),

    -- ─────────────────────────────────────────────
    -- MOST SCANNED — HEUTE
    -- Zählt, wie oft eine Dose heute gesammelt wurde.
    -- Score kommt aus dem ALL-TIME-Durchschnitt.
    -- ─────────────────────────────────────────────
    'most_scanned_today', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          scans.snus_id,
          scans.scan_count,
          ROUND(AVG(uc2.rating_visuals), 1)  AS visuals,
          ROUND(AVG(uc2.rating_smell),   1)  AS smell,
          ROUND(AVG(uc2.rating_taste),   1)  AS taste,
          ROUND(AVG(uc2.rating_bite),    1)  AS bite,
          ROUND(AVG(uc2.rating_drip),    1)  AS drip,
          ROUND(AVG(uc2.rating_strength),1)  AS strength,
          ROUND(
            (AVG(uc2.rating_visuals) + AVG(uc2.rating_smell) + AVG(uc2.rating_taste)
             + AVG(uc2.rating_bite) + AVG(uc2.rating_drip) + AVG(uc2.rating_strength)) / 6.0,
            1
          ) AS score
        FROM (
          SELECT snus_id, COUNT(*)::INT AS scan_count
          FROM user_collections
          WHERE collected_at >= CURRENT_DATE
            AND collected_at < CURRENT_DATE + INTERVAL '1 day'
          GROUP BY snus_id
          ORDER BY scan_count DESC
          LIMIT 7
        ) scans
        LEFT JOIN user_collections uc2
          ON uc2.snus_id = scans.snus_id
          AND uc2.rating_visuals IS NOT NULL
        GROUP BY scans.snus_id, scans.scan_count
        ORDER BY scans.scan_count DESC
      ) t
    ),

    -- ─────────────────────────────────────────────
    -- TOP RATED — ALL TIME
    -- Alle Ratings aller Zeiten, mind. 1 Rating gesetzt.
    -- Sortiert nach Durchschnittsscore DESC.
    -- Kein Zeitfilter → wirklich "All Time".
    -- ─────────────────────────────────────────────
    'top_rated_all_time', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          snus_id,
          COUNT(*)::INT AS rating_count,
          ROUND(AVG(rating_visuals), 1)  AS visuals,
          ROUND(AVG(rating_smell),   1)  AS smell,
          ROUND(AVG(rating_taste),   1)  AS taste,
          ROUND(AVG(rating_bite),    1)  AS bite,
          ROUND(AVG(rating_drip),    1)  AS drip,
          ROUND(AVG(rating_strength),1)  AS strength,
          ROUND(
            (AVG(rating_visuals) + AVG(rating_smell) + AVG(rating_taste)
             + AVG(rating_bite) + AVG(rating_drip) + AVG(rating_strength)) / 6.0,
            1
          ) AS score
        FROM user_collections
        WHERE rating_visuals IS NOT NULL
        GROUP BY snus_id
        HAVING COUNT(*) >= 1
        ORDER BY score DESC
        LIMIT 7
      ) t
    )

  );
$$;
