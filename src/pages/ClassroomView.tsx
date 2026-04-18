import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PostComments, { UserAvatar } from "@/components/classroom/PostComments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Copy, Send, Loader2, FileText, ClipboardList, Smile, Plus, Trash2, Pencil, BookOpen,
} from "lucide-react";

interface Classroom {
  id: string;
  name: string;
  classroom_code: string;
  description: string | null;
  tutor_id: string;
  is_active: boolean;
  icon_url: string | null;
}

interface Post {
  id: string;
  content: string;
  post_type: string;
  metadata: any;
  created_at: string;
  author_id: string;
  reactions: { emoji: string; count: number; reacted: boolean }[];
}

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: { full_name: string; email: string; avatar_url: string | null };
}

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "💡", "👏", "🔥"];

export default function ClassroomView() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTutor, setIsTutor] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postForm, setPostForm] = useState({ content: "", post_type: "post", metadata: {} as any });
  const [submissionDialog, setSubmissionDialog] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", icon_url: "" });
  const [editIconUploading, setEditIconUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setIsAdmin((data || []).some((r) => r.role === "admin" || r.role === "super_admin"));
    });
  }, [user]);

  const canEditClassroom = isTutor || isAdmin;

  const openEdit = () => {
    if (!classroom) return;
    setEditForm({
      name: classroom.name,
      description: classroom.description || "",
      icon_url: classroom.icon_url || "",
    });
    setEditOpen(true);
  };

  const uploadEditIcon = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Image must be under 3MB"); return; }
    setEditIconUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("classroom-icons").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("classroom-icons").getPublicUrl(path);
      setEditForm((f) => ({ ...f, icon_url: data.publicUrl }));
      toast.success("Icon uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setEditIconUploading(false);
    }
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { toast.error("Name is required"); return; }
    const { error } = await supabase
      .from("classrooms")
      .update({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        icon_url: editForm.icon_url || null,
      })
      .eq("id", classroomId!);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Classroom updated");
    setEditOpen(false);
    loadAll();
  };

  useEffect(() => {
    if (user && classroomId) loadAll();
  }, [user, classroomId]);

  const loadAll = async () => {
    setLoading(true);
    // Load classroom
    const { data: room } = await supabase
      .from("classrooms")
      .select("*")
      .eq("id", classroomId!)
      .single();
    if (!room) {
      setLoading(false);
      return;
    }
    setClassroom(room as Classroom);
    setIsTutor(room.tutor_id === user!.id);

    // Check membership
    const { data: membership } = await supabase
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", classroomId!)
      .eq("user_id", user!.id);
    setIsMember((membership && membership.length > 0) || room.tutor_id === user!.id);

    // Load posts
    await loadPosts();

    // Load members
    const { data: memberData } = await supabase
      .from("classroom_members")
      .select("*")
      .eq("classroom_id", classroomId!)
      .order("joined_at", { ascending: true });

    if (memberData) {
      // Get profiles for members
      const userIds = memberData.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      const enriched = memberData.map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id) as any,
      }));
      setMembers(enriched);
    }

    setLoading(false);
  };

  const loadPosts = async () => {
    const { data: postData } = await supabase
      .from("classroom_posts")
      .select("*")
      .eq("classroom_id", classroomId!)
      .order("created_at", { ascending: false });

    if (postData) {
      // Load reactions for each post
      const postsWithReactions = await Promise.all(
        postData.map(async (p) => {
          const { data: reactions } = await supabase
            .from("post_reactions")
            .select("emoji, user_id")
            .eq("post_id", p.id);

          const emojiMap: Record<string, { count: number; reacted: boolean }> = {};
          (reactions || []).forEach((r) => {
            if (!emojiMap[r.emoji]) emojiMap[r.emoji] = { count: 0, reacted: false };
            emojiMap[r.emoji].count++;
            if (r.user_id === user!.id) emojiMap[r.emoji].reacted = true;
          });

          return {
            ...p,
            reactions: Object.entries(emojiMap).map(([emoji, data]) => ({ emoji, ...data })),
          };
        })
      );
      setPosts(postsWithReactions);
    }
  };

  const joinClassroom = async () => {
    const { error } = await supabase.from("classroom_members").insert({
      classroom_id: classroomId!,
      user_id: user!.id,
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "You're already a member" : "Failed to join");
      return;
    }
    toast.success("Joined classroom!");
    loadAll();
  };

  const leaveClassroom = async () => {
    if (!confirm("Leave this classroom?")) return;
    await supabase.from("classroom_members").delete().eq("classroom_id", classroomId!).eq("user_id", user!.id);
    toast.success("Left classroom");
    navigate("/classrooms");
  };

  const createPost = async () => {
    if (!postForm.content.trim()) {
      toast.error("Content is required");
      return;
    }
    const { error } = await supabase.from("classroom_posts").insert({
      classroom_id: classroomId!,
      author_id: user!.id,
      content: postForm.content,
      post_type: postForm.post_type,
      metadata: postForm.metadata,
    });
    if (error) {
      toast.error("Failed to create post");
      return;
    }
    toast.success("Post created!");
    setPostDialogOpen(false);
    setPostForm({ content: "", post_type: "post", metadata: {} });
    loadPosts();
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("classroom_posts").delete().eq("id", postId);
    toast.success("Post deleted");
    loadPosts();
  };

  const toggleReaction = async (postId: string, emoji: string) => {
    const existing = posts.find((p) => p.id === postId)?.reactions.find((r) => r.emoji === emoji && r.reacted);
    if (existing) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user!.id).eq("emoji", emoji);
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: user!.id, emoji });
    }
    loadPosts();
    setShowEmojiFor(null);
  };

  const submitAssignment = async (postId: string) => {
    if (!submissionText.trim()) {
      toast.error("Please provide your answer");
      return;
    }
    const { error } = await supabase.from("assignment_submissions").insert({
      post_id: postId,
      student_id: user!.id,
      content: submissionText,
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "You already submitted this" : "Failed to submit");
      return;
    }
    toast.success("Assignment submitted!");
    setSubmissionDialog(null);
    setSubmissionText("");
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Remove this student?")) return;
    await supabase.from("classroom_members").delete().eq("classroom_id", classroomId!).eq("user_id", userId);
    toast.success("Member removed");
    loadAll();
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div></DashboardLayout>;
  }

  if (!classroom) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Classroom not found</h2>
          <Button onClick={() => navigate("/classrooms")}>Back to Classrooms</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isTutor ? "/tutor" : "/classrooms")}>
            <ArrowLeft size={20} />
          </Button>
          {classroom.icon_url ? (
            <img src={classroom.icon_url} alt={classroom.name} className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="text-primary" size={20} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{classroom.name}</h1>
              {canEditClassroom && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openEdit} title="Edit classroom">
                  <Pencil size={14} />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <button onClick={() => { navigator.clipboard.writeText(classroom.classroom_code); toast.success("Code copied!"); }} className="flex items-center gap-1 hover:text-primary">
                <Copy size={12} /> Code: <span className="font-mono">{classroom.classroom_code}</span>
              </button>
              <span>•</span>
              <span>{members.length} students</span>
            </div>
          </div>
          {!isTutor && isMember && (
            <Button variant="outline" size="sm" onClick={leaveClassroom} className="text-destructive">Leave</Button>
          )}
          {!isTutor && !isMember && (
            <Button onClick={joinClassroom} className="bg-gradient-primary">Join Classroom</Button>
          )}
        </div>

        {classroom.description && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{classroom.description}</p>
        )}

        <Tabs defaultValue="feed">
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="members"><Users size={14} className="mr-1" />Members ({members.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4 mt-4">
            {isTutor && (
              <Button onClick={() => setPostDialogOpen(true)} className="bg-gradient-primary">
                <Plus className="mr-2 h-4 w-4" /> Create Post
              </Button>
            )}

            {posts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto mb-2" size={32} />
                <p>No posts yet{isTutor ? ". Create your first post!" : "."}</p>
              </div>
            )}

            {posts.map((post) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="dlh-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={post.post_type === "assignment" ? "destructive" : post.post_type === "quiz" ? "secondary" : "outline"} className="text-xs">
                      {post.post_type === "assignment" ? "📝 Assignment" : post.post_type === "quiz" ? "❓ Quiz" : post.post_type === "material" ? "📄 Material" : "📢 Post"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {isTutor && post.author_id === user!.id && (
                    <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => deletePost(post.id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>

                {/* Reactions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {post.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => toggleReaction(post.id, r.emoji)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                        r.reacted ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.count}</span>
                    </button>
                  ))}
                  <div className="relative">
                    <button onClick={() => setShowEmojiFor(showEmojiFor === post.id ? null : post.id)} className="p-1 rounded-full hover:bg-muted">
                      <Smile size={16} className="text-muted-foreground" />
                    </button>
                    {showEmojiFor === post.id && (
                      <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-1 z-10">
                        {EMOJI_OPTIONS.map((e) => (
                          <button key={e} onClick={() => toggleReaction(post.id, e)} className="text-lg hover:scale-125 transition-transform p-0.5">
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit button for assignments */}
                  {(post.post_type === "assignment" || post.post_type === "quiz") && !isTutor && isMember && (
                    <Button size="sm" variant="outline" className="ml-auto text-xs h-7" onClick={() => setSubmissionDialog(post.id)}>
                      <Send size={12} className="mr-1" /> Submit Answer
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <div className="dlh-card divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(m.profile?.full_name || "U").split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.profile?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">#{m.id.slice(0, 8)}</span>
                  {isTutor && (
                    <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => removeMember(m.user_id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm">No students yet</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Post Dialog */}
        <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={postForm.post_type} onValueChange={(v) => setPostForm((f) => ({ ...f, post_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">📢 Announcement</SelectItem>
                    <SelectItem value="assignment">📝 Assignment</SelectItem>
                    <SelectItem value="quiz">❓ Quiz</SelectItem>
                    <SelectItem value="material">📄 Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea
                  value={postForm.content}
                  onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Write your post content..."
                  className="mt-1"
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPostDialogOpen(false)}>Cancel</Button>
              <Button onClick={createPost} className="bg-gradient-primary">Post</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submission Dialog */}
        <Dialog open={!!submissionDialog} onOpenChange={() => setSubmissionDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Your Answer</DialogTitle></DialogHeader>
            <Textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              placeholder="Type your answer here..."
              rows={5}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmissionDialog(null)}>Cancel</Button>
              <Button onClick={() => submitAssignment(submissionDialog!)} className="bg-gradient-primary">Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Classroom Dialog (tutor or admin) */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Classroom</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Icon</Label>
                <div className="mt-2 flex items-center gap-3">
                  {editForm.icon_url ? (
                    <img src={editForm.icon_url} alt="Icon" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <BookOpen className="text-muted-foreground" size={20} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      id="edit-cls-icon"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadEditIcon(e.target.files[0])}
                    />
                    <Button type="button" size="sm" variant="outline" disabled={editIconUploading} onClick={() => document.getElementById("edit-cls-icon")?.click()}>
                      {editIconUploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                      {editForm.icon_url ? "Change icon" : "Upload icon"}
                    </Button>
                    {editForm.icon_url && (
                      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setEditForm((f) => ({ ...f, icon_url: "" }))}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label>Classroom Name *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit} className="bg-gradient-primary">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
