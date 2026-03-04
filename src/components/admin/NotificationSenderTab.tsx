import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2, Users } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

export function NotificationSenderTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
    setUsers(data || []);
  };

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSending(true);
    try {
      if (target === "all") {
        // Send to all users
        const notifications = users.map(u => ({
          user_id: u.user_id,
          title: title.trim(),
          message: message.trim(),
        }));
        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw error;
        toast.success(`Notification sent to ${users.length} users`);
      } else {
        // Send to specific user
        const { error } = await supabase.from("notifications").insert({
          user_id: selectedUser,
          title: title.trim(),
          message: message.trim(),
        });
        if (error) throw error;
        toast.success("Notification sent");
      }
      setTitle("");
      setMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="dlh-card p-6 space-y-4 max-w-lg">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Send size={20} className="text-primary" />
        Send Notification
      </h2>

      <div>
        <Label>Send To</Label>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all"><div className="flex items-center gap-2"><Users size={14} />All Users</div></SelectItem>
            <SelectItem value="specific">Specific User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {target === "specific" && (
        <div>
          <Label>Select User</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a user" /></SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Notification title..." />
      </div>

      <div>
        <Label>Message</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" rows={3} placeholder="Notification message..." />
      </div>

      <Button onClick={sendNotification} disabled={sending} className="bg-gradient-primary w-full">
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Send Notification
      </Button>
    </div>
  );
}
