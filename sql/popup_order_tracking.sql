-- ===========================================================
-- SNUSDEX — POPUP ORDER & FAVORITEN TRACKING
-- ===========================================================
-- Stand: 2026-06-08
--
-- HINTERGRUND:
--   Derzeit werden Favoriten NUR im localStorage gespeichert
--   (Key: "dexFavoriteSnus") und Order-Klicks gar nicht
--   getrackt. Diese Migration fügt zwei neue Tabellen ein:
--
--   1. snus_order_clicks  — wer hat aus dem PopUp heraus
--                           die Order-Seite eines Snus geöffnet?
--   2. snus_favorites     — wer hat welchen Snus als Favorit
--                           gespeichert? (cloud-persisted)
--
-- ===========================================================


-- ===========================================================
-- SCHRITT 1: TABELLEN ANLEGEN
-- ===========================================================

-- 1a) Order-Klick-Tracking
--     Jeder Datensatz = ein Klick auf "Bestellen" im PopUp.
CREATE TABLE IF NOT EXISTS public.snus_order_clicks (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    snus_id     INT         NOT NULL REFERENCES public.snus_products(id) ON DELETE CASCADE,
    clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source      TEXT        DEFAULT 'popup'   -- 'popup' | 'scanner_result' | 'profile' etc.
);

-- Index für schnelle Aggregationen pro Snus + Zeit
CREATE INDEX IF NOT EXISTS idx_order_clicks_snus_time
    ON public.snus_order_clicks (snus_id, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_clicks_user
    ON public.snus_order_clicks (user_id);

-- 1b) Favoriten-Tabelle (Cloud-Sync, ersetzt/ergänzt localStorage)
--     user_id + snus_id = UNIQUE → kein Duplikat möglich
CREATE TABLE IF NOT EXISTS public.snus_favorites (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snus_id     INT         NOT NULL REFERENCES public.snus_products(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, snus_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user
    ON public.snus_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_snus
    ON public.snus_favorites (snus_id);


-- ===========================================================
-- SCHRITT 2: ROW LEVEL SECURITY (RLS)
-- ===========================================================

-- Order-Klicks: Jeder kann seinen eigenen Eintrag lesen.
--               Admins/Service-Role können alles sehen.
ALTER TABLE public.snus_order_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_clicks_insert_own"
    ON public.snus_order_clicks FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "order_clicks_select_own"
    ON public.snus_order_clicks FOR SELECT
    USING (auth.uid() = user_id);

-- Favoriten: Nur eigene Einträge lesen/schreiben
ALTER TABLE public.snus_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_all_own"
    ON public.snus_favorites FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ===========================================================
-- SCHRITT 3: ANALYTICS QUERIES
-- ===========================================================

-- -----------------------------------------------------------
-- A) Welche UIDs haben aus dem PopUp heraus
--    die Order-Seite eines Snus geöffnet?
-- -----------------------------------------------------------

-- A1) Alle Order-Klicks mit User + Snus-Info (detaillierte Liste)
SELECT
    oc.id                                   AS click_id,
    oc.clicked_at,
    oc.source,
    oc.user_id,
    pr.username,
    oc.snus_id,
    sp.name                                 AS snus_name,
    sp.brand                                AS snus_brand
FROM public.snus_order_clicks oc
LEFT JOIN public.profiles        pr ON pr.id = oc.user_id
LEFT JOIN public.snus_products   sp ON sp.id = oc.snus_id
ORDER BY oc.clicked_at DESC
LIMIT 200;


-- A2) Wie viele Klicks pro Snus (letzten 30 Tage)?
--     → zeigt welche Produkte am meisten "Kaufinteresse" wecken
SELECT
    oc.snus_id,
    sp.name                             AS snus_name,
    sp.brand,
    COUNT(*)                            AS order_click_count,
    COUNT(DISTINCT oc.user_id)          AS unique_users
FROM public.snus_order_clicks oc
JOIN public.snus_products sp ON sp.id = oc.snus_id
WHERE oc.clicked_at >= NOW() - INTERVAL '30 days'
GROUP BY oc.snus_id, sp.name, sp.brand
ORDER BY order_click_count DESC;


-- A3) Conversion-Rate: Wer hat einen Snus gesammelt (unlock)
--     UND danach den Order-Button geklickt?
--     → echte Kaufabsicht nach dem Scan
SELECT
    oc.user_id,
    pr.username,
    oc.snus_id,
    sp.name                             AS snus_name,
    uc.collected_at                     AS scanned_at,
    oc.clicked_at                       AS order_clicked_at,
    oc.clicked_at - uc.collected_at     AS time_to_order_click
FROM public.snus_order_clicks oc
JOIN public.user_collections  uc ON uc.user_id  = oc.user_id
                                 AND uc.snus_id  = oc.snus_id
JOIN public.snus_products     sp ON sp.id        = oc.snus_id
LEFT JOIN public.profiles     pr ON pr.id        = oc.user_id
WHERE oc.clicked_at >= uc.collected_at   -- Klick nach dem Scan
ORDER BY oc.clicked_at DESC;


-- A4) Welche UIDs haben auf "Bestellen" geklickt, das Produkt
--     aber noch NICHT in ihrer Sammlung?
--     → potenzielle Neukunden / nicht-collector-Interesse
SELECT DISTINCT
    oc.user_id,
    pr.username,
    oc.snus_id,
    sp.name                             AS snus_name,
    sp.brand,
    COUNT(*) OVER (PARTITION BY oc.user_id, oc.snus_id) AS clicks_on_this_snus
FROM public.snus_order_clicks oc
JOIN public.snus_products   sp ON sp.id = oc.snus_id
LEFT JOIN public.profiles   pr ON pr.id = oc.user_id
WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_collections uc
    WHERE uc.user_id = oc.user_id
      AND uc.snus_id = oc.snus_id
)
ORDER BY clicks_on_this_snus DESC;


-- -----------------------------------------------------------
-- B) Welche UIDs haben welchen Snus als Favorit gespeichert?
-- -----------------------------------------------------------

-- B1) Alle Favoriten mit User- und Snus-Info (detaillierte Liste)
SELECT
    fv.id,
    fv.created_at,
    fv.user_id,
    pr.username,
    fv.snus_id,
    sp.name                             AS snus_name,
    sp.brand
FROM public.snus_favorites fv
LEFT JOIN public.profiles      pr ON pr.id = fv.user_id
LEFT JOIN public.snus_products sp ON sp.id = fv.snus_id
ORDER BY fv.created_at DESC
LIMIT 200;


-- B2) Top-Favoriten — welche Snus werden am häufigsten favorisiert?
SELECT
    fv.snus_id,
    sp.name                             AS snus_name,
    sp.brand,
    sp.rarity,
    COUNT(*)                            AS favorite_count,
    COUNT(DISTINCT fv.user_id)          AS unique_users
FROM public.snus_favorites fv
JOIN public.snus_products sp ON sp.id = fv.snus_id
GROUP BY fv.snus_id, sp.name, sp.brand, sp.rarity
ORDER BY favorite_count DESC
LIMIT 25;


-- B3) User mit den meisten Favoriten (Top-Collector-Engagement)
SELECT
    fv.user_id,
    pr.username,
    COUNT(*)                            AS total_favorites
FROM public.snus_favorites fv
LEFT JOIN public.profiles pr ON pr.id = fv.user_id
GROUP BY fv.user_id, pr.username
ORDER BY total_favorites DESC
LIMIT 25;


-- B4) Schnittmenge: UIDs die einen Snus favorisiert haben
--     UND die Order-Seite geöffnet haben
--     → höchstes Conversion-Potenzial
SELECT
    fv.user_id,
    pr.username,
    fv.snus_id,
    sp.name                             AS snus_name,
    fv.created_at                       AS favorited_at,
    MIN(oc.clicked_at)                  AS first_order_click
FROM public.snus_favorites fv
JOIN public.snus_order_clicks oc ON oc.user_id = fv.user_id
                                 AND oc.snus_id = fv.snus_id
JOIN public.snus_products    sp ON sp.id = fv.snus_id
LEFT JOIN public.profiles    pr ON pr.id = fv.user_id
GROUP BY fv.user_id, pr.username, fv.snus_id, sp.name, fv.created_at
ORDER BY first_order_click DESC;


-- ===========================================================
-- SCHRITT 4: JS-INTEGRATION — was im Frontend ergänzt werden muss
-- ===========================================================
/*
  4a) ORDER-KLICK TRACKEN  (in der openSnusDetail() Funktion oder
      beim onclick des "Bestellen"-Buttons im PopUp einfügen):

  async function trackOrderClick(snusId) {
      try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          await supabaseClient.from('snus_order_clicks').insert({
              user_id:  user?.id ?? null,
              snus_id:  snusId,
              source:   'popup'
          });
      } catch (e) {
          console.warn('Order-Click tracking failed (non-blocking):', e);
      }
  }

  // Beispiel: Bestell-Button im Modal
  // onclick="trackOrderClick(currentSelectedSnusId); window.open(snus.order_url, '_blank')"


  4b) FAVORIT HINZUFÜGEN/ENTFERNEN (Supabase-Sync, ersetzt localStorage):

  async function toggleFavoriteSnus(snusId) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
          // Fallback: localStorage (nicht eingeloggt)
          // ... bestehende Logik ...
          return;
      }

      const isFav = window.isFavoriteSnus(snusId);
      if (isFav) {
          await supabaseClient.from('snus_favorites')
              .delete()
              .eq('user_id', user.id)
              .eq('snus_id', snusId);
      } else {
          await supabaseClient.from('snus_favorites')
              .insert({ user_id: user.id, snus_id: snusId });
      }

      // localStorage Sync beibehalten für Offline-Nutzung
      const list = JSON.parse(localStorage.getItem('dexFavoriteSnus') || '[]');
      if (isFav) {
          localStorage.setItem('dexFavoriteSnus',
              JSON.stringify(list.filter(id => id !== snusId)));
      } else {
          list.push(snusId);
          localStorage.setItem('dexFavoriteSnus', JSON.stringify(list));
      }

      window.updateModalFavoriteBtnUI(snusId);
      if (typeof filterDex === 'function') filterDex();
  }
*/
