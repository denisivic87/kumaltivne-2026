/*
  # Comprehensive Fix for Admin Login Issues

  1. Verify RLS Policies
    - Ensure users can read their own profile immediately after login
    - Add INSERT policy for trigger-based user creation
  
  2. Add Helper Functions
    - Create safe user lookup functions
    
  3. Verify Triggers
    - Ensure handle_new_user trigger is working correctly
    
  4. Test Data
    - Verify admin user exists with correct setup
*/

-- First, ensure the users table has correct structure
DO $$ 
BEGIN
  -- Add any missing columns if needed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "allow_read_own_profile" ON public.users;
DROP POLICY IF EXISTS "allow_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON public.users;

-- Create simple, clear policies
-- Allow users to read their own profile
CREATE POLICY "users_can_read_own_profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Allow users to update their own profile  
CREATE POLICY "users_can_update_own_profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Allow trigger to insert new user profiles
CREATE POLICY "allow_auth_trigger_insert"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Also allow service role full access (for admin operations)
CREATE POLICY "service_role_full_access"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Recreate the handle_new_user trigger to ensure it's correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    auth_user_id,
    username,
    password_hash,
    budget_user_id,
    treasury,
    is_active,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'user_' || substring(NEW.id::text from 1 for 8)),
    '',
    COALESCE(NEW.raw_user_meta_data->>'budget_user_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'treasury', ''),
    true,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    username = COALESCE(EXCLUDED.username, users.username),
    budget_user_id = COALESCE(EXCLUDED.budget_user_id, users.budget_user_id),
    treasury = COALESCE(EXCLUDED.treasury, users.treasury);

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create a safe user lookup function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_by_auth_id(user_auth_id uuid)
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
  WHERE u.auth_user_id = user_auth_id;
END;
$$;

-- Verify admin user exists and has correct setup
DO $$
DECLARE
  admin_auth_id uuid;
  admin_exists boolean;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@admin.com'
  LIMIT 1;

  IF admin_auth_id IS NOT NULL THEN
    -- Check if admin profile exists
    SELECT EXISTS(
      SELECT 1 FROM public.users 
      WHERE auth_user_id = admin_auth_id AND role = 'admin'
    ) INTO admin_exists;

    -- If profile doesn't exist or isn't admin, fix it
    IF NOT admin_exists THEN
      INSERT INTO public.users (
        auth_user_id,
        username,
        password_hash,
        budget_user_id,
        treasury,
        is_active,
        role
      )
      VALUES (
        admin_auth_id,
        'admin',
        '',
        '00000',
        '000',
        true,
        'admin'
      )
      ON CONFLICT (auth_user_id) DO UPDATE
      SET 
        role = 'admin',
        is_active = true,
        username = 'admin';
    END IF;
  END IF;
END $$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_by_auth_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;