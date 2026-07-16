import { describe, expect, it } from "vitest";
import {
  recipientCount,
  toSendMessageInput,
  validateManualRecipient,
  validateSendMessage,
  type SendMessageDraft,
} from "@/lib/validation/send-message";

const base: SendMessageDraft = {
  channel: "whatsapp",
  templateId: null,
  subject: "",
  body: "Olá!",
  registrationIds: [],
  manualRecipients: [],
};

describe("recipientCount", () => {
  it("soma inscritos e avulsos", () => {
    expect(
      recipientCount({
        registrationIds: ["a", "b"],
        manualRecipients: [{ name: "Fulano", phone: "+5511" }],
      }),
    ).toBe(3);
  });
});

describe("validateSendMessage", () => {
  it("exige destinatário", () => {
    expect(validateSendMessage(base, { hasEventId: true })).toMatch(/destinatário/);
  });

  it("exige body quando sem template", () => {
    expect(
      validateSendMessage(
        { ...base, registrationIds: ["a"], body: "  " },
        { hasEventId: true },
      ),
    ).toMatch(/mensagem|template/);
  });

  it("exige body mesmo com template selecionado", () => {
    expect(
      validateSendMessage(
        {
          ...base,
          registrationIds: ["a"],
          body: "",
          templateId: "t1",
        },
        { hasEventId: true },
      ),
    ).toMatch(/mensagem|template/);
  });

  it("aceita body livre com destinatário", () => {
    expect(
      validateSendMessage({ ...base, registrationIds: ["a"] }, { hasEventId: true }),
    ).toBeNull();
  });

  it("exige evento ou instância quando ambos ausentes", () => {
    expect(
      validateSendMessage(
        { ...base, registrationIds: ["a"] },
        { hasEventId: false },
      ),
    ).toMatch(/evento ou uma instância/);
  });

  it("aceita instância sem evento", () => {
    expect(
      validateSendMessage(
        { ...base, registrationIds: ["a"], instanceId: "inst-1" },
        { hasEventId: false },
      ),
    ).toBeNull();
  });
});

describe("validateManualRecipient", () => {
  it("whatsapp exige telefone; email exige e-mail", () => {
    expect(validateManualRecipient({ name: "F" }, "whatsapp")).toMatch(/Telefone/);
    expect(validateManualRecipient({ name: "F" }, "email")).toMatch(/E-mail/);
    expect(validateManualRecipient({ name: "F", phone: "+55" }, "whatsapp")).toBeNull();
    expect(validateManualRecipient({ name: "F", email: "f@x.com" }, "email")).toBeNull();
  });

  it("nome obrigatório", () => {
    expect(validateManualRecipient({ name: " " }, "whatsapp")).toMatch(/Nome/);
  });
});

describe("toSendMessageInput", () => {
  it("nunca envia templateId; envia o body preenchido", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        templateId: "t1",
        subject: "Assunto",
        body: "<p>Olá</p>",
        registrationIds: ["a"],
      },
      { hasEventId: true },
    );
    expect(input.templateId).toBeUndefined();
    expect(input.subject).toBe("Assunto");
    expect(input.body).toBe("<p>Olá</p>");
  });

  it("livre por email inclui subject e body", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        subject: " Assunto ",
        body: " Corpo ",
        registrationIds: ["a"],
      },
      { hasEventId: true },
    );
    expect(input.subject).toBe("Assunto");
    expect(input.body).toBe("Corpo");
  });

  it("whatsapp nunca envia subject", () => {
    const input = toSendMessageInput(
      {
        ...base,
        subject: "Assunto",
        registrationIds: ["a"],
      },
      { hasEventId: true },
    );
    expect(input.subject).toBeUndefined();
  });
});
