
-- Tighten post_reactions SELECT to only members of the classroom
DROP POLICY "Authenticated users can view reactions" ON public.post_reactions;
CREATE POLICY "Members can view reactions" ON public.post_reactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.classroom_posts cp
    JOIN public.classroom_members cm ON cm.classroom_id = cp.classroom_id
    WHERE cp.id = post_id AND cm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.classroom_posts cp
    JOIN public.classrooms c ON c.id = cp.classroom_id
    WHERE cp.id = post_id AND c.tutor_id = auth.uid()
  )
);
