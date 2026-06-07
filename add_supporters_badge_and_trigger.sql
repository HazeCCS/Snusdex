-- ====================================================================
-- Migration: Add Supporters Badge and Trigger for rewarding suggestors
-- ====================================================================

-- 1. Insert the "Supporter" badge
-- Uses 'BadgeCollector10.png' as placeholder image and category 'supporter'
INSERT INTO public.badges (id, name, description, image_url, category, level, required_count)
VALUES (
    'da77f766-3d23-41c3-ab0e-d716cf9bdf7b',
    'Supporter',
    'Vielen Dank für deine Hilfe am Snusdex-Projekt!',
    'BadgeCollector10.png',
    'supporter',
    1,
    1
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    category = EXCLUDED.category;

-- 2. Add rewarded column to product_suggestions if it doesn't exist
ALTER TABLE public.product_suggestions ADD COLUMN IF NOT EXISTS rewarded BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. Create the reward trigger function
CREATE OR REPLACE FUNCTION public.reward_product_suggestion_submitter()
RETURNS TRIGGER AS $$
DECLARE
    suggestion RECORD;
BEGIN
    IF NEW.barcode IS NOT NULL THEN
        -- Find any unresolved suggestions for the newly added barcode
        FOR suggestion IN 
            SELECT id, user_id 
            FROM public.product_suggestions 
            WHERE barcode = NEW.barcode AND user_id IS NOT NULL AND rewarded = FALSE
        LOOP
            -- Award Supporter badge to user
            INSERT INTO public.user_badges (user_id, badge_id)
            VALUES (suggestion.user_id, 'da77f766-3d23-41c3-ab0e-d716cf9bdf7b')
            ON CONFLICT (user_id, badge_id) DO NOTHING;

            -- Increment user XP by 1000
            PERFORM public.increment_badge_xp(suggestion.user_id, 1000);

            -- Mark suggestion as rewarded
            UPDATE public.product_suggestions 
            SET rewarded = TRUE 
            WHERE id = suggestion.id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on snus_products table
DROP TRIGGER IF EXISTS trigger_reward_product_suggestion_submitter ON public.snus_products;
CREATE TRIGGER trigger_reward_product_suggestion_submitter
AFTER INSERT ON public.snus_products
FOR EACH ROW
EXECUTE FUNCTION public.reward_product_suggestion_submitter();
