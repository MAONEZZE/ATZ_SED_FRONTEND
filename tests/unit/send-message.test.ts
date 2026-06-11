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
    expect(validateSendMessage(base)).toMatch(/destinatário/);
  });

  it("exige body quando sem template", () => {
    expect(
      validateSendMessage({ ...base, registrationIds: ["a"], body: "  " }),
    ).toMatch(/mensagem|template/);
  });

  it("aceita template sem body", () => {
    expect(
      validateSendMessage({
        ...base,
        registrationIds: ["a"],
        body: "",
        templateId: "t1",
      }),
    ).toBeNull();
  });

  it("aceita body livre com destinatário", () => {
    expect(validateSendMessage({ ...base, registrationIds: ["a"] })).toBeNull();
  });
});

describe("validateManualRecipient", () => {
  it("whatsapp exige telefone; email exige e-mail", () => {
    expect(validateManualRecipient({ name: "F" }, "whatsapp")).toMatch(/Telefone/);
    expect(validateManualRecipient({ name: "F" }, "email")).toMatch(/E-mail/);
    expect(
      validateManualRecipient({ name: "F", phone: "+55" }, "whatsapp"),
    ).toBeNull();
    expect(
      validateManualRecipient({ name: "F", email: "f@x.com" }, "email"),
    ).toBeNull();
  });

  it("nome obrigatório", () => {
    expect(validateManualRecipient({ name: " " }, "whatsapp")).toMatch(/Nome/);
  });
});

describe("toSendMessageInput", () => {
  it("com template omite subject/body", () => {
    const input = toSendMessageInput({
      ...base,
      templateId: "t1",
      subject: "Assunto",
      registrationIds: ["a"],
    }, { hasEventId: true });
    expect(input.templateId).toBe("t1");
    expect(input.subject).toBeUndefined();
    expect(input.body).toBeUndefined();
  });

  it("livre por email inclui subject e body", () => {
    const input = toSendMessageInput({
      ...base,
      channel: "email",
      subject: " Assunto ",
      body: " Corpo ",
      registrationIds: ["a"],
    }, { hasEventId: true });
    expect(input.subject).toBe("Assunto");
    expect(input.body).toBe("Corpo");
  });

  it("whatsapp nunca envia subject", () => {
    const input = toSendMessageInput({
      ...base,
      subject: "Assunto",
      registrationIds: ["a"],
    }, { hasEventId: true });
    expect(input.subject).toBeUndefined();
  });
});
