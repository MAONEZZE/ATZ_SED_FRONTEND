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
import { GripVertical, Lock, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  useDeleteFormField,
  useFormFields,
  useReorderFormFields,
} from "@/lib/api/form-fields";
import { useEvent } from "@/lib/api/events";
import type { FormField } from "@/lib/api/types";
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
    useSortable({ id: field.id, disabled: field.isFixed });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
        isDragging ? "z-10 shadow-lg" : ""
      }`}
    >
      {field.isFixed ? (
        <Lock
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-label="Campo fixo"
        />
      ) : (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          aria-label={`Reordenar campo ${field.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{field.label}</p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{typeLabels[field.type] ?? field.type}</Badge>
          {field.required && <Badge variant="outline">Obrigatório</Badge>}
          {field.isFixed && <Badge variant="outline">Fixo</Badge>}
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

      {!field.isFixed && (
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
                O campo &quot;{field.label}&quot; será removido do formulário de
                inscrição.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  );
}

/** Preview ao vivo — renderiza os campos como o inscrito verá (somente visual) */
function FormPreview({ fields }: { fields: FormField[] }) {
  // form local apenas para o estado controlado do renderer; sem resolver/submit
  const previewForm = useForm<Record<string, unknown>>();
  // página pública oculta campos image — espelha o comportamento
  const visible = fields.filter((f) => f.type !== "image");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pré-visualização</CardTitle>
        <p className="text-sm text-muted-foreground">
          Como o inscrito verá o formulário.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormFieldsRenderer fields={visible} form={previewForm} disabled />
        <Button className="w-full" size="lg" disabled>
          Enviar inscrição
        </Button>
      </CardContent>
    </Card>
  );
}

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: fields, isLoading } = useFormFields(eventId);
  const { data: event } = useEvent(eventId);
  const reorder = useReorderFormFields(eventId);
  const deleteField = useDeleteFormField(eventId);

  function handleShare() {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.slug}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Link público copiado!"),
      () => toast.error("Falha ao copiar link"),
    );
  }

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localFields.findIndex((f) => f.id === active.id);
    const newIndex = localFields.findIndex((f) => f.id === over.id);
    const next = arrayMove(localFields, oldIndex, newIndex);
    setLocalFields(next);

    // persiste apenas os campos cuja ordem mudou
    const changes = next
      .map((field, index) => ({ id: field.id, order: index }))
      .filter(({ id, order }) => {
        const original = localFields.find((f) => f.id === id);
        return original && original.order !== order;
      });

    if (changes.length) {
      reorder.mutate(changes, {
        onError: (e) => {
          toast.error(`Falha ao reordenar: ${e.message}`);
        },
      });
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Formulário de inscrição</h2>
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar. Campos fixos não podem ser removidos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShare} disabled={!event}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
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
                    onSuccess: () => toast.success("Campo excluído"),
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
        field={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        nextOrder={localFields.length}
      />
      </div>

      <FormPreview fields={localFields} />
    </div>
  );
}
