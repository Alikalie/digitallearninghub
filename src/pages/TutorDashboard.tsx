import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Users, BookOpen, Copy, Pencil, Trash2, Loader2, AlertCircle, Clock, CheckCircle,
} from "lucide-react";

interface Classroom {
  id: string;
  name: string;
  classroom_code: string;
  description: string | null;
  max_students: number;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

interface TutorApplication {
  id: string;
  status: string;
  created_at: string;
  answers: any;
}

const TUTOR_QUESTIONS = [
  "What subjects or topics are you qualified to teach?",
  "How many years of teaching or tutoring experience do you have?",
  "Why do you want to become a tutor on Digital Learning Hub?",
];

const MAX_FREE_CLASSROOMS = 3;

export default function TutorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<TutorApplication | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [form, setForm] = useState({ name: "", description: "", max_students: 50 });
  const [answers, setAnswers] = useState<string[]>(TUTOR_QUESTIONS.map(() => ""));
  const [submittingApp, setSubmittingApp] = useState(false);

  const isTutor = profile?.user_type === "tutor";

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: appData } = await supabase
      .from("tutor_applications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (appData && appData.length > 0) setApplication(appData[0] as TutorApplication);

    const { data: rooms } = await supabase
      .from("classrooms")
      .select("*")
      .eq("tutor_id", user!.id)
      .order("created_at", { ascending: false });

    if (rooms) {
      const roomsWithCounts = await Promise.all(
        rooms.map(async (r) => {
          const { count } = await supabase
            .from("classroom_members")
            .select("*", { count: "exact", head: true })
            .eq("classroom_id", r.id);
          return { ...r, member_count: count || 0 };
        })
      );
      setClassrooms(roomsWithCounts);
    }
    setLoading(false);
  };

  const submitApplication = async () => {
    if (answers.some((a) => a.trim().length < 10)) {
      toast.error("Please provide detailed answers (at least 10 characters each)");
      return;
    }
    setSubmittingApp(true);
    const { error } = await supabase.from("tutor_applications").insert({
      user_id: user!.id,
      answers: TUTOR_QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] })),
    });
    if (error) toast.error("Failed to submit application");
    else { toast.success("Application submitted! Awaiting admin review."); loadData(); }
    setSubmittingApp(false);
  };

  const openDialog = (classroom?: Classroom) => {
    if (classroom) {
      setEditingClassroom(classroom);
      setForm({ name: classroom.name, description: classroom.description || "", max_students: classroom.max_students });
    } else {
      setEditingClassroom(null);
      setForm({ name: "", description: "", max_students: 50 });
    }
    setDialogOpen(true);
  };

  const saveClassroom = async () => {
    if (!form.name.trim()) { toast.error("Classroom name is required"); return; }
    if (!editingClassroom && classrooms.length >= MAX_FREE_CLASSROOMS) {
      toast.error(`You can only create ${MAX_FREE_CLASSROOMS} classrooms for free. Contact admin for more.`);
      return;
    }
    if (editingClassroom) {
      const { error } = await supabase
        .from("classrooms")
        .update({ name: form.name, description: form.description, max_students: form.max_students })
        .eq("id", editingClassroom.id);
      if (error) { toast.error(error.message.includes("unique") ? "Classroom name already taken" : "Failed to update"); return; }
      toast.success("Classroom updated");
    } else {
      const { error } = await supabase
        .from("classrooms")
        .insert({ tutor_id: user!.id, name: form.name, description: form.description, max_students: form.max_students });
      if (error) { toast.error(error.message.includes("unique") ? "A classroom with this code already exists" : "Failed to create"); return; }
      toast.success("Classroom created!");
    }
    setDialogOpen(false);
    loadData();
  };

  const deleteClassroom = async (id: string) => {
    if (!confirm("Delete this classroom? All posts and members will be removed.")) return;
    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Classroom deleted");
    loadData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Classroom code copied!");
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div></DashboardLayout>;
  }

  // Non-tutor user - show access denied
  if (!isTutor) {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-6 max-w-lg mx-auto text-center space-y-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-destructive" size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Tutor Access Only</h1>
            <p className="text-muted-foreground">
              Only users who registered as tutors can access this dashboard. You can browse and join classrooms from the Classrooms page.
            </p>
            <Button onClick={() => navigate("/classrooms")} className="mt-4 bg-gradient-primary">
              Browse Classrooms
            </Button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  // Tutor hasn't applied yet
  if (!application) {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold mb-2">Tutor Application</h1>
            <p className="text-muted-foreground mb-6">
              Please answer the following questions to complete your tutor registration. Your application will be reviewed by an admin.
            </p>
          </motion.div>
          <div className="space-y-6">
            {TUTOR_QUESTIONS.map((q, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="dlh-card p-4">
                <Label className="font-medium">{q}</Label>
                <Textarea value={answers[i]} onChange={(e) => { const na = [...answers]; na[i] = e.target.value; setAnswers(na); }} placeholder="Type your answer here..." className="mt-2" rows={3} />
              </motion.div>
            ))}
            <Button onClick={submitApplication} disabled={submittingApp} className="w-full bg-gradient-primary">
              {submittingApp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Application
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (application.status === "pending") {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-6 max-w-lg mx-auto text-center space-y-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <Clock className="text-amber-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Application Pending</h1>
            <p className="text-muted-foreground">Your tutor application is under review. You'll be notified once an admin approves it.</p>
            <Badge variant="outline" className="mt-4 text-amber-600 border-amber-300">Status: Pending Approval</Badge>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (application.status === "rejected") {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-6 max-w-lg mx-auto text-center space-y-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-destructive" size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Application Rejected</h1>
            <p className="text-muted-foreground">Unfortunately your tutor application was not approved. Please contact support for more info.</p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  // Approved tutor - show classroom management with blue accent
  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        {/* Tutor header with blue theme accent */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-hero rounded-2xl p-6 text-primary-foreground"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle size={24} /> Tutor Dashboard
              </h1>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {classrooms.length}/{MAX_FREE_CLASSROOMS} free classrooms used
              </p>
            </div>
            <Button
              onClick={() => openDialog()}
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
              disabled={classrooms.length >= MAX_FREE_CLASSROOMS}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Classroom
            </Button>
          </div>
        </motion.div>

        {classrooms.length >= MAX_FREE_CLASSROOMS && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Classroom limit reached</p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              You've used all {MAX_FREE_CLASSROOMS} free classrooms. Contact admin to request more.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((room, i) => (
            <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/20" onClick={() => navigate(`/classroom/${room.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">{room.name}</CardTitle>
                    <Badge variant={room.is_active ? "default" : "secondary"} className="text-xs ml-2 flex-shrink-0">
                      {room.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {room.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{room.description}</p>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users size={14} />
                      <span>{room.member_count} students</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); copyCode(room.classroom_code); }} className="flex items-center gap-1 text-primary hover:underline text-xs font-mono">
                      <Copy size={12} />{room.classroom_code}
                    </button>
                  </div>
                  <div className="flex gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openDialog(room)}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteClassroom(room.id)}><Trash2 size={14} /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {classrooms.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground">No classrooms yet. Create your first one!</p>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingClassroom ? "Edit Classroom" : "Create Classroom"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Classroom Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Web Development 101" className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe what students will learn..." className="mt-1" rows={3} /></div>
              <div><Label>Max Students</Label><Input type="number" value={form.max_students} onChange={(e) => setForm((f) => ({ ...f, max_students: parseInt(e.target.value) || 50 }))} className="mt-1" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveClassroom} className="bg-gradient-primary">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
