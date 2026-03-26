"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Calendar, Users, BarChart2, ArrowLeft,
} from "lucide-react";
import { useRequireAdmin } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/courses", label: "Cursos", icon: BookOpen },
  { href: "/admin/events", label: "Eventos", icon: Calendar },
  { href: "/admin/members", label: "Membros", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useRequireAdmin();

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin top bar */}
      <div className="border-b bg-secondary text-secondary-foreground">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-display font-bold text-sm">L</span>
              </div>
              <span className="font-display font-bold text-base">Admin</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver comunidade
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
