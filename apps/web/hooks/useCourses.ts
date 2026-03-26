"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "../lib/api";
import type { CourseCreate, CourseUpdate, ModuleCreate, ModuleUpdate, LessonCreate, LessonUpdate, ProgressUpdate } from "shared-types";

export const courseKeys = {
  all: ["courses"] as const,
  list: () => [...courseKeys.all, "list"] as const,
  detail: (slug: string) => [...courseKeys.all, "detail", slug] as const,
};

export function useCourses() {
  return useQuery({
    queryKey: courseKeys.list(),
    queryFn: () => coursesApi.list(),
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: courseKeys.detail(slug),
    queryFn: () => coursesApi.get(slug),
    enabled: !!slug,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CourseCreate) => coursesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseUpdate }) =>
      coursesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: ModuleCreate }) =>
      coursesApi.createModule(courseId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, moduleId, data }: { courseId: string; moduleId: string; data: ModuleUpdate }) =>
      coursesApi.updateModule(courseId, moduleId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, moduleId }: { courseId: string; moduleId: string }) =>
      coursesApi.deleteModule(courseId, moduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: LessonCreate }) =>
      coursesApi.createLesson(moduleId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => coursesApi.deleteLesson(lessonId),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: LessonUpdate }) =>
      coursesApi.updateLesson(lessonId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useUpdateProgress() {
  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: ProgressUpdate }) =>
      coursesApi.updateProgress(lessonId, data),
  });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => coursesApi.completeLesson(lessonId),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}
