"use client";

import React, { useState } from "react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
  isToday, startOfWeek, endOfWeek, addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { EventCard } from "./EventCard";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "../../lib/api";
import type { Event } from "shared-types";

export function CalendarGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ["events", { month, year }],
    queryFn: () => eventsApi.list({ month, year }),
  });

  const events = data?.items ?? [];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day: Date): Event[] =>
    events.filter((e) => isSameDay(new Date(e.starts_at), day));

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl capitalize">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
              className={`bg-background min-h-[80px] p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate"
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div>
          <h3 className="font-semibold mb-3">
            Eventos em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum evento neste dia.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedDayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
