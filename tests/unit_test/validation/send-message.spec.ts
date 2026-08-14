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
  groupIds: [],
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

  it("ignora grupos (cap de 30 é só para destinatários individuais)", () => {
    expect(
      recipientCount({
        registrationIds: ["a"],
        manualRecipients: [],
        groupIds: ["g1", "g2", "g3"],
      } as SendMessageDraft),
    ).toBe(1);
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

  it("exige body mesmo com template selecionado", () => {
    expect(
      validateSendMessage({
        ...base,
        registrationIds: ["a"],
        body: "",
        templateId: "t1",
      }),
    ).toMatch(/mensagem|template/);
  });

  it("aceita body livre com destinatário", () => {
    expect(validateSendMessage({ ...base, registrationIds: ["a"] })).toBeNull();
  });

  it("aceita envio avulso sem evento e sem instância", () => {
    expect(
      validateSendMessage({
        ...base,
        manualRecipients: [{ name: "Fulano", phone: "+5511" }],
      }),
    ).toBeNull();
  });

  it("aceita apenas grupos selecionados, sem inscritos/avulsos", () => {
    expect(validateSendMessage({ ...base, groupIds: ["g1"] })).toBeNull();
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

  it("inclui groupIds para whatsapp", () => {
    const input = toSendMessageInput(
      { ...base, groupIds: ["120363424826018469@g.us"] },
      { hasEventId: true },
    );
    expect(input.groupIds).toEqual(["120363424826018469@g.us"]);
  });

  it("omite groupIds para email mesmo se preenchido", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        registrationIds: ["a"],
        groupIds: ["120363424826018469@g.us"],
      },
      { hasEventId: true },
    );
    expect(input.groupIds).toBeUndefined();
  });
});
