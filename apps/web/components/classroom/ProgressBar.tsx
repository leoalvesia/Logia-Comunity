"use client";

import React from "react";
import { CheckCircle, Circle, PlayCircle } from "lucide-react";
import { Progress } from "../ui/progress";
import type { Course, Lesson } from "shared-types";

interface ProgressBarProps {
  course: Course;
  compact?: boolean;
}

export function CourseProgressBar({ course, compact = false }: ProgressBarProps) {
  const progress =
    course.total_lessons > 0
      ? Math.round((course.completed_lessons / course.total_lessons) * 100)
      : 0;

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{course.completed_lessons}/{course.total_lessons} aulas</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Seu progresso</span>
        <span className="text-2xl font-bold text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="h-3" />
      <p className="text-sm text-muted-foreground">
        {course.completed_lessons} de {course.total_lessons} aulas concluídas
      </p>
    </div>
  );
}

interface LessonProgressItemProps {
  lesson: Lesson;
  isActive?: boolean;
  onClick?: () => void;
}

export function LessonProgressItem({ lesson, isActive, onClick }: LessonProgressItemProps) {
  const completed = lesson.progress?.completed;
  const inProgress =
    !completed && lesson.progress && lesson.progress.watch_percent > 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/60 ${
        isActive ? "bg-primary/10 text-primary" : ""
      }`}
    >
      {completed ? (
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
      ) : inProgress ? (
        <PlayCircle className="h-5 w-5 text-primary shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : ""}`}>
          {lesson.title}
        </p>
        {inProgress && (
          <Progress
            value={lesson.progress?.watch_percent ?? 0}
            className="h-1 mt-1"
          />
        )}
      </div>

      {lesson.video_duration && (
        <span className="text-xs text-muted-foreground shrink-0">
          {Math.floor(lesson.video_duration / 60)}:{String(lesson.video_duration % 60).padStart(2, "0")}
        </span>
      )}
    </button>
  );
}
