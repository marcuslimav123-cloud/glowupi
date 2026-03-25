import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListAgendamentos, useListProfissionais, useListServicos,
  useCreateAgendamento, useUpdateAgendamento, useCheckoutAgendamento
} from "@workspace/api-client-react";
import { useApiList } from "@/hooks/useCrudApi";
import { generateTimeSlots, formatCurrency, apiUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Receipt, Star, PartyPopper, Lock, Zap,
  List, Clock, Users, Scissors, ClipboardList, UserCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Agendamento = {
  id: number;
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

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Agenda() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<ViewMode>("dia");
  const [selectedProfId, setSelectedProfId] = useState<string>("all");
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEncaixeOpen, setIsEncaixeOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [checkoutAgend, setCheckoutAgend] = useState<Agendamento | null>(null);
  const [cancelAgend, setCancelAgend] = useState<Agendamento | null>(null);

  const [formNome, setFormNome] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formProfId, setFormProfId] = useState("");
  const [formServId, setFormServId] = useState("");
  const [formHora, setFormHora] = useState("");
  const [formObs, setFormObs] = useState("");

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

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const monthDates = useMemo(() => getMonthDates(date), [date]);

  const dateRangeParams = useMemo(() => {
    if (viewMode === "dia") return { data: date };
    if (viewMode === "semana") return { dataInicio: weekDates[0], dataFim: weekDates[6] };
    const monthD = getMonthDates(date).filter(Boolean) as string[];
    return { dataInicio: monthD[0], dataFim: monthD[monthD.length - 1] };
  }, [viewMode, date, weekDates]);

  const { data: profissionais = [] } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: servicos = [] } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });

  const tiposPath = `/barbearias/${barbeariaId}/tipos`;
  const { data: tipos = [] } = useApiList("tipos", tiposPath, !!barbeariaId);
  const formasPagamentoCustom = (tipos as any[]).filter(t => t.ativo && t.categoria === "forma_pagamento").map(t => ({ value: t.nome.toLowerCase().replace(/\s+/g, "_"), label: t.nome }));
  const paymentMethodsToUse = formasPagamentoCustom.length > 0 ? formasPagamentoCustom : PAYMENT_METHODS;
  const { data: agendamentos = [], refetch } = useListAgendamentos(barbeariaId!, dateRangeParams, { query: { enabled: !!barbeariaId } });

  const createMutation = useCreateAgendamento();
  const updateMutation = useUpdateAgendamento();
  const checkoutMutation = useCheckoutAgendamento();

  const timeSlots = generateTimeSlots("08:00", "20:00", 30);

  const availableTimeSlots = useMemo(() => {
    if (!formProfId || bloqueios.length === 0) return timeSlots;
    const profBloqueios = bloqueios.filter(b => b.profissionalId === parseInt(formProfId));
    if (profBloqueios.length === 0) return timeSlots;
    return timeSlots.filter(slot => {
      const slotMin = timeToMinutes(slot);
      return !profBloqueios.some(b => {
        const bStart = timeToMinutes(b.horaInicio);
        const bEnd = timeToMinutes(b.horaFim);
        return slotMin >= bStart && slotMin < bEnd;
      });
    });
  }, [timeSlots, formProfId, bloqueios]);

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

  const dateDisplay = useMemo(() => {
    if (viewMode === "dia") return formatDateBR(date);
    if (viewMode === "semana") {
      return `${new Date(weekDates[0] + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — ${new Date(weekDates[6] + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
    }
    const d = new Date(date + "T12:00:00");
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }, [viewMode, date, weekDates]);

  const renderDayView = () => {
    const profs = selectedProfId === "all" ? profissionais as any[] : (profissionais as any[]).filter((p: any) => String(p.id) === selectedProfId);
    const dayAgends = filteredAgendamentos.filter(a => a.data === date);
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
        <div className="flex border-b border-border bg-muted/30">
          <div className="w-16 shrink-0 border-r border-border p-3 flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {profs.map((prof: any) => {
              const profAgends = dayAgends.filter(a => a.profissionalId === prof.id && a.status === "pago");
              const total = profAgends.reduce((s, a) => s + a.valor, 0);
              return (
                <div key={prof.id} className="flex-1 min-w-[160px] p-3 text-center border-r border-border last:border-r-0">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] border border-primary/20">
                      {prof.nomeExibicao.charAt(0)}
                    </div>
                    <p className="font-semibold text-foreground truncate text-xs">{prof.nomeExibicao}</p>
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
            <div className="w-16 shrink-0 border-r border-border bg-card">
              {timeSlots.map(time => (
                <div key={time} className="h-14 border-b border-border/40 flex items-start justify-center pt-1 text-[10px] text-muted-foreground font-medium">
                  {time}
                </div>
              ))}
            </div>

            <div className="flex-1 flex relative">
              {profs.map((prof: any) => (
                <div key={prof.id} className="flex-1 min-w-[160px] border-r border-border last:border-r-0 relative">
                  {timeSlots.map(time => (
                    <div key={time} className="h-14 border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                      onClick={() => { resetForm(); setFormProfId(String(prof.id)); setFormHora(time); setIsNewOpen(true); }} />
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
                      onClick={() => agend.status !== 'pago' && agend.status !== 'cancelado' && setCheckoutAgend(agend)}
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
                        {agend.status === 'confirmado' && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="hover:text-green-500" title="Checkout" onClick={e => { e.stopPropagation(); setCheckoutAgend(agend); }}>
                              <Receipt className="h-3 w-3" />
                            </button>
                            <button className="hover:text-red-500" title="Cancelar" onClick={e => { e.stopPropagation(); setCancelAgend(agend); }}>
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>
                        )}
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
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
        <div className="flex border-b border-border bg-muted/30">
          <div className="w-16 shrink-0 border-r border-border p-3 flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 flex">
            {weekDates.map((wd, i) => {
              const isToday = wd === new Date().toISOString().split('T')[0];
              const dayAgends = filteredAgendamentos.filter(a => a.data === wd);
              return (
                <div
                  key={wd}
                  className={`flex-1 min-w-[100px] p-2 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-primary/5 ${isToday ? "bg-primary/10" : ""}`}
                  onClick={() => { setDate(wd); setViewMode("dia"); }}
                >
                  <p className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{WEEKDAY_NAMES[i]}</p>
                  <p className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{new Date(wd + "T12:00:00").getDate()}</p>
                  {dayAgends.length > 0 && <p className="text-[9px] text-primary font-medium">{dayAgends.length} agend.</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-max">
            <div className="w-16 shrink-0 border-r border-border bg-card">
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
                  <div key={wd} className="flex-1 min-w-[100px] border-r border-border last:border-r-0 relative">
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
    const d = new Date(date + "T12:00:00");
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
            if (!md) return <div key={`empty-${i}`} className="h-20" />;
            const dayAgends = filteredAgendamentos.filter(a => a.data === md);
            const isToday = md === today;
            const isSelected = md === date;
            const dayNum = new Date(md + "T12:00:00").getDate();
            const paidCount = dayAgends.filter(a => a.status === "pago").length;
            const confirmedCount = dayAgends.filter(a => a.status === "confirmado").length;
            return (
              <div
                key={md}
                className={`h-20 rounded-lg border p-1.5 cursor-pointer transition-all hover:border-primary/50 ${isToday ? "border-primary bg-primary/5" : isSelected ? "border-primary/30 bg-primary/5" : "border-border/40"}`}
                onClick={() => { setDate(md); setViewMode("dia"); }}
              >
                <p className={`text-xs font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{dayNum}</p>
                {dayAgends.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {confirmedCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[9px] text-primary font-medium">{confirmedCount}</span>
                      </div>
                    )}
                    {paidCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[9px] text-green-600 font-medium">{paidCount}</span>
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
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">{d}</div>
          ))}
          {miniMonthDates.map((md, i) => {
            if (!md) return <div key={`e-${i}`} />;
            const dayNum = new Date(md + "T12:00:00").getDate();
            const isToday = md === today;
            const isSelected = md === date;
            return (
              <button
                key={md}
                className={`text-[10px] h-6 w-6 mx-auto rounded-full flex items-center justify-center font-medium transition-colors
                  ${isSelected ? "bg-primary text-white" : isToday ? "bg-primary/20 text-primary" : "hover:bg-muted text-foreground"}`}
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

  const renderAppointmentDialog = (isEncaixe: boolean) => (
    <Dialog open={isEncaixe ? isEncaixeOpen : isNewOpen} onOpenChange={v => { if (isEncaixe) setIsEncaixeOpen(v); else setIsNewOpen(v); if (!v) resetForm(); }}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            {isEncaixe && <Zap className="h-5 w-5 text-amber-500" />}
            {isEncaixe ? "Encaixe" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={e => handleCreate(e, isEncaixe)} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Nome do Cliente *</Label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)} required placeholder="Ex: Mariana Silva" className="bg-background h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">WhatsApp *</Label>
              <Input value={formTelefone} onChange={e => setFormTelefone(e.target.value)} required placeholder="(11) 99999-9999" className="bg-background h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Profissional *</Label>
              <Select value={formProfId} onValueChange={setFormProfId}>
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(profissionais as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nomeExibicao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Serviço *</Label>
              <Select value={formServId} onValueChange={setFormServId}>
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(servicos as any[]).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.nome} — {formatCurrency(s.preco)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário *</Label>
              <Select value={formHora} onValueChange={setFormHora}>
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(isEncaixe ? timeSlots : availableTimeSlots).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Observação <span className="text-muted-foreground">(opcional)</span></Label>
              <Input value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Ex: Trazer foto de referência" className="bg-background h-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Data: <strong className="text-foreground">{new Date(date + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong></span>
          </div>
          <Button type="submit" className="w-full h-9 text-sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Agendando..." : isEncaixe ? "Confirmar Encaixe" : "Confirmar Agendamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
                <button onClick={goToToday} className="px-2 py-1 text-xs font-medium text-foreground min-w-[120px] text-center hover:text-primary transition-colors">
                  {dateDisplay}
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}><ChevronRight className="h-4 w-4"/></Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Select value={selectedProfId} onValueChange={setSelectedProfId}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-border">
                <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(profissionais as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nomeExibicao}</SelectItem>)}
              </SelectContent>
            </Select>

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

        <div className="w-full lg:w-[240px] shrink-0 space-y-3">
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
            <button onClick={() => setViewMode("dia")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" /> Horários Disponíveis
            </button>
            <button onClick={() => navigate("/lista-espera")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" /> Lista de Espera
            </button>
            <button onClick={() => navigate("/gestao/servicos")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <Scissors className="h-3.5 w-3.5 text-muted-foreground" /> Serviços
            </button>
            <button onClick={() => navigate("/gestao/profissionais")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" /> Profissionais
            </button>
            <button onClick={() => navigate("/gestao/produtos")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-foreground hover:bg-muted transition-colors">
              <List className="h-3.5 w-3.5 text-muted-foreground" /> Produtos
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

      {renderAppointmentDialog(false)}
      {renderAppointmentDialog(true)}

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
            <Button type="submit" className="w-full h-9 text-sm">Bloquear Horário</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelAgend} onOpenChange={v => { if (!v) setCancelAgend(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Cancelar Agendamento?</DialogTitle>
          </DialogHeader>
          {cancelAgend && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Deseja cancelar o agendamento de <strong className="text-foreground">{cancelAgend.clienteNome}</strong>?</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancelAgend(null)}>Não</Button>
                <Button variant="destructive" className="flex-1" onClick={handleCancel}>Sim, Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutAgend} onOpenChange={v => { if (!v) { setCheckoutAgend(null); setCheckoutDesconto(""); setCheckoutParcelas(1); } }}>
        <DialogContent className="bg-card border-border sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-display flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Finalizar Atendimento
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
                    {cupomAplicado ? "Aplicado ✓" : "Aplicar"}
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
