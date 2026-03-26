import { describe, it, expect } from "vitest";
import {
  cn,
  formatDuration,
  truncate,
  getInitials,
  slugify,
  levelName,
  levelColor,
  levelPointsRequired,
  levelProgress,
  pointsToNextLevel,
  extractYoutubeId,
  extractVimeoId,
} from "./utils";

// ── cn (classnames merge) ─────────────────────────────────────────────────────

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "excluded", "included")).toBe("base included");
  });
});

// ── formatDuration ────────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1:30");
  });

  it("formats hours", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("pads seconds with zero", () => {
    expect(formatDuration(65)).toBe("1:05");
  });
});

// ── truncate ─────────────────────────────────────────────────────────────────

describe("truncate", () => {
  it("returns string unchanged if short enough", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings with ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("handles exact max length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

// ── getInitials ───────────────────────────────────────────────────────────────

describe("getInitials", () => {
  it("gets first two words' initials", () => {
    expect(getInitials("João Silva")).toBe("JS");
  });

  it("handles single name", () => {
    expect(getInitials("Maria")).toBe("M");
  });

  it("uppercases initials", () => {
    expect(getInitials("carlos alberto")).toBe("CA");
  });

  it("ignores extra words", () => {
    expect(getInitials("Ana Paula Costa")).toBe("AP");
  });
});

// ── slugify ───────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes accents", () => {
    expect(slugify("Automação com IA")).toBe("automacao-com-ia");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! World?")).toBe("hello-world");
  });

  it("collapses multiple spaces/dashes", () => {
    expect(slugify("foo   bar")).toBe("foo-bar");
  });
});

// ── Level system ──────────────────────────────────────────────────────────────

describe("levelName", () => {
  it("returns correct name for each level", () => {
    expect(levelName(1)).toBe("Iniciante");
    expect(levelName(5)).toBe("Mestre");
    expect(levelName(9)).toBe("Ícone");
  });

  it("falls back to Iniciante for unknown level", () => {
    expect(levelName(99)).toBe("Iniciante");
  });
});

describe("levelColor", () => {
  it("returns a hex color string", () => {
    const color = levelColor(1);
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("returns different colors per level", () => {
    expect(levelColor(1)).not.toBe(levelColor(9));
  });
});

describe("levelPointsRequired", () => {
  it("level 1 requires 0 points", () => {
    expect(levelPointsRequired(1)).toBe(0);
  });

  it("higher levels require more points", () => {
    expect(levelPointsRequired(5)).toBeGreaterThan(levelPointsRequired(3));
  });
});

describe("levelProgress", () => {
  it("returns 0 at level threshold", () => {
    expect(levelProgress(0, 1)).toBe(0);
  });

  it("returns 100 for max level", () => {
    expect(levelProgress(9999, 9)).toBe(100);
  });

  it("calculates partial progress correctly", () => {
    // Level 2 starts at 50, level 3 at 150 → range 100. At 100 pts → 50%
    const progress = levelProgress(100, 2);
    expect(progress).toBe(50);
  });

  it("clamps to 0-100", () => {
    expect(levelProgress(-100, 1)).toBe(0);
    expect(levelProgress(99999, 8)).toBe(100);
  });
});

describe("pointsToNextLevel", () => {
  it("returns difference to next level", () => {
    // Level 2 requires 50 pts. At 0 pts → 50 remaining
    expect(pointsToNextLevel(0, 1)).toBe(50);
  });

  it("returns null at max level", () => {
    expect(pointsToNextLevel(9999, 9)).toBeNull();
  });

  it("returns 0 when already at threshold", () => {
    // Level 3 requires 150. At 200 pts with level 2: next is 150 - 200 = max(0,...)
    expect(pointsToNextLevel(200, 2)).toBe(0);
  });
});

// ── Video ID extraction ───────────────────────────────────────────────────────

describe("extractYoutubeId", () => {
  it("extracts from youtu.be short link", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from full watch URL", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from embed URL", () => {
    expect(extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from shorts URL", () => {
    expect(extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(extractYoutubeId("https://vimeo.com/123456789")).toBeNull();
  });

  it("returns null for random string", () => {
    expect(extractYoutubeId("not a url")).toBeNull();
  });
});

describe("extractVimeoId", () => {
  it("extracts from vimeo.com URL", () => {
    expect(extractVimeoId("https://vimeo.com/123456789")).toBe("123456789");
  });

  it("extracts from player.vimeo.com URL", () => {
    expect(extractVimeoId("https://player.vimeo.com/video/123456789")).toBe("123456789");
  });

  it("returns null for YouTube URLs", () => {
    expect(extractVimeoId("https://youtu.be/dQw4w9WgXcQ")).toBeNull();
  });
});
