/*
  # Fix Admin User Creation Schema V2

  ## Issues
  1. password_hash column is NOT NULL but we're using Supabase Auth
  2. status column doesn't exist
  3. email column doesn't exist

  ## Changes
  1. Make password_hash nullable
  2. Add email column
  3. Add status column
*/

-- Step 1: Make password_hash nullable
ALTER TABLE public.users 
  ALTER COLUMN password_hash DROP NOT NULL;

-- Step 2: Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email text;
    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
  END IF;
END $$;

-- Step 3: Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.users 
      ADD COLUMN status text DEFAULT 'active';
    
    -- Add check constraint
    ALTER TABLE public.users 
      ADD CONSTRAINT users_status_check 
      CHECK (status IN ('active', 'pending', 'suspended'));
    
    -- Migrate existing data
    UPDATE public.users 
    SET status = CASE 
      WHEN is_active = true THEN 'active'
      ELSE 'suspended'
    END
    WHERE status IS NULL;
    
    CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.users.password_hash IS 'Legacy - nullable, we use Supabase Auth';
COMMENT ON COLUMN public.users.email IS 'User email - for admin-created users';
COMMENT ON COLUMN public.users.status IS 'Status: active, pending, or suspended';