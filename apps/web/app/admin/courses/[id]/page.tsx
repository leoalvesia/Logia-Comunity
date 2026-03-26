"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Edit, Trash2, Loader2, GripVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { CourseForm } from "../../../../components/admin/CourseForm";
import { LessonForm } from "../../../../components/admin/LessonForm";
import { coursesApi } from "../../../../lib/api";
import {
  useUpdateCourse, useCreateModule, useUpdateLesson,
  useDeleteCourse, useCreateLesson, useDeleteLesson, useUpdateModule
} from "../../../../hooks/useCourses";
import type { Module, Lesson } from "shared-types";

export default function AdminCourseEditPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [addLessonModuleId, setAddLessonModuleId] = useState<string | null>(null);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);

  // We use slug=id for the API query when fetching by ID (via courses list)
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ["courses", "list"],
    queryFn: () => coursesApi.list(),
  });
  const course = coursesData?.items.find((c) => c.id === courseId);

  const updateCourse = useUpdateCourse();
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return <p className="text-muted-foreground">Curso não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={course.status === "published" ? "success" : "secondary"}>
              {course.status}
            </Badge>
            {course.is_free && <Badge variant="success">Grátis</Badge>}
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditCourseOpen(true)}>
          <Edit className="h-4 w-4" />
          Editar curso
        </Button>
      </div>

      {/* Modules & Lessons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Módulos e Aulas</h2>
          <Button size="sm" className="gap-2" onClick={() => setAddModuleOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo módulo
          </Button>
        </div>

        {course.modules.map((module) => (
          <div key={module.id} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{module.title}</span>
                <Badge variant={module.is_published ? "success" : "secondary"} className="text-xs">
                  {module.is_published ? "Publicado" : "Rascunho"}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => setAddLessonModuleId(module.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                Aula
              </Button>
            </div>

            <div className="divide-y">
              {module.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{lesson.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={lesson.status === "published" ? "success" : "secondary"} className="text-xs py-0">
                          {lesson.status}
                        </Badge>
                        {lesson.video_url && (
                          <span className="text-xs text-green-600">
                            ✓ Vídeo{lesson.video_provider && lesson.video_provider !== "bunny" ? ` (${lesson.video_provider})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditLesson(lesson)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Deletar a aula "${lesson.title}"?`)) {
                          deleteLesson.mutate(lesson.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {module.lessons.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Nenhuma aula neste módulo.
                </div>
              )}
            </div>
          </div>
        ))}

        {course.modules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <p>Nenhum módulo criado ainda. Adicione um módulo para começar.</p>
          </div>
        )}
      </div>

      {/* Edit course dialog */}
      <Dialog open={editCourseOpen} onOpenChange={setEditCourseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar curso</DialogTitle>
          </DialogHeader>
          <CourseForm
            course={course}
            onSubmit={async (data) => {
              await updateCourse.mutateAsync({ id: courseId, data });
              setEditCourseOpen(false);
            }}
            isLoading={updateCourse.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Add module dialog */}
      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo módulo</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await createModule.mutateAsync({
                courseId,
                data: {
                  title: fd.get("title") as string,
                  order_index: Number(fd.get("order_index") ?? 0),
                },
              });
              setAddModuleOpen(false);
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <input
                name="title"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ex: Módulo 1 — Fundamentos"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ordem</label>
              <input
                name="order_index"
                type="number"
                min="0"
                defaultValue={course.modules.length}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" disabled={createModule.isPending} className="w-full">
              {createModule.isPending ? "Criando..." : "Criar módulo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add lesson dialog */}
      <Dialog
        open={!!addLessonModuleId}
        onOpenChange={(open) => !open && setAddLessonModuleId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova aula</DialogTitle>
          </DialogHeader>
          {addLessonModuleId && (
            <LessonForm
              moduleId={addLessonModuleId}
              onSubmit={async (data) => {
                await createLesson.mutateAsync({
                  moduleId: addLessonModuleId,
                  data: data as Parameters<typeof createLesson.mutateAsync>[0]["data"],
                });
                setAddLessonModuleId(null);
              }}
              isLoading={createLesson.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit lesson dialog */}
      <Dialog open={!!editLesson} onOpenChange={(open) => !open && setEditLesson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar aula</DialogTitle>
          </DialogHeader>
          {editLesson && (
            <LessonForm
              lesson={editLesson}
              moduleId={editLesson.module_id}
              onSubmit={async (data) => {
                await updateLesson.mutateAsync({ lessonId: editLesson.id, data });
                setEditLesson(null);
              }}
              isLoading={updateLesson.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
