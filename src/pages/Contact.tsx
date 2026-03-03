import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { DLHLogo } from "@/components/DLHLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Phone, MessageSquare, MapPin, Send, ArrowLeft,
  Globe, Clock, HeadphonesIcon,
} from "lucide-react";

export default function Contact() {
  const { settings } = useSiteSettings();
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const { error } = await supabase.from("contact_messages").insert({
      name: formData.get("name") as string,
      email: formData.get("contact_email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send message. Please try again.");
      return;
    }
    toast.success("Message sent! We'll get back to you shortly.");
    form.reset();
  };

  const contactMethods = [
    {
      icon: Mail,
      label: "Email Us",
      value: settings.contact_email || "hello@dlhub.com",
      href: `mailto:${settings.contact_email || "hello@dlhub.com"}`,
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Phone,
      label: "Call Us",
      value: settings.contact_phone || "+1 (555) 000-0000",
      href: `tel:${settings.contact_phone || "+15550000000"}`,
      color: "bg-dlh-teal/10 text-dlh-teal",
    },
    {
      icon: MessageSquare,
      label: "WhatsApp",
      value: settings.contact_whatsapp || "Chat with us",
      href: `https://wa.me/${(settings.contact_whatsapp || "").replace(/[^0-9]/g, "")}`,
      color: "bg-dlh-success/10 text-dlh-success",
    },
    {
      icon: MapPin,
      label: "Visit Us",
      value: settings.contact_address || "Our Office",
      href: "#",
      color: "bg-dlh-warning/10 text-dlh-warning",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <DLHLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Back */}
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
              <HeadphonesIcon size={16} />
              We're here to help
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Get in{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">Touch</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Have a question, feedback, or need support? Reach out to us through any of our channels.
            </p>
          </motion.div>

          {/* Contact Methods Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
          >
            {contactMethods.map((method, i) => (
              <a
                key={method.label}
                href={method.href}
                target={method.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="dlh-card-hover p-6 text-center group"
              >
                <div className={`w-14 h-14 rounded-2xl ${method.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <method.icon size={24} />
                </div>
                <h3 className="font-semibold mb-1">{method.label}</h3>
                <p className="text-sm text-muted-foreground break-all">{method.value}</p>
              </a>
            ))}
          </motion.div>

          {/* Contact Form + Info */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="dlh-card p-6 md:p-8">
                <h2 className="text-xl font-bold mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" required placeholder="Your name" className="mt-1 input-focus" />
                    </div>
                    <div>
                      <Label htmlFor="contact_email">Email</Label>
                      <Input id="contact_email" type="email" required placeholder="you@example.com" className="mt-1 input-focus" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" required placeholder="How can we help?" className="mt-1 input-focus" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" required placeholder="Tell us more..." rows={5} className="mt-1 input-focus" />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full bg-gradient-primary hover:opacity-90">
                    {sending ? "Sending..." : <>
                      <Send className="mr-2 h-4 w-4" /> Send Message
                    </>}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Info Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 space-y-6"
            >
              <div className="dlh-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  Support Hours
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Monday – Friday</span>
                    <span className="font-medium text-foreground">9AM – 6PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium text-foreground">10AM – 4PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="text-muted-foreground">Closed</span>
                  </div>
                </div>
              </div>

              <div className="dlh-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Globe size={18} className="text-primary" />
                  Follow Us
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Stay connected and get updates on new courses, features, and learning tips.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" target="_blank">Facebook</a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" target="_blank">Twitter</a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" target="_blank">Instagram</a>
                  </Button>
                </div>
              </div>

              <div className="bg-gradient-hero rounded-2xl p-6 text-primary-foreground">
                <h3 className="font-bold text-lg mb-2">Need Instant Help?</h3>
                <p className="text-primary-foreground/80 text-sm mb-4">
                  Our AI tutor is available 24/7 to answer your learning questions.
                </p>
                <Link to="/auth?mode=signup">
                  <Button variant="secondary" className="bg-white text-primary hover:bg-white/90 w-full">
                    Try AI Tutor Free
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
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
