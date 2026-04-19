import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText, Loader2, Eye } from "lucide-react";

interface FileRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  download_count: number;
  uploader_id: string;
  created_at: string;
}

interface Props {
  postId: string;
  classroomId: string;
  isTutor: boolean;
  isMember: boolean;
  currentUserId: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

export default function ClassroomFiles({ postId, classroomId, isTutor, isMember, currentUserId }: Props) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [postId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("classroom_files")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    setFiles((data || []) as FileRow[]);
    setLoading(false);
  };

  const upload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) { toast.error("File too large. Max 25 MB."); return; }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${classroomId}/${currentUserId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("classroom-files").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("classroom_files").insert({
        post_id: postId,
        classroom_id: classroomId,
        uploader_id: currentUserId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
      });
      if (insErr) throw insErr;
      toast.success("File uploaded");
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = async (f: FileRow) => {
    try {
      const { data, error } = await supabase.storage.from("classroom-files").createSignedUrl(f.file_path, 60);
      if (error || !data) throw error;
      // Increment counter (best-effort)
      await supabase.rpc("increment_file_download", { _file_id: f.id });
      // Trigger download
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = f.file_name;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      load();
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    }
  };

  const remove = async (f: FileRow) => {
    if (!confirm(`Delete ${f.file_name}?`)) return;
    await supabase.storage.from("classroom-files").remove([f.file_path]);
    await supabase.from("classroom_files").delete().eq("id", f.id);
    toast.success("File deleted");
    load();
  };

  if (!isTutor && !isMember) return null;

  return (
    <div className="space-y-2">
      {isTutor && (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="text-xs"
          >
            {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
            Attach file (max 25 MB)
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground"><Loader2 className="inline animate-spin mr-1" size={12} /> Loading files…</p>
      ) : files.length === 0 ? null : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              <FileText className="text-primary flex-shrink-0" size={16} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.file_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(f.file_size)}
                  {isTutor && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Eye size={10} /> {f.download_count} download{f.download_count === 1 ? "" : "s"}
                    </span>
                  )}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => download(f)} title="Download" className="h-7 px-2">
                <Download size={14} />
              </Button>
              {(isTutor && f.uploader_id === currentUserId) && (
                <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => remove(f)} title="Delete">
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
