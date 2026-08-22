import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ScanPage from "@/app/(dashboard)/scan/page";

afterEach(() => cleanup());

describe("página SCAN", () => {
  it("mostra a instrução de check-in e o QR apontando para a página pública", () => {
    const { container } = render(<ScanPage />);

    expect(screen.getByText("Escaneie o código para fazer o check-in")).toBeTruthy();

    // O QR só é montado depois do effect que lê window.location.origin.
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    // fundo + módulos: SVG com conteúdo real, não o placeholder de layout.
    expect(svg!.querySelectorAll("path").length).toBeGreaterThan(1);
  });
});
