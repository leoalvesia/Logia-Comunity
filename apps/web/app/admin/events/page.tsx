"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2, Loader2, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { EventForm } from "../../../components/admin/EventForm";
import { eventsApi } from "../../../lib/api";
import { formatDateTime } from "../../../lib/utils";
import type { Event, EventCreate, EventUpdate } from "shared-types";

export default function AdminEventsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["events", "admin"],
    queryFn: () => eventsApi.list(),
  });

  const createEvent = useMutation({
    mutationFn: (data: EventCreate) => eventsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventUpdate }) =>
      eventsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const events = data?.items ?? [];

  const statusColors: Record<string, string> = {
    scheduled: "success",
    cancelled: "destructive",
    completed: "secondary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Eventos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os eventos da comunidade.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar novo evento</DialogTitle>
            </DialogHeader>
            <EventForm
              onSubmit={async (data) => {
                await createEvent.mutateAsync(data as EventCreate);
                setCreateOpen(false);
              }}
              isLoading={createEvent.isPending}
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Evento</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Início</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Inscritos</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <span className="font-medium">{event.title}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {event.event_type.replace("_", " ")}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {formatDateTime(event.starts_at)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={statusColors[event.status] as "success" | "destructive" | "secondary"}
                  >
                    {event.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {event.attendee_count}
                  {event.max_attendees ? `/${event.max_attendees}` : ""}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditEvent(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Deletar o evento "${event.title}"?`)) {
                          deleteEvent.mutate(event.id);
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

        {!isLoading && events.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum evento criado ainda.</p>
          </div>
        )}
      </div>

      {/* Edit event dialog */}
      <Dialog open={!!editEvent} onOpenChange={(open) => !open && setEditEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar evento</DialogTitle>
          </DialogHeader>
          {editEvent && (
            <EventForm
              event={editEvent}
              onSubmit={async (data) => {
                await updateEvent.mutateAsync({ id: editEvent.id, data });
                setEditEvent(null);
              }}
              isLoading={updateEvent.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
