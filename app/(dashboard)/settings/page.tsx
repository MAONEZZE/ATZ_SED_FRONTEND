"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  useDeleteProfilePhoto,
  useProfile,
  useUpdateProfile,
  useUploadProfilePhoto,
} from "@/lib/api/profile";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SettingsForm {
  name: string;
  evolutionInstance: string;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB (limite do backend)
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function ProfilePhoto({
  photoUrl,
  name,
  email,
}: {
  photoUrl: string | null;
  name: string;
  email: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadProfilePhoto();
  const remove = useDeleteProfilePhoto();

  const initials =
    name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    "?";

  // cache-bust: mesmo path entre uploads → força refresh da imagem
  const src = photoUrl
    ? `${photoUrl}${photoUrl.includes("?") ? "&" : "?"}t=${
        upload.isSuccess ? upload.submittedAt : ""
      }`
    : undefined;

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
      onSuccess: () => toast.success("Foto atualizada!"),
      onError: (e) => toast.error(e.message),
    });
  }

  const pending = upload.isPending || remove.isPending;

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          {photoUrl ? "Trocar foto" : "Adicionar foto"}
        </Button>
        {photoUrl && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => toast.success("Foto removida."),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            {remove.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            )}
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<SettingsForm>({
    defaultValues: { name: "", evolutionInstance: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name ?? "",
        evolutionInstance: profile.evolutionInstance ?? "",
      });
    }
  }, [profile, form]);

  if (isLoading || !profile) return <LoadingSpinner />;

  function onSubmit(values: SettingsForm) {
    updateProfile.mutate(
      {
        name: values.name || undefined,
        evolutionInstance: values.evolutionInstance || undefined,
      },
      {
        onSuccess: () => toast.success("Configurações salvas!"),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Seus dados de conta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProfilePhoto
              photoUrl={profile.photoUrl}
              name={profile.name}
              email={profile.email}
            />
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={profile.email} disabled readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp (Evolution API)</CardTitle>
            <CardDescription>
              Instância usada para enviar mensagens de WhatsApp dos seus eventos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="evolutionInstance">Instância</Label>
              <Input
                id="evolutionInstance"
                autoComplete="off"
                {...form.register("evolutionInstance")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!form.formState.isDirty || updateProfile.isPending}
          >
            {updateProfile.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}
