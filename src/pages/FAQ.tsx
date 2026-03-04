import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { DLHLogo } from "@/components/DLHLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft, HelpCircle, BookOpen, Brain,
  Shield, Smartphone, ArrowRight,
} from "lucide-react";

const iconMap: Record<string, any> = {
  platform: Smartphone,
  courses: BookOpen,
  ai: Brain,
  privacy: Shield,
};

const defaultFAQ = [
  {
    id: "platform",
    title: "Platform & Account",
    questions: [
      { q: "What is Digital Learning Hub?", a: "Digital Learning Hub (DLH) is an AI-powered education platform that provides personalized tutoring, interactive courses, image generation, and voice-enabled learning—all in one app." },
      { q: "How do I create an account?", a: "Tap 'Get Started' on the home page, fill in your details, verify your email, and you're all set!" },
      { q: "Is DLH available on mobile?", a: "Yes! DLH is built as a mobile-first web app available on any device." },
    ],
  },
  {
    id: "courses",
    title: "Courses & Learning",
    questions: [
      { q: "What courses are available?", a: "DLH offers 70+ courses across categories like Programming, Data Science, Digital Marketing, Design, Business, and more." },
      { q: "Can I track my learning progress?", a: "Yes! Your dashboard shows your active courses and completion status." },
    ],
  },
  {
    id: "ai",
    title: "AI Features",
    questions: [
      { q: "How does the AI tutor work?", a: "The AI tutor uses advanced language models to provide personalized explanations and help." },
      { q: "Can I talk to the AI using voice?", a: "Yes! DLH supports voice interaction for a hands-free learning experience." },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    questions: [
      { q: "Is my data safe on DLH?", a: "Yes. We use industry-standard encryption and secure authentication to protect your data." },
    ],
  },
];

interface FAQItem { q: string; a: string; }
interface FAQCategory { id: string; title: string; questions: FAQItem[]; }

export default function FAQ() {
  const { settings } = useSiteSettings();
  const [categories, setCategories] = useState<FAQCategory[]>(defaultFAQ);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "faq_data")
        .single();
      if (data?.value) {
        setCategories(data.value as unknown as FAQCategory[]);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
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
        <div className="container mx-auto max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <HelpCircle size={16} />
              Frequently Asked Questions
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              How Can We <span className="bg-gradient-primary bg-clip-text text-transparent">Help?</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Find answers to common questions about DLH, our courses, AI features, and more.
            </p>
          </motion.div>

          <div className="space-y-10">
            {categories.map((category, catIdx) => {
              const Icon = iconMap[category.id] || HelpCircle;
              return (
                <motion.div key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: catIdx * 0.1 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <Icon className="text-primary-foreground" size={20} />
                    </div>
                    <h2 className="text-xl font-bold">{category.title}</h2>
                  </div>
                  <div className="dlh-card overflow-hidden">
                    <Accordion type="single" collapsible className="w-full">
                      {category.questions.map((faq, i) => (
                        <AccordionItem key={i} value={`${category.id}-${i}`} className="px-6">
                          <AccordionTrigger className="text-left text-sm md:text-base font-medium">{faq.q}</AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-16 bg-gradient-hero rounded-3xl p-8 md:p-12 text-center text-primary-foreground">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Still Have Questions?</h2>
            <p className="text-primary-foreground/80 max-w-lg mx-auto mb-6">
              Can't find what you're looking for? Reach out to us at digitallearninghub0@gmail.com or WhatsApp 077864684
            </p>
            <Link to="/contact">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 w-full sm:w-auto">
                Contact Support <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
