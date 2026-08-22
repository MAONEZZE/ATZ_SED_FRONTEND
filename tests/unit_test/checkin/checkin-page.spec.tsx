import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import CheckinPage from "@/app/(public)/checkin/page";

const submitPublicCheckin = vi.fn();
const toastError = vi.fn();

vi.mock("@/lib/api/public", () => ({
  submitPublicCheckin: (phone: string) => submitPublicCheckin(phone),
}));

vi.mock("sonner", () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

beforeEach(() => {
  localStorage.clear();
  submitPublicCheckin.mockReset().mockResolvedValue(undefined);
  toastError.mockReset();
});

afterEach(() => cleanup());

function typePhone(value: string) {
  const input = screen.getByLabelText("Telefone");
  fireEvent.change(input, { target: { value } });
  return input;
}

describe("página pública de check-in", () => {
  it("telefone inválido não dispara request", async () => {
    render(<CheckinPage />);
    typePhone("+5511");

    fireEvent.click(screen.getByRole("button", { name: "Checkin" }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(submitPublicCheckin).not.toHaveBeenCalled();
  });

  it("sucesso troca para a confirmação e persiste a flag", async () => {
    render(<CheckinPage />);
    typePhone("+5511999998888");

    fireEvent.click(screen.getByRole("button", { name: "Checkin" }));

    expect(await screen.findByText("Check-in confirmado")).toBeTruthy();
    expect(submitPublicCheckin).toHaveBeenCalledWith("+5511999998888");
    expect(localStorage.getItem("checkin_submitted")).toBe("true");
  });

  it("erro do backend aparece no toast e mantém o formulário utilizável", async () => {
    submitPublicCheckin.mockRejectedValue(new Error("Nenhuma inscrição com esse telefone"));
    render(<CheckinPage />);
    typePhone("+5511999998888");

    fireEvent.click(screen.getByRole("button", { name: "Checkin" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Nenhuma inscrição com esse telefone"),
    );
    expect(screen.getByRole("button", { name: "Checkin" })).toBeTruthy();
    expect(localStorage.getItem("checkin_submitted")).toBeNull();
  });

  it("flag já gravada abre direto na confirmação, sem formulário", () => {
    localStorage.setItem("checkin_submitted", "true");
    render(<CheckinPage />);

    expect(screen.getByText("Check-in confirmado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Checkin" })).toBeNull();
  });
});
