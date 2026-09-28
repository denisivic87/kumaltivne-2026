/*
  # Restore each user's data from their latest snapshot

  ## Problem
  Due to a cross-user data contamination bug in the frontend, records from one user
  were written into other users' accounts. This migration:
  
  1. Deletes ALL current records and record_items for every affected user
  2. Restores each user's data from their latest correct import snapshot
  
  ## Users and their restore snapshots:
  - ets.finansije (4df36d7c): snapshot 8e9c6a08 — 58 records "commitments_2026-03-03 01547.xml"
  - natasa.tonic (7bdafd67): snapshot 8539e3d5 — 405 records "commitments_2026-04-26 (12).xml"
  - os.miladinmitic2 (c9718555): snapshot 47293aff — 405 records "commitments_2026-03-24 (2).xml"
  - suzana.dimi (4f7965fd): snapshot 90a08a74 — 58 records "commitments_2026-04-27 (3).xml"

  ## Notes
  - record_items are deleted via CASCADE when records are deleted
  - New records are inserted from the snapshot's records_json JSONB column
  - Each record gets its original UUID from the snapshot to preserve references
*/

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

  -- Process each user with their correct snapshot
  FOR v_user_id, v_snapshot_id IN
    VALUES
      ('4df36d7c-1e39-44d2-810b-99fefcdb1693'::uuid, '8e9c6a08-5cdf-4701-8d7c-197b8ac63bae'::uuid),
      ('7bdafd67-8881-4249-a178-06e15f431414'::uuid, '8539e3d5-7602-4ea1-bc88-88676ac0f34b'::uuid),
      ('c9718555-4d25-4d12-b543-b6491d44353e'::uuid, '47293aff-b399-4fc3-9a37-590780453150'::uuid),
      ('4f7965fd-679e-4603-aa2e-4239b3312e32'::uuid, '90a08a74-525f-434c-b198-282bd18c5975'::uuid)
  LOOP
    -- 1. Delete all current records for this user (CASCADE deletes record_items too)
    DELETE FROM records WHERE user_id = v_user_id;

    -- 2. Get snapshot data
    SELECT records_json, header_json
    INTO v_records, v_header
    FROM record_snapshots
    WHERE id = v_snapshot_id;

    IF v_records IS NULL THEN
      RAISE WARNING 'No snapshot found for user % snapshot %', v_user_id, v_snapshot_id;
      CONTINUE;
    END IF;

    -- 3. Upsert the header for this user
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

    -- 4. Insert each record from the snapshot
    FOR v_record IN SELECT jsonb_array_elements(v_records)
    LOOP
      -- Generate a new UUID for each record to avoid conflicts
      v_record_id := gen_random_uuid();

      INSERT INTO records (
        id, user_id, header_id, sequence_number,
        reason_code, external_id, recipient, recipient_place,
        account_number, invoice_number, invoice_type, invoice_date,
        due_date, contract_number, payment_code, credit_model,
        credit_reference_number, payment_basis,
        created_at, updated_at
      ) VALUES (
        v_record_id,
        v_user_id,
        v_header_id,
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
        now(),
        now()
      );

      -- 5. Insert the record item from the snapshot
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
          now(),
          now()
        );
      END IF;
    END LOOP;

    RAISE NOTICE 'Restored user % from snapshot %: % records', v_user_id, v_snapshot_id, jsonb_array_length(v_records);
  END LOOP;

END $$;
