/*
  # Fix handle_new_auth_user trigger — SECURITY DEFINER + safe backfill

  ## Problem
  Trigger runs without auth context when admin creates users, RLS blocks the INSERT.

  ## Fix
  - Recreate function with SECURITY DEFINER (runs as postgres, bypasses RLS)
  - Backfill missing rows using email as username to avoid unique constraint conflicts
*/

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    auth_user_id, username, email,
    budget_user_id, treasury, pdf_display_name,
    role, status, is_active, password_hash
  )
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'username')::text, split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'budget_user_id')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'treasury')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'pdf_display_name')::text, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'user'),
    'active', true, NULL
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill missing public.users rows — use email as username to avoid conflicts
INSERT INTO public.users (auth_user_id, username, email, budget_user_id, treasury, pdf_display_name, role, status, is_active, password_hash)
SELECT
  au.id,
  au.email,
  au.email,
  COALESCE((au.raw_user_meta_data->>'budget_user_id')::text, ''),
  COALESCE((au.raw_user_meta_data->>'treasury')::text, ''),
  COALESCE((au.raw_user_meta_data->>'pdf_display_name')::text, ''),
  COALESCE((au.raw_user_meta_data->>'role')::text, 'user'),
  'active', true, NULL
FROM auth.users au
LEFT JOIN public.users pu ON pu.auth_user_id = au.id
WHERE pu.id IS NULL
ON CONFLICT (auth_user_id) DO NOTHING;
