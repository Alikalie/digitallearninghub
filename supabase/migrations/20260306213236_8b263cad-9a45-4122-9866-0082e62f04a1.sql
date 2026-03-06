INSERT INTO storage.buckets (id, name, public) VALUES ('bot-knowledge', 'bot-knowledge', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload bot knowledge files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bot-knowledge' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete bot knowledge files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bot-knowledge' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can view bot knowledge files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bot-knowledge');

CREATE POLICY "Admins can manage all lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));