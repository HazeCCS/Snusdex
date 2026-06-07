-- ====================================================================
-- Migration: Table for product suggestions when EAN/barcode is not found
-- Strategy: Save suggested name, nicotine content, barcode, and user_id
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.product_suggestions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    name text NOT NULL,
    nicotine numeric NOT NULL,
    barcode text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.product_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserting suggestions (any authenticated user can insert if their user_id matches their auth.uid())
DROP POLICY IF EXISTS "Users can insert own suggestions" ON public.product_suggestions;
CREATE POLICY "Users can insert own suggestions" ON public.product_suggestions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own suggestions
DROP POLICY IF EXISTS "Users can view own suggestions" ON public.product_suggestions;
CREATE POLICY "Users can view own suggestions" ON public.product_suggestions
    FOR SELECT USING (auth.uid() = user_id);
