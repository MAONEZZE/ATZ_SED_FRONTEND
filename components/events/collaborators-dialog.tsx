"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useAddCollaborator, useCollaborators, useRemoveCollaborator } from "@/lib/api/collaborators";
import { useProfile } from "@/lib/api/profile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CollaboratorsDialog({
  eventId,
  ownerId,
  open,
  onOpenChange,
}: {
  eventId: string;
  ownerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: profile } = useProfile();
  const { data: collaborators, isLoading } = useCollaborators(eventId);
  const add = useAddCollaborator(eventId);
  const remove = useRemoveCollaborator(eventId);
  const [email, setEmail] = useState("");

  const isOwner = profile?.id === ownerId;

  function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    add.mutate(trimmed, {
      onSuccess: () => {
        toast.success("Colaborador adicionado");
        setEmail("");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleRemove(profileId: string) {
    remove.mutate(profileId, {
      onSuccess: () => toast.success("Colaborador removido"),
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Colaboradores</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="collab-email">Adicionar por e-mail</Label>
            <div className="flex gap-2">
              <Input
                id="collab-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd} disabled={add.isPending}>
                {add.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Membros</p>

            {isOwner && profile && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials(profile.name || profile.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{profile.name || profile.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <Badge variant="secondary">Dono</Badge>
              </div>
            )}

            {!isOwner && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>D</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Dono do evento</p>
                </div>
                <Badge variant="secondary">Dono</Badge>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {collaborators?.map((c) => (
              <div key={c.profileId} className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {initials(c.profile.name || c.profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.profile.name || c.profile.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.profile.email}</p>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Remover ${c.profile.name}`}
                    disabled={remove.isPending}
                    onClick={() => handleRemove(c.profileId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {!isLoading && collaborators?.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">
                Nenhum colaborador ainda.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
