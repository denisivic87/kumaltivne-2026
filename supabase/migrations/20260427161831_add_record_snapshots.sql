/*
  # Add Record Snapshots (History)

  ## Purpose
  Stores complete point-in-time snapshots of a user's records so they can
  browse and restore to any previous state.

  ## New Tables
  - `record_snapshots`
    - `id` – UUID primary key
    - `user_id` – FK to public.users
    - `label` – human-readable description (e.g. "Import XML 2026-04-27")
    - `trigger` – what caused the snapshot: 'import' | 'manual' | 'auto'
    - `records_json` – full JSON array of all records at that moment
    - `header_json` – full JSON of the header at that moment
    - `record_count` – number of records in the snapshot
    - `created_at`

  ## Security
  - RLS enabled; users can only read/write their own snapshots
  - Auto-cleanup: keep max 50 snapshots per user (oldest deleted on insert)
*/

CREATE TABLE IF NOT EXISTS public.record_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label       text NOT NULL DEFAULT '',
  trigger     text NOT NULL DEFAULT 'manual'
                CHECK (trigger IN ('import', 'manual', 'auto')),
  records_json jsonb NOT NULL DEFAULT '[]',
  header_json  jsonb NOT NULL DEFAULT '{}',
  record_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_created
  ON public.record_snapshots(user_id, created_at DESC);

ALTER TABLE public.record_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON public.record_snapshots FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own snapshots"
  ON public.record_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own snapshots"
  ON public.record_snapshots FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Function: auto-delete oldest snapshots when user has more than 50
CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.record_snapshots
  WHERE id IN (
    SELECT id FROM public.record_snapshots
    WHERE user_id = NEW.user_id
    ORDER BY created_at ASC
    OFFSET 50
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_snapshots ON public.record_snapshots;
CREATE TRIGGER trg_cleanup_snapshots
  AFTER INSERT ON public.record_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_snapshots();
