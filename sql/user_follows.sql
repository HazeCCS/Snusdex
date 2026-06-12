-- Löscht die alte Tabelle falls sie falsche Foreign Keys hatte
DROP TABLE IF EXISTS public.user_follows CASCADE;

-- Erstellt die neue user_follows Tabelle
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_status ON public.user_follows(status);

-- RLS Policies für Sicherheit (optional, aber empfohlen)
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows" 
    ON public.user_follows 
    FOR SELECT 
    USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can insert their own follows" 
    ON public.user_follows 
    FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own received follows" 
    ON public.user_follows 
    FOR UPDATE 
    USING (auth.uid() = following_id);

CREATE POLICY "Users can delete their own follows" 
    ON public.user_follows 
    FOR DELETE 
    USING (auth.uid() = follower_id OR auth.uid() = following_id);
