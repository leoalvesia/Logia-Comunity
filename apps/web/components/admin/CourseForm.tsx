"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { Course, CourseCreate, CourseUpdate } from "shared-types";

const schema = z.object({
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres"),
  description: z.string().optional(),
  thumbnail_url: z.string().url("URL inválida").optional().or(z.literal("")),
  category: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimated_hours: z.coerce.number().positive().optional(),
  is_free: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

type FormData = z.infer<typeof schema>;

interface CourseFormProps {
  course?: Course;
  onSubmit: (data: CourseCreate | CourseUpdate) => Promise<void>;
  isLoading?: boolean;
}

export function CourseForm({ course, onSubmit, isLoading }: CourseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: course
      ? {
          title: course.title,
          description: course.description ?? "",
          thumbnail_url: course.thumbnail_url ?? "",
          category: course.category ?? "",
          level: (course.level as FormData["level"]) ?? undefined,
          estimated_hours: course.estimated_hours ?? undefined,
          is_free: course.is_free,
          status: (course.status as FormData["status"]) ?? "draft",
        }
      : { is_free: false, status: "draft" },
  });

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({
      ...data,
      description: data.description || undefined,
      thumbnail_url: data.thumbnail_url || undefined,
      category: data.category || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...register("title")} placeholder="Nome do curso" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Descreva o curso..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" {...register("category")} placeholder="Ex: Marketing" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="level">Nível</Label>
          <select
            id="level"
            {...register("level")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            <option value="beginner">Iniciante</option>
            <option value="intermediate">Intermediário</option>
            <option value="advanced">Avançado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimated_hours">Carga horária (horas)</Label>
          <Input
            id="estimated_hours"
            type="number"
            step="0.5"
            min="0"
            {...register("estimated_hours")}
            placeholder="Ex: 4.5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            {...register("status")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail_url">URL da thumbnail</Label>
        <Input
          id="thumbnail_url"
          {...register("thumbnail_url")}
          placeholder="https://..."
        />
        {errors.thumbnail_url && (
          <p className="text-sm text-destructive">{errors.thumbnail_url.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_free"
          type="checkbox"
          {...register("is_free")}
          className="h-4 w-4 accent-primary"
        />
        <Label htmlFor="is_free">Curso gratuito</Label>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Salvando..." : course ? "Salvar alterações" : "Criar curso"}
      </Button>
    </form>
  );
}
