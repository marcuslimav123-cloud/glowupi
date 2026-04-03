import React, { useState } from "react";
import { apiUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { APP_NAME } from "@/lib/utils";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#0f0f0f] via-[#141210] to-[#0f0f0f]">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5">
            <img src="/logo-icon.png" alt="Glow Upi" className="h-28 w-28 object-contain" />
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">{APP_NAME}</h1>
        </div>

        {sent ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Email Enviado!</h2>
            <p className="text-white/60 text-sm">
              Se o email <strong className="text-white">{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <p className="text-white/40 text-xs">Verifique também sua caixa de spam.</p>
            <a href="/login" className="inline-flex items-center gap-2 text-primary text-sm hover:underline mt-4">
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">Esqueceu sua senha?</h2>
              <p className="text-white/40 text-sm mt-1">Informe seu email para receber o link de recuperação</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">{error}</div>
            )}

            <div className="space-y-2">
              <Label className="text-white/70 text-[13px]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar Link de Recuperação
            </Button>

            <div className="text-center">
              <a href="/login" className="inline-flex items-center gap-2 text-white/40 text-sm hover:text-white/60 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Voltar ao login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
