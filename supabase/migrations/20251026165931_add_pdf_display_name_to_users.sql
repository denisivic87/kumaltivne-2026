/*
  # Add PDF Display Name to Users Table

  1. New Column
    - `pdf_display_name` (text, nullable)
      - User-friendly name for PDF documents
      - Separate from login username
      - Defaults to NULL (will fall back to username if not set)
      - Max 200 characters recommended
      
  2. Changes
    - Add column to public.users table
    - No RLS changes needed (inherits from users table policies)
    - Admins can update via existing policies
    
  3. Usage
    - Used in PDF generation/printing
    - Displayed on printed documents
    - Optional field (can be left empty)
*/

-- Add pdf_display_name column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pdf_display_name text;

-- Add comment for documentation
COMMENT ON COLUMN public.users.pdf_display_name IS 
  'Display name used in PDF documents and printed reports. If NULL, username will be used as fallback.';

-- Create index for faster lookups (optional, useful if searching by PDF name)
CREATE INDEX IF NOT EXISTS idx_users_pdf_display_name 
  ON public.users(pdf_display_name) 
  WHERE pdf_display_name IS NOT NULL;
