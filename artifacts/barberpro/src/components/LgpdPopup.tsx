import React, { useEffect, useState } from "react";
import { Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/utils";

const LGPD_CONSENT_KEY = "glow_agenda_lgpd_consent";

export default function LgpdPopup() {
  const [visible, setVisible] = useState(false);
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem(LGPD_CONSENT_KEY);
    if (consent) return;

    fetch(apiUrl("/lgpd/terms"))
      .then(r => r.json())
      .then(data => {
        setTerms(data.terms || "");
        setVisible(true);
      })
      .catch(() => setVisible(true))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = () => {
    localStorage.setItem(LGPD_CONSENT_KEY, new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-display text-foreground">Privacidade e Proteção de Dados</h2>
              <p className="text-sm text-muted-foreground">Lei Geral de Proteção de Dados (LGPD)</p>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {terms || "Ao usar nosso sistema, você concorda com o tratamento dos seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Coletamos e processamos dados como nome, e-mail, telefone e informações de agendamento para a prestação dos nossos serviços. Seus dados são armazenados com segurança e não são compartilhados com terceiros sem seu consentimento. Você tem o direito de acessar, corrigir, excluir seus dados ou revogar este consentimento a qualquer momento entrando em contato conosco."}
            </p>
          )}
        </div>

        <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleAccept}
            className="flex-1 h-12 text-base font-semibold shadow-lg shadow-primary/20"
          >
            Aceitar e Continuar
          </Button>
          <Button
            variant="outline"
            onClick={handleAccept}
            className="h-12"
          >
            Aceitar apenas necessários
          </Button>
        </div>
      </div>
    </div>
  );
}
