/**
 * Pastas e itens dividem o mesmo limite de página: as pastas ocupam as
 * primeiras vagas e o que sobra é preenchido com itens. Com 8 pastas e página
 * de 12, a primeira página mostra 8 pastas + 4 itens.
 */
export function paginateFoldersAndItems<F, I>(
  folders: F[],
  items: I[],
  page: number,
  pageSize: number,
): { folders: F[]; items: I[]; total: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    folders: folders.slice(
      Math.min(start, folders.length),
      Math.min(end, folders.length),
    ),
    items: items.slice(
      Math.max(0, start - folders.length),
      Math.max(0, end - folders.length),
    ),
    total: folders.length + items.length,
  };
}
