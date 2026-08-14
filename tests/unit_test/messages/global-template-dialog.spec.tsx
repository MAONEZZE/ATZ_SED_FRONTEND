import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const updateMutate = vi.fn();
const createMutate = vi.fn();

vi.mock("@/lib/api/global-messaging", () => ({
  useCreateTemplateGlobal: () => ({ mutate: createMutate, isPending: false }),
  useUpdateTemplateGlobal: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock("@/lib/api/events", () => ({
  useEvents: () => ({ data: { data: [{ id: "ev1", title: "Festa" }] } }),
}));

import { GlobalTemplateDialog } from "@/components/messages/global-template-dialog";
import { EMAIL_LAYOUT_PRESETS } from "@/lib/email/presets";
import { buildEmail } from "@/lib/email/build-email";
import type { TemplateWithEvent } from "@/lib/api/types";

afterEach(() => cleanup());
beforeEach(() => {
  updateMutate.mockClear();
  createMutate.mockClear();
});

const emailTpl: TemplateWithEvent = {
  id: "t1",
  eventId: null,
  name: "Boas-vindas",
  channel: "email",
  subject: "Oi",
  body: buildEmail(EMAIL_LAYOUT_PRESETS.minimalista),
  layoutConfig: EMAIL_LAYOUT_PRESETS.minimalista,
  styleKey: "minimalista",
  createdAt: "",
  updatedAt: "",
  event: null,
};

describe("GlobalTemplateDialog (e-mail)", () => {
  it("mostra preview iframe e botões de preset ao editar template HTML", () => {
    render(<GlobalTemplateDialog template={emailTpl} open onOpenChange={() => {}} />);
    expect(screen.getByTitle(/preview/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /editar layout/i })).toBeTruthy();
  });

  it("salva com layoutConfig e styleKey", () => {
    render(<GlobalTemplateDialog template={emailTpl} open onOpenChange={() => {}} />);
    screen.getByRole("button", { name: /^salvar$/i }).click();
    expect(updateMutate).toHaveBeenCalledTimes(1);
    const arg = updateMutate.mock.calls[0][0];
    expect(arg.input.styleKey).toBe("minimalista");
    expect(arg.input.layoutConfig).toBeTruthy();
    expect(arg.input.body).toContain("<");
    expect(arg.input.eventId).toBeNull();
  });

  it("com fixedEventId, some o campo Evento e o template nasce vinculado", () => {
    render(
      <GlobalTemplateDialog
        template={emailTpl}
        open
        onOpenChange={() => {}}
        fixedEventId="evt-1"
      />,
    );
    expect(screen.queryByText(/global \(sem evento\)/i)).toBeNull();
    screen.getByRole("button", { name: /^salvar$/i }).click();
    const arg = updateMutate.mock.calls[0][0];
    expect(arg.input.eventId).toBe("evt-1");
  });

  it("não salva template de e-mail sem assunto", () => {
    const noSubject: TemplateWithEvent = { ...emailTpl, subject: "" };
    render(<GlobalTemplateDialog template={noSubject} open onOpenChange={() => {}} />);
    screen.getByRole("button", { name: /^salvar$/i }).click();
    expect(updateMutate).not.toHaveBeenCalled();
  });
});

describe("GlobalTemplateDialog (whatsapp)", () => {
  it("não mostra editor de layout no canal whatsapp", () => {
    const wa: TemplateWithEvent = {
      ...emailTpl,
      channel: "whatsapp",
      body: "Olá {{nome}}",
      layoutConfig: null,
      styleKey: null,
    };
    render(<GlobalTemplateDialog template={wa} open onOpenChange={() => {}} />);
    expect(screen.queryByRole("button", { name: /editar layout/i })).toBeNull();
  });
});
