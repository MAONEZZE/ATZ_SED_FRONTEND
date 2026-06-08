"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { FullPageSpinner } from "@/components/common/loading-spinner";

// O middleware já protege essas rotas no edge; este guard cobre a
// transição client-side (sessão expirando com app aberto).
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, session, router, pathname]);

  if (isLoading || !session) {
    return <FullPageSpinner />;
  }

  return <AppShell>{children}</AppShell>;
}
