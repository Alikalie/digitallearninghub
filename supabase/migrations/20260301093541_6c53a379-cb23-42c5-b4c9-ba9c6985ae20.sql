-- 1) Make role checks hierarchy-aware so super_admin satisfies admin checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin'::app_role AND role = 'super_admin'::app_role)
      )
  )
$$;

-- 2) Allow authenticated users to self-insert only their own default student role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Users can create their own student role'
  ) THEN
    CREATE POLICY "Users can create their own student role"
      ON public.user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id AND role = 'student'::app_role);
  END IF;
END $$;

-- 3) Make admin-managed site settings visible to all visitors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_settings'
      AND policyname = 'Public can read site settings'
  ) THEN
    CREATE POLICY "Public can read site settings"
      ON public.admin_settings
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 4) Ensure one row per admin setting key for reliable saves
DELETE FROM public.admin_settings a
USING public.admin_settings b
WHERE a.key = b.key
  AND (
    a.updated_at < b.updated_at
    OR (a.updated_at = b.updated_at AND a.id < b.id)
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_settings_key_unique'
  ) THEN
    ALTER TABLE public.admin_settings
      ADD CONSTRAINT admin_settings_key_unique UNIQUE (key);
  END IF;
END $$;

-- 5) Create bucket for admin-uploaded course images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

-- 6) Storage policies for course-images bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Course images are public'
  ) THEN
    CREATE POLICY "Course images are public"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'course-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload course images'
  ) THEN
    CREATE POLICY "Admins can upload course images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'course-images'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update course images'
  ) THEN
    CREATE POLICY "Admins can update course images"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'course-images'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      )
      WITH CHECK (
        bucket_id = 'course-images'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete course images'
  ) THEN
    CREATE POLICY "Admins can delete course images"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'course-images'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;