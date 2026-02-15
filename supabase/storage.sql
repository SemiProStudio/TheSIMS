-- =============================================================================
-- DEPRECATED: This file is kept for reference only.
-- The source of truth for the database schema is supabase/migrations/.
-- To set up a new database, run: supabase db reset
-- To apply new changes, create a new migration: supabase migration new <name>
-- =============================================================================
--
-- SIMS Storage Setup
-- =============================================================================

-- Create the equipment-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-images',
  'equipment-images',
  true,  -- Public bucket (images accessible without auth)
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- Storage Policies
-- =============================================================================

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-images');

-- Allow public read access (since bucket is public)
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'equipment-images');

-- =============================================================================
-- Notes
-- =============================================================================
-- 
-- Image URLs will be in the format:
-- https://[project-id].supabase.co/storage/v1/object/public/equipment-images/[item-id]/[timestamp].[ext]
--
-- The inventory.image field should store the full URL, not base64 data.
-- Maximum file size is 5MB.
-- Allowed formats: JPEG, PNG, WebP, GIF
-- 
-- To manually create the bucket via the Supabase Dashboard:
-- 1. Go to Storage in your Supabase project
-- 2. Click "New bucket"
-- 3. Name: equipment-images
-- 4. Check "Public bucket"
-- 5. Set file size limit to 5MB
-- 6. Add allowed MIME types: image/jpeg, image/png, image/webp, image/gif
