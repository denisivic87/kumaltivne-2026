/*
  # Fix handle_new_user Function to Include Role

  1. Ažuriraj funkciju da postavlja role kolonu
  2. Default role je 'user'
*/

-- Kreiraj/ažuriraj funkciju za nove korisnike
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
    username = COALESCE(EXCLUDED.username, public.users.username),
    budget_user_id = COALESCE(EXCLUDED.budget_user_id, public.users.budget_user_id),
    treasury = COALESCE(EXCLUDED.treasury, public.users.treasury);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;