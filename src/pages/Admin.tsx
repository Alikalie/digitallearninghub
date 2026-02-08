import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, BookOpen, Plus, Pencil, Trash2, Shield, Loader2, Bot,
} from "lucide-react";
import { DLH_COURSES } from "@/lib/courses";
import { BotKnowledgeTab } from "@/components/admin/BotKnowledgeTab";
import { UserManagementTab } from "@/components/admin/UserManagementTab";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  user_type: string | null;
  is_verified: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
  course_of_interest: string | null;
  phone_number: string | null;
  country: string | null;
  gender: string | null;
  avatar_url: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  is_published: boolean | null;
  tutor_id: string | null;
  created_at: string;
}

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", category: "", image_url: "", is_published: true });

  useEffect(() => { checkAdmin(); }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const admin = data?.some((r) => r.role === "admin") || false;
    setIsAdmin(admin);
    if (admin) { fetchUsers(); fetchCourses(); }
    else { setLoading(false); }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as Profile[]) || []);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses(data || []);
    setLoading(false);
  };

  const openCourseDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({ title: course.title, description: course.description || "", category: course.category || "", image_url: course.image_url || "", is_published: course.is_published ?? true });
    } else {
      setEditingCourse(null);
      setCourseForm({ title: "", description: "", category: "", image_url: "", is_published: true });
    }
    setCourseDialogOpen(true);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) { toast.error("Title is required"); return; }
    if (editingCourse) {
      const { error } = await supabase.from("courses").update(courseForm).eq("id", editingCourse.id);
      if (error) { toast.error("Failed to update course"); return; }
      toast.success("Course updated");
    } else {
      const { error } = await supabase.from("courses").insert({ ...courseForm, tutor_id: user?.id });
      if (error) { toast.error("Failed to create course"); return; }
      toast.success("Course created");
    }
    setCourseDialogOpen(false);
    fetchCourses();
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error("Failed to delete course"); return; }
    toast.success("Course deleted");
    fetchCourses();
  };

  const seedCourses = async () => {
    const coursesToInsert = DLH_COURSES.map((c) => ({
      title: c.title, description: c.description, category: c.category, image_url: c.image_url, is_published: true, tutor_id: user?.id,
    }));
    const { error } = await supabase.from("courses").insert(coursesToInsert);
    if (error) { toast.error("Failed to seed courses: " + error.message); return; }
    toast.success("All DLH courses added!");
    fetchCourses();
  };

  if (isAdmin === null) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div></DashboardLayout>;
  if (!isAdmin) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <Shield className="text-destructive mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, courses, and system settings</p>
        </motion.div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="gap-2"><Users size={16} />Users</TabsTrigger>
            <TabsTrigger value="courses" className="gap-2"><BookOpen size={16} />Courses</TabsTrigger>
            <TabsTrigger value="bot" className="gap-2"><Bot size={16} />Bot Knowledge</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagementTab users={users} onRefresh={fetchUsers} />
          </TabsContent>

          <TabsContent value="courses">
            <div className="flex flex-wrap gap-3 mb-4">
              <Button onClick={() => openCourseDialog()} className="bg-gradient-primary"><Plus className="mr-2 h-4 w-4" />Add Course</Button>
              {courses.length === 0 && (
                <Button variant="outline" onClick={seedCourses}>Seed All DLH Courses</Button>
              )}
            </div>
            <div className="dlh-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{c.category || "—"}</Badge></TableCell>
                      <TableCell>{c.is_published ? <Badge className="bg-dlh-success/10 text-dlh-success border-0 text-xs">Live</Badge> : <Badge variant="secondary" className="text-xs">Draft</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openCourseDialog(c)}><Pencil size={14} /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCourse(c.id)}><Trash2 size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="bot">
            <BotKnowledgeTab />
          </TabsContent>
        </Tabs>

        <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingCourse ? "Edit Course" : "Add Course"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={courseForm.title} onChange={(e) => setCourseForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={courseForm.description} onChange={(e) => setCourseForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} /></div>
              <div><Label>Category</Label><Input value={courseForm.category} onChange={(e) => setCourseForm(f => ({ ...f, category: e.target.value }))} className="mt-1" /></div>
              <div><Label>Image URL</Label><Input value={courseForm.image_url} onChange={(e) => setCourseForm(f => ({ ...f, image_url: e.target.value }))} className="mt-1" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={courseForm.is_published} onChange={(e) => setCourseForm(f => ({ ...f, is_published: e.target.checked }))} />
                <Label>Published</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveCourse} className="bg-gradient-primary">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
