"use client";
import { create } from "zustand";

export interface LevelUpEvent {
  previousLevel: number;
  newLevel: number;
  levelName: string;
  levelColor: string;
  benefit: string;
}

export interface PointsToastItem {
  id: string;
  points: number;
  action: string;
  isMilestone: boolean; // >= 50 pts in one action
}

interface GamificationState {
  levelUpEvent: LevelUpEvent | null;
  pointsToasts: PointsToastItem[];

  triggerLevelUp: (event: LevelUpEvent) => void;
  dismissLevelUp: () => void;
  addPointsToast: (points: number, action: string) => void;
  removePointsToast: (id: string) => void;
}

export const useGamificationStore = create<GamificationState>()((set) => ({
  levelUpEvent: null,
  pointsToasts: [],

  triggerLevelUp: (event) => set({ levelUpEvent: event }),

  dismissLevelUp: () => set({ levelUpEvent: null }),

  addPointsToast: (points, action) => {
    const id = `pts_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      // cap at 4 visible toasts
      pointsToasts: [...state.pointsToasts, {
        id,
        points,
        action,
        isMilestone: points >= 50,
      }].slice(-4),
    }));
  },

  removePointsToast: (id) =>
    set((state) => ({
      pointsToasts: state.pointsToasts.filter((t) => t.id !== id),
    })),
}));

// Human-readable action labels (matches backend action strings)
export const ACTION_LABELS: Record<string, string> = {
  post_created: "Post publicado",
  comment_made: "Comentário",
  like_received_on_post: "Curtida recebida",
  lesson_completed: "Aula concluída",
  event_attended: "Evento participado",
  daily_login: "Login diário",
};
