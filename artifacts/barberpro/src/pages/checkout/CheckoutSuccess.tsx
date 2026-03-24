import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { APP_NAME } from "@/lib/utils";

export default function CheckoutSuccess() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {loading ? (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Processando seu pagamento...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-20 w-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                Assinatura Ativada!
              </h1>
              <p className="text-muted-foreground">
                Parabéns! Sua assinatura do {APP_NAME} foi ativada com sucesso.
                Você já pode aproveitar todos os recursos do seu plano.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
              <p className="text-sm text-muted-foreground">Próximos passos:</p>
              <ul className="text-sm space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>Configure sua equipe de profissionais</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>Cadastre seus serviços</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>Comece a receber agendamentos</span>
                </li>
              </ul>
            </div>
            <Link href="/dashboard">
              <Button size="lg" className="w-full shadow-lg shadow-primary/25">
                Ir para o Painel <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
