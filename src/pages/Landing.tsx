import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DLH_COURSES } from "@/lib/courses";
import { DLHLogo } from "@/components/DLHLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  MessageSquare, Image, Mic, BookOpen, Users, Sparkles, ArrowRight,
  CheckCircle, GraduationCap, Brain, Mail, Phone, MapPin, Video, Music,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Tutor",
    description: "Get instant answers, personalized lessons, and homework help from our intelligent AI assistant.",
  },
  {
    icon: Image,
    title: "Image Generation",
    description: "Create stunning visuals from text prompts for presentations, projects, and creative work.",
  },
  {
    icon: Mic,
    title: "Voice Interaction",
    description: "Speak naturally with the AI and receive voice responses for hands-free learning.",
  },
  {
    icon: BookOpen,
    title: "Course Library",
    description: "Access a growing library of courses across various subjects and skill levels.",
  },
  {
    icon: Users,
    title: "Expert Tutors",
    description: "Connect with qualified tutors for personalized guidance and mentorship.",
  },
  {
    icon: Brain,
    title: "Smart Learning",
    description: "AI-powered recommendations that adapt to your learning style and pace.",
  },
];

const benefits = [
  "24/7 AI tutoring assistance",
  "Personalized learning paths",
  "Multi-device sync",
  "Progress tracking",
  "Interactive assignments",
  "Voice & text support",
];

export default function Landing() {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <DLHLogo size="sm" />
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 overflow-hidden">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dlh-blue-light text-primary text-sm font-medium mb-6">
                <Sparkles size={16} />
                {settings.site_tagline || "AI-Powered Education Platform"}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Smart{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  AI Tutor
                </span>{" "}
                for Digital Learning
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Experience the future of education with DLH Smart Tutor. Get personalized 
                lessons, instant answers, and creative tools powered by advanced AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto">
                    Start Learning Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    I Have an Account
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 relative"
            >
              <div className="relative w-full max-w-lg mx-auto">
                <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-3xl rounded-full" />
                <div className="relative bg-card rounded-2xl shadow-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <GraduationCap className="text-primary-foreground" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">DLH Smart Tutor</p>
                      <p className="text-xs text-muted-foreground">AI Assistant</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="chat-bubble-ai max-w-[80%]">
                      <p className="text-sm">Hello! I'm your AI tutor. How can I help you learn today?</p>
                    </div>
                    <div className="chat-bubble-user max-w-[80%] ml-auto">
                      <p className="text-sm">Explain photosynthesis simply</p>
                    </div>
                    <div className="chat-bubble-ai max-w-[80%]">
                      <p className="text-sm">
                        Great question! 🌱 Photosynthesis is how plants make food using sunlight, 
                        water, and CO₂ to create glucose and oxygen...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">Succeed</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
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
                transition={{ delay: index * 0.1 }}
                className="dlh-card-hover p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="text-primary-foreground" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DLH Videos Section */}
      {(settings.demo_video_url || settings.anthem_video_url) && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Watch{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">DLH</span>{" "}
                in Action
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                See what Digital Learning Hub is all about
              </p>
            </motion.div>
            <div className={`grid ${settings.demo_video_url && settings.anthem_video_url ? "md:grid-cols-2" : "max-w-3xl mx-auto"} gap-8`}>
              {settings.demo_video_url && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="dlh-card overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2">
                      <Video size={18} className="text-primary" />
                      <h3 className="font-semibold">DLH Demo</h3>
                    </div>
                    <video
                      src={settings.demo_video_url}
                      controls
                      className="w-full aspect-video bg-black"
                      poster=""
                    />
                  </div>
                </motion.div>
              )}
              {settings.anthem_video_url && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="dlh-card overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2">
                      <Music size={18} className="text-primary" />
                      <h3 className="font-semibold">DLH Anthem</h3>
                    </div>
                    <video
                      src={settings.anthem_video_url}
                      controls
                      className="w-full aspect-video bg-black"
                      poster=""
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Learn Smarter,{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">Not Harder</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                DLH Smart Tutor combines cutting-edge AI technology with proven 
                educational methods to deliver a personalized learning experience 
                that adapts to your needs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="text-dlh-teal flex-shrink-0" size={20} />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-accent opacity-10 blur-3xl rounded-full" />
                <div className="relative bg-card rounded-2xl shadow-xl border border-border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold">Digital Courses</h3>
                    <Link to="/auth?mode=signup" className="text-sm text-primary hover:underline">View All</Link>
                  </div>
                  <div className="space-y-3">
                    {DLH_COURSES.slice(0, 6).map((course) => (
                      <Link
                        key={course.id}
                        to={`/auth?mode=signup&course=${course.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{course.category}</p>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-hero rounded-3xl p-8 md:p-12 text-center text-primary-foreground"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Join thousands of students and tutors who are already using DLH Smart Tutor 
              to achieve their educational goals.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer with Contact */}
      <footer className="py-12 px-4 border-t border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <DLHLogo size="sm" />
              <p className="text-sm text-muted-foreground mt-3">
                {settings.site_tagline || "AI-Powered Education Platform"}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <div className="space-y-2">
                <Link to="/auth?mode=signup" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link>
                <Link to="/auth" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-3">Contact Us</h4>
              <div className="space-y-2">
                {settings.contact_email && (
                  <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Mail size={14} /> {settings.contact_email}
                  </a>
                )}
                {settings.contact_phone && (
                  <a href={`tel:${settings.contact_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Phone size={14} /> {settings.contact_phone}
                  </a>
                )}
                {settings.contact_whatsapp && (
                  <a href={`https://wa.me/${settings.contact_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <MessageSquare size={14} /> WhatsApp: {settings.contact_whatsapp}
                  </a>
                )}
                {settings.contact_address && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={14} /> {settings.contact_address}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {settings.footer_text || `© ${new Date().getFullYear()} Digital Learning Hub. Made by Alikalie.`}
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by DLH Smart Tutor AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
