/*
  # Add unique constraint on record_items.record_id

  Needed so that upsert with onConflict: 'record_id' works correctly.
  Each record has exactly one record_item.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'record_items_record_id_key'
  ) THEN
    ALTER TABLE public.record_items ADD CONSTRAINT record_items_record_id_key UNIQUE (record_id);
  END IF;
END $$;
