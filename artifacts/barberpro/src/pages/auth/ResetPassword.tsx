import React, { useState } from "react";
import { apiUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { APP_NAME } from "@/lib/utils";

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (novaSenha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
        <div className="w-full max-w-[380px] text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Link Inválido</h2>
          <p className="text-white/60 text-sm">O link de recuperação é inválido ou expirou.</p>
          <a href="/esqueci-senha" className="text-primary text-sm hover:underline">Solicitar novo link</a>
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
          <h1 className="text-[28px] font-bold text-white tracking-tight">{APP_NAME}</h1>
        </div>

        {success ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Senha Redefinida!</h2>
            <p className="text-white/60 text-sm">Sua senha foi alterada com sucesso.</p>
            <a href="/login" className="inline-block mt-4 bg-primary hover:bg-primary/90 text-black font-bold px-6 py-3 rounded-xl transition-colors">
              Fazer Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">Nova Senha</h2>
              <p className="text-white/40 text-sm mt-1">Defina sua nova senha</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">{error}</div>
            )}

            <div className="space-y-2">
              <Label className="text-white/70 text-[13px]">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="password"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-[13px]">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="password"
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Redefinir Senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
