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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { useAuthStore } from "../../../stores/auth";
import { ApiError } from "../../../lib/api";

const schema = z.object({
  full_name: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  username: z
    .string()
    .min(3, "Username deve ter ao menos 3 caracteres")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Apenas letras, números, _ e -"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError("root", { message: "Email ou username já cadastrado." });
        } else {
          setError("root", { message: err.detail });
        }
      } else {
        setError("root", { message: "Erro ao criar conta. Tente novamente." });
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Criar sua conta</CardTitle>
            <CardDescription>
              Junte-se à comunidade Logia Business gratuitamente.
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
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  placeholder="João Silva"
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="joaosilva"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

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
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Criando conta..." : "Criar conta grátis"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Já tem conta?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Entrar
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
