"use client";
import { create } from "zustand";

export interface Notification {
  id: string;
  type: "new_post" | "new_comment" | "reaction" | "event_reminder" | "level_up" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  wsConnected: boolean;

  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  setWsConnected: (connected: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  wsConnected: false,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  setWsConnected: (connected) => set({ wsConnected: connected }),
}));
