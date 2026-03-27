import React, { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const LGPD_CONSENT_KEY = "glow_up_lgpd_consent";
const LGPD_CONSENT_LEVEL_KEY = "glow_up_lgpd_level";

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
      <div className="max-w-3xl mx-auto bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/[0.08] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Cookie className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-[13px] text-foreground/50 leading-relaxed">
              Utilizamos cookies para melhorar sua experiência.
              Ao continuar, você concorda com nossa{" "}
              <Link href="/politica-de-privacidade" className="text-primary hover:underline font-medium">
                Política de Privacidade
              </Link>{" "}
              e{" "}
              <Link href="/termos-de-uso" className="text-primary hover:underline font-medium">
                Termos de Uso
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAccept("essential")}
              className="text-[12px] h-8 rounded-full flex-1 sm:flex-none border-border text-foreground/50"
            >
              Essenciais
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept("all")}
              className="text-[12px] h-8 rounded-full flex-1 sm:flex-none"
            >
              Aceitar todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
