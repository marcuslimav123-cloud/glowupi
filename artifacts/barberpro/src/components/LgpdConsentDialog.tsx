import React, { useState } from "react";
import { Shield, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface LgpdConsentDialogProps {
  open: boolean;
}

export default function LgpdConsentDialog({ open }: LgpdConsentDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  if (!open) return null;

  const handleAccept = async () => {
    if (!accepted) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/auth/lgpd-consent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tipo: "full" }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      }
    } catch (e) {
      console.error("lgpd consent error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1510] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-display text-white">Termos e Privacidade</h2>
              <p className="text-sm text-white/50">Precisamos do seu consentimento para continuar</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-white/70 leading-relaxed">
            Para utilizar a plataforma, é necessário que você leia e aceite nossos documentos legais conforme a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <div className="space-y-3">
            <a
              href="/politica-de-privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">Política de Privacidade</span>
                <p className="text-xs text-white/40">Clique para ler o documento completo</p>
              </div>
              <FileText className="h-4 w-4 text-white/30" />
            </a>
            <a
              href="/termos-de-uso"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">Termos de Uso</span>
                <p className="text-xs text-white/40">Clique para ler o documento completo</p>
              </div>
              <FileText className="h-4 w-4 text-white/30" />
            </a>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8 transition-colors select-none">
            <div className="mt-0.5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="sr-only"
              />
              <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                accepted
                  ? "bg-primary border-primary"
                  : "border-white/30 bg-transparent"
              }`}>
                {accepted && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              </div>
            </div>
            <span className="text-sm text-white/70 leading-relaxed">
              Li e aceito a <strong className="text-white">Política de Privacidade</strong> e os <strong className="text-white">Termos de Uso</strong> da plataforma.
            </span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <Button
            onClick={handleAccept}
            disabled={!accepted || saving}
            className="w-full h-11 text-sm font-medium gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Aceitar e Continuar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
