"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import {
  useAddCollaborator,
  useCollaborators,
  useRemoveCollaborator,
  useUpdateCollaboratorRole,
} from "@/lib/api/collaborators";
import { useProfile } from "@/lib/api/profile";
import type { EventObject, EventRole } from "@/lib/api/types";
import { canManage } from "@/lib/permissions";
import { eventRoleConfig } from "@/lib/utils/status-maps";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EVENT_ROLES = Object.keys(eventRoleConfig) as EventRole[];

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RoleBadge({ role }: { role: EventRole }) {
  const config = eventRoleConfig[role];
  return <Badge className={config.className}>{config.label}</Badge>;
}

export function CollaboratorsDialog({
  event,
  open,
  onOpenChange,
}: {
  event: EventObject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: profile } = useProfile();
  const { data: collaborators, isLoading } = useCollaborators(event.id);
  const add = useAddCollaborator(event.id);
  const remove = useRemoveCollaborator(event.id);
  const updateRole = useUpdateCollaboratorRole(event.id);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EventRole>("invited");

  const isOwner = profile?.id === event.ownerId;
  const mayManage = canManage(event, profile?.id);

  function handleAdd() {
    if (!mayManage) return;
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    add.mutate(
      { email: trimmed, role },
      {
        onSuccess: () => {
          toast.success("Colaborador adicionado");
          setEmail("");
          setRole("invited");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function handleRemove(profileId: string) {
    if (!mayManage) return;
    remove.mutate(profileId, {
      onSuccess: () => toast.success("Colaborador removido"),
      onError: (error) => toast.error(error.message),
    });
  }

  function handleRoleChange(profileId: string, currentRole: EventRole, next: string) {
    if (!mayManage || next === currentRole) return;
    const nextRole = next as EventRole;
    updateRole.mutate(
      { profileId, role: nextRole },
      {
        onSuccess: () => toast.success(`Papel: ${eventRoleConfig[nextRole].label}`),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Colaboradores</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mayManage && (
            <div className="space-y-2">
              <Label htmlFor="collab-email">Adicionar por e-mail</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="collab-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                  onKeyDown={(keyEvent) => keyEvent.key === "Enter" && handleAdd()}
                />
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as EventRole)}
                  disabled={add.isPending}
                >
                  <SelectTrigger className="sm:w-40" aria-label="Papel do colaborador">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_ROLES.map((eventRole) => (
                      <SelectItem key={eventRole} value={eventRole}>
                        {eventRoleConfig[eventRole].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd} disabled={add.isPending}>
                  {add.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Membros</p>

            {isOwner && profile ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {initials(profile.name || profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {profile.name || profile.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
                <Badge variant="secondary">Dono</Badge>
              </div>
            ) : (
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

            {collaborators?.map((collaborator) => (
              <div
                key={collaborator.profileId}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {initials(collaborator.profile.name || collaborator.profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {collaborator.profile.name || collaborator.profile.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {collaborator.profile.email}
                  </p>
                </div>
                {mayManage ? (
                  <Select
                    value={collaborator.role}
                    disabled={updateRole.isPending}
                    onValueChange={(value) =>
                      handleRoleChange(collaborator.profileId, collaborator.role, value)
                    }
                  >
                    <SelectTrigger
                      className="h-8 w-40 border-0 px-1 shadow-none"
                      aria-label={`Papel de ${collaborator.profile.name || collaborator.profile.email}`}
                    >
                      <RoleBadge role={collaborator.role} />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_ROLES.map((eventRole) => (
                        <SelectItem key={eventRole} value={eventRole}>
                          {eventRoleConfig[eventRole].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <RoleBadge role={collaborator.role} />
                )}
                {mayManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Remover ${collaborator.profile.name || collaborator.profile.email}`}
                    disabled={remove.isPending}
                    onClick={() => handleRemove(collaborator.profileId)}
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
