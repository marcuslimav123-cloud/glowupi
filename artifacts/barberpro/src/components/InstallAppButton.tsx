import React, { useState } from "react";
import { useInstallPWA } from "@/hooks/useInstallPWA";
import { Download, X, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallAppButtonProps {
  nome?: string;
  logoUrl?: string | null;
  accentColor?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  iconOnly?: boolean;
}

function SafariShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function AddToHomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function InstallAppButton({ nome, logoUrl, accentColor, className = "", variant = "default", size = "default", iconOnly = false }: InstallAppButtonProps) {
  const { canInstall, isInstalled, install, showIOSInstructions, isAndroid } = useInstallPWA();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) return null;

  const accent = accentColor || "#C4943C";

  const handleClick = async () => {
    if (canInstall) {
      await install();
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
        title="Baixar Aplicativo"
      >
        <Download className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
        {!iconOnly && "Baixar Aplicativo"}
      </Button>

      {showIOSModal && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowIOSModal(false)}
          />

          <div
            className="relative w-full sm:max-w-[380px] max-h-[85vh] overflow-y-auto bg-gradient-to-b from-[#1a1a1a] to-[#111] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300"
          >
            <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}, transparent 70%)` }} />

            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden" onClick={() => setShowIOSModal(false)} />

            <div className="relative px-6 pt-4 sm:pt-6 pb-2">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={nome || "App"}
                      className="h-12 w-12 rounded-2xl object-cover border-2 shadow-lg"
                      style={{ borderColor: `${accent}40` }}
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 shadow-lg"
                      style={{ background: `${accent}15`, borderColor: `${accent}40` }}
                    >
                      <Download className="h-5 w-5" style={{ color: accent }} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-[17px] text-white leading-tight">
                      Instalar {nome || "App"}
                    </h3>
                    <p className="text-[12px] text-white/40 mt-0.5">
                      Adicione à tela inicial
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>
            </div>

            <div className="relative px-6 pb-6">
              {showIOSInstructions ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ background: `${accent}20` }}
                    >
                      <span className="text-[14px] font-black" style={{ color: accent }}>1</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[14px] text-white font-medium leading-snug">
                        Toque no botão{" "}
                        <span className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                          <SafariShareIcon className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-400 text-[12px] font-semibold">Compartilhar</span>
                        </span>
                      </p>
                      <p className="text-[11px] text-white/30 mt-1.5 flex items-center gap-1.5">
                        <span>Na barra inferior do navegador</span>
                        <ChevronDown className="h-3 w-3 animate-bounce" />
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ background: `${accent}20` }}
                    >
                      <span className="text-[14px] font-black" style={{ color: accent }}>2</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[14px] text-white font-medium leading-snug">
                        Encontre{" "}
                        <span className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/15">
                          <AddToHomeIcon className="h-3.5 w-3.5 text-white/70" />
                          <span className="text-white/80 text-[12px] font-semibold">Tela de Início</span>
                        </span>
                      </p>
                      <p className="text-[11px] text-white/30 mt-1.5">
                        Role a lista para baixo até encontrar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ background: `${accent}20` }}
                    >
                      <span className="text-[14px] font-black" style={{ color: accent }}>3</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[14px] text-white font-medium leading-snug">
                        Toque em{" "}
                        <span className="inline-flex items-center mx-0.5 px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                          <span className="text-blue-400 text-[12px] font-bold">Adicionar</span>
                        </span>
                      </p>
                      <p className="text-[11px] text-white/30 mt-1.5">
                        Pronto! O app aparecerá na sua tela inicial
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ background: `${accent}20` }}
                    >
                      <span className="text-[14px] font-black" style={{ color: accent }}>1</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[14px] text-white font-medium leading-snug">
                        Abra o menu do navegador
                      </p>
                      <p className="text-[11px] text-white/30 mt-1.5">
                        Toque nos 3 pontos (⋮) no canto superior
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ background: `${accent}20` }}
                    >
                      <span className="text-[14px] font-black" style={{ color: accent }}>2</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[14px] text-white font-medium leading-snug">
                        Toque em{" "}
                        <span className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/15">
                          <Plus className="h-3.5 w-3.5 text-white/70" />
                          <span className="text-white/80 text-[12px] font-semibold">Adicionar à tela inicial</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{ background: `${accent}20` }}
                    >
                      <span className="text-[14px] font-black" style={{ color: accent }}>3</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[14px] text-white font-medium leading-snug">
                        Confirme tocando em{" "}
                        <span className="inline-flex items-center mx-0.5 px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                          <span className="text-blue-400 text-[12px] font-bold">Instalar</span>
                        </span>
                      </p>
                      <p className="text-[11px] text-white/30 mt-1.5">
                        Pronto! O app aparecerá na sua tela inicial
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover border border-white/10" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Download className="h-4 w-4 text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/50 leading-tight">
                    O app será instalado com o nome e a logo de
                  </p>
                  <p className="text-[13px] text-white font-semibold truncate mt-0.5">
                    {nome || "seu estabelecimento"}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
