import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .trim();
}

// 9-level system matching the DB levels table
const LEVELS = [
  { level: 1, name: "Iniciante",    color: "#9CA3AF", points: 0    },
  { level: 2, name: "Aprendiz",     color: "#60A5FA", points: 50   },
  { level: 3, name: "Praticante",   color: "#34D399", points: 150  },
  { level: 4, name: "Especialista", color: "#A78BFA", points: 350  },
  { level: 5, name: "Mestre",       color: "#FBBF24", points: 700  },
  { level: 6, name: "Campeão",      color: "#FF6B2B", points: 1200 },
  { level: 7, name: "Elite",        color: "#EF4444", points: 2000 },
  { level: 8, name: "Lendário",     color: "#EC4899", points: 3500 },
  { level: 9, name: "Ícone",        color: "#7C3AED", points: 5000 },
];

export function levelColor(level: number): string {
  return LEVELS.find((l) => l.level === level)?.color ?? "#9CA3AF";
}

export function levelName(level: number): string {
  return LEVELS.find((l) => l.level === level)?.name ?? "Iniciante";
}

export function levelPointsRequired(level: number): number {
  return LEVELS.find((l) => l.level === level)?.points ?? 0;
}

export function pointsToNextLevel(currentPoints: number, currentLevel: number): number | null {
  const next = LEVELS.find((l) => l.level === currentLevel + 1);
  if (!next) return null;
  return Math.max(0, next.points - currentPoints);
}

export function levelProgress(currentPoints: number, currentLevel: number): number {
  const current = LEVELS.find((l) => l.level === currentLevel);
  const next = LEVELS.find((l) => l.level === currentLevel + 1);
  if (!current || !next) return 100;
  const range = next.points - current.points;
  const earned = currentPoints - current.points;
  return Math.min(100, Math.max(0, Math.round((earned / range) * 100)));
}

// ── Video ID extraction ────────────────────────────────────────────────────────

export function extractVimeoId(url: string): string | null {
  const patterns = [
    /player\.vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:watch\?v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}
