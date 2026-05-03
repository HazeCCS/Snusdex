-- =======================================================
-- RPC: get_social_list_stats
-- Gibt die aggregierten Listen für "Most Scanned" und "Top Rated"
-- der letzten 7 Tage sowie "Heute" zurück.
-- Führt SECURITY DEFINER aus, damit es RLS (Row Level Security) umgeht 
-- und die Daten ALLER User aggregieren kann.
-- =======================================================

CREATE OR REPLACE FUNCTION get_social_list_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'most_scanned_7d', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          snus_id,
          COUNT(*)::INT AS scan_count,
          ROUND(AVG(rating_visuals), 1) AS visuals,
          ROUND(AVG(rating_smell), 1) AS smell,
          ROUND(AVG(rating_taste), 1) AS taste,
          ROUND(AVG(rating_bite), 1) AS bite,
          ROUND(AVG(rating_drip), 1) AS drip,
          ROUND(AVG(rating_strength), 1) AS strength,
          ROUND((AVG(rating_visuals) + AVG(rating_smell) + AVG(rating_taste) + AVG(rating_bite) + AVG(rating_drip) + AVG(rating_strength)) / 6.0, 1) AS score
        FROM user_collections
        WHERE collected_at >= NOW() - INTERVAL '7 days'
        GROUP BY snus_id
        ORDER BY scan_count DESC
        LIMIT 7
      ) t
    ),
    'most_scanned_today', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          snus_id,
          COUNT(*)::INT AS scan_count,
          ROUND(AVG(rating_visuals), 1) AS visuals,
          ROUND(AVG(rating_smell), 1) AS smell,
          ROUND(AVG(rating_taste), 1) AS taste,
          ROUND(AVG(rating_bite), 1) AS bite,
          ROUND(AVG(rating_drip), 1) AS drip,
          ROUND(AVG(rating_strength), 1) AS strength,
          ROUND((AVG(rating_visuals) + AVG(rating_smell) + AVG(rating_taste) + AVG(rating_bite) + AVG(rating_drip) + AVG(rating_strength)) / 6.0, 1) AS score
        FROM user_collections
        WHERE collected_at >= CURRENT_DATE
        GROUP BY snus_id
        ORDER BY scan_count DESC
        LIMIT 7
      ) t
    ),
    'top_rated_7d', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT 
          snus_id,
          COUNT(*)::INT AS rating_count,
          ROUND(AVG(rating_visuals), 1) AS visuals,
          ROUND(AVG(rating_smell), 1) AS smell,
          ROUND(AVG(rating_taste), 1) AS taste,
          ROUND(AVG(rating_bite), 1) AS bite,
          ROUND(AVG(rating_drip), 1) AS drip,
          ROUND(AVG(rating_strength), 1) AS strength,
          ROUND((AVG(rating_visuals) + AVG(rating_smell) + AVG(rating_taste) + AVG(rating_bite) + AVG(rating_drip) + AVG(rating_strength)) / 6.0, 1) AS score
        FROM user_collections
        WHERE rating_visuals IS NOT NULL 
          AND collected_at >= NOW() - INTERVAL '7 days'
        GROUP BY snus_id
        HAVING COUNT(*) >= 1
        ORDER BY score DESC
        LIMIT 7
      ) t
    )
  );
$$;
