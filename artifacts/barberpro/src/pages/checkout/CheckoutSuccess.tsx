import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Loader2, Clock } from "lucide-react";
import { APP_NAME, apiUrl } from "@/lib/utils";

type Status = "loading" | "ativo" | "processing";

export default function CheckoutSuccess() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    document.documentElement.classList.add("dark");

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const checkStatus = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const res = await fetch(apiUrl("/auth/me"), { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const subStatus = data.user?.barbearia?.subscriptionStatus;
          if (subStatus === "ativo") {
            setStatus("ativo");
            return;
          }
        }
      } catch {}

      if (attempts >= maxAttempts) {
        setStatus("processing");
      } else {
        setTimeout(checkStatus, 2000);
      }
    };

    setTimeout(checkStatus, 2000);

    return () => {
      cancelled = true;
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-white/40 text-[14px]">Confirmando seu pagamento...</p>
            <p className="text-white/25 text-[12px]">Isso pode levar alguns segundos</p>
          </div>
        )}

        {status === "processing" && (
          <div className="space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-white mb-2">
                Pagamento Recebido
              </h1>
              <p className="text-white/45 text-[14px] leading-relaxed">
                Seu pagamento está sendo processado. A ativação pode levar alguns instantes.
                Você receberá acesso assim que a confirmação for concluída.
              </p>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-xl h-11 text-[14px] font-medium border-white/10 text-white/60 hover:text-white"
              onClick={() => {
                setStatus("loading");
                window.location.reload();
              }}
            >
              Verificar Novamente
            </Button>
          </div>
        )}

        {status === "ativo" && (
          <div className="space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-white mb-2">
                Assinatura Ativada!
              </h1>
              <p className="text-white/45 text-[14px] leading-relaxed">
                Parabéns! Sua assinatura do {APP_NAME} foi ativada com sucesso.
                Agora vamos configurar seu estabelecimento.
              </p>
            </div>
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-4 text-left space-y-2">
              <p className="text-[13px] text-white/40">Próximos passos:</p>
              <ul className="text-[13px] space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span className="text-white/60">Complete o perfil do seu estabelecimento</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span className="text-white/60">Cadastre seus serviços e profissionais</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span className="text-white/60">Comece a receber agendamentos</span>
                </li>
              </ul>
            </div>
            <Link href="/completar-perfil">
              <Button size="lg" className="w-full rounded-xl h-11 text-[14px] font-medium">
                Configurar meu Estabelecimento <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
