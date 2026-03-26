"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCourse } from "../../../../../hooks/useCourses";
import { LessonPlayer } from "../../../../../components/classroom/LessonPlayer";
import { LessonProgressItem } from "../../../../../components/classroom/ProgressBar";
import { CourseProgressBar } from "../../../../../components/classroom/ProgressBar";
import { Button } from "../../../../../components/ui/button";
import { PaywallGate } from "../../../../../components/paywall/PaywallGate";
import { useAuthStore } from "../../../../../stores/auth";
import type { Lesson, Module } from "shared-types";

export default function LessonPage() {
  const params = useParams();
  const slug = params.slug as string;
  const lessonId = params.lessonId as string;
  const router = useRouter();

  const { user } = useAuthStore();
  const { data: course, isLoading } = useCourse(slug);

  const currentLesson = React.useMemo(() => {
    if (!course) return null;
    for (const mod of course.modules) {
      const found = mod.lessons.find((l) => l.id === lessonId);
      if (found) return found;
    }
    return null;
  }, [course, lessonId]);

  const allLessons = React.useMemo(() => {
    if (!course) return [];
    return course.modules.flatMap((m) => m.lessons);
  }, [course]);

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const nextLesson = currentIndex >= 0 ? allLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;

  // Determine paywall state:
  // A course is locked when it is NOT free AND the user does NOT have is_paid=true.
  const isLocked = course ? (!course.is_free && !(user?.is_paid ?? false)) : false;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aula não encontrada.</p>
        <Link href={`/classroom/${slug}`}>
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao curso
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/classroom" className="hover:text-primary">
          Cursos
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/classroom/${slug}`} className="hover:text-primary truncate max-w-[140px]">
          {course.title}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[160px]">
          {currentLesson.title}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Player — wrapped in PaywallGate for paid courses */}
        <div className="lg:col-span-2">
          <PaywallGate isPaid={!isLocked}>
            <LessonPlayer
              lesson={currentLesson}
              courseSlug={slug}
              onComplete={() => {
                if (nextLesson) {
                  router.push(`/classroom/${slug}/${nextLesson.id}`);
                }
              }}
            />
          </PaywallGate>

          {/* Navigation — always visible so users can browse lesson list */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={!prevLesson}
              onClick={() => prevLesson && router.push(`/classroom/${slug}/${prevLesson.id}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>

            {nextLesson && (
              <Button
                size="sm"
                onClick={() => router.push(`/classroom/${slug}/${nextLesson.id}`)}
                className="gap-2"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Lesson list sidebar */}
        <div className="space-y-4">
          <CourseProgressBar course={course} compact />
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Aulas do curso
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {allLessons.map((lesson) => (
                <LessonProgressItem
                  key={lesson.id}
                  lesson={lesson}
                  isActive={lesson.id === lessonId}
                  onClick={() => router.push(`/classroom/${slug}/${lesson.id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
