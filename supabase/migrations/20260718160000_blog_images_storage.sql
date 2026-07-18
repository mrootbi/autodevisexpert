-- Public bucket for blog inline / pasted images (CMS editor).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "blog_images_public_read" ON storage.objects;
CREATE POLICY "blog_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "blog_images_anon_insert" ON storage.objects;
CREATE POLICY "blog_images_anon_insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "blog_images_anon_update" ON storage.objects;
CREATE POLICY "blog_images_anon_update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'blog-images')
WITH CHECK (bucket_id = 'blog-images');
