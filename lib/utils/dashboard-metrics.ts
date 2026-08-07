export function countByStatus<T extends string>(items: { status: T }[]): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const item of items) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }
  return counts;
}

export function upcomingEvents<T extends { eventDate: string | null }>(
  events: T[],
  now: Date = new Date(),
  limit = 5,
): T[] {
  return events
    .filter((e): e is T & { eventDate: string } => e.eventDate !== null)
    .filter((e) => new Date(e.eventDate).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, limit);
}
