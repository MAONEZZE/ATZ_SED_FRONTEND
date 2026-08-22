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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  useDeleteFormField,
  useFormFields,
  useReorderFormFields,
} from "@/lib/api/form-fields";
import { useEvent } from "@/lib/api/events";
import {
  useCreateForm,
  useDeleteForm,
  useForms,
  useReorderForms,
  useUpdateForm,
} from "@/lib/api/forms";
import { revalidatePublicEvent } from "@/lib/utils/revalidate-public";
import type { Form, FormField } from "@/lib/api/types";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function FormPreview({ fields }: { fields: FormField[] }) {
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
          Enviar inscrição
        </Button>
      </CardContent>
    </Card>
  );
}

function FormTogglesCard({
  eventId,
  form,
  slug,
  readonly,
}: {
  eventId: string;
  form: Form;
  slug?: string;
  readonly: boolean;
}) {
  const update = useUpdateForm(eventId, form.id);

  function handleChange(field: "requireImageAuthorization" | "sendToPipedrive", value: boolean) {
    update.mutate(
      { [field]: value },
      {
        onSuccess: () => {
          toast.success("Formulário atualizado");
          if (slug) void revalidatePublicEvent(slug);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="require-image-auth">Autorização de imagem</Label>
          <Switch
            id="require-image-auth"
            checked={form.requireImageAuthorization}
            onCheckedChange={(v) => handleChange("requireImageAuthorization", v)}
            disabled={readonly || form.anonymous || update.isPending}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="pipedrive-toggle">Enviar para o Pipedrive</Label>
          <Switch
            id="pipedrive-toggle"
            checked={form.sendToPipedrive}
            onCheckedChange={(v) => handleChange("sendToPipedrive", v)}
            disabled={readonly || form.anonymous || update.isPending}
          />
        </div>
        {form.anonymous && (
          <p className="text-xs text-muted-foreground">
            Formulário anônimo não pode exigir autorização de imagem nem enviar ao Pipedrive.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FormMetaEditor({
  eventId,
  form,
  slug,
  readonly,
}: {
  eventId: string;
  form: Form;
  slug?: string;
  readonly: boolean;
}) {
  const update = useUpdateForm(eventId, form.id);

  const [description, setDescription] = useState("");
  const [postRegistrationMessage, setPostRegistrationMessage] = useState("");
  const [linkPostSubscription, setLinkPostSubscription] = useState("");
  const [activeField, setActiveField] = useState<"description" | "post" | "link">("description");

  useEffect(() => {
    setDescription(form.description ?? "");
    setPostRegistrationMessage(form.postRegistrationMessage ?? "");
    setLinkPostSubscription(form.linkPostSubscription ?? "");
  }, [form]);

  const dirty =
    description !== (form.description ?? "") ||
    postRegistrationMessage !== (form.postRegistrationMessage ?? "") ||
    linkPostSubscription !== (form.linkPostSubscription ?? "");

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
        description,
        postRegistrationMessage,
        // Backend valida com @IsUrl; string vazia não é URL válida, então só
        // manda a chave quando há valor — não dá pra "limpar" o link por aqui.
        ...(linkPostSubscription ? { linkPostSubscription } : {}),
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
  form,
  slug,
  readonly,
}: {
  eventId: string;
  form: Form;
  slug?: string;
  readonly: boolean;
}) {
  const formId = form.id;
  const { data: fields, isLoading } = useFormFields(eventId, formId);
  const reorder = useReorderFormFields(eventId, formId);
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

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {readonly && (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
            Evento cancelado ou encerrado — somente leitura.
          </p>
        )}

        <FormMetaEditor eventId={eventId} form={form} slug={slug} readonly={readonly} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{form.name}</h2>
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
          formId={formId}
        />
      </div>

      <div className="space-y-4">
        <FormTogglesCard eventId={eventId} form={form} slug={slug} readonly={readonly} />
        <FormPreview fields={localFields} />
      </div>
    </div>
  );
}

function SortableFormTab({
  form,
  active,
  readonly,
  onSelect,
  onRename,
  onDelete,
}: {
  form: Form;
  active: boolean;
  readonly: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: form.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded-md border p-1 ${
        active ? "border-primary bg-primary/5" : "border-transparent"
      } ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        aria-label={`Reordenar formulário ${form.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        onClick={onSelect}
      >
        {form.name}
        {form.anonymous && <Badge variant="secondary" className="ml-2">Anônimo</Badge>}
      </Button>
      {active && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Renomear ${form.name}`}
            disabled={readonly}
            onClick={onRename}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Excluir ${form.name}`}
                disabled={readonly}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{form.name}&quot;, seus campos e as respostas recebidas serão removidos
                  permanentemente.
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
        </>
      )}
    </div>
  );
}

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { data: event } = useEvent(eventId);
  const { data: forms, isLoading: formsLoading } = useForms(eventId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<Form | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const readonly = event?.status === "cancelled" || event?.status === "ended";

  const createForm = useCreateForm(eventId);
  const updateForm = useUpdateForm(eventId, renaming?.id ?? "");
  const deleteForm = useDeleteForm(eventId);
  const reorderForms = useReorderForms(eventId);

  useEffect(() => {
    if (!forms || forms.length === 0) return;
    if (!selectedId || !forms.some((f) => f.id === selectedId)) {
      setSelectedId([...forms].sort((a, b) => a.order - b.order)[0].id);
    }
  }, [forms, selectedId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedForms = [...(forms ?? [])].sort((a, b) => a.order - b.order);
  const selectedForm = sortedForms.find((f) => f.id === selectedId) ?? null;

  function handleTabDragEnd(dragEvent: DragEndEvent) {
    const { active, over } = dragEvent;
    if (readonly || !over || active.id === over.id) return;

    const oldIndex = sortedForms.findIndex((f) => f.id === active.id);
    const newIndex = sortedForms.findIndex((f) => f.id === over.id);
    const next = arrayMove(sortedForms, oldIndex, newIndex);

    reorderForms.mutate(next.map((f) => f.id), {
      onError: (e) => toast.error(`Falha ao reordenar: ${e.message}`),
    });
  }

  function handleCreate() {
    if (!newName.trim()) {
      toast.error("Informe o nome do formulário");
      return;
    }
    createForm.mutate(
      { name: newName.trim() },
      {
        onSuccess: (created) => {
          toast.success("Formulário criado");
          setSelectedId(created.id);
          setCreateOpen(false);
          setNewName("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleRename() {
    if (!renaming || !renameValue.trim()) {
      toast.error("Informe o nome do formulário");
      return;
    }
    updateForm.mutate(
      { name: renameValue.trim() },
      {
        onSuccess: () => {
          toast.success("Formulário renomeado");
          if (event?.slug) void revalidatePublicEvent(event.slug);
          setRenaming(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleDelete(form: Form) {
    deleteForm.mutate(form.id, {
      onSuccess: () => {
        toast.success("Formulário excluído");
        if (event?.slug) void revalidatePublicEvent(event.slug);
        if (selectedId === form.id) setSelectedId(null);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleCopyLink() {
    if (!event?.slug || !selectedForm) return;
    const url = `${window.location.origin}/e/${event.slug}/f/${selectedForm.slug}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Link do formulário copiado!"),
      () => toast.error("Falha ao copiar link"),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd}>
            <SortableContext items={sortedForms.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap items-center gap-2">
                {sortedForms.map((form) => (
                  <SortableFormTab
                    key={form.id}
                    form={form}
                    active={form.id === selectedId}
                    readonly={Boolean(readonly)}
                    onSelect={() => setSelectedId(form.id)}
                    onRename={() => {
                      setRenaming(form);
                      setRenameValue(form.name);
                    }}
                    onDelete={() => handleDelete(form)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={readonly}
            onClick={() => {
              setNewName("");
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo formulário
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={!event?.slug || !selectedForm}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Copiar link
          </Button>
        </div>
      </div>

      {formsLoading ? (
        <LoadingSpinner />
      ) : selectedForm ? (
        <FormBuilderSection
          eventId={eventId}
          form={selectedForm}
          slug={event?.slug}
          readonly={Boolean(readonly)}
        />
      ) : (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Este evento ainda não tem formulários. Crie um para começar.
        </p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo formulário</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-form-name">Nome</Label>
            <Input
              id="new-form-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Inscrição"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createForm.isPending}>
              {createForm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear formulário</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-form-name">Nome</Label>
            <Input
              id="rename-form-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={updateForm.isPending}>
              {updateForm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
