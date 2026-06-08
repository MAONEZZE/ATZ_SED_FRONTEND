import Link from "next/link";
import { CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EventNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <CalendarX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Evento não encontrado</h1>
      <p className="max-w-sm text-muted-foreground">
        Este evento não existe ou não está mais disponível para inscrições.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
