/*
  # Fix broken RLS policies on record_items

  ## Problem
  The record_items table has duplicate RLS policies. The older set checks
  `records.user_id = auth.uid()` which is WRONG — records.user_id stores
  public.users.id, not auth.uid() (which equals public.users.auth_user_id).
  These broken policies always evaluate to FALSE, so every user can see all
  record_items (when policies conflict, Postgres allows access if ANY policy
  passes), but more importantly they caused silent failures that made items
  appear empty after fetches.

  ## Fix
  Drop the four broken policies that compare records.user_id directly to
  auth.uid(). Keep only the correct policies that use the subquery through
  public.users.
*/

-- Drop the broken policies that compare records.user_id = auth.uid() directly
-- (auth.uid() returns auth_user_id, not public.users.id)

DROP POLICY IF EXISTS "Users can view own record items" ON record_items;
DROP POLICY IF EXISTS "Users can insert own record items" ON record_items;
DROP POLICY IF EXISTS "Users can update own record items" ON record_items;
DROP POLICY IF EXISTS "Users can delete own record items" ON record_items;

-- Also fix headers table which had the same pattern — verify they use correct subquery
-- Drop and recreate to be safe

DROP POLICY IF EXISTS "Users can view own headers" ON headers;
DROP POLICY IF EXISTS "Users can insert own headers" ON headers;
DROP POLICY IF EXISTS "Users can update own headers" ON headers;
DROP POLICY IF EXISTS "Users can delete own headers" ON headers;

CREATE POLICY "Users can view own headers"
  ON headers FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own headers"
  ON headers FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own headers"
  ON headers FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own headers"
  ON headers FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Recreate clean record_items policies using correct subquery
CREATE POLICY "Users can view own record items"
  ON record_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Users can insert own record items"
  ON record_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Users can update own record items"
  ON record_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Users can delete own record items"
  ON record_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ));

-- Drop the now-duplicate "their own" policies since the above are identical in intent
DROP POLICY IF EXISTS "Users can view their own record items" ON record_items;
DROP POLICY IF EXISTS "Users can insert their own record items" ON record_items;
DROP POLICY IF EXISTS "Users can update their own record items" ON record_items;
DROP POLICY IF EXISTS "Users can delete their own record items" ON record_items;
