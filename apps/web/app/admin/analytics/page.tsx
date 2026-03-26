"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, Users, BookOpen, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { adminApi } from "../../../lib/api";

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getStats,
  });

  const conversionRate =
    stats && stats.total_members > 0
      ? ((stats.paid_members / stats.total_members) * 100).toFixed(1)
      : "0.0";

  const retentionRate =
    stats && stats.total_members > 0
      ? ((stats.active_members_7d / stats.total_members) * 100).toFixed(1)
      : "0.0";

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Métricas da comunidade Logia Business.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display font-bold text-3xl text-primary">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">membros pagos / total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Retenção 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display font-bold text-3xl text-accent">{retentionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">ativos nos últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Aulas por Curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display font-bold text-3xl">
              {stats && stats.total_courses > 0
                ? (stats.total_lessons / stats.total_courses).toFixed(1)
                : "0"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">média de aulas por curso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Crescimento 30d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display font-bold text-3xl text-green-500">
              +{stats?.new_members_30d ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">novos membros</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {[
              { label: "Total de membros", value: stats?.total_members ?? 0 },
              { label: "Membros ativos (7 dias)", value: stats?.active_members_7d ?? 0 },
              { label: "Membros pagos", value: stats?.paid_members ?? 0 },
              { label: "Novos membros (30 dias)", value: stats?.new_members_30d ?? 0 },
              { label: "Total de cursos", value: stats?.total_courses ?? 0 },
              { label: "Total de aulas", value: stats?.total_lessons ?? 0 },
              { label: "Total de publicações", value: stats?.total_posts ?? 0 },
              { label: "Total de eventos", value: stats?.total_events ?? 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="font-semibold">{item.value.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
