
-- Create storage bucket for DLH videos (demo & anthem)
INSERT INTO storage.buckets (id, name, public) VALUES ('dlh-videos', 'dlh-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video bucket
CREATE POLICY "Anyone can view DLH videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'dlh-videos');

CREATE POLICY "Admins can upload DLH videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dlh-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update DLH videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'dlh-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete DLH videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'dlh-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default site settings for contact, footer, and videos
INSERT INTO public.admin_settings (key, value) VALUES
  ('contact_email', '"info@dlhub.com"'),
  ('contact_phone', '"+232 XX XXX XXXX"'),
  ('contact_whatsapp', '"+232 XX XXX XXXX"'),
  ('contact_address', '"Freetown, Sierra Leone"'),
  ('footer_text', '"© Digital Learning Hub. Made by Alikalie. All rights reserved."'),
  ('demo_video_url', '""'),
  ('anthem_video_url', '""'),
  ('site_name', '"Digital Learning Hub"'),
  ('site_tagline', '"AI-Powered Education Platform"')
ON CONFLICT DO NOTHING;

-- Add super_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
