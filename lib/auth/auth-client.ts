"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Session, Subscription } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export type AuthChangeCallback = (session: AuthSession | null) => void;

function getSupabase() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function mapSession(session: Session | null): AuthSession | null {
  if (!session) return null;
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      name: typeof meta.name === "string" ? meta.name : "",
    },
    accessToken: session.access_token,
  };
}

export const authClient = {
  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    const session = mapSession(data.session);
    if (!session) throw new Error("Sessão não criada");
    return session;
  },

  async signUp(name: string, email: string, password: string): Promise<void> {
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
  },

  async signOut(): Promise<void> {
    await getSupabase().auth.signOut();
  },

  async getSession(): Promise<AuthSession | null> {
    const { data } = await getSupabase().auth.getSession();
    return mapSession(data.session);
  },

  async getAccessToken(): Promise<string | null> {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  },

  async refreshAccessToken(): Promise<string | null> {
    const { data, error } = await getSupabase().auth.refreshSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  },

  onAuthStateChange(callback: AuthChangeCallback): () => void {
    const {
      data: { subscription },
    }: { data: { subscription: Subscription } } = getSupabase().auth.onAuthStateChange(
      (_event, session) => {
        callback(mapSession(session));
      },
    );
    return () => subscription.unsubscribe();
  },
};
