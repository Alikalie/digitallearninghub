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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, BookOpen, Plus, Pencil, Trash2, Shield, Loader2, Search, Eye, EyeOff,
} from "lucide-react";
import { DLH_COURSES } from "@/lib/courses";

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
  const [userSearch, setUserSearch] = useState("");
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", category: "", image_url: "", is_published: true });

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const admin = data?.some((r) => r.role === "admin") || false;
    setIsAdmin(admin);
    if (admin) {
      fetchUsers();
      fetchCourses();
    } else {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses(data || []);
    setLoading(false);
  };

  const toggleSuspend = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !profile.is_suspended })
      .eq("id", profile.id);
    if (error) { toast.error("Failed to update user"); return; }
    toast.success(profile.is_suspended ? "User unsuspended" : "User suspended");
    fetchUsers();
  };

  const toggleVerify = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !profile.is_verified })
      .eq("id", profile.id);
    if (error) { toast.error("Failed to update user"); return; }
    toast.success(profile.is_verified ? "Verification removed" : "User verified");
    fetchUsers();
  };

  const openCourseDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({
        title: course.title,
        description: course.description || "",
        category: course.category || "",
        image_url: course.image_url || "",
        is_published: course.is_published ?? true,
      });
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
      title: c.title,
      description: c.description,
      category: c.category,
      image_url: c.image_url,
      is_published: true,
      tutor_id: user?.id,
    }));
    const { error } = await supabase.from("courses").insert(coursesToInsert);
    if (error) { toast.error("Failed to seed courses: " + error.message); return; }
    toast.success("DLH courses added!");
    fetchCourses();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

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
          <TabsList>
            <TabsTrigger value="users" className="gap-2"><Users size={16} />Users</TabsTrigger>
            <TabsTrigger value="courses" className="gap-2"><BookOpen size={16} />Courses</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="dlh-card">
              <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
                </div>
                <Badge variant="secondary" className="self-start">{users.length} users</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{u.user_type || "student"}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{u.course_of_interest || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {u.is_verified && <Badge className="bg-dlh-success/10 text-dlh-success border-0 text-xs">Verified</Badge>}
                            {u.is_suspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => toggleVerify(u)} title={u.is_verified ? "Unverify" : "Verify"}>
                              {u.is_verified ? <EyeOff size={14} /> : <Eye size={14} />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleSuspend(u)} className={u.is_suspended ? "text-dlh-success" : "text-destructive"}>
                              <Shield size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <div className="flex gap-3 mb-4">
              <Button onClick={() => openCourseDialog()} className="bg-gradient-primary"><Plus className="mr-2 h-4 w-4" />Add Course</Button>
              {courses.length === 0 && (
                <Button variant="outline" onClick={seedCourses}>Seed DLH Courses</Button>
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
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell><Badge variant="outline">{c.category || "—"}</Badge></TableCell>
                      <TableCell>{c.is_published ? <Badge className="bg-dlh-success/10 text-dlh-success border-0">Live</Badge> : <Badge variant="secondary">Draft</Badge>}</TableCell>
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
        </Tabs>

        {/* Course Dialog */}
        <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit Course" : "Add Course"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={courseForm.title} onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={courseForm.description} onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} /></div>
              <div><Label>Category</Label><Input value={courseForm.category} onChange={(e) => setCourseForm((f) => ({ ...f, category: e.target.value }))} className="mt-1" /></div>
              <div><Label>Image URL</Label><Input value={courseForm.image_url} onChange={(e) => setCourseForm((f) => ({ ...f, image_url: e.target.value }))} className="mt-1" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={courseForm.is_published} onChange={(e) => setCourseForm((f) => ({ ...f, is_published: e.target.checked }))} />
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
