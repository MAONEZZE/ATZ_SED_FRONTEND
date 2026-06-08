"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Painel admin — protegido por role no middleware (e aqui, defesa em
 * profundidade). Endpoints de dados admin (eventos globais, usuários,
 * estatísticas) ainda não existem no contrato do backend.
 */
export default function AdminPage() {
  const { session } = useAuth();

  if (session?.user.role !== "admin") {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 font-semibold">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <div className="rounded-xl border border-dashed p-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 font-semibold">Em breve</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Visão global de eventos, usuários e estatísticas será habilitada
          quando o backend expor os endpoints de administração
          (/admin/events, /admin/users, /admin/stats).
        </p>
      </div>
    </div>
  );
}
