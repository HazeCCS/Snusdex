-- Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
    token text PRIMARY KEY,
    platform text NOT NULL DEFAULT 'ios',
    bundle_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create push_notifications table
CREATE TABLE IF NOT EXISTS public.push_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    body text NOT NULL,
    recipients integer NOT NULL DEFAULT 0,
    sent integer NOT NULL DEFAULT 0,
    failed integer NOT NULL DEFAULT 0,
    pruned integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    sent_at timestamp with time zone
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for push_tokens
-- Allow anyone to insert or update tokens (so the app can register its token)
CREATE POLICY "Allow anyone to insert tokens" ON public.push_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anyone to update tokens" ON public.push_tokens
    FOR UPDATE USING (true) WITH CHECK (true);

-- Allow only the admin to view or delete tokens
CREATE POLICY "Allow admin to select tokens" ON public.push_tokens
    FOR SELECT USING (auth.jwt() ->> 'email' = 'tarayannorman@gmail.com');

CREATE POLICY "Allow admin to delete tokens" ON public.push_tokens
    FOR DELETE USING (auth.jwt() ->> 'email' = 'tarayannorman@gmail.com');

-- Policies for push_notifications
-- Allow only the admin to select, insert, or update push notifications
CREATE POLICY "Allow admin to select notifications" ON public.push_notifications
    FOR SELECT USING (auth.jwt() ->> 'email' = 'tarayannorman@gmail.com');

CREATE POLICY "Allow admin to insert notifications" ON public.push_notifications
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'tarayannorman@gmail.com');

CREATE POLICY "Allow admin to update notifications" ON public.push_notifications
    FOR UPDATE USING (auth.jwt() ->> 'email' = 'tarayannorman@gmail.com');
