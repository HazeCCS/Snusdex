-- 1. Sicherstellen, dass User ihr eigenes Profil updaten können (RLS Policy für Update)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" 
            ON public.profiles 
            FOR UPDATE 
            USING (auth.uid() = id);
    END IF;
END
$$;

-- 2. Wenn der Name in auth.users noch existiert (z.B. user_metadata->>'username'), 
-- kopieren wir ihn sicherheitshalber rüber in die profiles Tabelle.
UPDATE public.profiles p
SET username = auth.users.raw_user_meta_data->>'username'
FROM auth.users
WHERE auth.users.id = p.id
AND auth.users.raw_user_meta_data->>'username' IS NOT NULL
AND auth.users.raw_user_meta_data->>'username' != '';

-- 3. Falls auth.users durch meinen alten Script überschrieben wurde, 
-- muss der Nutzer in der App einmal kurz den Namen neu in den Einstellungen speichern.
-- Durch die Policy (Schritt 1) wird das nun 100% in der Datenbank unter "profiles" ankommen!
