/*
  # Fix Circular RLS - Complete Reset

  1. Drop all policies and functions with CASCADE
  2. Create simple policies without circular dependencies
  3. Create SECURITY DEFINER functions for admin operations
*/

-- Drop funkcije sa CASCADE da obriše zavisne policy-je
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.check_user_is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users() CASCADE;

-- Obriši preostale policy-je ako ih ima
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Kreiraj JEDNOSTAVNE policy-je
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Helper funkcija koja bypass-uje RLS koristeći SECURITY DEFINER
CREATE FUNCTION public.check_user_is_admin(user_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.users
  WHERE auth_user_id = user_auth_id
  LIMIT 1;
  
  RETURN COALESCE(v_is_admin, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Get all users (SECURITY DEFINER bypass-uje RLS)
CREATE FUNCTION public.get_all_users()
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
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF NOT check_user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    u.id, u.auth_user_id, u.username, u.budget_user_id, 
    u.treasury, u.is_active, u.role, u.created_at, u.updated_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Toggle user status
CREATE FUNCTION public.admin_toggle_user_status(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT check_user_is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.users
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Delete user
CREATE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  IF NOT check_user_is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT auth_user_id INTO v_auth_user_id
  FROM public.users WHERE id = p_user_id;

  DELETE FROM public.users WHERE id = p_user_id;
  
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create user placeholder
CREATE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_username text,
  p_budget_user_id text,
  p_treasury text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT check_user_is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  RETURN json_build_object(
    'success', false, 
    'error', 'Not implemented'
  );
END;
$$;