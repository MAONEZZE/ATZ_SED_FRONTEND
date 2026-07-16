import Image from "next/image";

export function EventCoverHero({
  coverUrl,
  title,
}: {
  coverUrl: string | null | undefined;
  title: string;
}) {
  if (!coverUrl) return null;

  return (
    <div className="relative h-64 w-full sm:h-80 md:h-96">
      <Image src={coverUrl} alt={title} fill className="object-cover" priority sizes="100vw" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/60 to-transparent" />
    </div>
  );
}
