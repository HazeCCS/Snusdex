-- 1. Create table public.user_ages (stores birthdate securely and privately)
CREATE TABLE IF NOT EXISTS public.user_ages (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    birthdate DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_ages ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for users to manage their own age data securely
DROP POLICY IF EXISTS "Users can view own age" ON public.user_ages;
CREATE POLICY "Users can view own age"
    ON public.user_ages
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own age" ON public.user_ages;
CREATE POLICY "Users can insert own age"
    ON public.user_ages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own age" ON public.user_ages;
CREATE POLICY "Users can update own age"
    ON public.user_ages
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Create trigger to automatically copy birthdate from auth.users metadata on email signup
CREATE OR REPLACE FUNCTION public.handle_new_user_age()
RETURNS trigger AS $$
BEGIN
    IF new.raw_user_meta_data->>'birthdate' IS NOT NULL THEN
        INSERT INTO public.user_ages (user_id, birthdate)
        VALUES (new.id, (new.raw_user_meta_data->>'birthdate')::DATE)
        ON CONFLICT (user_id) DO UPDATE
        SET birthdate = EXCLUDED.birthdate;
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Bind the trigger to auth.users (runs after insert)
DROP TRIGGER IF EXISTS on_auth_user_created_age ON auth.users;
CREATE TRIGGER on_auth_user_created_age
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_age();
