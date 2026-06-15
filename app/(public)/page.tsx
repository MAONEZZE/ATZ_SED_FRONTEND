import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-primary">
        SED — Save Event Date
      </h1>
      <p className="max-w-md text-center text-muted-foreground">
        Gestão de eventos curados: landing pages, inscrições, mensagens e automações.
      </p>
      <div className="flex gap-3">
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
