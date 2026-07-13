"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, LogOut, MessageSquare, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/auth-provider";
import { useProfile } from "@/lib/api/profile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const navItems = [
  { href: "/events", label: "Eventos", icon: CalendarDays },
  { href: "/messages", label: "Mensagens", icon: MessageSquare },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { resolvedTheme, setTheme } = useTheme();

  const displayName = profile?.name || session?.user.name || "";
  const displayEmail = profile?.email || session?.user.email || "";

  const initials =
    displayName
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    displayEmail?.[0]?.toUpperCase() ||
    "?";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="relative z-10 shrink-0 border-b border-border bg-cream-deep">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
          <Link href="/events" className="flex items-center" aria-label="Atlaz — início">
            <Image
              src="/logos/Atlaz.png"
              alt="Atlaz"
              width={96}
              height={96}
              priority
              className="h-8 w-8 rounded-md object-contain"
            />
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-brown-100",
                  pathname.startsWith(href)
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary"
                    : "text-brown-500",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={resolvedTheme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 rounded-full px-1 sm:pr-3">
                  <Avatar className="h-8 w-8">
                    {profile?.photoUrl && (
                      <AvatarImage src={profile.photoUrl} alt={displayName} />
                    )}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  {displayName && (
                    <span className="hidden max-w-[12rem] truncate text-sm font-medium sm:inline">
                      {displayName}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
