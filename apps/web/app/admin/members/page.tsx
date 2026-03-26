"use client";

import React, { useState } from "react";
import { Search, Loader2, Shield, Ban } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Avatar } from "../../../components/ui/avatar";
import { adminApi } from "../../../lib/api";
import { formatDate, levelColor, levelName } from "../../../lib/utils";

export default function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const qc = useQueryClient();

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: members, isLoading } = useQuery({
    queryKey: ["admin", "members", { search: debouncedSearch, role: roleFilter }],
    queryFn: () =>
      adminApi.listMembers({
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
      }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "members"] }),
  });

  const banMember = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.banMember(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "members"] }),
  });

  const roleColors: Record<string, string> = {
    admin: "default",
    moderator: "secondary",
    member: "outline",
  };

  const statusColors: Record<string, string> = {
    active: "success",
    inactive: "secondary",
    banned: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl">Membros</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie os membros da comunidade.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, username ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os cargos</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderador</option>
          <option value="member">Membro</option>
        </select>
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Membro</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cargo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nível / Pontos</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Membro desde</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members?.map((member) => (
              <tr key={member.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatar_url} name={member.full_name} size="sm" />
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        @{member.username} · {member.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={roleColors[member.role] as "default" | "secondary" | "outline"}>
                    {member.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={statusColors[member.status] as "success" | "secondary" | "destructive"}
                  >
                    {member.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span style={{ color: levelColor(member.level) }} className="font-medium">
                    {levelName(member.level)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {member.points} pts
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {formatDate(member.joined_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {member.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => {
                          const newRole = member.role === "moderator" ? "member" : "moderator";
                          if (confirm(`Alterar cargo para ${newRole}?`)) {
                            updateRole.mutate({ id: member.id, role: newRole });
                          }
                        }}
                        disabled={updateRole.isPending}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {member.role === "moderator" ? "Remover mod" : "Tornar mod"}
                      </Button>
                    )}

                    {member.status !== "banned" && member.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          const reason = prompt("Motivo do banimento (opcional):");
                          if (reason !== null) {
                            banMember.mutate({ id: member.id, reason: reason || undefined });
                          }
                        }}
                        disabled={banMember.isPending}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Banir
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && !members?.length && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum membro encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
