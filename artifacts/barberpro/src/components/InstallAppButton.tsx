import React, { useState } from "react";
import { useInstallPWA } from "@/hooks/useInstallPWA";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallAppButtonProps {
  nome?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function InstallAppButton({ nome, className = "", variant = "default", size = "default" }: InstallAppButtonProps) {
  const { canInstall, isInstalled, install, showIOSInstructions } = useInstallPWA();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (canInstall) {
      await install();
    } else if (showIOSInstructions) {
      setShowIOSModal(true);
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        <Download className="mr-2 h-4 w-4" />
        Baixar Aplicativo
      </Button>

      {showIOSModal && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowIOSModal(false)}>
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="font-semibold text-[16px] text-foreground">
                Instalar {nome || "Aplicativo"}
              </h3>
              <button onClick={() => setShowIOSModal(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4 text-foreground/40" />
              </button>
            </div>
            <div className="px-5 pb-6 space-y-4">
              <p className="text-[13px] text-foreground/60">
                Para instalar na tela inicial do seu celular:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[12px] font-bold shrink-0">1</div>
                  <p className="text-[13px] text-foreground pt-1">
                    Toque no ícone <Share className="inline h-4 w-4 text-blue-500 mx-0.5" /> <strong>Compartilhar</strong> (na barra do navegador)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[12px] font-bold shrink-0">2</div>
                  <p className="text-[13px] text-foreground pt-1">
                    Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[12px] font-bold shrink-0">3</div>
                  <p className="text-[13px] text-foreground pt-1">
                    Confirme tocando em <strong>"Adicionar"</strong>
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-foreground/40 text-center pt-2">
                O app será salvo com o nome e logo de {nome || "seu estabelecimento"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
