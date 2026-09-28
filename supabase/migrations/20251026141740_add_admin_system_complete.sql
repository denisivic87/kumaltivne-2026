/*
  # Admin System - Complete Setup

  1. Dodaj role kolonu u public.users
  2. Kreiraj admin funkcije za upravljanje korisnicima
  3. Ažuriraj RLS policies
*/

-- Dodaj role kolonu
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Kreiraj indeks za brže pretrage
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Funkcija za proveru admin statusa
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ažuriraj SELECT policy za users
DROP POLICY IF EXISTS "Users can view own data or admin can view all" ON public.users;
CREATE POLICY "Users can view own data or admin can view all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR is_current_user_admin()
  );

-- Ažuriraj UPDATE policy
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR is_current_user_admin()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR is_current_user_admin()
  );

-- INSERT policy za admine
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- DELETE policy za admine
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- Funkcija za dobavljanje svih korisnika (samo za admine)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  auth_user_id uuid,
  username text,
  budget_user_id text,
  treasury text,
  is_active boolean,
  role text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view all users';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.auth_user_id,
    u.username,
    u.budget_user_id,
    u.treasury,
    u.is_active,
    u.role,
    u.created_at,
    u.updated_at
  FROM public.users u
  WHERE u.role != 'admin'
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcija za toggle user status
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS jsonb AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can toggle user status'
    );
  END IF;

  UPDATE public.users
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_user_id
    AND role != 'admin';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User status updated'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcija za brisanje korisnika
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can delete users'
    );
  END IF;

  -- Ne dozvoli brisanje admin naloga
  DELETE FROM public.users 
  WHERE id = p_user_id 
    AND role != 'admin';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcija za kreiranje novog korisnika od strane admina
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_username text,
  p_budget_user_id text,
  p_treasury text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT is_current_user_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can create users'
    );
  END IF;

  -- Proveri da li email već postoji
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email already exists'
    );
  END IF;

  -- Kreiraj auth.users zapis (Supabase će automatski kreirati user profil preko trigera)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'username', p_username, 
      'budget_user_id', p_budget_user_id, 
      'treasury', p_treasury
    ),
    '',
    '',
    false
  )
  RETURNING id INTO v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'User created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;