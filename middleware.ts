import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabase } from "@/lib/auth/supabase-server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareSupabase(request, response);

  // getUser() valida o token no servidor do Supabase (mais seguro que getSession no edge)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Apenas rotas do grupo (dashboard) — públicas ficam fora
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/messages/:path*",
    "/ai-chat/:path*",
    "/s-docs/:path*",
    "/scan/:path*",
    "/settings/:path*",
  ],
};
