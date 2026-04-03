import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/utils";

export default function Register() {
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const googleInitRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [freeTrialEnabled, setFreeTrialEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(apiUrl("/checkout/pricing-config"))
      .then(r => r.json())
      .then(data => {
        const enabled = data.freeTrialEnabled !== false;
        setFreeTrialEnabled(enabled);
        if (!enabled) {
          window.location.href = "/";
        }
      })
      .catch(() => {
        setFreeTrialEnabled(false);
        window.location.href = "/";
      });
  }, []);

  useEffect(() => {
    if (freeTrialEnabled === false) return;

    const timeout = setTimeout(() => {
      if (!googleInitRef.current) setGoogleFailed(true);
    }, 4000);

    fetch(apiUrl("/lgpd/google-client-id"))
      .then(r => r.json())
      .then(data => {
        if (data.clientId) {
          loadGoogleScript(data.clientId);
        } else {
          setGoogleFailed(true);
        }
      })
      .catch(() => setGoogleFailed(true));

    return () => clearTimeout(timeout);
  }, [freeTrialEnabled]);

  const loadGoogleScript = (clientId: string) => {
    if (document.getElementById("google-gsi-script")) {
      initGoogleButton(clientId);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleButton(clientId);
    script.onerror = () => setGoogleFailed(true);
    document.head.appendChild(script);
  };

  const initGoogleButton = (clientId: string) => {
    if (!(window as any).google) { setGoogleFailed(true); return; }
    (window as any).google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
    });
    const container = document.getElementById("google-signup-btn");
    if (container) {
      (window as any).google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 340,
        text: "signup_with",
        shape: "pill",
        locale: "pt-BR",
      });
      googleInitRef.current = true;
      setGoogleReady(true);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    setGoogleLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no cadastro com Google");
      if (data.isNew || !data.user?.telefone) {
        window.location.href = "/completar-perfil";
      } else {
        window.location.href = "/onboarding/barbearia";
      }
    } catch (err: any) {
      toast({
        title: "Erro no cadastro com Google",
        description: err.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (freeTrialEnabled === null || freeTrialEnabled === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
        <div className="w-full max-w-[420px] text-center">
          <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-10 shadow-xl shadow-black/20 backdrop-blur-sm">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-green-400" />
              </div>
            </div>
            <h2 className="text-[22px] font-bold text-white tracking-tight mb-2">
              Cadastro Realizado!
            </h2>
            <p className="text-white/50 text-[14px] mb-8">
              Sua conta foi criada com sucesso. Agora vamos configurar seu estabelecimento.
            </p>
            <Button
              className="w-full h-12 text-[15px] font-semibold rounded-xl"
              onClick={() => { window.location.href = "/onboarding/barbearia"; }}
            >
              Clique aqui e comece a Usar!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-28 w-28 object-contain" />
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">Criar Conta</h1>
          <p className="text-primary text-[13px] font-medium mt-1 tracking-wide">30 DIAS GRÁTIS</p>
        </div>

        <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-7 shadow-xl shadow-black/20 backdrop-blur-sm">
          <div className="text-center mb-6">
            <p className="text-white/50 text-[14px]">
              Crie sua conta usando o Google para garantir a segurança do seu e-mail verificado.
            </p>
          </div>

          {!googleFailed ? (
            <div className="flex flex-col items-center gap-3">
              <div id="google-signup-btn" className="flex justify-center min-h-[44px]" />
              {googleLoading && (
                <div className="flex items-center gap-2 text-[13px] text-white/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cadastrando com Google...
                </div>
              )}
              {!googleReady && !googleLoading && (
                <div className="flex items-center gap-2 text-[13px] text-white/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-[13px] text-white/50 mb-3">
                Para se cadastrar, abra esta página em uma nova aba do navegador.
              </p>
              <p className="text-[12px] text-white/30">
                O login com Google não funciona dentro do preview. Clique no ícone de "abrir em nova aba" no canto superior.
              </p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-white/40 leading-relaxed">
                Ao criar sua conta com o Google, garantimos que seu e-mail é real e verificado. Seus dados são protegidos pela LGPD.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-[13px] text-white/40">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Fazer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
