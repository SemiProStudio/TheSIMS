-- =============================================================================
-- Image bucket: cap what gets STORED, not what users may pick
-- =============================================================================
-- The client pipeline (lib/imageProcessing.js) downscales every image to two
-- JPEG renditions — full ≤ 1600px (capped at 1.5 MB via a quality ladder) and
-- a 480px thumbnail — before upload. The bucket limit is the server-side
-- backstop behind that: anything larger is a bug, never a legitimate photo.
-- 5 MB → 2 MB. Allowed types unchanged (the orphan-sweep tooling may still
-- move legacy PNGs).

UPDATE storage.buckets
SET file_size_limit = 2097152
WHERE id = 'equipment-images';
