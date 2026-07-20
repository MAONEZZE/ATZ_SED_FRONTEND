"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  useCreateFormField,
  useDeleteFormField,
  useFormFields,
  useReorderFormFields,
} from "@/lib/api/form-fields";
import { useEvent, useUpdateEvent } from "@/lib/api/events";
import { useForm as useFormMeta, useUpdateForm } from "@/lib/api/forms";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import type { FormField, FormFieldKind } from "@/lib/api/types";
import { FieldEditorDialog } from "@/components/form-builder/field-editor-dialog";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

const typeLabels: Record<string, string> = {
  text: "Texto",
  textarea: "Texto longo",
  email: "E-mail",
  phone: "Telefone",
  select: "Escolha única",
  multiselect: "Múltipla escolha",
  checkbox: "Caixa de seleção",
  image: "Imagem",
  date: "Data",
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

function SortableFieldRow({
  field,
  onEdit,
  onDelete,
  deleting,
  readonly,
}: {
  field: FormField;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  readonly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
        isDragging ? "z-10 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        aria-label={`Reordenar campo ${field.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{field.label}</p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{typeLabels[field.type] ?? field.type}</Badge>
          {field.required && <Badge variant="outline">Obrigatório</Badge>}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Editar campo ${field.label}`}
        onClick={onEdit}
        disabled={readonly}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Excluir campo ${field.label}`}
            disabled={readonly || deleting}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>
              O campo &quot;{field.label}&quot; será removido do formulário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={onDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function FormPreview({ fields, submitLabel = "Enviar inscrição" }: { fields: FormField[]; submitLabel?: string }) {
  const previewForm = useForm<Record<string, unknown>>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pré-visualização</CardTitle>
        <p className="text-sm text-muted-foreground">
          Como o participante verá o formulário.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormFieldsRenderer fields={fields} form={previewForm} disabled />
        <Button className="w-full" size="lg" disabled>
          {submitLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function PipedriveToggle({ eventId }: { eventId: string }) {
  const { data: event } = useEvent(eventId);
  const update = useUpdateEvent(eventId);
  const checked = event?.sendToPipedrive ?? false;

  function handleChange(value: boolean) {
    update.mutate(
      { sendToPipedrive: value },
      {
        onSuccess: () =>
          toast.success(value ? "Envio ao Pipedrive ativado" : "Envio ao Pipedrive desativado"),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="space-y-1">
          <Label htmlFor="pipedrive-toggle">Enviar para o Pipedrive</Label>
          <p className="text-sm text-muted-foreground">
            Cada inscrição é enviada automaticamente ao Pipedrive.
          </p>
        </div>
        <Switch
          id="pipedrive-toggle"
          checked={checked}
          onCheckedChange={handleChange}
          disabled={!event || update.isPending}
        />
      </CardContent>
    </Card>
  );
}

function FormMetaEditor({
  eventId,
  kind,
  slug,
  readonly,
}: {
  eventId: string;
  kind: FormFieldKind;
  slug?: string;
  readonly: boolean;
}) {
  const { data: form, isLoading } = useFormMeta(eventId, kind);
  const update = useUpdateForm(eventId, kind);

  const [description, setDescription] = useState("");
  const [postRegistrationMessage, setPostRegistrationMessage] = useState("");
  const [linkPostSubscription, setLinkPostSubscription] = useState("");
  const [activeField, setActiveField] = useState<"description" | "post" | "link">("description");

  useEffect(() => {
    setDescription(form?.description ?? "");
    setPostRegistrationMessage(form?.postRegistrationMessage ?? "");
    setLinkPostSubscription(form?.linkPostSubscription ?? "");
  }, [form]);

  const dirty =
    description !== (form?.description ?? "") ||
    postRegistrationMessage !== (form?.postRegistrationMessage ?? "") ||
    linkPostSubscription !== (form?.linkPostSubscription ?? "");

  const value =
    activeField === "description"
      ? description
      : activeField === "post"
        ? postRegistrationMessage
        : linkPostSubscription;
  const setValue =
    activeField === "description"
      ? setDescription
      : activeField === "post"
        ? setPostRegistrationMessage
        : setLinkPostSubscription;

  function handleSave() {
    update.mutate(
      {
        description: description || null,
        postRegistrationMessage: postRegistrationMessage || null,
        linkPostSubscription: linkPostSubscription || null,
      },
      {
        onSuccess: () => {
          toast.success("Formulário atualizado");
          if (slug) void revalidatePublicEvent(slug);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mensagem</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-md border">
          <div className="flex gap-1 border-b p-1">
            <Button
              type="button"
              size="sm"
              variant={activeField === "description" ? "secondary" : "ghost"}
              onClick={() => setActiveField("description")}
            >
              Descrição
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeField === "post" ? "secondary" : "ghost"}
              onClick={() => setActiveField("post")}
            >
              Pós-inscrição
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeField === "link" ? "secondary" : "ghost"}
              onClick={() => setActiveField("link")}
            >
              Link botão
            </Button>
          </div>
          {activeField === "link" ? (
            <Input
              id="form-message"
              type="url"
              disabled={readonly}
              placeholder="https://..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-t-none border-t-0 focus-visible:ring-offset-0"
            />
          ) : (
            <Textarea
              id="form-message"
              rows={4}
              disabled={readonly}
              placeholder={
                activeField === "post"
                  ? "Ex.: Obrigado pela inscrição! Em breve entraremos em contato."
                  : undefined
              }
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-t-none border-t-0 focus-visible:ring-offset-0"
            />
          )}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={readonly || !dirty || update.isPending}
          >
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormBuilderSection({
  eventId,
  kind,
  slug,
  readonly,
}: {
  eventId: string;
  kind: FormFieldKind;
  slug?: string;
  readonly: boolean;
}) {
  const { data: event } = useEvent(eventId);
  const { data: fields, isLoading } = useFormFields(eventId, kind);
  const reorder = useReorderFormFields(eventId);
  const deleteField = useDeleteFormField(eventId);
  const createField = useCreateFormField(eventId);

  const [localFields, setLocalFields] = useState<FormField[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FormField | null>(null);
  const seededPhone = useRef(false);

  useEffect(() => {
    if (fields) setLocalFields([...fields].sort((a, b) => a.order - b.order));
  }, [fields]);

  useEffect(() => {
    if (
      kind === "post_event" &&
      fields &&
      fields.length === 0 &&
      !seededPhone.current &&
      !readonly
    ) {
      seededPhone.current = true;
      createField.mutate({
        label: "Telefone",
        type: "phone",
        kind: "post_event",
        required: true,
        order: 0,
      });
    }
  }, [kind, fields, readonly, createField]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(dragEvent: DragEndEvent) {
    const { active, over } = dragEvent;
    if (readonly || !over || active.id === over.id) return;

    const oldIndex = localFields.findIndex((f) => f.id === active.id);
    const newIndex = localFields.findIndex((f) => f.id === over.id);
    const next = arrayMove(localFields, oldIndex, newIndex);
    setLocalFields(next);

    const changes = next
      .map((field, index) => ({ id: field.id, order: index }))
      .filter(({ id, order }) => {
        const original = localFields.find((f) => f.id === id);
        return original && original.order !== order;
      });

    if (changes.length) {
      reorder.mutate(changes, {
        onSuccess: () => {
          if (slug) void revalidatePublicEvent(slug);
        },
        onError: (e) => {
          toast.error(`Falha ao reordenar: ${e.message}`);
        },
      });
    }
  }

  if (isLoading) return <LoadingSpinner />;

  const isRegistration = kind === "registration";
  const title =
    kind === "registration"
      ? "Formulário de inscrição"
      : kind === "post_event"
        ? "Formulário pós-evento"
        : "Avaliação NPS";
  const submitLabel =
    kind === "registration"
      ? "Enviar inscrição"
      : kind === "post_event"
        ? "Enviar respostas"
        : "Enviar avaliação";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {readonly && (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
            Evento {event?.status === "cancelled" ? "cancelado" : "encerrado"} — somente
            leitura.
          </p>
        )}

        <FormMetaEditor eventId={eventId} kind={kind} slug={slug} readonly={readonly} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Arraste para reordenar. Adicione os campos que quiser.
            </p>
          </div>
          <Button
            disabled={readonly}
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo campo
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localFields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {localFields.map((field) => (
                <SortableFieldRow
                  key={field.id}
                  field={field}
                  deleting={deleteField.isPending}
                  readonly={readonly}
                  onEdit={() => {
                    setEditing(field);
                    setEditorOpen(true);
                  }}
                  onDelete={() =>
                    deleteField.mutate(field.id, {
                      onSuccess: () => {
                        if (slug) void revalidatePublicEvent(slug);
                        toast.success("Campo excluído");
                      },
                      onError: (e) => toast.error(e.message),
                    })
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <FieldEditorDialog
          eventId={eventId}
          slug={slug}
          field={editing}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          nextOrder={localFields.length}
          kind={kind}
        />
      </div>

      <div className="space-y-4">
        {(isRegistration || kind === "post_event") && (
          <PipedriveToggle eventId={eventId} />
        )}
        <FormPreview fields={localFields} submitLabel={submitLabel} />
      </div>
    </div>
  );
}

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: event } = useEvent(eventId);
  const [kind, setKind] = useState<FormFieldKind>("registration");
  const readonly = event?.status === "cancelled" || event?.status === "ended";

  const formPaths: Record<FormFieldKind, string> = {
    registration: "",
    post_event: "/pos-evento",
    nps: "/nps",
  };

  function handleCopyLink() {
    if (!event?.slug) return;
    const url = `${window.location.origin}/e/${event.slug}${formPaths[kind]}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Link do formulário copiado!"),
      () => toast.error("Falha ao copiar link"),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={kind === "registration" ? "default" : "outline"}
          size="sm"
          onClick={() => setKind("registration")}
        >
          Inscrição
        </Button>
        <Button
          variant={kind === "post_event" ? "default" : "outline"}
          size="sm"
          onClick={() => setKind("post_event")}
        >
          Pós-evento
        </Button>
        <Button
          variant={kind === "nps" ? "default" : "outline"}
          size="sm"
          onClick={() => setKind("nps")}
        >
          NPS
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={handleCopyLink}
          disabled={!event?.slug}
        >
          <Link2 className="mr-2 h-4 w-4" />
          Copiar link
        </Button>
      </div>

      <FormBuilderSection
        eventId={eventId}
        kind={kind}
        slug={event?.slug}
        readonly={readonly}
      />
    </div>
  );
}
