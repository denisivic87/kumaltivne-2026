/*
  # Fix RLS Policies - Remove Circular Dependencies

  1. Simplifikuj SELECT policy da ne koristi funkciju
  2. Dodaj STABLE flag na funkciju
*/

-- Obriši sve postojeće SELECT policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own data or admin can view all" ON public.users;

-- Kreiraj jednostavan SELECT policy koji dozvoljava korisnicima da vide svoj nalog
-- Admin će moći da vidi sve kroz direktan upit, ali ovo omogućava osnovni pristup
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Kreiraj poseban SELECT policy za admins koji koristi subquery umesto funkcije
CREATE POLICY "Admins can read all profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_check
      WHERE admin_check.auth_user_id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );

-- Ažuriraj funkciju da bude STABLE i ne pravi probleme
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Direktan query bez poziva drugih policy-ja
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(v_is_admin, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;