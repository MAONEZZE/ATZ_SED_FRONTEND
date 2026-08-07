"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function SidebarBrand({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-14 items-end gap-2 px-4 pb-2">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-end gap-2 overflow-hidden"
        aria-label="Keep the Cadence — início"
      >
        <img
          src="/logos/reduzido/logo-verde.svg"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
        />
        <span
          className={cn(
            "truncate text-[10px] font-medium leading-none text-sidebar-foreground/70",
            collapsed && "sr-only",
          )}
        >
          [ Keep the Cadence ]
        </span>
      </Link>
    </div>
  );
}
