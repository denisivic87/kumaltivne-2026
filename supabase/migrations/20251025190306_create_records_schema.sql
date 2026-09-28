/*
  # Kreiranje šeme za zapise i korisnike

  1. Nove tabele
    - `users`
      - `id` (uuid, primary key) - Jedinstveni ID korisnika
      - `username` (text, unique) - Korisničko ime
      - `password_hash` (text) - Hash lozinke
      - `budget_user_id` (text) - ID korisnika budžeta
      - `treasury` (text) - Trezor
      - `is_active` (boolean) - Status aktivnosti
      - `created_at` (timestamptz) - Datum kreiranja
      - `updated_at` (timestamptz) - Datum ažuriranja
    
    - `headers`
      - `id` (uuid, primary key) - Jedinstveni ID
      - `user_id` (uuid, foreign key) - Referenca na korisnika
      - `cumulative_reason_code` (text) - Kumulativni kod razloga
      - `budget_year` (text) - Budžetska godina
      - `budget_user_id` (text) - ID korisnika budžeta
      - `currency_code` (text) - Kod valute
      - `treasury` (text) - Trezor
      - `created_at` (timestamptz) - Datum kreiranja
      - `updated_at` (timestamptz) - Datum ažuriranja
    
    - `records`
      - `id` (uuid, primary key) - Jedinstveni ID
      - `user_id` (uuid, foreign key) - Referenca na korisnika
      - `header_id` (uuid, foreign key) - Referenca na header
      - `reason_code` (text) - Kod razloga
      - `external_id` (text) - Spoljašnji ID
      - `recipient` (text) - Primalac
      - `recipient_place` (text) - Mesto primaoca
      - `account_number` (text) - Broj računa
      - `invoice_number` (text) - Broj fakture
      - `invoice_type` (text) - Tip fakture
      - `invoice_date` (text) - Datum fakture
      - `due_date` (text) - Datum dospeća
      - `contract_number` (text) - Broj ugovora
      - `payment_code` (text) - Kod plaćanja
      - `credit_model` (text) - Model kredita
      - `credit_reference_number` (text) - Broj poziva na kredit
      - `payment_basis` (text) - Osnov plaćanja
      - `created_at` (timestamptz) - Datum kreiranja
      - `updated_at` (timestamptz) - Datum ažuriranja
    
    - `record_items`
      - `id` (uuid, primary key) - Jedinstveni ID
      - `record_id` (uuid, foreign key) - Referenca na zapis
      - `budget_user_id` (text) - ID korisnika budžeta
      - `program_code` (text) - Kod programa
      - `project_code` (text) - Kod projekta
      - `economic_classification_code` (text) - Ekonomska klasifikacija
      - `source_of_funding_code` (text) - Izvor finansiranja
      - `function_code` (text) - Kod funkcije
      - `amount` (numeric) - Iznos
      - `recording_account` (text) - Račun evidentiranja
      - `expected_payment_date` (text) - Očekivani datum plaćanja
      - `urgent_payment` (boolean) - Hitno plaćanje
      - `posting_account` (text) - Račun proknjižavanja
      - `created_at` (timestamptz) - Datum kreiranja
      - `updated_at` (timestamptz) - Datum ažuriranja

  2. Sigurnost
    - Omogućiti RLS za sve tabele
    - Dodati policy-je za autentifikovane korisnike
    - Korisnici mogu pristupiti samo svojim podacima
*/

-- Kreiranje users tabele
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  budget_user_id text NOT NULL DEFAULT '',
  treasury text NOT NULL DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Kreiranje headers tabele
CREATE TABLE IF NOT EXISTS headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cumulative_reason_code text NOT NULL DEFAULT '',
  budget_year text NOT NULL DEFAULT '',
  budget_user_id text NOT NULL DEFAULT '',
  currency_code text NOT NULL DEFAULT 'EUR',
  treasury text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Kreiranje records tabele
CREATE TABLE IF NOT EXISTS records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  header_id uuid REFERENCES headers(id) ON DELETE SET NULL,
  reason_code text NOT NULL DEFAULT '',
  external_id text NOT NULL DEFAULT '',
  recipient text NOT NULL DEFAULT '',
  recipient_place text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  invoice_number text NOT NULL DEFAULT '',
  invoice_type text NOT NULL DEFAULT '',
  invoice_date text NOT NULL DEFAULT '',
  due_date text NOT NULL DEFAULT '',
  contract_number text NOT NULL DEFAULT '',
  payment_code text NOT NULL DEFAULT '',
  credit_model text NOT NULL DEFAULT '',
  credit_reference_number text NOT NULL DEFAULT '',
  payment_basis text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Kreiranje record_items tabele
CREATE TABLE IF NOT EXISTS record_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  budget_user_id text NOT NULL DEFAULT '',
  program_code text NOT NULL DEFAULT '',
  project_code text NOT NULL DEFAULT '',
  economic_classification_code text NOT NULL DEFAULT '',
  source_of_funding_code text NOT NULL DEFAULT '',
  function_code text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  recording_account text NOT NULL DEFAULT '',
  expected_payment_date text NOT NULL DEFAULT '',
  urgent_payment boolean DEFAULT false,
  posting_account text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Omogući RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_items ENABLE ROW LEVEL SECURITY;

-- Policy za users - korisnici mogu videti samo sebe
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy za headers - korisnici mogu videti i menjati samo svoje headere
CREATE POLICY "Users can view own headers"
  ON headers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own headers"
  ON headers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own headers"
  ON headers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own headers"
  ON headers
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy za records - korisnici mogu videti i menjati samo svoje zapise
CREATE POLICY "Users can view own records"
  ON records
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own records"
  ON records
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own records"
  ON records
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own records"
  ON records
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy za record_items - korisnici mogu videti i menjati samo svoje stavke
CREATE POLICY "Users can view own record items"
  ON record_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
      AND records.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own record items"
  ON record_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
      AND records.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own record items"
  ON record_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
      AND records.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
      AND records.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own record items"
  ON record_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
      AND records.user_id = auth.uid()
    )
  );

-- Kreiraj indekse za bolje performanse
CREATE INDEX IF NOT EXISTS idx_headers_user_id ON headers(user_id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_header_id ON records(header_id);
CREATE INDEX IF NOT EXISTS idx_record_items_record_id ON record_items(record_id);