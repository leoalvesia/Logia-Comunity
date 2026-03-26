"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trophy, TrendingUp, Loader2, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { Avatar } from "../../../components/ui/avatar";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import { leaderboardApi } from "../../../lib/api";
import {
  levelColor,
  levelName,
  levelProgress,
  pointsToNextLevel,
} from "../../../lib/utils";
import { useAuthStore } from "../../../stores/auth";
import type { LeaderboardEntry } from "shared-types";

type Period = "7d" | "30d" | "all-time";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "all-time": "Geral",
};

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

// Classic Olympic podium layout: 2nd | 1st | 3rd
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHTS = ["h-20", "h-28", "h-14"];

function LevelBadge({ level }: { level: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: `${levelColor(level)}20`,
        color: levelColor(level),
        border: `1px solid ${levelColor(level)}40`,
      }}
    >
      <Star className="h-3 w-3 fill-current" />
      {levelName(level)}
    </span>
  );
}

function PodiumCard({
  entry,
  podiumIdx,
}: {
  entry: LeaderboardEntry;
  podiumIdx: number;
}) {
  const isFirst = entry.rank === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: podiumIdx * 0.1 }}
    >
      <Link href={`/members/${entry.username}`} className="flex flex-col items-center gap-2">
        <span className="text-2xl">{PODIUM_MEDALS[entry.rank - 1]}</span>
        <div className={`relative ${isFirst ? "scale-110" : ""}`}>
          <Avatar
            src={entry.avatar_url}
            name={entry.full_name}
            size={isFirst ? "lg" : "md"}
          />
          {isFirst && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</span>
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm line-clamp-1 max-w-[90px]">{entry.full_name}</p>
          <p className="text-xs text-muted-foreground">@{entry.username}</p>
          <p
            className="font-bold text-sm mt-0.5"
            style={{ color: PODIUM_COLORS[entry.rank - 1] }}
          >
            {entry.period_points.toLocaleString("pt-BR")} pts
          </p>
        </div>
        {/* Podium block */}
        <div
          className={`w-full rounded-t-lg ${PODIUM_HEIGHTS[podiumIdx]} flex items-center justify-center`}
          style={{
            background: `linear-gradient(to top, ${PODIUM_COLORS[entry.rank - 1]}40, ${PODIUM_COLORS[entry.rank - 1]}15)`,
            border: `1px solid ${PODIUM_COLORS[entry.rank - 1]}50`,
          }}
        >
          <span
            className="font-black text-2xl"
            style={{ color: PODIUM_COLORS[entry.rank - 1] }}
          >
            #{entry.rank}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function RankRow({
  entry,
  idx,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  idx: number;
  isCurrentUser: boolean;
}) {
  const podiumColor = idx < 3 ? PODIUM_COLORS[idx] : undefined;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.5) }}
    >
      <Link href={`/members/${entry.username}`}>
        <Card
          className={`hover:shadow-md transition-all duration-200 ${
            isCurrentUser ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/30"
          }`}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div
              className="w-8 text-center font-black text-sm shrink-0"
              style={{ color: podiumColor }}
            >
              {idx < 3 ? PODIUM_MEDALS[idx] : `#${entry.rank}`}
            </div>
            <Avatar src={entry.avatar_url} name={entry.full_name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">{entry.full_name}</p>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    você
                  </Badge>
                )}
              </div>
              <LevelBadge level={entry.level} />
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-sm text-primary">
                {entry.period_points.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function MyPositionBar({
  entry,
}: {
  entry: (LeaderboardEntry & { rank: number | null }) | undefined;
}) {
  if (!entry) return null;
  const toNext = pointsToNextLevel(entry.points, entry.level);
  const progress = levelProgress(entry.points, entry.level);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={entry.avatar_url} name={entry.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold truncate">{entry.full_name}</p>
              <LevelBadge level={entry.level} />
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {toNext === null
                  ? "Nível máximo"
                  : `${toNext.toLocaleString("pt-BR")} pts p/ próx.`}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-black text-lg text-primary leading-none">
            {entry.rank != null ? `#${entry.rank}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {entry.period_points.toLocaleString("pt-BR")} pts
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all-time");
  const { user } = useAuthStore();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => leaderboardApi.get(period),
  });

  const { data: myRank } = useQuery({
    queryKey: ["leaderboard-me", period],
    queryFn: () => leaderboardApi.getMyRank(period),
    enabled: !!user,
  });

  const isCurrentUserInTopList = entries?.some((e) => e.id === user?.id);
  const topThree = entries?.slice(0, 3) ?? [];
  const hasPodium = topThree.length === 3;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-yellow-50 border border-yellow-200">
          <Trophy className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl leading-tight">Ranking</h1>
          <p className="text-muted-foreground text-sm">
            Os membros mais engajados da comunidade
          </p>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
            className="rounded-full"
          >
            {p === "7d" && <TrendingUp className="h-3 w-3 mr-1" />}
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isLoading && entries && (
          <motion.div
            key={period}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Olympic Podium */}
            {hasPodium && (
              <div className="grid grid-cols-3 gap-2 items-end pt-6">
                {PODIUM_ORDER.map((entryIdx, podiumIdx) => (
                  <PodiumCard
                    key={topThree[entryIdx].id}
                    entry={topThree[entryIdx]}
                    podiumIdx={podiumIdx}
                  />
                ))}
              </div>
            )}

            {/* Full ranked list */}
            {entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Nenhuma atividade nesse período</p>
                <p className="text-sm mt-1">Seja o primeiro a pontuar!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {entries.map((entry, idx) => (
                  <RankRow
                    key={entry.id}
                    entry={entry}
                    idx={idx}
                    isCurrentUser={entry.id === user?.id}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky bottom bar — only shown when user is NOT in the visible top list */}
      {!isCurrentUserInTopList && myRank && (
        <MyPositionBar entry={myRank} />
      )}
    </div>
  );
}
