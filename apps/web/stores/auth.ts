"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "shared-types";
import { loginUser, registerUser, logoutUser } from "../lib/auth";
import { authApi } from "../lib/api";

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    full_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: Profile | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const user = await loginUser(email, password);
          set({ user, isLoading: false, isInitialized: true });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const user = await registerUser(data);
          set({ user, isLoading: false, isInitialized: true });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await logoutUser();
        } finally {
          set({ user: null, isLoading: false, isInitialized: true });
        }
      },

      refresh: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, isLoading: false, isInitialized: true });
        } catch {
          set({ user: null, isLoading: false, isInitialized: true });
        }
      },

      setUser: (user) => set({ user, isInitialized: true }),
    }),
    {
      name: "logia-auth",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
