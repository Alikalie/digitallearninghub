import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Video, Plus, Trash2, Upload, Loader2, Youtube, ExternalLink, FileText, Edit } from "lucide-react";

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  video_url: string | null;
  order_index: number | null;
  content: string | null;
  transcript: string | null;
}

interface Course {
  id: string;
  title: string;
}

export function CourseVideoTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [videosEnabled, setVideosEnabled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState({ title: "", video_url: "", order_index: 0, content: "", transcript: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCourses();
    loadVideoToggle();
  }, []);

  useEffect(() => {
    if (selectedCourse) loadLessons(selectedCourse);
  }, [selectedCourse]);

  const loadVideoToggle = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "videos_enabled")
      .maybeSingle();
    setVideosEnabled(data?.value === true);
  };

  const toggleVideos = async (enabled: boolean) => {
    setVideosEnabled(enabled);
    const { data: existing } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("key", "videos_enabled")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("admin_settings")
        .update({ value: enabled as any, updated_at: new Date().toISOString() })
        .eq("key", "videos_enabled");
    } else {
      await supabase
        .from("admin_settings")
        .insert({ key: "videos_enabled", value: enabled as any });
    }
    toast.success(enabled ? "Course videos enabled" : "Course videos disabled");
  };

  const loadCourses = async () => {
    const { data } = await supabase.from("courses").select("id, title").order("title");
    setCourses(data || []);
    setLoading(false);
  };

  const loadLessons = async (courseId: string) => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });
    setLessons((data as Lesson[]) || []);
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `video-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("dlh-videos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("dlh-videos").getPublicUrl(path);
    setForm(f => ({ ...f, video_url: urlData.publicUrl }));
    toast.success("Video uploaded!");
    setUploading(false);
  };

  const openAddDialog = () => {
    setEditingLesson(null);
    setForm({ title: "", video_url: "", order_index: lessons.length, content: "", transcript: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title,
      video_url: lesson.video_url || "",
      order_index: lesson.order_index || 0,
      content: lesson.content || "",
      transcript: lesson.transcript || "",
    });
    setDialogOpen(true);
  };

  const saveLesson = async () => {
    if (!form.title.trim() || !selectedCourse) {
      toast.error("Title and course are required");
      return;
    }

    const payload = {
      course_id: selectedCourse,
      title: form.title,
      video_url: form.video_url || null,
      order_index: form.order_index,
      content: form.content || null,
      transcript: form.transcript || null,
    };

    if (editingLesson) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
      if (error) { toast.error("Failed to update: " + error.message); return; }
      toast.success("Lesson updated!");
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) { toast.error("Failed to add: " + error.message); return; }
      toast.success("Video/lesson added!");
    }

    setDialogOpen(false);
    setEditingLesson(null);
    setForm({ title: "", video_url: "", order_index: lessons.length, content: "", transcript: "" });
    loadLessons(selectedCourse);
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    if (selectedCourse) loadLessons(selectedCourse);
  };

  const isYoutube = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="dlh-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Video className="text-primary-foreground" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">Course Videos</h3>
              <p className="text-sm text-muted-foreground">Enable or disable video content for all courses</p>
            </div>
          </div>
          <Switch checked={videosEnabled} onCheckedChange={toggleVideos} />
        </div>
      </div>

      {videosEnabled && (
        <div className="dlh-card p-6 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label>Select Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a course..." /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCourse && (
              <Button onClick={openAddDialog} className="bg-gradient-primary">
                <Plus className="mr-2 h-4 w-4" />Add Video
              </Button>
            )}
          </div>

          {selectedCourse && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Transcript</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No videos added yet for this course
                      </TableCell>
                    </TableRow>
                  ) : (
                    lessons.map((l, i) => (
                      <TableRow key={l.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{l.title}</TableCell>
                        <TableCell>
                          {l.video_url ? (
                            isYoutube(l.video_url) ? (
                              <Badge variant="outline" className="gap-1"><Youtube size={12} />YouTube</Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1"><Video size={12} />Uploaded</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">No video</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.transcript ? (
                            <Badge variant="outline" className="gap-1"><FileText size={12} />Yes</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(l)}>
                              <Edit size={14} />
                            </Button>
                            {l.video_url && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={l.video_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteLesson(l.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Video/Lesson"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="e.g. Introduction to HTML" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="mt-1" placeholder="Brief lesson description" />
            </div>
            <div>
              <Label>YouTube URL or Video Link</Label>
              <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} className="mt-1" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="text-center text-sm text-muted-foreground">— or —</div>
            <div>
              <Label>Upload from device</Label>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadVideo(e.target.files[0]); }} />
              <Button type="button" variant="outline" className="w-full mt-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? "Uploading..." : "Choose Video File"}
              </Button>
            </div>
            <div>
              <Label>Transcript</Label>
              <Textarea
                value={form.transcript}
                onChange={e => setForm(f => ({ ...f, transcript: e.target.value }))}
                className="mt-1 min-h-[100px]"
                placeholder="Paste or type the video transcript here..."
              />
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveLesson} className="bg-gradient-primary">
              {editingLesson ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
