"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/common/breadcrumb";

function PastaPlaceholderInner({ breadcrumbItems }: { breadcrumbItems?: BreadcrumbItem[] }) {
  const searchParams = useSearchParams();
  const nome = searchParams.get("nome");

  return (
    <div className="space-y-4">
      {breadcrumbItems && (
        <Breadcrumb items={[...breadcrumbItems, { label: nome ?? "Pasta" }]} />
      )}
      <h1 className="text-2xl font-bold tracking-tight">Pasta: {nome}</h1>
      <p className="text-sm text-muted-foreground">Nenhum item nesta pasta ainda.</p>
    </div>
  );
}

export function PastaPlaceholder({ breadcrumbItems }: { breadcrumbItems?: BreadcrumbItem[] }) {
  return (
    <Suspense>
      <PastaPlaceholderInner breadcrumbItems={breadcrumbItems} />
    </Suspense>
  );
}
