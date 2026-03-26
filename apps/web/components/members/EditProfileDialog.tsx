"use client";

import React, { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Upload, X, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar } from "../ui/avatar";
import { membersApi } from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import type { Profile } from "shared-types";

interface EditProfileDialogProps {
  profile: Profile;
}

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
  const qc = useQueryClient();
  const { refresh } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const resetForm = () => {
    setFullName(profile.full_name);
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setAvatarPreview(null);
    setAvatarFile(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2MB.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    // Upload via backend proxy — stores on Supabase Storage
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("logia_access_token");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001"}/api/v1/members/avatar`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      },
    );
    if (!res.ok) throw new Error("Falha ao enviar imagem");
    const data = await res.json();
    return data.url as string;
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError("O nome completo é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalAvatarUrl = avatarUrl || undefined;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(avatarFile);
      }
      await membersApi.update(String(profile.id), {
        full_name: fullName.trim(),
        bio: bio.trim() || undefined,
        avatar_url: finalAvatarUrl,
      });
      await qc.invalidateQueries({ queryKey: ["members", profile.username] });
      await refresh();
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const currentAvatarSrc = avatarPreview ?? avatarUrl ?? profile.avatar_url;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Editar perfil
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                src={currentAvatarSrc ?? null}
                name={fullName || profile.full_name}
                size="xl"
              />
              {(avatarPreview || avatarUrl) && (
                <button
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarFile(null);
                    setAvatarUrl("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground w-5 h-5 flex items-center justify-center hover:opacity-90"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Enviar foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou URL</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Input
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setAvatarPreview(null);
                  setAvatarFile(null);
                }}
                className="text-xs"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome completo</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              rows={3}
              maxLength={280}
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-background resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/280</p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
