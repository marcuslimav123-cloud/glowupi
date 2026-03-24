import React, { useState, useEffect } from "react";
import { useLoginUser } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
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
  const [googleClientId, setGoogleClientId] = useState("");

  useEffect(() => {
    fetch(apiUrl("/lgpd/google-client-id"))
      .then(r => r.json())
      .then(data => {
        if (data.clientId) {
          setGoogleClientId(data.clientId);
          loadGoogleScript(data.clientId);
        }
      })
      .catch(() => {});
  }, []);

  const loadGoogleScript = (clientId: string) => {
    if (document.getElementById("google-gsi-script")) return;
    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleButton(clientId);
    document.head.appendChild(script);
  };

  const initGoogleButton = (clientId: string) => {
    if (!window.google) return;
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
        width: "100%",
        text: "signin_with",
        shape: "pill",
        locale: "pt-BR",
      });
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
      window.location.href = "/dashboard";
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
      toast({
        title: "Erro no login",
        description: err.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-100/10 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4 shadow-lg shadow-primary/15">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display text-foreground text-center">{APP_NAME}</h1>
          <p className="text-muted-foreground mt-2">{APP_TAGLINE}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                className="h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <a href="#" className="text-sm text-primary hover:underline">Esqueceu a senha?</a>
              </div>
              <Input 
                id="senha" 
                type="password" 
                className="h-12"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {googleClientId && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
                </div>
              </div>
              <div id="google-signin-btn" className="flex justify-center" />
              {googleLoading && (
                <p className="text-center text-sm text-muted-foreground mt-2">Autenticando com Google...</p>
              )}
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
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
