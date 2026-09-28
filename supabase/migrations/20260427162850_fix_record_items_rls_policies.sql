/*
  # Fix record_items RLS policies

  ## Problem
  The record_items RLS policies were checking `records.user_id = auth.uid()` but
  `records.user_id` stores `public.users.id` (not the Supabase auth UID).
  This caused "new row violates row-level security policy" errors on insert.

  ## Fix
  Replace all four policies to use the correct ownership check:
  `records.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())`
*/

-- Drop all existing record_items policies
DROP POLICY IF EXISTS "Users can view their own record items" ON record_items;
DROP POLICY IF EXISTS "Users can insert their own record items" ON record_items;
DROP POLICY IF EXISTS "Users can update their own record items" ON record_items;
DROP POLICY IF EXISTS "Users can delete their own record items" ON record_items;

-- Recreate with correct ownership check
CREATE POLICY "Users can view their own record items"
  ON record_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.user_id IN (
          SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can insert their own record items"
  ON record_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.user_id IN (
          SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can update their own record items"
  ON record_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.user_id IN (
          SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.user_id IN (
          SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can delete their own record items"
  ON record_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.user_id IN (
          SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
  );
