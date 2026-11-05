-- ========================================================
-- SNUSDEX: ENABLE PUBLIC SELECT FOR PRODUCTS AND USAGE LOGS
-- ========================================================
-- Execute this script in your Supabase SQL Editor to allow
-- the Snusdex Insights dashboard to read products and usage logs.

-- 1. Enable public read access to snus_products
ALTER TABLE public.snus_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snus_products_public_read" ON public.snus_products;
CREATE POLICY "snus_products_public_read" ON public.snus_products
    FOR SELECT USING (true);

-- 2. Enable public read access to usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_logs_public_read" ON public.usage_logs;
CREATE POLICY "usage_logs_public_read" ON public.usage_logs
    FOR SELECT USING (true);
