-- 1. Aktualisiere sofort alle bestehenden Profile mit dem echten aktuellen XP-Wert (Anzahl Dosen * 100)
UPDATE public.profiles p
SET xp = COALESCE(
    (SELECT count(*) * 100 FROM public.user_collections uc WHERE uc.user_id = p.id), 
    0
);

-- 2. Erstelle eine Trigger-Funktion, die bei jedem Hinzufügen oder Entfernen einer Dose das Profil updatet
CREATE OR REPLACE FUNCTION public.update_profile_xp()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.profiles 
        SET xp = (SELECT count(*) * 100 FROM public.user_collections WHERE user_id = NEW.user_id)
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.profiles 
        SET xp = (SELECT count(*) * 100 FROM public.user_collections WHERE user_id = OLD.user_id)
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Entferne den alten Trigger (falls er existierte), um Konflikte zu vermeiden
DROP TRIGGER IF EXISTS trigger_update_profile_xp ON public.user_collections;

-- 4. Erstelle den Trigger neu, der bei jeder Änderung in 'user_collections' auslöst
CREATE TRIGGER trigger_update_profile_xp
AFTER INSERT OR DELETE ON public.user_collections
FOR EACH ROW EXECUTE FUNCTION public.update_profile_xp();
