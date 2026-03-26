"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Link } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { extractVimeoId, extractYoutubeId } from "../../lib/utils";
import type { Lesson, LessonCreate, LessonUpdate } from "shared-types";

const schema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  order_index: z.coerce.number().int().min(0),
  status: z.enum(["draft", "published"]).default("draft"),
  video_provider: z.enum(["youtube", "vimeo"]).default("youtube"),
  video_url_input: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface LessonFormProps {
  lesson?: Lesson;
  moduleId: string;
  onSubmit: (data: LessonCreate | LessonUpdate) => Promise<void>;
  isLoading?: boolean;
}

export function LessonForm({ lesson, moduleId, onSubmit, isLoading }: LessonFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: lesson
      ? {
          title: lesson.title,
          description: lesson.description ?? "",
          order_index: lesson.order_index,
          status: lesson.status as FormData["status"],
          video_provider: (lesson.video_provider === "vimeo" ? "vimeo" : "youtube") as FormData["video_provider"],
          video_url_input: lesson.video_url ?? "",
        }
      : { order_index: 0, status: "draft", video_provider: "youtube" },
  });

  const videoProvider = watch("video_provider");

  const handleFormSubmit = (data: FormData) => {
    setFormError(null);

    const payload: LessonCreate | LessonUpdate = {
      title: data.title,
      description: data.description,
      order_index: data.order_index,
      status: data.status,
      video_provider: data.video_provider,
    };

    if (data.video_url_input) {
      if (data.video_provider === "youtube") {
        const id = extractYoutubeId(data.video_url_input);
        if (!id) {
          setFormError("URL do YouTube inválida. Use: https://youtu.be/ID ou https://youtube.com/watch?v=ID");
          return;
        }
        (payload as LessonUpdate).video_url = id;
      } else if (data.video_provider === "vimeo") {
        const id = extractVimeoId(data.video_url_input);
        if (!id) {
          setFormError("URL do Vimeo inválida. Use: https://vimeo.com/123456789");
          return;
        }
        (payload as LessonUpdate).video_url = id;
      }
    }

    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Título da aula *</Label>
        <Input id="title" {...register("title")} placeholder="Ex: Introdução ao marketing" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register("description")} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="order_index">Ordem</Label>
          <Input id="order_index" type="number" min="0" {...register("order_index")} />
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
          </select>
        </div>
      </div>

      {/* Video — only shown when editing an existing lesson */}
      {lesson && (
        <div className="space-y-3">
          <Label>Vídeo da aula</Label>

          <div className="space-y-1">
            <Label htmlFor="video_provider" className="text-xs text-muted-foreground">Plataforma</Label>
            <select
              id="video_provider"
              {...register("video_provider")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="youtube">YouTube (link)</option>
              <option value="vimeo">Vimeo (link)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="video_url_input" className="text-xs text-muted-foreground">
              {videoProvider === "vimeo" ? "URL do Vimeo" : "URL do YouTube"}
            </Label>
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                id="video_url_input"
                {...register("video_url_input")}
                placeholder={
                  videoProvider === "vimeo"
                    ? "https://vimeo.com/123456789"
                    : "https://youtu.be/dQw4w9WgXcQ"
                }
              />
            </div>
            {lesson.video_url && (
              <p className="text-xs text-muted-foreground">
                ID atual: <span className="font-mono">{lesson.video_url}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {formError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {formError}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Salvando..." : lesson ? "Salvar aula" : "Criar aula"}
      </Button>
    </form>
  );
}
