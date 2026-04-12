import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DLH_COURSES } from "@/lib/courses";
import { DLHLogo } from "@/components/DLHLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  MessageSquare, Image, Mic, BookOpen, Users, Sparkles, ArrowRight,
  CheckCircle, GraduationCap, Brain, Video, Music, Menu, X, Zap, Globe, Shield,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Tutor",
    description: "Get instant answers, personalized lessons, and homework help from our intelligent AI assistant.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Image,
    title: "Image Generation",
    description: "Create stunning visuals from text prompts for presentations, projects, and creative work.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Mic,
    title: "Voice Interaction",
    description: "Speak naturally with the AI and receive voice responses for hands-free learning.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: BookOpen,
    title: "Course Library",
    description: "Access a growing library of courses across various subjects and skill levels.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Users,
    title: "Expert Tutors",
    description: "Connect with qualified tutors for personalized guidance and mentorship.",
    color: "from-rose-500 to-red-500",
  },
  {
    icon: Brain,
    title: "Smart Learning",
    description: "AI-powered recommendations that adapt to your learning style and pace.",
    color: "from-cyan-500 to-blue-500",
  },
];

const stats = [
  { value: "10K+", label: "Active Students" },
  { value: "500+", label: "Video Lessons" },
  { value: "50+", label: "Expert Tutors" },
  { value: "24/7", label: "AI Support" },
];

const benefits = [
  { icon: Zap, text: "24/7 AI tutoring assistance" },
  { icon: Globe, text: "Multi-device sync" },
  { icon: Shield, text: "Progress tracking" },
  { icon: CheckCircle, text: "Interactive assignments" },
  { icon: Mic, text: "Voice & text support" },
  { icon: Brain, text: "Personalized learning paths" },
];

export default function Landing() {
  const { settings } = useSiteSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <DLHLogo size="sm" />
          <div className="hidden sm:flex items-center gap-6">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/auth"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-md shadow-primary/25">Get Started</Button>
            </Link>
          </div>
          <button className="sm:hidden text-foreground p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-lg text-sm hover:bg-muted transition-colors">About</Link>
                <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-lg text-sm hover:bg-muted transition-colors">Contact</Link>
                <Link to="/faq" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-lg text-sm hover:bg-muted transition-colors">FAQ</Link>
                <div className="flex gap-2 pt-3">
                  <Link to="/auth" className="flex-1"><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
                  <Link to="/auth?mode=signup" className="flex-1"><Button size="sm" className="w-full bg-gradient-primary">Get Started</Button></Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="flex-1 text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
              >
                <Sparkles size={16} className="animate-pulse" />
                {settings.site_tagline || "AI-Powered Education Platform"}
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Your Smart{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  AI Tutor
                </span>{" "}
                for{" "}
                <span className="relative">
                  Digital Learning
                  <svg className="absolute -bottom-1 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                    <path d="M2 6C50 2 150 2 198 6" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
                  </svg>
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl leading-relaxed">
                Experience the future of education with DLH Smart Tutor. Personalized 
                lessons, instant answers, and creative tools powered by advanced AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto shadow-lg shadow-primary/25 h-12 px-8 text-base">
                    Start Learning Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base border-border/60">
                    I Have an Account
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex-1 relative w-full max-w-lg"
            >
              <div className="absolute -inset-4 bg-gradient-primary opacity-[0.07] blur-3xl rounded-3xl" />
              <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50 p-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-3 mb-5 relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
                    <GraduationCap className="text-primary-foreground" size={22} />
                  </div>
                  <div>
                    <p className="font-bold">DLH Smart Tutor</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-xs text-muted-foreground">Online</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-muted/60 rounded-2xl rounded-tl-sm p-3.5 max-w-[85%]"
                  >
                    <p className="text-sm">Hello! 👋 I'm your AI tutor. How can I help you learn today?</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 }}
                    className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3.5 max-w-[75%] ml-auto"
                  >
                    <p className="text-sm">Explain photosynthesis simply</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.6 }}
                    className="bg-muted/60 rounded-2xl rounded-tl-sm p-3.5 max-w-[85%]"
                  >
                    <p className="text-sm">
                      Great question! 🌱 Photosynthesis is how plants make food using sunlight, 
                      water, and CO₂ to create glucose and oxygen...
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-6 border-y border-border/50 bg-muted/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-2xl md:text-3xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Features</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">Succeed</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Powerful AI tools designed to enhance your learning experience
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group relative bg-card rounded-2xl border border-border/50 p-6 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DLH Videos Section */}
      {(settings.demo_video_url || settings.anthem_video_url) && (
        <section className="py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Media</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-3 mb-4">
                Watch <span className="bg-gradient-primary bg-clip-text text-transparent">DLH</span> in Action
              </h2>
            </motion.div>
            <div className={`grid ${settings.demo_video_url && settings.anthem_video_url ? "md:grid-cols-2" : "max-w-3xl mx-auto"} gap-8`}>
              {settings.demo_video_url && (
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-border/50 flex items-center gap-2">
                      <Video size={18} className="text-primary" />
                      <h3 className="font-bold">DLH Demo</h3>
                    </div>
                    <video src={settings.demo_video_url} controls className="w-full aspect-video bg-foreground/5" />
                  </div>
                </motion.div>
              )}
              {settings.anthem_video_url && (
                <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-border/50 flex items-center gap-2">
                      <Music size={18} className="text-primary" />
                      <h3 className="font-bold">DLH Anthem</h3>
                    </div>
                    <video src={settings.anthem_video_url} controls className="w-full aspect-video bg-foreground/5" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Why DLH?</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-3 mb-6">
                Learn Smarter,{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">Not Harder</span>
              </h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                DLH Smart Tutor combines cutting-edge AI technology with proven 
                educational methods to deliver a personalized learning experience.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, i) => (
                  <motion.div
                    key={benefit.text}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/30"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="text-primary" size={16} />
                    </div>
                    <span className="text-sm font-medium">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-accent opacity-[0.06] blur-3xl rounded-3xl" />
                <div className="relative bg-card rounded-2xl shadow-2xl border border-border/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Digital Courses</h3>
                    <Link to="/auth?mode=signup" className="text-sm text-primary hover:underline font-medium">View All →</Link>
                  </div>
                  <div className="space-y-2">
                    {DLH_COURSES.slice(0, 6).map((course, i) => (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          to={`/auth?mode=signup&course=${course.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                            <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{course.title}</p>
                            <p className="text-xs text-muted-foreground">{course.category}</p>
                          </div>
                          <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-gradient-hero rounded-3xl p-10 md:p-16 text-center text-primary-foreground overflow-hidden"
          >
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-10 text-lg">
                Join thousands of students and tutors who are already using DLH Smart Tutor 
                to achieve their educational goals.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-xl h-12 px-8 text-base font-bold">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <DLHLogo size="sm" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Digital Learning Hub. Made by Alikalie.</p>
          <div className="flex gap-4">
            <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground">Contact</Link>
            <Link to="/faq" className="text-xs text-muted-foreground hover:text-foreground">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
