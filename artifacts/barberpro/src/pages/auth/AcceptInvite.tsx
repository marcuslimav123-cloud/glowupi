import React, { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { apiUrl, APP_NAME, getRoleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

interface InviteInfo {
  email: string;
  role: string;
  nomeConvidado?: string;
  estabelecimento: string;
}

export default function AcceptInvite() {
  const [, params] = useRoute("/convite/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = params?.token || "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const googleInitRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl(`/convites/token/${token}`))
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvite(data);
        }
      })
      .catch(() => setError("Erro ao carregar convite"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!invite) return;

    const timeout = setTimeout(() => {
      if (!googleInitRef.current) setGoogleFailed(true);
    }, 5000);

    fetch(apiUrl("/lgpd/google-client-id"))
      .then(r => r.json())
      .then(data => {
        if (data.clientId) loadGoogleScript(data.clientId);
        else setGoogleFailed(true);
      })
      .catch(() => setGoogleFailed(true));

    return () => clearTimeout(timeout);
  }, [invite]);

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
    const container = document.getElementById("google-accept-btn");
    if (container) {
      (window as any).google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 340,
        text: "continue_with",
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
      const res = await fetch(apiUrl(`/convites/accept/${token}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Conta criada!", description: "Bem-vinda à equipe!" });
      window.location.href = "/dashboard";
    } catch {
      toast({ title: "Erro", description: "Falha ao aceitar convite", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-red-500/8 flex items-center justify-center mx-auto">
            <Sparkles className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-foreground mb-2">Convite Inválido</h1>
            <p className="text-foreground/45 text-[14px]">{error}</p>
          </div>
          <Button onClick={() => setLocation("/login")} variant="outline" className="rounded-xl h-10 text-[13px]">
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-6">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-14 w-14 object-contain mx-auto" />
          </div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight mb-1">
            Bem-vinda ao {APP_NAME}
          </h1>
          <p className="text-foreground/45 text-[14px]">
            Você foi convidada para <span className="font-medium text-foreground/70">{invite?.estabelecimento}</span> como <span className="font-medium text-foreground/70">{getRoleLabel(invite?.role || "")}</span>
          </p>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-7 shadow-xl shadow-black/[0.03]">
          <div className="text-center mb-5">
            <p className="text-[13px] text-foreground/50">
              Para aceitar o convite, entre com a conta Google do e-mail:
            </p>
            <p className="text-[14px] font-semibold text-foreground mt-1">{invite?.email}</p>
          </div>

          {!googleFailed ? (
            <div className="flex flex-col items-center gap-3">
              <div id="google-accept-btn" className="flex justify-center min-h-[44px]" />
              {googleLoading && (
                <div className="flex items-center gap-2 text-[13px] text-foreground/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando sua conta...
                </div>
              )}
              {!googleReady && !googleLoading && (
                <div className="flex items-center gap-2 text-[13px] text-foreground/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-[13px] text-foreground/50 mb-3">
                Para aceitar o convite, abra este link em uma nova aba do navegador.
              </p>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-black/[0.04]">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-foreground/40 leading-relaxed">
                Ao entrar com o Google, sua conta será criada automaticamente e você terá acesso ao sistema de <strong>{invite?.estabelecimento}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
