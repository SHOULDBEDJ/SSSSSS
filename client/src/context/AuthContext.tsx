import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Mock types to replace Supabase types
type User = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
};

type Session = {
  user: User;
  access_token: string;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Mock session check
    const savedSession = localStorage.getItem("sss_session");
    if (savedSession) {
      const s = JSON.parse(savedSession);
      setSession(s);
      setUser(s.user);
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, _password: string) => {
    // Mock sign in: any email works
    const mockUser: User = {
      id: "mock-user-123",
      email: email,
      user_metadata: { full_name: "Admin User" }
    };
    const mockSession: Session = {
      user: mockUser,
      access_token: "mock-token"
    };

    localStorage.setItem("sss_session", JSON.stringify(mockSession));
    setSession(mockSession);
    setUser(mockUser);
    setIsAdmin(true);
    return { error: undefined };
  };

  const signOut = async () => {
    localStorage.removeItem("sss_session");
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
