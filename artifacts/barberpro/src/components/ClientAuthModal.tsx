import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";

interface ClientUser {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
}

interface ClientAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: ClientUser) => void;
  accentColor?: string;
}

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");

function getContrastColor(hex: string): string {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  if (c.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(c)) return "#ffffff";
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const toLinear = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.4 ? "#000000" : "#ffffff";
}

export default function ClientAuthModal({ open, onClose, onAuthenticated, accentColor = "#C4943C" }: ClientAuthModalProps) {
  const accentTextColor = getContrastColor(accentColor);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regTelefone, setRegTelefone] = useState("");
  const [regSenha, setRegSenha] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, senha: loginSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao fazer login");
      onAuthenticated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!regNome || !regEmail || !regSenha) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/client/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome: regNome, email: regEmail, telefone: regTelefone, senha: regSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar");
      onAuthenticated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin(credential: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/client/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao autenticar com Google");
      onAuthenticated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const googleClientId = sessionStorage.getItem("googleClientId");
    if (!googleClientId) return;

    const existing = document.getElementById("google-signin-script");
    if (existing) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.id = "google-signin-script";
    script.async = true;
    script.onload = () => renderGoogleButton();
    document.head.appendChild(script);

    function renderGoogleButton() {
      const container = document.getElementById("google-signin-btn");
      if (!container || !(window as any).google) return;
      container.innerHTML = "";
      (window as any).google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: any) => {
          if (response.credential) handleGoogleLogin(response.credential);
        },
      });
      (window as any).google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "continue_with",
        shape: "pill",
      });
    }
  }, [open, tab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-white/40 hover:text-white z-10">
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          <h2 className="text-xl font-bold text-white mb-1 text-center">
            {tab === "login" ? "Entrar na sua conta" : "Criar conta"}
          </h2>
          <p className="text-white/40 text-sm text-center mb-6">
            {tab === "login" ? "Faça login para agendar" : "Cadastre-se para agendar"}
          </p>

          <div className="flex bg-white/5 rounded-full p-1 mb-6">
            <button
              onClick={() => { setTab("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${tab === "login" ? "" : "text-white/40"}`}
              style={tab === "login" ? { backgroundColor: accentColor, color: accentTextColor } : {}}
            >
              Entrar
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${tab === "register" ? "" : "text-white/40"}`}
              style={tab === "register" ? { backgroundColor: accentColor, color: accentTextColor } : {}}
            >
              Cadastrar
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30 pr-10"
                    placeholder="Sua senha"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor, color: accentTextColor }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Nome *</label>
                <input
                  type="text"
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">E-mail *</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">WhatsApp</label>
                <input
                  type="tel"
                  value={regTelefone}
                  onChange={(e) => setRegTelefone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Senha *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30 pr-10"
                    placeholder="Crie uma senha"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor, color: accentTextColor }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
              </button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/25 text-xs">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div id="google-signin-btn" className="flex justify-center" />

          <p className="text-white/30 text-xs text-center mt-6">
            {tab === "login" ? (
              <>Não tem conta? <button onClick={() => { setTab("register"); setError(""); }} className="underline hover:text-white/60" style={{ color: accentColor }}>Cadastre-se</button></>
            ) : (
              <>Já tem conta? <button onClick={() => { setTab("login"); setError(""); }} className="underline hover:text-white/60" style={{ color: accentColor }}>Entrar</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
