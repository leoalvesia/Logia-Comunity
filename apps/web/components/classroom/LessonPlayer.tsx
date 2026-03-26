"use client";

import React, { useCallback } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useCompleteLesson } from "../../hooks/useCourses";
import type { Lesson } from "shared-types";

interface LessonPlayerProps {
  lesson: Lesson;
  courseSlug: string;
  onComplete?: () => void;
}

// ── Vimeo iframe ──────────────────────────────────────────────────────────────

function VimeoPlayer({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="aspect-video w-full">
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0`}
        className="w-full h-full rounded-xl"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={title}
      />
    </div>
  );
}

// ── YouTube iframe ────────────────────────────────────────────────────────────

function YoutubePlayer({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="aspect-video w-full">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        className="w-full h-full rounded-xl"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={title}
      />
    </div>
  );
}

// ── No video placeholder ──────────────────────────────────────────────────────

function NoVideoPlaceholder() {
  return (
    <div className="aspect-video bg-secondary/10 rounded-xl flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p className="text-lg font-medium">Vídeo não disponível</p>
        <p className="text-sm mt-1">O vídeo desta aula ainda não foi configurado.</p>
      </div>
    </div>
  );
}

// ── Main LessonPlayer ─────────────────────────────────────────────────────────

export function LessonPlayer({ lesson, courseSlug, onComplete }: LessonPlayerProps) {
  const completeLesson = useCompleteLesson();
  const isAlreadyCompleted = lesson.progress?.completed ?? false;
  const provider = lesson.video_provider ?? "youtube";

  const handleComplete = useCallback(async () => {
    if (isAlreadyCompleted) return;
    await completeLesson.mutateAsync(lesson.id);
    onComplete?.();
  }, [lesson.id, isAlreadyCompleted, completeLesson, onComplete]);

  return (
    <div className="space-y-4">
      {/* Video area */}
      {provider === "vimeo" && lesson.video_url ? (
        <VimeoPlayer videoId={lesson.video_url} title={lesson.title} />
      ) : provider === "youtube" && lesson.video_url ? (
        <YoutubePlayer videoId={lesson.video_url} title={lesson.title} />
      ) : (
        <NoVideoPlaceholder />
      )}

      {/* Title, description, complete button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold">{lesson.title}</h1>
          {lesson.description && (
            <p className="text-muted-foreground text-sm mt-1">{lesson.description}</p>
          )}
        </div>

        <Button
          onClick={handleComplete}
          disabled={isAlreadyCompleted || completeLesson.isPending}
          variant={isAlreadyCompleted ? "secondary" : "default"}
          className="gap-2 shrink-0"
        >
          <CheckCircle className={`h-4 w-4 ${isAlreadyCompleted ? "text-green-500" : ""}`} />
          {isAlreadyCompleted ? "Concluída" : "Marcar como concluída"}
        </Button>
      </div>

      {/* Attachments */}
      {lesson.attachments && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2">Materiais complementares</h3>
          <ul className="space-y-1">
            {(lesson.attachments as Array<{ name: string; url: string }>).map((att, idx) => (
              <li key={idx}>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  {att.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
