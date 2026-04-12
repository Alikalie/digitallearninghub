import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Loader2, Save, Camera, Bell, Shield, ChevronDown, ChevronUp, Lock, Send, CheckCircle, Clock,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { DLH_COURSES } from "@/lib/courses";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Profile() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const { uploadAvatar, uploading } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [isProfileLocked, setIsProfileLocked] = useState(false);
  const [editRequestStatus, setEditRequestStatus] = useState<string | null>(null);
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    country: "",
    bio: "",
    course_of_interest: "",
  });

  useEffect(() => {
    if (profile) {
      const parts = (profile.full_name || "").trim().split(/\s+/);
      setFormData({
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
        phone_number: profile.phone_number || "",
        country: profile.country || "",
        bio: profile.bio || "",
        course_of_interest: profile.course_of_interest || "",
      });

      // Check if profile is incomplete (missing key fields)
      const incomplete = !profile.full_name || !profile.phone_number || !profile.country || !profile.course_of_interest;
      setIsProfileIncomplete(incomplete);

      // Check lock status
      checkProfileLock();
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      checkEditRequest();
    }
  }, [user]);

  const checkProfileLock = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_profile_locked")
      .eq("id", profile.id)
      .single();
    if (data) {
      setIsProfileLocked(data.is_profile_locked || false);
    }
  };

  const checkEditRequest = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profile_edit_requests")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setEditRequestStatus(data[0].status);
    }
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
    setNotifLoading(false);
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    // Validate required fields
    if (!formData.first_name.trim() || !formData.phone_number.trim() || !formData.country.trim() || !formData.course_of_interest) {
      toast.error("Please fill in all required fields: First Name, Phone, Country, and Primary Course");
      return;
    }

    setLoading(true);
    try {
      const full_name = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name,
          phone_number: formData.phone_number,
          country: formData.country,
          bio: formData.bio,
          course_of_interest: formData.course_of_interest,
          is_profile_locked: true, // Lock after first save
        })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      setIsProfileLocked(true);
      setIsProfileIncomplete(false);
      toast.success("Profile saved successfully! Your profile is now locked.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const sendEditRequest = async () => {
    if (!user || !editRequestReason.trim()) {
      toast.error("Please provide a reason for editing your profile");
      return;
    }
    setSendingRequest(true);
    try {
      const { error } = await supabase.from("profile_edit_requests").insert({
        user_id: user.id,
        requested_changes: { reason: editRequestReason },
        status: "pending",
      });
      if (error) throw error;
      setEditRequestStatus("pending");
      setShowEditRequestDialog(false);
      setEditRequestReason("");
      toast.success("Edit request sent to admin for approval");
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setChangingPassword(true);
    try {
      // Verify old password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordForm.oldPassword,
      });
      if (signInError) {
        toast.error("Current password is incorrect");
        setChangingPassword(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  // Check if editing is allowed (profile approved for edit by admin)
  const canEdit = !isProfileLocked || editRequestStatus === "approved" || isProfileIncomplete;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">My Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
        </motion.div>

        {/* Incomplete Profile Banner */}
        {isProfileIncomplete && !isProfileLocked && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="text-primary flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-sm">Complete Your Profile</p>
              <p className="text-sm text-muted-foreground">Please fill in all required fields to complete your profile setup. Your profile will be locked after saving.</p>
            </div>
          </motion.div>
        )}

        {/* Locked Profile Banner */}
        {isProfileLocked && editRequestStatus !== "approved" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted border border-border rounded-xl p-4 flex items-start gap-3">
            <Lock className="text-muted-foreground flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-sm">Profile Locked</p>
              <p className="text-sm text-muted-foreground">Your profile is locked. To make changes, request permission from admin.</p>
              <div className="mt-2 flex items-center gap-2">
                {editRequestStatus === "pending" ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Clock size={14} /> Edit request pending approval
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setShowEditRequestDialog(true)}>
                    <Send className="mr-2 h-3 w-3" /> Request Edit Permission
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Avatar & Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dlh-card p-5">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials}</AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && user) { await uploadAvatar(user.id, file); await refreshProfile(); }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.full_name || "Set up your profile"}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {profile?.user_type || "Student"} • {profile?.country || "—"}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleInputChange} className="mt-1" disabled={!canEdit} />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleInputChange} className="mt-1" disabled={!canEdit} />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number *</Label>
              <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleInputChange} className="mt-1" disabled={!canEdit} />
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input id="country" name="country" value={formData.country} onChange={handleInputChange} className="mt-1" disabled={!canEdit} />
            </div>
            <div>
              <Label>Primary Course *</Label>
              <Select value={formData.course_of_interest} onValueChange={(v) => setFormData(f => ({ ...f, course_of_interest: v }))} disabled={!canEdit}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {DLH_COURSES.map((c) => (
                    <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Input value={profile?.gender || "—"} disabled className="mt-1 bg-muted" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" value={formData.bio} onChange={handleInputChange} placeholder="Tell us about yourself..." className="mt-1" rows={3} disabled={!canEdit} />
            </div>
          </div>
          {canEdit && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={loading} className="bg-gradient-primary hover:opacity-90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isProfileLocked ? "Save Changes" : "Save & Lock Profile"}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Notifications Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="dlh-card overflow-hidden">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-primary" />
              <span className="font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
              )}
            </div>
            {showNotifications ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showNotifications && (
            <div className="border-t border-border p-4 space-y-2">
              {unreadCount > 0 && (
                <div className="flex justify-end mb-2">
                  <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
                </div>
              )}
              {notifLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              ) : notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      n.is_read ? "border-border bg-muted/30" : "border-primary/30 bg-primary/5"
                    }`}
                    onClick={() => !n.is_read && markNotificationRead(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium text-sm ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">No notifications yet</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Security Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="dlh-card overflow-hidden">
          <button
            onClick={() => setShowSecurity(!showSecurity)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-primary" />
              <span className="font-semibold">Security & Account</span>
            </div>
            {showSecurity ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showSecurity && (
            <div className="border-t border-border p-4 space-y-4">
              <div>
                <p className="font-medium text-sm mb-1">Account Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-2">Change Password</p>
                <div className="grid gap-3 sm:grid-cols-2 max-w-md">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Current Password</Label>
                    <Input type="password" value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, oldPassword: e.target.value }))}
                      placeholder="••••••••" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">New Password</Label>
                    <Input type="password" value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="••••••••" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Confirm Password</Label>
                    <Input type="password" value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="••••••••" className="mt-1" />
                  </div>
                </div>
                <Button variant="outline" className="mt-3" onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </div>
              <div className="pt-3 border-t border-border">
                <Button variant="outline" onClick={signOut} className="text-destructive border-destructive/30">
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Edit Request Dialog */}
      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Profile Edit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tell us why you need to edit your profile. An admin will review your request.</p>
          <Textarea
            value={editRequestReason}
            onChange={(e) => setEditRequestReason(e.target.value)}
            placeholder="Reason for editing (e.g., name change, updated phone number...)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRequestDialog(false)}>Cancel</Button>
            <Button onClick={sendEditRequest} disabled={sendingRequest} className="bg-gradient-primary">
              {sendingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
