"use client";

import React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { Event, EventCreate, EventUpdate } from "shared-types";

const schema = z
  .object({
    title: z.string().min(3, "Título deve ter ao menos 3 caracteres"),
    description: z.string().optional(),
    event_type: z.enum(["webinar", "workshop", "q_and_a", "meetup"]),
    starts_at: z.string().min(1, "Data de início obrigatória"),
    ends_at: z.string().min(1, "Data de término obrigatória"),
    timezone: z.string().default("America/Sao_Paulo"),
    meeting_url: z.string().url("URL inválida").optional().or(z.literal("")),
    max_attendees: z.coerce.number().int().positive().optional().or(z.literal("")),
    status: z.enum(["scheduled", "cancelled", "completed"]).default("scheduled"),
    // Recurrence
    is_recurring: z.boolean().default(false),
    recurrence_frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    recurrence_interval: z.coerce.number().int().min(1).max(12).default(1),
    recurrence_count: z.coerce.number().int().min(2).max(52).optional().or(z.literal("")),
    recurrence_until: z.string().optional(),
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: "Data de término deve ser após o início",
    path: ["ends_at"],
  });

type FormData = z.infer<typeof schema>;

interface EventFormProps {
  event?: Event;
  onSubmit: (data: EventCreate | EventUpdate) => Promise<void>;
  isLoading?: boolean;
}

function toLocalDateTimeString(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function EventForm({ event, onSubmit, isLoading }: EventFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: event
      ? {
          title: event.title,
          description: event.description ?? "",
          event_type: event.event_type as FormData["event_type"],
          starts_at: toLocalDateTimeString(event.starts_at),
          ends_at: toLocalDateTimeString(event.ends_at),
          timezone: event.timezone,
          meeting_url: event.meeting_url ?? "",
          max_attendees: event.max_attendees ?? "",
          status: event.status as FormData["status"],
          is_recurring: false,
          recurrence_interval: 1,
        }
      : {
          event_type: "webinar",
          timezone: "America/Sao_Paulo",
          status: "scheduled",
          is_recurring: false,
          recurrence_interval: 1,
        },
  });

  const isRecurring = useWatch({ control, name: "is_recurring" });

  const handleFormSubmit = async (data: FormData) => {
    let recurrence_rule: Record<string, unknown> | undefined;
    if (data.is_recurring && data.recurrence_frequency) {
      recurrence_rule = {
        frequency: data.recurrence_frequency,
        interval: data.recurrence_interval || 1,
        ...(data.recurrence_count ? { count: Number(data.recurrence_count) } : {}),
        ...(data.recurrence_until ? { until: data.recurrence_until } : {}),
      };
    }
    await onSubmit({
      title: data.title,
      description: data.description || undefined,
      event_type: data.event_type,
      starts_at: new Date(data.starts_at).toISOString(),
      ends_at: new Date(data.ends_at).toISOString(),
      timezone: data.timezone,
      meeting_url: data.meeting_url || undefined,
      max_attendees: data.max_attendees ? Number(data.max_attendees) : undefined,
      ...(recurrence_rule ? { recurrence_rule } : {}),
    } as EventCreate);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...register("title")} placeholder="Nome do evento" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register("description")} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_type">Tipo de evento *</Label>
          <select
            id="event_type"
            {...register("event_type")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="webinar">Webinar</option>
            <option value="workshop">Workshop</option>
            <option value="q_and_a">Q&A</option>
            <option value="meetup">Meetup</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            {...register("status")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="scheduled">Agendado</option>
            <option value="cancelled">Cancelado</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Início *</Label>
          <Input id="starts_at" type="datetime-local" {...register("starts_at")} />
          {errors.starts_at && (
            <p className="text-sm text-destructive">{errors.starts_at.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ends_at">Término *</Label>
          <Input id="ends_at" type="datetime-local" {...register("ends_at")} />
          {errors.ends_at && (
            <p className="text-sm text-destructive">{errors.ends_at.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meeting_url">Link do evento (Zoom, Meet, etc.)</Label>
        <Input id="meeting_url" {...register("meeting_url")} placeholder="https://..." />
        {errors.meeting_url && (
          <p className="text-sm text-destructive">{errors.meeting_url.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_attendees">Vagas máximas (deixe em branco para ilimitado)</Label>
          <Input
            id="max_attendees"
            type="number"
            min="1"
            {...register("max_attendees")}
            placeholder="100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Fuso horário</Label>
          <Input id="timezone" {...register("timezone")} />
        </div>
      </div>

      {/* Recurrence — only on create */}
      {!event && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_recurring"
              {...register("is_recurring")}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="is_recurring" className="cursor-pointer font-medium">
              Evento recorrente
            </Label>
          </div>

          {isRecurring && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Frequência *</Label>
                  <select
                    {...register("recurrence_frequency")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>A cada (intervalo)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    placeholder="1"
                    {...register("recurrence_interval")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nº de ocorrências (máx 52)</Label>
                  <Input
                    type="number"
                    min="2"
                    max="52"
                    placeholder="ex: 8"
                    {...register("recurrence_count")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ou repetir até</Label>
                  <Input type="date" {...register("recurrence_until")} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Preencha &ldquo;Nº de ocorrências&rdquo; OU &ldquo;repetir até&rdquo; (não ambos).
              </p>
            </div>
          )}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Salvando..." : event ? "Salvar evento" : "Criar evento"}
      </Button>
    </form>
  );
}
