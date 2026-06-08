import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { hasValidSession } from "@/lib/auth/supabase-server";

/**
 * Revalidação on-demand das páginas públicas de evento.
 * Autorização: secret (webhook externo/backend) OU sessão Supabase
 * válida em cookie (dashboard no browser, sem expor o secret).
 *
 * POST /api/revalidate  { slug: string }
 * Header opcional: x-revalidate-secret: <REVALIDATE_SECRET>
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const headerSecret = request.headers.get("x-revalidate-secret");
  const secretOk = Boolean(secret) && headerSecret === secret;

  if (!secretOk && !(await hasValidSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let slug: unknown;
  try {
    ({ slug } = (await request.json()) as { slug?: unknown });
  } catch {
    return NextResponse.json({ message: "Body inválido" }, { status: 400 });
  }

  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ message: "slug obrigatório" }, { status: 400 });
  }

  revalidateTag(`event:${slug}`);
  return NextResponse.json({ revalidated: true, slug });
}
