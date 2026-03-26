"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Clock, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useCourse } from "../../../../hooks/useCourses";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { CourseProgressBar, LessonProgressItem } from "../../../../components/classroom/ProgressBar";
import type { Module } from "shared-types";

function ModuleAccordion({ module, courseSlug, defaultOpen = false }: {
  module: Module;
  courseSlug: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const completedLessons = module.lessons.filter((l) => l.progress?.completed).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium text-sm">{module.title}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {completedLessons}/{module.lessons.length}
        </span>
      </button>

      {open && (
        <div className="divide-y">
          {module.lessons.map((lesson) => (
            <LessonProgressItem
              key={lesson.id}
              lesson={lesson}
              onClick={() => {
                window.location.href = `/classroom/${courseSlug}/${lesson.id}`;
              }}
            />
          ))}
          {module.lessons.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma aula neste módulo ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: course, isLoading } = useCourse(slug);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Curso não encontrado.</p>
        <Link href="/classroom">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para cursos
          </Button>
        </Link>
      </div>
    );
  }

  const firstLesson = course.modules[0]?.lessons[0];
  const levelLabels: Record<string, string> = {
    beginner: "Iniciante",
    intermediate: "Intermediário",
    advanced: "Avançado",
  };

  return (
    <div className="space-y-6">
      <Link href="/classroom">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para cursos
        </Button>
      </Link>

      {/* Hero */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {course.thumbnail_url && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary/10">
              <Image
                src={course.thumbnail_url}
                alt={course.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {course.level && (
                <Badge variant="outline">{levelLabels[course.level] ?? course.level}</Badge>
              )}
              {course.is_free && (
                <Badge className="bg-green-500 text-white border-0">Grátis</Badge>
              )}
            </div>
            <h1 className="font-display font-bold text-2xl">{course.title}</h1>
            {course.description && (
              <p className="text-muted-foreground mt-2 leading-relaxed">{course.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {course.total_lessons} aulas
              </span>
              {course.estimated_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course.estimated_hours}h estimadas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress sidebar */}
        <div className="space-y-4">
          <CourseProgressBar course={course} />
          {firstLesson && (
            <Link href={`/classroom/${course.slug}/${firstLesson.id}`}>
              <Button className="w-full gap-2">
                {course.completed_lessons > 0 ? "Continuar" : "Começar agora"}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Modules */}
      <div>
        <h2 className="font-display font-bold text-lg mb-4">Conteúdo do curso</h2>
        <div className="space-y-3">
          {course.modules.map((module, idx) => (
            <ModuleAccordion
              key={module.id}
              module={module}
              courseSlug={course.slug}
              defaultOpen={idx === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
