import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Eye, CheckCircle, XCircle, Users, Plus, FileEdit } from "lucide-react";

interface TutorApp {
  id: string;
  user_id: string;
  status: string;
  answers: any;
  created_at: string;
  profile?: { full_name: string; email: string };
}

interface Classroom {
  id: string;
  name: string;
  classroom_code: string;
  tutor_id: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  icon_url: string | null;
  tutor_name?: string;
  member_count?: number;
}

interface EditRequest {
  id: string;
  user_id: string;
  requested_changes: any;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export function ClassroomManagementTab() {
  const { user } = useAuth();
  const [apps, setApps] = useState<TutorApp[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewApp, setViewApp] = useState<TutorApp | null>(null);
  const [tab, setTab] = useState<"applications" | "classrooms" | "edit-requests">("applications");
  const [showCreateClassroom, setShowCreateClassroom] = useState(false);
  const [classroomForm, setClassroomForm] = useState({ name: "", description: "", icon_url: "" });
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    // Load applications
    const { data: appData } = await supabase
      .from("tutor_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (appData) {
      const userIds = appData.map((a) => a.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      setApps(
        appData.map((a) => ({
          ...a,
          profile: profiles?.find((p) => p.user_id === a.user_id) as any,
        }))
      );
    }

    // Load classrooms
    const { data: rooms } = await supabase.from("classrooms").select("*").order("created_at", { ascending: false });
    if (rooms) {
      const tutorIds = [...new Set(rooms.map((r) => r.tutor_id))];
      const { data: tutorProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", tutorIds.length > 0 ? tutorIds : ["none"]);
      const enriched = await Promise.all(
        rooms.map(async (r) => {
          const { count } = await supabase.from("classroom_members").select("*", { count: "exact", head: true }).eq("classroom_id", r.id);
          return {
            ...r,
            tutor_name: tutorProfiles?.find((p) => p.user_id === r.tutor_id)?.full_name || "Admin",
            member_count: count || 0,
          };
        })
      );
      setClassrooms(enriched);
    }

    // Load profile edit requests
    const { data: reqData } = await supabase
      .from("profile_edit_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (reqData) {
      const reqUserIds = reqData.map((r) => r.user_id);
      const { data: reqProfiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", reqUserIds.length > 0 ? reqUserIds : ["none"]);
      setEditRequests(
        reqData.map((r) => {
          const p = reqProfiles?.find((p) => p.user_id === r.user_id);
          return { ...r, user_name: p?.full_name || "—", user_email: p?.email || "—" };
        })
      );
    }

    setLoading(false);
  };

  const updateAppStatus = async (appId: string, userId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("tutor_applications").update({ status, reviewed_at: new Date().toISOString() }).eq("id", appId);
    if (error) { toast.error("Failed to update"); return; }
    await supabase.from("notifications").insert({
      user_id: userId,
      title: status === "approved" ? "Tutor Application Approved! ✅" : "Tutor Application Update",
      message: status === "approved"
        ? "Congratulations! Your tutor application has been approved. You can now create classrooms."
        : "Your tutor application was not approved at this time. Contact support for more information.",
    });
    toast.success(`Application ${status}`);
    setViewApp(null);
    loadData();
  };

  const deleteClassroom = async (id: string) => {
    if (!confirm("Delete this classroom and all its content?")) return;
    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Classroom deleted");
    loadData();
  };

  const toggleClassroom = async (id: string, active: boolean) => {
    await supabase.from("classrooms").update({ is_active: active }).eq("id", id);
    toast.success(active ? "Classroom activated" : "Classroom deactivated");
    loadData();
  };

  const uploadIcon = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Image must be under 3MB"); return; }
    setIconUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("classroom-icons").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("classroom-icons").getPublicUrl(path);
      setClassroomForm((f) => ({ ...f, icon_url: data.publicUrl }));
      toast.success("Icon uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setIconUploading(false);
    }
  };

  const createDefaultClassroom = async () => {
    if (!classroomForm.name.trim()) { toast.error("Name is required"); return; }
    if (!user) return;
    setCreatingClassroom(true);
    const { error } = await supabase.from("classrooms").insert({
      name: classroomForm.name.trim(),
      description: classroomForm.description.trim() || null,
      icon_url: classroomForm.icon_url || null,
      tutor_id: user.id,
      is_active: true,
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "Name already exists" : "Failed to create");
    } else {
      toast.success("Default classroom created!");
      setShowCreateClassroom(false);
      setClassroomForm({ name: "", description: "", icon_url: "" });
      loadData();
    }
    setCreatingClassroom(false);
  };

  const handleEditRequest = async (reqId: string, userId: string, action: "approved" | "rejected") => {
    // Update request status
    const { error } = await supabase
      .from("profile_edit_requests")
      .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", reqId);
    if (error) { toast.error("Failed to update"); return; }

    if (action === "approved") {
      // Unlock the user's profile
      await supabase.from("profiles").update({ is_profile_locked: false }).eq("user_id", userId);
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      title: action === "approved" ? "Profile Edit Approved ✅" : "Profile Edit Request Denied",
      message: action === "approved"
        ? "Your profile has been unlocked. You can now edit your information. It will lock again after saving."
        : "Your request to edit your profile was denied. Contact admin for more info.",
    });

    toast.success(`Request ${action}`);
    loadData();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === "applications" ? "default" : "outline"} size="sm" onClick={() => setTab("applications")}>
          Tutor Applications ({apps.filter((a) => a.status === "pending").length} pending)
        </Button>
        <Button variant={tab === "classrooms" ? "default" : "outline"} size="sm" onClick={() => setTab("classrooms")}>
          <Users className="mr-1 h-4 w-4" />Classrooms ({classrooms.length})
        </Button>
        <Button variant={tab === "edit-requests" ? "default" : "outline"} size="sm" onClick={() => setTab("edit-requests")}>
          <FileEdit className="mr-1 h-4 w-4" />Profile Edits ({editRequests.filter(r => r.status === "pending").length})
        </Button>
      </div>

      {tab === "applications" && (
        <div className="dlh-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tutor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.profile?.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{app.profile?.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setViewApp(app)}>
                      <Eye size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {apps.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No applications</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "classrooms" && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateClassroom(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-1 h-4 w-4" /> Create Default Classroom
            </Button>
          </div>
          <div className="dlh-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classrooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell className="font-mono text-xs">{room.classroom_code}</TableCell>
                    <TableCell className="text-sm">{room.tutor_name}</TableCell>
                    <TableCell>{room.member_count}</TableCell>
                    <TableCell>
                      <Badge variant={room.is_active ? "default" : "secondary"} className="text-xs">
                        {room.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleClassroom(room.id, !room.is_active)}>
                          {room.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteClassroom(room.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {classrooms.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No classrooms</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {tab === "edit-requests" && (
        <div className="dlh-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.user_name}</TableCell>
                  <TableCell className="text-sm">{req.user_email}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{req.requested_changes?.reason || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {req.status === "pending" ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEditRequest(req.id, req.user_id, "approved")}>
                          <CheckCircle size={14} className="text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditRequest(req.id, req.user_id, "rejected")}>
                          <XCircle size={14} className="text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Done</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {editRequests.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No edit requests</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Application Dialog */}
      <Dialog open={!!viewApp} onOpenChange={() => setViewApp(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tutor Application - {viewApp?.profile?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Array.isArray(viewApp?.answers) &&
              viewApp.answers.map((qa: any, i: number) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-sm mb-1">{qa.question}</p>
                  <p className="text-sm text-muted-foreground">{qa.answer}</p>
                </div>
              ))}
          </div>
          {viewApp?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button variant="outline" className="text-destructive" onClick={() => updateAppStatus(viewApp.id, viewApp.user_id, "rejected")}>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button className="bg-gradient-primary" onClick={() => updateAppStatus(viewApp.id, viewApp.user_id, "approved")}>
                <CheckCircle className="mr-2 h-4 w-4" /> Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Classroom Dialog */}
      <Dialog open={showCreateClassroom} onOpenChange={setShowCreateClassroom}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Default Classroom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Classroom Icon (optional)</Label>
              <div className="mt-2 flex items-center gap-3">
                {classroomForm.icon_url ? (
                  <img src={classroomForm.icon_url} alt="Icon" className="w-14 h-14 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">No icon</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  id="admin-cls-icon"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadIcon(e.target.files[0])}
                />
                <Button type="button" size="sm" variant="outline" disabled={iconUploading} onClick={() => document.getElementById("admin-cls-icon")?.click()}>
                  {iconUploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                  {classroomForm.icon_url ? "Change" : "Upload"}
                </Button>
              </div>
            </div>
            <div>
              <Label>Classroom Name *</Label>
              <Input value={classroomForm.name} onChange={(e) => setClassroomForm(f => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="e.g. Web Development 101" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={classroomForm.description} onChange={(e) => setClassroomForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} placeholder="What this classroom is about..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateClassroom(false)}>Cancel</Button>
            <Button onClick={createDefaultClassroom} disabled={creatingClassroom} className="bg-blue-600 hover:bg-blue-700">
              {creatingClassroom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
