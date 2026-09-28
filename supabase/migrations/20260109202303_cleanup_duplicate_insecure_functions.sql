/*
  # Cleanup Duplicate Insecure Functions

  ## Issue
  Multiple versions of the same functions exist - some with secure search_path, some without.
  This happens when function signatures change during CREATE OR REPLACE.

  ## Fix
  Drop all OLD insecure versions and keep only the secure ones.

  ## Functions to Clean
  - log_user_activity (old signature)
  - rollback_record_to_version (old signature)
  - get_record_history (old signature)
  - get_audit_statistics (old signature)
  - check_user_is_admin (old signature)
  - admin_toggle_user_status (old signature)
  - admin_create_user (old signature)
*/

-- Drop old insecure version of log_user_activity
DROP FUNCTION IF EXISTS public.log_user_activity(text, jsonb) CASCADE;

-- Drop old insecure version of rollback_record_to_version
DROP FUNCTION IF EXISTS public.rollback_record_to_version(uuid, uuid) CASCADE;

-- Drop old insecure version of get_record_history
DROP FUNCTION IF EXISTS public.get_record_history(uuid, uuid) CASCADE;

-- Drop old insecure version of get_audit_statistics
DROP FUNCTION IF EXISTS public.get_audit_statistics(uuid, timestamptz, timestamptz) CASCADE;

-- Drop old insecure version of check_user_is_admin
DROP FUNCTION IF EXISTS public.check_user_is_admin(uuid) CASCADE;

-- Drop old insecure version of admin_toggle_user_status
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid, boolean) CASCADE;

-- Drop old insecure version of admin_create_user
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text, text) CASCADE;

-- Log the cleanup
INSERT INTO security_audit_log (audit_type, description)
VALUES (
  'CLEANUP_INSECURE_FUNCTIONS',
  'Removed duplicate insecure function versions. Only secure versions with SET search_path remain.'
);

-- Add verification comment
COMMENT ON SCHEMA public IS 'All SECURITY DEFINER functions now have SET search_path = public, pg_temp. Duplicate insecure versions removed.';