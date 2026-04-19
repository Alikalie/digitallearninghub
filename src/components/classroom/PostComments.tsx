import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Reply, Trash2, Send, Loader2, Pencil, X, Check } from "lucide-react";

interface CommentRow {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
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

interface MentionUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Props {
  postId: string;
  classroomId: string;
  currentUserId: string;
  canModerate?: boolean;
}

const initialsOf = (name?: string | null) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const colorFor = (id: string) => {
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

// Render @mentions as styled badges
function renderContent(text: string) {
  const parts = text.split(/(@[\w.\-]+(?:\s[\w.\-]+)?)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-primary font-medium bg-primary/10 px-1 rounded">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

// Mention textarea with autocomplete
function MentionInput({
  value, onChange, placeholder, members, rows = 2, autoFocus = false,
}: {
  value: string;
  onChange: (v: string, mentioned: string[]) => void;
  placeholder: string;
  members: MentionUser[];
  rows?: number;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);

  const detectMentions = (text: string): string[] => {
    // For each member, check if their full_name appears prefixed with @
    return members
      .filter((m) => new RegExp(`@${m.full_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text))
      .map((m) => m.user_id);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    const caret = e.target.selectionStart || 0;
    onChange(v, detectMentions(v));

    // Detect mention trigger
    const before = v.slice(0, caret);
    const m = before.match(/(?:^|\s)@([\w.\-]*)$/);
    if (m) {
      setSuggestOpen(true);
      setFilter(m[1].toLowerCase());
      setMentionStart(caret - m[1].length - 1);
    } else {
      setSuggestOpen(false);
    }
  };

  const pickMention = (member: MentionUser) => {
    if (!ref.current) return;
    const v = value;
    const before = v.slice(0, mentionStart);
    const after = v.slice((ref.current.selectionStart || 0));
    const insert = `@${member.full_name} `;
    const next = before + insert + after;
    onChange(next, detectMentions(next));
    setSuggestOpen(false);
    setTimeout(() => {
      ref.current?.focus();
      const pos = (before + insert).length;
      ref.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const filtered = members
    .filter((m) => m.full_name.toLowerCase().includes(filter))
    .slice(0, 6);

  return (
    <div className="relative flex-1">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className="text-sm min-h-0"
      />
      {suggestOpen && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => pickMention(m)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
            >
              <UserAvatar profile={{ user_id: m.user_id, full_name: m.full_name, avatar_url: m.avatar_url }} userId={m.user_id} size={24} />
              <span className="text-sm truncate">{m.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostComments({ postId, classroomId, currentUserId, canModerate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState<CommentNode[]>([]);
  const [count, setCount] = useState(0);
  const [members, setMembers] = useState<MentionUser[]>([]);

  const [newText, setNewText] = useState("");
  const [newMentions, setNewMentions] = useState<string[]>([]);

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyMentions, setReplyMentions] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editMentions, setEditMentions] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const loadCount = async () => {
    const { count } = await supabase
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);
    setCount(count || 0);
  };

  const loadMembers = async () => {
    // Tutor + classroom members
    const { data: room } = await supabase.from("classrooms").select("tutor_id").eq("id", classroomId).single();
    const { data: ms } = await supabase.from("classroom_members").select("user_id").eq("classroom_id", classroomId);
    const ids = Array.from(new Set([...(ms || []).map((m) => m.user_id), room?.tutor_id].filter(Boolean))) as string[];
    if (!ids.length) { setMembers([]); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", ids);
    setMembers((profs || []).map((p) => ({ user_id: p.user_id, full_name: p.full_name || "Member", avatar_url: p.avatar_url })));
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
  useEffect(() => { if (open) { load(); loadMembers(); } }, [open, postId, classroomId]);

  const notifyMentions = async (mentioned: string[], snippet: string) => {
    const unique = Array.from(new Set(mentioned)).filter((id) => id !== currentUserId);
    if (!unique.length) return;
    const me = members.find((m) => m.user_id === currentUserId)?.full_name || "Someone";
    const rows = unique.map((uid) => ({
      user_id: uid,
      title: `${me} mentioned you in a comment`,
      message: snippet.slice(0, 140),
    }));
    await supabase.from("notifications").insert(rows);
  };

  const submit = async (parentId: string | null, text: string, mentioned: string[]) => {
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
    await notifyMentions(mentioned, content);
    if (parentId) { setReplyText(""); setReplyMentions([]); setReplyTo(null); }
    else { setNewText(""); setNewMentions([]); }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    load();
  };

  const startEdit = (n: CommentNode) => {
    setEditingId(n.id);
    setEditText(n.content);
    setEditMentions([]);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const content = editText.trim();
    if (!content) { toast.error("Comment cannot be empty"); return; }
    const { error } = await supabase
      .from("post_comments")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", editingId);
    if (error) { toast.error("Failed to update"); return; }
    await notifyMentions(editMentions, content);
    setEditingId(null);
    setEditText("");
    setEditMentions([]);
    load();
  };

  const renderNode = (node: CommentNode, depth = 0) => {
    const isEditing = editingId === node.id;
    return (
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
                {node.edited_at && (
                  <span className="text-[10px] text-muted-foreground italic">(edited)</span>
                )}
              </div>
              {isEditing ? (
                <div className="mt-1.5 flex gap-2">
                  <MentionInput
                    value={editText}
                    onChange={(v, m) => { setEditText(v); setEditMentions(m); }}
                    placeholder="Edit your comment..."
                    members={members}
                    rows={2}
                    autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" onClick={saveEdit} className="bg-gradient-primary h-7 px-2"><Check size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 px-2"><X size={14} /></Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{renderContent(node.content)}</p>
              )}
            </div>
            {!isEditing && (
              <div className="flex items-center gap-3 mt-1 ml-1">
                <button
                  className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  onClick={() => { setReplyTo(replyTo === node.id ? null : node.id); setReplyText(""); setReplyMentions([]); }}
                >
                  <Reply size={12} /> Reply
                </button>
                {node.user_id === currentUserId && (
                  <button
                    className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    onClick={() => startEdit(node)}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
                {(node.user_id === currentUserId || canModerate) && (
                  <button
                    className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                    onClick={() => remove(node.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            )}

            {replyTo === node.id && (
              <div className="mt-2 flex gap-2">
                <MentionInput
                  value={replyText}
                  onChange={(v, m) => { setReplyText(v); setReplyMentions(m); }}
                  placeholder={`Reply to ${node.profile?.full_name || "member"}...`}
                  members={members}
                  rows={2}
                  autoFocus
                />
                <Button size="sm" disabled={submitting || !replyText.trim()} onClick={() => submit(node.id, replyText, replyMentions)} className="bg-gradient-primary self-end">
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send size={14} />}
                </Button>
              </div>
            )}

            {node.replies.map((child) => renderNode(child, depth + 1))}
          </div>
        </div>
      </div>
    );
  };

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
            <MentionInput
              value={newText}
              onChange={(v, m) => { setNewText(v); setNewMentions(m); }}
              placeholder="Write a comment... use @ to mention"
              members={members}
              rows={2}
            />
            <Button size="sm" disabled={submitting || !newText.trim()} onClick={() => submit(null, newText, newMentions)} className="bg-gradient-primary self-end">
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
