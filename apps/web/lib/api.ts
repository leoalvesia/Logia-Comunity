import type {
  Post, PostCreate, PostUpdate, PostListResponse,
  Comment, CommentCreate,
  Course, CourseCreate, CourseUpdate, CourseListResponse,
  Module, ModuleCreate, ModuleUpdate,
  Lesson, LessonCreate, LessonUpdate, ProgressUpdate,
  Event, EventCreate, EventUpdate, EventListResponse,
  Profile, ProfileUpdate,
  AdminStats, LeaderboardEntry,
  TokenResponse,
} from "shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ── Token management ──────────────────────────────────────────────────────────
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("logia_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("logia_refresh_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("logia_access_token", access);
  localStorage.setItem("logia_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("logia_access_token");
  localStorage.removeItem("logia_refresh_token");
}

// ── Base fetch with auto-refresh ──────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    // Attempt token refresh
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }
    // Refresh failed — clear tokens and redirect to login
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorBody.detail ?? "Unknown error");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data: TokenResponse = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; username: string; full_name: string }) =>
    apiFetch<TokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiFetch<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: (refresh_token: string) =>
    apiFetch<void>("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),

  me: () => apiFetch<Profile>("/api/v1/auth/me"),

  googleAuth: (id_token: string) =>
    apiFetch<TokenResponse>("/api/v1/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token }),
    }),
};

// ── Posts ─────────────────────────────────────────────────────────────────────
export const postsApi = {
  list: (params: { category?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return apiFetch<PostListResponse>(`/api/v1/posts?${q.toString()}`);
  },

  get: (id: string) => apiFetch<Post>(`/api/v1/posts/${id}`),

  create: (data: PostCreate) =>
    apiFetch<Post>("/api/v1/posts", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: PostUpdate) =>
    apiFetch<Post>(`/api/v1/posts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/posts/${id}`, { method: "DELETE" }),

  pin: (id: string) =>
    apiFetch<{ is_pinned: boolean }>(`/api/v1/posts/${id}/pin`, { method: "POST" }),

  react: (id: string, emoji = "👍") =>
    apiFetch<{ liked: boolean; likes_count: number }>(`/api/v1/posts/${id}/react`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }),

  getComments: (postId: string) =>
    apiFetch<Comment[]>(`/api/v1/posts/${postId}/comments`),

  createComment: (postId: string, data: CommentCreate) =>
    apiFetch<Comment>(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteComment: (commentId: string) =>
    apiFetch<void>(`/api/v1/comments/${commentId}`, { method: "DELETE" }),
};

// ── Courses ───────────────────────────────────────────────────────────────────
export const coursesApi = {
  list: () => apiFetch<CourseListResponse>("/api/v1/courses"),

  get: (slug: string) => apiFetch<Course>(`/api/v1/courses/${slug}`),

  create: (data: CourseCreate) =>
    apiFetch<Course>("/api/v1/courses", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: CourseUpdate) =>
    apiFetch<Course>(`/api/v1/courses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/courses/${id}`, { method: "DELETE" }),

  createModule: (courseId: string, data: ModuleCreate) =>
    apiFetch<Module>(`/api/v1/courses/${courseId}/modules`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateModule: (courseId: string, moduleId: string, data: ModuleUpdate) =>
    apiFetch<Module>(`/api/v1/courses/${courseId}/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteModule: (courseId: string, moduleId: string) =>
    apiFetch<void>(`/api/v1/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" }),

  createLesson: (moduleId: string, data: LessonCreate) =>
    apiFetch<Lesson>(`/api/v1/modules/${moduleId}/lessons`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateLesson: (lessonId: string, data: LessonUpdate) =>
    apiFetch<Lesson>(`/api/v1/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteLesson: (lessonId: string) =>
    apiFetch<void>(`/api/v1/lessons/${lessonId}`, { method: "DELETE" }),

  getVideoUploadUrl: (
    lessonId: string,
    data: { filename: string; content_type: string; file_size: number },
  ) =>
    apiFetch<{ upload_url: string; lesson_id: string; bunny_video_id?: string; upload_headers?: Record<string, string> }>(
      `/api/v1/lessons/${lessonId}/video-upload`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  updateProgress: (lessonId: string, data: ProgressUpdate) =>
    apiFetch<{ watch_percent: number; last_position: number }>(
      `/api/v1/lessons/${lessonId}/progress`,
      { method: "PATCH", body: JSON.stringify(data) },
    ),

  completeLesson: (lessonId: string) =>
    apiFetch<{ completed: boolean }>(`/api/v1/lessons/${lessonId}/complete`, { method: "POST" }),
};

// ── Events ────────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: (params: { month?: number; year?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.month) q.set("month", String(params.month));
    if (params.year) q.set("year", String(params.year));
    return apiFetch<EventListResponse>(`/api/v1/events?${q.toString()}`);
  },

  get: (id: string) => apiFetch<Event>(`/api/v1/events/${id}`),

  create: (data: EventCreate) =>
    apiFetch<Event>("/api/v1/events", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: EventUpdate) =>
    apiFetch<Event>(`/api/v1/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/events/${id}`, { method: "DELETE" }),

  register: (id: string) =>
    apiFetch<{ registered: boolean }>(`/api/v1/events/${id}/register`, { method: "POST" }),

  unregister: (id: string) =>
    apiFetch<void>(`/api/v1/events/${id}/register`, { method: "DELETE" }),
};

// ── Members ───────────────────────────────────────────────────────────────────
export const membersApi = {
  list: (params: { page?: number; limit?: number; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    return apiFetch<Profile[]>(`/api/v1/members?${q.toString()}`);
  },

  get: (username: string) => apiFetch<Profile>(`/api/v1/members/${username}`),

  update: (id: string, data: ProfileUpdate) =>
    apiFetch<Profile>(`/api/v1/members/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getMap: () =>
    apiFetch<{
      type: "FeatureCollection";
      features: Array<{
        type: "Feature";
        geometry: { type: "Point"; coordinates: [number, number] };
        properties: {
          id: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          level: number;
          points: number;
        };
      }>;
    }>("/api/v1/members/map"),
};

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: (period: "7d" | "30d" | "all-time" = "all-time") =>
    apiFetch<LeaderboardEntry[]>(`/api/v1/leaderboard?period=${period}`),
  getMyRank: (period: "7d" | "30d" | "all-time" = "all-time") =>
    apiFetch<LeaderboardEntry & { rank: number | null }>(`/api/v1/leaderboard/me?period=${period}`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  checkout: () =>
    apiFetch<{ checkout_url: string }>("/api/v1/payments/checkout", { method: "POST" }),

  portal: () =>
    apiFetch<{ portal_url: string }>("/api/v1/payments/portal", { method: "POST" }),

  status: () =>
    apiFetch<{
      is_paid: boolean;
      subscription_status: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
    }>("/api/v1/payments/subscription/status"),
};

// ── Search ────────────────────────────────────────────────────────────────────
export interface SearchResult {
  query: string;
  posts: { id: string; title: string; author: string | null; created_at: string }[];
  courses: { id: string; slug: string; title: string; thumbnail_url: string | null }[];
  members: { id: string; username: string; full_name: string; avatar_url: string | null; level: number }[];
}

export const searchApi = {
  search: (q: string, limit = 5) =>
    apiFetch<SearchResult>(`/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => apiFetch<AdminStats>("/api/v1/admin/stats/overview"),

  listMembers: (params: { page?: number; search?: string; role?: string; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.search) q.set("search", params.search);
    if (params.role) q.set("role", params.role);
    if (params.status) q.set("status", params.status);
    return apiFetch<Profile[]>(`/api/v1/admin/members?${q.toString()}`);
  },

  updateRole: (memberId: string, role: string) =>
    apiFetch<{ id: string; role: string }>(`/api/v1/admin/members/${memberId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  banMember: (memberId: string, reason?: string) =>
    apiFetch<{ id: string; status: string }>(`/api/v1/admin/members/${memberId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
