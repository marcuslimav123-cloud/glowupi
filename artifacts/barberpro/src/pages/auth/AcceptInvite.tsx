import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { apiUrl, APP_NAME, getRoleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Eye, EyeOff } from "lucide-react";

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
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl(`/convites/token/${token}`))
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvite(data);
          if (data.nomeConvidado) setNome(data.nomeConvidado);
        }
      })
      .catch(() => setError("Erro ao carregar convite"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/convites/accept/${token}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Conta criada!", description: "Bem-vinda à equipe!" });
      setLocation("/agenda");
    } catch {
      toast({ title: "Erro", description: "Falha ao aceitar convite", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

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
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight mb-1">
            Bem-vinda ao {APP_NAME}
          </h1>
          <p className="text-foreground/45 text-[14px]">
            Você foi convidada para <span className="font-medium text-foreground/70">{invite?.estabelecimento}</span> como <span className="font-medium text-foreground/70">{getRoleLabel(invite?.role || "")}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Email</label>
            <Input
              value={invite?.email || ""}
              disabled
              className="rounded-xl h-11 text-[14px] bg-black/[0.02]"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Seu Nome</label>
            <Input
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Como deseja ser chamada"
              className="rounded-xl h-11 text-[14px]"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground/60 mb-1.5 block">Criar Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="rounded-xl h-11 text-[14px] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full rounded-xl h-11 text-[14px] font-medium mt-2">
            {submitting ? "Criando conta..." : "Aceitar Convite e Criar Conta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
