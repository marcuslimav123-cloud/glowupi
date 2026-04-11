import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
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
  route: string;
  selector: string;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Dashboard",
    description: "Aqui você acompanha o faturamento, agendamentos, ticket médio, ranking de profissionais e alertas do seu negócio.",
    icon: LayoutDashboard,
    route: "/dashboard",
    selector: "[data-tutorial='dashboard']",
  },
  {
    title: "Agenda",
    description: "Gerencie todos os agendamentos. Crie novos horários, visualize por dia ou semana, e acompanhe o status de cada atendimento.",
    icon: CalendarDays,
    route: "/agenda",
    selector: "[data-tutorial='agenda']",
  },
  {
    title: "Serviços",
    description: "Cadastre todos os serviços que você oferece, defina preços, duração e comissões para cada profissional.",
    icon: Heart,
    route: "/gestao/servicos",
    selector: "[data-tutorial='servicos']",
  },
  {
    title: "Profissionais",
    description: "Adicione sua equipe, configure horários de trabalho, comissões e permissões de acesso ao sistema.",
    icon: Users,
    route: "/gestao/profissionais",
    selector: "[data-tutorial='profissionais']",
  },
  {
    title: "Clientes",
    description: "Visualize todos os seus clientes, histórico de atendimentos, aniversários e dados de contato.",
    icon: Users,
    route: "/gestao/clientes",
    selector: "[data-tutorial='clientes']",
  },
  {
    title: "Comandas",
    description: "Controle as comandas abertas e finalizadas. Adicione serviços, produtos e processe pagamentos.",
    icon: Receipt,
    route: "/comandas/abertas",
    selector: "[data-tutorial='comandas']",
  },
  {
    title: "Link Público",
    description: "Compartilhe seu link de agendamento online para que clientes agendem diretamente pelo celular.",
    icon: Link2,
    route: "/empresa",
    selector: "[data-tutorial='empresa']",
  },
  {
    title: "Parâmetros",
    description: "Configure regras do sistema como antecedência mínima, cancelamento, intervalos entre agendamentos e mais.",
    icon: Settings,
    route: "/configuracoes/parametros",
    selector: "[data-tutorial='parametros']",
  },
  {
    title: "Notificações",
    description: "Ative as notificações push para receber alertas de novos agendamentos, cancelamentos e lembretes em tempo real.",
    icon: Bell,
    route: "/dashboard",
    selector: "[data-tutorial='notificacoes']",
  },
];

interface TutorialOverlayProps {
  onClose: () => void;
  onComplete: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

export function TutorialOverlay({ onClose, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<"bottom" | "top" | "center">("center");

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const findAndHighlight = useCallback((stepIndex: number) => {
    const step = TUTORIAL_STEPS[stepIndex];
    const PAD = 8;

    const tryFind = (attempt: number) => {
      const candidates = document.querySelectorAll(step.selector);
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
        const sr: Rect = {
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        };
        setSpotlightRect(sr);

        const viewH = window.innerHeight;
        const centerY = sr.top + sr.height / 2;
        if (centerY < viewH * 0.4) {
          setTooltipPos("bottom");
        } else if (centerY > viewH * 0.6) {
          setTooltipPos("top");
        } else {
          setTooltipPos("bottom");
        }
      } else if (attempt < 5) {
        setTimeout(() => tryFind(attempt + 1), 200);
      } else {
        setSpotlightRect(null);
        setTooltipPos("center");
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

  const navigateToStep = useCallback((stepIndex: number) => {
    const targetStep = TUTORIAL_STEPS[stepIndex];
    if (targetStep.route) {
      setLocation(targetStep.route);
    }
  }, [setLocation]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      const next = currentStep + 1;
      setCurrentStep(next);
      navigateToStep(next);
      setIsAnimating(false);
    }, 200);
  }, [currentStep, isLast, navigateToStep]);

  const handlePrev = useCallback(() => {
    if (isFirst) return;
    setIsAnimating(true);
    setTimeout(() => {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      navigateToStep(prev);
      setIsAnimating(false);
    }, 200);
  }, [currentStep, isFirst, navigateToStep]);

  const handleComplete = useCallback(async () => {
    try {
      await fetch(apiUrl("/barbearias/me/tutorial-completo"), {
        method: "PUT",
        credentials: "include",
      });
    } catch {}
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(async () => {
    try {
      await fetch(apiUrl("/barbearias/me/tutorial-completo"), {
        method: "PUT",
        credentials: "include",
      });
    } catch {}
    onClose();
  }, [onClose]);

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
    if (!spotlightRect || tooltipPos === "center") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    if (tooltipPos === "bottom") {
      return {
        position: "fixed",
        top: `${spotlightRect.top + spotlightRect.height + 16}px`,
        left: "50%",
        transform: "translateX(-50%)",
      };
    }
    return {
      position: "fixed",
      bottom: `${window.innerHeight - spotlightRect.top + 16}px`,
      left: "50%",
      transform: "translateX(-50%)",
    };
  };

  const renderSpotlightMask = () => {
    if (!spotlightRect) {
      return <div className="absolute inset-0 bg-black/60" onClick={handleSkip} />;
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
          onClick={handleSkip}
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
        className={`w-[92%] max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 z-[10000] ${
          isAnimating ? "scale-95 opacity-50" : "scale-100 opacity-100"
        }`}
      >
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Tutorial</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">
              {currentStep + 1} / {TUTORIAL_STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <StepIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">{step.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center pb-3">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-6 bg-primary"
                  : i < currentStep
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 px-5 pb-5 pt-2">
          {!isFirst && (
            <button
              onClick={handlePrev}
              className="h-11 px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          )}
          <button
            onClick={handleSkip}
            className="h-11 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Pular
          </button>
          <button
            onClick={handleNext}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
          >
            {isLast ? (
              <>
                <Sparkles className="h-4 w-4" />
                Concluir
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
