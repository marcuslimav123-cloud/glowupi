import React, { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const LGPD_CONSENT_KEY = "glow_agenda_lgpd_consent";
const LGPD_CONSENT_LEVEL_KEY = "glow_agenda_lgpd_level";

export default function LgpdBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(LGPD_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (level: "all" | "essential") => {
    localStorage.setItem(LGPD_CONSENT_KEY, new Date().toISOString());
    localStorage.setItem(LGPD_CONSENT_LEVEL_KEY, level);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-2xl shadow-black/10 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Cookie className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência.
              Ao continuar navegando, você concorda com nossa{" "}
              <Link href="/politica-de-privacidade" className="text-primary hover:underline font-medium">
                Política de Privacidade
              </Link>{" "}
              e nossos{" "}
              <Link href="/termos-de-uso" className="text-primary hover:underline font-medium">
                Termos de Uso
              </Link>
              , em conformidade com a LGPD (Lei nº 13.709/2018).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAccept("essential")}
              className="text-xs h-9 flex-1 sm:flex-none"
            >
              Apenas essenciais
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept("all")}
              className="text-xs h-9 shadow-md shadow-primary/20 flex-1 sm:flex-none"
            >
              Aceitar todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
