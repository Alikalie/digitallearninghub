import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Reply, Trash2, Send, Loader2 } from "lucide-react";

interface CommentRow {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CommentNode extends CommentRow {
  replies: CommentNode[];
  profile?: ProfileRow;
}

interface Props {
  postId: string;
  currentUserId: string;
  canModerate?: boolean; // tutor or admin
}

const initialsOf = (name?: string | null) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const colorFor = (id: string) => {
  // deterministic gentle palette
  const palette = [
    "bg-blue-500", "bg-emerald-500", "bg-purple-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500",
    "bg-indigo-500", "bg-teal-500", "bg-fuchsia-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
};

export function UserAvatar({ profile, userId, size = 32 }: { profile?: ProfileRow; userId: string; size?: number }) {
  const initials = initialsOf(profile?.full_name);
  const cls = colorFor(userId);
  return (
    <Avatar style={{ width: size, height: size }}>
      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || "User"} />}
      <AvatarFallback className={`${cls} text-white text-xs font-semibold`}>{initials}</AvatarFallback>
    </Avatar>
  );
}

export default function PostComments({ postId, currentUserId, canModerate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState<CommentNode[]>([]);
  const [count, setCount] = useState(0);
  const [newText, setNewText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCount = async () => {
    const { count } = await supabase
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);
    setCount(count || 0);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const rows = (data || []) as CommentRow[];
    setCount(rows.length);

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let profiles: ProfileRow[] = [];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      profiles = (profs || []) as ProfileRow[];
    }
    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

    const map = new Map<string, CommentNode>();
    rows.forEach((r) => map.set(r.id, { ...r, replies: [], profile: profileMap.get(r.user_id) }));
    const roots: CommentNode[] = [];
    map.forEach((node) => {
      if (node.parent_comment_id && map.has(node.parent_comment_id)) {
        map.get(node.parent_comment_id)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });
    setTree(roots);
    setLoading(false);
  };

  useEffect(() => { loadCount(); }, [postId]);
  useEffect(() => { if (open) load(); }, [open, postId]);

  const submit = async (parentId: string | null, text: string) => {
    const content = text.trim();
    if (!content) return;
    if (content.length > 2000) { toast.error("Comment is too long"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      parent_comment_id: parentId,
      user_id: currentUserId,
      content,
    });
    setSubmitting(false);
    if (error) { toast.error("Failed to post comment"); return; }
    if (parentId) { setReplyText(""); setReplyTo(null); } else { setNewText(""); }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    load();
  };

  const renderNode = (node: CommentNode, depth = 0) => (
    <div key={node.id} className={depth > 0 ? "ml-8 mt-2 border-l border-border pl-3" : "mt-2"}>
      <div className="flex items-start gap-2">
        <UserAvatar profile={node.profile} userId={node.user_id} size={28} />
        <div className="flex-1 min-w-0">
          <div className="bg-muted/60 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold">{node.profile?.full_name || "Member"}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(node.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{node.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            <button
              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              onClick={() => { setReplyTo(replyTo === node.id ? null : node.id); setReplyText(""); }}
            >
              <Reply size={12} /> Reply
            </button>
            {(node.user_id === currentUserId || canModerate) && (
              <button
                className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                onClick={() => remove(node.id)}
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>

          {replyTo === node.id && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${node.profile?.full_name || "member"}...`}
                rows={2}
                className="text-sm min-h-0"
              />
              <Button size="sm" disabled={submitting || !replyText.trim()} onClick={() => submit(node.id, replyText)} className="bg-gradient-primary self-end">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send size={14} />}
              </Button>
            </div>
          )}

          {node.replies.map((child) => renderNode(child, depth + 1))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="border-t border-border pt-2 mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
      >
        <MessageCircle size={14} /> {count} {count === 1 ? "comment" : "comments"} {open ? "• hide" : "• show"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="text-sm min-h-0"
            />
            <Button size="sm" disabled={submitting || !newText.trim()} onClick={() => submit(null, newText)} className="bg-gradient-primary self-end">
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send size={14} />}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-3 text-muted-foreground text-xs"><Loader2 className="inline animate-spin mr-1" size={12} /> Loading…</div>
          ) : tree.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Be the first to comment.</p>
          ) : (
            <div>{tree.map((n) => renderNode(n))}</div>
          )}
        </div>
      )}
    </div>
  );
}
