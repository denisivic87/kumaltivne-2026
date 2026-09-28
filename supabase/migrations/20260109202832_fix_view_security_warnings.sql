/*
  # Fix View Security Warnings

  ## Purpose
  Address Supabase security scanner warnings about views

  ## Changes
  1. Recreate views with explicit security context
  2. Ensure views properly respect RLS policies
  3. Add security invoker context where needed
  4. Document view security model

  ## Views Updated
  - `template_stats` - Template statistics (respects RLS)
  - `v_sequence_integrity` - Sequence integrity monitoring (user-scoped)
*/

-- Drop and recreate template_stats view
-- This view shows template statistics and respects RLS policies on underlying tables
DROP VIEW IF EXISTS public.template_stats CASCADE;

CREATE VIEW public.template_stats 
WITH (security_invoker = true)
AS
SELECT 
  t.id,
  t.name,
  t.category,
  t.is_shared,
  t.usage_count,
  t.created_at,
  pu.username AS owner_username,
  COALESCE(pu.role = 'admin', false) AS owner_is_admin
FROM public.templates t
LEFT JOIN public.users pu ON pu.id = t.user_id
WHERE t.is_active = true;

-- Drop and recreate v_sequence_integrity view  
-- This view shows sequence integrity for current user only
DROP VIEW IF EXISTS public.v_sequence_integrity CASCADE;

CREATE VIEW public.v_sequence_integrity
WITH (security_invoker = true)
AS
WITH user_sequences AS (
  SELECT 
    r.user_id,
    u.username,
    COUNT(*) AS total_records,
    COUNT(r.sequence_number) AS records_with_sequence,
    MAX(r.sequence_number) AS max_sequence,
    MIN(r.sequence_number) AS min_sequence
  FROM public.records r
  JOIN public.users u ON r.user_id = u.id
  WHERE r.user_id = (
    SELECT id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
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
    WHEN max_sequence <> records_with_sequence THEN 'GAPS_OR_DUPLICATES'
    ELSE 'HEALTHY'
  END AS integrity_status,
  CASE
    WHEN records_with_sequence = 0 THEN 'All records missing sequence numbers'
    WHEN records_with_sequence < total_records THEN 
      (total_records - records_with_sequence)::text || ' records without sequence numbers'
    WHEN max_sequence <> records_with_sequence THEN 
      'Expected max sequence ' || records_with_sequence::text || ' but found ' || max_sequence::text
    ELSE 'Sequence integrity is good'
  END AS issue_description
FROM user_sequences;

-- Add documentation
COMMENT ON VIEW public.template_stats IS 
  'Template statistics view with security_invoker=true. Respects RLS policies on underlying tables. Shows only templates accessible to current user.';

COMMENT ON VIEW public.v_sequence_integrity IS 
  'Sequence integrity monitoring view with security_invoker=true. Shows data only for current authenticated user. No privilege escalation.';

-- Verify RLS is enabled on underlying tables
DO $$
BEGIN
  -- Ensure RLS is enabled on templates table
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'templates' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Ensure RLS is enabled on records table
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'records' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Ensure RLS is enabled on users table
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;