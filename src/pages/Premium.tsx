import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Crown, Check, ArrowLeft, Sparkles, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Premium() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSiteSettings();
  const [premiumInfo, setPremiumInfo] = useState({
    title: "Go Premium — Unlock Unlimited Classrooms",
    subtitle: "Upgrade to host more than 3 classrooms and access advanced tutor features.",
    price: "Contact admin for current pricing",
    benefits: [
      "Create unlimited classrooms",
      "Higher student capacity per classroom",
      "Priority support",
      "Featured tutor badge",
    ] as string[],
    instructions: "To upgrade, contact our team via WhatsApp or email below. Once payment is confirmed, your account will be upgraded within 24 hours.",
  });

  useEffect(() => {
    supabase.from("admin_settings").select("value").eq("key", "premium_info").maybeSingle().then(({ data }) => {
      if (data?.value && typeof data.value === "object") {
        setPremiumInfo((p) => ({ ...p, ...(data.value as any) }));
      }
    });
  }, []);

  const isPremium = (profile as any)?.is_premium;
  const whatsapp = settings?.contact_whatsapp;
  const email = settings?.contact_email;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto pb-20">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {isPremium && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
            <Crown className="text-primary" />
            <div>
              <p className="font-semibold">You're a Premium tutor</p>
              <p className="text-sm text-muted-foreground">Enjoy unlimited classrooms and priority features.</p>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-hero text-primary-foreground p-8"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-medium mb-4">
              <Sparkles size={12} /> Premium Tutor
            </div>
            <h1 className="text-3xl font-bold mb-2">{premiumInfo.title}</h1>
            <p className="text-primary-foreground/85 max-w-xl">{premiumInfo.subtitle}</p>
            <p className="mt-6 text-2xl font-bold">{premiumInfo.price}</p>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 mt-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Crown className="text-primary" size={18} /> What you get</h2>
            <ul className="space-y-3">
              {premiumInfo.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="text-primary mt-0.5 flex-shrink-0" size={16} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-2">How to upgrade</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{premiumInfo.instructions}</p>
            <div className="space-y-2">
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="block">
                  <Button className="w-full bg-gradient-primary">
                    <MessageCircle className="mr-2 h-4 w-4" /> Chat on WhatsApp
                  </Button>
                </a>
              )}
              {email && (
                <a href={`mailto:${email}?subject=Premium Upgrade Request`} className="block">
                  <Button variant="outline" className="w-full">Email us</Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
