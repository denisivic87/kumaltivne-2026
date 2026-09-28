/*
  # Templates System - Comprehensive Template Management

  ## Overview
  This migration creates a complete template system that allows users to save
  frequently used payment record configurations as reusable templates.

  ## New Tables

  ### `templates`
  Main template storage table
  - `id` (uuid, primary key) - Unique template identifier
  - `user_id` (uuid, foreign key) - Owner of the template
  - `name` (text, NOT NULL) - Template name
  - `description` (text) - Optional description
  - `category` (text, NOT NULL) - Template category for organization
  - `is_shared` (boolean, default false) - Whether template is shared with all users
  - `is_active` (boolean, default true) - Whether template is active/available
  - `template_data` (jsonb, NOT NULL) - The actual template data structure
  - `usage_count` (integer, default 0) - Track how many times template was used
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Template Data Structure (JSONB)
  ```json
  {
    "recipient": "string",
    "recipient_pib": "string",
    "recipient_place": "string",
    "recipient_account": "string",
    "payment_code": "string",
    "debt_reference_number": "string",
    "remittance_purpose": "string",
    "invoice_type": "string",
    "amount": 0,
    "urgent_payment": false
  }
  ```

  ## Security (RLS Policies)
  1. **SELECT**: Users can view their own templates + shared templates
  2. **INSERT**: Authenticated users can create templates (is_shared defaults to false)
  3. **UPDATE**: Users can only update their own templates
  4. **DELETE**: Users can only delete their own templates
  5. **SHARING**: Managed via application layer (admin check)

  ## Indexes
  - `user_id` for fast user queries
  - `category` for category filtering
  - `is_shared` for shared template queries
  - `is_active` for active template filtering

  ## Functions
  - `increment_template_usage()` - Automatically increment usage_count when template is used
  - `update_templates_updated_at()` - Automatically update updated_at timestamp

  ## Important Notes
  - Templates are user-specific by default (is_shared = false)
  - Admin users can share templates via application layer
  - Template data is stored as JSONB for flexibility
  - Usage tracking helps identify popular templates
  - Soft delete via is_active flag
*/

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_shared boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  template_data jsonb NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT templates_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT templates_category_not_empty CHECK (length(trim(category)) > 0),
  CONSTRAINT templates_usage_count_positive CHECK (usage_count >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_shared ON templates(is_shared);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON templates(usage_count DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_templates_user_active ON templates(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_templates_shared_active ON templates(is_shared, is_active) WHERE is_shared = true;

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view own and shared templates" ON templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;

-- RLS Policies

-- SELECT: Users can view their own templates OR shared templates
CREATE POLICY "Users can view own and shared templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (is_shared = true AND is_active = true)
  );

-- INSERT: Users can create their own templates
CREATE POLICY "Users can insert own templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call update_templates_updated_at before UPDATE
DROP TRIGGER IF EXISTS templates_updated_at_trigger ON templates;
CREATE TRIGGER templates_updated_at_trigger
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_template_usage(uuid) TO authenticated;

-- Create view for template statistics (useful for analytics)
CREATE OR REPLACE VIEW template_stats AS
SELECT
  t.id,
  t.name,
  t.category,
  t.is_shared,
  t.usage_count,
  t.created_at,
  u.email as owner_email,
  COALESCE(pu.role = 'admin', false) as owner_is_admin
FROM templates t
JOIN auth.users u ON t.user_id = u.id
LEFT JOIN public.users pu ON pu.auth_user_id = t.user_id
WHERE t.is_active = true;

-- Grant access to the view
GRANT SELECT ON template_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE templates IS 'Stores reusable templates for payment records. Users can create, save, and reuse frequently used configurations.';
COMMENT ON COLUMN templates.template_data IS 'JSONB structure containing all the template field values (recipient, amount, payment_code, etc.)';
COMMENT ON COLUMN templates.is_shared IS 'When true, template is visible to all users. Managed via application layer for admin users.';
COMMENT ON COLUMN templates.usage_count IS 'Tracks how many times this template has been used. Incremented via increment_template_usage() function.';
