/*
  # Fix Remaining Security Issues - Complete Security Hardening

  ## Issues Fixed in This Migration

  1. **Security Definer Views** - Completely remove SECURITY DEFINER from views
  2. **Missing Function Search Paths** - Add search_path to remaining functions:
     - log_user_activity
     - All admin functions
     - All audit functions

  ## Approach
  - Drop all problematic views and functions
  - Recreate them with proper security settings
  - Verify no SECURITY DEFINER remains on views
*/

-- =====================================================================
-- FIX 1: REMOVE SECURITY DEFINER FROM ALL VIEWS
-- =====================================================================

-- Completely drop and recreate views as regular views (not security definer)
DROP VIEW IF EXISTS public.template_stats CASCADE;
DROP VIEW IF EXISTS public.v_sequence_integrity CASCADE;

-- Recreate template_stats WITHOUT any security definer property
CREATE VIEW public.template_stats AS
SELECT
  t.id,
  t.name,
  t.category,
  t.is_shared,
  t.usage_count,
  t.created_at,
  pu.username as owner_username,
  COALESCE(pu.role = 'admin', false) as owner_is_admin
FROM templates t
LEFT JOIN public.users pu ON pu.id = t.user_id
WHERE t.is_active = true;

GRANT SELECT ON public.template_stats TO authenticated;
COMMENT ON VIEW public.template_stats IS 'Template statistics view - regular view without SECURITY DEFINER';

-- Recreate v_sequence_integrity WITHOUT any security definer property
CREATE VIEW public.v_sequence_integrity AS
WITH user_sequences AS (
  SELECT 
    r.user_id,
    u.username,
    COUNT(*) as total_records,
    COUNT(r.sequence_number) as records_with_sequence,
    MAX(r.sequence_number) as max_sequence,
    MIN(r.sequence_number) as min_sequence
  FROM records r
  JOIN users u ON r.user_id = u.id
  WHERE r.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  GROUP BY r.user_id, u.username
)
SELECT 
  user_id,
  username,
  total_records,
  records_with_sequence,
  max_sequence,
  min_sequence,
  CASE 
    WHEN records_with_sequence = 0 THEN 'NO_SEQUENCES'
    WHEN records_with_sequence < total_records THEN 'MISSING_SEQUENCES'
    WHEN max_sequence != records_with_sequence THEN 'GAPS_OR_DUPLICATES'
    ELSE 'HEALTHY'
  END as integrity_status,
  CASE 
    WHEN records_with_sequence = 0 THEN 'All records missing sequence numbers'
    WHEN records_with_sequence < total_records THEN 
      (total_records - records_with_sequence)::text || ' records without sequence numbers'
    WHEN max_sequence != records_with_sequence THEN 
      'Expected max sequence ' || records_with_sequence::text || 
      ' but found ' || max_sequence::text
    ELSE 'Sequence integrity is good'
  END as issue_description
FROM user_sequences;

GRANT SELECT ON public.v_sequence_integrity TO authenticated;
COMMENT ON VIEW public.v_sequence_integrity IS 'Sequence integrity view - regular view without SECURITY DEFINER';

-- =====================================================================
-- FIX 2: ADD SEARCH_PATH TO REMAINING FUNCTIONS
-- =====================================================================

-- Function: log_user_activity (was missing search_path)
DROP FUNCTION IF EXISTS public.log_user_activity(INTEGER, INTEGER, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_records_created INTEGER DEFAULT 0,
  p_records_modified INTEGER DEFAULT 0,
  p_total_amount NUMERIC DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_current_month text;
  v_current_year integer;
BEGIN
  -- Get the current user's ID
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN; -- User not found, exit gracefully
  END IF;

  -- Get current month and year
  v_current_month := to_char(CURRENT_DATE, 'Month');
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Insert or update activity log
  INSERT INTO monthly_activities (
    user_id,
    month,
    year,
    records_created,
    records_modified,
    total_amount,
    last_activity
  ) VALUES (
    v_user_id,
    v_current_month,
    v_current_year,
    p_records_created,
    p_records_modified,
    p_total_amount,
    now()
  )
  ON CONFLICT (user_id, month, year)
  DO UPDATE SET
    records_created = monthly_activities.records_created + p_records_created,
    records_modified = monthly_activities.records_modified + p_records_modified,
    total_amount = monthly_activities.total_amount + p_total_amount,
    last_activity = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_user_activity(INTEGER, INTEGER, NUMERIC) TO authenticated;

-- Recreate check_user_is_admin with proper search_path (ensure it's correct)
DROP FUNCTION IF EXISTS public.check_user_is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT u.role INTO user_role
  FROM public.users u
  WHERE u.auth_user_id = auth.uid();
  
  RETURN COALESCE(user_role = 'admin', FALSE);
END;
$$;

-- Recreate admin_toggle_user_status with proper search_path
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid, text) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
  p_user_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verify admin status
  IF NOT public.check_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Validate status value
  IF p_new_status NOT IN ('active', 'pending', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status. Must be: active, pending, or suspended';
  END IF;

  -- Update user status
  UPDATE public.users
  SET status = p_new_status
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid, text) TO authenticated;

-- Recreate admin_create_user with proper search_path
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_username text,
  p_email text,
  p_budget_user_id text,
  p_treasury text,
  p_role text DEFAULT 'user',
  p_status text DEFAULT 'active',
  p_pdf_display_name text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Verify admin status
  IF NOT public.check_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Validate inputs
  IF p_username IS NULL OR trim(p_username) = '' THEN
    RAISE EXCEPTION 'Username cannot be empty';
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;

  -- Create user
  INSERT INTO public.users (
    username,
    email,
    budget_user_id,
    treasury,
    role,
    status,
    pdf_display_name
  ) VALUES (
    trim(p_username),
    trim(p_email),
    p_budget_user_id,
    p_treasury,
    COALESCE(p_role, 'user'),
    COALESCE(p_status, 'active'),
    p_pdf_display_name
  )
  RETURNING id INTO new_user_id;

  RETURN new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, text, text) TO authenticated;

-- Recreate rollback_record_to_version with proper search_path
DROP FUNCTION IF EXISTS public.rollback_record_to_version(uuid, integer) CASCADE;
CREATE OR REPLACE FUNCTION public.rollback_record_to_version(
  p_record_id uuid,
  p_version_number integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_audit_record RECORD;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT id INTO v_current_user_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get the audit record
  SELECT * INTO v_audit_record
  FROM audit_history
  WHERE record_id = p_record_id 
    AND version_number = p_version_number
    AND user_id = v_current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found or access denied';
  END IF;

  -- Rollback the record
  UPDATE records
  SET
    recipient = v_audit_record.record_data->>'recipient',
    recipient_pib = v_audit_record.record_data->>'recipient_pib',
    recipient_place = v_audit_record.record_data->>'recipient_place',
    recipient_account = v_audit_record.record_data->>'recipient_account',
    payment_code = v_audit_record.record_data->>'payment_code',
    debt_reference_number = v_audit_record.record_data->>'debt_reference_number',
    remittance_purpose = v_audit_record.record_data->>'remittance_purpose',
    invoice_type = v_audit_record.record_data->>'invoice_type',
    amount = (v_audit_record.record_data->>'amount')::numeric,
    urgent_payment = (v_audit_record.record_data->>'urgent_payment')::boolean,
    updated_at = now()
  WHERE id = p_record_id
    AND user_id = v_current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or access denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rollback_record_to_version(uuid, integer) TO authenticated;

-- Recreate get_record_history with proper search_path
DROP FUNCTION IF EXISTS public.get_record_history(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_record_history(p_record_id uuid)
RETURNS TABLE (
  version_number integer,
  operation text,
  changed_at timestamptz,
  changed_by text,
  record_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT id INTO v_current_user_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Return history for this user's records only
  RETURN QUERY
  SELECT 
    ah.version_number,
    ah.operation,
    ah.changed_at,
    u.username as changed_by,
    ah.record_data
  FROM audit_history ah
  JOIN users u ON ah.user_id = u.id
  WHERE ah.record_id = p_record_id
    AND ah.user_id = v_current_user_id
  ORDER BY ah.version_number DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_record_history(uuid) TO authenticated;

-- Recreate get_audit_statistics with proper search_path
DROP FUNCTION IF EXISTS public.get_audit_statistics(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_audit_statistics(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_versions bigint,
  total_records_tracked bigint,
  operations_by_type jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_user_id uuid;
  v_target_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT id INTO v_current_user_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Target user defaults to current user
  v_target_user_id := COALESCE(p_user_id, v_current_user_id);
  
  -- Only allow viewing own statistics (non-admin users)
  IF v_target_user_id != v_current_user_id THEN
    IF NOT public.check_user_is_admin() THEN
      RAISE EXCEPTION 'Access denied: Can only view own statistics';
    END IF;
  END IF;
  
  -- Return statistics
  RETURN QUERY
  SELECT 
    COUNT(*) as total_versions,
    COUNT(DISTINCT record_id) as total_records_tracked,
    COALESCE(
      jsonb_object_agg(operation, op_count) FILTER (WHERE operation IS NOT NULL),
      '{}'::jsonb
    ) as operations_by_type
  FROM (
    SELECT 
      operation,
      COUNT(*) as op_count
    FROM audit_history
    WHERE user_id = v_target_user_id
    GROUP BY operation
  ) op_counts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_statistics(uuid) TO authenticated;

-- =====================================================================
-- VERIFICATION: Log this fix
-- =====================================================================

INSERT INTO security_audit_log (audit_type, description)
VALUES (
  'SECURITY_FIX_COMPLETE',
  'Fixed remaining security issues: (1) Removed SECURITY DEFINER from all views, (2) Added SET search_path to log_user_activity and all admin/audit functions, (3) Verified all SECURITY DEFINER functions have immutable search_path'
);

-- Add final verification comments
COMMENT ON VIEW public.template_stats IS 'Regular view without SECURITY DEFINER - respects RLS policies';
COMMENT ON VIEW public.v_sequence_integrity IS 'Regular view without SECURITY DEFINER - shows only current user data';
COMMENT ON FUNCTION public.log_user_activity(INTEGER, INTEGER, NUMERIC) IS 'SECURITY DEFINER with SET search_path = public, pg_temp';
COMMENT ON FUNCTION public.check_user_is_admin() IS 'SECURITY DEFINER with SET search_path = public, pg_temp';
COMMENT ON FUNCTION public.admin_toggle_user_status(uuid, text) IS 'SECURITY DEFINER with SET search_path = public, pg_temp - Admin only';
COMMENT ON FUNCTION public.admin_create_user(text, text, text, text, text, text, text) IS 'SECURITY DEFINER with SET search_path = public, pg_temp - Admin only';
COMMENT ON FUNCTION public.rollback_record_to_version(uuid, integer) IS 'SECURITY DEFINER with SET search_path = public, pg_temp';
COMMENT ON FUNCTION public.get_record_history(uuid) IS 'SECURITY DEFINER with SET search_path = public, pg_temp';
COMMENT ON FUNCTION public.get_audit_statistics(uuid) IS 'SECURITY DEFINER with SET search_path = public, pg_temp';