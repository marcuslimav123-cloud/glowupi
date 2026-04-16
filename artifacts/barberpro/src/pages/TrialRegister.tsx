import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { apiUrl, APP_NAME } from "@/lib/utils";
import { getAttributionForCheckout } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function TrialRegister() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [errorMsg, setErrorMsg] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    checkToken();
  }, [token]);

  const checkToken = async () => {
    try {
      const res = await fetch(apiUrl(`/trial-link/${token}`));
      if (res.ok) {
        const data = await res.json();
        setValid(true);
        setTrialDays(data.trialDays);
      } else {
        const data = await res.json();
        if (data.code === "already_used") {
          setErrorMsg("Este link já foi utilizado. Cada link é válido para apenas um uso.");
        } else if (data.code === "expired") {
          setErrorMsg("Este link expirou. Solicite um novo link ao administrador.");
        } else {
          setErrorMsg("Link inválido ou não encontrado.");
        }
      }
    } catch {
      setErrorMsg("Erro ao verificar o link. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!nome.trim() || !email.trim() || !senha) {
      setFormError("Preencha todos os campos.");
      return;
    }
    if (senha.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/trial-link/${token}/register`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome: nome.trim(), email: email.trim().toLowerCase(), senha, utm: getAttributionForCheckout() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Erro ao criar conta.");
        return;
      }
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      setLocation("/complete-profile");
    } catch {
      setFormError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-white/40 text-sm">Verificando link...</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111] border border-white/[0.06] rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Link Inválido</h1>
          <p className="text-white/40 text-sm mb-6">{errorMsg}</p>
          <Button onClick={() => setLocation("/pdvd")} variant="outline" className="w-full">
            Ir para a Página Inicial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Trial Gratuito de {trialDays} Dias
          </div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-white/40 text-sm mt-2">
            Crie sua conta para começar seu período de teste gratuito
          </p>
        </div>

        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] text-white/60 mb-1.5 block">Nome completo</label>
              <Input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
                className="bg-black/30 border-white/[0.08]"
              />
            </div>
            <div>
              <label className="text-[13px] text-white/60 mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-black/30 border-white/[0.08]"
              />
            </div>
            <div>
              <label className="text-[13px] text-white/60 mb-1.5 block">Senha</label>
              <Input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-black/30 border-white/[0.08]"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-red-400 text-[13px] bg-red-400/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {formError}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {submitting ? "Criando conta..." : "Começar Trial Gratuito"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <ul className="text-[11px] text-white/30 space-y-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-emerald-400/60" />
                Acesso completo a todas as funcionalidades
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-emerald-400/60" />
                Sem necessidade de cartão de crédito
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-emerald-400/60" />
                Dados removidos automaticamente após 3 meses se não contratar
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
