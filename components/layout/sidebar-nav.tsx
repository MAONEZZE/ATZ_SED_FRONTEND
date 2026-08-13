"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, BookText, CalendarDays, LayoutDashboard, MessageSquare, Settings } from "lucide-react";
import { isActive } from "@/lib/utils/nav";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Settings;
};

export const sidebarNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/ai-chat", label: "AI Chat", icon: Bot },
  { href: "/s-docs", label: "S-Docs", icon: BookText },
];

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-2 px-5  mt-5">
      {sidebarNavItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
