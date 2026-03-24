import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/utils";

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
          <XCircle className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-foreground mb-2">
            Pagamento Cancelado
          </h1>
          <p className="text-foreground/45 text-[14px] leading-relaxed">
            O processo de pagamento foi cancelado. Nenhuma cobrança foi realizada.
            Você pode tentar novamente quando quiser.
          </p>
        </div>
        <div className="bg-white border border-black/[0.06] rounded-xl p-4 text-[13px] text-foreground/45">
          <p>
            Você ainda pode usar o {APP_NAME} durante o período de teste gratuito.
            Escolha um plano a qualquer momento para continuar após o período de teste.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/#precos">
            <Button size="lg" className="w-full rounded-xl h-11 text-[14px] font-medium">
              Ver Planos Novamente
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="w-full rounded-xl h-11 text-[14px]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Painel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
