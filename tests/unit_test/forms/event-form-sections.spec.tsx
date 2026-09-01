import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema, type EventFormValues } from "@/lib/validation/event-schema";

// Radix/react-aria precisam disso no jsdom.
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/lib/api/whatsapp-instances", () => ({
  useWhatsAppInstances: () => ({ data: [] }),
}));

import { EventFormFields } from "@/components/events/event-form-fields";

function Harness({ capacity = "" }: { capacity?: string }) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "Evento Teste", capacity },
  });
  return (
    <form onSubmit={form.handleSubmit(() => {})}>
      <EventFormFields form={form} />
      <button type="submit">Salvar</button>
    </form>
  );
}

const secao = (nome: RegExp) => screen.getByRole("button", { name: nome });

afterEach(() => cleanup());

describe("EventFormFields — seções recolhíveis", () => {
  it("começa com Avançado e Mensageria fechados", () => {
    render(<Harness />);
    expect(secao(/avançado/i).getAttribute("aria-expanded")).toBe("false");
    expect(secao(/mensageria/i).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("Local")).toBeNull();
    expect(screen.queryByLabelText(/link do grupo/i)).toBeNull();
    // o título continua fora das seções
    expect(screen.getByLabelText(/título/i)).toBeDefined();
  });

  it("Avançado abre com início, término, local, capacidade e dress code", () => {
    render(<Harness />);
    fireEvent.click(secao(/avançado/i));

    expect(screen.getByLabelText("Início")).toBeDefined();
    expect(screen.getByLabelText("Término")).toBeDefined();
    expect(screen.getByLabelText("Local")).toBeDefined();
    expect(screen.getByLabelText("Capacidade")).toBeDefined();
    expect(screen.getByLabelText("Dress code")).toBeDefined();
  });

  it("Mensageria abre com link do grupo, instância e o card de recorrência", () => {
    render(<Harness />);
    fireEvent.click(secao(/mensageria/i));

    expect(screen.getByLabelText(/link do grupo/i)).toBeDefined();
    expect(screen.getByLabelText("Instância")).toBeDefined();
    expect(screen.getByText(/Recorrência - Invite e-mail/)).toBeDefined();
  });

  it("abre sozinha a seção que tem erro de validação", async () => {
    // erro dentro de seção fechada seria invisível e o submit pareceria travado.
    render(<Harness capacity="0" />);
    expect(secao(/avançado/i).getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(screen.getByText("Salvar"));

    await waitFor(() =>
      expect(secao(/avançado/i).getAttribute("aria-expanded")).toBe("true"),
    );
    expect(screen.getByText("Capacidade mínima: 1")).toBeDefined();
  });
});
