"use client";

import React from "react";
import { Loader2, BookOpen } from "lucide-react";
import { CourseCard } from "../../../components/classroom/CourseCard";
import { useCourses } from "../../../hooks/useCourses";

export default function ClassroomPage() {
  const { data, isLoading } = useCourses();
  const courses = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Sala de Aula</h1>
        <p className="text-muted-foreground text-sm">
          Aprimore seus conhecimentos com nossos cursos exclusivos.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && courses.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum curso disponível ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
