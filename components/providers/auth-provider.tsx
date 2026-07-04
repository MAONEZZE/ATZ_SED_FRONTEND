"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient, type AuthSession } from "@/lib/auth/auth-client";
import { setTokenProvider, api } from "@/lib/api/client";

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileEnsured = useRef(false);

  useEffect(() => {
    setTokenProvider({
      getAccessToken: () => authClient.getAccessToken(),
      refreshAccessToken: () => authClient.refreshAccessToken(),
      onUnauthorized: () => {
        void authClient.signOut();
        queryClient.clear();
        router.push("/login");
      },
    });

    void authClient.getSession().then((s) => {
      setSession(s);
      setIsLoading(false);
    });

    const unsubscribe = authClient.onAuthStateChange((s) => {
      setSession(s);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session && !profileEnsured.current) {
      profileEnsured.current = true;
      api.post("/profile/ensure").catch(() => {
        profileEnsured.current = false;
      });
    }
    if (!session) profileEnsured.current = false;
  }, [session]);

  const value: AuthContextValue = {
    session,
    isLoading,
    signIn: async (email, password) => {
      queryClient.clear();
      const s = await authClient.signIn(email, password);
      setSession(s);
      return s;
    },
    signUp: (name, email, password) => authClient.signUp(name, email, password),
    signOut: async () => {
      await authClient.signOut();
      queryClient.clear();
      setSession(null);
      router.push("/login");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
