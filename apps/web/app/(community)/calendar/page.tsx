"use client";

import React from "react";
import { CalendarGrid } from "../../../components/calendar/CalendarGrid";
import { useAuthStore } from "../../../stores/auth";

export default function CalendarPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Calendário</h1>
        <p className="text-muted-foreground text-sm">
          Webinars, workshops e encontros da comunidade.
        </p>
      </div>

      <CalendarGrid />
    </div>
  );
}
