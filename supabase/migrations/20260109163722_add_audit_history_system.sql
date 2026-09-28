/*
  # Kreiranje sistema za praćenje istorije izmena (Audit Log)

  ## Kratak opis
  Ova migracija dodaje kompletan sistem za praćenje svih izmena u aplikaciji,
  omogućava rollback funkcionalnost i čuva kompletnu istoriju akcija.

  ## 1. Nova tabela: audit_history
  
  Čuva kompletnu istoriju svih izmena na zapisima:
  
  - `id` (uuid, primary key) - Jedinstveni ID audit zapisa
  - `user_id` (uuid, foreign key) - Korisnik koji je izvršio akciju
  - `record_id` (uuid) - ID zapisa koji je izmenjen (može biti null za bulk operacije)
  - `action` (text) - Tip akcije: CREATE, UPDATE, DELETE, BULK_CREATE, BULK_UPDATE, BULK_DELETE
  - `entity_type` (text) - Tip entiteta: record, header, record_item
  - `old_data` (jsonb) - Podaci pre izmene (null za CREATE)
  - `new_data` (jsonb) - Podaci posle izmene (null za DELETE)
  - `changed_fields` (jsonb) - Lista izmenjenih polja (samo za UPDATE)
  - `metadata` (jsonb) - Dodatni metapodaci (IP adresa, browser info, itd.)
  - `created_at` (timestamptz) - Timestamp akcije

  ## 2. Sigurnost
  
  - Omogućiti RLS za audit_history tabelu
  - Korisnici mogu videti samo svoju istoriju
  - Admin može videti kompletnu istoriju svih korisnika
  - Samo INSERT dozvoljeno (ne može se menjati ili brisati istorija)

  ## 3. Indeksi za performanse
  
  - Index na user_id za brže pretrage po korisniku
  - Index na record_id za praćenje istorije određenog zapisa
  - Index na created_at za sortiranje po vremenu
  - Index na action za filtriranje po tipu akcije

  ## 4. Funkcija za automatski rollback
  
  Funkcija koja vraća zapis na prethodnu verziju koristeći podatke iz audit_history
*/

-- Kreiranje audit_history tabele
CREATE TABLE IF NOT EXISTS audit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE', 'IMPORT', 'CLEAR_ALL')),
  entity_type text NOT NULL CHECK (entity_type IN ('record', 'header', 'record_item', 'multiple')),
  old_data jsonb,
  new_data jsonb,
  changed_fields jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Omogući RLS
ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;

-- Policy za korisnike - mogu videti samo svoju istoriju
CREATE POLICY "Users can view own audit history"
  ON audit_history
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Policy za admina - može videti sve (kroz role check)
CREATE POLICY "Admins can view all audit history"
  ON audit_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy za INSERT - svi autentifikovani korisnici mogu dodavati audit zapise
CREATE POLICY "Users can insert own audit history"
  ON audit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Kreiraj indekse za bolje performanse
CREATE INDEX IF NOT EXISTS idx_audit_history_user_id ON audit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_record_id ON audit_history(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_created_at ON audit_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_history_action ON audit_history(action);
CREATE INDEX IF NOT EXISTS idx_audit_history_entity_type ON audit_history(entity_type);

-- Kreiraj composite index za učestale query kombinacije
CREATE INDEX IF NOT EXISTS idx_audit_history_user_record ON audit_history(user_id, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_user_created ON audit_history(user_id, created_at DESC);

-- Funkcija za vraćanje zapisa na prethodnu verziju (rollback)
CREATE OR REPLACE FUNCTION rollback_record_to_version(
  p_audit_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_record audit_history%ROWTYPE;
  v_record_id uuid;
  v_old_data jsonb;
  v_result jsonb;
BEGIN
  -- Učitaj audit zapis
  SELECT * INTO v_audit_record
  FROM audit_history
  WHERE id = p_audit_id
  AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Audit record not found');
  END IF;

  -- Proveri da li postoje stari podaci za rollback
  IF v_audit_record.old_data IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No old data available for rollback');
  END IF;

  v_record_id := v_audit_record.record_id;
  v_old_data := v_audit_record.old_data;

  -- Ažuriraj record sa starim podacima
  UPDATE records
  SET
    reason_code = v_old_data->>'reason_code',
    external_id = v_old_data->>'external_id',
    recipient = v_old_data->>'recipient',
    recipient_place = v_old_data->>'recipient_place',
    account_number = v_old_data->>'account_number',
    invoice_number = v_old_data->>'invoice_number',
    invoice_type = v_old_data->>'invoice_type',
    invoice_date = v_old_data->>'invoice_date',
    due_date = v_old_data->>'due_date',
    contract_number = v_old_data->>'contract_number',
    payment_code = v_old_data->>'payment_code',
    credit_model = v_old_data->>'credit_model',
    credit_reference_number = v_old_data->>'credit_reference_number',
    payment_basis = v_old_data->>'payment_basis',
    sequence_number = (v_old_data->>'sequence_number')::integer,
    updated_at = now()
  WHERE id = v_record_id
  AND user_id = p_user_id;

  -- Ako postoje podaci o item-u, ažuriraj i njih
  IF v_old_data ? 'item' THEN
    UPDATE record_items
    SET
      budget_user_id = v_old_data->'item'->>'budget_user_id',
      program_code = v_old_data->'item'->>'program_code',
      project_code = v_old_data->'item'->>'project_code',
      economic_classification_code = v_old_data->'item'->>'economic_classification_code',
      source_of_funding_code = v_old_data->'item'->>'source_of_funding_code',
      function_code = v_old_data->'item'->>'function_code',
      amount = (v_old_data->'item'->>'amount')::numeric,
      recording_account = v_old_data->'item'->>'recording_account',
      expected_payment_date = v_old_data->'item'->>'expected_payment_date',
      urgent_payment = (v_old_data->'item'->>'urgent_payment')::boolean,
      posting_account = v_old_data->'item'->>'posting_account',
      updated_at = now()
    WHERE record_id = v_record_id;
  END IF;

  -- Kreiraj novi audit zapis za rollback akciju
  INSERT INTO audit_history (
    user_id,
    record_id,
    action,
    entity_type,
    old_data,
    new_data,
    metadata
  ) VALUES (
    p_user_id,
    v_record_id,
    'UPDATE',
    'record',
    v_audit_record.new_data,
    v_old_data,
    jsonb_build_object(
      'rollback_from_audit_id', p_audit_id,
      'rollback_timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'message', 'Record successfully rolled back'
  );
END;
$$;

-- Funkcija za dobijanje istorije zapisa
CREATE OR REPLACE FUNCTION get_record_history(
  p_record_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  action text,
  old_data jsonb,
  new_data jsonb,
  changed_fields jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ah.id,
    ah.action,
    ah.old_data,
    ah.new_data,
    ah.changed_fields,
    ah.created_at
  FROM audit_history ah
  WHERE ah.record_id = p_record_id
  AND ah.user_id = p_user_id
  ORDER BY ah.created_at DESC;
END;
$$;

-- Funkcija za statistiku audit loga
CREATE OR REPLACE FUNCTION get_audit_statistics(
  p_user_id uuid,
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'creates', COUNT(*) FILTER (WHERE action IN ('CREATE', 'BULK_CREATE')),
    'updates', COUNT(*) FILTER (WHERE action IN ('UPDATE', 'BULK_UPDATE')),
    'deletes', COUNT(*) FILTER (WHERE action IN ('DELETE', 'BULK_DELETE')),
    'imports', COUNT(*) FILTER (WHERE action = 'IMPORT'),
    'records_affected', COUNT(DISTINCT record_id),
    'date_range', jsonb_build_object(
      'from', COALESCE(p_from_date, MIN(created_at)),
      'to', COALESCE(p_to_date, MAX(created_at))
    )
  ) INTO v_stats
  FROM audit_history
  WHERE user_id = p_user_id
  AND (p_from_date IS NULL OR created_at >= p_from_date)
  AND (p_to_date IS NULL OR created_at <= p_to_date);

  RETURN v_stats;
END;
$$;

-- Dodaj komentar na tabelu
COMMENT ON TABLE audit_history IS 'Kompletna istorija svih izmena u aplikaciji. Čuva old_data i new_data za svaku akciju, omogućava rollback i detaljno praćenje promena.';
