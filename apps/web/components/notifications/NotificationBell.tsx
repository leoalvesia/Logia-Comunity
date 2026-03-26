"use client";

import React from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  MessageCircle,
  Heart,
  Calendar,
  Trophy,
  Info,
  CheckCheck,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "../ui/button";
import { useNotificationsStore, type Notification } from "../../stores/notifications";
import { formatRelativeTime } from "../../lib/utils";
import { cn } from "../../lib/utils";

// Icon per notification type
const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: React.ElementType; color: string; bg: string }
> = {
  new_post:       { icon: MessageCircle, color: "text-blue-600",   bg: "bg-blue-50" },
  new_comment:    { icon: MessageCircle, color: "text-indigo-600", bg: "bg-indigo-50" },
  reaction:       { icon: Heart,         color: "text-pink-600",   bg: "bg-pink-50" },
  event_reminder: { icon: Calendar,      color: "text-green-600",  bg: "bg-green-50" },
  level_up:       { icon: Trophy,        color: "text-yellow-600", bg: "bg-yellow-50" },
  system:         { icon: Info,          color: "text-gray-600",   bg: "bg-gray-100" },
};

function NotificationItem({ notification }: { notification: Notification }) {
  const { markAsRead } = useNotificationsStore();
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
  const Icon = config.icon;

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
        notification.read
          ? "hover:bg-muted/40"
          : "bg-primary/5 hover:bg-primary/8",
      )}
      onClick={() => markAsRead(notification.id)}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0", config.bg)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", !notification.read && "font-semibold")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

interface NotificationBellProps {
  /** Size variant — compact for mobile top-bar, default for sidebar */
  size?: "sm" | "md";
}

export function NotificationBell({ size = "md" }: NotificationBellProps) {
  const { notifications, unreadCount, markAllAsRead, clearAll, wsConnected } =
    useNotificationsStore();
  const [open, setOpen] = React.useState(false);

  // Mark all read when the panel opens
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center rounded-lg transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            size === "sm" ? "h-8 w-8" : "h-9 w-9",
          )}
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
        >
          <Bell className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />

          {/* Unread badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Live pulse when a new notification arrives */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="pulse"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive/40 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-[360px] max-h-[520px] flex flex-col rounded-xl border bg-surface shadow-2xl outline-none"
          style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}
        >
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Notificações</h3>
                {/* WS connection indicator */}
                {wsConnected ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                    <Wifi className="h-3 w-3" />
                    ao vivo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <WifiOff className="h-3 w-3" />
                    offline
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Marcar lidas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {notifications.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 px-4 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Bell className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Sem notificações
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Você está em dia com tudo!
                    </p>
                  </motion.div>
                ) : (
                  notifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.18, delay: idx < 5 ? idx * 0.04 : 0 }}
                    >
                      <NotificationItem notification={notif} />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
