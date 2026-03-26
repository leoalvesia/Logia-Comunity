"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Loader2, LayoutList, Map } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Input } from "../../../components/ui/input";
import { Avatar } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { membersApi } from "../../../lib/api";
import { levelColor, levelName } from "../../../lib/utils";

// Dynamically import map to avoid SSR issues with mapbox-gl
const MemberMap = dynamic(() => import("../../../components/members/MemberMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl border bg-muted/30 flex items-center justify-center" style={{ height: 480 }}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

type ViewMode = "list" | "map";

export default function MembersPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: members, isLoading: loadingList } = useQuery({
    queryKey: ["members", { search: debouncedSearch }],
    queryFn: () => membersApi.list({ search: debouncedSearch || undefined, limit: 50 }),
    enabled: view === "list",
  });

  const { data: mapData, isLoading: loadingMap } = useQuery({
    queryKey: ["members-map"],
    queryFn: () => membersApi.getMap(),
    enabled: view === "map",
    staleTime: 5 * 60 * 1000, // 5 min — map data doesn't need to be fresh
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Membros</h1>
          <p className="text-muted-foreground text-sm">
            Conheça os membros da comunidade Logia Business.
          </p>
        </div>

        {/* List / Map toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg shrink-0">
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setView("list")}
          >
            <LayoutList className="h-4 w-4 mr-1.5" />
            Lista
          </Button>
          <Button
            variant={view === "map" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setView("map")}
          >
            <Map className="h-4 w-4 mr-1.5" />
            Mapa
          </Button>
        </div>
      </div>

      {/* Search (list view only) */}
      {view === "list" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          {loadingList && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members?.map((member) => (
              <Link key={member.id} href={`/members/${member.username}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar src={member.avatar_url} name={member.full_name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{member.username}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className="text-xs font-medium"
                          style={{ color: levelColor(member.level) }}
                        >
                          {levelName(member.level)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {member.points.toLocaleString("pt-BR")} pts
                        </span>
                        {member.role !== "member" && (
                          <Badge variant="secondary" className="text-xs py-0">
                            {member.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {members?.length === 0 && !loadingList && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum membro encontrado.
            </p>
          )}
        </>
      )}

      {/* MAP VIEW */}
      {view === "map" && (
        <>
          {loadingMap ? (
            <div className="w-full rounded-xl border bg-muted/30 flex items-center justify-center" style={{ height: 480 }}>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : mapData ? (
            <MemberMap data={mapData} />
          ) : null}

          {!loadingMap && mapData?.features.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Map className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum membro com localização definida</p>
              <p className="text-sm mt-1">
                Membros podem adicionar sua localização no perfil.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
