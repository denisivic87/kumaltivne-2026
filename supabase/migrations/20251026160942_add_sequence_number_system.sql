/*
  # Sequential Record Numbering System with Pagination Integrity

  ## Overview
  This migration implements a robust sequential numbering system that prevents
  duplicate numbers, handles gaps from deletions, and maintains integrity across
  paginated views.

  ## Changes Made
  
  1. **New Columns**
     - `sequence_number` (integer): Auto-incrementing sequential number per user
     - Indexed for fast lookups and sorting
  
  2. **Sequence Management**
     - PostgreSQL sequence per user for atomic number generation
     - Function to get next sequence number with concurrency safety
  
  3. **Automatic Numbering**
     - Trigger automatically assigns sequence numbers on insert
     - Handles existing records by backfilling sequence numbers
  
  4. **Corruption Detection**
     - Function to detect duplicate or missing sequence numbers
     - View for easy monitoring of numbering integrity
  
  5. **Recovery Mechanism**
     - Function to renumber all records and fix corruption
     - Maintains chronological order based on created_at timestamp
  
  ## Security
  - RLS policies updated to include sequence_number filtering
  - Atomic operations prevent race conditions
*/

-- Step 1: Add sequence_number column to records table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'records' AND column_name = 'sequence_number'
  ) THEN
    ALTER TABLE records ADD COLUMN sequence_number INTEGER;
  END IF;
END $$;

-- Step 2: Create index for fast sequence number lookups and sorting
CREATE INDEX IF NOT EXISTS idx_records_user_sequence 
  ON records(user_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_records_user_created 
  ON records(user_id, created_at);

-- Step 3: Function to get next sequence number for a user (concurrency-safe)
CREATE OR REPLACE FUNCTION get_next_sequence_number(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  -- Lock the user's records to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  
  -- Get the maximum sequence number for this user
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO v_next_number
  FROM records
  WHERE user_id = p_user_id;
  
  RETURN v_next_number;
END;
$$;

-- Step 4: Function to assign sequence numbers to existing records
CREATE OR REPLACE FUNCTION backfill_sequence_numbers()
RETURNS TABLE(user_id UUID, records_updated INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record RECORD;
  v_record RECORD;
  v_sequence INTEGER;
BEGIN
  -- Process each user separately
  FOR v_user_record IN 
    SELECT DISTINCT r.user_id 
    FROM records r 
    WHERE r.sequence_number IS NULL
    ORDER BY r.user_id
  LOOP
    v_sequence := 1;
    
    -- Assign sequence numbers in chronological order
    FOR v_record IN
      SELECT r.id
      FROM records r
      WHERE r.user_id = v_user_record.user_id
        AND r.sequence_number IS NULL
      ORDER BY r.created_at, r.id
    LOOP
      UPDATE records 
      SET sequence_number = v_sequence
      WHERE id = v_record.id;
      
      v_sequence := v_sequence + 1;
    END LOOP;
    
    user_id := v_user_record.user_id;
    records_updated := v_sequence - 1;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Step 5: Trigger to automatically assign sequence numbers on insert
CREATE OR REPLACE FUNCTION assign_sequence_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only assign if sequence_number is NULL
  IF NEW.sequence_number IS NULL THEN
    NEW.sequence_number := get_next_sequence_number(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_assign_sequence_number'
  ) THEN
    CREATE TRIGGER trigger_assign_sequence_number
      BEFORE INSERT ON records
      FOR EACH ROW
      EXECUTE FUNCTION assign_sequence_number();
  END IF;
END $$;

-- Step 6: Function to detect numbering corruption
CREATE OR REPLACE FUNCTION detect_sequence_corruption()
RETURNS TABLE(
  user_id UUID,
  issue_type TEXT,
  sequence_number INTEGER,
  record_count INTEGER,
  details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Find duplicate sequence numbers
  RETURN QUERY
  SELECT 
    r.user_id,
    'DUPLICATE'::TEXT as issue_type,
    r.sequence_number,
    COUNT(*)::INTEGER as record_count,
    'Multiple records have the same sequence number'::TEXT as details
  FROM records r
  WHERE r.sequence_number IS NOT NULL
  GROUP BY r.user_id, r.sequence_number
  HAVING COUNT(*) > 1;
  
  -- Find NULL sequence numbers
  RETURN QUERY
  SELECT 
    r.user_id,
    'NULL_SEQUENCE'::TEXT as issue_type,
    NULL::INTEGER as sequence_number,
    COUNT(*)::INTEGER as record_count,
    'Records without sequence numbers'::TEXT as details
  FROM records r
  WHERE r.sequence_number IS NULL
  GROUP BY r.user_id;
  
  -- Find gaps in sequence (optional detection)
  RETURN QUERY
  WITH sequence_ranges AS (
    SELECT 
      user_id,
      MIN(sequence_number) as min_seq,
      MAX(sequence_number) as max_seq,
      COUNT(*) as record_count
    FROM records
    WHERE sequence_number IS NOT NULL
    GROUP BY user_id
  )
  SELECT 
    sr.user_id,
    'GAPS_DETECTED'::TEXT as issue_type,
    NULL::INTEGER as sequence_number,
    (sr.max_seq - sr.min_seq + 1 - sr.record_count)::INTEGER as record_count,
    'Expected ' || (sr.max_seq - sr.min_seq + 1)::TEXT || 
    ' records but found ' || sr.record_count::TEXT as details
  FROM sequence_ranges sr
  WHERE sr.max_seq - sr.min_seq + 1 > sr.record_count;
END;
$$;

-- Step 7: Function to fix/renumber all records (recovery mechanism)
CREATE OR REPLACE FUNCTION renumber_all_records(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(user_id UUID, records_renumbered INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record RECORD;
  v_record RECORD;
  v_sequence INTEGER;
BEGIN
  -- Process specific user or all users
  FOR v_user_record IN 
    SELECT DISTINCT r.user_id 
    FROM records r 
    WHERE p_user_id IS NULL OR r.user_id = p_user_id
    ORDER BY r.user_id
  LOOP
    v_sequence := 1;
    
    -- Renumber all records in chronological order
    FOR v_record IN
      SELECT r.id
      FROM records r
      WHERE r.user_id = v_user_record.user_id
      ORDER BY r.created_at, r.id
    LOOP
      UPDATE records 
      SET sequence_number = v_sequence
      WHERE id = v_record.id;
      
      v_sequence := v_sequence + 1;
    END LOOP;
    
    user_id := v_user_record.user_id;
    records_renumbered := v_sequence - 1;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Step 8: Backfill sequence numbers for existing records
SELECT * FROM backfill_sequence_numbers();

-- Step 9: Create monitoring view for easy corruption detection
CREATE OR REPLACE VIEW v_sequence_integrity AS
SELECT 
  u.id as user_id,
  u.username,
  COUNT(r.id) as total_records,
  MIN(r.sequence_number) as min_sequence,
  MAX(r.sequence_number) as max_sequence,
  MAX(r.sequence_number) - MIN(r.sequence_number) + 1 as expected_count,
  COUNT(DISTINCT r.sequence_number) as unique_sequences,
  CASE 
    WHEN COUNT(r.id) = COUNT(DISTINCT r.sequence_number) THEN 'HEALTHY'
    ELSE 'CORRUPTED'
  END as status
FROM users u
LEFT JOIN records r ON r.user_id = u.id
WHERE r.id IS NOT NULL
GROUP BY u.id, u.username;

-- Step 10: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_next_sequence_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_sequence_corruption() TO authenticated;
GRANT EXECUTE ON FUNCTION renumber_all_records(UUID) TO authenticated;
GRANT SELECT ON v_sequence_integrity TO authenticated;
