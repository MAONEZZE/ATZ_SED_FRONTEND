import type { EventObject } from "@/lib/api/types";

type EventPermissionFields = Pick<EventObject, "myRole" | "ownerId">;

export function canWrite(event: EventPermissionFields): boolean {
  return event.myRole !== "read";
}

export function canManage(
  event: EventPermissionFields,
  profileId: string | undefined,
): boolean {
  return event.myRole === "admin" || event.ownerId === profileId;
}

export function canOrganize(
  event: Pick<EventObject, "ownerId">,
  profileId: string | undefined,
): boolean {
  return event.ownerId === profileId;
}
