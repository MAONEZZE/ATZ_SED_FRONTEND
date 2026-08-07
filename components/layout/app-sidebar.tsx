"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { collapsed, toggle, mounted } = useSidebarState();

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
        mounted && "transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarBrand collapsed={collapsed} />
      <div id="app-sidebar-nav" className="flex-1 overflow-y-auto py-2">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar-nav"
          className="flex w-full items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          <span className={cn(collapsed && "sr-only")}>Recolher menu</span>
        </button>
      </div>
    </aside>
  );
}
