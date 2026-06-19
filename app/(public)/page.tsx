"use client";

import Link from "next/link";
import { AuthBackground } from "@/components/layout/auth-background";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <AuthBackground />
      <h1 className="relative z-10 text-4xl font-bold tracking-tight text-white">
        SED — Save Event Date
      </h1>
      <p className="relative z-10 max-w-md text-center text-white/80">
        Gestão de eventos curados: landing pages, inscrições, mensagens e automações.
      </p>
      <div className="relative z-10 flex gap-3">
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Criar conta</Link>
        </Button>
      </div>
    </main>
  );
}
