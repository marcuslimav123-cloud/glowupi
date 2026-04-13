import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Heart,
  Users,
  Receipt,
  Link2,
  Settings,
  Bell,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { apiUrl } from "@/lib/utils";

type TutorialStep = {
  title: string;
  description: string;
  icon: React.ElementType;
  menuSelector: string;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Dashboard",
    description: "Aqui você acompanha o faturamento, agendamentos, ticket médio, ranking de profissionais e alertas do seu negócio.",
    icon: LayoutDashboard,
    menuSelector: "[data-tutorial='dashboard']",
  },
  {
    title: "Agenda",
    description: "Gerencie todos os agendamentos. Crie novos horários, visualize por dia ou semana, e acompanhe o status de cada atendimento.",
    icon: CalendarDays,
    menuSelector: "[data-tutorial='agenda']",
  },
  {
    title: "Serviços",
    description: "Em Cadastros → Serviços você cadastra todos os serviços que oferece, define preços, duração e comissões para cada profissional.",
    icon: Heart,
    menuSelector: "[data-tutorial='cadastros-group']",
  },
  {
    title: "Profissionais",
    description: "Em Cadastros → Profissionais você adiciona sua equipe, configura horários de trabalho, comissões e permissões de acesso ao sistema.",
    icon: Users,
    menuSelector: "[data-tutorial='cadastros-group']",
  },
  {
    title: "Clientes",
    description: "Em Cadastros → Clientes você visualiza todos os seus clientes, histórico de atendimentos, aniversários e dados de contato.",
    icon: Users,
    menuSelector: "[data-tutorial='cadastros-group']",
  },
  {
    title: "Comandas",
    description: "Em Comandas você controla as comandas abertas e finalizadas. Adicione serviços, produtos e processe pagamentos.",
    icon: Receipt,
    menuSelector: "[data-tutorial='comandas-group']",
  },
  {
    title: "Link Público",
    description: "Em Meu Estúdio você encontra seu link de agendamento online para compartilhar com clientes agendarem diretamente pelo celular.",
    icon: Link2,
    menuSelector: "[data-tutorial='empresa']",
  },
  {
    title: "Parâmetros",
    description: "Em Configurações → Parâmetros você define regras do sistema como antecedência mínima, cancelamento, intervalos entre agendamentos e mais.",
    icon: Settings,
    menuSelector: "[data-tutorial='configuracoes-group']",
  },
  {
    title: "Notificações",
    description: "Ative as notificações push para receber alertas de novos agendamentos, cancelamentos e lembretes em tempo real.",
    icon: Bell,
    menuSelector: "[data-tutorial='notificacoes']",
  },
];

interface TutorialOverlayProps {
  onClose: () => void;
  onComplete: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

export function TutorialOverlay({ onClose, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<Rect | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const findAndHighlight = useCallback((stepIndex: number) => {
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;
    const PAD = 8;

    const tryFind = (attempt: number) => {
      if (closingRef.current) return;
      const candidates = document.querySelectorAll(step.menuSelector);
      let el: Element | null = null;
      for (const c of candidates) {
        const r = c.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          el = c;
          break;
        }
      }
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlightRect({
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        });
      } else if (attempt < 5) {
        setTimeout(() => tryFind(attempt + 1), 200);
      } else {
        setSpotlightRect(null);
      }
    };

    setTimeout(() => tryFind(0), 100);
  }, []);

  useEffect(() => {
    findAndHighlight(currentStep);
  }, [currentStep, findAndHighlight]);

  useEffect(() => {
    if (!spotlightRect) return;
    const onResize = () => findAndHighlight(currentStep);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [spotlightRect, currentStep, findAndHighlight]);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const markTutorialComplete = useCallback(async () => {
    try {
      await fetch(apiUrl("/barbearias/me/tutorial-completo"), {
        method: "PUT",
        credentials: "include",
      });
    } catch {}
  }, []);

  const handleNext = useCallback(() => {
    if (isAnimating) return;
    if (isLast) {
      closingRef.current = true;
      markTutorialComplete().then(() => onComplete());
      return;
    }
    setIsAnimating(true);
    setCurrentStep(prev => prev + 1);
    setTimeout(() => setIsAnimating(false), 250);
  }, [isLast, isAnimating, markTutorialComplete, onComplete]);

  const handlePrev = useCallback(() => {
    if (isFirst || isAnimating) return;
    setIsAnimating(true);
    setCurrentStep(prev => prev - 1);
    setTimeout(() => setIsAnimating(false), 250);
  }, [isFirst, isAnimating]);

  const handleSkip = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    markTutorialComplete().then(() => onClose());
  }, [onClose, markTutorialComplete]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSkip, handleNext, handlePrev]);

  const StepIcon = step.icon;

  const getTooltipStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 768;

    if (!spotlightRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    if (isMobile) {
      return {
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
      };
    }

    const tooltipHeight = 280;
    const spaceBelow = window.innerHeight - (spotlightRect.top + spotlightRect.height);
    const tooltipLeft = spotlightRect.left + spotlightRect.width + 16;
    const fitsRight = tooltipLeft + 380 < window.innerWidth;

    if (fitsRight) {
      const topPos = Math.max(20, Math.min(spotlightRect.top, window.innerHeight - tooltipHeight - 20));
      return {
        position: "fixed",
        top: `${topPos}px`,
        left: `${tooltipLeft}px`,
      };
    }

    if (spaceBelow > tooltipHeight + 20) {
      return {
        position: "fixed",
        top: `${spotlightRect.top + spotlightRect.height + 16}px`,
        left: "50%",
        transform: "translateX(-50%)",
      };
    }

    return {
      position: "fixed",
      bottom: `${Math.max(window.innerHeight - spotlightRect.top + 16, 40)}px`,
      left: "50%",
      transform: "translateX(-50%)",
    };
  };

  const renderSpotlightMask = () => {
    if (!spotlightRect) {
      return <div className="absolute inset-0 bg-black/60" />;
    }

    const { top, left, width, height } = spotlightRect;
    const r = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    return (
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="tutorial-spotlight-mask">
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={r}
              ry={r}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.6)"
          mask="url(#tutorial-spotlight-mask)"
          style={{ pointerEvents: "auto", cursor: "default" }}
        />
        <rect
          x={left}
          y={top}
          width={width}
          height={height}
          rx={r}
          ry={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="animate-pulse"
        />
      </svg>
    );
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] transition-all duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {renderSpotlightMask()}

      <div
        style={getTooltipStyle()}
        className={`w-[90%] max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 z-[10000] ${
          isAnimating ? "scale-95 opacity-50" : "scale-100 opacity-100"
        }`}
      >
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-1.5 text-primary">
            <GraduationCap className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Tutorial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-medium">
              {currentStep + 1} / {TUTORIAL_STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-foreground mb-0.5">{step.title}</h2>
              <p className="text-[13px] text-muted-foreground leading-snug">
                {step.description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 justify-center pb-2">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-5 bg-primary"
                  : i < currentStep
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 pb-4 pt-1">
          {!isFirst && (
            <button
              onClick={handlePrev}
              disabled={isAnimating}
              className="h-9 px-3 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
          )}
          <button
            onClick={handleSkip}
            className="h-9 px-3 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Pular
          </button>
          <button
            onClick={handleNext}
            disabled={isAnimating}
            className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isLast ? (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Concluir
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
