import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TutorRequestButton } from "@/components/TutorRequestButton";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Image as ImageIcon,
  BookOpen,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  Trophy,
  Flame,
  Zap,
} from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
  const [classroomsCount, setClassroomsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chatsRes, imagesRes, memberRes] = await Promise.all([
        supabase.from("chat_sessions").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("generated_images").select("*").order("created_at", { ascending: false }).limit(4),
        supabase.from("classroom_members").select("classroom_id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      if (chatsRes.data) setRecentChats(chatsRes.data);
      if (imagesRes.data) setRecentImages(imagesRes.data);
      if (memberRes.count !== null) setClassroomsCount(memberRes.count || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getLastName = () => {
    if (!profile?.full_name) return "there";
    const parts = profile.full_name.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  };

  const dailyTip = () => {
    const tips = [
      "Small steps every day lead to big breakthroughs. 🚀",
      "Curiosity is the engine of learning. Ask one question today.",
      "Practice beats perfection — write one line of code, design one frame.",
      "Teach what you learned today to remember it forever.",
      "Your future self will thank you for the 15 minutes you study now.",
      "Excellence is built one habit at a time. — DLH",
      "Creativity grows when you experiment without fear.",
    ];
    return tips[new Date().getDate() % tips.length];
  };

  const learningCards = [
    {
      title: "Talk to your AI Tutor",
      description: "Ask anything — homework, projects, career advice.",
      icon: MessageSquare,
      href: "/chat",
      gradient: "from-primary to-primary/70",
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Generate visuals",
      description: "Turn your ideas into images for projects & posts.",
      icon: ImageIcon,
      href: "/image-generator",
      gradient: "from-cyan-500 to-blue-500",
      accent: "text-cyan-600",
      bg: "bg-cyan-500/10",
    },
    {
      title: "Browse Courses",
      description: "120+ digital skills courses with course-specific tutors.",
      icon: BookOpen,
      href: "/courses",
      gradient: "from-violet-500 to-fuchsia-500",
      accent: "text-violet-600",
      bg: "bg-violet-500/10",
    },
    {
      title: "Join Classrooms",
      description: "Learn with peers, post questions, submit assignments.",
      icon: Users,
      href: "/classrooms",
      gradient: "from-emerald-500 to-teal-500",
      accent: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-8 pb-24">
        {/* Hero greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-hero text-primary-foreground"
        >
          {/* Decorative orbs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="relative p-6 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-medium">
                  <Flame size={12} /> Daily learning streak
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                  {greeting()},{" "}
                  <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    {getLastName()}
                  </span>{" "}
                  👋
                </h1>
                <p className="text-primary-foreground/85 max-w-xl text-sm lg:text-base">
                  {dailyTip()}
                </p>
                {profile?.course_of_interest && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm">
                    <BookOpen size={14} />
                    <span>
                      Primary Course: <strong>{profile.course_of_interest}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/chat">
                  <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90 w-full sm:w-auto">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Learning
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button variant="outline" size="lg" className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stat strip */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Conversations", value: recentChats.length, icon: MessageSquare },
                { label: "Images", value: recentImages.length, icon: ImageIcon },
                { label: "Classrooms", value: classroomsCount, icon: Users },
                { label: "Status", value: "Active", icon: Zap },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur px-3 py-2.5 border border-white/10">
                  <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
                    <s.icon size={12} />
                    {s.label}
                  </div>
                  <div className="text-xl font-bold mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Interactive learning cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Learn your way</h2>
            <span className="text-xs text-muted-foreground">Powered by DLH Smart Tutor</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {learningCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
              >
                <Link to={card.href} className="block h-full group">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 h-full hover:shadow-lg hover:border-primary/30 transition-all">
                    {/* Decorative gradient */}
                    <div
                      className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}
                    />
                    <div className={`relative w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                      <card.icon className={card.accent} size={22} />
                    </div>
                    <h3 className="font-semibold mb-1 relative">{card.title}</h3>
                    <p className="text-sm text-muted-foreground relative leading-snug">
                      {card.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity relative">
                      Open <ArrowRight size={12} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tutor request CTA */}
        <TutorRequestButton />

        {/* Recent activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Chats</h2>
              <Link to="/chat" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : recentChats.length > 0 ? (
                recentChats.map((chat) => (
                  <Link
                    key={chat.id}
                    to={`/chat?session=${chat.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="text-primary" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chat.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(chat.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center">
                  <MessageSquare className="mx-auto mb-2 text-muted-foreground" size={32} />
                  <p className="text-muted-foreground text-sm">No chats yet</p>
                  <Link to="/chat">
                    <Button variant="link" className="mt-2">Start your first chat</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Generated Images</h2>
              <Link to="/image-generator" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : recentImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {recentImages.map((image) => (
                    <div key={image.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={image.image_url}
                        alt={image.prompt}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <ImageIcon className="mx-auto mb-2 text-muted-foreground" size={32} />
                  <p className="text-muted-foreground text-sm">No images yet</p>
                  <Link to="/image-generator">
                    <Button variant="link" className="mt-2">Create your first image</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Motivational footer card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-cyan-500/5 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="text-primary" size={26} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Keep going, {getLastName()} 💪</h3>
              <p className="text-sm text-muted-foreground">
                Every great Sierra Leonean innovator started with one lesson. You're on the path.
              </p>
            </div>
            <TrendingUp className="text-primary hidden sm:block" size={22} />
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
