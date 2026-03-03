import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, Eye, EyeOff } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function ContactMessagesTab() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    setMessages((data as ContactMessage[]) || []);
    setLoading(false);
  };

  const toggleRead = async (msg: ContactMessage) => {
    await supabase.from("contact_messages").update({ is_read: !msg.is_read }).eq("id", msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: !m.is_read } : m));
  };

  const deleteMsg = async (id: string) => {
    await supabase.from("contact_messages").delete().eq("id", id);
    setMessages(prev => prev.filter(m => m.id !== id));
    toast.success("Message deleted");
  };

  const viewMessage = async (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.is_read) {
      await supabase.from("contact_messages").update({ is_read: true }).eq("id", msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin" /></div>;

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-lg">Contact Messages</h3>
        {unreadCount > 0 && (
          <Badge className="bg-destructive text-destructive-foreground">{unreadCount} unread</Badge>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="dlh-card p-8 text-center">
          <Mail className="mx-auto mb-2 text-muted-foreground" size={32} />
          <p className="text-muted-foreground">No contact messages yet</p>
        </div>
      ) : (
        <div className="dlh-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow key={msg.id} className={!msg.is_read ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Badge variant={msg.is_read ? "secondary" : "default"} className="text-xs">
                      {msg.is_read ? "Read" : "New"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{msg.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{msg.email}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{msg.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => viewMessage(msg)}>
                        <Eye size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleRead(msg)}>
                        {msg.is_read ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMsg(msg.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span><strong>From:</strong> {selected.name}</span>
                <span><strong>Email:</strong> {selected.email}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(selected.created_at).toLocaleString()}
              </p>
              <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
                {selected.message}
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${selected.email}?subject=Re: ${selected.subject}`}>
                  <Mail className="mr-2 h-4 w-4" /> Reply via Email
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
