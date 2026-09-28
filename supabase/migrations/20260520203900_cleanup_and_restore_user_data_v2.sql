/*
  # Clean and restore user data from snapshots (v2)
  
  Force delete all records for contaminated users and re-insert only their
  correct data using SECURITY DEFINER to bypass RLS during migration.
  
  All items are restored from snapshot records_json.
*/

-- Step 1: Force delete ALL records for all 4 users (bypasses RLS via migration context)
DELETE FROM record_items
WHERE record_id IN (
  SELECT id FROM records 
  WHERE user_id IN (
    '4df36d7c-1e39-44d2-810b-99fefcdb1693',
    '7bdafd67-8881-4249-a178-06e15f431414',
    'c9718555-4d25-4d12-b543-b6491d44353e',
    '4f7965fd-679e-4603-aa2e-4239b3312e32'
  )
);

DELETE FROM records 
WHERE user_id IN (
  '4df36d7c-1e39-44d2-810b-99fefcdb1693',
  '7bdafd67-8881-4249-a178-06e15f431414',
  'c9718555-4d25-4d12-b543-b6491d44353e',
  '4f7965fd-679e-4603-aa2e-4239b3312e32'
);

-- Step 2: Restore from snapshots using a plpgsql block
DO $$
DECLARE
  v_user_id uuid;
  v_snapshot_id uuid;
  v_record jsonb;
  v_item jsonb;
  v_header_id uuid;
  v_header jsonb;
  v_records jsonb;
  v_record_id uuid;
BEGIN
  FOR v_user_id, v_snapshot_id IN
    VALUES
      ('4df36d7c-1e39-44d2-810b-99fefcdb1693'::uuid, '8e9c6a08-5cdf-4701-8d7c-197b8ac63bae'::uuid),
      ('7bdafd67-8881-4249-a178-06e15f431414'::uuid, '8539e3d5-7602-4ea1-bc88-88676ac0f34b'::uuid),
      ('c9718555-4d25-4d12-b543-b6491d44353e'::uuid, '47293aff-b399-4fc3-9a37-590780453150'::uuid),
      ('4f7965fd-679e-4603-aa2e-4239b3312e32'::uuid, '90a08a74-525f-434c-b198-282bd18c5975'::uuid)
  LOOP
    SELECT records_json, header_json INTO v_records, v_header
    FROM record_snapshots WHERE id = v_snapshot_id;

    IF v_records IS NULL THEN
      RAISE WARNING 'No snapshot for user %', v_user_id;
      CONTINUE;
    END IF;

    -- Upsert header
    INSERT INTO headers (user_id, cumulative_reason_code, budget_year, budget_user_id, currency_code, treasury, updated_at)
    VALUES (
      v_user_id,
      v_header->>'cumulative_reason_code',
      v_header->>'budget_year',
      v_header->>'budget_user_id',
      v_header->>'currency_code',
      v_header->>'treasury',
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      cumulative_reason_code = EXCLUDED.cumulative_reason_code,
      budget_year = EXCLUDED.budget_year,
      budget_user_id = EXCLUDED.budget_user_id,
      currency_code = EXCLUDED.currency_code,
      treasury = EXCLUDED.treasury,
      updated_at = now();

    SELECT id INTO v_header_id FROM headers WHERE user_id = v_user_id;

    FOR v_record IN SELECT jsonb_array_elements(v_records)
    LOOP
      v_record_id := gen_random_uuid();

      INSERT INTO records (
        id, user_id, header_id, sequence_number,
        reason_code, external_id, recipient, recipient_place,
        account_number, invoice_number, invoice_type, invoice_date,
        due_date, contract_number, payment_code, credit_model,
        credit_reference_number, payment_basis, created_at, updated_at
      ) VALUES (
        v_record_id, v_user_id, v_header_id,
        (v_record->>'sequence_number')::int,
        COALESCE(v_record->>'reason_code', ''),
        COALESCE(v_record->>'external_id', ''),
        COALESCE(v_record->>'recipient', ''),
        COALESCE(v_record->>'recipient_place', ''),
        COALESCE(v_record->>'account_number', ''),
        COALESCE(v_record->>'invoice_number', ''),
        COALESCE(v_record->>'invoice_type', ''),
        COALESCE(v_record->>'invoice_date', ''),
        COALESCE(v_record->>'due_date', ''),
        COALESCE(v_record->>'contract_number', ''),
        COALESCE(v_record->>'payment_code', ''),
        COALESCE(v_record->>'credit_model', ''),
        COALESCE(v_record->>'credit_reference_number', ''),
        COALESCE(v_record->>'payment_basis', ''),
        now(), now()
      );

      v_item := v_record->'item';
      IF v_item IS NOT NULL THEN
        INSERT INTO record_items (
          record_id, budget_user_id, program_code, project_code,
          economic_classification_code, source_of_funding_code, function_code,
          amount, recording_account, expected_payment_date, urgent_payment,
          posting_account, created_at, updated_at
        ) VALUES (
          v_record_id,
          COALESCE(v_item->>'budget_user_id', ''),
          COALESCE(v_item->>'program_code', ''),
          COALESCE(v_item->>'project_code', ''),
          COALESCE(v_item->>'economic_classification_code', ''),
          COALESCE(v_item->>'source_of_funding_code', ''),
          COALESCE(v_item->>'function_code', ''),
          COALESCE((v_item->>'amount')::numeric, 0),
          COALESCE(v_item->>'recording_account', ''),
          COALESCE(v_item->>'expected_payment_date', ''),
          COALESCE((v_item->>'urgent_payment')::boolean, false),
          COALESCE(v_item->>'posting_account', ''),
          now(), now()
        );
      END IF;
    END LOOP;

    RAISE NOTICE 'User %: restored % records', v_user_id, jsonb_array_length(v_records);
  END LOOP;
END $$;
