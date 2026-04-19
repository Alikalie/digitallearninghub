import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, CheckCircle2 } from "lucide-react";

interface Props {
  variant?: "card" | "inline";
}

export function TutorRequestButton({ variant = "card" }: Props) {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<"none" | "pending" | "approved" | "rejected" | "is_tutor">("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (profile?.user_type === "tutor") { setStatus("is_tutor"); setLoading(false); return; }
    supabase
      .from("tutor_applications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setStatus(data[0].status as any);
        else setStatus("none");
        setLoading(false);
      });
  }, [user, profile]);

  if (loading || status === "is_tutor") return null;

  if (variant === "inline") {
    return (
      <Link to="/tutor">
        <Button size="sm" variant="outline" className="gap-2">
          <GraduationCap size={14} />
          {status === "pending" ? "Application pending" : status === "rejected" ? "Re-apply as tutor" : "Become a tutor"}
        </Button>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-cyan-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="text-primary" size={22} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">Become a tutor on DLH</h3>
            {status === "pending" && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                <Clock size={10} /> Pending
              </Badge>
            )}
            {status === "approved" && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 gap-1">
                <CheckCircle2 size={10} /> Approved
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "pending"
              ? "Your application is awaiting admin review. You'll get a notification once approved."
              : status === "rejected"
              ? "Your previous application was rejected. You can submit a new one."
              : "Share your expertise with students. Apply to be a tutor and unlock the tutor dashboard."}
          </p>
          <Link to="/tutor">
            <Button size="sm" className="bg-gradient-primary mt-3">
              {status === "pending" ? "View application" : status === "rejected" ? "Re-apply now" : "Apply now"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
