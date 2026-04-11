import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListAgendamentos, useListProfissionais, useListServicos,
  useCreateAgendamento, useUpdateAgendamento, useCheckoutAgendamento,
  useListClientes
} from "@workspace/api-client-react";
import { useApiList } from "@/hooks/useCrudApi";
import { generateTimeSlots, formatCurrency, apiUrl, formatPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Receipt, Star, PartyPopper, Lock, Zap,
  List, Clock, Users, Scissors, ClipboardList, UserCheck,
  Eye, Phone, Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Agendamento = {
  id: number;
  clienteId?: number | null;
  clienteNome: string;
  clienteTelefone: string;
  profissionalId: number;
  profissionalNome: string;
  servicoId: number;
  servicoNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  valor: number;
  pago: boolean;
  aniversario: boolean;
  vip: boolean;
  encaixe?: boolean;
  observacao: string | null;
};

type Bloqueio = {
  id: number;
  profissionalId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  motivo: string | null;
};

type ViewMode = "dia" | "semana" | "mes";

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
];

const STATUS_LEGEND = [
  { label: "Confirmado", color: "bg-primary/30 border-primary/50" },
  { label: "Pago", color: "bg-green-500/20 border-green-500/50" },
  { label: "Cancelado", color: "bg-destructive/20 border-destructive/50" },
  { label: "Encaixe", color: "bg-amber-500/20 border-amber-500/50" },
  { label: "Bloqueado", color: "bg-gray-300/40 border-gray-400/50" },
];

function getStatusColor(status: string, encaixe?: boolean) {
  if (encaixe) return 'bg-amber-500/20 border-amber-500/50 text-amber-600';
  switch (status) {
    case 'pago': return 'bg-green-500/20 border-green-500/50 text-green-600';
    case 'confirmado': return 'bg-primary/20 border-primary/50 text-primary';
    case 'cancelado': return 'bg-destructive/20 border-destructive/50 text-destructive';
    default: return 'bg-secondary border-border text-foreground';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pago': return 'Pago';
    case 'confirmado': return 'Confirmado';
    case 'cancelado': return 'Cancelado';
    default: return status;
  }
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDateBR(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function getWeekDates(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(dd.toISOString().split('T')[0]);
  }
  return dates;
}

function getMonthDates(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const dates: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) dates.push(null);
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dd = new Date(year, month, day);
    dates.push(dd.toISOString().split('T')[0]);
  }
  while (dates.length % 7 !== 0) dates.push(null);
  return dates;
}

function getHorizontalCalendarDates(dateStr: string) {
  const center = new Date(dateStr + "T12:00:00");
  const dates: string[] = [];
  for (let i = -3; i <= 10; i++) {
    const dd = new Date(center);
    dd.setDate(center.getDate() + i);
    dates.push(dd.toISOString().split('T')[0]);
  }
  return dates;
}

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function Agenda() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const now = useCurrentTime();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<ViewMode>("dia");
  const [selectedProfId, setSelectedProfId] = useState<string>("all");
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEncaixeOpen, setIsEncaixeOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [checkoutAgend, setCheckoutAgend] = useState<Agendamento | null>(null);
  const [cancelAgend, setCancelAgend] = useState<Agendamento | null>(null);
  const [detailAgend, setDetailAgend] = useState<Agendamento | null>(null);

  const [newStep, setNewStep] = useState<"client" | "service" | "professional" | "time">("client");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formProfId, setFormProfId] = useState("");
  const [formServId, setFormServId] = useState("");
  const [formHora, setFormHora] = useState("");
  const [formObs, setFormObs] = useState("");
  const [useNewClient, setUseNewClient] = useState(false);

  const [blockProfId, setBlockProfId] = useState("");
  const [blockHoraInicio, setBlockHoraInicio] = useState("");
  const [blockHoraFim, setBlockHoraFim] = useState("");
  const [blockMotivo, setBlockMotivo] = useState("");

  const [checkoutMetodo, setCheckoutMetodo] = useState("pix");
  const [checkoutObs, setCheckoutObs] = useState("");
  const [checkoutDesconto, setCheckoutDesconto] = useState("");
  const [checkoutDescontoTipo, setCheckoutDescontoTipo] = useState<"valor" | "percentual">("valor");
  const [checkoutParcelas, setCheckoutParcelas] = useState(1);
  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<any>(null);
  const [cupomErro, setCupomErro] = useState("");

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [barbHorarioFunc, setBarbHorarioFunc] = useState<any[] | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const monthDates = useMemo(() => getMonthDates(date), [date]);
  const horizontalDates = useMemo(() => getHorizontalCalendarDates(date), [date]);

  const dateRangeParams = useMemo(() => {
    if (viewMode === "dia") return { data: date };
    if (viewMode === "semana") return { dataInicio: weekDates[0], dataFim: weekDates[6] };
    const monthD = getMonthDates(date).filter(Boolean) as string[];
    return { dataInicio: monthD[0], dataFim: monthD[monthD.length - 1] };
  }, [viewMode, date, weekDates]);

  const { data: profissionais = [] } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: servicos = [] } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: clientes = [] } = useListClientes(barbeariaId!, { search: clientSearch || undefined }, { query: { enabled: !!barbeariaId } });

  const tiposPath = `/barbearias/${barbeariaId}/tipos`;
  const { data: tipos = [] } = useApiList("tipos", tiposPath, !!barbeariaId);
  const formasPagamentoCustom = (tipos as any[]).filter(t => t.ativo && t.categoria === "forma_pagamento").map(t => ({ value: t.nome.toLowerCase().replace(/\s+/g, "_"), label: t.nome }));
  const paymentMethodsToUse = formasPagamentoCustom.length > 0 ? formasPagamentoCustom : PAYMENT_METHODS;
  const { data: agendamentos = [], refetch } = useListAgendamentos(barbeariaId!, dateRangeParams, { query: { enabled: !!barbeariaId } });

  const createMutation = useCreateAgendamento();
  const updateMutation = useUpdateAgendamento();
  const checkoutMutation = useCheckoutAgendamento();

  const BASE = import.meta.env.BASE_URL;
  useEffect(() => {
    if (!barbeariaId) return;
    fetch(`${BASE}api/barbearias/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.horarioFuncionamento && Array.isArray(d.horarioFuncionamento)) setBarbHorarioFunc(d.horarioFuncionamento); })
      .catch(() => {});
  }, [barbeariaId]);

  const DIAS_FUNC_INDEX = [6, 0, 1, 2, 3, 4, 5];
  const daySchedule = useMemo(() => {
    if (!barbHorarioFunc || !Array.isArray(barbHorarioFunc)) return { aberto: true, abertura: "08:00", fechamento: "20:00" };
    const d = new Date(date + "T12:00:00");
    const idx = DIAS_FUNC_INDEX[d.getDay()];
    const dia = barbHorarioFunc[idx];
    if (!dia || !dia.ativo) return { aberto: false, abertura: "08:00", fechamento: "20:00" };
    return { aberto: true, abertura: dia.abertura || "08:00", fechamento: dia.fechamento || "20:00" };
  }, [date, barbHorarioFunc]);

  const timeSlots = useMemo(() => {
    if (!daySchedule.aberto) return [];
    return generateTimeSlots(daySchedule.abertura, daySchedule.fechamento, 30);
  }, [daySchedule]);

  const availableTimeSlots = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const isToday = date === today;
    const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 0;

    let filtered = timeSlots;

    if (isToday) {
      filtered = filtered.filter(slot => timeToMinutes(slot) > nowMin);
    }

    if (formProfId && bloqueios.length > 0) {
      const profBloqueios = bloqueios.filter(b => b.profissionalId === parseInt(formProfId));
      if (profBloqueios.length > 0) {
        filtered = filtered.filter(slot => {
          const slotMin = timeToMinutes(slot);
          return !profBloqueios.some(b => {
            const bStart = timeToMinutes(b.horaInicio);
            const bEnd = timeToMinutes(b.horaFim);
            return slotMin >= bStart && slotMin < bEnd;
          });
        });
      }
    }

    return filtered;
  }, [timeSlots, formProfId, bloqueios, date]);

  const filteredAgendamentos = useMemo(() => {
    const all = agendamentos as Agendamento[];
    if (selectedProfId === "all") return all;
    return all.filter(a => a.profissionalId === parseInt(selectedProfId));
  }, [agendamentos, selectedProfId]);

  const fetchBloqueios = async (d: string) => {
    if (!barbeariaId) return;
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/bloqueios?data=${d}`), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBloqueios(data);
      }
    } catch {}
  };

  React.useEffect(() => {
    if (viewMode === "dia") fetchBloqueios(date);
    else setBloqueios([]);
  }, [date, viewMode, barbeariaId]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

  const handlePrev = () => {
    const d = new Date(date + "T12:00:00");
    if (viewMode === "dia") d.setDate(d.getDate() - 1);
    else if (viewMode === "semana") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const d = new Date(date + "T12:00:00");
    if (viewMode === "dia") d.setDate(d.getDate() + 1);
    else if (viewMode === "semana") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => setDate(new Date().toISOString().split('T')[0]);

  const resetForm = () => {
    setFormNome(""); setFormTelefone(""); setFormProfId("");
    setFormServId(""); setFormHora(""); setFormObs("");
    setNewStep("client"); setSelectedClientId(null); setClientSearch("");
    setUseNewClient(false);
  };

  const handleCreate = async (e: React.FormEvent, encaixe = false) => {
    e.preventDefault();
    if (!formProfId || !formServId || !formHora) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        barbeariaId: barbeariaId!,
        data: {
          clienteId: selectedClientId || undefined,
          clienteNome: formNome,
          clienteTelefone: formTelefone,
          profissionalId: Number(formProfId),
          servicoId: Number(formServId),
          data: date,
          horaInicio: formHora,
          observacao: formObs || undefined,
          encaixe: encaixe || undefined,
        },
      });
      toast({ title: encaixe ? "Encaixe realizado!" : "Agendado com sucesso!" });
      setIsNewOpen(false);
      setIsEncaixeOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Tente novamente.";
      toast({ title: "Erro ao agendar", description: msg, variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    if (!cancelAgend) return;
    try {
      await updateMutation.mutateAsync({ barbeariaId: barbeariaId!, agendamentoId: cancelAgend.id, data: { status: "cancelado" } });
      toast({ title: "Agendamento cancelado" });
      setCancelAgend(null);
      setDetailAgend(null);
      refetch();
    } catch {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockProfId || !blockHoraInicio || !blockHoraFim) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/bloqueios`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profissionalId: parseInt(blockProfId),
          data: date,
          horaInicio: blockHoraInicio,
          horaFim: blockHoraFim,
          motivo: blockMotivo || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao bloquear horário");
      toast({ title: "Horário bloqueado!" });
      setIsBlockOpen(false);
      setBlockProfId(""); setBlockHoraInicio(""); setBlockHoraFim(""); setBlockMotivo("");
      fetchBloqueios(date);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteBlock = async (bloqueioId: number) => {
    try {
      await fetch(apiUrl(`/barbearias/${barbeariaId}/bloqueios/${bloqueioId}`), {
        method: "DELETE", credentials: "include"
      });
      fetchBloqueios(date);
    } catch {}
  };

  const handleAplicarCupom = async () => {
    if (!cupomCodigo.trim()) return;
    setCupomErro("");
    try {
      const res = await fetch(apiUrl(`/barbearias/${barbeariaId}/cupons/validar`), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cupomCodigo.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setCupomErro(data.error || "Cupom inválido"); setCupomAplicado(null); return; }
      setCupomAplicado(data);
      setCheckoutDesconto(String(data.valor));
      setCheckoutDescontoTipo(data.tipo === "percentual" ? "percentual" : "valor");
      toast({ title: "Cupom aplicado!", description: `${data.tipo === "percentual" ? `${data.valor}%` : `R$ ${data.valor}`} de desconto` });
    } catch { setCupomErro("Erro ao validar cupom"); setCupomAplicado(null); }
  };

  const calcularValorFinal = () => {
    if (!checkoutAgend) return 0;
    const valor = checkoutAgend.valor;
    const desc = parseFloat(checkoutDesconto) || 0;
    if (desc <= 0) return valor;
    if (checkoutDescontoTipo === "percentual") return valor * (1 - Math.min(desc, 100) / 100);
    return Math.max(0, valor - desc);
  };

  const valorFinal = calcularValorFinal();
  const valorParcela = checkoutParcelas > 1 ? valorFinal / checkoutParcelas : valorFinal;

  const handleCheckout = async () => {
    if (!checkoutAgend) return;
    try {
      await checkoutMutation.mutateAsync({
        barbeariaId: barbeariaId!,
        agendamentoId: checkoutAgend.id,
        data: {
          pagamentos: [{ metodo: checkoutMetodo, valor: valorFinal }],
          observacao: checkoutObs || undefined,
          desconto: parseFloat(checkoutDesconto) || 0,
          descontoTipo: checkoutDescontoTipo,
          parcelas: checkoutParcelas,
        }
      });
      if (cupomAplicado) {
        try { await fetch(apiUrl(`/barbearias/${barbeariaId}/cupons/${cupomAplicado.id}/usar`), { method: "POST", credentials: "include" }); } catch {}
      }
      toast({ title: "Checkout realizado!", description: `${formatCurrency(valorFinal)} via ${paymentMethodsToUse.find(m => m.value === checkoutMetodo)?.label || checkoutMetodo}` });
      setCheckoutAgend(null);
      setDetailAgend(null);
      setCheckoutObs("");
      setCheckoutDesconto("");
      setCheckoutParcelas(1);
      setCupomCodigo("");
      setCupomAplicado(null);
      setCupomErro("");
      refetch();
      qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "dashboard"] });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Tente novamente.";
      toast({ title: "Erro no checkout", description: msg, variant: "destructive" });
    }
  };

  const getSlotHeight = (agend: Agendamento) => {
    const start = timeToMinutes(agend.horaInicio);
    const end = timeToMinutes(agend.horaFim);
    const slots = Math.max(1, (end - start) / 30);
    return slots * 56 - 2;
  };

  const getSlotTop = (agend: Agendamento) => {
    const idx = timeSlots.findIndex(t => t === agend.horaInicio.slice(0, 5));
    return idx === -1 ? 0 : idx * 56 + 1;
  };

  const currentTimeStr = useMemo(() => {
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }, [now]);

  const currentTimeTop = useMemo(() => {
    if (timeSlots.length === 0) return -1;
    const nowMin = timeToMinutes(currentTimeStr);
    const firstSlotMin = timeToMinutes(timeSlots[0]);
    const lastSlotMin = timeToMinutes(timeSlots[timeSlots.length - 1]) + 30;
    if (nowMin < firstSlotMin || nowMin > lastSlotMin) return -1;
    return ((nowMin - firstSlotMin) / 30) * 56;
  }, [currentTimeStr, timeSlots]);

  const isToday = date === new Date().toISOString().split('T')[0];

  const dateDisplay = useMemo(() => {
    if (viewMode === "dia") return formatDateBR(date);
    if (viewMode === "semana") {
      return `${new Date(weekDates[0] + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — ${new Date(weekDates[6] + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
    }
    const d = new Date(date + "T12:00:00");
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }, [viewMode, date, weekDates]);

  const renderHorizontalCalendar = () => {
    const today = new Date().toISOString().split('T')[0];
    return (
      <div className="mb-3">
        <div ref={calendarRef} className="flex gap-1.5 overflow-x-auto pb-2 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {horizontalDates.map(d => {
            const dd = new Date(d + "T12:00:00");
            const dayName = WEEKDAY_SHORT[dd.getDay()];
            const dayNum = dd.getDate();
            const isSel = d === date;
            const isTd = d === today;
            const dayAgends = (agendamentos as Agendamento[]).filter(a => a.data === d);
            return (
              <button
                key={d}
                onClick={() => handleDateChange(d)}
                className={`flex flex-col items-center min-w-[52px] px-2 py-2 rounded-xl transition-all shrink-0
                  ${isSel ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
                    isTd ? "bg-primary/10 text-primary border border-primary/30" :
                    "bg-card border border-border text-foreground hover:border-primary/40"}`}
              >
                <span className={`text-[10px] font-medium ${isSel ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{dayName}</span>
                <span className={`text-lg font-bold leading-tight ${isSel ? "" : ""}`}>{dayNum}</span>
                {dayAgends.length > 0 && (
                  <div className={`flex gap-0.5 mt-0.5`}>
                    {dayAgends.length <= 3 ? dayAgends.map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${isSel ? "bg-primary-foreground/60" : "bg-primary"}`} />
                    )) : (
                      <span className={`text-[8px] font-bold ${isSel ? "text-primary-foreground/80" : "text-primary"}`}>{dayAgends.length}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProfessionalAvatars = () => {
    const profs = profissionais as any[];
    if (profs.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setSelectedProfId("all")}
            className={`flex flex-col items-center gap-1 min-w-[56px] shrink-0 transition-all`}
          >
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${selectedProfId === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground"}`}>
              <Users className="h-4 w-4" />
            </div>
            <span className={`text-[10px] font-medium truncate max-w-[56px] ${selectedProfId === "all" ? "text-primary" : "text-muted-foreground"}`}>Todos</span>
          </button>
          {profs.map((prof: any) => {
            const isSelected = selectedProfId === String(prof.id);
            const dayAgends = filteredAgendamentos.filter(a => a.profissionalId === prof.id && a.data === date);
            return (
              <button
                key={prof.id}
                onClick={() => setSelectedProfId(isSelected ? "all" : String(prof.id))}
                className="flex flex-col items-center gap-1 min-w-[56px] shrink-0 transition-all"
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all relative
                  ${isSelected ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30" : "border-border bg-muted text-muted-foreground"}`}>
                  {prof.fotoUrl ? (
                    <img src={prof.fotoUrl} alt={prof.nomeExibicao} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    prof.nomeExibicao.charAt(0).toUpperCase()
                  )}
                  {dayAgends.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {dayAgends.length}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium truncate max-w-[56px] ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                  {prof.apelido || prof.nomeExibicao.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCurrentTimeBadge = () => {
    if (!isToday || viewMode !== "dia") return null;
    return (
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm animate-pulse">
          {currentTimeStr}
        </div>
        <div className="flex-1 h-px bg-red-500/30" />
      </div>
    );
  };

  const renderDayView = () => {
    const profs = selectedProfId === "all" ? profissionais as any[] : (profissionais as any[]).filter((p: any) => String(p.id) === selectedProfId);
    const dayAgends = filteredAgendamentos.filter(a => a.data === date);

    if (!daySchedule.aberto) {
      return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-320px)] sm:h-[calc(100vh-380px)] min-h-[200px] items-center justify-center px-4">
          <Lock className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-base sm:text-lg font-semibold text-muted-foreground text-center">Estabelecimento fechado</p>
          <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1 text-center">Esse dia não tem horário de funcionamento configurado</p>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-320px)] sm:h-[calc(100vh-380px)] min-h-[300px]">
        <div className="flex border-b border-border bg-muted/30">
          <div className="w-12 sm:w-14 shrink-0 border-r border-border p-2 flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {profs.map((prof: any) => {
              const profAgends = dayAgends.filter(a => a.profissionalId === prof.id && a.status === "pago");
              const total = profAgends.reduce((s, a) => s + a.valor, 0);
              return (
                <div key={prof.id} className="flex-1 min-w-[100px] sm:min-w-[140px] p-1.5 sm:p-2 text-center border-r border-border last:border-r-0">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px] border border-primary/20 shrink-0">
                      {prof.nomeExibicao.charAt(0)}
                    </div>
                    <p className="font-semibold text-foreground truncate text-[11px]">{prof.apelido || prof.nomeExibicao}</p>
                  </div>
                  <p className="text-[10px] text-primary mt-0.5 font-medium">{formatCurrency(total)}</p>
                </div>
              );
            })}
            {profs.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-4">Nenhum profissional</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-max">
            <div className="w-12 sm:w-14 shrink-0 border-r border-border bg-card">
              {timeSlots.map(time => (
                <div key={time} className="h-14 border-b border-border/40 flex items-start justify-center pt-1 text-[10px] text-muted-foreground font-medium">
                  {time}
                </div>
              ))}
            </div>

            <div className="flex-1 flex relative">
              {isToday && currentTimeTop >= 0 && (
                <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${currentTimeTop}px` }}>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-[2px] bg-red-500" />
                  </div>
                </div>
              )}

              {profs.map((prof: any) => (
                <div key={prof.id} className="flex-1 min-w-[100px] sm:min-w-[140px] border-r border-border last:border-r-0 relative">
                  {timeSlots.map(time => (
                    <div key={time} className="h-14 border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                      onClick={() => { resetForm(); setFormProfId(String(prof.id)); setFormHora(time); setNewStep("client"); setIsNewOpen(true); }} />
                  ))}

                  {bloqueios.filter(b => b.profissionalId === prof.id).map(b => {
                    const startIdx = timeSlots.findIndex(t => t === b.horaInicio.slice(0, 5));
                    const startMin = timeToMinutes(b.horaInicio);
                    const endMin = timeToMinutes(b.horaFim);
                    const slots = Math.max(1, (endMin - startMin) / 30);
                    if (startIdx === -1) return null;
                    return (
                      <div
                        key={`block-${b.id}`}
                        className="absolute left-0.5 right-0.5 rounded-md bg-gray-200/60 border border-gray-300/60 flex items-center justify-center z-5 cursor-pointer group"
                        style={{ top: `${startIdx * 56 + 1}px`, height: `${slots * 56 - 2}px` }}
                        onClick={() => handleDeleteBlock(b.id)}
                        title={b.motivo || "Bloqueado — clique para remover"}
                      >
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Lock className="h-3 w-3" />
                          <span className="hidden group-hover:inline">Remover</span>
                          <span className="group-hover:hidden">{b.motivo || "Bloqueado"}</span>
                        </div>
                      </div>
                    );
                  })}

                  {dayAgends.filter(a => a.profissionalId === prof.id).map(agend => (
                    <div
                      key={agend.id}
                      className={`absolute left-0.5 right-0.5 rounded-lg border p-1.5 text-[10px] shadow-sm cursor-pointer z-10 flex flex-col justify-between group hover:shadow-md transition-all ${getStatusColor(agend.status, agend.encaixe)}`}
                      style={{ top: `${getSlotTop(agend)}px`, height: `${getSlotHeight(agend)}px` }}
                      onClick={() => setDetailAgend(agend)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-0.5">
                            {agend.encaixe && <Zap className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                            {agend.aniversario && <PartyPopper className="h-2.5 w-2.5 text-yellow-400 shrink-0" />}
                            {agend.vip && <Star className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                            <span className="font-semibold truncate">{agend.clienteNome}</span>
                          </div>
                          <p className="truncate opacity-80">{agend.servicoNome}</p>
                        </div>
                        <span className="font-bold shrink-0 text-[9px]">{formatCurrency(agend.valor)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-70">{agend.horaInicio.slice(0,5)} – {agend.horaFim.slice(0,5)}</span>
                        {agend.status === 'pago' && <CheckCircle className="h-3 w-3" />}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-380px)] min-h-[300px]">
        <div className="flex border-b border-border bg-muted/30">
          <div className="w-14 shrink-0 border-r border-border p-2 flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 flex">
            {weekDates.map((wd, i) => {
              const isTd = wd === new Date().toISOString().split('T')[0];
              const dayAgends = filteredAgendamentos.filter(a => a.data === wd);
              return (
                <div
                  key={wd}
                  className={`flex-1 min-w-[80px] p-2 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-primary/5 ${isTd ? "bg-primary/10" : ""}`}
                  onClick={() => { setDate(wd); setViewMode("dia"); }}
                >
                  <p className={`text-[10px] font-medium ${isTd ? "text-primary" : "text-muted-foreground"}`}>{WEEKDAY_NAMES[i]}</p>
                  <p className={`text-sm font-bold ${isTd ? "text-primary" : "text-foreground"}`}>{new Date(wd + "T12:00:00").getDate()}</p>
                  {dayAgends.length > 0 && <p className="text-[9px] text-primary font-medium">{dayAgends.length}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-max">
            <div className="w-14 shrink-0 border-r border-border bg-card">
              {timeSlots.map(time => (
                <div key={time} className="h-12 border-b border-border/40 flex items-start justify-center pt-1 text-[10px] text-muted-foreground font-medium">
                  {time}
                </div>
              ))}
            </div>

            <div className="flex-1 flex">
              {weekDates.map(wd => {
                const dayAgends = filteredAgendamentos.filter(a => a.data === wd);
                return (
                  <div key={wd} className="flex-1 min-w-[80px] border-r border-border last:border-r-0 relative">
                    {timeSlots.map(time => (
                      <div key={time} className="h-12 border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => { setDate(wd); resetForm(); setFormHora(time); setIsNewOpen(true); }} />
                    ))}
                    {dayAgends.map(agend => {
                      const idx = timeSlots.findIndex(t => t === agend.horaInicio.slice(0, 5));
                      const startMin = timeToMinutes(agend.horaInicio);
                      const endMin = timeToMinutes(agend.horaFim);
                      const slots = Math.max(1, (endMin - startMin) / 30);
                      if (idx === -1) return null;
                      return (
                        <div
                          key={agend.id}
                          className={`absolute left-0.5 right-0.5 rounded-md border p-1 text-[9px] shadow-sm cursor-pointer z-10 hover:shadow-md transition-all ${getStatusColor(agend.status, agend.encaixe)}`}
                          style={{ top: `${idx * 48 + 1}px`, height: `${slots * 48 - 2}px` }}
                          onClick={() => { setDate(wd); setViewMode("dia"); }}
                          title={`${agend.clienteNome} - ${agend.servicoNome}`}
                        >
                          <p className="font-semibold truncate">{agend.clienteNome}</p>
                          <p className="truncate opacity-70">{agend.horaInicio.slice(0,5)}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const today = new Date().toISOString().split('T')[0];
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_NAMES.map(day => (
            <div key={day} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDates.map((md, i) => {
            if (!md) return <div key={`empty-${i}`} className="h-16 sm:h-20" />;
            const dayAgends = filteredAgendamentos.filter(a => a.data === md);
            const isTd = md === today;
            const isSelected = md === date;
            const dayNum = new Date(md + "T12:00:00").getDate();
            const paidCount = dayAgends.filter(a => a.status === "pago").length;
            const confirmedCount = dayAgends.filter(a => a.status === "confirmado").length;
            return (
              <div
                key={md}
                className={`h-16 sm:h-20 rounded-lg border p-1 cursor-pointer transition-all hover:border-primary/50 ${isTd ? "border-primary bg-primary/5" : isSelected ? "border-primary/30 bg-primary/5" : "border-border/40"}`}
                onClick={() => { setDate(md); setViewMode("dia"); }}
              >
                <p className={`text-xs font-bold ${isTd ? "text-primary" : "text-foreground"}`}>{dayNum}</p>
                {dayAgends.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {confirmedCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[8px] text-primary font-medium">{confirmedCount}</span>
                      </div>
                    )}
                    {paidCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[8px] text-green-600 font-medium">{paidCount}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMiniCalendar = () => {
    const d = new Date(date + "T12:00:00");
    const today = new Date().toISOString().split('T')[0];
    const miniMonthDates = getMonthDates(date);
    return (
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => { const nd = new Date(date + "T12:00:00"); nd.setMonth(nd.getMonth() - 1); setDate(nd.toISOString().split('T')[0]); }} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-semibold">{MONTH_NAMES[d.getMonth()]} {d.getFullYear()}</span>
          <button onClick={() => { const nd = new Date(date + "T12:00:00"); nd.setMonth(nd.getMonth() + 1); setDate(nd.toISOString().split('T')[0]); }} className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((dd, i) => (
            <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">{dd}</div>
          ))}
          {miniMonthDates.map((md, i) => {
            if (!md) return <div key={`e-${i}`} />;
            const dayNum = new Date(md + "T12:00:00").getDate();
            const isTd = md === today;
            const isSelected = md === date;
            return (
              <button
                key={md}
                className={`text-[10px] h-6 w-6 mx-auto rounded-full flex items-center justify-center font-medium transition-colors
                  ${isSelected ? "bg-primary text-white" : isTd ? "bg-primary/20 text-primary" : "hover:bg-muted text-foreground"}`}
                onClick={() => handleDateChange(md)}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderNewAppointmentStepFlow = (isEncaixe: boolean) => {
    const filteredClients = (clientes as any[]).filter(c =>
      !clientSearch || c.nome?.toLowerCase().includes(clientSearch.toLowerCase()) || c.telefone?.includes(clientSearch)
    );

    return (
      <Dialog open={isEncaixe ? isEncaixeOpen : isNewOpen} onOpenChange={v => { if (isEncaixe) setIsEncaixeOpen(v); else setIsNewOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              {isEncaixe && <Zap className="h-5 w-5 text-amber-500" />}
              {isEncaixe ? "Encaixe" : "Novo Agendamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-1 mb-3">
            {(["client", "service", "professional", "time"] as const).map((step, idx) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => setNewStep(step)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all
                    ${newStep === step ? "bg-primary text-primary-foreground" :
                      idx < ["client", "service", "professional", "time"].indexOf(newStep) ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"}`}
                >
                  <span className="font-bold">{idx + 1}</span>
                  <span className="hidden sm:inline">{step === "client" ? "Cliente" : step === "service" ? "Serviço" : step === "professional" ? "Profissional" : "Horário"}</span>
                </button>
                {idx < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          {newStep === "client" && (
            <div className="space-y-3">
              {!useNewClient ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente por nome ou telefone..."
                      className="pl-9 bg-background h-10 text-sm"
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-1">
                    {filteredClients.slice(0, 20).map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setFormNome(c.nome);
                          setFormTelefone(c.telefone || "");
                          setNewStep("service");
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left
                          ${selectedClientId === c.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {c.nome?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.nome}</p>
                          {c.telefone && <p className="text-[11px] text-muted-foreground">{c.telefone}</p>}
                        </div>
                        {c.vip && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>
                    )}
                  </div>
                  <button
                    onClick={() => setUseNewClient(true)}
                    className="w-full text-sm text-primary font-medium py-2 hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    + Novo cliente (sem cadastro)
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do Cliente *</Label>
                    <Input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Mariana Silva" className="bg-background h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">WhatsApp *</Label>
                    <Input value={formTelefone} onChange={e => setFormTelefone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" className="bg-background h-9 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setUseNewClient(false); setFormNome(""); setFormTelefone(""); }}>
                      Voltar à lista
                    </Button>
                    <Button size="sm" className="text-xs flex-1" disabled={!formNome || !formTelefone}
                      onClick={() => { setSelectedClientId(null); setNewStep("service"); }}>
                      Continuar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {newStep === "service" && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(servicos as any[]).filter((s: any) => s.ativo !== false).map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => { setFormServId(String(s.id)); setNewStep("professional"); }}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border transition-all text-left
                    ${formServId === String(s.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{s.duracaoMinutos || 30} min</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatCurrency(s.preco)}</span>
                </button>
              ))}
            </div>
          )}

          {newStep === "professional" && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(profissionais as any[]).filter((p: any) => p.ativo !== false).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => { setFormProfId(String(p.id)); setNewStep("time"); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left
                    ${formProfId === String(p.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt={p.nomeExibicao} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      p.nomeExibicao.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.nomeExibicao}</p>
                    {p.especialidade && <p className="text-[11px] text-muted-foreground">{p.especialidade}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {newStep === "time" && (
            <form onSubmit={e => handleCreate(e, isEncaixe)} className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Data: <strong className="text-foreground">{new Date(date + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong></span>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{formNome}</span></div>
                {formServId && <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="font-medium">{(servicos as any[]).find((s: any) => String(s.id) === formServId)?.nome}</span></div>}
                {formProfId && <div className="flex justify-between"><span className="text-muted-foreground">Profissional</span><span className="font-medium">{(profissionais as any[]).find((p: any) => String(p.id) === formProfId)?.nomeExibicao}</span></div>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Horário *</Label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[180px] overflow-y-auto">
                  {(isEncaixe ? timeSlots : availableTimeSlots).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormHora(t)}
                      className={`py-2 rounded-lg border text-xs font-medium transition-all
                        ${formHora === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary/50"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observação <span className="text-muted-foreground">(opcional)</span></Label>
                <Input value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Ex: Trazer foto de referência" className="bg-background h-9 text-sm" />
              </div>

              <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={!formHora || createMutation.isPending}>
                {createMutation.isPending ? "Agendando..." : isEncaixe ? "Confirmar Encaixe" : "Confirmar Agendamento"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  const renderDetailModal = () => {
    if (!detailAgend) return null;
    return (
      <Dialog open={!!detailAgend} onOpenChange={v => { if (!v) setDetailAgend(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-display flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalhes do Agendamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(detailAgend.status, detailAgend.encaixe)}`}>
              {detailAgend.encaixe && <Zap className="h-3 w-3" />}
              {getStatusLabel(detailAgend.status)}
              {detailAgend.encaixe && " (Encaixe)"}
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Cliente</span>
                <span className="font-medium">{detailAgend.clienteNome}</span>
              </div>
              {detailAgend.clienteTelefone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone</span>
                  <a
                    href={`https://wa.me/${(() => { const digits = detailAgend.clienteTelefone.replace(/\D/g, ''); return digits.startsWith('55') && digits.length >= 12 ? digits : '55' + digits; })()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-500 hover:underline flex items-center gap-1"
                  >
                    {detailAgend.clienteTelefone}
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.252-.149-2.868.852.852-2.868-.149-.252A8 8 0 1112 20z"/></svg>
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Scissors className="h-3.5 w-3.5" /> Serviço</span>
                <span className="font-medium">{detailAgend.servicoNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Profissional</span>
                <span className="font-medium">{detailAgend.profissionalNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> Data</span>
                <span className="font-medium">{new Date(detailAgend.data + "T12:00:00").toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Horário</span>
                <span className="font-medium">{detailAgend.horaInicio} — {detailAgend.horaFim}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-1">
                <span className="text-muted-foreground font-medium">Valor</span>
                <span className="font-bold text-primary text-base">{formatCurrency(detailAgend.valor)}</span>
              </div>
              {detailAgend.observacao && (
                <div className="pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground">Obs: {detailAgend.observacao}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {detailAgend.aniversario && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                  <PartyPopper className="h-3 w-3" /> Aniversário
                </span>
              )}
              {detailAgend.vip && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  <Star className="h-3 w-3" /> VIP
                </span>
              )}
            </div>

            {detailAgend.status === "confirmado" && (
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 h-9 text-xs"
                  onClick={() => { setCheckoutAgend(detailAgend); setDetailAgend(null); }}
                >
                  <Receipt className="h-3.5 w-3.5 mr-1" /> Checkout
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-9 text-xs"
                  onClick={() => { setCancelAgend(detailAgend); }}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Agenda</h1>
              <p className="text-muted-foreground text-sm">Gerencie seus horários</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border">
                {(["dia", "semana", "mes"] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === mode ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {mode === "dia" ? "Dia" : mode === "semana" ? "Semana" : "Mês"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev}><ChevronLeft className="h-4 w-4"/></Button>
                <button onClick={goToToday} className="px-2 py-1 text-xs font-medium text-foreground min-w-[100px] text-center hover:text-primary transition-colors">
                  {dateDisplay}
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}><ChevronRight className="h-4 w-4"/></Button>
              </div>
            </div>
          </div>

          {viewMode === "dia" && renderHorizontalCalendar()}
          {renderProfessionalAvatars()}
          {viewMode === "dia" && renderCurrentTimeBadge()}

          <div className="hidden sm:flex items-center gap-2 mb-3 flex-wrap">
            <Button size="sm" className="h-8 text-xs shadow-md shadow-primary/20" onClick={() => { resetForm(); setIsNewOpen(true); }}>
              <Plus className="mr-1 h-3.5 w-3.5"/> Novo
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs border-amber-400/50 text-amber-600 hover:bg-amber-50" onClick={() => { resetForm(); setIsEncaixeOpen(true); }}>
              <Zap className="mr-1 h-3.5 w-3.5"/> Encaixe
            </Button>
            {viewMode === "dia" && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsBlockOpen(true)}>
                <Lock className="mr-1 h-3.5 w-3.5"/> Bloquear
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={goToToday}>
              Hoje
            </Button>
          </div>

          {viewMode === "dia" && renderDayView()}
          {viewMode === "semana" && renderWeekView()}
          {viewMode === "mes" && renderMonthView()}
        </div>

        <div className="hidden lg:block w-[240px] shrink-0 space-y-3">
          {renderMiniCalendar()}

          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <h3 className="text-xs font-semibold text-foreground">Legenda</h3>
            {STATUS_LEGEND.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded border ${s.color}`} />
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
            <h3 className="text-xs font-semibold text-foreground mb-2">Ações Rápidas</h3>
            <button onClick={() => { resetForm(); setIsNewOpen(true); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <Plus className="h-3.5 w-3.5 text-primary" /> Novo Agendamento
            </button>
            <button onClick={() => { resetForm(); setIsEncaixeOpen(true); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Encaixe
            </button>
            {viewMode === "dia" && (
              <button onClick={() => setIsBlockOpen(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
                <Lock className="h-3.5 w-3.5 text-gray-500" /> Bloquear Horário
              </button>
            )}
            <button onClick={() => navigate("/lista-espera")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" /> Lista de Espera
            </button>
            <button onClick={() => navigate("/gestao/servicos")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <Scissors className="h-3.5 w-3.5 text-muted-foreground" /> Serviços
            </button>
            <button onClick={() => navigate("/gestao/profissionais")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" /> Profissionais
            </button>
          </div>

          {viewMode === "dia" && bloqueios.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
              <h3 className="text-xs font-semibold text-foreground">Bloqueios Hoje</h3>
              {bloqueios.map(b => {
                const profName = (profissionais as any[]).find((p: any) => p.id === b.profissionalId)?.nomeExibicao || "?";
                return (
                  <div key={b.id} className="flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30 rounded-md px-2 py-1">
                    <div>
                      <span className="font-medium text-foreground">{profName}</span>
                      <span className="ml-1">{b.horaInicio} - {b.horaFim}</span>
                    </div>
                    <button onClick={() => handleDeleteBlock(b.id)} className="text-destructive hover:text-destructive/80">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-[100px] right-4 z-40 sm:hidden flex flex-col gap-2">
        <button
          onClick={() => { resetForm(); setIsNewOpen(true); }}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {renderNewAppointmentStepFlow(false)}
      {renderNewAppointmentStepFlow(true)}
      {renderDetailModal()}

      {/* Block dialog */}
      <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-500" /> Bloquear Horário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBlock} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Profissional *</Label>
              <Select value={blockProfId} onValueChange={setBlockProfId}>
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(profissionais as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nomeExibicao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Início *</Label>
                <Select value={blockHoraInicio} onValueChange={setBlockHoraInicio}>
                  <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="Início" /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fim *</Label>
                <Select value={blockHoraFim} onValueChange={setBlockHoraFim}>
                  <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="Fim" /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo <span className="text-muted-foreground">(opcional)</span></Label>
              <Input value={blockMotivo} onChange={e => setBlockMotivo(e.target.value)} placeholder="Ex: Almoço" className="bg-background h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Data: <strong className="text-foreground">{new Date(date + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong></span>
            </div>
            <Button type="submit" className="w-full h-9 text-sm">Bloquear</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelAgend} onOpenChange={v => { if (!v) setCancelAgend(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display text-destructive">Cancelar Agendamento</DialogTitle>
          </DialogHeader>
          {cancelAgend && (
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">
                Deseja cancelar o agendamento de <strong className="text-foreground">{cancelAgend.clienteNome}</strong> ({cancelAgend.servicoNome}) em {cancelAgend.data} às {cancelAgend.horaInicio}?
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setCancelAgend(null)}>Não</Button>
                <Button variant="destructive" className="flex-1 h-9 text-xs" onClick={handleCancel} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Cancelando..." : "Sim, cancelar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout dialog */}
      <Dialog open={!!checkoutAgend} onOpenChange={v => { if (!v) { setCheckoutAgend(null); setCheckoutObs(""); setCheckoutDesconto(""); setCheckoutParcelas(1); setCupomCodigo(""); setCupomAplicado(null); setCupomErro(""); } }}>
        <DialogContent className="bg-card border-border sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Checkout
            </DialogTitle>
          </DialogHeader>
          {checkoutAgend && (
            <div className="space-y-3 mt-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{checkoutAgend.clienteNome}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="font-medium">{checkoutAgend.servicoNome}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Profissional</span><span className="font-medium">{checkoutAgend.profissionalNome}</span></div>
                <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                  <span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatCurrency(checkoutAgend.valor)}</span>
                </div>
                {parseFloat(checkoutDesconto) > 0 && (
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Desconto ({checkoutDescontoTipo === "percentual" ? `${checkoutDesconto}%` : `R$ ${checkoutDesconto}`})</span>
                    <span>-{formatCurrency(checkoutAgend.valor - valorFinal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1">
                  <span>Total</span><span className="text-primary text-base">{formatCurrency(valorFinal)}</span>
                </div>
                {checkoutParcelas > 1 && (
                  <div className="flex justify-between text-[11px] text-muted-foreground"><span>{checkoutParcelas}x</span><span>{formatCurrency(valorParcela)}/parcela</span></div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cupom de Desconto <span className="text-muted-foreground">(opcional)</span></Label>
                <div className="flex gap-2">
                  <Input value={cupomCodigo} onChange={e => { setCupomCodigo(e.target.value.toUpperCase()); if (cupomAplicado) { setCupomAplicado(null); setCheckoutDesconto(""); setCupomErro(""); } }} placeholder="CODIGO" className="bg-background flex-1 h-9 text-sm uppercase" />
                  <Button type="button" size="sm" variant={cupomAplicado ? "default" : "outline"} className="h-9 text-xs" onClick={handleAplicarCupom} disabled={!cupomCodigo.trim() || !!cupomAplicado}>
                    {cupomAplicado ? "Aplicado" : "Aplicar"}
                  </Button>
                </div>
                {cupomErro && <p className="text-xs text-red-500">{cupomErro}</p>}
                {cupomAplicado && <p className="text-xs text-green-600">Cupom {cupomAplicado.codigo}: {cupomAplicado.tipo === "percentual" ? `${cupomAplicado.valor}%` : `R$ ${cupomAplicado.valor}`} de desconto</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Desconto Manual <span className="text-muted-foreground">(opcional)</span></Label>
                <div className="flex gap-2">
                  <Input type="number" min="0" step="0.01" value={checkoutDesconto} onChange={e => setCheckoutDesconto(e.target.value)} placeholder="0" className="bg-background flex-1 h-9 text-sm" disabled={!!cupomAplicado} />
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button type="button" onClick={() => setCheckoutDescontoTipo("valor")} disabled={!!cupomAplicado} className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${checkoutDescontoTipo === "valor" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>R$</button>
                    <button type="button" onClick={() => setCheckoutDescontoTipo("percentual")} disabled={!!cupomAplicado} className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${checkoutDescontoTipo === "percentual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>%</button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Forma de Pagamento</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {paymentMethodsToUse.map(m => (
                    <button key={m.value} type="button" onClick={() => setCheckoutMetodo(m.value)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${checkoutMetodo === m.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >{m.label}</button>
                  ))}
                </div>
              </div>

              {checkoutMetodo === "credito" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Parcelas</Label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 6, 12].map(n => (
                      <button key={n} type="button" onClick={() => setCheckoutParcelas(n)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${checkoutParcelas === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                      >{n}x</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Observação <span className="text-muted-foreground">(opcional)</span></Label>
                <Input value={checkoutObs} onChange={e => setCheckoutObs(e.target.value)} className="bg-background h-9 text-sm" />
              </div>

              <Button className="w-full h-10 text-sm font-medium" onClick={handleCheckout} disabled={checkoutMutation.isPending}>
                {checkoutMutation.isPending ? "Processando..." : `Confirmar — ${formatCurrency(valorFinal)}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
