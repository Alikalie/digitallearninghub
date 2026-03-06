import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Loader2, Save, Upload, Trash2, FileText, Image, File } from "lucide-react";

interface KnowledgeFile {
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

export function BotKnowledgeTab() {
  const [knowledge, setKnowledge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadKnowledge();
    loadFiles();
  }, []);

  const loadKnowledge = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "bot_knowledge")
      .maybeSingle();
    if (data?.value) {
      setKnowledge(String(data.value));
    }
    setLoading(false);
  };

  const loadFiles = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "bot_knowledge_files")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      setFiles(data.value as unknown as KnowledgeFile[]);
    }
  };

  const saveKnowledge = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("key", "bot_knowledge")
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("admin_settings")
        .update({ value: knowledge as any, updated_at: new Date().toISOString() })
        .eq("key", "bot_knowledge"));
    } else {
      ({ error } = await supabase
        .from("admin_settings")
        .insert({ key: "bot_knowledge", value: knowledge as any }));
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Bot knowledge updated!");
    }
  };

  const saveFilesList = async (newFiles: KnowledgeFile[]) => {
    const { data: existing } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("key", "bot_knowledge_files")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("admin_settings")
        .update({ value: newFiles as any, updated_at: new Date().toISOString() })
        .eq("key", "bot_knowledge_files");
    } else {
      await supabase
        .from("admin_settings")
        .insert({ key: "bot_knowledge_files", value: newFiles as any });
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { error } = await supabase.storage.from("bot-knowledge").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("bot-knowledge").getPublicUrl(path);

    const newFile: KnowledgeFile = {
      name: file.name,
      url: urlData.publicUrl,
      type: file.type || ext || "unknown",
      size: file.size,
      uploaded_at: new Date().toISOString(),
    };

    const newFiles = [...files, newFile];
    setFiles(newFiles);
    await saveFilesList(newFiles);

    toast.success(`"${file.name}" uploaded! The AI tutor will use this file.`);
    setUploading(false);
  };

  const deleteFile = async (index: number) => {
    const file = files[index];
    // Try to delete from storage
    const path = file.url.split("/bot-knowledge/")[1];
    if (path) {
      await supabase.storage.from("bot-knowledge").remove([path]);
    }

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    await saveFilesList(newFiles);
    toast.success("File removed");
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText size={16} className="text-destructive" />;
    if (type.includes("image")) return <Image size={16} className="text-primary" />;
    if (type.includes("word") || type.includes("document")) return <FileText size={16} className="text-primary" />;
    return <File size={16} className="text-muted-foreground" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Text Knowledge */}
      <div className="dlh-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Bot className="text-primary-foreground" size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Feed the DLH Smart Tutor</h3>
            <p className="text-sm text-muted-foreground">
              Add custom knowledge, instructions, or context for the AI tutor.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="knowledge">Custom Knowledge & Instructions</Label>
          <Textarea
            id="knowledge"
            value={knowledge}
            onChange={(e) => setKnowledge(e.target.value)}
            placeholder={`Example:\n- DLH classes run every Monday and Wednesday at 7PM GMT\n- Registration fee is 50,000 Leones for DLH 1.0\n- Next intake starts March 2026`}
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <Button onClick={saveKnowledge} disabled={saving} className="mt-4 bg-gradient-primary">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Knowledge
        </Button>
      </div>

      {/* File Uploads */}
      <div className="dlh-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
            <Upload className="text-accent-foreground" size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Knowledge Files</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDFs, Word docs, images, or other files. The AI tutor will reference these when answering questions.
            </p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.pptx"
          className="hidden"
          multiple
          onChange={(e) => {
            const fileList = e.target.files;
            if (fileList) {
              Array.from(fileList).forEach(f => uploadFile(f));
            }
            e.target.value = "";
          }}
        />

        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="mb-4">
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {uploading ? "Uploading..." : "Upload Files"}
        </Button>

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {file.type.split("/").pop()?.toUpperCase() || "FILE"}
                </Badge>
                <Button size="sm" variant="ghost" className="text-destructive flex-shrink-0" onClick={() => deleteFile(i)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
            No files uploaded yet. Upload PDFs, documents, or images for the AI to reference.
          </p>
        )}
      </div>
    </div>
  );
}
