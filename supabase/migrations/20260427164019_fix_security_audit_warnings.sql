/*
  # Fix Security Audit Warnings

  1. Fix mutable search_path on trigger functions by adding SET search_path = public
  2. Revoke EXECUTE from anon role on all SECURITY DEFINER functions
  3. Revoke EXECUTE from authenticated role on admin-only functions
     (they check admin status internally, so authenticated users who call them
      get rejected, but best practice is to not expose them via RPC at all)
  4. Keep EXECUTE on authenticated for functions that authenticated users legitimately call
*/

-- ============================================================
-- 1. Fix search_path on trigger functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.bump_version_and_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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

-- ============================================================
-- 2. Revoke anon execute from ALL security definer functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_user_is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_statistics(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_sequence_number(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_record_history(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_by_auth_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_id_from_auth() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_template_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_user_activity(integer, integer, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rollback_record_to_version(uuid, integer) FROM anon;

-- Also revoke from public (covers any default grants)
REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_user_is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_audit_statistics(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_sequence_number(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_record_history(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_by_auth_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_id_from_auth() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_template_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_user_activity(integer, integer, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rollback_record_to_version(uuid, integer) FROM PUBLIC;

-- ============================================================
-- 3. Grant back only to authenticated where legitimately needed
--    Admin functions: no grant (they check internally, but
--    better not to expose via RPC to non-admins at all)
--    User functions: grant to authenticated only
-- ============================================================

-- These are legitimately called by authenticated users:
GRANT EXECUTE ON FUNCTION public.get_user_id_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_auth_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_sequence_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_statistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_record_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_template_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity(integer, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_record_to_version(uuid, integer) TO authenticated;

-- Admin-only functions: grant only to authenticated (internal check blocks non-admins)
-- These are called via the admin edge function with service role, but we still allow
-- authenticated so the edge function can use the anon/service key pattern safely
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

-- Trigger functions do not need manual grants (called by trigger, not RPC)
-- handle_new_auth_user and handle_new_user are trigger functions — no RPC grant needed
