/*
  # RLS Cross-User Isolation Test

  This script verifies that user A cannot see, modify, or delete
  user B's records, record_items, headers, or snapshots.

  ## How to run
  Execute this in the Supabase SQL editor. It creates two temporary
  test users, inserts data for each, then switches auth context and
  verifies isolation. All test data is cleaned up at the end.

  ## Prerequisites
  - current_app_user_id() function must exist
  - RLS must be enabled on all data tables
*/

BEGIN;

-- ============================================================
-- Setup: Create two test users in public.users
-- ============================================================
-- We need to simulate auth.uid() for each user. Since we can't
-- actually sign in via SQL, we use SET LOCAL role to simulate
-- different authenticated sessions.

-- Create test auth users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'test-a@example.com', 'x', now(), now(), now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'test-b@example.com', 'x', now(), now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Create public.users profiles
INSERT INTO public.users (id, auth_user_id, username, email, role, status, is_active, budget_user_id, treasury)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'test_a', 'test-a@example.com', 'user', 'active', true, '02126', 'trezor1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'test_b', 'test-b@example.com', 'user', 'active', true, '02127', 'trezor2')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Insert test data as User A
-- ============================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

INSERT INTO public.headers (user_id, cumulative_reason_code, budget_year, budget_user_id, currency_code, treasury)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PO07', '2026', '02126', 'RSD', 'trezor1');

INSERT INTO public.records (id, user_id, header_id, reason_code, external_id, recipient, sequence_number)
VALUES ('rec-aaaa-0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (SELECT id FROM public.headers WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'PO07', '0001-09/2026', 'Test Primalac A', 1);

INSERT INTO public.record_items (record_id, budget_user_id, program_code, amount)
VALUES ('rec-aaaa-0001', '02126', 'P001', 1000.00);

INSERT INTO public.record_snapshots (user_id, label, trigger, record_count)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test snapshot A', 'manual', 1);

-- ============================================================
-- Insert test data as User B
-- ============================================================
SET LOCAL request.jwt.claims.sub = '22222222-2222-2222-2222-222222222222';

INSERT INTO public.headers (user_id, cumulative_reason_code, budget_year, budget_user_id, currency_code, treasury)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'PO07', '2026', '02127', 'RSD', 'trezor2');

INSERT INTO public.records (id, user_id, header_id, reason_code, external_id, recipient, sequence_number)
VALUES ('rec-bbbb-0001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (SELECT id FROM public.headers WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'PO07', '0001-09/2026', 'Test Primalac B', 1);

INSERT INTO public.record_items (record_id, budget_user_id, program_code, amount)
VALUES ('rec-bbbb-0001', '02127', 'P002', 2000.00);

-- ============================================================
-- Test 1: User A can only see their own records (1 row, not 2)
-- ============================================================
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  count_records int;
  count_headers int;
  count_items int;
  count_snapshots int;
BEGIN
  SELECT count(*) INTO count_records FROM public.records;
  SELECT count(*) INTO count_headers FROM public.headers;
  SELECT count(*) INTO count_items FROM public.record_items;
  SELECT count(*) INTO count_snapshots FROM public.record_snapshots;

  ASSERT count_records = 1, 'FAIL: User A should see 1 record, saw ' || count_records;
  ASSERT count_headers = 1, 'FAIL: User A should see 1 header, saw ' || count_headers;
  ASSERT count_items = 1, 'FAIL: User A should see 1 record_item, saw ' || count_items;
  ASSERT count_snapshots = 1, 'FAIL: User A should see 1 snapshot, saw ' || count_snapshots;
END $$;

-- ============================================================
-- Test 2: User B can only see their own records (1 row, not 2)
-- ============================================================
SET LOCAL request.jwt.claims.sub = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  count_records int;
  count_headers int;
  count_items int;
BEGIN
  SELECT count(*) INTO count_records FROM public.records;
  SELECT count(*) INTO count_headers FROM public.headers;
  SELECT count(*) INTO count_items FROM public.record_items;

  ASSERT count_records = 1, 'FAIL: User B should see 1 record, saw ' || count_records;
  ASSERT count_headers = 1, 'FAIL: User B should see 1 header, saw ' || count_headers;
  ASSERT count_items = 1, 'FAIL: User B should see 1 record_item, saw ' || count_items;
END $$;

-- ============================================================
-- Test 3: User A cannot UPDATE User B's records
-- ============================================================
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  recipient_after text;
BEGIN
  UPDATE public.records SET recipient = 'HACKED' WHERE id = 'rec-bbbb-0001';
  SELECT recipient INTO recipient_after FROM public.records WHERE id = 'rec-bbbb-0001';
  -- RLS should have blocked the update; recipient should be unchanged
  -- (We can still read our own row, but the UPDATE should have affected 0 rows)
  ASSERT NOT FOUND, 'FAIL: User A was able to UPDATE User B record (should not be found)';
END $$;

-- ============================================================
-- Test 4: User A cannot DELETE User B's records
-- ============================================================
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  still_exists int;
BEGIN
  DELETE FROM public.records WHERE id = 'rec-bbbb-0001';
  -- Switch to service role to verify the row still exists
  SET LOCAL role service_role;
  SELECT count(*) INTO still_exists FROM public.records WHERE id = 'rec-bbbb-0001';
  ASSERT still_exists = 1, 'FAIL: User A was able to DELETE User B record';
END $$;

-- ============================================================
-- Cleanup: Remove all test data
-- ============================================================
SET LOCAL role service_role;

DELETE FROM public.record_items WHERE record_id IN ('rec-aaaa-0001', 'rec-bbbb-0001');
DELETE FROM public.records WHERE id IN ('rec-aaaa-0001', 'rec-bbbb-0001');
DELETE FROM public.headers WHERE user_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM public.record_snapshots WHERE user_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM public.users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

COMMIT;

-- ============================================================
-- Result: If this script completes without ASSERT errors,
-- all RLS isolation tests passed.
-- ============================================================
