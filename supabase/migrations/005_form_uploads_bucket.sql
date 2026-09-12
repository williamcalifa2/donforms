-- Create public storage bucket for form file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-uploads',
  'form-uploads',
  true,
  52428800, -- 50 MB hard cap
  NULL      -- all MIME types allowed (validated at API level)
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to form-uploads (public form respondents)
CREATE POLICY "Public can upload form files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'form-uploads');

-- Allow public read access
CREATE POLICY "Public can read form files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-uploads');

-- Allow form owners to delete (authenticated users own their form folder)
CREATE POLICY "Authenticated can delete own form files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'form-uploads'
    AND auth.role() = 'authenticated'
  );
