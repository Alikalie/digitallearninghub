ALTER TABLE public.course_progress 
  ADD COLUMN IF NOT EXISTS watch_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS course_progress_user_lesson_uidx 
  ON public.course_progress(user_id, lesson_id);