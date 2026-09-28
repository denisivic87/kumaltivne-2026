/*
  # Consolidate RLS policies using current_app_user_id()

  ## Problem
  Every table's RLS policies repeat the same subquery:
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  This is fragile — one copy was already broken in production (see
  fix_record_items_rls_broken_policies.sql). Also, activity_logs uses
  auth.uid() directly (wrong — user_id stores public.users.id, not
  auth_user_id), and security_audit_log has USING (true) which lets
  any authenticated user read all security audit entries.

  ## Fix
  1. Create a single SECURITY DEFINER function current_app_user_id()
     that maps auth.uid() → public.users.id.
  2. DROP all existing policies on data tables and recreate them
     consistently using current_app_user_id().
  3. Fix activity_logs to use current_app_user_id() instead of auth.uid().
  4. Fix security_audit_log to admin-only access instead of USING (true).
*/

-- ============================================================
-- 1. Helper function: map auth.uid() → public.users.id
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid()
$$;

-- ============================================================
-- 2. headers — drop & recreate all policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own headers" ON headers;
DROP POLICY IF EXISTS "Users can insert own headers" ON headers;
DROP POLICY IF EXISTS "Users can update own headers" ON headers;
DROP POLICY IF EXISTS "Users can delete own headers" ON headers;

CREATE POLICY "headers_select_own" ON headers
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "headers_insert_own" ON headers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "headers_update_own" ON headers
  FOR UPDATE TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "headers_delete_own" ON headers
  FOR DELETE TO authenticated
  USING (user_id = public.current_app_user_id());

-- ============================================================
-- 3. records — drop & recreate all policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own records" ON records;
DROP POLICY IF EXISTS "Users can insert own records" ON records;
DROP POLICY IF EXISTS "Users can update own records" ON records;
DROP POLICY IF EXISTS "Users can delete own records" ON records;

CREATE POLICY "records_select_own" ON records
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "records_insert_own" ON records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "records_update_own" ON records
  FOR UPDATE TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "records_delete_own" ON records
  FOR DELETE TO authenticated
  USING (user_id = public.current_app_user_id());

-- ============================================================
-- 4. record_items — drop & recreate all policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own record items" ON record_items;
DROP POLICY IF EXISTS "Users can insert own record items" ON record_items;
DROP POLICY IF EXISTS "Users can update own record items" ON record_items;
DROP POLICY IF EXISTS "Users can delete own record items" ON record_items;

CREATE POLICY "record_items_select_own" ON record_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id = public.current_app_user_id()
  ));

CREATE POLICY "record_items_insert_own" ON record_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id = public.current_app_user_id()
  ));

CREATE POLICY "record_items_update_own" ON record_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id = public.current_app_user_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id = public.current_app_user_id()
  ));

CREATE POLICY "record_items_delete_own" ON record_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM records
    WHERE records.id = record_items.record_id
      AND records.user_id = public.current_app_user_id()
  ));

-- ============================================================
-- 5. record_snapshots — drop & recreate all policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own snapshots" ON record_snapshots;
DROP POLICY IF EXISTS "Users can insert own snapshots" ON record_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON record_snapshots;

CREATE POLICY "snapshots_select_own" ON record_snapshots
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "snapshots_insert_own" ON record_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "snapshots_delete_own" ON record_snapshots
  FOR DELETE TO authenticated
  USING (user_id = public.current_app_user_id());

-- ============================================================
-- 6. audit_history — drop & recreate all policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own audit history" ON audit_history;
DROP POLICY IF EXISTS "Admins can view all audit history" ON audit_history;
DROP POLICY IF EXISTS "Users can insert own audit history" ON audit_history;

CREATE POLICY "audit_history_select_own" ON audit_history
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "audit_history_select_admin" ON audit_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.auth_user_id = auth.uid()
      AND public.users.role = 'admin'
  ));

CREATE POLICY "audit_history_insert_own" ON audit_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_app_user_id());

-- ============================================================
-- 7. activity_logs — fix: was using auth.uid() directly (wrong)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON activity_logs;

CREATE POLICY "activity_logs_select_own" ON activity_logs
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "activity_logs_insert_own" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_app_user_id());

-- ============================================================
-- 8. security_audit_log — fix: was USING (true), now admin-only
-- ============================================================
DROP POLICY IF EXISTS "Users can view security audit log" ON security_audit_log;

CREATE POLICY "security_audit_log_select_admin" ON security_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.auth_user_id = auth.uid()
      AND public.users.role = 'admin'
  ));

-- ============================================================
-- 9. templates — drop & recreate (was using auth.uid() = user_id
--    which is correct here since templates.user_id references auth.users.id)
--    Keep as-is but use consistent naming.
-- ============================================================
DROP POLICY IF EXISTS "Users can view own and shared templates" ON templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;

CREATE POLICY "templates_select_own_or_shared" ON templates
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_shared = true AND is_active = true));

CREATE POLICY "templates_insert_own" ON templates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "templates_update_own" ON templates
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "templates_delete_own" ON templates
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
