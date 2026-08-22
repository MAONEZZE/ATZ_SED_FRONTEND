import { describe, expect, it } from "vitest";
import { beforeIdAfterMove } from "@/lib/utils/sortable-move";

describe("beforeIdAfterMove", () => {
  it("usa o item seguinte como âncora ao mover para a direita", () => {
    expect(beforeIdAfterMove(["a", "b", "c", "d"], "b", "c")).toBe("d");
  });

  it("omite a âncora ao mover para o final", () => {
    expect(beforeIdAfterMove(["a", "b", "c"], "a", "c")).toBeUndefined();
  });

  it("usa o alvo como âncora ao mover para a esquerda", () => {
    expect(beforeIdAfterMove(["a", "b", "c", "d"], "d", "b")).toBe("b");
  });
});
