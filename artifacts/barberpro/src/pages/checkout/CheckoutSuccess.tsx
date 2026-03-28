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
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {loading ? (
          <div className="space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-foreground/40 text-[14px]">Processando seu pagamento...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-foreground mb-2">
                Assinatura Ativada!
              </h1>
              <p className="text-foreground/45 text-[14px] leading-relaxed">
                Parabéns! Sua assinatura do {APP_NAME} foi ativada com sucesso.
                Você já pode aproveitar todos os recursos do seu plano.
              </p>
            </div>
            <div className="bg-white border border-black/[0.06] rounded-xl p-4 text-left space-y-2">
              <p className="text-[13px] text-foreground/40">Próximos passos:</p>
              <ul className="text-[13px] space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-foreground/60">Configure sua equipe de profissionais</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-foreground/60">Cadastre seus serviços</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-foreground/60">Comece a receber agendamentos</span>
                </li>
              </ul>
            </div>
            <Link href="/dashboard">
              <Button size="lg" className="w-full rounded-xl h-11 text-[14px] font-medium">
                Ir para o Painel <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
