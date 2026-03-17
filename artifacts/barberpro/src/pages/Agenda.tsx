import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListAgendamentos, useListProfissionais, useListServicos,
  useCreateAgendamento, useUpdateAgendamento, useCheckoutAgendamento, useListProdutos
} from "@workspace/api-client-react";
import { generateTimeSlots, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Search, CheckCircle, XCircle, Receipt, Star, PartyPopper } from "lucide-react";
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
  observacao: string | null;
};

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'pago': return 'bg-green-500/20 border-green-500/50 text-green-400';
    case 'confirmado': return 'bg-primary/20 border-primary/50 text-primary';
    case 'cancelado': return 'bg-destructive/20 border-destructive/50 text-destructive';
    default: return 'bg-secondary border-border text-foreground';
  }
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function Agenda() {
  const { barbeariaId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [checkoutAgend, setCheckoutAgend] = useState<Agendamento | null>(null);
  const [cancelAgend, setCancelAgend] = useState<Agendamento | null>(null);

  // New agendamento form state (shadcn Select doesn't work with FormData)
  const [formNome, setFormNome] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formProfId, setFormProfId] = useState("");
  const [formServId, setFormServId] = useState("");
  const [formHora, setFormHora] = useState("");
  const [formObs, setFormObs] = useState("");

  // Checkout state
  const [checkoutMetodo, setCheckoutMetodo] = useState("pix");
  const [checkoutObs, setCheckoutObs] = useState("");

  const { data: profissionais = [] } = useListProfissionais(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: servicos = [] } = useListServicos(barbeariaId!, { query: { enabled: !!barbeariaId } });
  const { data: agendamentos = [], refetch } = useListAgendamentos(barbeariaId!, { data: date }, { query: { enabled: !!barbeariaId } });

  const createMutation = useCreateAgendamento();
  const updateMutation = useUpdateAgendamento();
  const checkoutMutation = useCheckoutAgendamento();

  const timeSlots = generateTimeSlots("08:00", "20:00", 30);

  const handlePrevDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const resetForm = () => {
    setFormNome(""); setFormTelefone(""); setFormProfId("");
    setFormServId(""); setFormHora(""); setFormObs("");
  };

  const handleCreate = async (e: React.FormEvent) => {
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
        }
      });
      toast({ title: "Agendado com sucesso!" });
      setIsNewOpen(false);
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

  const handleCheckout = async () => {
    if (!checkoutAgend) return;
    try {
      await checkoutMutation.mutateAsync({
        barbeariaId: barbeariaId!,
        agendamentoId: checkoutAgend.id,
        data: {
          pagamentos: [{ metodo: checkoutMetodo, valor: checkoutAgend.valor }],
          observacao: checkoutObs || undefined,
        }
      });
      toast({ title: "Checkout realizado!", description: `${formatCurrency(checkoutAgend.valor)} via ${PAYMENT_METHODS.find(m => m.value === checkoutMetodo)?.label}` });
      setCheckoutAgend(null);
      setCheckoutObs("");
      refetch();
      qc.invalidateQueries({ queryKey: ["/api/barbearias", barbeariaId, "dashboard"] });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Tente novamente.";
      toast({ title: "Erro no checkout", description: msg, variant: "destructive" });
    }
  };

  // Calculate appointment height based on duration
  const getSlotHeight = (agend: Agendamento) => {
    const start = timeToMinutes(agend.horaInicio);
    const end = timeToMinutes(agend.horaFim);
    const slots = Math.max(1, (end - start) / 30);
    return slots * 80 - 4;
  };

  const getSlotTop = (agend: Agendamento) => {
    const idx = timeSlots.findIndex(t => t === agend.horaInicio.slice(0, 5));
    return idx === -1 ? 0 : idx * 80 + 2;
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus horários</p>
        </div>

        <div className="flex items-center gap-4 bg-card p-2 rounded-xl border border-border shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}><ChevronLeft className="h-5 w-5"/></Button>
          <div className="flex items-center gap-2 px-4 font-medium min-w-[140px] justify-center">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {new Date(date + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay}><ChevronRight className="h-5 w-5"/></Button>
        </div>

        <Button className="shadow-lg shadow-primary/25" onClick={() => { resetForm(); setIsNewOpen(true); }}>
          <Plus className="mr-2 h-4 w-4"/> Novo Agendamento
        </Button>
      </div>

      {/* AGENDA GRID */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
        {/* Header Row */}
        <div className="flex border-b border-border bg-muted/30">
          <div className="w-20 shrink-0 border-r border-border p-4 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {(profissionais as any[]).map((prof: any) => {
              const profAgends = (agendamentos as Agendamento[]).filter(a => a.profissionalId === prof.id && a.status === "pago");
              const total = profAgends.reduce((s, a) => s + a.valor, 0);
              return (
                <div key={prof.id} className="flex-1 min-w-[180px] p-4 text-center border-r border-border last:border-r-0">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                      {prof.nomeExibicao.charAt(0)}
                    </div>
                    <p className="font-semibold text-foreground truncate text-sm">{prof.nomeExibicao}</p>
                  </div>
                  <p className="text-xs text-primary mt-1 font-medium">{formatCurrency(total)} hoje</p>
                </div>
              );
            })}
            {(profissionais as any[]).length === 0 && (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-4">
                Nenhum profissional cadastrado
              </div>
            )}
          </div>
        </div>

        {/* Time Grid */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-max">
            <div className="w-20 shrink-0 border-r border-border bg-card">
              {timeSlots.map(time => (
                <div key={time} className="h-20 border-b border-border flex items-start justify-center pt-2 text-xs text-muted-foreground font-medium">
                  {time}
                </div>
              ))}
            </div>

            <div className="flex-1 flex relative">
              {(profissionais as any[]).map((prof: any) => (
                <div key={prof.id} className="flex-1 min-w-[180px] border-r border-border last:border-r-0 relative">
                  {timeSlots.map(time => (
                    <div key={time} className="h-20 border-b border-border/40 hover:bg-primary/5 transition-colors cursor-pointer"
                      onClick={() => { setFormProfId(String(prof.id)); setFormHora(time); resetForm(); setFormProfId(String(prof.id)); setFormHora(time); setIsNewOpen(true); }} />
                  ))}

                  {(agendamentos as Agendamento[]).filter(a => a.profissionalId === prof.id).map(agend => (
                    <div
                      key={agend.id}
                      className={`absolute left-1 right-1 rounded-lg border p-2 text-xs shadow-sm cursor-pointer z-10 flex flex-col justify-between group hover:shadow-md transition-all ${getStatusColor(agend.status)}`}
                      style={{ top: `${getSlotTop(agend)}px`, height: `${getSlotHeight(agend)}px` }}
                      onClick={() => agend.status !== 'pago' && agend.status !== 'cancelado' && setCheckoutAgend(agend)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            {agend.aniversario && <PartyPopper className="h-3 w-3 text-yellow-400 shrink-0" />}
                            {agend.vip && <Star className="h-3 w-3 text-purple-400 shrink-0" />}
                            <span className="font-semibold truncate">{agend.clienteNome}</span>
                          </div>
                          <p className="truncate opacity-80 mt-0.5">{agend.servicoNome}</p>
                        </div>
                        <span className="font-bold shrink-0">{formatCurrency(agend.valor)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-70">{agend.horaInicio.slice(0,5)} – {agend.horaFim.slice(0,5)}</span>
                        {agend.status === 'confirmado' && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="hover:text-green-400" title="Checkout" onClick={e => { e.stopPropagation(); setCheckoutAgend(agend); }}>
                              <Receipt className="h-3.5 w-3.5" />
                            </button>
                            <button className="hover:text-red-400" title="Cancelar" onClick={e => { e.stopPropagation(); setCancelAgend(agend); }}>
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {agend.status === 'pago' && <CheckCircle className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={isNewOpen} onOpenChange={v => { setIsNewOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome do Cliente *</Label>
                <Input value={formNome} onChange={e => setFormNome(e.target.value)} required placeholder="Ex: João Silva" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <Input value={formTelefone} onChange={e => setFormTelefone(e.target.value)} required placeholder="(11) 99999-9999" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>Profissional *</Label>
                <Select value={formProfId} onValueChange={setFormProfId} required>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {(profissionais as any[]).map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nomeExibicao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <Select value={formServId} onValueChange={setFormServId} required>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {(servicos as any[]).map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nome} — {formatCurrency(s.preco)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Select value={formHora} onValueChange={setFormHora} required>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Observação <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Ex: Trazer foto de referência" className="bg-background" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
              <span>Data: <strong className="text-foreground">{new Date(date + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong></span>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={!!checkoutAgend} onOpenChange={v => { if (!v) setCheckoutAgend(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Finalizar Atendimento
            </DialogTitle>
          </DialogHeader>
          {checkoutAgend && (
            <div className="space-y-4 mt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{checkoutAgend.clienteNome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium">{checkoutAgend.servicoNome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium">{checkoutAgend.profissionalNome}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary text-lg">{formatCurrency(checkoutAgend.valor)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setCheckoutMetodo(m.value)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${checkoutMetodo === m.value ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observação <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input value={checkoutObs} onChange={e => setCheckoutObs(e.target.value)} placeholder="Ex: retorno em 30 dias" className="bg-background" />
              </div>

              <Button className="w-full" onClick={handleCheckout} disabled={checkoutMutation.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {checkoutMutation.isPending ? "Finalizando..." : `Confirmar — ${formatCurrency(checkoutAgend.valor)}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelAgend} onOpenChange={v => { if (!v) setCancelAgend(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Cancelar Agendamento
            </DialogTitle>
          </DialogHeader>
          {cancelAgend && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja cancelar o agendamento de <strong className="text-foreground">{cancelAgend.clienteNome}</strong> às <strong className="text-foreground">{cancelAgend.horaInicio.slice(0,5)}</strong>?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCancelAgend(null)}>Manter</Button>
                <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Cancelando..." : "Sim, cancelar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
