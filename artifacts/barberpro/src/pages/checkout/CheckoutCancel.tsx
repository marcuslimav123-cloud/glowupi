import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/utils";

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mx-auto">
          <XCircle className="h-10 w-10 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Pagamento Cancelado
          </h1>
          <p className="text-muted-foreground">
            O processo de pagamento foi cancelado. Nenhuma cobrança foi realizada.
            Você pode tentar novamente quando quiser.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">
          <p>
            Você ainda pode usar o {APP_NAME} durante o período de teste gratuito.
            Escolha um plano a qualquer momento para continuar após o período de teste.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/#precos">
            <Button size="lg" className="w-full">
              Ver Planos Novamente
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Painel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
