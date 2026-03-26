"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Calendar, Trophy } from "lucide-react";
import { Avatar } from "../../../../components/ui/avatar";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Progress } from "../../../../components/ui/progress";
import { membersApi } from "../../../../lib/api";
import { formatDate, levelColor, levelName } from "../../../../lib/utils";
import { EditProfileDialog } from "../../../../components/members/EditProfileDialog";
import { useAuthStore } from "../../../../stores/auth";

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 100,
  2: 300,
  3: 700,
  4: 1500,
  5: 3000,
  6: 99999,
};

export default function MemberProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuthStore();

  const { data: member, isLoading } = useQuery({
    queryKey: ["members", username],
    queryFn: () => membersApi.get(username),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Membro não encontrado.</p>
      </div>
    );
  }

  const nextLevelThreshold = LEVEL_THRESHOLDS[member.level] ?? 100;
  const prevLevelThreshold = member.level > 1 ? LEVEL_THRESHOLDS[member.level - 1] ?? 0 : 0;
  const progressToNextLevel = Math.min(
    100,
    Math.round(
      ((member.points - prevLevelThreshold) / (nextLevelThreshold - prevLevelThreshold)) * 100,
    ),
  );

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar
              src={member.avatar_url}
              name={member.full_name}
              size="xl"
              className="shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-2xl">{member.full_name}</h1>
                {member.role !== "member" && (
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                )}
                {member.is_paid && (
                  <Badge className="bg-accent text-accent-foreground border-0">Pro</Badge>
                )}
                {currentUser && currentUser.username === member.username && (
                  <EditProfileDialog profile={member} />
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-0.5">@{member.username}</p>

              {member.bio && (
                <p className="text-sm mt-3 leading-relaxed">{member.bio}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Membro desde {formatDate(member.joined_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Nível atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: levelColor(member.level) }}
              >
                {member.level}
              </div>
              <div>
                <p
                  className="font-bold text-lg"
                  style={{ color: levelColor(member.level) }}
                >
                  {levelName(member.level)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.points} pontos totais
                </p>
              </div>
            </div>
            {member.level < 6 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso para o próximo nível</span>
                  <span>{progressToNextLevel}%</span>
                </div>
                <Progress value={progressToNextLevel} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {nextLevelThreshold - member.points} pontos para {levelName(member.level + 1)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Pontuação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display font-bold text-3xl text-primary">
              {member.points.toLocaleString("pt-BR")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">pontos acumulados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
