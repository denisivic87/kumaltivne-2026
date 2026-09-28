/*
  # Remove All Duplicate and Circular Policies

  1. Drop all existing SELECT policies
  2. Create only ONE simple SELECT policy
  3. Ensure no circular dependencies
*/

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Create ONE simple SELECT policy without circular dependency
CREATE POLICY "allow_read_own_profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Create ONE simple UPDATE policy
CREATE POLICY "allow_update_own_profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());