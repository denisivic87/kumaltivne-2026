/*
# Add class_group column to records table

1. Changes
- Adds `class_group` text column to `records` table.
- Default value is empty string ('').
- This field is used to group/classify records (e.g. "Razred 1", "Razred 2")
  for easier sorting and organization in the UI.
- This field is NOT exported to XML — it is for internal use only
  (Excel import/export and table sorting).

2. Security
- No RLS policy changes needed — the column inherits existing table-level RLS.
- No new policies required.

3. Notes
- The column is nullable with a default of '' so existing rows are unaffected.
- The frontend will read/write this column alongside other record fields.
*/

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS class_group text NOT NULL DEFAULT '';
