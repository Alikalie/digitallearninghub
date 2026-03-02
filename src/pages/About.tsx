import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { DLHLogo } from "@/components/DLHLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Users, BookOpen, Brain, Target, Heart,
  ArrowLeft, ArrowRight, Sparkles, Globe2,
} from "lucide-react";

const stats = [
  { label: "Students", value: "5,000+", icon: Users },
  { label: "Courses", value: "70+", icon: BookOpen },
  { label: "Countries", value: "15+", icon: Globe2 },
  { label: "AI Sessions", value: "50K+", icon: Brain },
];

const values = [
  {
    icon: Target,
    title: "Accessible Education",
    description: "We believe quality education should be available to everyone, regardless of location or background.",
  },
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description: "Leveraging cutting-edge AI to create personalized, adaptive learning experiences.",
  },
  {
    icon: Heart,
    title: "Community Driven",
    description: "Built by educators and learners, for educators and learners across Africa and beyond.",
  },
  {
    icon: Sparkles,
    title: "Innovation First",
    description: "Continuously pushing the boundaries of what digital education can achieve.",
  },
];

const team = [
  { name: "Alikalie", role: "Founder & Lead Developer", bio: "Passionate about making education accessible through technology." },
];

export default function About() {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/"><DLHLogo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <div className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="text-primary-foreground" size={40} />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              About{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                {settings.site_name || "Digital Learning Hub"}
              </span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {settings.site_tagline || "Empowering learners with AI-driven education, personalized tutoring, and real-world digital skills."}
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="dlh-card p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="text-primary" size={24} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Mission */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-gradient-hero rounded-3xl p-8 md:p-12 text-primary-foreground text-center mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-primary-foreground/85 max-w-2xl mx-auto text-lg">
              To democratize education by combining world-class AI technology with expertly crafted course content, 
              making quality learning accessible to every student across Africa and beyond.
            </p>
          </motion.div>

          {/* Values */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-2xl font-bold text-center mb-8">Our Values</h2>
            <div className="grid sm:grid-cols-2 gap-6 mb-16">
              {values.map((value) => (
                <div key={value.title} className="dlh-card-hover p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                    <value.icon className="text-primary-foreground" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Ready to Start Learning?</h2>
            <p className="text-muted-foreground mb-6">Join thousands of students using AI to transform their education.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline">Contact Us</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <footer className="py-8 px-4 border-t border-border bg-muted/30">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Powered by <DLHLogo size="sm" />
          </div>
          <p className="text-sm text-muted-foreground">
            {settings.footer_text || `© ${new Date().getFullYear()} Digital Learning Hub. Made by Alikalie.`}
          </p>
        </div>
      </footer>
    </div>
  );
}
