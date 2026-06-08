// Client Supabase server-side (cookies) — usado SOMENTE pelo middleware.
// Faz parte do wrapper de auth; nenhum outro código server importa @supabase/*.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/** Valida sessão em route handlers (cookies somente-leitura) */
export async function hasValidSession(): Promise<boolean> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // route handler não precisa gravar cookies aqui
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

export function createMiddlewareSupabase(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
