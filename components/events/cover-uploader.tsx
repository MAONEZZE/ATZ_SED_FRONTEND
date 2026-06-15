"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { useDeleteEventCover, useUploadEventCover } from "@/lib/api/events";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB (limite do backend)
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function CoverUploader({
  eventId,
  slug,
  coverUrl,
  updatedAt,
  disabled = false,
}: {
  eventId: string;
  slug: string;
  coverUrl: string | null;
  /** muda a cada save no backend — usado para furar o cache do navegador */
  updatedAt: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadEventCover(eventId);
  const deleteCover = useDeleteEventCover(eventId);

  function openPicker() {
    if (disabled || upload.isPending) return;
    inputRef.current?.click();
  }

  function handleRemove() {
    deleteCover.mutate(undefined, {
      onSuccess: () => {
        revalidatePublicEvent(slug);
        toast.success("Capa removida.");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleFile(file: File | undefined) {
    // limpa o input para permitir reescolher o mesmo arquivo
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Imagem muito grande (máx. 5MB).");
      return;
    }
    upload.mutate(file, {
      onSuccess: () => {
        revalidatePublicEvent(slug);
        toast.success("Capa atualizada!");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  // backend reaproveita a mesma URL ao trocar a capa; o navegador serviria a
  // imagem antiga do cache. updatedAt muda a cada upload → fura o cache e
  // persiste entre recarregamentos (diferente de um contador que zera).
  const imgSrc = coverUrl
    ? `${coverUrl}${coverUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(updatedAt)}`
    : null;

  return (
    <div className="space-y-3">
      {imgSrc ? (
        <div className="group relative">
          <img
            src={imgSrc}
            alt="Capa do evento"
            className="aspect-[1200/630] w-full rounded-xl border object-cover"
          />
          {!disabled && (
            <>
              <button
                type="button"
                onClick={openPicker}
                disabled={upload.isPending}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/0 text-sm font-medium text-transparent opacity-0 transition-all group-hover:cursor-pointer group-hover:bg-black/55 group-hover:text-white group-hover:opacity-100 focus-visible:bg-black/55 focus-visible:text-white focus-visible:opacity-100"
                aria-label="Clique para alterar a imagem"
              >
                {upload.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Pencil className="h-6 w-6" />
                )}
                <span>Clique para alterar a imagem</span>
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full"
                    disabled={deleteCover.isPending}
                    aria-label="Remover capa"
                  >
                    {deleteCover.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover capa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A imagem deixará de aparecer na página pública do evento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove}>
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || upload.isPending}
          className="flex aspect-[1200/630] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {upload.isPending ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : (
            <ImagePlus className="h-10 w-10" />
          )}
          <span className="text-sm font-medium">Clique para adicionar capa</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">
        JPEG, PNG ou WebP, até 5MB. Usada como preview ao compartilhar (OG image).
      </p>
    </div>
  );
}
