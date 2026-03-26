// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  level: number;
  points: number;
  role: "member" | "admin" | "moderator";
  status: "active" | "inactive" | "banned";
  joined_at: string; // ISO 8601
  last_seen_at?: string | null;
  is_paid: boolean;
  email?: string | null;
  stripe_customer_id?: string | null;
}

export interface ProfileUpdate {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  location_lat?: number;
  location_lng?: number;
}

// ── Category ──────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
}

// ── Post ──────────────────────────────────────────────────────────────────────
export interface Post {
  id: string;
  title?: string | null;
  body: string;
  media_urls?: unknown;
  is_pinned: boolean;
  pin_order?: number | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
  category?: Category | null;
  user_has_liked: boolean;
}

export interface PostCreate {
  title?: string;
  body: string;
  category_id?: number;
  media_urls?: unknown;
}

export interface PostUpdate {
  title?: string;
  body?: string;
  category_id?: number;
  media_urls?: unknown;
}

export interface PostListResponse {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}

// ── Comment ───────────────────────────────────────────────────────────────────
export interface Comment {
  id: string;
  post_id: string;
  body: string;
  likes_count: number;
  created_at: string;
  parent_id?: string | null;
  author?: Profile | null;
  replies?: Comment[];
}

export interface CommentCreate {
  body: string;
  parent_id?: string;
}

// ── Course ────────────────────────────────────────────────────────────────────
export interface LessonProgress {
  lesson_id: string;
  watch_percent: number;
  completed: boolean;
  completed_at?: string | null;
  last_position: number;
}

export interface LessonAttachment {
  name: string;
  url: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  video_provider?: "bunny" | "vimeo" | "youtube" | null;
  video_bunny_id?: string | null;
  video_duration?: number | null;
  video_thumbnail?: string | null;
  attachments?: LessonAttachment[] | null;
  order_index: number;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  progress?: LessonProgress | null;
}

export interface LessonCreate {
  title: string;
  description?: string;
  order_index: number;
  status?: "draft" | "published";
  video_provider?: "bunny" | "vimeo" | "youtube";
}

export interface LessonUpdate {
  title?: string;
  description?: string;
  order_index?: number;
  status?: "draft" | "published";
  video_url?: string;
  video_provider?: "bunny" | "vimeo" | "youtube";
  video_bunny_id?: string;
  video_duration?: number;
  video_thumbnail?: string;
  attachments?: LessonAttachment[] | null;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  is_published: boolean;
  lessons: Lesson[];
}

export interface ModuleCreate {
  title: string;
  order_index: number;
  is_published?: boolean;
}

export interface ModuleUpdate {
  title?: string;
  order_index?: number;
  is_published?: boolean;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
  level?: string | null;
  estimated_hours?: number | null;
  is_free: boolean;
  status: "draft" | "published" | "archived";
  order_index: number;
  created_at: string;
  updated_at: string;
  modules: Module[];
  total_lessons: number;
  completed_lessons: number;
}

export interface CourseCreate {
  title: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  level?: string;
  estimated_hours?: number;
  is_free?: boolean;
  slug?: string;
}

export interface CourseUpdate {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  level?: string;
  status?: "draft" | "published" | "archived";
  estimated_hours?: number;
  is_free?: boolean;
  order_index?: number;
}

export interface CourseListResponse {
  items: Course[];
  total: number;
}

export interface ProgressUpdate {
  watch_percent: number;
  last_position: number;
}

// ── Event ─────────────────────────────────────────────────────────────────────
export interface Event {
  id: string;
  title: string;
  description?: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  meeting_url?: string | null;
  max_attendees?: number | null;
  status: "scheduled" | "cancelled" | "completed";
  is_recurring: boolean;
  recurrence_rule?: unknown;
  created_at: string;
  creator?: Profile | null;
  attendee_count: number;
  is_registered: boolean;
}

export interface EventCreate {
  title: string;
  description?: string;
  event_type: string;
  starts_at: string; // ISO 8601
  ends_at: string;
  timezone?: string;
  meeting_url?: string;
  max_attendees?: number;
}

export interface EventUpdate {
  title?: string;
  description?: string;
  event_type?: string;
  starts_at?: string;
  ends_at?: string;
  timezone?: string;
  meeting_url?: string;
  max_attendees?: number;
  status?: "scheduled" | "cancelled" | "completed";
}

export interface EventListResponse {
  items: Event[];
  total: number;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export interface LeaderboardEntry extends Profile {
  period_points: number;
  rank: number;
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface AdminStats {
  total_members: number;
  active_members_7d: number;
  total_courses: number;
  total_lessons: number;
  total_posts: number;
  total_events: number;
  paid_members: number;
  new_members_30d: number;
}
