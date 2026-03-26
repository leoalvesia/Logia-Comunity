"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, BookOpen, Calendar, FileText, TrendingUp, CreditCard,
  UserPlus, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { adminApi } from "../../lib/api";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
  subtext?: string;
}

function StatCard({ title, value, icon: Icon, color = "text-primary", subtext }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="font-display font-bold text-3xl">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getStats,
  });

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
        <h1 className="font-display font-bold text-2xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral da comunidade Logia Business.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de membros"
          value={stats?.total_members ?? 0}
          icon={Users}
          color="text-blue-500"
          subtext={`+${stats?.new_members_30d ?? 0} nos últimos 30 dias`}
        />
        <StatCard
          title="Ativos (7 dias)"
          value={stats?.active_members_7d ?? 0}
          icon={TrendingUp}
          color="text-green-500"
        />
        <StatCard
          title="Membros pagos"
          value={stats?.paid_members ?? 0}
          icon={CreditCard}
          color="text-purple-500"
        />
        <StatCard
          title="Novos (30 dias)"
          value={stats?.new_members_30d ?? 0}
          icon={UserPlus}
          color="text-orange-500"
        />
        <StatCard
          title="Total de cursos"
          value={stats?.total_courses ?? 0}
          icon={BookOpen}
          color="text-primary"
        />
        <StatCard
          title="Total de aulas"
          value={stats?.total_lessons ?? 0}
          icon={BookOpen}
          color="text-primary"
          subtext="Em todos os cursos"
        />
        <StatCard
          title="Publicações"
          value={stats?.total_posts ?? 0}
          icon={FileText}
          color="text-teal-500"
        />
        <StatCard
          title="Eventos"
          value={stats?.total_events ?? 0}
          icon={Calendar}
          color="text-red-500"
        />
      </div>
    </div>
  );
}
