import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { DLHLogo } from "@/components/DLHLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft, HelpCircle, BookOpen, Brain, CreditCard,
  Shield, Smartphone, ArrowRight,
} from "lucide-react";

const faqCategories = [
  {
    id: "platform",
    icon: Smartphone,
    title: "Platform & Account",
    questions: [
      {
        q: "What is Digital Learning Hub?",
        a: "Digital Learning Hub (DLH) is an AI-powered education platform that provides personalized tutoring, interactive courses, image generation, and voice-enabled learning—all in one app.",
      },
      {
        q: "How do I create an account?",
        a: "Tap 'Get Started' on the home page, fill in your first name, last name, email, and a strong password (at least 8 characters with uppercase and a number). Then verify your email and you're all set!",
      },
      {
        q: "Is DLH available on mobile?",
        a: "Yes! DLH is built as a native mobile app available for both iOS and Android. You can install it on your phone for the best experience.",
      },
      {
        q: "Can I use DLH on multiple devices?",
        a: "Absolutely. Your progress, chat history, and settings sync automatically across all your devices when you sign in.",
      },
      {
        q: "How do I reset my password?",
        a: "Go to Settings → Security tab and update your password. If you're locked out, use the 'Forgot Password' link on the sign-in page.",
      },
    ],
  },
  {
    id: "courses",
    icon: BookOpen,
    title: "Courses & Learning",
    questions: [
      {
        q: "What courses are available?",
        a: "DLH offers 70+ courses across categories like Programming, Data Science, Digital Marketing, Design, Business, and more. New courses are added regularly.",
      },
      {
        q: "Are the courses free?",
        a: "Many courses are free to access. Premium courses with advanced content and certifications may require a subscription.",
      },
      {
        q: "Can I track my learning progress?",
        a: "Yes! Your dashboard shows your active courses, completion status, and learning streaks. The AI also adapts recommendations based on your progress.",
      },
      {
        q: "Do I get a certificate after completing a course?",
        a: "Eligible courses offer digital certificates upon completion that you can share on your professional profiles.",
      },
      {
        q: "Can I suggest a new course topic?",
        a: "We'd love to hear from you! Use the Contact page to send us your course suggestions and we'll consider adding them.",
      },
    ],
  },
  {
    id: "ai",
    icon: Brain,
    title: "AI Features",
    questions: [
      {
        q: "How does the AI tutor work?",
        a: "The AI tutor uses advanced language models to understand your questions and provide clear, personalized explanations. It can help with homework, explain concepts, quiz you, and guide your learning path.",
      },
      {
        q: "What is the Image Generator?",
        a: "The Image Generator lets you create visuals from text descriptions. It's perfect for presentations, creative projects, and visualizing concepts you're learning about.",
      },
      {
        q: "Can I talk to the AI using voice?",
        a: "Yes! DLH supports voice interaction. You can speak your questions naturally and receive voice responses for a hands-free learning experience.",
      },
      {
        q: "Is my chat history saved?",
        a: "Yes, all your conversations with the AI tutor are saved to your account. You can review past sessions anytime from the Chat page.",
      },
      {
        q: "How accurate is the AI?",
        a: "Our AI is powered by state-of-the-art models and is highly accurate. However, we always recommend cross-referencing critical information with your course materials and instructors.",
      },
    ],
  },
  {
    id: "privacy",
    icon: Shield,
    title: "Privacy & Security",
    questions: [
      {
        q: "Is my data safe on DLH?",
        a: "Yes. We use industry-standard encryption and secure authentication to protect your personal data, chat history, and learning progress.",
      },
      {
        q: "Who can see my profile?",
        a: "Your profile information is private by default. Only platform administrators can view user details for support purposes.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Contact our support team through the Contact page and we'll process your account deletion request.",
      },
    ],
  },
];

export default function FAQ() {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/"><DLHLogo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">About</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Contact</Link>
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

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <HelpCircle size={16} />
              Frequently Asked Questions
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              How Can We{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">Help?</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Find answers to common questions about DLH, our courses, AI features, and more.
            </p>
          </motion.div>

          {/* FAQ Categories */}
          <div className="space-y-10">
            {faqCategories.map((category, catIdx) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <category.icon className="text-primary-foreground" size={20} />
                  </div>
                  <h2 className="text-xl font-bold">{category.title}</h2>
                </div>
                <div className="dlh-card overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, i) => (
                      <AccordionItem key={i} value={`${category.id}-${i}`} className="px-6">
                        <AccordionTrigger className="text-left text-sm md:text-base font-medium">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Still need help CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 bg-gradient-hero rounded-3xl p-8 md:p-12 text-center text-primary-foreground"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Still Have Questions?</h2>
            <p className="text-primary-foreground/80 max-w-lg mx-auto mb-6">
              Can't find what you're looking for? Our team is ready to help you out.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contact">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 w-full sm:w-auto">
                  Contact Support <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="outline" className="border-white/30 text-primary-foreground hover:bg-white/10 w-full sm:w-auto">
                  Try AI Tutor
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
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
