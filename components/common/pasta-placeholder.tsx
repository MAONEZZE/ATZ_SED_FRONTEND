"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PastaPlaceholderInner() {
  const searchParams = useSearchParams();
  const nome = searchParams.get("nome");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Pasta: {nome}</h1>
      <p className="text-sm text-muted-foreground">Nenhum item nesta pasta ainda.</p>
    </div>
  );
}

export function PastaPlaceholder() {
  return (
    <Suspense>
      <PastaPlaceholderInner />
    </Suspense>
  );
}
