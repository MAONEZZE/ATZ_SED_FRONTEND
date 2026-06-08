"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
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
  disabled = false,
}: {
  eventId: string;
  slug: string;
  coverUrl: string | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadEventCover(eventId);
  const deleteCover = useDeleteEventCover(eventId);

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

  return (
    <div className="space-y-3">
      {coverUrl ? (
        <div className="relative">
          <img
            src={coverUrl}
            alt="Capa do evento"
            className="aspect-[1200/630] w-full rounded-xl border object-cover"
          />
          {!disabled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 rounded-full"
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
          )}
        </div>
      ) : (
        <div className="flex aspect-[1200/630] w-full items-center justify-center rounded-xl border border-dashed text-muted-foreground">
          <ImagePlus className="h-10 w-10" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="mr-2 h-4 w-4" />
        )}
        {coverUrl ? "Trocar capa" : "Adicionar capa"}
      </Button>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG ou WebP, até 5MB. Usada como preview ao compartilhar (OG image).
      </p>
    </div>
  );
}
