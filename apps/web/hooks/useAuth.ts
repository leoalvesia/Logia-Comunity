"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth";
import { isAuthenticated } from "../lib/auth";

export function useAuth() {
  const { user, isLoading, isInitialized, login, register, logout, refresh } = useAuthStore();

  useEffect(() => {
    if (!isInitialized && isAuthenticated()) {
      refresh();
    }
  }, [isInitialized, refresh]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isModerator: user?.role === "moderator" || user?.role === "admin",
    login,
    register,
    logout,
  };
}

export function useRequireAuth(redirectTo = "/login") {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !user && !isLoading) {
      router.replace(redirectTo);
    }
  }, [isInitialized, user, isLoading, router, redirectTo]);

  return { user, isLoading };
}

export function useRequireAdmin() {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "admin") {
        router.replace("/");
      }
    }
  }, [isInitialized, user, isLoading, router]);

  return { user, isLoading };
}
