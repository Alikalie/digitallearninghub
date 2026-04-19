import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, Save, Loader2, Plus, X, ShieldAlert, UserCheck } from "lucide-react";

interface PremiumInfo {
  title: string;
  subtitle: string;
  price: string;
  benefits: string[];
  instructions: string;
}

interface PremiumUser {
  user_id: string;
  full_name: string;
  email: string;
}

export function PremiumSettingsTab() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [info, setInfo] = useState<PremiumInfo>({
    title: "Go Premium — Unlock Unlimited Classrooms",
    subtitle: "Upgrade to host more than 3 classrooms and access advanced tutor features.",
    price: "Contact admin for current pricing",
    benefits: ["Create unlimited classrooms", "Higher student capacity per classroom", "Priority support"],
    instructions: "Contact us via WhatsApp or email to upgrade.",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setIsSuperAdmin((data || []).some((r) => r.role === "super_admin"));
    });
    load();
    loadPremium();
  }, [user]);

  const load = async () => {
    const { data } = await supabase.from("admin_settings").select("value").eq("key", "premium_info").maybeSingle();
    if (data?.value && typeof data.value === "object") {
      setInfo((p) => ({ ...p, ...(data.value as any) }));
    }
    setLoading(false);
  };

  const loadPremium = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email").eq("is_premium", true);
    setPremiumUsers((data || []) as PremiumUser[]);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").upsert(
      { key: "premium_info", value: info as any },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Premium settings saved");
  };

  const togglePremium = async (userId: string, makePremium: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_premium: makePremium }).eq("user_id", userId);
    if (error) { toast.error("Failed to update"); return; }
    // Notify the user
    await supabase.from("notifications").insert({
      user_id: userId,
      title: makePremium ? "🎉 You're now Premium!" : "Premium status removed",
      message: makePremium ? "Your tutor account has been upgraded. You can now create unlimited classrooms." : "Your premium status has been revoked. You're back to the free tier (max 3 classrooms).",
    });
    toast.success(makePremium ? "Upgraded to premium" : "Premium removed");
    loadPremium();
  };

  if (!isSuperAdmin) {
    return (
      <div className="dlh-card p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 text-muted-foreground" size={32} />
        <h3 className="font-semibold">Super Admin only</h3>
        <p className="text-sm text-muted-foreground">Premium settings can only be configured by Super Admins.</p>
      </div>
    );
  }

  if (loading) return <div className="p-6 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="dlh-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="text-primary" />
          <h3 className="font-semibold text-lg">Premium Page Content</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Textarea value={info.subtitle} onChange={(e) => setInfo({ ...info, subtitle: e.target.value })} className="mt-1" rows={2} />
          </div>
          <div>
            <Label>Price / pricing label</Label>
            <Input value={info.price} onChange={(e) => setInfo({ ...info, price: e.target.value })} className="mt-1" placeholder="e.g. $9.99/month or Contact admin" />
          </div>

          <div>
            <Label>Benefits</Label>
            <div className="space-y-2 mt-1">
              {info.benefits.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={b}
                    onChange={(e) => {
                      const next = [...info.benefits];
                      next[i] = e.target.value;
                      setInfo({ ...info, benefits: next });
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setInfo({ ...info, benefits: info.benefits.filter((_, j) => j !== i) })}>
                    <X size={14} />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setInfo({ ...info, benefits: [...info.benefits, ""] })}>
                <Plus size={14} className="mr-1" /> Add benefit
              </Button>
            </div>
          </div>

          <div>
            <Label>Payment / upgrade instructions</Label>
            <Textarea value={info.instructions} onChange={(e) => setInfo({ ...info, instructions: e.target.value })} className="mt-1" rows={4} />
          </div>

          <Button onClick={save} disabled={saving} className="bg-gradient-primary">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Premium Settings
          </Button>
        </div>
      </div>

      <div className="dlh-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="text-primary" />
          <h3 className="font-semibold text-lg">Current Premium Users ({premiumUsers.length})</h3>
        </div>
        {premiumUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No premium users yet. Use the User Management tab to grant premium status.</p>
        ) : (
          <div className="space-y-2">
            {premiumUsers.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => togglePremium(u.user_id, false)}>
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
