import React, { useState, useEffect } from "react";
import { useRegisterUser } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, formatPhone, stripPhone } from "@/lib/utils";

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
    const { id, value } = e.target;
    if (id === "telefone") {
      setFormData(prev => ({ ...prev, telefone: formatPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync({ data: { ...formData, telefone: stripPhone(formData.telefone) } });
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa]">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-10">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-5">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-[28px] font-bold text-foreground tracking-tight">Criar Conta</h1>
          <p className="text-primary text-[13px] font-medium mt-1 tracking-wide">30 DIAS GRÁTIS</p>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-7 shadow-xl shadow-black/[0.03]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-[13px] text-foreground/60">Nome Completo</Label>
              <Input id="nome" required value={formData.nome} onChange={handleChange} className="h-11 rounded-xl bg-[#fafafa] border-black/[0.06] focus:bg-white transition-colors text-[14px]" />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] text-foreground/60">E-mail</Label>
              <Input id="email" type="email" required value={formData.email} onChange={handleChange} className="h-11 rounded-xl bg-[#fafafa] border-black/[0.06] focus:bg-white transition-colors text-[14px]" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-[13px] text-foreground/60">WhatsApp</Label>
              <Input id="telefone" required value={formData.telefone} onChange={handleChange} placeholder="(99) 99999-9999" className="h-11 rounded-xl bg-[#fafafa] border-black/[0.06] focus:bg-white transition-colors text-[14px]" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-[13px] text-foreground/60">Senha</Label>
              <Input id="senha" type="password" required value={formData.senha} onChange={handleChange} className="h-11 rounded-xl bg-[#fafafa] border-black/[0.06] focus:bg-white transition-colors text-[14px]" />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-[14px] font-medium rounded-xl mt-2"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Criando..." : "Começar Agora"}
            </Button>
          </form>

          {googleClientId && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/[0.06]"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-white px-3 text-foreground/30">ou cadastre-se com</span>
                </div>
              </div>
              <div id="google-signup-btn" className="flex justify-center" />
              {googleLoading && (
                <p className="text-center text-[13px] text-foreground/40 mt-2">Cadastrando com Google...</p>
              )}
            </>
          )}

          <div className="mt-6 text-center text-[13px] text-foreground/40">
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
