import React from "react";
import { Link } from "wouter";
import { Sparkles, ArrowLeft, LifeBuoy, Mail, Clock, MessageCircle } from "lucide-react";
import { APP_NAME } from "@/lib/utils";

const SUPPORT_EMAIL = "suporte@glowupi.com";

export default function Suporte() {
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
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="block bg-white border border-black/[0.04] rounded-2xl p-6 hover:border-primary/30 transition"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-foreground mb-1">E-mail de suporte</h2>
                <p className="text-[13px] text-foreground/55 mb-2">
                  Toque para enviar um e-mail. Respondemos em até 1 dia útil.
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
                  <li><strong className="text-foreground">Como excluo minha conta?</strong> Envie um e-mail para {SUPPORT_EMAIL} com o assunto "Excluir conta". Processaremos em até 30 dias.</li>
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
