import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Upload, Globe, Phone, Mail, MapPin, Video, Music } from "lucide-react";

interface SettingsForm {
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_address: string;
  footer_text: string;
  demo_video_url: string;
  anthem_video_url: string;
  site_name: string;
  site_tagline: string;
}

export function SiteManagementTab() {
  const [form, setForm] = useState<SettingsForm>({
    contact_email: "",
    contact_phone: "",
    contact_whatsapp: "",
    contact_address: "",
    footer_text: "",
    demo_video_url: "",
    anthem_video_url: "",
    site_name: "",
    site_tagline: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDemo, setUploadingDemo] = useState(false);
  const [uploadingAnthem, setUploadingAnthem] = useState(false);
  const demoRef = useRef<HTMLInputElement>(null);
  const anthemRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("admin_settings").select("key, value");
    if (data) {
      const updated = { ...form };
      data.forEach((row) => {
        const key = row.key as keyof SettingsForm;
        if (key in updated && row.value !== null) {
          updated[key] = typeof row.value === "string" ? row.value : String(row.value);
        }
      });
      setForm(updated);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const keys = Object.keys(form) as (keyof SettingsForm)[];
    for (const key of keys) {
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("admin_settings")
          .update({ value: form[key] as any, updated_at: new Date().toISOString() })
          .eq("key", key);
      } else {
        await supabase
          .from("admin_settings")
          .insert({ key, value: form[key] as any });
      }
    }
    setSaving(false);
    toast.success("Site settings saved!");
  };

  const uploadVideo = async (file: File, type: "demo" | "anthem") => {
    const setUploading = type === "demo" ? setUploadingDemo : setUploadingAnthem;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${type}-video-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("dlh-videos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("dlh-videos").getPublicUrl(path);
    const url = urlData.publicUrl;
    setForm((f) => ({ ...f, [`${type}_video_url`]: url }));
    // Save immediately
    const key = `${type}_video_url`;
    const { data: existing } = await supabase.from("admin_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("admin_settings").update({ value: url as any, updated_at: new Date().toISOString() }).eq("key", key);
    } else {
      await supabase.from("admin_settings").insert({ key, value: url as any });
    }
    toast.success(`${type === "demo" ? "Demo" : "Anthem"} video uploaded!`);
    setUploading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="dlh-card p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Phone size={20} /> Contact Information</h3>
        <p className="text-sm text-muted-foreground mb-4">This information will appear in the website footer for students to contact admins.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="flex items-center gap-1"><Mail size={14} /> Email</Label><Input value={form.contact_email} onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))} className="mt-1" /></div>
          <div><Label className="flex items-center gap-1"><Phone size={14} /> Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))} className="mt-1" /></div>
          <div><Label>WhatsApp</Label><Input value={form.contact_whatsapp} onChange={(e) => setForm(f => ({ ...f, contact_whatsapp: e.target.value }))} className="mt-1" /></div>
          <div><Label className="flex items-center gap-1"><MapPin size={14} /> Address</Label><Input value={form.contact_address} onChange={(e) => setForm(f => ({ ...f, contact_address: e.target.value }))} className="mt-1" /></div>
        </div>
      </div>

      {/* Site & Footer */}
      <div className="dlh-card p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Globe size={20} /> Site & Footer</h3>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Site Name</Label><Input value={form.site_name} onChange={(e) => setForm(f => ({ ...f, site_name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Tagline</Label><Input value={form.site_tagline} onChange={(e) => setForm(f => ({ ...f, site_tagline: e.target.value }))} className="mt-1" /></div>
          </div>
          <div><Label>Footer Text</Label><Textarea value={form.footer_text} onChange={(e) => setForm(f => ({ ...f, footer_text: e.target.value }))} className="mt-1" rows={2} /></div>
        </div>
      </div>

      {/* Video Uploads */}
      <div className="dlh-card p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Video size={20} /> DLH Videos</h3>
        <p className="text-sm text-muted-foreground mb-4">Upload a demo video and anthem video for the landing page.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Demo Video */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1"><Video size={14} /> Demo Video</Label>
            {form.demo_video_url && (
              <video src={form.demo_video_url} controls className="w-full rounded-lg border border-border aspect-video bg-black" />
            )}
            <input ref={demoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadVideo(e.target.files[0], "demo"); }} />
            <Button variant="outline" onClick={() => demoRef.current?.click()} disabled={uploadingDemo} className="w-full">
              {uploadingDemo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {form.demo_video_url ? "Replace Demo Video" : "Upload Demo Video"}
            </Button>
            <div><Label className="text-xs">Or paste URL</Label><Input value={form.demo_video_url} onChange={(e) => setForm(f => ({ ...f, demo_video_url: e.target.value }))} className="mt-1 text-xs" placeholder="https://..." /></div>
          </div>
          {/* Anthem Video */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1"><Music size={14} /> Anthem Video</Label>
            {form.anthem_video_url && (
              <video src={form.anthem_video_url} controls className="w-full rounded-lg border border-border aspect-video bg-black" />
            )}
            <input ref={anthemRef} type="file" accept="video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadVideo(e.target.files[0], "anthem"); }} />
            <Button variant="outline" onClick={() => anthemRef.current?.click()} disabled={uploadingAnthem} className="w-full">
              {uploadingAnthem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {form.anthem_video_url ? "Replace Anthem Video" : "Upload Anthem Video"}
            </Button>
            <div><Label className="text-xs">Or paste URL</Label><Input value={form.anthem_video_url} onChange={(e) => setForm(f => ({ ...f, anthem_video_url: e.target.value }))} className="mt-1 text-xs" placeholder="https://..." /></div>
          </div>
        </div>
      </div>

      <Button onClick={saveSettings} disabled={saving} className="bg-gradient-primary">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save All Settings
      </Button>
    </div>
  );
}
