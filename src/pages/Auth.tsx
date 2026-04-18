import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DLHLogo } from "@/components/DLHLogo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, ArrowRight, MailCheck, GraduationCap, BookOpen } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CountrySelect } from "@/components/CountrySelect";
import { DLH_COURSES } from "@/lib/courses";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters").max(50),
  last_name: z.string().min(2, "Last name must be at least 2 characters").max(50),
  email: z.string().email("Please enter a valid email").max(255),
  phone_number: z.string().min(6, "Phone number is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirm_password: z.string(),
  country: z.string().min(2, "Country is required"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    errorMap: () => ({ message: "Please select your gender" }),
  }),
  user_type: z.enum(["student", "tutor"]),
  course_of_interest: z.string().min(1, "Please select a primary course"),
  agree_terms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [termsText, setTermsText] = useState<string>("");
  const [privacyText, setPrivacyText] = useState<string>("");
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  // Load admin-managed Terms & Privacy
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["terms_text", "privacy_text"]);
      data?.forEach((r) => {
        const v = typeof r.value === "string" ? r.value : (r.value ? String(r.value) : "");
        if (r.key === "terms_text") setTermsText(v);
        if (r.key === "privacy_text") setPrivacyText(v);
      });
    })();
  }, []);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: "", last_name: "", email: "", phone_number: "",
      password: "", confirm_password: "", country: "", gender: undefined,
      user_type: "student", course_of_interest: "", agree_terms: false,
    },
  });

  const userType = signupForm.watch("user_type");

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.", { duration: 60000, position: "top-center" });
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email before signing in. Check your inbox for the verification link.", { duration: 60000, position: "top-center" });
        } else {
          toast.error(error.message, { duration: 60000, position: "top-center" });
        }
      } else {
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setLoading(true);
    try {
      const full_name = `${data.first_name.trim()} ${data.last_name.trim()}`;
      const { error } = await signUp(data.email, data.password, {
        full_name,
        phone_number: data.phone_number,
        country: data.country,
        gender: data.gender,
        user_type: data.user_type,
        course_of_interest: data.course_of_interest,
      });
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("User already registered")) {
          toast.error("This email is already registered. Please sign in instead.", { duration: 60000, position: "top-center" });
        } else if (error.message.includes("weak_password") || error.message.includes("password")) {
          toast.error("Password is too weak. Use at least 8 characters with an uppercase letter and a number.", { duration: 60000, position: "top-center" });
        } else {
          toast.error(error.message, { duration: 60000, position: "top-center" });
        }
      } else {
        // If signed up as tutor, also create a pending tutor application so it
        // shows up in admin dashboard and tutor status persists across sessions.
        if (data.user_type === "tutor") {
          const { data: sessionData } = await supabase.auth.getSession();
          const newUserId = sessionData.session?.user?.id;
          if (newUserId) {
            await supabase.from("tutor_applications").insert({
              user_id: newUserId,
              status: "pending",
              answers: [
                { question: "Full Name", answer: full_name },
                { question: "Email", answer: data.email },
                { question: "Phone", answer: data.phone_number },
                { question: "Country", answer: data.country },
                { question: "Primary Course / Subject", answer: data.course_of_interest },
                { question: "Registered as", answer: "Tutor (from signup)" },
              ],
            });

            // Notify admins via edge function (in-app + email)
            try {
              await supabase.functions.invoke("notify-tutor-application", {
                body: {
                  full_name,
                  email: data.email,
                  phone: data.phone_number,
                  country: data.country,
                  course: data.course_of_interest,
                },
              });
            } catch (notifyErr) {
              console.warn("Failed to notify admins:", notifyErr);
            }
          }
        }
        setShowVerifyDialog(true);
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const fields = step === 1
      ? ["first_name", "last_name", "email", "password", "confirm_password"]
      : ["user_type"];
    const isValid = await signupForm.trigger(fields as any);
    if (isValid) setStep(step + 1);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header card with centered logo + name */}
            <div className="bg-gradient-primary px-6 py-6 flex flex-col items-center justify-center text-center">
              <Link to="/" className="inline-block mb-2 bg-white/10 backdrop-blur-md rounded-2xl p-3">
                <DLHLogo size="md" showText={false} />
              </Link>
              <h1 className="text-xl font-bold text-primary-foreground tracking-tight">
                Digital Learning Hub
              </h1>
              <p className="text-xs text-primary-foreground/80 mt-0.5">
                Your AI-powered learning companion
              </p>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8">
              {mode === "login" ? (
                <>
                  <h2 className="text-2xl font-bold mb-1 text-center">Welcome back</h2>
                  <p className="text-muted-foreground mb-6 text-center text-sm">
                    Sign in to continue your learning journey
                  </p>

                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" className="mt-1" {...loginForm.register("email")} />
                      {loginForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.email.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative mt-1">
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pr-10" {...loginForm.register("password")} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                    </Button>
                  </form>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Sign up</button>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-1 text-center">Create your account</h2>
                  <p className="text-muted-foreground mb-6 text-center text-sm">
                    Step {step} of 2 — {step === 1 ? "Your details" : "Your preferences"}
                  </p>

                  {/* Step indicator */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
                    <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
                  </div>

                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    {step === 1 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input id="first_name" placeholder="John" className="mt-1" {...signupForm.register("first_name")} />
                            {signupForm.formState.errors.first_name && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.first_name.message}</p>}
                          </div>
                          <div>
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input id="last_name" placeholder="Doe" className="mt-1" {...signupForm.register("last_name")} />
                            {signupForm.formState.errors.last_name && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.last_name.message}</p>}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="signup_email">Email *</Label>
                          <Input id="signup_email" type="email" placeholder="you@example.com" className="mt-1" {...signupForm.register("email")} />
                          {signupForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.email.message}</p>}
                        </div>
                        <div>
                          <Label htmlFor="signup_password">Password *</Label>
                          <div className="relative mt-1">
                            <Input id="signup_password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pr-10" {...signupForm.register("password")} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Min 8 chars, 1 uppercase, 1 number</p>
                          {signupForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.password.message}</p>}
                        </div>
                        <div>
                          <Label htmlFor="confirm_password">Confirm Password *</Label>
                          <Input id="confirm_password" type="password" placeholder="••••••••" className="mt-1" {...signupForm.register("confirm_password")} />
                          {signupForm.formState.errors.confirm_password && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.confirm_password.message}</p>}
                        </div>
                        <Button type="button" onClick={nextStep} className="w-full bg-gradient-primary hover:opacity-90">
                          Continue <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        {/* Role selector as cards */}
                        <div>
                          <Label>I am registering as *</Label>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <button
                              type="button"
                              onClick={() => signupForm.setValue("user_type", "student")}
                              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                                userType === "student"
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <BookOpen className={`h-5 w-5 ${userType === "student" ? "text-primary" : "text-muted-foreground"}`} />
                              <span className="text-sm font-semibold">Student</span>
                              <span className="text-[10px] text-muted-foreground">Learn & grow</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => signupForm.setValue("user_type", "tutor")}
                              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                                userType === "tutor"
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <GraduationCap className={`h-5 w-5 ${userType === "tutor" ? "text-primary" : "text-muted-foreground"}`} />
                              <span className="text-sm font-semibold">Tutor</span>
                              <span className="text-[10px] text-muted-foreground">Teach & inspire</span>
                            </button>
                          </div>
                          {userType === "tutor" && (
                            <p className="text-xs text-primary/80 mt-2 bg-primary/5 rounded-md p-2">
                              Tutor accounts require admin approval. Your application will be submitted automatically.
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Phone Number *</Label>
                          <Input placeholder="+1234567890" className="mt-1" {...signupForm.register("phone_number")} />
                          {signupForm.formState.errors.phone_number && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.phone_number.message}</p>}
                        </div>
                        <div>
                          <Label>Country *</Label>
                          <div className="mt-1">
                            <CountrySelect
                              value={signupForm.watch("country")}
                              onChange={(v) => signupForm.setValue("country", v, { shouldValidate: true })}
                            />
                          </div>
                          {signupForm.formState.errors.country && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.country.message}</p>}
                        </div>
                        <div>
                          <Label>Gender *</Label>
                          <Select onValueChange={(value: any) => signupForm.setValue("gender", value, { shouldValidate: true })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                          {signupForm.formState.errors.gender && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.gender.message}</p>}
                        </div>
                        <div>
                          <Label>{userType === "tutor" ? "Subject You Teach *" : "Choose Your Primary Course *"}</Label>
                          <Select onValueChange={(value) => signupForm.setValue("course_of_interest", value, { shouldValidate: true })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select a course" /></SelectTrigger>
                            <SelectContent>
                              {DLH_COURSES.map((course) => (
                                <SelectItem key={course.id} value={course.title}>{course.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {signupForm.formState.errors.course_of_interest && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.course_of_interest.message}</p>}
                        </div>

                        <div className="flex items-start space-x-2">
                          <Checkbox id="agree_terms" onCheckedChange={(checked) => signupForm.setValue("agree_terms", checked as boolean, { shouldValidate: true })} />
                          <label htmlFor="agree_terms" className="text-sm text-muted-foreground leading-tight">
                            I agree to the{" "}
                            <button type="button" onClick={() => setShowTerms(true)} className="text-primary font-medium hover:underline">Terms of Service</button>
                            {" "}and{" "}
                            <button type="button" onClick={() => setShowPrivacy(true)} className="text-primary font-medium hover:underline">Privacy Policy</button>
                          </label>
                        </div>
                        {signupForm.formState.errors.agree_terms && <p className="text-sm text-destructive">{signupForm.formState.errors.agree_terms.message}</p>}

                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                          </Button>
                          <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </form>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button onClick={() => { setMode("login"); setStep(1); }} className="text-primary font-medium hover:underline">Sign in</button>
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Email Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={(open) => { setShowVerifyDialog(open); if (!open) { setMode("login"); setStep(1); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <MailCheck className="text-primary" size={32} />
            </div>
            <DialogTitle className="text-xl">Verify Your Email</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            We've sent a verification link to your email address. Please check your inbox (and spam folder) and click the link to activate your account.
          </p>
          <p className="text-xs text-muted-foreground font-medium">
            You must verify your email before you can sign in.
          </p>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => { setShowVerifyDialog(false); setMode("login"); setStep(1); }} className="bg-gradient-primary">
              Go to Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>Please read carefully before creating an account.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {termsText || "By creating an account on Digital Learning Hub, you agree to use the platform responsibly, respect other learners and tutors, and follow our community standards. Content shared on the platform must be original or properly attributed. Misuse of the platform may result in suspension. Administrators reserve the right to update these terms at any time."}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowTerms(false)} className="bg-gradient-primary">I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>How we protect and use your data.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {privacyText || "Digital Learning Hub collects only the information necessary to provide our learning services: your name, email, phone number, country, gender and course interest. Your data is stored securely and is never sold to third parties. You may request account deletion at any time. We use cookies only for authentication and session management."}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowPrivacy(false)} className="bg-gradient-primary">I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
