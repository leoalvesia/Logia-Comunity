"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, BookOpen, Calendar, Users, Trophy, Settings,
  LogOut, Menu, X, AlertTriangle, Loader2
} from "lucide-react";
import { NotificationBell } from "../../components/notifications/NotificationBell";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../stores/auth";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useSubscription } from "../../hooks/useSubscription";
import { paymentsApi } from "../../lib/api";
import { cn, levelName, levelColor } from "../../lib/utils";
import LevelUpCelebration from "../../components/gamification/LevelUpCelebration";
import PointsToastStack from "../../components/gamification/PointsToast";
import { SearchBar } from "../../components/search/SearchBar";

const navItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/classroom", label: "Cursos", icon: BookOpen },
  { href: "/calendar", label: "Calendário", icon: Calendar },
  { href: "/members", label: "Membros", icon: Users },
  { href: "/leaderboard", label: "Ranking", icon: Trophy },
];

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isInitialized, refresh } = useAuthStore();
  const { isPastDue } = useSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [portalRedirecting, setPortalRedirecting] = React.useState(false);

  const handleOpenPortal = async () => {
    setPortalRedirecting(true);
    try {
      const { portal_url } = await paymentsApi.portal();
      window.location.href = portal_url;
    } catch {
      setPortalRedirecting(false);
    }
  };

  useWebSocket();

  useEffect(() => {
    if (!isInitialized) {
      refresh();
    }
  }, [isInitialized, refresh]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-white font-display font-bold text-sm">L</span>
          </div>
          <span className="font-display font-bold text-base text-secondary">
            Logia Business
          </span>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {user.role === "admin" && (
            <>
              <div className="px-3 pt-4 pb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              </div>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                Painel Admin
              </Link>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Conta
            </p>
            <NotificationBell size="sm" />
          </div>
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
            <Avatar src={user.avatar_url} name={user.full_name} size="sm" level={user.level} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              <p
                className="text-xs font-medium"
                style={{ color: levelColor(user.level) }}
              >
                {levelName(user.level)} · {user.points} pts
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-surface border-b flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">L</span>
          </div>
          <span className="font-display font-semibold text-secondary">Logia</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-14 bottom-0 w-64 bg-surface border-l flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SearchBar />
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        {/* Past-due payment banner */}
        {isPastDue && (
          <div className="sticky top-0 z-20 w-full bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
              <span>
                Seu pagamento está pendente. Atualize seu método de pagamento
                para continuar com acesso.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-yellow-400 text-yellow-800 hover:bg-yellow-100 gap-1.5"
              onClick={handleOpenPortal}
              disabled={portalRedirecting}
            >
              {portalRedirecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              Atualizar agora
            </Button>
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
      </main>

      {/* Gamification overlays — mounted once at layout level */}
      <LevelUpCelebration />
      <PointsToastStack />
    </div>
  );
}
