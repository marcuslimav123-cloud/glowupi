import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles, LogIn, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, apiUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error || "Credenciais inválidas", variant: "destructive" });
        return;
      }
      localStorage.setItem("admin_user", JSON.stringify(data));
      setLocation("/admin");
    } catch {
      toast({ title: "Erro", description: "Erro ao conectar ao servidor", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-10">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-[24px] font-bold text-white tracking-tight">{APP_NAME}</h1>
          <p className="text-white/30 text-[13px] mt-1">Painel Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-white/50 text-[13px]">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@glowagenda.com"
              required
              className="bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 h-11 rounded-xl text-[14px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/50 text-[13px]">Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/[0.06] border-white/[0.08] text-white placeholder:text-white/20 pr-10 h-11 rounded-xl text-[14px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-[14px] font-medium rounded-xl" disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-[13px] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
