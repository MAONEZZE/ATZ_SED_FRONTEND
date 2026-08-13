import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AppSidebar } from "@/components/layout/app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/eventos",
}));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => cleanup());

describe("AppSidebar", () => {
  it("recolher esconde o label visualmente mas mantém o nome acessível", async () => {
    render(<AppSidebar />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();

    const toggle = screen.getByRole("button", { name: "Recolher menu" });
    fireEvent.click(toggle);

    const link = await screen.findByRole("link", { name: "Dashboard" });
    expect(link.querySelector("span")?.classList.contains("sr-only")).toBe(true);
  });

  it("estado de colapso sobrevive a remount (persistido em localStorage)", () => {
    const { unmount } = render(<AppSidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Recolher menu" }));
    unmount();

    render(<AppSidebar />);
    expect(
      screen.getByRole("button", { name: "Recolher menu" }).getAttribute("aria-expanded"),
    ).toBe("false");
  });
});
