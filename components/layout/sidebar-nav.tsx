"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, Settings, ChartLine, ScrollText, EthernetPort } from "lucide-react";
import { isActive } from "@/lib/utils/nav";
import { cn } from "@/lib/utils";
import { FaDochub } from "react-icons/fa";

type NavItem = {
  href?: string;
  label: string;
  icon?: typeof Settings;
  children?: NavItem[];
};

export const sidebarNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // { href: "/events", label: "Eventos", icon: CalendarDays },
  // { href: "/messages", label: "Mensagens", icon: MessageSquare },
  { href: "/", label: "Administração", icon: ChartLine },
  { href: "/", label: "Juridico", icon: ScrollText },
  {
    label: "Comunicação",
    icon: EthernetPort,
    children: [
      {
        label: "Externo",
        children: [
          { href: "/", label: "Treinamentos" },
          { href: "/events", label: "Eventos" },
          { href: "/", label: "Workshop" },
          { href: "/messages", label: "Mensagens" }
        ],
      },
      { 
        href: "/", 
        label: "Interno",
        children: [
          { href: "/", label: "Treinamentos" },
          { href: "/", label: "Galeria" },
          { href: "/", label: "AI Chat" },
          { href: "/", label: "Wiki (Docs)" }
        ],
      },
    ],
  },
];

function NavItemRow({
  item,
  path,
  depth,
  collapsed,
  expandedPaths,
  onToggle,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  path: string;
  depth: number;
  collapsed: boolean;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { href, label, icon: Icon, children } = item;
  const active = isActive(pathname, href || "#");
  const hasChildren = !!children && children.length > 0;

  if (hasChildren && !collapsed) {
    const isOpen = expandedPaths.has(path);
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onToggle(path)}
          aria-expanded={isOpen}
          className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")}
          />
        </button>
        {isOpen && (
          <div className="ml-6 flex flex-col gap-1 border-l border-sidebar-foreground/20 pl-3">
            {children.map((child) => (
              <NavItemRow
                key={child.label}
                item={child}
                path={`${path}>${child.label}`}
                depth={depth + 1}
                collapsed={collapsed}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href || "#"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed && depth === 0 && "justify-center px-2",
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className={cn(collapsed && depth === 0 && "sr-only")}>{label}</span>
    </Link>
  );
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const toggle = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-2 px-5  mt-5">
      {sidebarNavItems.map((item) => (
        <NavItemRow
          key={item.label}
          item={item}
          path={item.label}
          depth={0}
          collapsed={collapsed}
          expandedPaths={expandedPaths}
          onToggle={toggle}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
