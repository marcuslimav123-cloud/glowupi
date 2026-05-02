import React, { useState } from "react";
import { Link } from "wouter";
import { Sparkles, ArrowLeft, LifeBuoy, Mail, Clock, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { APP_NAME } from "@/lib/utils";

const SUPPORT_EMAIL = "suporte@glowupi.com";

export default function Suporte() {
  const [form, setForm] = useState({ nome: "", email: "", assunto: "", mensagem: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro ao enviar");
      setSent(true);
      setForm({ nome: "", email: "", assunto: "", mensagem: "" });
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar a mensagem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-black/[0.04] bg-white/80 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-[740px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[14px] text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {APP_NAME}
          </Link>
        </div>
      </header>

      <main className="max-w-[740px] mx-auto px-6 py-14">
        <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline mb-8">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>

        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
            <LifeBuoy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-foreground">Suporte</h1>
            <p className="text-foreground/40 text-[13px]">Estamos aqui para ajudar você</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-black/[0.04] rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-foreground mb-1">Fale com a gente</h2>
                <p className="text-[13px] text-foreground/55">
                  Envie sua dúvida ou pedido. Respondemos em até 1 dia útil em <strong>{SUPPORT_EMAIL}</strong>.
                </p>
              </div>
            </div>

            {sent ? (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-semibold text-green-900 mb-1">Mensagem enviada!</p>
                  <p className="text-[13px] text-green-800">
                    Obrigado pelo contato. Você receberá nossa resposta em breve.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="text-[12px] text-primary hover:underline mt-2"
                  >
                    Enviar outra mensagem
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-foreground/70 mb-1">Seu nome</label>
                    <input
                      type="text"
                      required
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Maria Silva"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-foreground/70 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="voce@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground/70 mb-1">Assunto</label>
                  <input
                    type="text"
                    value={form.assunto}
                    onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Como podemos ajudar?"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground/70 mb-1">Mensagem</label>
                  <textarea
                    required
                    rows={5}
                    value={form.mensagem}
                    onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder="Descreva sua dúvida ou pedido..."
                    maxLength={5000}
                  />
                </div>
                {error && (
                  <p className="text-[13px] text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-[14px] font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Enviando..." : (<><Send className="h-4 w-4" /> Enviar mensagem</>)}
                </button>
              </form>
            )}
          </div>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="block bg-white border border-black/[0.04] rounded-2xl p-6 hover:border-primary/30 transition"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-foreground mb-1">E-mail direto</h2>
                <p className="text-[13px] text-foreground/55 mb-2">
                  Prefere usar seu próprio cliente de e-mail?
                </p>
                <p className="text-[13px] font-medium text-primary">{SUPPORT_EMAIL}</p>
              </div>
            </div>
          </a>

          <div className="bg-white border border-black/[0.04] rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-foreground mb-1">Horário de atendimento</h2>
                <p className="text-[13px] text-foreground/55">
                  Segunda a sexta, das 09h às 18h (horário de Brasília).
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-black/[0.04] rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-foreground mb-2">Perguntas frequentes</h2>
                <ul className="text-[13px] text-foreground/55 space-y-2">
                  <li><strong className="text-foreground">Como cancelo a assinatura no iPhone?</strong> Em Ajustes &gt; Apple ID &gt; Assinaturas, escolha {APP_NAME} Pro e toque em Cancelar Assinatura.</li>
                  <li><strong className="text-foreground">Como exporto meus dados?</strong> Acesse Configurações &gt; Privacidade no painel web. Conforme a LGPD, fornecemos seus dados em até 15 dias.</li>
                  <li><strong className="text-foreground">Como excluo minha conta?</strong> No app, vá em Menu &gt; Excluir conta. Ou envie um e-mail para {SUPPORT_EMAIL}.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/politica-de-privacidade" className="text-[13px] text-primary hover:underline">
            Política de Privacidade
          </Link>
          <span className="mx-2 text-foreground/30"></span>
          <Link href="/termos-de-uso" className="text-[13px] text-primary hover:underline">
            Termos de Uso
          </Link>
        </div>
      </main>

      <footer className="border-t border-black/[0.04] py-8 px-6 bg-white">
        <div className="max-w-[740px] mx-auto text-center text-[12px] text-foreground/30">
          &copy; {new Date().getFullYear()} {APP_NAME}
        </div>
      </footer>
    </div>
  );
}
