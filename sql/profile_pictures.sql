-- 1. Ensure public.profiles table has avatar_url column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create the 'avatars' storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Row Level Security (RLS) policies for the 'avatars' bucket
-- Note: Supabase Storage stores records in the storage.objects table.

-- Remove any conflicting policies if they already exist
DROP POLICY IF EXISTS "Allow public read access on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated user insert on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated user update on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated user delete on avatars" ON storage.objects;

-- Policy to allow anyone to read files from the avatars bucket
CREATE POLICY "Allow public read access on avatars" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- Policy to allow authenticated users to upload their own avatar
-- We enforce that the file name starts with the user's ID
CREATE POLICY "Allow authenticated user insert on avatars" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (left(name, 36) = auth.uid()::text)
    );

-- Policy to allow authenticated users to update their own avatar
CREATE POLICY "Allow authenticated user update on avatars" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (left(name, 36) = auth.uid()::text)
    );

-- Policy to allow authenticated users to delete their own avatar
CREATE POLICY "Allow authenticated user delete on avatars" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (left(name, 36) = auth.uid()::text)
    );
