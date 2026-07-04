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
    expect(validateSendMessage({ ...base, registrationIds: ["a"], body: "  " })).toMatch(
      /mensagem|template/,
    );
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

  it("email com invite anexa token {{invite}} ao body", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        body: "Corpo",
        registrationIds: ["a"],
        inviteIcs: true,
      },
      { hasEventId: true },
    );
    expect(input.body).toContain("{{invite}}");
  });

  it("email com invite recorrente anexa token {{invite_recorrente}}", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        body: "Corpo",
        registrationIds: ["a"],
        inviteRecurrent: true,
      },
      { hasEventId: true },
    );
    expect(input.body).toContain("{{invite_recorrente}}");
  });

  it("não duplica token já presente no body", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        body: "Corpo {{invite}}",
        registrationIds: ["a"],
        inviteIcs: true,
      },
      { hasEventId: true },
    );
    expect(input.body?.match(/\{\{invite\}\}/g)?.length).toBe(1);
  });

  it("em HTML insere o token antes de </body> (não após </html>)", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        body: "<!DOCTYPE html><html><body><p>Oi</p></body></html>",
        registrationIds: ["a"],
        inviteIcs: true,
      },
      { hasEventId: true },
    );
    const b = input.body ?? "";
    expect(b.indexOf("{{invite}}")).toBeGreaterThan(-1);
    expect(b.indexOf("{{invite}}")).toBeLessThan(b.indexOf("</body>"));
  });

  it("whatsapp ignora invite (token só em email)", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "whatsapp",
        body: "Corpo",
        registrationIds: ["a"],
        inviteIcs: true,
      },
      { hasEventId: true },
    );
    expect(input.body).not.toContain("{{invite}}");
  });

  it("email com inviteConfig recorrente envia objeto invite com recurrence", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        body: "Corpo",
        registrationIds: ["a"],
        inviteConfig: {
          date: "2026-07-01",
          allDay: false,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "America/Sao_Paulo",
          recurrence: "weekly",
        },
      },
      { hasEventId: true },
    );
    expect(input.invite).toEqual({
      date: "2026-07-01",
      allDay: false,
      startTime: "09:00",
      endTime: "10:00",
      timezone: "America/Sao_Paulo",
      recurrence: { freq: "WEEKLY", interval: 1 },
    });
  });

  it("inviteConfig único (none) envia recurrence null; allDay omite horários", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        body: "Corpo",
        registrationIds: ["a"],
        inviteConfig: {
          date: "2026-07-01",
          allDay: true,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "America/Sao_Paulo",
          recurrence: "none",
        },
      },
      { hasEventId: true },
    );
    expect(input.invite?.recurrence).toBeNull();
    expect(input.invite?.startTime).toBeUndefined();
    expect(input.invite?.endTime).toBeUndefined();
  });

  it("inviteConfig custom envia freq/interval/until", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "email",
        body: "Corpo",
        registrationIds: ["a"],
        inviteConfig: {
          date: "2026-07-01",
          allDay: false,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "America/Sao_Paulo",
          recurrence: "custom",
          customFreq: "MONTHLY",
          interval: 3,
          until: "2026-12-31",
        },
      },
      { hasEventId: true },
    );
    expect(input.invite?.recurrence?.freq).toBe("MONTHLY");
    expect(input.invite?.recurrence?.interval).toBe(3);
    expect(input.invite?.recurrence?.until).toMatch(/^20\d{2}-\d{2}-\d{2}T.*Z$/);
  });

  it("whatsapp não envia objeto invite mesmo com inviteConfig", () => {
    const input = toSendMessageInput(
      {
        ...base,
        channel: "whatsapp",
        body: "Corpo",
        registrationIds: ["a"],
        inviteConfig: {
          date: "2026-07-01",
          allDay: false,
          startTime: "09:00",
          endTime: "10:00",
          timezone: "America/Sao_Paulo",
          recurrence: "weekly",
        },
      },
      { hasEventId: true },
    );
    expect(input.invite).toBeUndefined();
  });
});
