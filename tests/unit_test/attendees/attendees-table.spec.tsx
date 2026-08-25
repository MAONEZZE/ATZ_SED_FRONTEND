import React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { AttendeesTable } from "@/components/attendees/attendees-table";

beforeAll(() => {
  // jsdom não implementa ResizeObserver; a DataTable usa um pra remedir no resize.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => cleanup());

type Row = { id: string; name: string; attended: boolean | null };

const ROWS: Row[] = [
  { id: "r1", name: "Ana", attended: true },
  { id: "r2", name: "Bruno", attended: false },
  { id: "r3", name: "Carla", attended: null },
];

function renderTable(overrides: Record<string, unknown> = {}) {
  const onDeleteConfirmed = vi.fn().mockResolvedValue({ deleted: 2 });
  const onSelectedChange = vi.fn();
  const props = {
    data: ROWS,
    isLoading: false,
    total: ROWS.length,
    getRowId: (r: Row) => r.id,
    getName: (r: Row) => r.name,
    getEmail: () => "x@x.com",
    getPhone: () => "+5511999998888",
    getCreatedAt: () => "2026-08-01T00:00:00.000Z",
    getAttended: (r: Row) => r.attended,
    renderStatus: () => "status",
    search: "",
    onSearchChange: vi.fn(),
    page: 1,
    pageSize: 20,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    selected: new Set<string>(),
    onSelectedChange,
    onRowClick: vi.fn(),
    emptyMessage: "vazio",
    formSelector: null,
    exporting: false,
    onExport: vi.fn(),
    importDisabled: false,
    onImportClick: vi.fn(),
    deleteDisabled: false,
    onDeleteConfirmed,
    ...overrides,
  };
  const view = render(<AttendeesTable {...(props as never)} />);
  return { ...view, onDeleteConfirmed, onSelectedChange };
}

describe("AttendeesTable — coluna Checkin", () => {
  it("renderiza Feito para attended=true e Não feito para attended=false", () => {
    renderTable();
    expect(screen.getByText("Feito")).not.toBeNull();
    expect(screen.getByText("Não feito")).not.toBeNull();
  });

  it("renderiza — quando getAttended retorna null", () => {
    renderTable();
    const row = screen.getByText("Carla").closest("tr");
    expect(row?.textContent).toContain("—");
  });
});

describe("AttendeesTable — exclusão em massa", () => {
  it("desabilita Excluir sem seleção e habilita com seleção", () => {
    const { rerender } = renderTable({ selected: new Set() });
    const button = () => screen.getByRole("button", { name: /excluir/i }) as HTMLButtonElement;
    expect(button().disabled).toBe(true);

    rerender(
      <AttendeesTable
        {...({
          data: ROWS,
          isLoading: false,
          total: ROWS.length,
          getRowId: (r: Row) => r.id,
          getName: (r: Row) => r.name,
          getEmail: () => "x@x.com",
          getPhone: () => "+5511999998888",
          getCreatedAt: () => "2026-08-01T00:00:00.000Z",
          getAttended: (r: Row) => r.attended,
          renderStatus: () => "status",
          search: "",
          onSearchChange: vi.fn(),
          page: 1,
          pageSize: 20,
          onPageChange: vi.fn(),
          onPageSizeChange: vi.fn(),
          selected: new Set(["r1"]),
          onSelectedChange: vi.fn(),
          onRowClick: vi.fn(),
          emptyMessage: "vazio",
          formSelector: null,
          exporting: false,
          onExport: vi.fn(),
          importDisabled: false,
          onImportClick: vi.fn(),
          deleteDisabled: false,
          onDeleteConfirmed: vi.fn().mockResolvedValue({ deleted: 1 }),
        } as never)}
      />,
    );
    expect(button().disabled).toBe(false);
  });

  it("desabilita Excluir com mais de 500 selecionados (teto de segurança)", () => {
    const manyIds = new Set(Array.from({ length: 501 }, (_, i) => `id-${i}`));
    renderTable({ selected: manyIds });
    const button = screen.getByRole("button", { name: /excluir/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("mostra confirmação antes de excluir e só chama a mutation ao confirmar", async () => {
    const { onDeleteConfirmed, onSelectedChange } = renderTable({
      selected: new Set(["r1", "r2"]),
    });

    fireEvent.click(screen.getByRole("button", { name: /excluir \(2\)/i }));

    // O diálogo aparece com os nomes dos selecionados antes de qualquer chamada.
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/excluir 2 inscrito/i)).not.toBeNull();
    expect(within(dialog).getByText("Ana")).not.toBeNull();
    expect(onDeleteConfirmed).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: /^excluir$/i }));

    await waitFor(() => expect(onDeleteConfirmed).toHaveBeenCalledWith(["r1", "r2"]));
    await waitFor(() => expect(onSelectedChange).toHaveBeenCalledWith(new Set()));
  });
});
