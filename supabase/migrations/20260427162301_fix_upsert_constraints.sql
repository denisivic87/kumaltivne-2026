/*
  # Fix upsert constraints

  ## Issues
  1. headers table has no UNIQUE constraint on user_id, so ON CONFLICT (user_id) fails
  2. Need to ensure records upsert works via primary key

  ## Changes
  1. Add UNIQUE constraint on headers.user_id (one header per user)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'headers_user_id_key'
  ) THEN
    ALTER TABLE public.headers ADD CONSTRAINT headers_user_id_key UNIQUE (user_id);
  END IF;
END $$;
