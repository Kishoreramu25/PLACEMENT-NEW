import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "placement_officer" | "department_coordinator" | "management";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  departmentId: string | null;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    departmentId?: string | null
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to ensure user has a role (Auto-fix for orphaned accounts)
  const ensureUserRole = async (userId: string) => {
    try {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        return existingRole.role as AppRole;
      }

      console.log("No role found for user, attempting to assign default 'placement_officer' role...");
      const { error: insertError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "placement_officer",
      });

      if (insertError) {
        // If duplicate key error (code 23505), it means it was inserted concurrently.
        if (insertError.code === '23505') {
          console.log("Role overlap detected (race condition), fetching existing role...");
          const { data: retryRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .maybeSingle();
          if (retryRole) return retryRole.role as AppRole;
        }

        console.error("Failed to auto-assign role:", insertError);
        return null;
      }
      return "placement_officer" as AppRole;
    } catch (err) {
      console.error("Error ensuring user role:", err);
      return null;
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      // Fetch role with auto-fix
      let userRole: AppRole | null = null;

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData) {
        userRole = roleData.role as AppRole;
      } else {
        // Try to fix missing role
        userRole = await ensureUserRole(userId);
      }

      if (userRole) {
        setRole(userRole);
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url, department_id")
        .eq("id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name,
          email: profileData.email,
          avatar_url: profileData.avatar_url,
        });
        setDepartmentId(profileData.department_id);

        // Update last login
        await supabase
          .from("profiles")
          .update({ last_login: new Date().toISOString() })
          .eq("id", userId);
      } else {
        // If profile missing, maybe creating it? For now just log.
        console.warn("No profile found for user:", userId);
        // Attempt to create profile if missing? 
        // Best to leave profile creation to signup or triggers, but could warn user.
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth State Change:", event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setRole(null);
        setProfile(null);
        setDepartmentId(null);
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If successful, force fetch data
    if (data.user && !error) {
      await fetchUserData(data.user.id);
    }

    return { data, error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    departmentId?: string | null
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      console.error("SIGNUP ERROR:", error);
      return { error };
    }

    if (data.user) {
      // Insert user role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: role,
      });

      if (roleError) {
        return { error: roleError };
      }

      // Update profile with department if provided
      if (departmentId) {
        await supabase
          .from("profiles")
          .update({ department_id: departmentId })
          .eq("id", data.user.id);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Explicit state clearing
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      setDepartmentId(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Check for existing session on load is handled by the useEffect above

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        departmentId,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}