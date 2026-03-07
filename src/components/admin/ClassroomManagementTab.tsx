import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Eye, CheckCircle, XCircle, Users } from "lucide-react";

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
  is_active: boolean;
  created_at: string;
  tutor_name?: string;
  member_count?: number;
}

export function ClassroomManagementTab() {
  const [apps, setApps] = useState<TutorApp[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewApp, setViewApp] = useState<TutorApp | null>(null);
  const [tab, setTab] = useState<"applications" | "classrooms">("applications");

  useEffect(() => {
    loadData();
  }, []);

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
      const { data: tutorProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", tutorIds);
      const enriched = await Promise.all(
        rooms.map(async (r) => {
          const { count } = await supabase.from("classroom_members").select("*", { count: "exact", head: true }).eq("classroom_id", r.id);
          return {
            ...r,
            tutor_name: tutorProfiles?.find((p) => p.user_id === r.tutor_id)?.full_name || "Unknown",
            member_count: count || 0,
          };
        })
      );
      setClassrooms(enriched);
    }
    setLoading(false);
  };

  const updateAppStatus = async (appId: string, userId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("tutor_applications").update({ status, reviewed_at: new Date().toISOString() }).eq("id", appId);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    // Send notification
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
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Classroom deleted");
    loadData();
  };

  const toggleClassroom = async (id: string, active: boolean) => {
    await supabase.from("classrooms").update({ is_active: active }).eq("id", id);
    toast.success(active ? "Classroom activated" : "Classroom deactivated");
    loadData();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={tab === "applications" ? "default" : "outline"} size="sm" onClick={() => setTab("applications")}>
          Tutor Applications ({apps.filter((a) => a.status === "pending").length} pending)
        </Button>
        <Button variant={tab === "classrooms" ? "default" : "outline"} size="sm" onClick={() => setTab("classrooms")}>
          <Users className="mr-1 h-4 w-4" />Classrooms ({classrooms.length})
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
    </div>
  );
}
