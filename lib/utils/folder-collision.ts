import { closestCenter, pointerWithin, type CollisionDetection } from "@dnd-kit/core";

const CONTENT_PREFIX = "folder-content:";

/**
 * O miolo da pasta (`folder-content:`, o alvo de "soltar dentro") só vence
 * quando o ponteiro está mesmo em cima dele; no resto da linha/card vale a
 * proximidade, que é o alvo de reordenação. Com `closestCenter` puro o miolo
 * fica no centro do alvo e ganhava sempre — por isso não dava para reordenar
 * pastas, só aninhá-las.
 */
export const folderAwareCollision: CollisionDetection = (args) => {
  const inside = pointerWithin(args).filter((collision) =>
    String(collision.id).startsWith(CONTENT_PREFIX),
  );
  if (inside.length > 0) return inside;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => !String(container.id).startsWith(CONTENT_PREFIX),
    ),
  });
};
