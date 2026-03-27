import React, { useState, useEffect, useRef } from "react";
import { useLoginUser } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_NAME, APP_TAGLINE, apiUrl } from "@/lib/utils";

declare global {
  interface Window {
    google?: any;
    handleGoogleCallback?: (response: any) => void;
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLoginUser();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const googleInitRef = useRef(false);

  useEffect(() => {
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
  }, []);

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
    if (!window.google) { setGoogleFailed(true); return; }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
    });
    const container = document.getElementById("google-signin-btn");
    if (container) {
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 340,
        text: "signin_with",
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
      if (!res.ok) throw new Error(data.error || "Falha no login com Google");
      if (data.isNew || !data.user?.telefone) {
        window.location.href = "/completar-perfil";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      toast({
        title: "Erro no login com Google",
        description: err.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ data: { email, senha } });
      window.location.href = "/dashboard";
    } catch (err: any) {
      const errorData = err?.response?.data || err?.data;
      if (errorData?.isAdmin) {
        toast({
          title: "Login de Administrador",
          description: "Redirecionando para o painel admin...",
        });
        setTimeout(() => setLocation("/admin/login"), 1500);
        return;
      }
      toast({
        title: "Erro no login",
        description: errorData?.error || err.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa]">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-[28px] font-bold text-foreground tracking-tight">{APP_NAME}</h1>
          <p className="text-foreground/40 text-[14px] mt-1">{APP_TAGLINE}</p>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-7 shadow-xl shadow-black/[0.03]">
          {!googleFailed && (
            <div className="flex flex-col items-center gap-3 mb-5">
              <div id="google-signin-btn" className="flex justify-center min-h-[44px]" />
              {googleLoading && (
                <div className="flex items-center gap-2 text-[13px] text-foreground/40">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Autenticando com Google...
                </div>
              )}
            </div>
          )}

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/[0.06]"></div>
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white px-3 text-foreground/30">ou com e-mail</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] text-foreground/60">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="h-11 rounded-xl bg-[#fafafa] border-black/[0.06] focus:bg-white transition-colors text-[14px]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-[13px] text-foreground/60">Senha</Label>
                <a href="#" className="text-[12px] text-primary hover:underline">Esqueceu?</a>
              </div>
              <Input
                id="senha"
                type="password"
                className="h-11 rounded-xl bg-[#fafafa] border-black/[0.06] focus:bg-white transition-colors text-[14px]"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-[14px] font-medium rounded-xl"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center text-[13px] text-foreground/40">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-primary hover:underline font-medium">
              Teste 30 dias grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
