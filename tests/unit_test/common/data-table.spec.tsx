import React, { useState } from "react";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { DataTable } from "@/components/common/data-table";

beforeAll(() => {
  // jsdom não implementa ResizeObserver; a tabela usa um pra remedir no resize.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  document.getElementById("dashboard-pagination-footer")?.remove();
});

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

  it("mostra 1/1 e desabilita os dois botões quando há uma página", () => {
    render(<Harness total={3} rows={makeRows(3)} />);

    // Garante que há apenas uma página porque todos os registros cabem nela.
    expect(Number(screen.getByTestId("page-size").textContent)).toBeGreaterThan(3);
    expect(screen.getByText("1/1")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Próxima" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("mostra Anterior/Próxima quando há mais de uma página", () => {
    const measured = 14; // altura da viewport do jsdom / altura da linha
    render(<Harness total={measured * 3} rows={makeRows(measured)} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeTruthy();
  });

  it("renderiza a paginação no footer fixo do dashboard", () => {
    const footer = document.createElement("footer");
    footer.id = "dashboard-pagination-footer";
    document.body.appendChild(footer);

    render(<Harness total={3} rows={makeRows(3)} />);

    expect(within(footer).getByText("1/1")).toBeTruthy();
  });

  it("desabilita Anterior na primeira página", () => {
    render(<Harness total={500} rows={makeRows(14)} />);

    const previous = screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
  });
});
