import { arrayMove } from "@dnd-kit/sortable";

export function beforeIdAfterMove(
  ids: string[],
  activeId: string,
  overId: string,
): string | undefined {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0) return undefined;
  return arrayMove(ids, from, to)[to + 1];
}
