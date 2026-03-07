
-- Tutor applications table
CREATE TABLE public.tutor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  answers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications" ON public.tutor_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON public.tutor_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage applications" ON public.tutor_applications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Classrooms table
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL,
  name text NOT NULL,
  classroom_code text NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  description text,
  max_students integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active classrooms" ON public.classrooms FOR SELECT TO authenticated USING (is_active = true OR auth.uid() = tutor_id);
CREATE POLICY "Tutors can insert classrooms" ON public.classrooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Tutors can update own classrooms" ON public.classrooms FOR UPDATE TO authenticated USING (auth.uid() = tutor_id);
CREATE POLICY "Tutors can delete own classrooms" ON public.classrooms FOR DELETE TO authenticated USING (auth.uid() = tutor_id);
CREATE POLICY "Admins can manage all classrooms" ON public.classrooms FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Classroom members
CREATE TABLE public.classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, user_id)
);
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view members of their classrooms" ON public.classroom_members FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_id AND tutor_id = auth.uid())
);
CREATE POLICY "Users can join classrooms" ON public.classroom_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave classrooms" ON public.classroom_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Tutors can manage members" ON public.classroom_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_id AND tutor_id = auth.uid())
);
CREATE POLICY "Admins can manage all members" ON public.classroom_members FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Classroom posts
CREATE TABLE public.classroom_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  post_type text NOT NULL DEFAULT 'post' CHECK (post_type IN ('post', 'assignment', 'quiz', 'material')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classroom_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classroom members can view posts" ON public.classroom_posts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classroom_members WHERE classroom_id = classroom_posts.classroom_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_posts.classroom_id AND tutor_id = auth.uid())
);
CREATE POLICY "Tutors can create posts" ON public.classroom_posts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_id AND tutor_id = auth.uid())
);
CREATE POLICY "Tutors can update own posts" ON public.classroom_posts FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Tutors can delete own posts" ON public.classroom_posts FOR DELETE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Admins can manage all posts" ON public.classroom_posts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Post reactions (emoji)
CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.classroom_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view reactions" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add reactions" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.classroom_posts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  content text,
  file_url text,
  grade text,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, student_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Tutors can view submissions for their posts" ON public.assignment_submissions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classroom_posts cp JOIN public.classrooms c ON c.id = cp.classroom_id WHERE cp.id = post_id AND c.tutor_id = auth.uid())
);
CREATE POLICY "Students can submit" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own submissions" ON public.assignment_submissions FOR UPDATE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Tutors can grade" ON public.assignment_submissions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classroom_posts cp JOIN public.classrooms c ON c.id = cp.classroom_id WHERE cp.id = post_id AND c.tutor_id = auth.uid())
);
CREATE POLICY "Admins can manage submissions" ON public.assignment_submissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Course progress tracking
CREATE TABLE public.course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON public.course_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.course_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.course_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON public.course_progress FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Image generation limits
CREATE TABLE public.image_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.image_generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own log" ON public.image_generation_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own log" ON public.image_generation_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON public.image_generation_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
