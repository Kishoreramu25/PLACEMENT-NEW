import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { loginSchema, signupSchema, LoginFormData, SignupFormData } from "@/lib/validations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, GraduationCap, AlertCircle, Users, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type AppRole = "placement_officer" | "department_coordinator" | "management";

interface Department {
  id: string;
  name: string;
  code: string;
}

const roleCards = [
  {
    value: "placement_officer" as AppRole,
    label: "Placement Officer",
    description: "Full admin access to manage companies, drives, and statistics",
    icon: Users,
  },
  {
    value: "department_coordinator" as AppRole,
    label: "HOD",
    description: "Department-scoped access to view drives and student placements",
    icon: BookOpen,
  },
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const navigate = useNavigate();
  const { user, role, signIn, signUp } = useAuth();

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: undefined,
      departmentId: null,
    },
  });

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from("departments").select("id, name, code").order("name");
      if (data) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && role) {
      const redirectPath =
        role === "placement_officer"
          ? "/dashboard/tpo"
          : role === "department_coordinator"
            ? "/dashboard/coordinator"
            : "/dashboard/management";
      navigate(redirectPath, { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    const { data: authData, error } = await signIn(data.email, data.password);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Please verify your email address before signing in.");
      } else if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many requests")) {
        setError("Security limit exceeded. Please use a different email address (e.g. user+1@gmail.com) or wait 15 minutes.");
      } else {
        setError(error.message);
      }
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // Success: The useEffect will handle redirect once role is loaded.
      // We can keep loading true for a moment.
      setTimeout(() => {
        // If still here after 3 seconds, something might be stuck
        setIsLoading(false);
        // Maybe show a hint if not redirected?
      }, 3000);
    } else {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);

    if (!data.role) {
      setError("Please select a role");
      setIsLoading(false);
      return;
    }

    if (data.role === "department_coordinator" && !data.departmentId) {
      setError("Please select your department");
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(
      data.email,
      data.password,
      data.fullName,
      data.role,
      data.departmentId
    );

    if (error) {
      if (error.message.includes("User already registered")) {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many requests")) {
        setError("Security limit exceeded. Please use a different email address (e.g. user+1@gmail.com) to sign up immediately.");
      } else {
        setError(error.message);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const seedDepartments = async () => {
    setIsLoading(true);
    try {
      const defaultDepts = [
        { name: "Civil Engineering", code: "CIVIL" },
        { name: "Agricultural Engineering", code: "AGRI" },
        { name: "Biomedical Engineering", code: "BME" },
        { name: "Bio Technology", code: "BIOTECH" },
        { name: "Computer Science and Engineering", code: "CSE" },
        { name: "CSE(Cyber Security)", code: "CSE-CS" },
        { name: "CSE(AI&ML)", code: "CSE-AIML" },
        { name: "CSE(Internet of Things)", code: "CSE-IOT" },
        { name: "Computer Science and Design", code: "CSD" },
        { name: "Artificial Intelligence and Data Science", code: "AIDS" },
        { name: "Information Technology", code: "IT" },
        { name: "Electrical and Electronics Engineering", code: "EEE" },
        { name: "Electronics and Communication Engineering", code: "ECE" },
        { name: "Electronics and Instrumentation Engineering", code: "EIE" },
        { name: "Robotics and Automation", code: "RA" },
        { name: "Mechanical Engineering", code: "MECH" },
        { name: "Chemical Engineering", code: "CHEM" },
        { name: "M.Tech. CSE", code: "MTECH-CSE" },
        { name: "Management Studies", code: "MBA" },
        { name: "Computer Applications", code: "MCA" },
        { name: "Artificial Intelligence and MAChine learning", code: "AIML-FULL" },
        { name: "Science and Humanities", code: "S&H" },
      ];

      const { error } = await supabase.from("departments").upsert(defaultDepts, { onConflict: "code" });
      if (error) throw error;

      toast.success("Departments initialized successfully!");
      // Refresh list
      const { data } = await supabase.from("departments").select("id, name, code").order("name");
      if (data) setDepartments(data);
    } catch (err: any) {
      toast.error("Failed to seed departments: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: AppRole) => {
    setSelectedRole(role);
    signupForm.setValue("role", role);
    if (role !== "department_coordinator") {
      signupForm.setValue("departmentId", null);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
        {/* Background Image - Centered and Full Coverage */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-bg.png')" }}
        />
        {/* Suitable Overlay - Semi-transparent black for text readability */}
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 flex flex-col justify-center h-full px-12 py-16">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm p-2">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">ESEC</h1>
              <p className="text-white/60">Placement Management System</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight text-white">
              ERODE SENGUNTHAR ENGINEERING COLLEGE
            </h2>
            <p className="text-lg text-white/70 max-w-md">
              A comprehensive platform for managing placement drives, tracking company visits,
              and generating actionable insights for better outcomes.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-sm text-white/60">Companies</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
                <div className="text-2xl font-bold text-white">95%</div>
                <div className="text-sm text-white/60">Placement Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 p-1">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold">ESEC</span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Tab */}
            <TabsContent value="login">
              <Card className="border-0 shadow-premium">
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Enter your credentials to access your dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <Card className="border-0 shadow-premium">
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Select your role and enter your details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6">
                    {/* Role Selection */}
                    <div className="space-y-3">
                      <Label>Select your role</Label>
                      <div className="grid gap-3">
                        {roleCards.map((roleCard) => (
                          <button
                            key={roleCard.value}
                            type="button"
                            onClick={() => handleRoleSelect(roleCard.value)}
                            className={cn(
                              "flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all",
                              selectedRole === roleCard.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                selectedRole === roleCard.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <roleCard.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium">{roleCard.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {roleCard.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      {signupForm.formState.errors.role && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    {/* Department Selection (for coordinators) */}
                    {selectedRole === "department_coordinator" && (
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select
                          onValueChange={(value) => signupForm.setValue("departmentId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {departments.length > 0 ? (
                              departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-center text-muted-foreground">
                                No departments found. Click "Initialize" below.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {departments.length === 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={seedDepartments}
                            disabled={isLoading}
                          >
                            Initialize Departments
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        placeholder="John Doe"
                        {...signupForm.register("fullName")}
                      />
                      {signupForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        {...signupForm.register("email")}
                      />
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        {...signupForm.register("password")}
                      />
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>



      <div className="fixed bottom-1 right-1/4 translate-x-1/2 z-10 text-xs text-muted-foreground/50 pointer-events-none">
        &copy; {new Date().getFullYear()} All Rights Reserved by Zenetive Infotech.
      </div>
    </div>
  );
}