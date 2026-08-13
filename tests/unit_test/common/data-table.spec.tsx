import React, { useState } from "react";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DataTable } from "@/components/common/data-table";

beforeAll(() => {
  // jsdom não implementa ResizeObserver; a tabela usa um pra remedir no resize.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => cleanup());

type Row = { id: string; name: string };

function Harness({ total, rows }: { total: number; rows: Row[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | null>(null);

  return (
    <>
      <span data-testid="page-size">{pageSize ?? "não medido"}</span>
      <DataTable
        columns={[{ key: "name", header: "Nome", cell: (r: Row) => r.name }]}
        data={rows}
        getRowId={(r) => r.id}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </>
  );
}

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Registro ${i}` }));
}

describe("DataTable", () => {
  it("mede quantas linhas cabem na tela e informa ao caller", () => {
    render(<Harness total={0} rows={[]} />);

    const measured = Number(screen.getByTestId("page-size").textContent);
    expect(measured).toBeGreaterThan(0);
  });

  it("esconde a paginação quando todos os registros cabem em uma página", () => {
    render(<Harness total={3} rows={makeRows(3)} />);

    // Garante que sumiu por caber tudo, não por a tabela ainda não ter medido.
    expect(Number(screen.getByTestId("page-size").textContent)).toBeGreaterThan(3);
    expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Próxima" })).toBeNull();
  });

  it("mostra Anterior/Próxima quando há mais de uma página", () => {
    const measured = 14; // altura da viewport do jsdom / altura da linha
    render(<Harness total={measured * 3} rows={makeRows(measured)} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeTruthy();
  });

  it("desabilita Anterior na primeira página", () => {
    render(<Harness total={500} rows={makeRows(14)} />);

    const previous = screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
  });
});
