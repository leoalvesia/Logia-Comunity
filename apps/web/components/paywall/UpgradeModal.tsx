"use client";

import React from "react";
import { Lock, CheckCircle2, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { paymentsApi, ApiError } from "../../lib/api";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional context message shown above the standard copy. */
  reason?: string;
}

const PRICE_DISPLAY =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_DISPLAY ?? "R$ 97/mês";

const BENEFITS = [
  "Acesso a todos os cursos",
  "Aulas ao vivo semanais",
  "Suporte direto com o founder",
  "Comunidade VIP",
];

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-display font-bold">
            Conteúdo exclusivo para membros
          </DialogTitle>
          <DialogDescription className="text-center">
            {reason
              ? reason
              : "Faça upgrade para ter acesso ilimitado a todos os cursos e aulas."}
          </DialogDescription>
        </DialogHeader>

        {/* Pricing badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full">
            {PRICE_DISPLAY}
          </span>
        </div>

        {/* Benefits list */}
        <ul className="space-y-2 px-2">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
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
            "Fazer upgrade"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Cancelar a qualquer momento. Sem fidelidade.
        </p>
      </DialogContent>
    </Dialog>
  );
}
