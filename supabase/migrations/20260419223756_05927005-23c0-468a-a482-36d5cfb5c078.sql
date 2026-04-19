-- 1. Promote ONLY the first-registered admin to super_admin; demote everyone else
-- Identify the earliest super_admin row by id (stable ordering; profiles created_at is null for these)
WITH first_sa AS (
  SELECT user_id FROM public.user_roles WHERE role = 'super_admin' ORDER BY id ASC LIMIT 1
)
DELETE FROM public.user_roles
WHERE role = 'super_admin'
  AND user_id NOT IN (SELECT user_id FROM first_sa);

-- Ensure that single super_admin user does NOT also have a duplicate 'admin' row
DELETE FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND ur.user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'super_admin');

-- 2. Premium flag on profiles (manual upgrade by super admin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- 3. Edited timestamp for comments
ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz NULL;

-- 4. classroom_files table — files attached to a post (material) by tutor
CREATE TABLE IF NOT EXISTS public.classroom_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.classroom_posts(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  download_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_files_post ON public.classroom_files(post_id);
CREATE INDEX IF NOT EXISTS idx_classroom_files_classroom ON public.classroom_files(classroom_id);

ALTER TABLE public.classroom_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view classroom files"
ON public.classroom_files FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members cm
    WHERE cm.classroom_id = classroom_files.classroom_id AND cm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_files.classroom_id AND c.tutor_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tutors can upload files to their classrooms"
ON public.classroom_files FOR INSERT TO authenticated
WITH CHECK (
  uploader_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_files.classroom_id AND c.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can delete their files"
ON public.classroom_files FOR DELETE TO authenticated
USING (
  uploader_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_files.classroom_id AND c.tutor_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins manage all files"
ON public.classroom_files FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. classroom_file_downloads — log per-user downloads
CREATE TABLE IF NOT EXISTS public.classroom_file_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.classroom_files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfd_file ON public.classroom_file_downloads(file_id);

ALTER TABLE public.classroom_file_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users log their own downloads"
ON public.classroom_file_downloads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tutor or admin views downloads"
ON public.classroom_file_downloads FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.classroom_files cf
    JOIN public.classrooms c ON c.id = cf.classroom_id
    WHERE cf.id = classroom_file_downloads.file_id AND c.tutor_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Increment download counter via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.increment_file_download(_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only members or tutor or admin should be able to do this
  IF NOT EXISTS (
    SELECT 1 FROM public.classroom_files cf
    LEFT JOIN public.classroom_members cm ON cm.classroom_id = cf.classroom_id AND cm.user_id = auth.uid()
    LEFT JOIN public.classrooms c ON c.id = cf.classroom_id
    WHERE cf.id = _file_id AND (cm.user_id = auth.uid() OR c.tutor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.classroom_files SET download_count = download_count + 1 WHERE id = _file_id;
  INSERT INTO public.classroom_file_downloads(file_id, user_id) VALUES (_file_id, auth.uid());
END;
$$;

-- 7. Storage bucket for classroom files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('classroom-files', 'classroom-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — file path layout: {classroom_id}/{uploader_id}/{filename}
CREATE POLICY "Tutors upload to their classroom folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-files'
  AND EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.tutor_id = auth.uid()
  )
);

CREATE POLICY "Members read classroom files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-files'
  AND (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.tutor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Tutors delete their classroom files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classroom-files'
  AND EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.tutor_id = auth.uid()
  )
);