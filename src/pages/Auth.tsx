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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DLHLogo } from "@/components/DLHLogo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
import { DLH_COURSES } from "@/lib/courses";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").max(255),
  phone_number: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  confirm_password: z.string(),
  country: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  user_type: z.enum(["student", "tutor"]),
  course_of_interest: z.string().optional(),
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
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      password: "",
      confirm_password: "",
      country: "",
      gender: undefined,
      user_type: "student",
      course_of_interest: "",
      agree_terms: false,
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email before signing in.");
        } else {
          toast.error(error.message);
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
      const { error } = await signUp(data.email, data.password, {
        full_name: data.full_name,
        phone_number: data.phone_number,
        country: data.country,
        gender: data.gender,
        user_type: data.user_type,
        course_of_interest: data.course_of_interest,
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Account created! Please check your email to verify your account.", {
          position: "top-center",
          duration: 60000,
          style: { background: "hsl(142 76% 36%)", color: "white", fontWeight: 600, fontSize: "14px" },
        });
        setMode("login");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const fields = step === 1
      ? ["full_name", "email", "password", "confirm_password"]
      : ["user_type"];
    
    const isValid = await signupForm.trigger(fields as any);
    if (isValid) {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="inline-block mb-8">
            <DLHLogo size="md" />
          </Link>

          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === "signup" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {mode === "login" ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
                <p className="text-muted-foreground mb-8">
                  Sign in to continue your learning journey
                </p>

                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="mt-1 input-focus"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="input-focus pr-10"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">Create your account</h2>
                <p className="text-muted-foreground mb-8">
                  Step {step} of 2 - {step === 1 ? "Your details" : "Your preferences"}
                </p>

                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          placeholder="John Doe"
                          className="mt-1 input-focus"
                          {...signupForm.register("full_name")}
                        />
                        {signupForm.formState.errors.full_name && (
                          <p className="text-sm text-destructive mt-1">
                            {signupForm.formState.errors.full_name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="signup_email">Email *</Label>
                        <Input
                          id="signup_email"
                          type="email"
                          placeholder="you@example.com"
                          className="mt-1 input-focus"
                          {...signupForm.register("email")}
                        />
                        {signupForm.formState.errors.email && (
                          <p className="text-sm text-destructive mt-1">
                            {signupForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="signup_password">Password *</Label>
                        <div className="relative mt-1">
                          <Input
                            id="signup_password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="input-focus pr-10"
                            {...signupForm.register("password")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {signupForm.formState.errors.password && (
                          <p className="text-sm text-destructive mt-1">
                            {signupForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="confirm_password">Confirm Password *</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          placeholder="••••••••"
                          className="mt-1 input-focus"
                          {...signupForm.register("confirm_password")}
                        />
                        {signupForm.formState.errors.confirm_password && (
                          <p className="text-sm text-destructive mt-1">
                            {signupForm.formState.errors.confirm_password.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        onClick={nextStep}
                        className="w-full bg-gradient-primary hover:opacity-90"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="user_type">I am a *</Label>
                        <Select
                          onValueChange={(value: "student" | "tutor") =>
                            signupForm.setValue("user_type", value)
                          }
                          defaultValue={signupForm.getValues("user_type")}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="tutor">Tutor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="phone_number">Phone Number</Label>
                        <Input
                          id="phone_number"
                          placeholder="+1234567890"
                          className="mt-1 input-focus"
                          {...signupForm.register("phone_number")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          placeholder="Your country"
                          className="mt-1 input-focus"
                          {...signupForm.register("country")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select
                          onValueChange={(value: any) =>
                            signupForm.setValue("gender", value)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">
                              Prefer not to say
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="course_of_interest">Choose Your Course</Label>
                        <Select
                          onValueChange={(value) =>
                            signupForm.setValue("course_of_interest", value)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {DLH_COURSES.map((course) => (
                              <SelectItem key={course.id} value={course.title}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="agree_terms"
                          onCheckedChange={(checked) =>
                            signupForm.setValue("agree_terms", checked as boolean)
                          }
                        />
                        <label
                          htmlFor="agree_terms"
                          className="text-sm text-muted-foreground leading-tight"
                        >
                          I agree to the Terms of Service and Privacy Policy
                        </label>
                      </div>
                      {signupForm.formState.errors.agree_terms && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.agree_terms.message}
                        </p>
                      )}

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="flex-1"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-gradient-primary hover:opacity-90"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("login");
                      setStep(1);
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12">
        <div className="max-w-md text-center text-primary-foreground">
          <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center mx-auto mb-8">
            <DLHLogo size="lg" showText={false} />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Your AI-Powered Learning Companion
          </h2>
          <p className="text-primary-foreground/80">
            Experience personalized tutoring, instant answers, and creative tools 
            designed to help you achieve your educational goals.
          </p>
        </div>
      </div>
    </div>
  );
}
