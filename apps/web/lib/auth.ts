import { authApi, setTokens, clearTokens } from "./api";
import type { Profile } from "shared-types";

export async function loginUser(email: string, password: string): Promise<Profile> {
  const tokens = await authApi.login({ email, password });
  setTokens(tokens.access_token, tokens.refresh_token);
  const me = await authApi.me();
  return me;
}

export async function registerUser(data: {
  email: string;
  password: string;
  username: string;
  full_name: string;
}): Promise<Profile> {
  const tokens = await authApi.register(data);
  setTokens(tokens.access_token, tokens.refresh_token);
  const me = await authApi.me();
  return me;
}

export async function logoutUser(): Promise<void> {
  const refreshToken = typeof window !== "undefined"
    ? localStorage.getItem("logia_refresh_token") ?? ""
    : "";
  try {
    if (refreshToken) await authApi.logout(refreshToken);
  } finally {
    clearTokens();
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("logia_access_token");
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("logia_access_token");
}
