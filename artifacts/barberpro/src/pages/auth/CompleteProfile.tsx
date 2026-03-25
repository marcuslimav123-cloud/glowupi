import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, formatPhone, stripPhone } from "@/lib/utils";

export default function CompleteProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [hasBarbearia, setHasBarbearia] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/auth/me"), { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(data => {
        if (data.nome) setUserName(data.nome);
        if (data.telefone) {
          setTelefone(formatPhone(data.telefone));
        }
        if (data.barbeariaId) {
          setHasBarbearia(true);
        }
      })
      .catch(() => {
        setLocation("/login");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stripped = stripPhone(telefone);
    if (stripped.length < 10) {
      toast({ title: "WhatsApp inválido", description: "Digite um número com DDD.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/complete-profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ telefone: stripped }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }
      if (hasBarbearia) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/onboarding/barbearia";
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa]">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-10">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-5">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-[28px] font-bold text-foreground tracking-tight">Quase lá!</h1>
          <p className="text-foreground/40 text-[14px] mt-1">
            {userName ? `Olá, ${userName.split(" ")[0]}!` : ""} Complete seu cadastro
          </p>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-7 shadow-xl shadow-black/[0.03]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-[13px] text-foreground/60">WhatsApp</Label>
              <Input
                id="telefone"
                required
                value={telefone}
                onChange={e => setTelefone(formatPhone(e.target.value))}
                placeholder="(99) 91234-5678"
                className="h-11 rounded-xl bg-[#fafafa] border-black/[0.06] focus:bg-white transition-colors text-[14px]"
              />
              <p className="text-[11px] text-foreground/30">Usaremos para notificações e lembretes</p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-[14px] font-medium rounded-xl"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Continuar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
