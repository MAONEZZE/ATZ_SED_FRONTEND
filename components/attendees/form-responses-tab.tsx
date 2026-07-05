"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Loader2, Search, Users } from "lucide-react";
import {
  exportUserSubscriptionsCsv,
  useUserSubscriptions,
} from "@/lib/api/user-subscriptions";
import type { UserSubscription } from "@/lib/api/types";
import { downloadBlob } from "@/lib/utils/download-blob";
import { formatAnswer } from "@/lib/forms/field-types";
import { formatDate } from "@/lib/utils/format-date";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ResponseKind = "post_event" | "nps";

const KEY: Record<ResponseKind, "postEventAnswers" | "npsAnswers"> = {
  post_event: "postEventAnswers",
  nps: "npsAnswers",
};

const EMPTY_LABEL: Record<ResponseKind, string> = {
  post_event: "Nenhuma resposta de pós-evento ainda.",
  nps: "Nenhuma avaliação NPS ainda.",
};

function isImageValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("http") || value.startsWith("data:image"))
  );
}

function AnswerValue({ value }: { value: unknown }) {
  const items = Array.isArray(value) ? value : [value];
  const images = items.filter(isImageValue);

  if (images.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <a key={i} href={src} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Imagem ${i + 1}`}
              className="h-20 w-20 rounded-md border object-cover"
            />
          </a>
        ))}
      </div>
    );
  }

  if (Array.isArray(value) || typeof value === "boolean" || value == null || value === "")
    return <p className="font-medium">{formatAnswer(value)}</p>;
  return <p className="whitespace-pre-line font-medium">{String(value)}</p>;
}

export function FormResponsesTab({
  eventId,
  kind,
}: {
  eventId: string;
  kind: ResponseKind;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [selected, setSelected] = useState<UserSubscription | null>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const answersKey = KEY[kind];

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportUserSubscriptionsCsv(eventId, {
        search: search.trim() || undefined,
      });
      downloadBlob(blob, `inscritos-${eventId}.csv`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar CSV");
    } finally {
      setExporting(false);
    }
  }

  const { data: response, isLoading } = useUserSubscriptions(eventId, {
    search: search.trim() || undefined,
    page,
    limit,
  });

  // Só quem enviou o formulário desta aba.
  const rows = (response?.data ?? []).filter((s) => s[answersKey] != null);
  const totalPages = response ? Math.ceil(response.total / limit) : 0;

  function openDetails(sub: UserSubscription) {
    setSelected(sub);
    setOpen(true);
  }

  const answers = selected?.[answersKey] ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar CSV
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">Nada por aqui</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "Ajuste a busca." : EMPTY_LABEL[kind]}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell>{sub.email}</TableCell>
                  <TableCell>{sub.phone}</TableCell>
                  <TableCell>
                    {formatDate(sub.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ver respostas de ${sub.name}`}
                      onClick={() => openDetails(sub)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3 md:hidden">
          {rows.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => openDetails(sub)}
                >
                  <p className="truncate font-semibold">{sub.name}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {sub.email}
                  </p>
                  <p className="text-sm text-muted-foreground">{sub.phone}</p>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {kind === "nps" ? "Avaliação NPS" : "Respostas do pós-evento"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">E-mail</p>
                  <p className="font-medium">{selected.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selected.phone}</p>
                </div>

                <div className="space-y-4 border-t pt-4">
                  {Object.entries(answers).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-muted-foreground">{key}</p>
                      <AnswerValue value={val} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
