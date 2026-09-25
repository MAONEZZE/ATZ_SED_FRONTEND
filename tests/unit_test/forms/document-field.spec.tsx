import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentField, type DocumentUpload } from "@/components/forms/document-field";
import type { FileReference } from "@/lib/api/types";

afterEach(() => cleanup());

function TestField({ upload }: { upload: DocumentUpload }) {
  const [value, setValue] = useState<FileReference[]>([]);
  return (
    <DocumentField
      inputId="document-input"
      value={value}
      onChange={setValue}
      upload={upload}
    />
  );
}

describe("DocumentField", () => {
  it("envia o arquivo mesmo quando limpar o input esvazia a FileList (comportamento do navegador)", async () => {
    const upload = vi.fn(async (file: File) => ({
      url: `https://cdn.example.com/${file.name}`,
      name: file.name,
      mimetype: file.type,
      size: file.size,
    }));
    render(<TestField upload={upload} />);

    const input = document.getElementById("document-input") as HTMLInputElement;
    const pdf = new File(["pdf"], "contrato.pdf", { type: "application/pdf" });
    // Simula a FileList viva: atribuir value = "" remove os arquivos selecionados.
    const liveFiles: File[] = [pdf];
    Object.defineProperty(input, "files", { configurable: true, get: () => liveFiles });
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => (liveFiles.length ? "C:\\fakepath\\contrato.pdf" : ""),
      set: (next: string) => {
        if (next === "") liveFiles.length = 0;
      },
    });

    fireEvent.change(input);

    await waitFor(() => expect(upload).toHaveBeenCalledWith(pdf, expect.any(Function)));
  });

  it("permite selecionar PDF e mostra o nome durante e depois do upload", async () => {
    let finishUpload: ((value: FileReference) => void) | undefined;
    const upload = vi.fn(
      () =>
        new Promise<FileReference>((resolve) => {
          finishUpload = resolve;
        }),
    );
    render(<TestField upload={upload} />);

    const input = document.getElementById("document-input") as HTMLInputElement;
    const uploadButton = screen.getByRole("button", { name: "Enviar arquivos" });
    expect(uploadButton.className).toContain("aspect-[64/25]");
    expect(input.multiple).toBe(true);
    expect(input.accept).toContain(".pdf");
    expect(input.accept).toContain("application/pdf");

    const pdf = new File(["pdf"], "manual.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [pdf] } });

    expect(await screen.findAllByText("manual.pdf")).not.toHaveLength(0);
    expect(upload).toHaveBeenCalledWith(pdf, expect.any(Function));

    finishUpload?.({
      url: "https://cdn.example.com/manual.pdf",
      name: "manual.pdf",
      mimetype: "application/pdf",
      size: pdf.size,
    });

    const fileLink = await waitFor(() =>
      screen.getByRole("link", { name: /manual.pdf/i }),
    );
    expect(
      uploadButton.compareDocumentPosition(fileLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText("manual.pdf")).not.toHaveLength(0);
  });

  it("mantém o arquivo visível mesmo antes de o formulário devolver o valor controlado", async () => {
    const reference: FileReference = {
      url: "https://cdn.example.com/contrato.pdf",
      name: "contrato.pdf",
      mimetype: "application/pdf",
      size: 1024,
    };
    const onChange = vi.fn();
    render(
      <DocumentField
        inputId="uncontrolled-document-input"
        value={[]}
        onChange={onChange}
        upload={() => Promise.resolve(reference)}
      />,
    );

    const input = document.getElementById(
      "uncontrolled-document-input",
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["pdf"], "contrato.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByText("Arquivos enviados (1/5)")).toBeTruthy();
    expect(screen.getByRole("link", { name: /contrato.pdf/i })).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith([reference]);
  });

  it("remove o arquivo pelo botão dentro do card e só oferece download quando habilitado", () => {
    const reference: FileReference = {
      url: "https://x.supabase.co/storage/v1/object/public/docs/a.pdf",
      name: "relatorio-anual-com-um-nome-bem-comprido.pdf",
      mimetype: "application/pdf",
      size: 2048,
    };
    const onChange = vi.fn();
    const { rerender } = render(
      <DocumentField
        inputId="card-input"
        value={[reference]}
        onChange={onChange}
        upload={vi.fn()}
      />,
    );

    expect(screen.getByText("2.0 KB")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Baixar/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: `Remover ${reference.name}` }));
    expect(onChange).toHaveBeenCalledWith([]);

    rerender(
      <DocumentField
        inputId="card-input"
        value={[reference]}
        onChange={onChange}
        upload={vi.fn()}
        downloadable
      />,
    );
    const download = screen.getByRole("link", { name: `Baixar ${reference.name}` });
    expect(new URL(download.getAttribute("href")!).searchParams.get("download")).toBe(
      reference.name,
    );
  });
});
