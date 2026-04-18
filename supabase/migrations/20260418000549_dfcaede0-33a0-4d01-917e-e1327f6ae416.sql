
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS icon_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('classroom-icons', 'classroom-icons', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Classroom icons are publicly accessible" ON storage.objects;
CREATE POLICY "Classroom icons are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'classroom-icons');

DROP POLICY IF EXISTS "Authenticated users can upload classroom icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload classroom icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'classroom-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own classroom icons" ON storage.objects;
CREATE POLICY "Users can update their own classroom icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'classroom-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own classroom icons" ON storage.objects;
CREATE POLICY "Users can delete their own classroom icons"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'classroom-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
