"use client";

import React from "react";
import Link from "next/link";
import { XCircle, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { paymentsApi, ApiError } from "../../../lib/api";

export default function CheckoutCancelPage() {
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleTryAgain = async () => {
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center space-y-5"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Ops! Sua assinatura não foi concluída.
          </h1>
          <p className="text-muted-foreground text-sm">
            Você cancelou o processo de pagamento. Não se preocupe — nenhuma
            cobrança foi feita.
          </p>
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleTryAgain}
            disabled={isRedirecting}
            className="gap-2"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando...
              </>
            ) : (
              "Tentar novamente"
            )}
          </Button>

          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o início
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
