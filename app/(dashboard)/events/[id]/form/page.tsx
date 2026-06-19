"use client";

import { useEffect, useState } from "react";
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
import { Download, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  exportPostEventResponsesCsv,
  useDeleteFormField,
  useFormFields,
  usePostEventResponses,
  useReorderFormFields,
} from "@/lib/api/form-fields";
import { useEvent } from "@/lib/api/events";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import type { FormField, FormFieldKind } from "@/lib/api/types";
import { FieldEditorDialog } from "@/components/form-builder/field-editor-dialog";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
};

function SortableFieldRow({
  field,
  onEdit,
  onDelete,
  deleting,
}: {
  field: FormField;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
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
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Excluir campo ${field.label}`}
            disabled={deleting}
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

function PostEventResponsesCard({ eventId }: { eventId: string }) {
  const { data, isLoading } = usePostEventResponses(eventId, { page: 1, limit: 10 });
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportPostEventResponsesCsv(eventId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respostas-pos-evento.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Respostas</CardTitle>
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {data?.total ?? 0} resposta{(data?.total ?? 0) !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || !data?.total}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      {isLoading && (
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      )}
      {!isLoading && data?.data && data.data.length > 0 && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Nome</th>
                  <th className="px-4 py-2 text-left font-medium">E-mail</th>
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{r.registration.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.registration.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
      {!isLoading && (!data?.data || data.data.length === 0) && (
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma resposta ainda.</p>
        </CardContent>
      )}
    </Card>
  );
}

function FormBuilderSection({
  eventId,
  kind,
  slug,
}: {
  eventId: string;
  kind: FormFieldKind;
  slug?: string;
}) {
  const { data: fields, isLoading } = useFormFields(eventId, kind);
  const reorder = useReorderFormFields(eventId);
  const deleteField = useDeleteFormField(eventId);

  const [localFields, setLocalFields] = useState<FormField[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FormField | null>(null);

  useEffect(() => {
    if (fields) setLocalFields([...fields].sort((a, b) => a.order - b.order));
  }, [fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(dragEvent: DragEndEvent) {
    const { active, over } = dragEvent;
    if (!over || active.id === over.id) return;

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
  const title = isRegistration ? "Formulário de inscrição" : "Formulário pós-evento";
  const submitLabel = isRegistration ? "Enviar inscrição" : "Enviar respostas";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Arraste para reordenar. Adicione os campos que quiser.
            </p>
          </div>
          <Button
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
        <FormPreview fields={localFields} submitLabel={submitLabel} />
        {!isRegistration && <PostEventResponsesCard eventId={eventId} />}
      </div>
    </div>
  );
}

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: event } = useEvent(eventId);
  const [kind, setKind] = useState<FormFieldKind>("registration");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
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
      </div>

      <FormBuilderSection eventId={eventId} kind={kind} slug={event?.slug} />
    </div>
  );
}
