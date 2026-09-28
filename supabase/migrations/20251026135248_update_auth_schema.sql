/*
  # Ažuriranje šeme za Supabase Auth integraciju

  1. Izmene
    - Ažuriraj users tabelu da koristi auth.users
    - Dodaj trigger za automatsko kreiranje user profila
    - Ažuriraj RLS policy-je da koriste auth.uid()
    - Dodaj activity_logs tabelu za praćenje aktivnosti
    - Dodaj funkcije za real-time sinhronizaciju

  2. Sigurnost
    - Svi policy-ji zahtevaju autentifikaciju preko Supabase Auth
    - Korisnici mogu pristupiti samo svojim podacima
    - Admin funkcionalnosti će biti implementirane kroz posebne policy-je
*/

-- Dodaj activity_logs tabelu za praćenje korisničkih aktivnosti
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Omogući RLS za activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy za activity_logs - korisnici mogu videti samo svoje aktivnosti
CREATE POLICY "Users can view own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ažuriraj users tabelu da referencira auth.users
DO $$
BEGIN
  -- Dodaj kolonu ako ne postoji
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Dodaj unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_auth_user_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

-- Funkcija za automatsko kreiranje user profila nakon registracije
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, username, password_hash, budget_user_id, treasury, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    '',
    COALESCE(NEW.raw_user_meta_data->>'budget_user_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'treasury', ''),
    true
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger za automatsko kreiranje profila
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ažuriraj RLS policy-je za users da koriste auth_user_id
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Funkcija za dobijanje user_id iz auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS uuid AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Ažuriraj headers policy-je
DROP POLICY IF EXISTS "Users can view own headers" ON headers;
CREATE POLICY "Users can view own headers"
  ON headers
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own headers" ON headers;
CREATE POLICY "Users can insert own headers"
  ON headers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own headers" ON headers;
CREATE POLICY "Users can update own headers"
  ON headers
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own headers" ON headers;
CREATE POLICY "Users can delete own headers"
  ON headers
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Ažuriraj records policy-je
DROP POLICY IF EXISTS "Users can view own records" ON records;
CREATE POLICY "Users can view own records"
  ON records
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own records" ON records;
CREATE POLICY "Users can insert own records"
  ON records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own records" ON records;
CREATE POLICY "Users can update own records"
  ON records
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own records" ON records;
CREATE POLICY "Users can delete own records"
  ON records
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Dodaj indekse za bolje performanse
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Funkcija za logovanje aktivnosti
CREATE OR REPLACE FUNCTION public.log_user_activity(
  action_type text,
  details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, details)
  VALUES (auth.uid(), action_type, details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;