import { describe, expect, it } from "vitest";
import type { ClientRect, DroppableContainer } from "@dnd-kit/core";
import { folderAwareCollision } from "@/lib/utils/folder-collision";

function rect(top: number, left: number, width: number, height: number): ClientRect {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

/** Duas linhas de pasta; o "miolo" (nome) ocupa só o começo de cada linha. */
const ROWS = {
  "folder:a": rect(0, 0, 400, 48),
  "folder-content:a": rect(12, 40, 120, 24),
  "folder:b": rect(48, 0, 400, 48),
  "folder-content:b": rect(60, 40, 120, 24),
};

function collide(pointer: { x: number; y: number }) {
  const droppableRects = new Map(Object.entries(ROWS));
  return folderAwareCollision({
    active: { id: "folder:b" } as never,
    collisionRect: rect(pointer.y - 24, pointer.x - 200, 400, 48),
    droppableRects,
    droppableContainers: Object.keys(ROWS).map((id) => ({
      id,
    })) as unknown as DroppableContainer[],
    pointerCoordinates: pointer,
  }).map((collision) => collision.id);
}

describe("colisão de pastas", () => {
  it("mira o nome da pasta quando o ponteiro está em cima dele", () => {
    expect(collide({ x: 60, y: 20 })[0]).toBe("folder-content:a");
  });

  it("mira a linha quando o ponteiro está fora do nome — é o que reordena", () => {
    // Sem isso o miolo, que fica no centro da linha, vencia o closestCenter e
    // toda tentativa de reordenar virava "soltar dentro da pasta".
    expect(collide({ x: 300, y: 20 })[0]).toBe("folder:a");
  });

  it("nunca devolve o miolo por proximidade", () => {
    expect(
      collide({ x: 380, y: 40 }).every((id) => !String(id).startsWith("folder-content:")),
    ).toBe(true);
  });
});
