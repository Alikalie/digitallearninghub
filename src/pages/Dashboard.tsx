import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Image,
  BookOpen,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chatsRes, imagesRes] = await Promise.all([
        supabase
          .from("chat_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("generated_images")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (chatsRes.data) setRecentChats(chatsRes.data);
      if (imagesRes.data) setRecentImages(imagesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Start AI Chat",
      description: "Get instant help with your studies",
      icon: MessageSquare,
      href: "/chat",
      color: "bg-gradient-primary",
    },
    {
      title: "Generate Image",
      description: "Create visuals from text prompts",
      icon: Image,
      href: "/image-generator",
      color: "bg-gradient-accent",
    },
    {
      title: "Browse Courses",
      description: "Explore our course library",
      icon: BookOpen,
      href: "/courses",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
    },
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-hero rounded-2xl p-6 lg:p-8 text-primary-foreground"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                {greeting()}, {profile?.full_name ? (profile.full_name.trim().split(/\s+/).pop() || profile.full_name) : "there"}! 👋
              </h1>
              <p className="text-primary-foreground/80 max-w-lg">
                Ready to continue your learning journey? Your AI tutor is here to help 
                you with anything you need.
              </p>
            </div>
            <Link to="/chat">
              <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <Sparkles className="mr-2 h-4 w-4" />
                Start Learning
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={action.href}>
                  <div className="dlh-card-hover p-5 h-full">
                    <div
                      className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-4`}
                    >
                      <action.icon className="text-white" size={24} />
                    </div>
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Chats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Chats</h2>
              <Link
                to="/chat"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="dlh-card divide-y divide-border">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading...
                </div>
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
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center">
                  <MessageSquare className="mx-auto mb-2 text-muted-foreground" size={32} />
                  <p className="text-muted-foreground text-sm">No chats yet</p>
                  <Link to="/chat">
                    <Button variant="link" className="mt-2">
                      Start your first chat
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Images */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Generated Images</h2>
              <Link
                to="/image-generator"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="dlh-card p-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading...
                </div>
              ) : recentImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {recentImages.map((image) => (
                    <div
                      key={image.id}
                      className="aspect-square rounded-lg overflow-hidden bg-muted"
                    >
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
                  <Image className="mx-auto mb-2 text-muted-foreground" size={32} />
                  <p className="text-muted-foreground text-sm">No images yet</p>
                  <Link to="/image-generator">
                    <Button variant="link" className="mt-2">
                      Create your first image
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="dlh-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="text-primary" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recentChats.length}</p>
                  <p className="text-sm text-muted-foreground">Conversations</p>
                </div>
              </div>
            </div>
            <div className="dlh-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-dlh-teal/10 flex items-center justify-center">
                  <Image className="text-dlh-teal" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recentImages.length}</p>
                  <p className="text-sm text-muted-foreground">Images Created</p>
                </div>
              </div>
            </div>
            <div className="dlh-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-dlh-success/10 flex items-center justify-center">
                  <TrendingUp className="text-dlh-success" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">Active</p>
                  <p className="text-sm text-muted-foreground">Learning Status</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
