"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { paymentsApi } from "../../../lib/api";

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1500;

type State = "polling" | "success" | "timeout";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [state, setState] = React.useState<State>("polling");
  const [attempts, setAttempts] = React.useState(0);

  React.useEffect(() => {
    if (state !== "polling") return;

    let cancelled = false;

    const poll = async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (cancelled) return;

        try {
          const data = await paymentsApi.status();
          if (data.is_paid) {
            if (!cancelled) setState("success");
            return;
          }
        } catch {
          // Swallow errors during polling — keep retrying
        }

        setAttempts(i + 1);

        if (i < MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }

      if (!cancelled) setState("timeout");
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [state]);

  // After confirmed success, redirect after 3 seconds
  React.useEffect(() => {
    if (state !== "success") return;
    const timer = setTimeout(() => router.push("/classroom"), 3000);
    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <AnimatePresence mode="wait">
          {state === "polling" && (
            <motion.div
              key="polling"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Confirmando seu pagamento...
              </h1>
              <p className="text-muted-foreground text-sm">
                Aguarde enquanto ativamos seu acesso.
                {attempts > 0 && ` (${attempts}/${MAX_ATTEMPTS})`}
              </p>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, type: "spring", stiffness: 200, damping: 20 }}
              className="space-y-4"
            >
              {/* Confetti-like burst animation on the icon */}
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.25, 1] }}
                  transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                  className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </motion.div>
              </div>

              {/* Floating particles */}
              <div className="relative flex justify-center">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: ["#FF6B2B", "#4ECDC4", "#FFD700", "#FF69B4", "#7B68EE", "#00CED1"][i],
                    }}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
                    animate={{
                      opacity: [1, 1, 0],
                      x: [(i % 3 - 1) * 20, (i % 3 - 1) * 60],
                      y: [0, -(40 + i * 10)],
                      scale: [0, 1, 0.5],
                    }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }}
                  />
                ))}
              </div>

              <h1 className="text-2xl font-display font-bold text-foreground">
                Bem-vindo à Logia Business!
              </h1>
              <p className="text-muted-foreground text-sm">
                Seu acesso foi ativado com sucesso. Redirecionando para os cursos...
              </p>
              <Button
                className="mt-2"
                onClick={() => router.push("/classroom")}
              >
                Ir para os cursos agora
              </Button>
            </motion.div>
          )}

          {state === "timeout" && (
            <motion.div
              key="timeout"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-yellow-600" />
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Recebemos seu pagamento!
              </h1>
              <p className="text-muted-foreground text-sm">
                Seu acesso será ativado em instantes. Se demorar, atualize a
                página ou acesse os cursos diretamente.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setState("polling");
                    setAttempts(0);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Verificar novamente
                </Button>
                <Button onClick={() => router.push("/classroom")}>
                  Acessar cursos
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
