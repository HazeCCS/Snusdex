-- 1. Aktualisiere leere Usernames in 'profiles' mit Daten aus 'auth.users' (falls jemand nur in Auth einen Namen hat)
UPDATE public.profiles p
SET username = COALESCE(
    auth.users.raw_user_meta_data->>'username',
    auth.users.raw_user_meta_data->>'display_name',
    auth.users.raw_user_meta_data->>'full_name'
)
FROM auth.users
WHERE auth.users.id = p.id
AND (p.username IS NULL OR p.username = '');

-- 2. Synchronisiere die Auth-Metadaten ('auth.users') mit den korrekten Namen aus 'profiles'
UPDATE auth.users
SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'username', p.username, 
        'display_name', p.username
    )
FROM public.profiles p
WHERE auth.users.id = p.id
AND p.username IS NOT NULL
AND p.username != '';

-- (Optional) Sicherstellen, dass die Suchfunktion in Zukunft schnell bleibt, indem der Index auf username erneuert wird
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
