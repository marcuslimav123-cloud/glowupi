import React, { useState, useEffect } from "react";
import { useRegisterUser } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/utils";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegisterUser();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: ""
  });
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
    if (!(window as any).google) return;
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
        width: "100%",
        text: "signup_with",
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
      if (!res.ok) throw new Error(data.error || "Falha no cadastro com Google");
      window.location.href = "/onboarding/barbearia";
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync({ data: formData });
      window.location.href = "/onboarding/barbearia";
    } catch (err: any) {
      toast({
        title: "Erro no cadastro",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-100/10 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4 shadow-lg shadow-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display text-foreground text-center">Criar Conta</h1>
          <p className="text-primary mt-2 font-medium tracking-wide">30 DIAS GRÁTIS</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" required value={formData.nome} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={formData.email} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">WhatsApp</Label>
              <Input id="telefone" required value={formData.telefone} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required value={formData.senha} onChange={handleChange} />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold mt-4 shadow-lg shadow-primary/20"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Criando..." : "Começar Agora"}
            </Button>
          </form>

          {googleClientId && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou cadastre-se com</span>
                </div>
              </div>
              <div id="google-signup-btn" className="flex justify-center" />
              {googleLoading && (
                <p className="text-center text-sm text-muted-foreground mt-2">Cadastrando com Google...</p>
              )}
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
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
