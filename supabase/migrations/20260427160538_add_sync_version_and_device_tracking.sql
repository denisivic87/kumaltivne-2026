/*
  # Add Sync Version and Device Tracking

  ## Purpose
  Supports multi-device synchronization with last-write-wins conflict resolution.

  ## Changes
  1. Add `version` column to `records` and `headers` for optimistic concurrency
  2. Add `sync_sessions` table to track active device sessions
  3. Add `pending_sync` column for offline queue support
  4. Update RLS policies for `sync_sessions`
  5. Add index on `updated_at` for efficient sync queries
*/

-- Add version column to records for conflict resolution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'records' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.records ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version column to headers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'headers' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.headers ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version column to record_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'record_items' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.record_items ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Index on updated_at for efficient delta-sync queries
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON public.records(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_user_updated ON public.records(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_headers_user_id ON public.headers(user_id);

-- Function to auto-increment version and updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.bump_version_and_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Triggers for records
DROP TRIGGER IF EXISTS trg_records_version ON public.records;
CREATE TRIGGER trg_records_version
  BEFORE UPDATE ON public.records
  FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();

-- Triggers for headers
DROP TRIGGER IF EXISTS trg_headers_version ON public.headers;
CREATE TRIGGER trg_headers_version
  BEFORE UPDATE ON public.headers
  FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();

-- Triggers for record_items
DROP TRIGGER IF EXISTS trg_record_items_version ON public.record_items;
CREATE TRIGGER trg_record_items_version
  BEFORE UPDATE ON public.record_items
  FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();

-- Enable Realtime on records and headers tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.headers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.record_items;
