"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Loader2, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { CourseForm } from "../../../components/admin/CourseForm";
import { coursesApi, adminApi } from "../../../lib/api";
import { useCreateCourse, useDeleteCourse } from "../../../hooks/useCourses";

export default function AdminCoursesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["courses", "list"],
    queryFn: () => coursesApi.list(),
  });
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();

  const courses = data?.items ?? [];

  const statusColors: Record<string, string> = {
    published: "success",
    draft: "secondary",
    archived: "outline",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Cursos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os cursos da comunidade.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo curso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar novo curso</DialogTitle>
            </DialogHeader>
            <CourseForm
              onSubmit={async (data) => {
                await createCourse.mutateAsync(data as Parameters<typeof createCourse.mutateAsync>[0]);
                setCreateOpen(false);
              }}
              isLoading={createCourse.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Título</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nível</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gratuito</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{course.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusColors[course.status] as "success" | "secondary" | "outline"}>
                    {course.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {course.level ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {course.is_free ? (
                    <Badge variant="success">Grátis</Badge>
                  ) : (
                    <span className="text-muted-foreground">Pago</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/courses/${course.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Deletar o curso "${course.title}"?`)) {
                          deleteCourse.mutate(course.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && courses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum curso criado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
