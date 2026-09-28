/*
  # Restrict current_app_user_id() to authenticated role only

  The advisor flagged that current_app_user_id() is callable by anon
  role via the REST API. Revoke EXECUTE from anon and public, grant
  only to authenticated. The function is only used internally by
  RLS policies, never called directly by the client.
*/

REVOKE EXECUTE ON FUNCTION public.current_app_user_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;
