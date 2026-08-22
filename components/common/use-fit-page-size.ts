"use client";

import { useEffect, useRef, useState } from "react";

/** Altura de uma linha de tabela: `h-12` (48px) + 1px de borda inferior. */
export const TABLE_ROW_HEIGHT = 49;
/** Paginação (32px + 16px de margem) + padding inferior do `<main>` (24px). */
export const RESERVED_BELOW = 72;

/**
 * Quantos itens cabem entre o topo do container e o fim da viewport — para a
 * lista nunca gerar scrollbar.
 *
 * Retorna `null` até a primeira medição: o caller segura o fetch enquanto for
 * null, assim busca exatamente a quantidade que cabe (uma request só, sem
 * flash de página cheia/vazia).
 *
 * O container é medido vazio, então o `top` não depende dos dados. Se ele for
 * um grid, as colunas saem do `grid-template-columns` computado — acompanha os
 * breakpoints do CSS sem duplicá-los aqui.
 */
export function useFitPageSize<T extends HTMLElement>({
  itemHeight,
  gap = 0,
  reserved = 0,
}: {
  /** Altura de uma linha/card, incluindo borda. */
  itemHeight: number;
  /** Espaço vertical entre itens (grid). */
  gap?: number;
  /** Espaço ocupado abaixo do container: paginação, padding do main. */
  reserved?: number;
}) {
  const ref = useRef<T>(null);
  const [pageSize, setPageSize] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      const el = ref.current;
      if (!el) return;
      const available = window.innerHeight - el.getBoundingClientRect().top - reserved;
      const rows = Math.max(1, Math.floor((available + gap) / (itemHeight + gap)));
      setPageSize(rows * countColumns(el));
    }

    measure();
    window.addEventListener("resize", measure);
    // Pega também deslocamentos do container por mudança de layout acima dele
    // (toolbar quebrando linha, breadcrumb crescendo).
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [itemHeight, gap, reserved]);

  return { ref, pageSize };
}

function countColumns(el: HTMLElement): number {
  const template = getComputedStyle(el).gridTemplateColumns;
  if (!template || template === "none") return 1;
  return template.split(" ").filter(Boolean).length;
}
