/*
  # Fix Duplicate Policies

  1. Obriši stare policy-je
  2. Zadrži samo nove, pravilne policy-je
*/

-- Obriši stari policy
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Proveri da postoji is_current_user_admin funkcija
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;