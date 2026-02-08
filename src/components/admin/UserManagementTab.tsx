import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search, Eye, EyeOff, Shield, Pencil, Trash2, UserPlus, Mail, Phone, Globe,
} from "lucide-react";

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

interface Props {
  users: Profile[];
  onRefresh: () => void;
}

export function UserManagementTab({ users, onRefresh }: Props) {
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    country: "",
    user_type: "student",
    course_of_interest: "",
  });

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleSuspend = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !profile.is_suspended })
      .eq("id", profile.id);
    if (error) { toast.error("Failed to update user"); return; }
    toast.success(profile.is_suspended ? "User unsuspended" : "User suspended");
    onRefresh();
  };

  const toggleVerify = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !profile.is_verified })
      .eq("id", profile.id);
    if (error) { toast.error("Failed to update user"); return; }
    toast.success(profile.is_verified ? "Verification removed" : "User verified");
    onRefresh();
  };

  const openEditDialog = (user: Profile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number || "",
      country: user.country || "",
      user_type: user.user_type || "student",
      course_of_interest: user.course_of_interest || "",
    });
    setEditDialogOpen(true);
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name,
        phone_number: editForm.phone_number || null,
        country: editForm.country || null,
        user_type: editForm.user_type,
        course_of_interest: editForm.course_of_interest || null,
      })
      .eq("id", editingUser.id);
    if (error) { toast.error("Failed to update user"); return; }
    toast.success("User updated successfully");
    setEditDialogOpen(false);
    onRefresh();
  };

  const deleteUser = async () => {
    if (!deleteUserId) return;
    // Delete profile (cascading from auth would need service role, just remove profile)
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", deleteUserId);
    if (error) { toast.error("Failed to delete user profile"); return; }
    toast.success("User profile deleted");
    setDeleteUserId(null);
    onRefresh();
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    // First delete existing roles
    await supabase.from("user_roles").delete().eq("user_id", userId);
    // Insert new role
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole as any });
    if (error) { toast.error("Failed to change role"); return; }
    toast.success(`Role changed to ${newRole}`);
    onRefresh();
  };

  return (
    <div className="dlh-card">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary" className="flex-shrink-0">{users.length} users</Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Name</TableHead>
              <TableHead className="min-w-[180px]">Email</TableHead>
              <TableHead className="min-w-[80px]">Type</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate max-w-[120px]">{u.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{u.user_type || "student"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.is_verified && <Badge className="bg-dlh-success/10 text-dlh-success border-0 text-xs">Verified</Badge>}
                    {u.is_suspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                    {!u.is_verified && !u.is_suspended && <Badge variant="secondary" className="text-xs">Pending</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => toggleVerify(u)} title={u.is_verified ? "Unverify" : "Verify"}>
                      {u.is_verified ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleSuspend(u)} className={u.is_suspended ? "text-dlh-success" : "text-destructive"} title={u.is_suspended ? "Unsuspend" : "Suspend"}>
                      <Shield size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(u)} title="Edit user">
                      <Pencil size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteUserId(u.id)} title="Delete user">
                      <Trash2 size={14} />
                    </Button>
                    <Select onValueChange={(val) => changeUserRole(u.user_id, val)}>
                      <SelectTrigger className="h-8 w-[90px] text-xs">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="tutor">Tutor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Email (read-only)</Label><Input value={editForm.email} disabled className="mt-1 opacity-60" /></div>
            <div><Label>Phone</Label><Input value={editForm.phone_number} onChange={(e) => setEditForm(f => ({ ...f, phone_number: e.target.value }))} className="mt-1" /></div>
            <div><Label>Country</Label><Input value={editForm.country} onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label>User Type</Label>
              <Select value={editForm.user_type} onValueChange={(val) => setEditForm(f => ({ ...f, user_type: val }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Course of Interest</Label><Input value={editForm.course_of_interest} onChange={(e) => setEditForm(f => ({ ...f, course_of_interest: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveUserEdit} className="bg-gradient-primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
