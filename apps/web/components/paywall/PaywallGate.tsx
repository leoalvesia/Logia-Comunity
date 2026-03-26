"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { paymentsApi, ApiError } from "../../lib/api";
import { useSubscription } from "../../hooks/useSubscription";

interface PaywallGateProps {
  /** The lesson/content to render (shown blurred when locked). */
  children: React.ReactNode;
  /**
   * Pass `true` when the user IS allowed to see the content.
   * Typically: `!(!course.is_free && !user?.is_paid)`
   */
  isPaid: boolean;
}

const BENEFITS = [
  "Acesso a todos os cursos",
  "Aulas ao vivo semanais",
  "Suporte direto com o founder",
  "Comunidade VIP",
];

export function PaywallGate({ children, isPaid }: PaywallGateProps) {
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { isPastDue } = useSubscription();

  const handleUpgrade = async () => {
    setIsRedirecting(true);
    setError(null);
    try {
      const { checkout_url } = await paymentsApi.checkout();
      window.location.href = checkout_url;
    } catch (err) {
      setIsRedirecting(false);
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Não foi possível iniciar o checkout. Tente novamente.");
      }
    }
  };

  const handleUpdatePayment = async () => {
    setIsRedirecting(true);
    setError(null);
    try {
      const { portal_url } = await paymentsApi.portal();
      window.location.href = portal_url;
    } catch (err) {
      setIsRedirecting(false);
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Não foi possível abrir o portal. Tente novamente.");
      }
    }
  };

  // Content is accessible — render normally
  if (isPaid) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred preview of the content */}
      <div
        className="blur-sm pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <AnimatePresence>
        <motion.div
          key="paywall-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10 rounded-lg"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="bg-surface border border-border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
          >
            {isPastDue ? (
              <>
                {/* Past-due state */}
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Lock className="h-7 w-7 text-yellow-600" />
                  </div>
                </div>
                <h2 className="text-xl font-display font-bold text-foreground mb-2">
                  Pagamento pendente
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Seu pagamento está pendente. Atualize seu método de pagamento
                  para continuar com acesso ilimitado.
                </p>
                {error && (
                  <p className="text-xs text-destructive mb-4">{error}</p>
                )}
                <Button
                  className="w-full"
                  onClick={handleUpdatePayment}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecionando...
                    </>
                  ) : (
                    "Atualizar pagamento"
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Upsell state */}
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h2 className="text-xl font-display font-bold text-foreground mb-2">
                  Conteúdo exclusivo para membros
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Faça upgrade para ter acesso ilimitado a todos os cursos e aulas.
                </p>

                {/* Benefits list */}
                <ul className="text-left space-y-2 mb-6">
                  {BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                {error && (
                  <p className="text-xs text-destructive mb-4">{error}</p>
                )}

                <Button
                  className="w-full"
                  onClick={handleUpgrade}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecionando...
                    </>
                  ) : (
                    "Fazer Upgrade"
                  )}
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
