/*
  # Add Auto-Sync Trigger for Auth Users

  ## Purpose
  Automatically create public.users record when auth.users record is created
  This prevents "User data not found" errors when admin creates users

  ## Changes
  1. Create trigger function to handle new auth.users
  2. Add trigger on auth.users INSERT
  3. Sync any existing auth.users without public.users records
*/

-- Function to auto-create public.users record from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
BEGIN
  -- Insert into public.users with metadata from auth.users
  INSERT INTO public.users (
    auth_user_id,
    username,
    email,
    budget_user_id,
    treasury,
    pdf_display_name,
    role,
    status,
    is_active,
    password_hash
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'username')::text, split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'budget_user_id')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'treasury')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'pdf_display_name')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'user'),
    'active',
    true,
    NULL
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Sync existing auth.users that don't have public.users records
INSERT INTO public.users (
  auth_user_id,
  username,
  email,
  budget_user_id,
  treasury,
  pdf_display_name,
  role,
  status,
  is_active,
  password_hash
)
SELECT 
  au.id,
  COALESCE((au.raw_user_meta_data->>'username')::text, split_part(au.email, '@', 1)),
  au.email,
  COALESCE((au.raw_user_meta_data->>'budget_user_id')::text, ''),
  COALESCE((au.raw_user_meta_data->>'treasury')::text, ''),
  COALESCE((au.raw_user_meta_data->>'pdf_display_name')::text, ''),
  COALESCE((au.raw_user_meta_data->>'role')::text, 'user'),
  'active',
  true,
  NULL
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
WHERE pu.id IS NULL
  AND au.email NOT LIKE '%admin%'
ON CONFLICT (auth_user_id) DO NOTHING;

-- Add comment
COMMENT ON FUNCTION public.handle_new_auth_user() IS 'Automatically creates public.users record when auth.users record is created';