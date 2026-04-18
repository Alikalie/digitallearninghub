-- Create comments table for classroom posts with threaded replies support
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.classroom_posts(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_comment_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Members of the classroom (or its tutor) can view comments
CREATE POLICY "Members can view comments"
ON public.post_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classroom_posts cp
    LEFT JOIN classroom_members cm ON cm.classroom_id = cp.classroom_id
    LEFT JOIN classrooms c ON c.id = cp.classroom_id
    WHERE cp.id = post_comments.post_id
      AND (cm.user_id = auth.uid() OR c.tutor_id = auth.uid())
  )
);

-- Members of the classroom (or its tutor) can add comments
CREATE POLICY "Members can add comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM classroom_posts cp
    LEFT JOIN classroom_members cm ON cm.classroom_id = cp.classroom_id
    LEFT JOIN classrooms c ON c.id = cp.classroom_id
    WHERE cp.id = post_comments.post_id
      AND (cm.user_id = auth.uid() OR c.tutor_id = auth.uid())
  )
);

CREATE POLICY "Users can update own comments"
ON public.post_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.post_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments"
ON public.post_comments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tutors can manage comments in their classrooms"
ON public.post_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classroom_posts cp
    JOIN classrooms c ON c.id = cp.classroom_id
    WHERE cp.id = post_comments.post_id AND c.tutor_id = auth.uid()
  )
);

CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();