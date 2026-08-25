import React, { useState } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { DataTable, Pagination } from "@/components/common/data-table";

afterEach(() => {
  cleanup();
  document.getElementById("dashboard-pagination-footer")?.remove();
});

type Row = { id: string; name: string };

function Harness({ total, rows }: { total: number; rows: Row[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <>
      <span data-testid="page-size">{pageSize}</span>
      <span data-testid="limit-requested">{rows.length}</span>
      <DataTable
        columns={[{ key: "name", header: "Nome", cell: (r: Row) => r.name }]}
        data={rows}
        getRowId={(r) => r.id}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
      <button
        type="button"
        onClick={() => {
          setPageSize(50);
          setPage(1);
        }}
      >
        Trocar para 50
      </button>
    </>
  );
}

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Registro ${i}` }));
}

describe("DataTable", () => {
  it("usa 10 como tamanho de página default, escolhido pelo usuário — não medido", () => {
    render(<Harness total={0} rows={[]} />);

    expect(screen.getByTestId("page-size").textContent).toBe("10");
  });

  it("o limit enviado é sempre o valor escolhido, nunca derivado do layout medido", () => {
    // Regressão do bug original: a tabela não mede mais nada — o número de
    // linhas pedidas é exatamente o pageSize escolhido, mesmo que a viewport
    // do ambiente de teste (jsdom, sem layout real) fosse "pequena".
    const rows = makeRows(10);
    render(<Harness total={25} rows={rows} />);

    expect(screen.getByTestId("limit-requested").textContent).toBe("10");
    expect(screen.getByText("1/3")).toBeTruthy();
  });

  it("mostra 1/1 e desabilita os dois botões quando há uma página", () => {
    render(<Harness total={3} rows={makeRows(3)} />);

    expect(screen.getByText("1/1")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Próxima" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("mostra Anterior/Próxima quando há mais de uma página", () => {
    render(<Harness total={30} rows={makeRows(10)} />);

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
    render(<Harness total={500} rows={makeRows(10)} />);

    const previous = screen.getByRole("button", {
      name: "Anterior",
    }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
  });
});

describe("Pagination — troca de tamanho de página", () => {
  it("volta para a página 1 ao trocar o tamanho", () => {
    render(<Harness total={100} rows={makeRows(10)} />);

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByText("2/10")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Trocar para 50" }));
    expect(screen.getByTestId("page-size").textContent).toBe("50");
    expect(screen.getByText("1/2")).toBeTruthy();
  });
});

describe("Pagination — inline", () => {
  it("não portala para o footer do dashboard quando inline", () => {
    const footer = document.createElement("footer");
    footer.id = "dashboard-pagination-footer";
    document.body.appendChild(footer);

    const { container } = render(
      <Pagination page={1} totalPages={3} onPageChange={() => {}} inline />,
    );

    expect(within(footer).queryByText("1/3")).toBeNull();
    expect(within(container).getByText("1/3")).toBeTruthy();
  });

  it("sem inline, portala para o footer do dashboard", () => {
    const footer = document.createElement("footer");
    footer.id = "dashboard-pagination-footer";
    document.body.appendChild(footer);

    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);

    expect(within(footer).getByText("1/3")).toBeTruthy();
  });
});
