import { describe, expect, it } from "vitest";
import { paginateFoldersAndItems } from "@/lib/utils/paginate-folders";

const folders = Array.from({ length: 8 }, (_, i) => `f${i}`);
const items = Array.from({ length: 20 }, (_, i) => `e${i}`);

describe("paginateFoldersAndItems", () => {
  it("preenche a página com pastas e completa com itens", () => {
    const first = paginateFoldersAndItems(folders, items, 1, 12);
    expect(first.folders).toHaveLength(8);
    expect(first.items).toHaveLength(4);
    expect(first.items[0]).toBe("e0");
  });

  it("segue nos itens depois que as pastas acabam", () => {
    const second = paginateFoldersAndItems(folders, items, 2, 12);
    expect(second.folders).toHaveLength(0);
    expect(second.items).toEqual(items.slice(4, 16));
  });

  it("conta pastas e itens juntos no total", () => {
    expect(paginateFoldersAndItems(folders, items, 1, 12).total).toBe(28);
  });

  it("devolve a última página parcial", () => {
    const last = paginateFoldersAndItems(folders, items, 3, 12);
    expect(last.folders).toHaveLength(0);
    expect(last.items).toEqual(items.slice(16));
  });

  it("mostra só pastas quando elas passam do tamanho da página", () => {
    const many = Array.from({ length: 30 }, (_, i) => `f${i}`);
    const first = paginateFoldersAndItems(many, items, 1, 12);
    expect(first.folders).toEqual(many.slice(0, 12));
    expect(first.items).toHaveLength(0);
  });

  it("não devolve nada além do fim da lista", () => {
    const beyond = paginateFoldersAndItems(folders, items, 9, 12);
    expect(beyond.folders).toHaveLength(0);
    expect(beyond.items).toHaveLength(0);
  });
});
