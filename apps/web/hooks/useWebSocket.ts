"use client";
import { useEffect, useRef, useCallback } from "react";
import { useNotificationsStore } from "../stores/notifications";
import { useGamificationStore, ACTION_LABELS } from "../stores/gamification";
import { useAuthStore } from "../stores/auth";
import { getStoredToken } from "../lib/auth";
import { levelColor, levelName } from "../lib/utils";
import type { Notification } from "../stores/notifications";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const { addNotification, setWsConnected } = useNotificationsStore();
  const { triggerLevelUp, addPointsToast } = useGamificationStore();
  const { user, setUser } = useAuthStore();

  const connect = useCallback(() => {
    const token = getStoredToken();
    if (!token) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ token }));
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);

        if (data.type === "connected") {
          setWsConnected(true);
          return;
        }

        if (data.type === "ping") {
          ws.send("ping");
          return;
        }

        const eventType = data.event as string;

        // ── Gamification events (handled separately from bell notifications) ──

        if (eventType === "level_up") {
          const newLevel = data.new_level as number;
          const prevLevel = data.previous_level as number ?? (newLevel - 1);
          triggerLevelUp({
            previousLevel: prevLevel,
            newLevel,
            levelName: levelName(newLevel),
            levelColor: levelColor(newLevel),
            benefit: (data.unlock_benefit as string) ?? "Benefício exclusivo desbloqueado",
          });
          // Also update local user state so avatar badge updates immediately
          if (user) {
            setUser({ ...user, level: newLevel });
          }
        }

        if (eventType === "points_earned") {
          const points = data.points as number;
          const action = data.action as string;
          const label = ACTION_LABELS[action] ?? action;
          addPointsToast(points, label);
          // Keep local points count in sync
          if (user) {
            const totalPoints = (data.total_points as number) ?? (user.points + points);
            setUser({ ...user, points: totalPoints });
          }
        }

        // ── Bell notifications ──
        const notification = transformToNotification(data);
        if (notification) {
          addNotification(notification);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;

      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
      reconnectAttemptsRef.current++;

      reconnectTimerRef.current = setTimeout(() => {
        if (getStoredToken()) connect();
      }, delay);
    };

    ws.onerror = () => { ws.close(); };
  }, [addNotification, setWsConnected, triggerLevelUp, addPointsToast, user, setUser]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send("ping");
    }
  }, []);

  return { sendPing };
}

function transformToNotification(data: Record<string, unknown>): Notification | null {
  const eventType = data.event as string;

  const notifMap: Record<string, Partial<Notification>> = {
    new_post: {
      type: "new_post",
      title: "Nova publicação",
      message: "Há uma nova publicação no feed",
      actionUrl: `/posts/${data.post_id}`,
    },
    new_comment: {
      type: "new_comment",
      title: "Novo comentário",
      message: "Alguém comentou na sua publicação",
      actionUrl: `/posts/${data.post_id}`,
    },
    level_up: {
      type: "level_up",
      title: "🎉 Você subiu de nível!",
      message: `Parabéns! Você chegou ao nível ${data.new_level} — ${levelName(data.new_level as number)}`,
    },
    event_reminder: {
      type: "event_reminder",
      title: "Lembrete de evento",
      message: `${data.event_title} começa em breve`,
      actionUrl: `/calendar`,
    },
  };

  const template = notifMap[eventType];
  if (!template) return null;

  return {
    id: `${eventType}_${Date.now()}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...template,
  } as Notification;
}
