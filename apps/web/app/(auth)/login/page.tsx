"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { useAuthStore } from "../../../stores/auth";
import { ApiError } from "../../../lib/api";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError("root", { message: err.detail });
      } else {
        setError("root", { message: "Erro ao fazer login. Tente novamente." });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">L</span>
            </div>
            <span className="font-display font-bold text-xl text-secondary">
              Logia Business
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            A comunidade de negócios mais exclusiva do Brasil
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Entrar na comunidade</CardTitle>
            <CardDescription>
              Insira seu email e senha para acessar sua conta.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errors.root && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-md px-3 py-2">
                  {errors.root.message}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Não tem conta?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Criar conta grátis
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
