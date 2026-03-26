"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, Video, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { formatDateTime } from "../../lib/utils";
import { eventsApi } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { Event } from "shared-types";

interface EventCardProps {
  event: Event;
}

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  webinar:  { label: "Webinar",  color: "bg-blue-500" },
  workshop: { label: "Workshop", color: "bg-purple-500" },
  q_and_a:  { label: "Q&A",     color: "bg-green-500" },
  meetup:   { label: "Meetup",   color: "bg-orange-500" },
};

export function EventCard({ event }: EventCardProps) {
  const qc = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const eventMeta = eventTypeLabels[event.event_type] ?? {
    label: event.event_type,
    color: "bg-gray-500",
  };

  const isFull =
    event.max_attendees != null && event.attendee_count >= event.max_attendees;

  const handleRegister = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      if (event.is_registered) {
        await eventsApi.unregister(event.id);
      } else {
        await eventsApi.register(event.id);
      }
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Badge className={`${eventMeta.color} text-white border-0 mb-2`}>
                  {eventMeta.label}
                </Badge>
                <h3 className="font-display font-bold text-base leading-snug">{event.title}</h3>
              </div>
              {event.status === "cancelled" && (
                <Badge variant="destructive">Cancelado</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="py-0 space-y-2">
            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{formatDateTime(event.starts_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {event.attendee_count} inscrito{event.attendee_count !== 1 ? "s" : ""}
                  {event.max_attendees && ` / ${event.max_attendees} vagas`}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-4 flex items-center justify-between gap-2">
            {event.is_registered && event.meeting_url && (
              <span className="flex items-center gap-1.5 text-sm text-primary">
                <Video className="h-4 w-4" />
                Link disponível
              </span>
            )}
            {event.status !== "cancelled" && (
              <Button
                size="sm"
                variant={event.is_registered ? "outline" : "default"}
                onClick={handleRegister}
                disabled={isLoading || (isFull && !event.is_registered)}
                className="ml-auto"
              >
                {isLoading
                  ? "..."
                  : event.is_registered
                  ? "Inscrito ✓"
                  : isFull
                  ? "Esgotado"
                  : "Inscrever-se"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>

      {/* Detail modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${eventMeta.color} text-white border-0`}>
                {eventMeta.label}
              </Badge>
              {event.status === "cancelled" && (
                <Badge variant="destructive">Cancelado</Badge>
              )}
            </div>
            <DialogTitle className="text-left leading-snug">{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}

            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{formatDateTime(event.starts_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Até {formatDateTime(event.ends_at)} ({event.timezone})</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {event.attendee_count} inscrito{event.attendee_count !== 1 ? "s" : ""}
                  {event.max_attendees && ` / ${event.max_attendees} vagas`}
                </span>
              </div>
            </div>

            {/* Meeting link — visible when registered */}
            {event.meeting_url && event.is_registered && (
              <a
                href={event.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full justify-center rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors px-4 py-2.5 font-medium"
              >
                <Video className="h-4 w-4" />
                Entrar no evento
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {/* Meeting link hint when not registered */}
            {event.meeting_url && !event.is_registered && (
              <p className="text-xs text-muted-foreground text-center">
                Inscreva-se para acessar o link do evento.
              </p>
            )}

            {/* RSVP button */}
            {event.status !== "cancelled" && (
              <Button
                className="w-full"
                variant={event.is_registered ? "outline" : "default"}
                onClick={handleRegister}
                disabled={isLoading || (isFull && !event.is_registered)}
              >
                {isLoading
                  ? "..."
                  : event.is_registered
                  ? "Cancelar inscrição"
                  : isFull
                  ? "Esgotado"
                  : "Inscrever-se"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
