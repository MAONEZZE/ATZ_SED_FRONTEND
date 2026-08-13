"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function FolderGroup({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-sm text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        {open ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
        <span>{title}</span>
        {count != null && <span className="text-muted-foreground">({count})</span>}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && children}
    </div>
  );
}
