import React, { useState, useEffect, useCallback, useRef } from "react";
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
  selector?: string;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Dashboard",
    description: "Aqui você acompanha o faturamento, agendamentos, ticket médio, ranking de profissionais e alertas do seu negócio.",
    icon: LayoutDashboard,
    route: "/dashboard",
  },
  {
    title: "Agenda",
    description: "Gerencie todos os agendamentos. Crie novos horários, visualize por dia ou semana, e acompanhe o status de cada atendimento.",
    icon: CalendarDays,
    route: "/agenda",
  },
  {
    title: "Serviços",
    description: "Cadastre todos os serviços que você oferece, defina preços, duração e comissões para cada profissional.",
    icon: Heart,
    route: "/gestao/servicos",
  },
  {
    title: "Profissionais",
    description: "Adicione sua equipe, configure horários de trabalho, comissões e permissões de acesso ao sistema.",
    icon: Users,
    route: "/gestao/profissionais",
  },
  {
    title: "Clientes",
    description: "Visualize todos os seus clientes, histórico de atendimentos, aniversários e dados de contato.",
    icon: Users,
    route: "/gestao/clientes",
  },
  {
    title: "Comandas",
    description: "Controle as comandas abertas e finalizadas. Adicione serviços, produtos e processe pagamentos.",
    icon: Receipt,
    route: "/comandas/abertas",
  },
  {
    title: "Link Público",
    description: "Compartilhe seu link de agendamento online para que clientes agendem diretamente pelo celular.",
    icon: Link2,
    route: "/empresa",
  },
  {
    title: "Parâmetros",
    description: "Configure regras do sistema como antecedência mínima, cancelamento, intervalos entre agendamentos e mais.",
    icon: Settings,
    route: "/configuracoes/parametros",
  },
  {
    title: "Notificações",
    description: "Ative as notificações push para receber alertas de novos agendamentos, cancelamentos e lembretes em tempo real.",
    icon: Bell,
    route: "/dashboard",
  },
];

interface TutorialOverlayProps {
  onClose: () => void;
  onComplete: () => void;
}

export function TutorialOverlay({ onClose, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

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

  return createPortal(
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

      <div
        className={`relative w-[92%] max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
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

        <div className="px-5 py-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
              {step.description}
            </p>
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
              className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          )}
          {isFirst && (
            <button
              onClick={handleSkip}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Pular tutorial
            </button>
          )}
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
